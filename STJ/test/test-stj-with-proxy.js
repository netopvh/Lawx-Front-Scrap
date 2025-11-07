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
  sessionName: "STJ Test with Proxy BR",
  fingerprint: encodeURIComponent(JSON.stringify(fingerprint)),
  incognito: true,
  proxyCountry: 'BR', // PROXY BR
};

const query = new URLSearchParams(queryParams);
const connectionURL = `wss://browser.scrapeless.com/api/v2/browser?${query.toString()}`;

console.log("🔗 Conectando ao Scrapeless COM PROXY BR...");
const browser = await puppeteer.connect({
  browserWSEndpoint: connectionURL,
  defaultViewport: null,
});

console.log("✅ Conectado!");

const page = await browser.newPage();

// Listener de CAPTCHA
const client = await page.createCDPSession();

let captchaDetected = false;
let captchaSolved = false;
let captchaFailed = false;

client.on("Captcha.detected", (msg) => {
  console.log("🔍 CAPTCHA DETECTADO:", JSON.stringify(msg, null, 2));
  captchaDetected = true;
});

client.on("Captcha.solveFinished", (msg) => {
  console.log("✅ CAPTCHA RESOLVIDO:", JSON.stringify(msg, null, 2));
  captchaSolved = true;
});

client.on("Captcha.solveFailed", (msg) => {
  console.log("❌ CAPTCHA FALHOU:", JSON.stringify(msg, null, 2));
  captchaFailed = true;
});

const url = "https://scon.stj.jus.br/SCON/jurisprudencia/toc.jsp";

console.log(`\n🌐 Navegando para: ${url}`);
await page.goto(url, { timeout: 90000, waitUntil: "domcontentloaded" });
console.log("✅ Página carregada");

// Aguardar 90 segundos
console.log("\n⏳ Aguardando 90 segundos para observar comportamento do CAPTCHA...");
for (let i = 1; i <= 90; i++) {
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  if (i % 10 === 0) {
    console.log(`   ⏱️ ${i}s - Detectado: ${captchaDetected}, Resolvido: ${captchaSolved}, Falhou: ${captchaFailed}`);
    
    // Verificar estado da página
    const pageState = await page.evaluate(() => {
      const body = document.body.innerText || '';
      return {
        hasCloudflareText: body.includes('Just a moment') || body.includes('Checking your browser') || body.includes('Um momento'),
        hasAccessDenied: body.includes('Access denied') || body.includes('blocked'),
        hasSuccessText: body.includes('Pesquisa') || body.includes('Jurisprudência'),
        bodyLength: body.length,
        title: document.title
      };
    });
    
    console.log(`   📄 Estado da página:`, pageState);
  }
  
  if (captchaSolved) {
    console.log("\n✅ CAPTCHA resolvido! Aguardando mais 10s para página carregar...");
    await new Promise(resolve => setTimeout(resolve, 10000));
    break;
  }
  
  if (captchaFailed) {
    console.log("\n❌ CAPTCHA falhou! Parando observação.");
    break;
  }
}

// Screenshot final
await page.screenshot({ path: "stj-with-proxy-test.png", fullPage: true });
console.log("\n📸 Screenshot salvo: stj-with-proxy-test.png");

console.log("\n📊 Resumo:");
console.log(`   CAPTCHA Detectado: ${captchaDetected ? "✅ SIM" : "❌ NÃO"}`);
console.log(`   CAPTCHA Resolvido: ${captchaSolved ? "✅ SIM" : "❌ NÃO"}`);
console.log(`   CAPTCHA Falhou: ${captchaFailed ? "✅ SIM" : "❌ NÃO"}`);

console.log("\n🔒 Fechando browser...");
await browser.close();
console.log("✅ Teste concluído!");

