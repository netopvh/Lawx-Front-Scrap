/**
 * Testar navegação completa com Scrapeless
 */

import puppeteer from "puppeteer-core";
import dotenv from "dotenv";

dotenv.config();

async function testNavigation() {
  console.log("🧪 Testando navegação completa com Scrapeless...\n");
  
  let browser = null;
  let page = null;
  
  try {
    // 1. Conectar
    console.log("1️⃣ Conectando ao Scrapeless...");
    const query = new URLSearchParams({
      token: process.env.SCRAPELESS_TOKEN,
      proxyCountry: "BR",
      sessionRecording: false,
      sessionTTL: 600,
      sessionName: "Navigation Test",
    });
    
    const connectionURL = `wss://browser.scrapeless.com/api/v2/browser?${query.toString()}`;
    
    browser = await puppeteer.connect({
      browserWSEndpoint: connectionURL,
      defaultViewport: null,
      ignoreHTTPSErrors: true,
    });
    
    console.log("✅ Conectado!\n");
    
    // 2. Aguardar antes de criar página
    console.log("2️⃣ Aguardando 3s antes de criar página...");
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 3. Criar página
    console.log("3️⃣ Criando página...");
    page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setBypassCSP(true);
    console.log("✅ Página criada!\n");
    
    // 4. Aguardar antes de navegar
    console.log("4️⃣ Aguardando 3s antes de navegar...");
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 5. Navegar
    // Testar com URL curta primeiro
    const url = "https://jurisprudencia.stf.jus.br/pages/search?queryString=Advogados&base=acordaos&page=1&pageSize=10";
    
    console.log("5️⃣ Navegando para STF...");
    console.log(`   URL: ${url.substring(0, 80)}...`);
    
    const startNav = Date.now();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    const navTime = Date.now() - startNav;
    
    console.log(`✅ Navegação bem-sucedida! (${navTime}ms)\n`);
    
    // 6. Aguardar JS carregar
    console.log("6️⃣ Aguardando 10s para JavaScript carregar...");
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // 7. Verificar resultados
    console.log("7️⃣ Verificando resultados...");
    const resultCount = await page.evaluate(() => {
      const containers = document.querySelectorAll('.result-container');
      return containers.length;
    });
    
    console.log(`✅ Encontrados ${resultCount} resultados!\n`);
    
    console.log("🎉 TESTE COMPLETO BEM-SUCEDIDO!\n");
    
    return true;
    
  } catch (error) {
    console.log(`\n❌ ERRO: ${error.message}`);
    console.log(`   Stack: ${error.stack}\n`);
    
    return false;
    
  } finally {
    if (browser) {
      await browser.close();
      console.log("🔒 Browser fechado\n");
    }
  }
}

testNavigation();

