import puppeteer from "puppeteer-core";
import dotenv from "dotenv";

dotenv.config();

const API_KEY = process.env.SCRAPELESS_TOKEN;
const host = 'wss://browser.scrapeless.com/api/v2';
const query = new URLSearchParams({
  token: API_KEY,
  sessionTTL: '180',
  proxyCountry: 'BR',
  sessionRecording: true,
  incognito: true,
}).toString();

const connectionURL = `${host}/browser?${query}`;

console.log("🔗 Conectando ao Scrapeless...");
const browser = await puppeteer.connect({
    browserWSEndpoint: connectionURL,
    defaultViewport: null,
});
console.log('✅ Conectado!');

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

// Testar com o exemplo da documentação do Scrapeless
const url = 'https://www.scrapingcourse.com/cloudflare-challenge';

console.log(`\n🌐 Navegando para: ${url}`);
await page.goto(url, {waitUntil: 'domcontentloaded', timeout: 60000});
console.log("✅ Página carregada");

// Aguardar 60 segundos
console.log("\n⏳ Aguardando 60 segundos para observar comportamento do CAPTCHA...");
for (let i = 1; i <= 60; i++) {
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  if (i % 10 === 0) {
    console.log(`   ⏱️ ${i}s - Detectado: ${captchaDetected}, Resolvido: ${captchaSolved}, Falhou: ${captchaFailed}`);
    
    // Verificar estado da página
    const pageState = await page.evaluate(() => {
      const body = document.body.innerText || '';
      return {
        hasCloudflareText: body.includes('Just a moment') || body.includes('Checking your browser'),
        hasSuccessText: body.includes('Cloudflare Challenge Bypassed') || body.includes('challenge-info'),
        bodyLength: body.length,
        title: document.title
      };
    });
    
    console.log(`   📄 Estado da página:`, pageState);
  }
  
  if (captchaSolved) {
    console.log("\n✅ CAPTCHA resolvido! Parando observação.");
    break;
  }
  
  if (captchaFailed) {
    console.log("\n❌ CAPTCHA falhou! Parando observação.");
    break;
  }
}

// Verificar se elemento de sucesso apareceu
try {
  await page.waitForSelector('main.page-content .challenge-info', {timeout: 5000});
  console.log("\n✅ Elemento de sucesso encontrado na página!");
} catch (e) {
  console.log("\n❌ Elemento de sucesso NÃO encontrado na página");
}

// Screenshot final
await page.screenshot({path: 'scrapeless-example-test.png', fullPage: true});
console.log("\n📸 Screenshot salvo: scrapeless-example-test.png");

console.log("\n📊 Resumo:");
console.log(`   CAPTCHA Detectado: ${captchaDetected ? "✅ SIM" : "❌ NÃO"}`);
console.log(`   CAPTCHA Resolvido: ${captchaSolved ? "✅ SIM" : "❌ NÃO"}`);
console.log(`   CAPTCHA Falhou: ${captchaFailed ? "✅ SIM" : "❌ NÃO"}`);

console.log("\n🔒 Fechando browser...");
await browser.close();
console.log("✅ Teste concluído!");

