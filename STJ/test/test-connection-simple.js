/**
 * Teste simples de conexão com Scrapeless
 * Testa diferentes configurações para identificar o problema
 */

import puppeteer from "puppeteer-core";
import dotenv from "dotenv";

dotenv.config();

const API_KEY = process.env.SCRAPELESS_TOKEN;

console.log("🔍 Token:", API_KEY ? `${API_KEY.substring(0, 10)}...` : "NÃO ENCONTRADO");

// Teste 1: Configuração mínima (sem proxy, sem incognito)
async function test1() {
  console.log("\n" + "=".repeat(60));
  console.log("📝 TESTE 1: Configuração Mínima (sem proxy, sem incognito)");
  console.log("=".repeat(60));
  
  try {
    const query = new URLSearchParams({
      token: API_KEY,
      sessionTTL: '180',
      sessionRecording: false,
    }).toString();
    
    const connectionURL = `wss://browser.scrapeless.com/api/v2/browser?${query}`;
    console.log("🔗 URL:", connectionURL.replace(/token=[^&]+/, 'token=***'));
    
    console.log("⏳ Conectando...");
    const browser = await puppeteer.connect({
      browserWSEndpoint: connectionURL,
      defaultViewport: null,
    });
    
    console.log("✅ SUCESSO! Conectado ao Scrapeless");
    await browser.close();
    return true;
  } catch (error) {
    console.log("❌ FALHOU:", error.message);
    return false;
  }
}

// Teste 2: Com proxy BR
async function test2() {
  console.log("\n" + "=".repeat(60));
  console.log("📝 TESTE 2: Com Proxy BR");
  console.log("=".repeat(60));
  
  try {
    const query = new URLSearchParams({
      token: API_KEY,
      sessionTTL: '180',
      sessionRecording: false,
      proxyCountry: 'BR',
    }).toString();
    
    const connectionURL = `wss://browser.scrapeless.com/api/v2/browser?${query}`;
    console.log("🔗 URL:", connectionURL.replace(/token=[^&]+/, 'token=***'));
    
    console.log("⏳ Conectando...");
    const browser = await puppeteer.connect({
      browserWSEndpoint: connectionURL,
      defaultViewport: null,
    });
    
    console.log("✅ SUCESSO! Conectado ao Scrapeless com Proxy BR");
    await browser.close();
    return true;
  } catch (error) {
    console.log("❌ FALHOU:", error.message);
    return false;
  }
}

// Teste 3: Com incognito
async function test3() {
  console.log("\n" + "=".repeat(60));
  console.log("📝 TESTE 3: Com Incognito");
  console.log("=".repeat(60));
  
  try {
    const query = new URLSearchParams({
      token: API_KEY,
      sessionTTL: '180',
      sessionRecording: false,
      incognito: true,
    }).toString();
    
    const connectionURL = `wss://browser.scrapeless.com/api/v2/browser?${query}`;
    console.log("🔗 URL:", connectionURL.replace(/token=[^&]+/, 'token=***'));
    
    console.log("⏳ Conectando...");
    const browser = await puppeteer.connect({
      browserWSEndpoint: connectionURL,
      defaultViewport: null,
    });
    
    console.log("✅ SUCESSO! Conectado ao Scrapeless com Incognito");
    await browser.close();
    return true;
  } catch (error) {
    console.log("❌ FALHOU:", error.message);
    return false;
  }
}

// Teste 4: Configuração completa (como no index.js)
async function test4() {
  console.log("\n" + "=".repeat(60));
  console.log("📝 TESTE 4: Configuração Completa (como no index.js)");
  console.log("=".repeat(60));
  
  try {
    const query = new URLSearchParams({
      token: API_KEY,
      sessionRecording: true,
      sessionTTL: 900,
      sessionName: "STJ Scraper",
      incognito: false,
    }).toString();
    
    const connectionURL = `wss://browser.scrapeless.com/api/v2/browser?${query}`;
    console.log("🔗 URL:", connectionURL.replace(/token=[^&]+/, 'token=***'));
    
    console.log("⏳ Conectando...");
    const browser = await puppeteer.connect({
      browserWSEndpoint: connectionURL,
      defaultViewport: null,
      ignoreHTTPSErrors: true,
    });
    
    console.log("✅ SUCESSO! Conectado ao Scrapeless com configuração completa");
    await browser.close();
    return true;
  } catch (error) {
    console.log("❌ FALHOU:", error.message);
    return false;
  }
}

// Executar todos os testes
(async () => {
  console.log("\n🚀 Iniciando testes de conexão com Scrapeless...\n");
  
  const results = {
    test1: await test1(),
    test2: await test2(),
    test3: await test3(),
    test4: await test4(),
  };
  
  console.log("\n" + "=".repeat(60));
  console.log("📊 RESUMO DOS TESTES");
  console.log("=".repeat(60));
  console.log(`Teste 1 (Mínimo):     ${results.test1 ? "✅ PASSOU" : "❌ FALHOU"}`);
  console.log(`Teste 2 (Proxy BR):   ${results.test2 ? "✅ PASSOU" : "❌ FALHOU"}`);
  console.log(`Teste 3 (Incognito):  ${results.test3 ? "✅ PASSOU" : "❌ FALHOU"}`);
  console.log(`Teste 4 (Completo):   ${results.test4 ? "✅ PASSOU" : "❌ FALHOU"}`);
  console.log("=".repeat(60));
  
  const allPassed = Object.values(results).every(r => r);
  if (allPassed) {
    console.log("\n✅ TODOS OS TESTES PASSARAM!");
  } else {
    console.log("\n⚠️ ALGUNS TESTES FALHARAM - Verifique o token ou configurações");
  }
})();

