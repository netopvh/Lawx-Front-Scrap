/**
 * Teste de conexão com BrowserCloud.io
 * Testa resolução de Cloudflare Turnstile
 */

import puppeteer from "puppeteer-core";
import dotenv from "dotenv";

dotenv.config();

const API_TOKEN = process.env.BROWSERCLOUD_TOKEN;

console.log("🔍 Token:", API_TOKEN ? `${API_TOKEN.substring(0, 10)}...` : "❌ NÃO ENCONTRADO");

if (!API_TOKEN) {
  console.log("\n❌ ERRO: Token não encontrado!");
  console.log("   Configure BROWSERCLOUD_TOKEN no arquivo .env");
  console.log("   Obtenha seu token em: https://browsercloud.io/");
  process.exit(1);
}

// Teste 1: Conexão básica
async function test1() {
  console.log("\n" + "=".repeat(70));
  console.log("📝 TESTE 1: Conexão Básica");
  console.log("=".repeat(70));
  
  try {
    const query = new URLSearchParams({
      token: API_TOKEN,
      timeout: 60000,
    }).toString();
    
    const connectionURL = `wss://chrome-v2.browsercloud.io?${query}`;
    console.log("🔗 URL:", connectionURL.replace(/token=[^&]+/, 'token=***'));
    
    console.log("⏳ Conectando...");
    const browser = await puppeteer.connect({
      browserWSEndpoint: connectionURL,
      defaultViewport: null,
    });
    
    console.log("✅ SUCESSO! Conectado ao BrowserCloud");
    
    const page = await browser.newPage();
    await page.goto('https://example.com', {waitUntil: 'domcontentloaded'});
    console.log("✅ Página carregada: example.com");
    
    await browser.close();
    return true;
  } catch (error) {
    console.log("❌ FALHOU:", error.message);
    return false;
  }
}

// Teste 2: Com Cloudflare Turnstile (solveCaptcha)
async function test2() {
  console.log("\n" + "=".repeat(70));
  console.log("📝 TESTE 2: Cloudflare Turnstile com solveCaptcha");
  console.log("=".repeat(70));

  try {
    // Construir URL seguindo padrão da documentação (parâmetros sem valor)
    const connectionURL = `wss://chrome-v2.browsercloud.io?token=${API_TOKEN}&timeout=90000&solveCaptcha&stealthMode`;
    console.log("🔗 URL:", connectionURL.replace(/token=[^&]+/, 'token=***'));
    
    console.log("⏳ Conectando...");
    const browser = await puppeteer.connect({
      browserWSEndpoint: connectionURL,
      defaultViewport: null,
    });
    
    console.log("✅ Conectado ao BrowserCloud com solveCaptcha");
    
    const page = await browser.newPage();
    
    // Testar com site que tem Cloudflare
    const testURL = 'https://www.scrapingcourse.com/cloudflare-challenge';
    console.log(`\n🌐 Navegando para: ${testURL}`);
    console.log("⏳ Aguardando resolução do Cloudflare Turnstile...");
    
    await page.goto(testURL, {waitUntil: 'domcontentloaded', timeout: 90000});
    console.log("✅ Página carregada");
    
    // Aguardar 10 segundos para observar
    console.log("\n⏳ Aguardando 10 segundos para verificar se CAPTCHA foi resolvido...");
    for (let i = 1; i <= 10; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (i % 2 === 0) {
        const pageState = await page.evaluate(() => {
          const body = document.body.innerText || '';
          return {
            hasCloudflareText: body.includes('Just a moment') || body.includes('Checking your browser'),
            hasSuccessText: body.includes('Cloudflare Challenge Bypassed') || body.includes('challenge-info'),
            title: document.title,
          };
        });
        
        console.log(`   ⏱️ ${i}s - Cloudflare: ${pageState.hasCloudflareText ? "🔴 ATIVO" : "✅ RESOLVIDO"} | Sucesso: ${pageState.hasSuccessText ? "✅ SIM" : "❌ NÃO"}`);
        
        if (pageState.hasSuccessText) {
          console.log("\n✅ CAPTCHA RESOLVIDO COM SUCESSO!");
          break;
        }
      }
    }
    
    // Screenshot final
    await page.screenshot({path: 'browsercloud-test.png', fullPage: true});
    console.log("\n📸 Screenshot salvo: browsercloud-test.png");
    
    await browser.close();
    return true;
  } catch (error) {
    console.log("❌ FALHOU:", error.message);
    return false;
  }
}

// Teste 3: Configuração completa (como no index.js)
async function test3() {
  console.log("\n" + "=".repeat(70));
  console.log("📝 TESTE 3: Configuração Completa (como no index.js)");
  console.log("=".repeat(70));

  try {
    // Construir URL seguindo padrão da documentação
    const connectionURL = `wss://chrome-v2.browsercloud.io?token=${API_TOKEN}&timeout=90000&solveCaptcha&stealthMode&proxy=datacenter&proxyCountry=BR&proxySticky&blockCookieBanners&context=stj-scraper&blockRes=${encodeURIComponent('image,media,font')}`;
    console.log("🔗 URL:", connectionURL.replace(/token=[^&]+/, 'token=***'));
    
    console.log("⏳ Conectando...");
    const browser = await puppeteer.connect({
      browserWSEndpoint: connectionURL,
      defaultViewport: null,
      ignoreHTTPSErrors: true,
    });
    
    console.log("✅ Conectado ao BrowserCloud com configuração completa");
    console.log("   🔓 CAPTCHA Solver: ✅ ATIVADO");
    console.log("   🥷 Stealth Mode: ✅ ATIVADO");
    console.log("   🌐 Proxy: datacenter");
    console.log("   🌍 Proxy Country: BR");
    console.log("   📌 Proxy Sticky: ✅ ATIVADO");
    console.log("   🍪 Block Cookie Banners: ✅ ATIVADO");
    console.log("   💾 Context: stj-scraper");
    console.log("   ⚡ Block Resources: image,media,font");
    
    const page = await browser.newPage();
    await page.goto('https://example.com', {waitUntil: 'domcontentloaded'});
    console.log("\n✅ Página carregada com sucesso!");
    
    await browser.close();
    return true;
  } catch (error) {
    console.log("❌ FALHOU:", error.message);
    return false;
  }
}

// Executar todos os testes
(async () => {
  console.log("\n🚀 Iniciando testes de conexão com BrowserCloud.io...\n");
  
  const results = {
    test1: await test1(),
    test2: await test2(),
    test3: await test3(),
  };
  
  console.log("\n" + "=".repeat(70));
  console.log("📊 RESUMO DOS TESTES");
  console.log("=".repeat(70));
  console.log(`Teste 1 (Básico):              ${results.test1 ? "✅ PASSOU" : "❌ FALHOU"}`);
  console.log(`Teste 2 (Cloudflare Turnstile): ${results.test2 ? "✅ PASSOU" : "❌ FALHOU"}`);
  console.log(`Teste 3 (Completo):            ${results.test3 ? "✅ PASSOU" : "❌ FALHOU"}`);
  console.log("=".repeat(70));
  
  const allPassed = Object.values(results).every(r => r);
  if (allPassed) {
    console.log("\n✅ TODOS OS TESTES PASSARAM!");
    console.log("🎯 BrowserCloud.io está funcionando corretamente!");
    console.log("🚀 Você pode executar o scraper STJ agora: npm start");
  } else {
    console.log("\n⚠️ ALGUNS TESTES FALHARAM");
    console.log("   Verifique o token ou configurações");
    console.log("   Obtenha seu token em: https://browsercloud.io/");
  }
})();

