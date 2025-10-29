import puppeteer from "puppeteer-core";
import EventEmitter from "events";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

// Carregar variáveis de ambiente
dotenv.config();

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
  const client = await page.createCDPSession();

  client.on("Captcha.detected", (msg) => {
    console.log("🔍 Captcha.detected:", JSON.stringify(msg));
  });

  client.on("Captcha.solveFinished", async (msg) => {
    console.log("✅ Captcha.solveFinished:", JSON.stringify(msg));
    emitter.emit("Captcha.solveFinished", msg);
    client.removeAllListeners();
  });
}

/**
 * Aguarda a resolução do CAPTCHA com timeout
 * Usa EventEmitter para comunicação entre funções (padrão da documentação)
 */
async function onCaptchaFinished(timeout = 120_000) {
  return Promise.race([
    new Promise((resolve) => {
      emitter.on("Captcha.solveFinished", (msg) => {
        resolve(msg);
      });
    }),
    new Promise((_, reject) =>
      setTimeout(() => reject("Timeout esperando resolução do CAPTCHA."), timeout)
    ),
  ]);
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

    // Configuração do Browser Scrapeless
    const query = new URLSearchParams({
      token: process.env.SCRAPELESS_TOKEN,
      proxyCountry: process.env.SCRAPELESS_PROXY_COUNTRY || "BR",
      sessionRecording: process.env.SCRAPELESS_SESSION_RECORDING === "true",
      sessionTTL: parseInt(process.env.SCRAPELESS_SESSION_TTL || "900"),
      sessionName: process.env.SCRAPELESS_SESSION_NAME || "TJSP Scraper",
    });

    const connectionURL = `wss://browser.scrapeless.com/api/v2/browser?${query.toString()}`;

    log("🔗 Conectando ao browser Scrapeless...", "INFO");
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

    log("⏳ Aguardando solução do CAPTCHA...", "INFO");
    await onCaptchaFinished();
    log("✅ CAPTCHA resolvido com sucesso!", "SUCCESS");

    // Aguardar um pouco após resolver o CAPTCHA
    log("⏱️ Aguardando 2 segundos após resolução do CAPTCHA...", "INFO");
    await new Promise((resolve) => setTimeout(resolve, 2000));

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
    log("Preenchendo formulario de busca...", "INFO");

    // Aguardar o primeiro campo estar disponivel
    const firstField = FIELDS_MAPPING["Pesquisa livre"];
    if (firstField) {
      log("Aguardando formulario estar disponivel...", "INFO");
      await page.waitForSelector(firstField.selector, { timeout: 10000 });
    }

    // Processar cada campo da configuracao
    for (const [friendlyName, value] of Object.entries(config)) {
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

    log("🔍 Clicando no botão 'Pesquisar'...", "INFO");
    await Promise.all([
      page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 60000 }),
      page.click('input[type="submit"][value="Pesquisar"]'),
    ]);

    log("📄 Página de resultados carregada!", "SUCCESS");

    // Aguardar um pouco para a página carregar completamente
    await new Promise((resolve) => setTimeout(resolve, 1000));

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

    // Salvar JSON consolidado
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

    if (page && !isCaptchaBypassError) {
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
    }

    throw error;
  }
}

// Executar o scraper
main().catch((error) => {
  console.error("❌ Erro não tratado:", error);
  process.exit(1);
});
