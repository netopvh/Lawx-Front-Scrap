/**
 * ═══════════════════════════════════════════════════════════════════════
 * VALIDADOR DE SITE - Detecta CAPTCHA e Proteções Anti-Bot
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * Este script valida se um site possui proteções anti-bot antes de
 * iniciar o desenvolvimento de um scraper.
 * 
 * DETECTA:
 * - Cloudflare Turnstile
 * - reCAPTCHA (v2, v3, Enterprise)
 * - hCaptcha
 * - Cloudflare Challenge
 * - Rate limiting
 * - JavaScript obrigatório
 * - Parâmetros de URL (GET params)
 * 
 * USO:
 * node tools/validate-site.js <URL>
 * 
 * EXEMPLOS:
 * node tools/validate-site.js https://jurisprudencia.stf.jus.br/pages/search
 * node tools/validate-site.js "https://site.com/search?q=test&page=1"
 * 
 * ═══════════════════════════════════════════════════════════════════════
 */

import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";

// ═══════════════════════════════════════════════════════════════════════
// CONFIGURAÇÕES
// ═══════════════════════════════════════════════════════════════════════

const TIMEOUT = 30000; // 30 segundos
const SCREENSHOT_DIR = "tools/screenshots";

// ═══════════════════════════════════════════════════════════════════════
// FUNÇÕES DE LOG
// ═══════════════════════════════════════════════════════════════════════

function log(message, type = "INFO") {
  const timestamp = new Date().toISOString();
  const colors = {
    INFO: "\x1b[36m",      // Cyan
    SUCCESS: "\x1b[32m",   // Green
    WARNING: "\x1b[33m",   // Yellow
    ERROR: "\x1b[31m",     // Red
    RESET: "\x1b[0m"
  };

  const color = colors[type] || colors.INFO;
  console.log(`${color}[${timestamp}] [${type}] ${message}${colors.RESET}`);
}

// ═══════════════════════════════════════════════════════════════════════
// FUNÇÕES DE DETECÇÃO
// ═══════════════════════════════════════════════════════════════════════

/**
 * Detecta presença de CAPTCHA e proteções anti-bot
 */
async function detectProtections(page) {
  const protections = {
    cloudflare_turnstile: false,
    recaptcha: false,
    hcaptcha: false,
    cloudflare_challenge: false,
    javascript_required: false,
    details: []
  };

  try {
    // Detectar Cloudflare Turnstile
    const turnstile = await page.evaluate(() => {
      const iframes = document.querySelectorAll('iframe[src*="challenges.cloudflare.com"]');
      const scripts = document.querySelectorAll('script[src*="challenges.cloudflare.com"]');
      return iframes.length > 0 || scripts.length > 0;
    });

    if (turnstile) {
      protections.cloudflare_turnstile = true;
      protections.details.push("Cloudflare Turnstile detectado");
    }

    // Detectar reCAPTCHA
    const recaptcha = await page.evaluate(() => {
      const iframes = document.querySelectorAll('iframe[src*="recaptcha"], iframe[src*="google.com/recaptcha"]');
      const scripts = document.querySelectorAll('script[src*="recaptcha"]');
      const divs = document.querySelectorAll('.g-recaptcha, [data-sitekey]');
      return iframes.length > 0 || scripts.length > 0 || divs.length > 0;
    });

    if (recaptcha) {
      protections.recaptcha = true;
      protections.details.push("reCAPTCHA detectado");
    }

    // Detectar hCaptcha
    const hcaptcha = await page.evaluate(() => {
      const iframes = document.querySelectorAll('iframe[src*="hcaptcha.com"]');
      const scripts = document.querySelectorAll('script[src*="hcaptcha.com"]');
      const divs = document.querySelectorAll('.h-captcha');
      return iframes.length > 0 || scripts.length > 0 || divs.length > 0;
    });

    if (hcaptcha) {
      protections.hcaptcha = true;
      protections.details.push("hCaptcha detectado");
    }

    // Detectar Cloudflare Challenge Page
    const cfChallenge = await page.evaluate(() => {
      const title = document.title || "";
      const body = document.body ? document.body.innerText : "";
      return title.includes("Just a moment") || 
             body.includes("Checking your browser") ||
             body.includes("Enable JavaScript and cookies to continue");
    });

    if (cfChallenge) {
      protections.cloudflare_challenge = true;
      protections.details.push("Cloudflare Challenge Page detectada");
    }

    // Detectar JavaScript obrigatório
    const jsRequired = await page.evaluate(() => {
      const noscript = document.querySelector('noscript');
      return noscript && noscript.innerText.toLowerCase().includes('javascript');
    });

    if (jsRequired) {
      protections.javascript_required = true;
      protections.details.push("JavaScript obrigatório detectado");
    }

  } catch (error) {
    log(`Erro ao detectar proteções: ${error.message}`, "WARNING");
  }

  return protections;
}

/**
 * Analisa se a URL suporta parâmetros GET
 */
function analyzeUrlParams(url) {
  try {
    const urlObj = new URL(url);
    const params = Array.from(urlObj.searchParams.entries());
    
    return {
      hasParams: params.length > 0,
      params: params,
      baseUrl: `${urlObj.origin}${urlObj.pathname}`,
      queryString: urlObj.search
    };
  } catch (error) {
    return {
      hasParams: false,
      params: [],
      baseUrl: url,
      queryString: ""
    };
  }
}

/**
 * Tira screenshot da página
 */
async function takeScreenshot(page, filename) {
  try {
    // Criar diretório se não existir
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }

    const filepath = path.join(SCREENSHOT_DIR, filename);
    await page.screenshot({ path: filepath, fullPage: true });
    log(`Screenshot salvo: ${filepath}`, "SUCCESS");
    return filepath;
  } catch (error) {
    log(`Erro ao salvar screenshot: ${error.message}`, "ERROR");
    return null;
  }
}

/**
 * Gera relatório em JSON
 */
function generateReport(url, result) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const reportDir = "tools/reports";
  
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const filename = `validation-report-${timestamp}.json`;
  const filepath = path.join(reportDir, filename);
  
  const report = {
    timestamp: new Date().toISOString(),
    url: url,
    ...result
  };

  fs.writeFileSync(filepath, JSON.stringify(report, null, 2), "utf-8");
  log(`Relatório salvo: ${filepath}`, "SUCCESS");
  return filepath;
}

// ═══════════════════════════════════════════════════════════════════════
// FUNÇÃO PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════

async function validateSite(url) {
  let browser = null;

  try {
    log("═══════════════════════════════════════════════════════", "INFO");
    log("VALIDADOR DE SITE - Detectando Proteções Anti-Bot", "INFO");
    log("═══════════════════════════════════════════════════════", "INFO");
    log("", "INFO");
    log(`🔗 URL: ${url}`, "INFO");
    log("", "INFO");

    // Analisar parâmetros de URL
    log("📊 Analisando estrutura da URL...", "INFO");
    const urlAnalysis = analyzeUrlParams(url);
    
    if (urlAnalysis.hasParams) {
      log("✅ URL suporta parâmetros GET!", "SUCCESS");
      log(`   Base URL: ${urlAnalysis.baseUrl}`, "INFO");
      log(`   Query String: ${urlAnalysis.queryString}`, "INFO");
      log(`   Parâmetros encontrados:`, "INFO");
      urlAnalysis.params.forEach(([key, value]) => {
        log(`      - ${key} = ${value}`, "INFO");
      });
    } else {
      log("ℹ️ URL não possui parâmetros GET", "INFO");
    }
    log("", "INFO");

    // Iniciar browser
    log("🌐 Iniciando navegador...", "INFO");
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled'
      ]
    });

    const page = await browser.newPage();
    
    // Configurar User-Agent realista
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
    );

    // Configurar viewport
    await page.setViewport({ width: 1920, height: 1080 });

    log("✅ Navegador iniciado", "SUCCESS");
    log("", "INFO");

    // Acessar a página
    log("🔍 Acessando a página...", "INFO");
    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: TIMEOUT
    });

    const statusCode = response.status();
    log(`   Status HTTP: ${statusCode}`, statusCode === 200 ? "SUCCESS" : "WARNING");
    log("", "INFO");

    // Aguardar um pouco para JavaScript carregar
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Detectar proteções
    log("🔒 Detectando proteções anti-bot...", "INFO");
    const protections = await detectProtections(page);

    // Tirar screenshot
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const screenshotPath = await takeScreenshot(page, `validation-${timestamp}.png`);

    // Resultado
    const result = {
      success: true,
      statusCode: statusCode,
      urlAnalysis: urlAnalysis,
      protections: protections,
      screenshot: screenshotPath,
      recommendation: ""
    };

    // Gerar recomendação
    const hasAnyProtection = protections.cloudflare_turnstile || 
                            protections.recaptcha || 
                            protections.hcaptcha || 
                            protections.cloudflare_challenge;

    if (hasAnyProtection) {
      result.recommendation = "⚠️ SITE POSSUI PROTEÇÕES ANTI-BOT - Recomendado usar Scrapeless ou similar";
    } else {
      result.recommendation = "✅ SITE SEM PROTEÇÕES DETECTADAS - Pode usar Puppeteer normal";
    }

    // Exibir resultado
    log("", "INFO");
    log("═══════════════════════════════════════════════════════", "INFO");
    log("RESULTADO DA VALIDAÇÃO", "INFO");
    log("═══════════════════════════════════════════════════════", "INFO");
    log("", "INFO");

    if (hasAnyProtection) {
      log("🔒 PROTEÇÕES DETECTADAS:", "WARNING");
      protections.details.forEach(detail => {
        log(`   ⚠️ ${detail}`, "WARNING");
      });
    } else {
      log("✅ NENHUMA PROTEÇÃO ANTI-BOT DETECTADA!", "SUCCESS");
    }

    log("", "INFO");
    log(result.recommendation, hasAnyProtection ? "WARNING" : "SUCCESS");
    log("", "INFO");

    // Gerar relatório
    const reportPath = generateReport(url, result);

    log("", "INFO");
    log("═══════════════════════════════════════════════════════", "INFO");
    log("VALIDAÇÃO CONCLUÍDA", "SUCCESS");
    log("═══════════════════════════════════════════════════════", "INFO");

    return result;

  } catch (error) {
    log(`❌ Erro durante validação: ${error.message}`, "ERROR");
    return {
      success: false,
      error: error.message
    };
  } finally {
    if (browser) {
      await browser.close();
      log("🔒 Navegador fechado", "INFO");
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════
// EXECUÇÃO
// ═══════════════════════════════════════════════════════════════════════

const url = process.argv[2];

if (!url) {
  console.error("\n❌ ERRO: URL não fornecida\n");
  console.log("USO:");
  console.log("  node tools/validate-site.js <URL>\n");
  console.log("EXEMPLOS:");
  console.log("  node tools/validate-site.js https://jurisprudencia.stf.jus.br/pages/search");
  console.log('  node tools/validate-site.js "https://site.com/search?q=test&page=1"\n');
  process.exit(1);
}

validateSite(url)
  .then(() => process.exit(0))
  .catch(error => {
    log(`Erro fatal: ${error.message}`, "ERROR");
    process.exit(1);
  });

