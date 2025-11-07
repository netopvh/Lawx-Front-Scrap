import puppeteer from "puppeteer-core";
import dotenv from "dotenv";

dotenv.config();

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
    geolocation: {
      latitude: -23.5505,
      longitude: -46.6333,
      accuracy: 100
    }
  },
  args: {
    '--window-size': '1920,1080',
  }
};

const queryParams = {
  token: process.env.SCRAPELESS_TOKEN,
  sessionRecording: true,
  sessionTTL: 900,
  sessionName: "STJ URL Test",
  fingerprint: encodeURIComponent(JSON.stringify(fingerprint)),
  incognito: true,
};

const query = new URLSearchParams(queryParams);
const connectionURL = `wss://browser.scrapeless.com/api/v2/browser?${query.toString()}`;

console.log("🔗 Conectando ao Scrapeless...");
const browser = await puppeteer.connect({
  browserWSEndpoint: connectionURL,
  defaultViewport: null,
});

console.log("✅ Conectado!");

const page = await browser.newPage();

// Listener de CAPTCHA
const client = await page.createCDPSession();
client.on("Captcha.detected", (msg) => {
  console.log("🔍 CAPTCHA DETECTADO:", JSON.stringify(msg, null, 2));
});

client.on("Captcha.solveFinished", (msg) => {
  console.log("✅ CAPTCHA RESOLVIDO:", JSON.stringify(msg, null, 2));
});

// Testar diferentes URLs
const urls = [
  "https://scon.stj.jus.br/SCON/",
  "https://scon.stj.jus.br/SCON/jurisprudencia/toc.jsp",
  "https://scon.stj.jus.br/SCON/pesquisar.jsp",
];

for (const url of urls) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`🌐 Testando URL: ${url}`);
  console.log("=".repeat(60));
  
  try {
    await page.goto(url, { timeout: 60000, waitUntil: "domcontentloaded" });
    console.log("✅ Página carregada");
    
    // Aguardar 10 segundos para ver se CAPTCHA é detectado
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Capturar screenshot
    const filename = `test-${url.split("/").pop() || "root"}.png`;
    await page.screenshot({ path: filename, fullPage: true });
    console.log(`📸 Screenshot salvo: ${filename}`);
    
    // Verificar se há reCAPTCHA na página
    const hasRecaptcha = await page.evaluate(() => {
      return !!document.querySelector('iframe[src*="recaptcha"]');
    });
    
    const hasTurnstile = await page.evaluate(() => {
      return !!document.querySelector('iframe[src*="challenges.cloudflare"]');
    });
    
    console.log(`   reCAPTCHA presente: ${hasRecaptcha ? "✅ SIM" : "❌ NÃO"}`);
    console.log(`   Cloudflare Turnstile presente: ${hasTurnstile ? "✅ SIM" : "❌ NÃO"}`);
    
  } catch (error) {
    console.error(`❌ Erro: ${error.message}`);
  }
}

console.log("\n🔒 Fechando browser...");
await browser.close();
console.log("✅ Teste concluído!");

