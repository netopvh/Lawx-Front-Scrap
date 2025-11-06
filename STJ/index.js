/**
 * ═══════════════════════════════════════════════════════════════════════
 * SCRAPER STJ/TFR - Superior Tribunal de Justiça / Tribunal Federal de Recursos
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Extrai jurisprudências do site do STJ usando Scrapeless Cloud Browser.
 *
 * CARACTERÍSTICAS:
 * - Scrapeless Cloud Browser (escalabilidade)
 * - Suporte dual tribunal: STJ e TFR
 * - Cloudflare Turnstile (⚠️ BLOQUEIO ATIVO - NÃO RESOLVIDO)
 * - Puppeteer-core + WebSocket
 * - Campo sigla_tribunal para identificação do tribunal de origem
 *
 * ⚠️ PROBLEMA CONHECIDO:
 * O site do STJ usa Cloudflare Turnstile que atualmente bloqueia o acesso
 * automatizado. O Scrapeless detecta mas não consegue resolver automaticamente.
 * 
 * SOLUÇÕES POSSÍVEIS:
 * 1. API oficial do STJ (se disponível)
 * 2. Scraping manual assistido (usuário resolve CAPTCHA)
 * 3. Serviço especializado (FlareSolverr, 2Captcha, Anti-Captcha)
 * 4. Análise dos screenshots fornecidos
 *
 * ═══════════════════════════════════════════════════════════════════════
 */

import puppeteer from "puppeteer-core";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import OpenAI from "openai";
import { Pinecone } from "@pinecone-database/pinecone";
import { EventEmitter } from "events";

// Carregar variáveis de ambiente
dotenv.config();

// EventEmitter para comunicação entre funções (CAPTCHA)
const emitter = new EventEmitter();

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

const STJ_BASE_URL = process.env.STJ_URL || "https://scon.stj.jus.br/SCON/";
const LOG_DIR = "logs";
const SCREENSHOT_DIR = "screenshots";
const SCRAP_DIR = "scraps";

// Mapeamento de campos amigáveis (busca.json) para nomes técnicos (DOM)
const FIELD_MAPPING = {
  "Tribunal": "tribunal",
  "Pesquisa livre": "livre",
  "Número do processo": "processo",
  "Classe processual": "classe",
  "Unidade Federativa": "uf",
  "Data de publicação (início)": "dtpb1",
  "Data de publicação (fim)": "dtpb2",
  "Data de decisão (início)": "dtde1",
  "Data de decisão (fim)": "dtde2",
  "Ementa": "ementa",
  "Nota": "nota",
  "Número da Súmula": "sumula",
  "Pagina": "pagina",
};

let logFilePath = null;

// ═══════════════════════════════════════════════════════════════════════
// FUNÇÕES DE LOG
// ═══════════════════════════════════════════════════════════════════════

function initLog() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }

  const timestamp = new Date()
    .toISOString()
    .replace(/:/g, "-")
    .replace(/\..+/, "")
    .replace("T", "_");

  logFilePath = path.join(LOG_DIR, `stj_${timestamp}.log`);
  log("═══════════════════════════════════════════════════════", "INFO");
  log("=== LOG INICIADO ===", "INFO");
  log("═══════════════════════════════════════════════════════", "INFO");
}

function log(message, level = "INFO") {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}`;

  console.log(logMessage);

  if (logFilePath) {
    fs.appendFileSync(logFilePath, logMessage + "\n", "utf-8");
  }
}

function closeLog() {
  if (logFilePath) {
    log("═══════════════════════════════════════════════════════", "INFO");
    log("=== LOG FINALIZADO ===", "INFO");
    log("═══════════════════════════════════════════════════════", "INFO");
  }
}

// ═══════════════════════════════════════════════════════════════════════
// FUNÇÕES DE CAPTCHA (Cloudflare Turnstile)
// ═══════════════════════════════════════════════════════════════════════

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
 * Gera nome de arquivo com timestamp
 */
function getTimestampedFilename(prefix = "shot", extension = "png") {
  const now = new Date();
  const date = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const time = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
  return `${prefix}_${date}_${time}.${extension}`;
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

    // Contador para screenshots periódicos
    let screenshotCounter = 0;
    const screenshotInterval = 30000; // 30 segundos
    let lastScreenshotTime = Date.now();

    // Verificação visual periódica (apenas se CAPTCHA NÃO foi detectado pelo CDP)
    const checkInterval = setInterval(async () => {
      try {
        // Se CAPTCHA foi detectado pelo CDP, aguardar apenas o evento de resolução
        if (captchaDetected && !captchaSolved) {
          log("   ⏳ CAPTCHA detectado - aguardando Scrapeless resolver...", "INFO");

          // Capturar screenshot periódico a cada 30s
          const now = Date.now();
          if (now - lastScreenshotTime >= screenshotInterval) {
            screenshotCounter++;
            lastScreenshotTime = now;

            try {
              const filename = getTimestampedFilename(`captcha-waiting-${screenshotCounter}`, "png");
              const screenshotPath = path.join("screenshots", filename);
              await page.screenshot({ path: screenshotPath, fullPage: true });
              log(`📸 Screenshot periódico ${screenshotCounter} salvo: ${screenshotPath}`, "INFO");

              // Identificar tipo de CAPTCHA na página
              const captchaType = await page.evaluate(() => {
                const types = [];

                // Cloudflare Turnstile
                if (document.querySelector('iframe[src*="challenges.cloudflare.com"]') ||
                    document.querySelector('[id*="cf-turnstile"]') ||
                    document.querySelector('[class*="cf-turnstile"]')) {
                  types.push('Cloudflare Turnstile');
                }

                // reCAPTCHA v2
                if (document.querySelector('iframe[src*="google.com/recaptcha"]') ||
                    document.querySelector('.g-recaptcha')) {
                  types.push('reCAPTCHA v2');
                }

                // reCAPTCHA v3
                if (document.querySelector('.grecaptcha-badge')) {
                  types.push('reCAPTCHA v3');
                }

                // hCaptcha
                if (document.querySelector('iframe[src*="hcaptcha.com"]') ||
                    document.querySelector('.h-captcha')) {
                  types.push('hCaptcha');
                }

                // Verificar iframes genéricos
                const iframes = Array.from(document.querySelectorAll('iframe'));
                const iframeInfo = iframes.map(iframe => ({
                  src: iframe.src,
                  id: iframe.id,
                  className: iframe.className
                }));

                return {
                  types: types.length > 0 ? types : ['Desconhecido'],
                  iframeCount: iframes.length,
                  iframes: iframeInfo
                };
              });

              log(`🔍 Tipo(s) de CAPTCHA detectado(s): ${captchaType.types.join(', ')}`, "INFO");
              log(`   Total de iframes na página: ${captchaType.iframeCount}`, "INFO");
              if (captchaType.iframes.length > 0) {
                captchaType.iframes.forEach((iframe, idx) => {
                  log(`   iframe[${idx}]: src="${iframe.src.substring(0, 60)}..." id="${iframe.id}" class="${iframe.className}"`, "INFO");
                });
              }
            } catch (screenshotError) {
              log(`⚠️ Erro ao capturar screenshot periódico: ${screenshotError.message}`, "WARNING");
            }
          }

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

// ═══════════════════════════════════════════════════════════════════════
// FUNÇÕES AUXILIARES
// ═══════════════════════════════════════════════════════════════════════

function ensureDirectories() {
  [LOG_DIR, SCREENSHOT_DIR, SCRAP_DIR].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

function loadConfig(filename) {
  try {
    const configPath = path.join(process.cwd(), "config", filename);
    if (!fs.existsSync(configPath)) {
      log(`⚠️ Arquivo ${filename} não encontrado`, "WARNING");
      return {};
    }
    const content = fs.readFileSync(configPath, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    log(`❌ Erro ao carregar ${filename}: ${error.message}`, "ERROR");
    return {};
  }
}

function loadCategories() {
  try {
    const csvPath = path.join(process.cwd(), "config", "categorias.csv");
    if (!fs.existsSync(csvPath)) {
      log("⚠️ Arquivo categorias.csv não encontrado", "WARNING");
      return [];
    }

    const content = fs.readFileSync(csvPath, "utf-8");
    const lines = content.split("\n").filter((line) => line.trim());

    // Pular cabeçalho
    const categories = lines.slice(1).map((line) => {
      const [codigo, categoria, descricao] = line.split(";").map((s) => s.trim());
      return { codigo, categoria, descricao };
    });

    return categories;
  } catch (error) {
    log(`❌ Erro ao carregar categorias: ${error.message}`, "ERROR");
    return [];
  }
}

function loadPrompt(filename) {
  try {
    const promptPath = path.join(process.cwd(), "prompts", filename);
    if (!fs.existsSync(promptPath)) {
      log(`⚠️ Arquivo ${filename} não encontrado`, "WARNING");
      return "";
    }
    return fs.readFileSync(promptPath, "utf-8");
  } catch (error) {
    log(`❌ Erro ao carregar prompt ${filename}: ${error.message}`, "ERROR");
    return "";
  }
}

function parsePagination(paginaConfig) {
  // Suporta: número (1), intervalo (1-5), lista (1,3,5), ou TODAS/ALL/TODOS/""
  if (!paginaConfig || paginaConfig === "" || 
      paginaConfig === "TODAS" || paginaConfig === "ALL" || 
      paginaConfig === "TODOS" || paginaConfig === "TODAS") {
    return null; // Será detectado automaticamente
  }

  const str = String(paginaConfig);

  // Intervalo: "1-5"
  if (str.includes("-")) {
    const [start, end] = str.split("-").map(Number);
    const pages = [];
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  // Lista: "1,3,5"
  if (str.includes(",")) {
    return str.split(",").map(Number);
  }

  // Número único: "1"
  return [Number(str)];
}

// ═══════════════════════════════════════════════════════════════════════
// FUNÇÕES DE CATEGORIZAÇÃO (OpenAI)
// ═══════════════════════════════════════════════════════════════════════

async function categorizeEmenta(ementa) {
  try {
    const categories = loadCategories();
    const categoriesList = categories.map((c) => c.categoria).join(", ");

    const promptCategoria = loadPrompt("prompt_categoria.txt");
    const promptRegras = loadPrompt("prompt_regras_agente.txt");

    const systemPrompt = promptCategoria.replace("{valid_categories_list}", categoriesList);

    log(`🤖 Enviando ementa para OpenAI (modelo: ${process.env.OPENAI_MODEL})...`, "INFO");

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "system", content: promptRegras },
        { role: "user", content: ementa },
      ],
      temperature: 0.3,
      max_tokens: 100,
    });

    const categoria = response.choices[0].message.content.trim();
    log(`✅ Categoria retornada: ${categoria}`, "SUCCESS");

    const categoryData = categories.find((c) => c.categoria === categoria);

    if (!categoryData) {
      log(`⚠️ Categoria '${categoria}' não encontrada na lista válida`, "WARNING");
      return {
        categoria: "Outros",
        codigo_categoria: "23",
        desc_categoria: "Outros assuntos não classificados",
      };
    }

    return {
      categoria: categoryData.categoria,
      codigo_categoria: categoryData.codigo,
      desc_categoria: categoryData.descricao,
    };
  } catch (error) {
    log(`❌ Erro ao categorizar ementa: ${error.message}`, "ERROR");
    return {
      categoria: "Outros",
      codigo_categoria: "23",
      desc_categoria: "Erro na categorização",
    };
  }
}

async function generateEmbedding(text) {
  try {
    log("🔢 Gerando embedding com OpenAI...", "INFO");

    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
      encoding_format: "float",
    });

    const embedding = response.data[0].embedding;
    log(`✅ Embedding gerado (dimensão: ${embedding.length})`, "SUCCESS");

    return embedding;
  } catch (error) {
    log(`❌ Erro ao gerar embedding: ${error.message}`, "ERROR");
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// FUNÇÕES PINECONE
// ═══════════════════════════════════════════════════════════════════════

async function ensurePineconeIndex() {
  try {
    const indexName = process.env.PINECONE_INDEX_NAME;
    const dimension = parseInt(process.env.PINECONE_DIMENSION || "1536");
    const cloud = process.env.PINECONE_CLOUD || "aws";
    const region = process.env.PINECONE_ENVIRONMENT || "us-east-1";

    log(`🔍 Verificando se índice '${indexName}' existe...`, "INFO");

    const existingIndexes = await pinecone.listIndexes();
    const indexExists = existingIndexes.indexes?.some((idx) => idx.name === indexName);

    if (indexExists) {
      log(`✅ Índice '${indexName}' já existe - usando índice existente`, "SUCCESS");
      return true;
    }

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
          region: region,
        },
      },
    });

    log(`✅ Índice '${indexName}' criado com sucesso!`, "SUCCESS");
    return true;
  } catch (error) {
    log(`❌ Erro ao verificar/criar índice Pinecone: ${error.message}`, "ERROR");
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// FUNÇÕES DE NAVEGAÇÃO E SCRAPING
// ═══════════════════════════════════════════════════════════════════════

/**
 * Conecta ao Scrapeless Cloud Browser
 */
async function connectBrowser() {
  try {
    log("🔌 Conectando ao Scrapeless Cloud Browser...", "INFO");

    // Construir query params para Scrapeless
    const query = new URLSearchParams({
      token: process.env.SCRAPELESS_TOKEN,
      proxyCountry: process.env.SCRAPELESS_PROXY_COUNTRY || "BR",
      sessionRecording: process.env.SCRAPELESS_SESSION_RECORDING === "true",
      sessionTTL: parseInt(process.env.SCRAPELESS_SESSION_TTL || "900"),
      sessionName: process.env.SCRAPELESS_SESSION_NAME || "STJ Scraper",
    });

    const connectionURL = `wss://browser.scrapeless.com/api/v2/browser?${query.toString()}`;

    log(`   Proxy Country: ${process.env.SCRAPELESS_PROXY_COUNTRY || "BR"}`, "INFO");
    log(`   Session Recording: ${process.env.SCRAPELESS_SESSION_RECORDING === "true"}`, "INFO");
    log(`   Session TTL: ${process.env.SCRAPELESS_SESSION_TTL || "900"}s`, "INFO");

    const browser = await puppeteer.connect({
      browserWSEndpoint: connectionURL,
      defaultViewport: null,
      ignoreHTTPSErrors: true,
    });

    log("✅ Conectado ao Scrapeless Cloud Browser", "SUCCESS");
    return browser;
  } catch (error) {
    log(`❌ Erro ao conectar ao browser: ${error.message}`, "ERROR");
    throw error;
  }
}

/**
 * Navega para a página de busca do STJ e aguarda resolução do CAPTCHA
 */
async function navigateToSTJ(page) {
  try {
    const url = STJ_BASE_URL;

    log("🛡️ Aplicando técnicas anti-detecção...", "INFO");
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, 'languages', { get: () => ['pt-BR', 'pt', 'en-US', 'en'] });
      window.chrome = { runtime: {} };
    });

    // Configurar listener de CAPTCHA ANTES de navegar
    log("👂 Configurando listener de CAPTCHA...", "INFO");
    await addCaptchaListener(page);

    log(`🌐 Navegando para: ${url}`, "INFO");

    // Tentar navegar com retry (problemas de proxy podem ocorrer)
    let navigationSuccess = false;
    let attempt = 0;
    const maxAttempts = 3;

    while (!navigationSuccess && attempt < maxAttempts) {
      attempt++;
      try {
        if (attempt > 1) {
          log(`   🔄 Tentativa ${attempt}/${maxAttempts}...`, "INFO");
        }
        await page.goto(url, { timeout: 90000, waitUntil: "domcontentloaded" });
        navigationSuccess = true;
        log("✅ Página carregada com sucesso", "SUCCESS");
      } catch (navError) {
        if (attempt < maxAttempts) {
          log(`⚠️ Erro na tentativa ${attempt}: ${navError.message}`, "WARNING");
          log(`   Aguardando 5s antes de tentar novamente...`, "INFO");
          await new Promise(resolve => setTimeout(resolve, 5000));
        } else {
          throw navError;
        }
      }
    }

    log("", "INFO");
    log("═══════════════════════════════════════════════════════", "INFO");
    log("🔐 AGUARDANDO RESOLUÇÃO DO CAPTCHA", "INFO");
    log("═══════════════════════════════════════════════════════", "INFO");

    try {
      // Tentar aguardar resolução do CAPTCHA OU aparecimento do formulário
      const result = await Promise.race([
        onCaptchaFinished(page, 120000), // 120 segundos
        page.waitForSelector('input[name="livre"]', { timeout: 120000 }).then(() => ({
          method: 'form-appeared',
          success: true
        }))
      ]);

      log("", "INFO");
      log("═══════════════════════════════════════════════════════", "SUCCESS");
      log("✅ CAPTCHA RESOLVIDO COM SUCESSO!", "SUCCESS");
      log(`   Método usado: ${result.method}`, "SUCCESS");
      log("═══════════════════════════════════════════════════════", "SUCCESS");
      log("", "INFO");

      // Aguardar um pouco para garantir que a página está totalmente carregada
      await new Promise(resolve => setTimeout(resolve, 2000));

      return true;
    } catch (error) {
      log("", "ERROR");
      log("═══════════════════════════════════════════════════════", "ERROR");
      log("❌ FALHA NA RESOLUÇÃO DO CAPTCHA", "ERROR");
      log(`   Erro: ${error.message}`, "ERROR");
      log("═══════════════════════════════════════════════════════", "ERROR");
      log("", "ERROR");

      // Capturar screenshot de timeout do CAPTCHA
      const isCaptchaTimeoutError = error.message.includes("Timeout") && error.message.includes("CAPTCHA");

      if (isCaptchaTimeoutError) {
        try {
          const timeoutFilename = getTimestampedFilename("captcha-timeout", "png");
          const timeoutScreenshot = path.join("screenshots", timeoutFilename);
          await page.screenshot({ path: timeoutScreenshot, fullPage: true });
          log(`📸 Screenshot de timeout do CAPTCHA salvo: ${timeoutScreenshot}`, "ERROR");

          // Identificar tipo de CAPTCHA na página no momento do timeout
          const captchaType = await page.evaluate(() => {
            const types = [];
            const details = {};

            // Cloudflare Turnstile
            const cfTurnstile = document.querySelector('iframe[src*="challenges.cloudflare.com"]') ||
                                document.querySelector('[id*="cf-turnstile"]') ||
                                document.querySelector('[class*="cf-turnstile"]');
            if (cfTurnstile) {
              types.push('Cloudflare Turnstile');
              details.cloudflare = {
                element: cfTurnstile.tagName,
                id: cfTurnstile.id,
                className: cfTurnstile.className,
                src: cfTurnstile.src || 'N/A'
              };
            }

            // reCAPTCHA v2
            const recaptchaV2 = document.querySelector('iframe[src*="google.com/recaptcha"]') ||
                                document.querySelector('.g-recaptcha');
            if (recaptchaV2) {
              types.push('reCAPTCHA v2');
              details.recaptchaV2 = {
                element: recaptchaV2.tagName,
                className: recaptchaV2.className
              };
            }

            // reCAPTCHA v3
            const recaptchaV3 = document.querySelector('.grecaptcha-badge');
            if (recaptchaV3) {
              types.push('reCAPTCHA v3');
            }

            // hCaptcha
            const hcaptcha = document.querySelector('iframe[src*="hcaptcha.com"]') ||
                            document.querySelector('.h-captcha');
            if (hcaptcha) {
              types.push('hCaptcha');
            }

            // Informações gerais da página
            const pageInfo = {
              title: document.title,
              url: window.location.href,
              bodyText: document.body ? document.body.innerText.substring(0, 500) : 'N/A'
            };

            // Todos os iframes
            const iframes = Array.from(document.querySelectorAll('iframe'));
            const iframeInfo = iframes.map(iframe => ({
              src: iframe.src,
              id: iframe.id,
              className: iframe.className,
              width: iframe.width,
              height: iframe.height
            }));

            return {
              types: types.length > 0 ? types : ['Desconhecido'],
              details,
              pageInfo,
              iframeCount: iframes.length,
              iframes: iframeInfo
            };
          });

          log("", "ERROR");
          log("═══════════════════════════════════════════════════════", "ERROR");
          log("🔍 ANÁLISE DO CAPTCHA NO MOMENTO DO TIMEOUT", "ERROR");
          log("═══════════════════════════════════════════════════════", "ERROR");
          log(`📋 Tipo(s) de CAPTCHA: ${captchaType.types.join(', ')}`, "ERROR");
          log(`📄 Título da página: ${captchaType.pageInfo.title}`, "ERROR");
          log(`🌐 URL: ${captchaType.pageInfo.url}`, "ERROR");
          log(`🖼️ Total de iframes: ${captchaType.iframeCount}`, "ERROR");

          if (Object.keys(captchaType.details).length > 0) {
            log("📊 Detalhes do CAPTCHA:", "ERROR");
            log(JSON.stringify(captchaType.details, null, 2), "ERROR");
          }

          if (captchaType.iframes.length > 0) {
            log("🔗 Iframes encontrados:", "ERROR");
            captchaType.iframes.forEach((iframe, idx) => {
              log(`   [${idx}] src: ${iframe.src}`, "ERROR");
              log(`       id: "${iframe.id}" class: "${iframe.className}"`, "ERROR");
              log(`       size: ${iframe.width}x${iframe.height}`, "ERROR");
            });
          }

          log("📝 Texto da página (primeiros 500 chars):", "ERROR");
          log(captchaType.pageInfo.bodyText, "ERROR");
          log("═══════════════════════════════════════════════════════", "ERROR");
          log("", "ERROR");
        } catch (screenshotError) {
          log(`❌ Erro ao capturar screenshot de timeout: ${screenshotError.message}`, "ERROR");
        }
      }

      throw error;
    }
  } catch (error) {
    log(`❌ Erro ao navegar para STJ: ${error.message}`, "ERROR");
    throw error;
  }
}

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

/**
 * Preenche o formulário de busca do STJ
 */
async function fillSearchForm(page, buscaConfig, tribunal) {
  try {
    log(`📝 Preenchendo formulário de busca para tribunal: ${tribunal}`, "INFO");

    // Converter campos amigáveis para técnicos
    const config = convertFriendlyFieldsToTechnical(buscaConfig);

    // Selecionar tribunal (STJ, TFR, ou ambos)
    if (config.tribunal) {
      const tribunalValue = tribunal === "STJ" ? "STJ" : "TFR";
      await page.select('select[name="b"]', tribunalValue);
      log(`   ✓ Tribunal selecionado: ${tribunalValue}`, "INFO");
    }

    // Preencher campo de pesquisa livre
    if (config.livre) {
      await page.type('input[name="livre"]', config.livre);
      log(`   ✓ Pesquisa livre: ${config.livre}`, "INFO");
    }

    // Preencher número do processo
    if (config.processo) {
      await page.type('input[name="processo"]', config.processo);
      log(`   ✓ Processo: ${config.processo}`, "INFO");
    }

    // Preencher classe
    if (config.classe) {
      await page.type('input[name="classe"]', config.classe);
      log(`   ✓ Classe: ${config.classe}`, "INFO");
    }

    // Selecionar UF
    if (config.uf) {
      await page.select('select[name="uf"]', config.uf);
      log(`   ✓ UF: ${config.uf}`, "INFO");
    }

    // Preencher datas de publicação
    if (config.dtpb1) {
      await page.type('input[name="dtpb1"]', config.dtpb1);
      log(`   ✓ Data publicação início: ${config.dtpb1}`, "INFO");
    }
    if (config.dtpb2) {
      await page.type('input[name="dtpb2"]', config.dtpb2);
      log(`   ✓ Data publicação fim: ${config.dtpb2}`, "INFO");
    }

    // Preencher datas de decisão
    if (config.dtde1) {
      await page.type('input[name="dtde1"]', config.dtde1);
      log(`   ✓ Data decisão início: ${config.dtde1}`, "INFO");
    }
    if (config.dtde2) {
      await page.type('input[name="dtde2"]', config.dtde2);
      log(`   ✓ Data decisão fim: ${config.dtde2}`, "INFO");
    }

    log("✅ Formulário preenchido com sucesso", "SUCCESS");
    return true;
  } catch (error) {
    log(`❌ Erro ao preencher formulário: ${error.message}`, "ERROR");
    throw error;
  }
}

/**
 * Submete o formulário e aguarda resultados
 */
async function submitForm(page) {
  try {
    log("🚀 Submetendo formulário...", "INFO");

    // Clicar no botão de pesquisar
    const submitButton = await page.$('input[type="submit"], button[type="submit"]');
    if (!submitButton) {
      throw new Error("Botão de submissão não encontrado");
    }

    await submitButton.click();
    log("   ✓ Formulário submetido", "INFO");

    // Aguardar navegação ou resultados
    await page.waitForNavigation({ timeout: 30000, waitUntil: "domcontentloaded" }).catch(() => {
      log("   ⚠️ Timeout na navegação - verificando se resultados foram carregados", "WARNING");
    });

    // Verificar se CAPTCHA foi detectado após o clique
    log("🔍 Verificando se CAPTCHA foi detectado após submissão...", "INFO");

    try {
      const result = await onCaptchaFinished(page, 45000);

      log("", "INFO");
      log("═══════════════════════════════════════════════════════", "SUCCESS");
      log("✅ CAPTCHA PÓS-SUBMISSÃO RESOLVIDO!", "SUCCESS");
      log(`   Método usado: ${result.method}`, "SUCCESS");
      log("═══════════════════════════════════════════════════════", "SUCCESS");
      log("", "INFO");
    } catch (error) {
      // Se não houver CAPTCHA, continuar normalmente
      if (error.message.includes("Timeout")) {
        log("   ✓ Nenhum CAPTCHA detectado após submissão", "INFO");
      } else {
        throw error;
      }
    }

    // Aguardar resultados carregarem
    await page.waitForTimeout(3000);

    log("✅ Formulário submetido com sucesso", "SUCCESS");
    return true;
  } catch (error) {
    log(`❌ Erro ao submeter formulário: ${error.message}`, "ERROR");
    throw error;
  }
}

/**
 * Extrai dados de um resultado usando os seletores do fields.json
 */
function extractTextAfterLabel(text, label) {
  if (!text || !label) return null;

  const regex = new RegExp(`${label}\\s*:?\\s*(.+?)(?=\\n|$)`, "i");
  const match = text.match(regex);

  return match ? match[1].trim() : null;
}

/**
 * Extrai dados de uma página de resultados
 */
async function extractResults(page, fieldsConfig, tribunal) {
  try {
    log(`📊 Extraindo resultados para tribunal: ${tribunal}`, "INFO");

    const config = fieldsConfig[tribunal];
    if (!config) {
      throw new Error(`Configuração de campos não encontrada para tribunal: ${tribunal}`);
    }

    const results = await page.evaluate((config, tribunal) => {
      const items = [];
      const containers = document.querySelectorAll(config.resultados.selector);

      containers.forEach((container) => {
        const item = { sigla_tribunal: tribunal };

        // Extrair número do processo/acórdão
        const tituloEl = container.querySelector(config.numero_processo.selector);
        if (tituloEl) {
          item.numero_processo = tituloEl.textContent.trim();
        }

        // Extrair dados gerais (relator, datas, etc.)
        const dadosEl = container.querySelector(config.relator?.selector || config.data_julgamento?.selector);
        if (dadosEl) {
          const dadosText = dadosEl.textContent;

          // Extrair relator
          const relatorMatch = dadosText.match(/Relator\s*:?\s*(.+?)(?=\n|Órgão|Data|$)/i);
          if (relatorMatch) {
            item.relator = relatorMatch[1].trim();
          }

          // Extrair órgão julgador
          const orgaoMatch = dadosText.match(/Órgão\s+Julgador\s*:?\s*(.+?)(?=\n|Data|$)/i);
          if (orgaoMatch) {
            item.orgao_julgador = orgaoMatch[1].trim();
          }

          // Extrair data de julgamento
          const dataJulgMatch = dadosText.match(/Data\s+do\s+Julgamento\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i);
          if (dataJulgMatch) {
            item.data_julgamento = dataJulgMatch[1];
          }

          // Extrair data de publicação
          const dataPubMatch = dadosText.match(/Data\s+da\s+Publicação\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i);
          if (dataPubMatch) {
            item.data_publicacao = dataPubMatch[1];
          }
        }

        // Extrair ementa
        const ementaEl = container.querySelector(config.ementa.selector);
        if (ementaEl) {
          item.ementa = ementaEl.textContent.trim();
        }

        // Extrair link
        const linkEl = container.querySelector(config.link_detalhes.selector);
        if (linkEl) {
          item.link_detalhes = linkEl.href;
        }

        if (item.numero_processo || item.ementa) {
          items.push(item);
        }
      });

      return items;
    }, config, tribunal);

    log(`✅ Extraídos ${results.length} resultados`, "SUCCESS");
    return results;
  } catch (error) {
    log(`❌ Erro ao extrair resultados: ${error.message}`, "ERROR");
    return [];
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
    log("=== INICIANDO SCRAPER STJ/TFR ===", "INFO");
    log("═══════════════════════════════════════════════════════", "INFO");

    ensureDirectories();

    log("📂 Carregando configurações...", "INFO");
    const buscaConfig = loadConfig("busca.json");
    const fieldsConfig = loadConfig("fields.json");
    log("✅ Configurações carregadas", "SUCCESS");

    // Verificar Pinecone
    log("🔍 Verificando índice Pinecone...", "INFO");
    const pineconeReady = await ensurePineconeIndex();
    if (!pineconeReady) {
      throw new Error("Falha ao verificar/criar índice Pinecone");
    }

    // Determinar tribunal(is) a processar
    const tribunalConfig = buscaConfig.tribunal || "";
    let tribunais = tribunalConfig
      .split(";")
      .map((t) => t.trim())
      .filter((t) => t);

    if (tribunais.length === 0 || tribunalConfig === "") {
      tribunais = ["STJ", "TFR"];
    }

    log(`📋 Tribunais a processar: ${tribunais.join(", ")}`, "INFO");

    // Conectar ao browser
    browser = await connectBrowser();
    page = await browser.newPage();

    await page.setViewport({ width: 1920, height: 1080 });

    // Navegar para STJ e resolver CAPTCHA
    await navigateToSTJ(page);

    // Processar cada tribunal
    for (const tribunal of tribunais) {
      log("", "INFO");
      log("═══════════════════════════════════════════════════════", "INFO");
      log(`📋 PROCESSANDO TRIBUNAL: ${tribunal}`, "INFO");
      log("═══════════════════════════════════════════════════════", "INFO");

      try {
        // Preencher formulário
        await fillSearchForm(page, buscaConfig, tribunal);

        // Submeter formulário
        await submitForm(page);

        // Tirar screenshot dos resultados
        const screenshotPath = path.join(SCREENSHOT_DIR, `stj_${tribunal}_results_${Date.now()}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true });
        log(`📸 Screenshot salvo: ${screenshotPath}`, "INFO");

        // Extrair resultados
        const results = await extractResults(page, fieldsConfig, tribunal);

        if (results.length === 0) {
          log(`⚠️ Nenhum resultado encontrado para ${tribunal}`, "WARNING");
          continue;
        }

        log(`📊 Processando ${results.length} resultados...`, "INFO");

        // Processar cada resultado
        for (let i = 0; i < results.length; i++) {
          const result = results[i];

          log("", "INFO");
          log(`─────────────────────────────────────────────────────`, "INFO");
          log(`📄 Processando resultado ${i + 1}/${results.length}`, "INFO");
          log(`   Processo: ${result.numero_processo || "N/A"}`, "INFO");
          log(`   Tribunal: ${result.sigla_tribunal}`, "INFO");

          try {
            // Categorizar ementa
            const categoriaData = await categorizeEmenta(result.ementa || "");

            // Gerar embedding
            const embedding = await generateEmbedding(result.ementa || "");

            if (!embedding) {
              log(`⚠️ Falha ao gerar embedding - pulando resultado`, "WARNING");
              continue;
            }

            // Preparar metadata
            const metadata = {
              numero_processo: result.numero_processo || "",
              sigla_tribunal: result.sigla_tribunal,
              relator: result.relator || "",
              orgao_julgador: result.orgao_julgador || "",
              data_julgamento: result.data_julgamento || "",
              data_publicacao: result.data_publicacao || "",
              ementa: result.ementa || "",
              link_detalhes: result.link_detalhes || "",
              categoria: categoriaData.categoria,
              codigo_categoria: categoriaData.codigo_categoria,
              desc_categoria: categoriaData.desc_categoria,
            };

            // Upload para Pinecone
            const namespace = `${result.sigla_tribunal}-${categoriaData.categoria}`;
            const vectorId = `${result.sigla_tribunal}_${result.numero_processo || Date.now()}_${i}`;

            log(`📤 Enviando para Pinecone...`, "INFO");
            log(`   Namespace: ${namespace}`, "INFO");
            log(`   Vector ID: ${vectorId}`, "INFO");

            const index = pinecone.index(process.env.PINECONE_INDEX_NAME);
            await index.namespace(namespace).upsert([
              {
                id: vectorId,
                values: embedding,
                metadata: metadata,
              },
            ]);

            log(`✅ Resultado ${i + 1} enviado com sucesso!`, "SUCCESS");

            // Salvar em arquivo JSON
            const scrapPath = path.join(SCRAP_DIR, `${vectorId}.json`);
            fs.writeFileSync(scrapPath, JSON.stringify({ ...metadata, vector_id: vectorId }, null, 2), "utf-8");
            log(`💾 Salvo em: ${scrapPath}`, "INFO");

          } catch (error) {
            log(`❌ Erro ao processar resultado ${i + 1}: ${error.message}`, "ERROR");
            continue;
          }
        }

        log("", "INFO");
        log(`✅ Tribunal ${tribunal} processado com sucesso!`, "SUCCESS");

      } catch (error) {
        log(`❌ Erro ao processar tribunal ${tribunal}: ${error.message}`, "ERROR");
        continue;
      }
    }

    log("", "INFO");
    log("═══════════════════════════════════════════════════════", "SUCCESS");
    log("✅ SCRAPER FINALIZADO COM SUCESSO!", "SUCCESS");
    log("═══════════════════════════════════════════════════════", "SUCCESS");

  } catch (error) {
    log(`❌ Erro fatal no main(): ${error.message}`, "ERROR");
    if (error.stack) log(error.stack, "ERROR");
  } finally {
    if (page) {
      await page.close();
      log("📄 Página fechada", "INFO");
    }

    if (browser) {
      await browser.close();
      log("🔒 Browser fechado", "INFO");
    }

    closeLog();
  }
}

// Executar
main();

