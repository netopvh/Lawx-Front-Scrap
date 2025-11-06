/**
 * ═══════════════════════════════════════════════════════════════════════
 * SCRAPER STF - Supremo Tribunal Federal
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Extrai jurisprudências do site do STF usando Scrapeless Cloud Browser.
 *
 * CARACTERÍSTICAS:
 * - Scrapeless Cloud Browser (escalabilidade)
 * - Sem CAPTCHA handling (site não possui proteção)
 * - Puppeteer-core + WebSocket
 * - URL com parâmetros GET (construção direta)
 * - Paginação simples (page=1, page=2, etc.)
 * - Rápido e eficiente
 *
 * ═══════════════════════════════════════════════════════════════════════
 */

import puppeteer from "puppeteer-core";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
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

// ═══════════════════════════════════════════════════════════════════════
// CONFIGURAÇÕES
// ═══════════════════════════════════════════════════════════════════════

const STF_BASE_URL = process.env.STF_URL || "https://jurisprudencia.stf.jus.br/pages/search";
const LOG_DIR = "logs";
const SCREENSHOT_DIR = "screenshots";
const SCRAP_DIR = "scraps";

// Mapeamento de campos amigáveis (busca.json) para nomes técnicos (URL params)
const FIELD_MAPPING = {
  "Pesquisa livre": "queryString",
  "Base de dados": "base",
  "Pesquisar no inteiro teor": "pesquisa_inteiro_teor",
  "Pesquisar com sinônimos": "sinonimo",
  "Pesquisar no plural": "plural",
  "Pesquisar radicais": "radicais",
  "Busca exata": "buscaExata",
  "Pagina": "page",
  "Resultados por página": "pageSize",
  "Ordenar por": "sort",
  "Ordem": "sortBy",
};

let logFilePath = null;

// ═══════════════════════════════════════════════════════════════════════
// FUNÇÕES DE LOG
// ═══════════════════════════════════════════════════════════════════════

/**
 * Garante que os diretórios necessários existem
 */
function ensureDirectories() {
  const dirs = ["screenshots", "logs", "scraps"];

  dirs.forEach(dir => {
    const dirPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
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
 * Função de log
 */
function log(message, type = "INFO") {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${type}] ${message}`;

  console.log(logMessage);

  if (logFilePath) {
    fs.appendFileSync(logFilePath, logMessage + "\n", "utf-8");
  }
}

function initLog() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }

  const timestamp = new Date()
    .toISOString()
    .replace(/:/g, "-")
    .replace(/\..+/, "")
    .replace("T", "_");

  logFilePath = path.join(LOG_DIR, `log_${timestamp}.log`);
  log("Log iniciado: " + logFilePath, "INFO");
}

// ═══════════════════════════════════════════════════════════════════════
// FUNÇÕES DE CONFIGURAÇÃO
// ═══════════════════════════════════════════════════════════════════════

function loadConfig(filename) {
  try {
    const configPath = path.join("config", filename);
    const content = fs.readFileSync(configPath, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    log(`Erro ao carregar ${filename}: ${error.message}`, "ERROR");
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// FUNÇÕES DE URL
// ═══════════════════════════════════════════════════════════════════════

/**
 * Converte campos amigáveis para campos técnicos
 */
function convertFriendlyFieldsToTechnical(buscaConfig) {
  const technicalConfig = {};

  // Converter campos amigáveis para técnicos
  for (const [friendlyName, value] of Object.entries(buscaConfig)) {
    // Ignorar campos que começam com _
    if (friendlyName.startsWith("_")) {
      continue;
    }

    // Se existe mapeamento, usar o nome técnico
    const technicalName = FIELD_MAPPING[friendlyName] || friendlyName;
    technicalConfig[technicalName] = value;
  }

  return technicalConfig;
}

function buildSearchUrl(params) {
  // Converter campos amigáveis para técnicos
  const technicalParams = convertFriendlyFieldsToTechnical(params);

  const queryParams = new URLSearchParams();

  // Adicionar parâmetros obrigatórios
  if (technicalParams.queryString) queryParams.set("queryString", technicalParams.queryString);
  if (technicalParams.base) queryParams.set("base", technicalParams.base);

  // Adicionar parâmetros opcionais
  if (technicalParams.pesquisa_inteiro_teor !== undefined) {
    queryParams.set("pesquisa_inteiro_teor", technicalParams.pesquisa_inteiro_teor);
  }
  if (technicalParams.sinonimo !== undefined) queryParams.set("sinonimo", technicalParams.sinonimo);
  if (technicalParams.plural !== undefined) queryParams.set("plural", technicalParams.plural);
  if (technicalParams.radicais !== undefined) queryParams.set("radicais", technicalParams.radicais);
  if (technicalParams.buscaExata !== undefined) queryParams.set("buscaExata", technicalParams.buscaExata);
  if (technicalParams.page !== undefined) queryParams.set("page", technicalParams.page);
  if (technicalParams.pageSize !== undefined) queryParams.set("pageSize", technicalParams.pageSize);
  if (technicalParams.sort) queryParams.set("sort", technicalParams.sort);
  if (technicalParams.sortBy) queryParams.set("sortBy", technicalParams.sortBy);

  return `${STF_BASE_URL}?${queryParams.toString()}`;
}

// ═══════════════════════════════════════════════════════════════════════
// FUNÇÕES DE PAGINAÇÃO
// ═══════════════════════════════════════════════════════════════════════

function parsePagination(paginaValue) {
  if (!paginaValue || paginaValue.trim() === "") {
    return [1]; // Padrão: apenas página 1
  }

  const value = String(paginaValue).trim().toUpperCase();

  // Todas as páginas
  if (value === "TODAS" || value === "ALL" || value === "TODOS") {
    return null; // Indica que deve processar todas
  }

  // Intervalo (ex: "1-5")
  if (value.includes("-")) {
    const [start, end] = value.split("-").map((n) => parseInt(n.trim()));
    if (isNaN(start) || isNaN(end) || start > end) {
      log(`Intervalo inválido: ${value}. Usando página 1.`, "WARNING");
      return [1];
    }
    const pages = [];
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  // Lista específica (ex: "1;3;5")
  if (value.includes(";")) {
    const pages = value
      .split(";")
      .map((n) => parseInt(n.trim()))
      .filter((n) => !isNaN(n) && n > 0);
    return pages.length > 0 ? pages : [1];
  }

  // Página única
  const page = parseInt(value);
  if (isNaN(page) || page < 1) {
    log(`Página inválida: ${value}. Usando página 1.`, "WARNING");
    return [1];
  }

  return [page];
}

// ═══════════════════════════════════════════════════════════════════════
// FUNÇÕES DE EXTRAÇÃO
// ═══════════════════════════════════════════════════════════════════════

async function checkResults(page, pageNum) {
  try {
    // Verificar se há elementos de resultado
    const resultCount = await page.evaluate(() => {
      const containers = document.querySelectorAll('.result-container');
      return containers.length;
    });

    if (resultCount > 0) {
      log(`✅ ${resultCount} resultados encontrados na página`, "SUCCESS");

      // Screenshot de sucesso
      const screenshotFilename = getTimestampedFilename(`page-${pageNum}-success`, "png");
      const screenshotPath = path.join(SCREENSHOT_DIR, screenshotFilename);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      log(`📸 Screenshot de sucesso: ${screenshotPath}`, "SUCCESS");

      return true;
    }

    log("⚠️ Nenhum resultado encontrado", "WARNING");

    // Screenshot de página sem resultados
    const noResultsFilename = getTimestampedFilename(`page-${pageNum}-no-results`, "png");
    const noResultsPath = path.join(SCREENSHOT_DIR, noResultsFilename);
    await page.screenshot({ path: noResultsPath, fullPage: true });
    log(`📸 Screenshot de página sem resultados: ${noResultsPath}`, "WARNING");

    return false;
  } catch (error) {
    log(`❌ Erro ao verificar resultados: ${error.message}`, "ERROR");

    // Screenshot de erro
    const errorFilename = getTimestampedFilename(`page-${pageNum}-check-error`, "png");
    const errorPath = path.join(SCREENSHOT_DIR, errorFilename);
    await page.screenshot({ path: errorPath, fullPage: true });
    log(`📸 Screenshot de erro: ${errorPath}`, "ERROR");

    return false;
  }
}

async function extractData(page, fieldsConfig) {
  try {
    log("📊 Extraindo dados da página...", "INFO");

    const items = await page.evaluate((config) => {
      const results = [];
      const resultSelector = config.resultados?.selector || "div.result-item, mat-card";
      const resultElements = document.querySelectorAll(resultSelector);

      resultElements.forEach((element) => {
        const item = {};

        // Extrair cada campo configurado
        for (const [fieldName, fieldConfig] of Object.entries(config)) {
          if (fieldName === "resultados") continue; // Pular o seletor de container
          if (fieldName.startsWith("_")) continue; // Pular comentários

          try {
            const selector = fieldConfig.selector;
            const attribute = fieldConfig.attribute;
            const fieldElement = element.querySelector(selector);

            if (fieldElement) {
              if (attribute) {
                item[fieldName] = fieldElement.getAttribute(attribute) || "";
              } else {
                item[fieldName] = (fieldElement.innerText || fieldElement.textContent || "").trim();
              }
            } else {
              item[fieldName] = "";
            }
          } catch (err) {
            item[fieldName] = "";
          }
        }

        // Extração customizada para campos que precisam de lógica especial
        // Buscar por padrões de texto nos H4s
        const allH4s = element.querySelectorAll('h4');
        allH4s.forEach(h4 => {
          const text = h4.textContent || '';
          const span = h4.querySelector('span');
          const spanText = span ? span.textContent?.trim() : '';

          if (text.includes('Órgão julgador:') && spanText) {
            item.orgao_julgador = spanText;
          } else if (text.includes('Relator(a):') && spanText) {
            item.relator = spanText;
          } else if (text.includes('Redator(a)') && spanText) {
            item.redator_acordao = spanText;
          } else if (text.includes('Julgamento:') && spanText) {
            item.data_julgamento = spanText;
          } else if (text.includes('Publicação:') && spanText) {
            item.data_publicacao = spanText;
          }
        });

        // Adicionar apenas se tiver algum dado
        if (Object.values(item).some(v => v !== "")) {
          results.push(item);
        }
      });

      return results;
    }, fieldsConfig);

    log(`✅ Extraídos ${items.length} itens`, "SUCCESS");
    return items;

  } catch (error) {
    log(`Erro ao extrair dados: ${error.message}`, "ERROR");
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════
// FUNÇÕES DE CATEGORIZAÇÃO E PINECONE
// ═══════════════════════════════════════════════════════════════════════

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
    return true;

  } catch (error) {
    log(`❌ Erro ao verificar/criar índice Pinecone: ${error.message}`, "ERROR");
    return false;
  }
}

/**
 * Normaliza nome de categoria para usar como namespace no Pinecone
 * Remove acentos, espaços e caracteres especiais
 */
function normalizeNamespace(categoria) {
  if (!categoria) return "sem-categoria";

  return categoria
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remover acentos
    .replace(/[^a-z0-9]+/g, "-") // Substituir caracteres especiais por hífen
    .replace(/^-+|-+$/g, ""); // Remover hífens do início e fim
}

/**
 * Envia itens para Pinecone como vetores
 * Organiza por categoria usando namespaces
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

    // Agrupar itens por categoria
    const itemsByCategory = {};
    for (const item of items) {
      const categoria = item.categoria || "Sem Categoria";
      if (!itemsByCategory[categoria]) {
        itemsByCategory[categoria] = [];
      }
      itemsByCategory[categoria].push(item);
    }

    log(`📊 Itens agrupados em ${Object.keys(itemsByCategory).length} categoria(s)`, "INFO");
    for (const [categoria, categoryItems] of Object.entries(itemsByCategory)) {
      const namespace = normalizeNamespace(categoria);
      log(`   📁 ${categoria}: ${categoryItems.length} itens → namespace: "${namespace}"`, "INFO");
    }
    log("", "INFO");

    let totalUploaded = 0;
    let totalErrors = 0;

    // Processar cada categoria separadamente
    for (const [categoria, categoryItems] of Object.entries(itemsByCategory)) {
      const namespace = normalizeNamespace(categoria);

      log(`📁 Processando categoria: ${categoria} (namespace: "${namespace}")`, "INFO");
      log(`   Total de itens: ${categoryItems.length}`, "INFO");

      let uploaded = 0;
      let errors = 0;

      // Processar em lotes de 10 itens
      const batchSize = 10;
      for (let i = 0; i < categoryItems.length; i += batchSize) {
        const batch = categoryItems.slice(i, i + batchSize);

        log(`   📤 Lote ${Math.floor(i / batchSize) + 1}/${Math.ceil(categoryItems.length / batchSize)} (${batch.length} itens)...`, "INFO");

        const vectors = [];

        for (const item of batch) {
          try {
            // Criar texto combinado para embedding (ementa + categoria + tipo_decisao)
            const textForEmbedding = `
              Ementa: ${item.ementa || ""}
              Categoria: ${item.categoria || ""}
              Tipo de Decisão: ${item.tipo_decisao || ""}
              Órgão Julgador: ${item.orgao_julgador || ""}
            `.trim();

            // Gerar embedding
            log(`      🔄 Gerando embedding para processo ${item.numero_processo}...`, "INFO");
            const embedding = await generateEmbedding(textForEmbedding);

            // Preparar vetor para Pinecone
            vectors.push({
              id: item.numero_processo.replace(/[^0-9]/g, ""), // Remover caracteres especiais do ID
              values: embedding,
              metadata: {
                numero_processo: item.numero_processo,
                orgao_julgador: item.orgao_julgador || "",
                relator: item.relator || "",
                redator_acordao: item.redator_acordao || "",
                data_julgamento: item.data_julgamento || "",
                data_publicacao: item.data_publicacao || "",
                tipo_decisao: item.tipo_decisao || "",
                categoria: item.categoria || "",
                codigo_categoria: item.codigo_categoria || "",
                desc_categoria: item.desc_categoria || "",
                link_detalhes: item.link_detalhes || "",
                link_acompanhamento: item.link_acompanhamento || "",
                link_tema_repercussao: item.link_tema_repercussao || "",
                ementa: item.ementa ? item.ementa.substring(0, 40000) : "" // Pinecone tem limite de metadata
              }
            });

            uploaded++;

          } catch (error) {
            log(`      ❌ Erro ao processar item ${item.numero_processo}: ${error.message}`, "ERROR");
            errors++;
          }
        }

        // Enviar lote para Pinecone no namespace da categoria
        if (vectors.length > 0) {
          try {
            await index.namespace(namespace).upsert(vectors);
            log(`      ✅ Lote enviado para namespace "${namespace}": ${vectors.length} vetores`, "SUCCESS");
          } catch (error) {
            log(`      ❌ Erro ao enviar lote para Pinecone: ${error.message}`, "ERROR");
            errors += vectors.length;
            uploaded -= vectors.length;
          }
        }

        // Pequeno delay entre lotes
        if (i + batchSize < categoryItems.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      log(`   ✅ Categoria "${categoria}" concluída: ${uploaded} enviados, ${errors} erros`, uploaded > 0 ? "SUCCESS" : "WARNING");
      log("", "INFO");

      totalUploaded += uploaded;
      totalErrors += errors;
    }

    return { success: true, uploaded: totalUploaded, errors: totalErrors };

  } catch (error) {
    log(`❌ Erro ao conectar com Pinecone: ${error.message}`, "ERROR");
    return { success: false, uploaded: 0, errors: items.length };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// FUNÇÃO PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════

async function main() {
  let browser = null;
  let page = null;

  try {
    initLog();

    log("═══════════════════════════════════════════════════════", "INFO");
    log("=== INICIANDO SCRAPER STF ===", "INFO");
    log("═══════════════════════════════════════════════════════", "INFO");

    // Garantir que diretórios existem
    ensureDirectories();

    // Carregar configurações
    log("📂 Carregando configurações...", "INFO");
    const buscaConfig = loadConfig("busca.json");
    const fieldsConfig = loadConfig("fields.json");
    log("✅ Configurações carregadas", "SUCCESS");

    // Parsear paginação (aceita tanto "Pagina" quanto "page")
    const paginaValue = buscaConfig["Pagina"] || buscaConfig.page || "1";
    let pages = parsePagination(paginaValue);
    if (pages === null) {
      log("⚠️ Modo 'TODAS AS PÁGINAS' não implementado ainda. Usando página 1.", "WARNING");
      pages = [1];
    }

    log(`📚 Processando ${pages.length} página(s): ${pages.join(", ")}`, "INFO");

    // Conectar ao Scrapeless Cloud Browser
    log("🌐 Conectando ao Scrapeless Cloud Browser...", "INFO");

    const query = new URLSearchParams({
      token: process.env.SCRAPELESS_TOKEN,
      proxyCountry: "BR", // Usar sempre proxy BR (funciona melhor com sites brasileiros)
      sessionRecording: process.env.SCRAPELESS_SESSION_RECORDING === "true",
      sessionTTL: parseInt(process.env.SCRAPELESS_SESSION_TTL || "900"),
      sessionName: process.env.SCRAPELESS_SESSION_NAME || "STF Scraper",
    });

    const connectionURL = `wss://browser.scrapeless.com/api/v2/browser?${query.toString()}`;

    browser = await Promise.race([
      puppeteer.connect({
        browserWSEndpoint: connectionURL,
        defaultViewport: null,
        ignoreHTTPSErrors: true,
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout ao conectar ao Scrapeless (30s)")), 30000)
      )
    ]);

    log("✅ Conectado ao Scrapeless Cloud Browser com Proxy Brasil!", "SUCCESS");

    // Aguardar antes de criar a página (Scrapeless precisa de tempo para estabilizar)
    const initialDelay = 3000;
    log(`⏳ Aguardando ${initialDelay/1000}s antes de criar página...`, "INFO");
    await new Promise(resolve => setTimeout(resolve, initialDelay));

    page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Ignorar erros de certificado SSL
    await page.setBypassCSP(true);

    log("✅ Nova página criada", "SUCCESS");

    // Aguardar mais um pouco antes de navegar
    const preNavDelay = 3000;
    log(`⏳ Aguardando ${preNavDelay/1000}s antes de navegar...`, "INFO");
    await new Promise(resolve => setTimeout(resolve, preNavDelay));

    // Processar cada página
    const allItems = [];

    for (const pageNum of pages) {
      log("", "INFO");
      log(`📄 Processando página ${pageNum}...`, "INFO");

      // Construir URL
      const url = buildSearchUrl({ ...buscaConfig, page: pageNum });
      log(`🔗 URL: ${url}`, "INFO");

      // Acessar página com retry
      log("⏳ Aguardando carregamento da página...", "INFO");

      let pageLoaded = false;
      let gotoAttempt = 0;
      const maxGotoAttempts = 3;

      while (!pageLoaded && gotoAttempt < maxGotoAttempts) {
        gotoAttempt++;

        try {
          if (gotoAttempt > 1) {
            log(`   🔄 Tentativa ${gotoAttempt}/${maxGotoAttempts}...`, "INFO");
          }

          await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
          pageLoaded = true;
          log("✅ Página carregada", "SUCCESS");

        } catch (gotoError) {
          log(`⚠️ Erro ao carregar (tentativa ${gotoAttempt}): ${gotoError.message}`, "WARNING");

          // Se for erro de túnel e ainda temos tentativas, aguardar mais tempo
          if (gotoError.message.includes('ERR_TUNNEL_CONNECTION_FAILED') && gotoAttempt < maxGotoAttempts) {
            const retryDelay = 10000 * gotoAttempt; // 10s, 20s, 30s
            log(`   ⏳ Aguardando ${retryDelay/1000}s antes de tentar novamente...`, "INFO");
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          } else if (gotoAttempt >= maxGotoAttempts) {
            throw new Error(`Falha ao carregar página após ${maxGotoAttempts} tentativas: ${gotoError.message}`);
          } else {
            // Outros erros, aguardar menos tempo
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
        }
      }

      // Aguardar JavaScript e Angular carregar completamente
      const jsLoadDelay = 10000;
      log(`⏳ Aguardando ${jsLoadDelay/1000}s para JavaScript/Angular carregar...`, "INFO");
      await new Promise(resolve => setTimeout(resolve, jsLoadDelay));

      // Verificar se há resultados
      const hasResults = await checkResults(page, pageNum);
      if (!hasResults) {
        log(`⚠️ Página ${pageNum} sem resultados. Pulando...`, "WARNING");
        continue;
      }

      // Extrair dados
      const items = await extractData(page, fieldsConfig);
      allItems.push(...items);

      log(`✅ Página ${pageNum}: ${items.length} itens extraídos`, "SUCCESS");

      // Aguardar entre páginas (evita sobrecarga do Scrapeless)
      if (pageNum !== pages[pages.length - 1]) { // Não aguardar após última página
        const betweenPagesDelay = 5000;
        log(`⏳ Aguardando ${betweenPagesDelay/1000}s antes da próxima página...`, "INFO");
        await new Promise(resolve => setTimeout(resolve, betweenPagesDelay));
      }
    }

    log("", "INFO");
    log("═══════════════════════════════════════════════════════", "INFO");
    log("EXTRAÇÃO CONCLUÍDA", "SUCCESS");
    log("═══════════════════════════════════════════════════════", "INFO");
    log(`📊 Total de itens extraídos: ${allItems.length}`, "INFO");

    // === CATEGORIZAÇÃO COM OPENAI ===
    if (allItems.length > 0) {
      log("", "INFO");
      log("═══════════════════════════════════════════════════════", "INFO");
      log("🤖 INICIANDO CATEGORIZAÇÃO COM OPENAI", "INFO");
      log("═══════════════════════════════════════════════════════", "INFO");

      let categorizadosComSucesso = 0;
      let errosCategorizacao = 0;

      for (let i = 0; i < allItems.length; i++) {
        const item = allItems[i];

        log(`📝 Categorizando item ${i + 1}/${allItems.length} (Processo: ${item.numero_processo})...`, "INFO");

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
      log(`📊 Total de itens: ${allItems.length}`, "INFO");
      log("═══════════════════════════════════════════════════════", "INFO");

      // === UPLOAD PARA PINECONE ===
      log("", "INFO");
      log("═══════════════════════════════════════════════════════", "INFO");
      log("🌲 INICIANDO UPLOAD PARA PINECONE", "INFO");
      log("═══════════════════════════════════════════════════════", "INFO");

      const pineconeResult = await uploadToPinecone(allItems);

      log("", "INFO");
      log("═══════════════════════════════════════════════════════", "INFO");
      log("📊 RESUMO DO UPLOAD PARA PINECONE", "INFO");
      log("═══════════════════════════════════════════════════════", "INFO");

      if (pineconeResult.success) {
        log(`✅ Vetores enviados com sucesso: ${pineconeResult.uploaded}`, "SUCCESS");
        log(`❌ Erros no upload: ${pineconeResult.errors}`, pineconeResult.errors > 0 ? "WARNING" : "INFO");
        log(`📊 Total de itens: ${allItems.length}`, "INFO");
      } else {
        log(`❌ Falha ao conectar com Pinecone`, "ERROR");
        log(`⚠️ Os dados foram salvos localmente em JSON`, "WARNING");
      }

      log("═══════════════════════════════════════════════════════", "INFO");
    }

    // Salvar dados com categorização
    if (allItems.length > 0) {
      if (!fs.existsSync(SCRAP_DIR)) {
        fs.mkdirSync(SCRAP_DIR, { recursive: true });
      }

      const timestamp = new Date()
        .toISOString()
        .replace(/:/g, "-")
        .replace(/\..+/, "")
        .replace("T", "_");

      const scrapPath = path.join(SCRAP_DIR, `scrap_${timestamp}.json`);

      const output = {
        timestamp: new Date().toISOString(),
        total_items: allItems.length,
        total_pages: pages.length,
        items: allItems
      };

      fs.writeFileSync(scrapPath, JSON.stringify(output, null, 2), "utf-8");
      log(`💾 Dados salvos com categorização: ${scrapPath}`, "SUCCESS");
    }

    log("═══════════════════════════════════════════════════════", "SUCCESS");

  } catch (error) {
    log(`❌ Erro fatal no main(): ${error.message}`, "ERROR");
    if (error.stack) log(error.stack, "ERROR");

    // Capturar screenshot de erro se possível
    if (page) {
      try {
        const errorFilename = getTimestampedFilename("error", "png");
        const errorScreenshot = path.join(SCREENSHOT_DIR, errorFilename);
        await page.screenshot({ path: errorScreenshot, fullPage: true });
        log(`📸 Screenshot de erro salvo: ${errorScreenshot}`, "ERROR");
      } catch (screenshotError) {
        log(`❌ Erro ao capturar screenshot de erro: ${screenshotError.message}`, "ERROR");
      }
    }
  } finally {
    if (browser) {
      await browser.close();
      log("🔒 Browser fechado", "INFO");
    }
    log("Log finalizado", "INFO");
  }
}

// Executar
main();

