import puppeteer from "puppeteer-core";
import EventEmitter from "events";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import OpenAI from "openai";
import { Pinecone } from "@pinecone-database/pinecone";

// Carregar variáveis de ambiente
dotenv.config();

// Inicializar cliente OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Inicializar cliente Pinecone
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

// EventEmitter para comunicação entre funções de CAPTCHA
const emitter = new EventEmitter();

// Variáveis globais para logging
let logStream = null;
let logFilePath = null;

/**
 * Adiciona listeners para eventos de CAPTCHA do Scrapeless
 * Usa EventEmitter para comunicação entre funções (padrão da documentação)
 */
async function addCaptchaListener(page) {
  try {
    const client = await page.createCDPSession();

    client.on("Captcha.detected", (msg) => {
      log("🔍 CAPTCHA DETECTADO pelo Scrapeless (evento CDP)", "INFO");
      log(`   Detalhes: ${JSON.stringify(msg)}`, "INFO");
      emitter.emit("Captcha.detected", msg);
    });

    client.on("Captcha.solveFinished", async (msg) => {
      log("✅ CAPTCHA RESOLVIDO pelo Scrapeless (evento CDP)", "SUCCESS");
      log(`   Detalhes: ${JSON.stringify(msg)}`, "INFO");
      emitter.emit("Captcha.solveFinished", msg);
    });

    log("👂 Listeners CDP de CAPTCHA configurados com sucesso", "SUCCESS");
    return client;
  } catch (error) {
    log(`⚠️ Erro ao configurar listeners CDP: ${error.message}`, "WARNING");
    log("   Continuando com verificação visual de CAPTCHA", "INFO");
    return null;
  }
}

/**
 * Verifica visualmente se o CAPTCHA foi resolvido (não há elementos de CAPTCHA visíveis)
 */
async function isCaptchaResolved(page) {
  try {
    const result = await page.evaluate(() => {
      // Verificar iframes de CAPTCHA
      const iframes = Array.from(document.querySelectorAll('iframe'));
      const captchaIframes = iframes.filter(iframe => {
        const src = iframe.src || '';
        const title = iframe.title || '';
        return (src.includes('recaptcha') || src.includes('captcha') ||
                src.includes('turnstile') || src.includes('cloudflare') ||
                title.includes('recaptcha') || title.includes('captcha')) &&
               iframe.offsetParent !== null;
      });

      // Verificar divs/overlays de CAPTCHA
      const captchaDivs = Array.from(document.querySelectorAll(
        'div[class*="captcha"], div[id*="captcha"], div[class*="turnstile"], div[id*="turnstile"]'
      ));
      const visibleCaptchaDivs = captchaDivs.filter(div => {
        const style = window.getComputedStyle(div);
        return div.offsetParent !== null &&
               style.display !== 'none' &&
               style.visibility !== 'hidden' &&
               style.opacity !== '0';
      });

      // Verificar se formulário está acessível
      const form = document.querySelector('form');
      const formVisible = form && form.offsetParent !== null;

      return {
        captchaIframesCount: captchaIframes.length,
        captchaDivsCount: visibleCaptchaDivs.length,
        formVisible: formVisible,
        resolved: captchaIframes.length === 0 && visibleCaptchaDivs.length === 0 && formVisible
      };
    });

    return result;
  } catch (error) {
    log(`⚠️ Erro ao verificar CAPTCHA visualmente: ${error.message}`, "WARNING");
    return { resolved: false, error: error.message };
  }
}

/**
 * Aguarda a resolução do CAPTCHA com abordagem inteligente:
 * 1. Aguarda evento "Captcha.detected" do Scrapeless (indica que CAPTCHA foi encontrado)
 * 2. Aguarda evento "Captcha.solveFinished" (indica que foi resolvido)
 * 3. Se não houver CAPTCHA, verifica visualmente e continua
 * Timeout padrão: 45 segundos
 */
async function onCaptchaFinished(page, timeout = 45_000) {
  const startTime = Date.now();
  let captchaDetected = false;
  let captchaSolved = false;

  log("⏳ Aguardando detecção e resolução do CAPTCHA...", "INFO");

  return new Promise(async (resolve, reject) => {
    // Listener para detecção de CAPTCHA
    const onDetected = (msg) => {
      captchaDetected = true;
      log("🔍 CAPTCHA detectado - aguardando resolução pelo Scrapeless...", "INFO");
    };

    // Listener para resolução de CAPTCHA
    const onSolved = (msg) => {
      captchaSolved = true;
      log("✅ CAPTCHA resolvido pelo Scrapeless (evento CDP)!", "SUCCESS");
      cleanup();

      const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
      log(`⏱️ CAPTCHA resolvido em ${elapsedTime}s`, "SUCCESS");

      resolve({ method: "CDP", msg });
    };

    // Cleanup de listeners
    const cleanup = () => {
      emitter.removeListener("Captcha.detected", onDetected);
      emitter.removeListener("Captcha.solveFinished", onSolved);
    };

    // Registrar listeners
    emitter.on("Captcha.detected", onDetected);
    emitter.on("Captcha.solveFinished", onSolved);

    // Timeout
    const timeoutId = setTimeout(() => {
      cleanup();
      const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
      reject(new Error(`Timeout de ${timeout/1000}s esperando resolução do CAPTCHA (tempo decorrido: ${elapsedTime}s)`));
    }, timeout);

    // Verificação visual periódica (apenas se CAPTCHA NÃO foi detectado pelo CDP)
    const checkInterval = setInterval(async () => {
      try {
        // Se CAPTCHA foi detectado pelo CDP, aguardar apenas o evento de resolução
        if (captchaDetected && !captchaSolved) {
          log("   ⏳ CAPTCHA detectado - aguardando Scrapeless resolver...", "INFO");
          return;
        }

        // Se CAPTCHA já foi resolvido, parar verificação
        if (captchaSolved) {
          clearInterval(checkInterval);
          return;
        }

        // Verificar visualmente se não há CAPTCHA ou se já foi resolvido
        const captchaStatus = await isCaptchaResolved(page);

        if (captchaStatus.resolved) {
          // Se CAPTCHA nunca foi detectado pelo CDP, significa que não havia CAPTCHA
          if (!captchaDetected) {
            log("✅ Nenhum CAPTCHA detectado - página já está liberada!", "SUCCESS");
            cleanup();
            clearInterval(checkInterval);
            clearTimeout(timeoutId);

            const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
            log(`⏱️ Verificação concluída em ${elapsedTime}s`, "SUCCESS");

            resolve({ method: "No-CAPTCHA", status: captchaStatus });
          }
        }
      } catch (error) {
        log(`⚠️ Erro na verificação visual: ${error.message}`, "WARNING");
      }
    }, 2000); // Verificar a cada 2 segundos
  });
}

/**
 * Aplica técnicas anti-detecção para evitar que o site identifique automação
 */
async function applyAntiDetection(page) {
  try {
    // Remover propriedades que indicam automação
    await page.evaluateOnNewDocument(() => {
      // Sobrescrever navigator.webdriver
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });

      // Sobrescrever chrome runtime
      window.chrome = {
        runtime: {},
      };

      // Sobrescrever permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Notification.permission }) :
          originalQuery(parameters)
      );

      // Sobrescrever plugins para parecer um navegador real
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });

      // Sobrescrever languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['pt-BR', 'pt', 'en-US', 'en'],
      });
    });

    console.log(" Técnicas anti-detecção aplicadas.");
  } catch (error) {
    console.error(" Erro ao aplicar anti-detecção:", error);
  }
}

/**
 * Função de log que escreve no console e no arquivo
 */
function log(message, level = "INFO") {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}`;

  // Escrever no console
  console.log(logMessage);

  // Escrever no arquivo de log
  if (logStream) {
    logStream.write(logMessage + "\n");
  }
}

/**
 * Garante que os diretórios necessários existem
 */
function ensureDirectories() {
  const dirs = ["screenshots", "logs", "scraps"];

  dirs.forEach(dir => {
    const dirPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`📁 Diretório '${dir}' criado.`);
    }
  });
}

/**
 * Gera nome de arquivo com timestamp
 */
function getTimestampedFilename(prefix = "shot", extension = "png") {
  const now = new Date();
  const date = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const time = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
  return `${prefix}_${date}_${time}.${extension}`;
}

/**
 * Inicializa o arquivo de log
 */
function initializeLog() {
  const logFilename = getTimestampedFilename("log", "log");
  logFilePath = path.join("logs", logFilename);
  logStream = fs.createWriteStream(logFilePath, { flags: "a" });
  log(`Log iniciado: ${logFilePath}`, "INFO");
}

/**
 * Finaliza o arquivo de log
 */
function closeLog() {
  if (logStream) {
    log("Log finalizado", "INFO");
    logStream.end();
    logStream = null;
  }
}

/**
 * Função principal para execução local
 */
async function main() {
  let browser = null;

  try {
    // Garantir que os diretórios necessários existem
    ensureDirectories();

    // Inicializar log
    initializeLog();
    log("=== INICIANDO SCRAPER TJSP ===", "INFO");

    // Configuração de fingerprint customizado para evitar detecção
    const fingerprint = {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      platform: 'Windows',
      screen: {
        width: 1920,
        height: 1080
      },
      localization: {
        languages: ['pt-BR', 'pt', 'en-US', 'en'],
        timezone: 'America/Sao_Paulo',
      },
      args: {
        '--window-size': '1920,1080', // Mesmo tamanho do screen fingerprint
      }
    };

    // Configuração do Browser Scrapeless
    const query = new URLSearchParams({
      token: process.env.SCRAPELESS_TOKEN,
      proxyCountry: process.env.SCRAPELESS_PROXY_COUNTRY || "BR",
      sessionRecording: process.env.SCRAPELESS_SESSION_RECORDING === "true",
      sessionTTL: parseInt(process.env.SCRAPELESS_SESSION_TTL || "900"),
      sessionName: process.env.SCRAPELESS_SESSION_NAME || "TJSP Scraper",
      fingerprint: encodeURIComponent(JSON.stringify(fingerprint)), // Adicionar fingerprint customizado
    });

    const connectionURL = `wss://browser.scrapeless.com/api/v2/browser?${query.toString()}`;

    log("🔗 Conectando ao browser Scrapeless...", "INFO");
    log("🖐️ Usando fingerprint customizado:", "INFO");
    log(`   User-Agent: ${fingerprint.userAgent}`, "INFO");
    log(`   Platform: ${fingerprint.platform}`, "INFO");
    log(`   Screen: ${fingerprint.screen.width}x${fingerprint.screen.height}`, "INFO");
    log(`   Timezone: ${fingerprint.localization.timezone}`, "INFO");
    log(`   Languages: ${fingerprint.localization.languages.join(', ')}`, "INFO");

    browser = await puppeteer.connect({
      browserWSEndpoint: connectionURL,
      defaultViewport: null,
    });
    log("✅ Conectado ao browser!", "SUCCESS");

    // Executar o scraper
    const url = process.env.TJSP_URL || "https://esaj.tjsp.jus.br/cjsg/resultadoCompleta.do";
    await runScraper(browser, url);

  } catch (error) {
    log(`❌ Erro fatal no main(): ${error.message}`, "ERROR");
    if (error.stack) log(error.stack, "ERROR");
  } finally {
    if (browser) {
      await browser.close();
      log("🔒 Browser fechado", "INFO");
    }

    // Fechar log
    closeLog();
  }
}

// Variável global para armazenar o mapeamento de campos
let FIELDS_MAPPING = null;

/**
 * Carrega o mapeamento de campos do arquivo fields.json
 */
function loadFieldsMapping() {
  try {
    const fieldsPath = path.join(process.cwd(), "config", "fields.json");

    if (!fs.existsSync(fieldsPath)) {
      throw new Error("Arquivo fields.json não encontrado em config/");
    }

    const fieldsContent = fs.readFileSync(fieldsPath, "utf-8");
    const fieldsData = JSON.parse(fieldsContent);

    FIELDS_MAPPING = fieldsData.fields;
    log(`✅ Mapeamento de campos carregado: ${Object.keys(FIELDS_MAPPING).length} campos`, "SUCCESS");

    return FIELDS_MAPPING;
  } catch (error) {
    log(`❌ Erro ao carregar fields.json: ${error.message}`, "ERROR");
    throw error;
  }
}

/**
 * Converte valor amigável para valor técnico usando o mapeamento
 */
function convertValue(fieldName, value) {
  const fieldMapping = FIELDS_MAPPING[fieldName];

  if (!fieldMapping) {
    return value;
  }

  // Se o campo tem mapeamento de valores (checkbox-group, radio)
  if (fieldMapping.values) {
    // Para arrays, converter cada item
    if (Array.isArray(value)) {
      return value.map(v => fieldMapping.values[v] || v);
    }
    // Para strings, converter o valor
    else if (typeof value === "string") {
      return fieldMapping.values[value] || value;
    }
  }

  return value;
}

/**
 * Carrega as categorias do arquivo CSV
 */
function loadCategories() {
  try {
    const csvPath = path.join("config", "categorias.csv");
    const csvContent = fs.readFileSync(csvPath, "utf-8");
    const lines = csvContent.split("\n").filter(line => line.trim() !== "");

    // Pular cabeçalho
    const categories = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(",");
      if (parts.length >= 2) {
        categories.push({
          indice: parts[0].trim(),
          categoria: parts[1].trim(),
          desc_categoria: parts[2] ? parts[2].trim().replace(/"/g, "") : "",
          codigo_categoria: parts[3] ? parts[3].trim() : ""
        });
      }
    }

    return categories;
  } catch (error) {
    log(`❌ Erro ao carregar categorias: ${error.message}`, "ERROR");
    return [];
  }
}

/**
 * Carrega o prompt de categorização
 */
function loadPrompt(promptFile) {
  try {
    const promptPath = path.join("prompts", promptFile);
    return fs.readFileSync(promptPath, "utf-8");
  } catch (error) {
    log(`❌ Erro ao carregar prompt ${promptFile}: ${error.message}`, "ERROR");
    return "";
  }
}

/**
 * Categoriza uma ementa usando OpenAI
 */
async function categorizeEmenta(ementa) {
  try {
    // Carregar categorias e prompts
    const categories = loadCategories();
    const categoriesList = categories.map(c => c.categoria).join(", ");

    const promptCategoria = loadPrompt("prompt_categoria.txt");
    const promptRegras = loadPrompt("prompt_regras_agente.txt");

    // Substituir placeholder no prompt
    const systemPrompt = promptCategoria.replace("{valid_categories_list}", categoriesList);

    log(`🤖 Enviando ementa para OpenAI (modelo: ${process.env.OPENAI_MODEL})...`, "INFO");

    // Chamar OpenAI
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `${systemPrompt}\n\n${promptRegras}`
        },
        {
          role: "user",
          content: `Classifique a seguinte ementa:\n\n${ementa}`
        }
      ],
      temperature: 0.3,
      max_tokens: 100
    });

    const categoria = response.choices[0].message.content.trim();
    log(`✅ Categoria identificada: ${categoria}`, "SUCCESS");

    // Encontrar o código da categoria
    const categoriaEncontrada = categories.find(c =>
      c.categoria.toLowerCase() === categoria.toLowerCase()
    );

    return {
      categoria: categoria,
      codigo_categoria: categoriaEncontrada ? categoriaEncontrada.codigo_categoria : "sem_categoria",
      desc_categoria: categoriaEncontrada ? categoriaEncontrada.desc_categoria : ""
    };

  } catch (error) {
    log(`❌ Erro ao categorizar ementa: ${error.message}`, "ERROR");
    return {
      categoria: "erro_categorizacao",
      codigo_categoria: "erro_categorizacao",
      desc_categoria: `Erro: ${error.message}`
    };
  }
}

/**
 * Gera embedding (vetor) para um texto usando OpenAI
 */
async function generateEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
      encoding_format: "float"
    });

    return response.data[0].embedding;
  } catch (error) {
    log(`❌ Erro ao gerar embedding: ${error.message}`, "ERROR");
    throw error;
  }
}

/**
 * Verifica se índice Pinecone existe e cria se necessário
 */
async function ensurePineconeIndex() {
  try {
    const indexName = process.env.PINECONE_INDEX_NAME;
    const dimension = parseInt(process.env.PINECONE_DIMENSION || "1536");
    const cloud = process.env.PINECONE_CLOUD || "aws";
    const region = process.env.PINECONE_ENVIRONMENT || "us-east-1";

    log(`🔍 Verificando se índice '${indexName}' existe...`, "INFO");

    // Listar índices existentes
    const existingIndexes = await pinecone.listIndexes();
    const indexExists = existingIndexes.indexes?.some(idx => idx.name === indexName);

    if (indexExists) {
      log(`✅ Índice '${indexName}' já existe - usando índice existente`, "SUCCESS");
      return true;
    }

    // Criar novo índice
    log(`📝 Índice '${indexName}' não existe - criando novo índice...`, "INFO");
    log(`   Dimensão: ${dimension}`, "INFO");
    log(`   Cloud: ${cloud}`, "INFO");
    log(`   Region: ${region}`, "INFO");

    await pinecone.createIndex({
      name: indexName,
      dimension: dimension,
      metric: "cosine",
      spec: {
        serverless: {
          cloud: cloud,
          region: region
        }
      }
    });

    log(`✅ Índice '${indexName}' criado com sucesso!`, "SUCCESS");

    // Aguardar índice ficar pronto
    log(`⏳ Aguardando índice ficar pronto...`, "INFO");
    await new Promise(resolve => setTimeout(resolve, 10000)); // 10 segundos

    return true;

  } catch (error) {
    log(`❌ Erro ao verificar/criar índice: ${error.message}`, "ERROR");
    return false;
  }
}

/**
 * Envia itens para Pinecone como vetores
 */
async function uploadToPinecone(items) {
  try {
    const indexName = process.env.PINECONE_INDEX_NAME;

    if (!indexName) {
      log("⚠️ PINECONE_INDEX_NAME não configurado - pulando upload para Pinecone", "WARNING");
      return { success: false, uploaded: 0, errors: 0 };
    }

    // Verificar/criar índice
    const indexReady = await ensurePineconeIndex();
    if (!indexReady) {
      log("❌ Não foi possível preparar o índice Pinecone", "ERROR");
      return { success: false, uploaded: 0, errors: items.length };
    }

    log(`🔗 Conectando ao índice Pinecone: ${indexName}`, "INFO");
    const index = pinecone.index(indexName);

    let uploaded = 0;
    let errors = 0;

    // Processar em lotes de 10 itens
    const batchSize = 10;
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);

      log(`📤 Processando lote ${Math.floor(i / batchSize) + 1}/${Math.ceil(items.length / batchSize)} (${batch.length} itens)...`, "INFO");

      const vectors = [];

      for (const item of batch) {
        try {
          // Criar texto combinado para embedding (ementa + categoria + classe/assunto)
          const textForEmbedding = `
            Ementa: ${item.ementa || ""}
            Categoria: ${item.categoria || ""}
            Classe/Assunto: ${item.classe_assunto || ""}
          `.trim();

          // Gerar embedding
          log(`  🔄 Gerando embedding para processo ${item.numero_processo}...`, "INFO");
          const embedding = await generateEmbedding(textForEmbedding);

          // Preparar vetor para Pinecone
          vectors.push({
            id: item.numero_processo.replace(/[^0-9]/g, ""), // Remover caracteres especiais do ID
            values: embedding,
            metadata: {
              numero_processo: item.numero_processo,
              classe_assunto: item.classe_assunto || "",
              relator: item.relator || "",
              comarca: item.comarca || "",
              orgao_julgador: item.orgao_julgador || "",
              data_julgamento: item.data_julgamento || "",
              data_publicacao: item.data_publicacao || "",
              categoria: item.categoria || "",
              codigo_categoria: item.codigo_categoria || "",
              desc_categoria: item.desc_categoria || "",
              pdf_url: item.pdf_url || "",
              ementa: item.ementa ? item.ementa.substring(0, 40000) : "" // Pinecone tem limite de metadata
            }
          });

          uploaded++;

        } catch (error) {
          log(`  ❌ Erro ao processar item ${item.numero_processo}: ${error.message}`, "ERROR");
          errors++;
        }
      }

      // Enviar lote para Pinecone
      if (vectors.length > 0) {
        try {
          await index.upsert(vectors);
          log(`  ✅ Lote enviado para Pinecone: ${vectors.length} vetores`, "SUCCESS");
        } catch (error) {
          log(`  ❌ Erro ao enviar lote para Pinecone: ${error.message}`, "ERROR");
          errors += vectors.length;
          uploaded -= vectors.length;
        }
      }

      // Pequeno delay entre lotes
      if (i + batchSize < items.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return { success: true, uploaded, errors };

  } catch (error) {
    log(`❌ Erro ao conectar com Pinecone: ${error.message}`, "ERROR");
    return { success: false, uploaded: 0, errors: items.length };
  }
}

/**
 * Interpreta o campo de paginação e retorna array de páginas a processar
 * Formatos suportados:
 * - "1" -> [1]
 * - "1-3" -> [1, 2, 3]
 * - "1;3;5" -> [1, 3, 5]
 * - "TODAS" ou "ALL" ou "TODOS" -> null (indica todas as páginas)
 */
function parsePagination(paginaValue, totalPages = null) {
  if (!paginaValue || paginaValue.trim() === "") {
    return [1]; // Padrão: apenas página 1
  }

  const value = String(paginaValue).trim().toUpperCase();

  // Verificar se é "TODAS", "ALL" ou "TODOS"
  if (value === "TODAS" || value === "ALL" || value === "TODOS") {
    return null; // null indica que deve processar todas as páginas
  }

  // Verificar se é intervalo (ex: "1-3")
  if (value.includes("-")) {
    const [start, end] = value.split("-").map(n => parseInt(n.trim()));
    if (isNaN(start) || isNaN(end) || start < 1 || end < start) {
      log(`⚠️ Formato de intervalo inválido: "${paginaValue}". Usando página 1.`, "WARNING");
      return [1];
    }
    const pages = [];
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  // Verificar se é lista separada por ponto e vírgula (ex: "1;3;5")
  if (value.includes(";")) {
    const pages = value.split(";")
      .map(n => parseInt(n.trim()))
      .filter(n => !isNaN(n) && n >= 1);

    if (pages.length === 0) {
      log(`⚠️ Formato de lista inválido: "${paginaValue}". Usando página 1.`, "WARNING");
      return [1];
    }
    return pages.sort((a, b) => a - b); // Ordenar páginas
  }

  // Verificar se é número único
  const pageNum = parseInt(value);
  if (isNaN(pageNum) || pageNum < 1) {
    log(`⚠️ Número de página inválido: "${paginaValue}". Usando página 1.`, "WARNING");
    return [1];
  }

  return [pageNum];
}

/**
 * Extrai dados estruturados de uma página de resultados
 */
async function extractPageData(page) {
  return await page.evaluate(() => {
    const tabsDiv = document.querySelector('div#tabs');
    if (!tabsDiv) return null;

    // Função auxiliar para extrair texto limpo
    function getCleanText(element) {
      if (!element) return "";
      return (element.innerText || element.textContent || "").trim();
    }

    // Extrair informações de paginação
    const paginacaoDiv = tabsDiv.querySelector('#paginacaoSuperior-A');
    let totalResultados = 0;
    let resultadosInicio = 0;
    let resultadosFim = 0;
    let paginaAtual = 1;

    if (paginacaoDiv) {
      const paginacaoText = getCleanText(paginacaoDiv);
      const match = paginacaoText.match(/Resultados\s+(\d+)\s+a\s+(\d+)\s+de\s+(\d+)/);
      if (match) {
        resultadosInicio = parseInt(match[1]);
        resultadosFim = parseInt(match[2]);
        totalResultados = parseInt(match[3]);
      }

      // Detectar página atual
      const paginaAtualSpan = paginacaoDiv.querySelector('span.paginacaoResultados');
      if (paginaAtualSpan) {
        const paginaMatch = getCleanText(paginaAtualSpan).match(/(\d+)/);
        if (paginaMatch) {
          paginaAtual = parseInt(paginaMatch[1]);
        }
      }
    }

    // Extrair dados estruturados
    const data = {
      pagina_atual: paginaAtual,
      total_resultados: totalResultados,
      resultados_inicio: resultadosInicio,
      resultados_fim: resultadosFim,
      items: []
    };

    // Extrair itens de resultado (cada <tr> com classe fundocinza1)
    const resultItems = tabsDiv.querySelectorAll('tr.fundocinza1');

    resultItems.forEach((tr) => {
      const item = {};

      // Extrair número do processo
      const processoLink = tr.querySelector('a.esajLinkLogin.downloadEmenta[cdacordao]');
      if (processoLink) {
        item.numero_processo = getCleanText(processoLink);
      } else {
        item.numero_processo = "";
      }

      // Extrair URL do PDF
      item.pdf_url = "";
      const pdfLink = tr.querySelector('a.downloadEmenta[cdacordao]');
      if (pdfLink) {
        const cdAcordao = pdfLink.getAttribute('cdacordao');
        if (cdAcordao) {
          item.pdf_url = `https://esaj.tjsp.jus.br/cjsg/getArquivo.do?cdAcordao=${cdAcordao}&conversao=pdf`;
        }
      }

      // Extrair Classe/Assunto
      const classeAssuntoRow = tr.querySelector('tr.ementaClass2 td strong');
      if (classeAssuntoRow && getCleanText(classeAssuntoRow) === "Classe/Assunto:") {
        const classeAssuntoText = getCleanText(classeAssuntoRow.parentElement);
        item.classe_assunto = classeAssuntoText.replace("Classe/Assunto:", "").trim();
      } else {
        item.classe_assunto = "";
      }

      // Extrair Relator
      const relatorRows = tr.querySelectorAll('tr.ementaClass2');
      for (const row of relatorRows) {
        const strong = row.querySelector('strong');
        if (strong && getCleanText(strong) === "Relator(a):") {
          item.relator = getCleanText(row.querySelector('td')).replace("Relator(a):", "").trim();
          break;
        }
      }
      if (!item.relator) item.relator = "";

      // Extrair Comarca
      for (const row of relatorRows) {
        const strong = row.querySelector('strong');
        if (strong && getCleanText(strong) === "Comarca:") {
          item.comarca = getCleanText(row.querySelector('td')).replace("Comarca:", "").trim();
          break;
        }
      }
      if (!item.comarca) item.comarca = "";

      // Extrair Órgão julgador
      for (const row of relatorRows) {
        const strong = row.querySelector('strong');
        if (strong && getCleanText(strong) === "Órgão julgador:") {
          item.orgao_julgador = getCleanText(row.querySelector('td')).replace("Órgão julgador:", "").trim();
          break;
        }
      }
      if (!item.orgao_julgador) item.orgao_julgador = "";

      // Extrair Data do julgamento
      for (const row of relatorRows) {
        const strong = row.querySelector('strong');
        if (strong && getCleanText(strong) === "Data do julgamento:") {
          item.data_julgamento = getCleanText(row.querySelector('td')).replace("Data do julgamento:", "").trim();
          break;
        }
      }
      if (!item.data_julgamento) item.data_julgamento = "";

      // Extrair Data de publicação
      for (const row of relatorRows) {
        const strong = row.querySelector('strong');
        if (strong && getCleanText(strong) === "Data de publicação:") {
          item.data_publicacao = getCleanText(row.querySelector('td')).replace("Data de publicação:", "").trim();
          break;
        }
      }
      if (!item.data_publicacao) item.data_publicacao = "";

      // Extrair Ementa (texto completo, não truncado)
      const ementaRow = tr.querySelector('tr.ementaClass2 td[colspan="2"] div[align="justify"]');
      if (ementaRow) {
        // Buscar a div oculta que contém a ementa completa
        const ementaCompleta = ementaRow.nextElementSibling;
        if (ementaCompleta && ementaCompleta.style.display === 'none') {
          item.ementa = getCleanText(ementaCompleta).replace("Ementa:", "").trim();
        } else {
          item.ementa = getCleanText(ementaRow).replace("Ementa:", "").trim();
        }
      } else {
        item.ementa = "";
      }

      // Adicionar item apenas se tiver número de processo
      if (item.numero_processo) {
        data.items.push(item);
      }
    });

    return data;
  });
}

/**
 * Navega para uma página específica de resultados
 */
async function navigateToPage(page, pageNumber) {
  log(`📄 Navegando para página ${pageNumber}...`, "INFO");

  // Clicar no link da página
  const clicked = await page.evaluate((targetPage) => {
    const paginacaoDiv = document.querySelector('#paginacaoSuperior-A');
    if (!paginacaoDiv) return false;

    // Procurar pelo link da página
    const links = paginacaoDiv.querySelectorAll('a');
    for (const link of links) {
      const text = (link.innerText || link.textContent || "").trim();
      if (text === String(targetPage)) {
        link.click();
        return true;
      }
    }
    return false;
  }, pageNumber);

  if (!clicked) {
    throw new Error(`Não foi possível encontrar link para página ${pageNumber}`);
  }

  // Aguardar navegação
  await page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 30000 });
  await new Promise((resolve) => setTimeout(resolve, 1000));

  log(`✅ Página ${pageNumber} carregada!`, "SUCCESS");
}

/**
 * Preenche um campo de texto
 */
async function fillTextField(page, friendlyName, fieldMapping, value) {
  log(`✍️ Preenchendo '${fieldMapping.label}': "${value}"`, "INFO");
  await page.type(fieldMapping.selector, String(value), { delay: 50 });
}

/**
 * Preenche um checkbox simples
 */
async function fillCheckbox(page, friendlyName, fieldMapping, value) {
  if (value) {
    log(`☑️ Marcando '${fieldMapping.label}'`, "INFO");
    await page.evaluate((selector) => {
      const checkbox = document.querySelector(selector);
      if (checkbox && !checkbox.checked) checkbox.click();
    }, fieldMapping.selector);
  }
}

/**
 * Preenche um grupo de checkboxes
 */
async function fillCheckboxGroup(page, friendlyName, fieldMapping, values) {
  if (!Array.isArray(values) || values.length === 0) {
    return;
  }

  // Converter valores amigáveis para valores técnicos
  const technicalValues = convertValue(friendlyName, values);

  log(`☑️ Selecionando '${fieldMapping.label}': ${values.join(', ')}`, "INFO");

  // Desmarcar todos primeiro
  await page.evaluate((selector) => {
    document.querySelectorAll(selector).forEach(cb => {
      if (cb.checked) cb.click();
    });
  }, fieldMapping.selector);

  // Marcar os selecionados
  for (const techValue of technicalValues) {
    await page.evaluate((selector, value) => {
      const checkbox = document.querySelector(`${selector}[value="${value}"]`);
      if (checkbox && !checkbox.checked) checkbox.click();
    }, fieldMapping.selector, techValue);
  }
}

/**
 * Preenche um campo radio
 */
async function fillRadio(page, friendlyName, fieldMapping, value) {
  // Converter valor amigável para valor técnico
  const technicalValue = convertValue(friendlyName, value);

  log(`📊 Selecionando '${fieldMapping.label}': ${value}`, "INFO");
  await page.evaluate((selector, val) => {
    const radio = document.querySelector(`${selector}[value="${val}"]`);
    if (radio && !radio.checked) radio.click();
  }, fieldMapping.selector, technicalValue);
}

/**
 * Carrega a configuração de busca do arquivo JSON
 * Retorna um objeto com os campos amigáveis e seus valores
 */
function loadSearchConfig() {
  try {
    const configPath = path.join(process.cwd(), "config", "busca.json");

    if (!fs.existsSync(configPath)) {
      log("⚠️ Arquivo de configuração não encontrado. Usando valores padrão.", "WARNING");
      return {};
    }

    const configContent = fs.readFileSync(configPath, "utf-8");
    const config = JSON.parse(configContent);

    // Remover campos de metadados
    const cleanConfig = {};
    for (const [key, value] of Object.entries(config)) {
      if (!key.startsWith("_")) {
        cleanConfig[key] = value;
      }
    }

    log(`✅ Configuração carregada de: ${configPath}`, "SUCCESS");
    log(`📊 ${Object.keys(cleanConfig).length} campos encontrados`, "INFO");

    return cleanConfig;
  } catch (error) {
    log(`❌ Erro ao carregar configuração: ${error.message}`, "ERROR");
    throw error;
  }
}

/**
 * Executa o scraper no TJSP
 */
async function runScraper(browser, url) {
  let page = null;

  try {
    log("📄 Criando nova página...", "INFO");
    page = await browser.newPage();

    // Aplicar técnicas anti-detecção
    log("🛡️ Aplicando técnicas anti-detecção...", "INFO");
    await applyAntiDetection(page);

    // Configurar listener de CAPTCHA ANTES de navegar
    log("👂 Configurando listener de CAPTCHA...", "INFO");
    await addCaptchaListener(page);

    log(`🌐 Navegando para: ${url}`, "INFO");
    await page.goto(url, { timeout: 60000, waitUntil: "domcontentloaded" });

    log("", "INFO");
    log("═══════════════════════════════════════════════════════", "INFO");
    log("🔐 AGUARDANDO RESOLUÇÃO DO CAPTCHA", "INFO");
    log("═══════════════════════════════════════════════════════", "INFO");

    try {
      const result = await onCaptchaFinished(page, 45000); // 45 segundos

      log("", "INFO");
      log("═══════════════════════════════════════════════════════", "SUCCESS");
      log("✅ CAPTCHA RESOLVIDO COM SUCESSO!", "SUCCESS");
      log(`   Método usado: ${result.method}`, "SUCCESS");
      log("═══════════════════════════════════════════════════════", "SUCCESS");

    } catch (error) {
      log("", "INFO");
      log("═══════════════════════════════════════════════════════", "ERROR");
      log("❌ FALHA NA RESOLUÇÃO DO CAPTCHA", "ERROR");
      log("═══════════════════════════════════════════════════════", "ERROR");
      log(`Erro: ${error.message}`, "ERROR");
      log("", "ERROR");
      log("⚠️ Possíveis causas:", "ERROR");
      log("   1. Perda de contato com servidor Scrapeless", "ERROR");
      log("   2. Servidor Scrapeless está lento ou sobrecarregado", "ERROR");
      log("   3. Problemas de conexão de rede", "ERROR");
      log("   4. CAPTCHA não foi apresentado (página já estava liberada)", "ERROR");
      log("   5. Tipo de CAPTCHA não suportado pelo Scrapeless", "ERROR");

      // Capturar screenshot do timeout
      const timeoutFilename = getTimestampedFilename("captcha-timeout", "png");
      const timeoutScreenshot = path.join("screenshots", timeoutFilename);
      await page.screenshot({ path: timeoutScreenshot, fullPage: true });
      log(`📸 Screenshot do timeout capturado: ${timeoutScreenshot}`, "ERROR");
      log("═══════════════════════════════════════════════════════", "ERROR");

      throw new Error("Timeout aguardando resolução do CAPTCHA. Verifique conexão com Scrapeless.");
    }

    // Aguardar um pouco após resolver o CAPTCHA
    log("⏱️ Aguardando 3 segundos após resolução do CAPTCHA...", "INFO");
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Verificar se a página está realmente pronta (sem overlay de CAPTCHA)
    log("🔍 Verificando se página está completamente carregada...", "INFO");
    const pageReady = await page.evaluate(() => {
      // Verificar se não há overlay de CAPTCHA visível
      const captchaOverlay = document.querySelector('iframe[src*="recaptcha"], iframe[src*="captcha"], div[class*="captcha"]');
      const hasCaptchaVisible = captchaOverlay && captchaOverlay.offsetParent !== null;

      // Verificar se formulário está acessível
      const formExists = document.querySelector('form') !== null;

      return {
        noCaptchaVisible: !hasCaptchaVisible,
        formExists: formExists,
        ready: !hasCaptchaVisible && formExists
      };
    });

    log(`   Sem CAPTCHA visível: ${pageReady.noCaptchaVisible}`, "INFO");
    log(`   Formulário existe: ${pageReady.formExists}`, "INFO");

    if (!pageReady.ready) {
      log("⚠️ Página não está completamente pronta - CAPTCHA ainda pode estar visível", "WARNING");

      // Aguardar mais um pouco
      log("⏱️ Aguardando mais 5 segundos...", "INFO");
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Capturar screenshot para debug
      const notReadyFilename = getTimestampedFilename("page-not-ready", "png");
      const notReadyScreenshot = path.join("screenshots", notReadyFilename);
      await page.screenshot({ path: notReadyScreenshot, fullPage: true });
      log(`📸 Screenshot da página não pronta: ${notReadyScreenshot}`, "WARNING");
    } else {
      log("✅ Página completamente carregada e pronta!", "SUCCESS");
    }

    // Verificar se houve falha no bypass do reCAPTCHA
    log("🔍 Verificando se o bypass do reCAPTCHA foi bem-sucedido...", "INFO");
    const recaptchaCheckResult = await page.evaluate(() => {
      const messageDiv = document.querySelector('div#spwTabelaMensagem');
      if (!messageDiv) return { failed: false, message: null };

      const text = messageDiv.innerText || messageDiv.textContent || '';
      const failed = text.includes('Esta página é protegida por reCAPTCHA') ||
                     text.includes('ocorreu um problema de validação') ||
                     text.includes('reCAPTCHA');

      return { failed, message: text.trim() };
    });

    // Log de debug
    if (recaptchaCheckResult.message) {
      log(`🔍 Mensagem encontrada em div#spwTabelaMensagem: "${recaptchaCheckResult.message}"`, "INFO");
    }

    const recaptchaFailed = recaptchaCheckResult.failed;

    if (recaptchaFailed) {
      log("❌ FALHA NO BYPASS DO RECAPTCHA DETECTADA!", "ERROR");
      log("⚠️ Mensagem: 'Esta página é protegida por reCAPTCHA e ocorreu um problema de validação. Aguarde alguns segundos e tente novamente!'", "ERROR");

      // Capturar screenshot do erro com nome correto
      const errorFilename = getTimestampedFilename("captcha-bypass-fail", "png");
      const errorScreenshot = path.join("screenshots", errorFilename);
      await page.screenshot({ path: errorScreenshot, fullPage: true });
      log(`📸 Screenshot de falha do bypass capturado: ${errorScreenshot}`, "ERROR");

      // Parar o processo imediatamente (não tentar buscar div#tabs)
      log("🛑 Processo interrompido devido à falha no bypass do reCAPTCHA", "ERROR");
      log("ℹ️ Não é necessário buscar div#tabs pois o bypass falhou", "INFO");
      throw new Error("Bypass do reCAPTCHA falhou - processo interrompido");
    }

    log("✅ Bypass do reCAPTCHA bem-sucedido!", "SUCCESS");

    // === CARREGAR MAPEAMENTO DE CAMPOS ===
    log("Carregando mapeamento de campos...", "INFO");
    loadFieldsMapping();

    // === CARREGAR CONFIGURACAO ===
    log("Carregando configuracao de busca...", "INFO");
    const config = loadSearchConfig();

    // === PREENCHER FORMULARIO ===
    log("", "INFO");
    log("═══════════════════════════════════════════════════════", "INFO");
    log("📝 INICIANDO PREENCHIMENTO DO FORMULÁRIO", "INFO");
    log("═══════════════════════════════════════════════════════", "INFO");

    // Aguardar o primeiro campo estar disponivel
    const firstField = FIELDS_MAPPING["Pesquisa livre"];
    if (firstField) {
      log("⏳ Aguardando formulário estar disponível...", "INFO");
      try {
        await page.waitForSelector(firstField.selector, { timeout: 15000 });
        log("✅ Formulário está disponível!", "SUCCESS");
      } catch (error) {
        log("❌ Formulário não ficou disponível em 15 segundos!", "ERROR");

        // Capturar screenshot
        const formNotReadyFilename = getTimestampedFilename("form-not-ready", "png");
        const formNotReadyScreenshot = path.join("screenshots", formNotReadyFilename);
        await page.screenshot({ path: formNotReadyScreenshot, fullPage: true });
        log(`📸 Screenshot do formulário não disponível: ${formNotReadyScreenshot}`, "ERROR");

        throw new Error("Formulário não ficou disponível - possível problema com CAPTCHA");
      }
    }

    // Aguardar mais um pouco para garantir que página está estável
    log("⏱️ Aguardando 2 segundos para estabilização da página...", "INFO");
    await new Promise((resolve) => setTimeout(resolve, 2000));

    log("✅ Pronto para preencher formulário!", "SUCCESS");

    // Processar cada campo da configuracao
    for (const [friendlyName, value] of Object.entries(config)) {
      // Ignorar campo "Pagina" - não é um campo do formulário, é configuração de paginação
      if (friendlyName === "Pagina") {
        continue;
      }

      const fieldMapping = FIELDS_MAPPING[friendlyName];

      if (!fieldMapping) {
        log(`Campo "${friendlyName}" nao encontrado no mapeamento - ignorado`, "WARNING");
        continue;
      }

      // Ignorar valores vazios
      if (!value || (Array.isArray(value) && value.length === 0)) {
        continue;
      }

      // Processar de acordo com o tipo do campo
      try {
        switch (fieldMapping.type) {
          case "text":
            await fillTextField(page, friendlyName, fieldMapping, value);
            break;

          case "checkbox":
            await fillCheckbox(page, friendlyName, fieldMapping, value);
            break;

          case "checkbox-group":
            await fillCheckboxGroup(page, friendlyName, fieldMapping, value);
            break;

          case "radio":
            await fillRadio(page, friendlyName, fieldMapping, value);
            break;

          default:
            log(`Tipo de campo desconhecido: ${fieldMapping.type}`, "WARNING");
        }
      } catch (error) {
        log(`Erro ao preencher campo "${friendlyName}": ${error.message}`, "ERROR");
      }
    }

    log("Formulario preenchido com sucesso!", "SUCCESS");

    log("", "INFO");
    log("═══════════════════════════════════════════════════════", "INFO");
    log("🔍 CLICANDO NO BOTÃO PESQUISAR", "INFO");
    log("═══════════════════════════════════════════════════════", "INFO");

    // Clicar no botão sem aguardar navegação (pode ter CAPTCHA)
    await page.click('input[type="submit"][value="Pesquisar"]');
    log("✅ Botão clicado!", "SUCCESS");

    // Aguardar um pouco para ver se CAPTCHA aparece
    log("⏱️ Aguardando 2 segundos para detectar possível CAPTCHA...", "INFO");
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Verificar se CAPTCHA foi detectado após o clique
    log("🔍 Verificando se CAPTCHA foi detectado após submissão...", "INFO");

    try {
      // Aguardar resolução do CAPTCHA (se houver)
      const result = await onCaptchaFinished(page, 45000);

      log("", "INFO");
      log("═══════════════════════════════════════════════════════", "SUCCESS");
      log("✅ CAPTCHA PÓS-SUBMISSÃO RESOLVIDO!", "SUCCESS");
      log(`   Método usado: ${result.method}`, "SUCCESS");
      log("═══════════════════════════════════════════════════════", "SUCCESS");

      // Aguardar navegação após CAPTCHA resolvido
      log("⏳ Aguardando navegação para página de resultados...", "INFO");
      await page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 30000 });

    } catch (error) {
      // Se timeout, pode ser que não tinha CAPTCHA e já navegou
      log("ℹ️ Nenhum CAPTCHA detectado após submissão (ou já resolvido)", "INFO");
    }

    log("📄 Página de resultados carregada!", "SUCCESS");

    // Aguardar um pouco para a página carregar completamente
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Verificar novamente se houve falha no bypass APÓS submeter o formulário
    log("🔍 Verificando se há mensagem de erro após submissão...", "INFO");
    const postSubmitCheck = await page.evaluate(() => {
      const messageDiv = document.querySelector('div#spwTabelaMensagem');
      if (!messageDiv) return { failed: false, message: null };

      const text = messageDiv.innerText || messageDiv.textContent || '';
      const failed = text.includes('Esta página é protegida por reCAPTCHA') ||
                     text.includes('ocorreu um problema de validação') ||
                     text.includes('reCAPTCHA');

      return { failed, message: text.trim() };
    });

    if (postSubmitCheck.message) {
      log(`⚠️ Mensagem encontrada após submissão: "${postSubmitCheck.message}"`, "WARNING");
    }

    if (postSubmitCheck.failed) {
      log("❌ FALHA NO BYPASS DO RECAPTCHA DETECTADA APÓS SUBMISSÃO!", "ERROR");

      // Capturar screenshot do erro com nome correto
      const errorFilename = getTimestampedFilename("captcha-bypass-fail", "png");
      const errorScreenshot = path.join("screenshots", errorFilename);
      await page.screenshot({ path: errorScreenshot, fullPage: true });
      log(`📸 Screenshot de falha do bypass capturado: ${errorScreenshot}`, "ERROR");

      // Parar o processo imediatamente (não tentar buscar div#tabs)
      log("🛑 Processo interrompido devido à falha no bypass do reCAPTCHA", "ERROR");
      log("ℹ️ Não é necessário buscar div#tabs pois o bypass falhou", "INFO");
      throw new Error("Bypass do reCAPTCHA falhou após submissão - processo interrompido");
    }

    // Validar se a div#tabs existe
    log("🔍 Validando presença da div#tabs...", "INFO");
    const tabsExists = await page.evaluate(() => {
      return document.querySelector('div#tabs') !== null;
    });

    if (!tabsExists) {
      log("⚠️ Div#tabs não encontrada na página!", "WARNING");

      // Screenshot de erro (div#tabs não encontrada)
      const errorFilename = getTimestampedFilename("error", "png");
      const errorScreenshot = path.join("screenshots", errorFilename);
      await page.screenshot({ path: errorScreenshot, fullPage: true });
      log(`📸 Screenshot de erro capturado: ${errorScreenshot}`, "ERROR");

      throw new Error("Div#tabs não encontrada após pesquisa");
    }

    log("✅ Div#tabs encontrada!", "SUCCESS");

    // Screenshot de sucesso (somente quando div#tabs é encontrada)
    const screenshotFilename = getTimestampedFilename("shot", "png");
    const screenshotPath = path.join("screenshots", screenshotFilename);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    log(`📸 Screenshot de sucesso capturado: ${screenshotPath}`, "SUCCESS");

    // === PROCESSAR PAGINAÇÃO ===

    // Extrair dados da primeira página para obter informações de paginação
    log("📊 Extraindo dados da primeira página...", "INFO");
    const firstPageData = await extractPageData(page);

    if (!firstPageData) {
      log("⚠️ Não foi possível extrair dados da primeira página", "WARNING");
      return;
    }

    // Calcular total de páginas
    const itensPorPagina = firstPageData.resultados_fim - firstPageData.resultados_inicio + 1;
    const totalPaginas = Math.ceil(firstPageData.total_resultados / itensPorPagina);

    log(`📈 Resultados ${firstPageData.resultados_inicio} a ${firstPageData.resultados_fim} de ${firstPageData.total_resultados}`, "INFO");
    log(`📄 Total de páginas disponíveis: ${totalPaginas}`, "INFO");

    // Obter configuração de paginação
    const paginaConfig = config["Pagina"] || "1";
    let paginasParaProcessar = parsePagination(paginaConfig, totalPaginas);

    // Se for null (TODAS), criar array com todas as páginas
    if (paginasParaProcessar === null) {
      paginasParaProcessar = [];
      for (let i = 1; i <= totalPaginas; i++) {
        paginasParaProcessar.push(i);
      }
      log(`📚 Processando TODAS as ${totalPaginas} páginas`, "INFO");
    } else {
      // Filtrar páginas que excedem o total disponível
      paginasParaProcessar = paginasParaProcessar.filter(p => p <= totalPaginas);
      log(`📚 Processando ${paginasParaProcessar.length} página(s): ${paginasParaProcessar.join(", ")}`, "INFO");
    }

    // Estrutura para armazenar todos os dados
    const allData = {
      timestamp: new Date().toISOString(),
      total_resultados: firstPageData.total_resultados,
      total_paginas: totalPaginas,
      paginas_processadas: [],
      items: []
    };

    // Processar cada página
    for (const pageNum of paginasParaProcessar) {
      try {
        let pageData;

        if (pageNum === 1) {
          // Já temos os dados da primeira página
          pageData = firstPageData;
          log(`📄 Processando página 1 (já carregada)`, "INFO");
        } else {
          // Navegar para a página
          await navigateToPage(page, pageNum);

          // Extrair dados
          pageData = await extractPageData(page);

          if (!pageData) {
            log(`⚠️ Não foi possível extrair dados da página ${pageNum}`, "WARNING");
            continue;
          }
        }

        // Adicionar itens ao resultado final
        allData.items.push(...pageData.items);
        allData.paginas_processadas.push(pageNum);

        log(`✅ Página ${pageNum}: ${pageData.items.length} itens extraídos`, "SUCCESS");

      } catch (error) {
        log(`❌ Erro ao processar página ${pageNum}: ${error.message}`, "ERROR");
      }
    }

    // === CATEGORIZAÇÃO COM OPENAI ===
    log("", "INFO");
    log("═══════════════════════════════════════════════════════", "INFO");
    log("🤖 INICIANDO CATEGORIZAÇÃO COM OPENAI", "INFO");
    log("═══════════════════════════════════════════════════════", "INFO");

    let categorizadosComSucesso = 0;
    let errosCategorizacao = 0;

    for (let i = 0; i < allData.items.length; i++) {
      const item = allData.items[i];

      log(`📝 Categorizando item ${i + 1}/${allData.items.length} (Processo: ${item.numero_processo})...`, "INFO");

      if (!item.ementa || item.ementa.trim() === "") {
        log(`⚠️ Item ${i + 1} não possui ementa. Pulando categorização.`, "WARNING");
        item.categoria = "sem_ementa";
        item.codigo_categoria = "sem_ementa";
        item.desc_categoria = "Item não possui ementa para categorização";
        errosCategorizacao++;
        continue;
      }

      // Categorizar ementa
      const categorizacao = await categorizeEmenta(item.ementa);

      // Adicionar campos de categorização ao item
      item.categoria = categorizacao.categoria;
      item.codigo_categoria = categorizacao.codigo_categoria;
      item.desc_categoria = categorizacao.desc_categoria;

      if (categorizacao.codigo_categoria !== "erro_categorizacao") {
        categorizadosComSucesso++;
      } else {
        errosCategorizacao++;
      }

      // Pequeno delay para não sobrecarregar a API
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    log("", "INFO");
    log("═══════════════════════════════════════════════════════", "INFO");
    log("📊 RESUMO DA CATEGORIZAÇÃO", "INFO");
    log("═══════════════════════════════════════════════════════", "INFO");
    log(`✅ Categorizados com sucesso: ${categorizadosComSucesso}`, "SUCCESS");
    log(`❌ Erros na categorização: ${errosCategorizacao}`, errosCategorizacao > 0 ? "WARNING" : "INFO");
    log(`📊 Total de itens: ${allData.items.length}`, "INFO");
    log("═══════════════════════════════════════════════════════", "INFO");

    // === UPLOAD PARA PINECONE ===
    log("", "INFO");
    log("═══════════════════════════════════════════════════════", "INFO");
    log("🌲 INICIANDO UPLOAD PARA PINECONE", "INFO");
    log("═══════════════════════════════════════════════════════", "INFO");

    const pineconeResult = await uploadToPinecone(allData.items);

    log("", "INFO");
    log("═══════════════════════════════════════════════════════", "INFO");
    log("📊 RESUMO DO UPLOAD PARA PINECONE", "INFO");
    log("═══════════════════════════════════════════════════════", "INFO");

    if (pineconeResult.success) {
      log(`✅ Vetores enviados com sucesso: ${pineconeResult.uploaded}`, "SUCCESS");
      log(`❌ Erros no upload: ${pineconeResult.errors}`, pineconeResult.errors > 0 ? "WARNING" : "INFO");
      log(`📊 Total de itens: ${allData.items.length}`, "INFO");
    } else {
      log(`❌ Falha ao conectar com Pinecone`, "ERROR");
      log(`⚠️ Os dados foram salvos localmente em JSON`, "WARNING");
    }

    log("═══════════════════════════════════════════════════════", "INFO");

    // Salvar JSON consolidado com categorização
    const jsonFilename = getTimestampedFilename("scrap", "json");
    const jsonPath = path.join("scraps", jsonFilename);
    fs.writeFileSync(jsonPath, JSON.stringify(allData, null, 2), "utf-8");
    log(`💾 Dados salvos em JSON: ${jsonPath}`, "SUCCESS");

    // Logs de estatísticas finais
    log("", "INFO");
    log("═══════════════════════════════════════════════════════", "SUCCESS");
    log("📊 RESUMO DO SCRAPING", "SUCCESS");
    log("═══════════════════════════════════════════════════════", "SUCCESS");
    log(`📄 Total de páginas disponíveis: ${allData.total_paginas}`, "INFO");
    log(`📚 Páginas processadas: ${allData.paginas_processadas.length} (${allData.paginas_processadas.join(", ")})`, "INFO");
    log(`📊 Total de itens extraídos: ${allData.items.length}`, "SUCCESS");
    log(`📈 Total de resultados no sistema: ${allData.total_resultados}`, "INFO");
    log("═══════════════════════════════════════════════════════", "SUCCESS");
    log("", "INFO");

  } catch (error) {
    log(`❌ Erro no scraper: ${error.message}`, "ERROR");
    if (error.stack) log(error.stack, "ERROR");

    // Capturar screenshot de erro SOMENTE se não for erro de bypass do reCAPTCHA
    // (pois o bypass já captura seu próprio screenshot com nome captcha-bypass-fail_)
    const isCaptchaBypassError = error.message.includes("Bypass do reCAPTCHA falhou");
    const isCaptchaTimeoutError = error.message.includes("Timeout aguardando resolução do CAPTCHA");

    if (page && !isCaptchaBypassError && !isCaptchaTimeoutError) {
      try {
        const errorFilename = getTimestampedFilename("error", "png");
        const errorScreenshot = path.join("screenshots", errorFilename);
        await page.screenshot({ path: errorScreenshot, fullPage: true });
        log(`📸 Screenshot de erro salvo: ${errorScreenshot}`, "ERROR");
      } catch (screenshotError) {
        log(`❌ Erro ao capturar screenshot de erro: ${screenshotError.message}`, "ERROR");
      }
    } else if (isCaptchaBypassError) {
      log("ℹ️ Screenshot de falha do bypass já foi capturado anteriormente", "INFO");
    } else if (isCaptchaTimeoutError) {
      // Capturar screenshot específico para timeout do CAPTCHA
      try {
        const timeoutFilename = getTimestampedFilename("captcha-timeout", "png");
        const timeoutScreenshot = path.join("screenshots", timeoutFilename);
        await page.screenshot({ path: timeoutScreenshot, fullPage: true });
        log(`📸 Screenshot de timeout do CAPTCHA salvo: ${timeoutScreenshot}`, "ERROR");
      } catch (screenshotError) {
        log(`❌ Erro ao capturar screenshot de timeout: ${screenshotError.message}`, "ERROR");
      }
    }

    throw error;
  }
}

// Executar o scraper
main().catch((error) => {
  console.error("❌ Erro não tratado:", error);
  process.exit(1);
});
