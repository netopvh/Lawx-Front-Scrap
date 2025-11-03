import puppeteer from "puppeteer-core";

// EventEmitter simples para funcionar no browser (sem dependência do Node.js)
class SimpleEventEmitter {
  constructor() {
    this.events = {};
  }

  on(event, listener) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
  }

  emit(event, ...args) {
    if (this.events[event]) {
      this.events[event].forEach(listener => listener(...args));
    }
  }

  removeAllListeners() {
    this.events = {};
  }
}

// EventEmitter para comunicação entre funções de CAPTCHA
const emitter = new SimpleEventEmitter();

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

//  Configuração do Browser Playground
const query = new URLSearchParams({
  token: "sk_qiOPUBP6qRATPOViVy5RRAbjWqs9uYS7YeiedOdL2g10Lc0iDPmABWDMWLRPESfF",
  proxyCountry: "BR",
  sessionRecording: true,
  sessionTTL: 900,
  sessionName: "TJSP Scraper - Cloudflare Turnstile",
});

const connectionURL = "wss://browser.scrapeless.com/api/v2/browser?" + query.toString();

const browser = await puppeteer.connect({
  browserWSEndpoint: connectionURL,
  defaultViewport: null,
});

// Executar o scraper
example("https://esaj.tjsp.jus.br/cjsg/resultadoCompleta.do");

async function example(url) {
  try {
    const page = await browser.newPage();
    
    // Aplicar técnicas anti-detecção
    console.log("Aplicando técnicas anti-detecção...");
    await applyAntiDetection(page);
    
    // Configurar listener de CAPTCHA ANTES de navegar
    console.log("Configurando listener de CAPTCHA...");
    await addCaptchaListener(page);
    
    console.log("Navegando para:", url);
    await page.goto(url, { timeout: 60000, waitUntil: "domcontentloaded" });
    
    console.log("Aguardando solução do CAPTCHA...");
    await onCaptchaFinished();
    console.log("CAPTCHA resolvido com sucesso!");
    
    // Aguardar um pouco após resolver o CAPTCHA
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    // === PESQUISA ===
    console.log("Preenchendo campo de busca...");
    const searchTerm = "Advogado";
    
    // Aguardar o campo estar disponível
    await page.waitForSelector('input[name="dados.buscaInteiroTeor"]', { timeout: 10000 });
    
    await page.evaluate(() => {
      const input = document.querySelector('input[name="dados.buscaInteiroTeor"]');
      if (input) input.value = "";
    });
    
    await page.type('input[name="dados.buscaInteiroTeor"]', searchTerm, { delay: 100 });
    console.log("Campo preenchido com termo:", searchTerm);
    
    await page.click('input[name="dados.pesquisarComSinonimos"]');
    console.log("Checkbox de sinônimos marcado.");
    
    console.log("Clicando no botão Pesquisar...");
    await Promise.all([
      page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 60000 }),
      page.click('input[type="submit"][value="Pesquisar"]'),
    ]);
    
    console.log("Página de resultados carregada!");
    
    // Screenshot para debug
    await page.screenshot({ path: "tjsp-resultado.png", fullPage: true });
    console.log("Screenshot capturado: tjsp-resultado.png");
    
  } catch (error) {
    console.error(" Erro:", error);
  } finally {
    await browser.close();
    console.log("Browser fechado");
  }
}
