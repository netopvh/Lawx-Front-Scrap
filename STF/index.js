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

// Carregar variáveis de ambiente
dotenv.config();

// ═══════════════════════════════════════════════════════════════════════
// CONFIGURAÇÕES
// ═══════════════════════════════════════════════════════════════════════

const STF_BASE_URL = process.env.STF_URL || "https://jurisprudencia.stf.jus.br/pages/search";
const LOG_DIR = "logs";
const SCREENSHOT_DIR = "screenshots";
const SCRAP_DIR = "scraps";

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

function buildSearchUrl(params) {
  const queryParams = new URLSearchParams();

  // Adicionar parâmetros obrigatórios
  if (params.queryString) queryParams.set("queryString", params.queryString);
  if (params.base) queryParams.set("base", params.base);

  // Adicionar parâmetros opcionais
  if (params.pesquisa_inteiro_teor !== undefined) {
    queryParams.set("pesquisa_inteiro_teor", params.pesquisa_inteiro_teor);
  }
  if (params.sinonimo !== undefined) queryParams.set("sinonimo", params.sinonimo);
  if (params.plural !== undefined) queryParams.set("plural", params.plural);
  if (params.radicais !== undefined) queryParams.set("radicais", params.radicais);
  if (params.buscaExata !== undefined) queryParams.set("buscaExata", params.buscaExata);
  if (params.page !== undefined) queryParams.set("page", params.page);
  if (params.pageSize !== undefined) queryParams.set("pageSize", params.pageSize);
  if (params.sort) queryParams.set("sort", params.sort);
  if (params.sortBy) queryParams.set("sortBy", params.sortBy);

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

    // Parsear paginação
    let pages = parsePagination(buscaConfig.page);
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

    // Salvar dados
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
      log(`💾 Dados salvos: ${scrapPath}`, "SUCCESS");
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

