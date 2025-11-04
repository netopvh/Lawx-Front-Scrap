/**
 * Teste simples STF com Scrapeless
 */

import puppeteer from "puppeteer-core";
import dotenv from "dotenv";

dotenv.config();

async function testSTF() {
  let browser = null;
  
  try {
    console.log("🔗 Conectando ao Scrapeless com Proxy BR...");
    
    const query = new URLSearchParams({
      token: process.env.SCRAPELESS_TOKEN,
      proxyCountry: "BR",
      sessionRecording: false,
      sessionTTL: 300,
      sessionName: "STF Test Simple",
    });
    
    const connectionURL = `wss://browser.scrapeless.com/api/v2/browser?${query.toString()}`;
    
    browser = await puppeteer.connect({
      browserWSEndpoint: connectionURL,
      defaultViewport: null,
      ignoreHTTPSErrors: true,
    });
    
    console.log("✅ Conectado!");
    
    const page = await browser.newPage();
    console.log("✅ Página criada");
    
    const url = "https://jurisprudencia.stf.jus.br/pages/search?queryString=Advogados&base=acordaos&page=1&pageSize=10";
    
    console.log(`🌐 Navegando para: ${url}`);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    console.log("✅ Página carregada!");
    
    // Aguardar um pouco
    console.log("⏳ Aguardando 10 segundos...");
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Verificar conteúdo
    const analysis = await page.evaluate(() => {
      return {
        title: document.title,
        bodyLength: document.body.innerHTML.length,
        hasAwsWaf: document.body.innerHTML.includes('AwsWafIntegration'),
        hasChallenge: document.body.innerHTML.includes('challenge-container'),
        hasResults: document.querySelector('.result-container') !== null,
        hasAngular: document.querySelector('app-root') !== null,
      };
    });
    
    console.log("\n📊 Análise:");
    console.log(`   Título: ${analysis.title}`);
    console.log(`   HTML size: ${analysis.bodyLength} bytes`);
    console.log(`   AWS WAF: ${analysis.hasAwsWaf ? '⚠️ SIM' : '✅ NÃO'}`);
    console.log(`   Challenge: ${analysis.hasChallenge ? '⚠️ SIM' : '✅ NÃO'}`);
    console.log(`   Resultados: ${analysis.hasResults ? '✅ SIM' : '❌ NÃO'}`);
    console.log(`   Angular App: ${analysis.hasAngular ? '✅ SIM' : '❌ NÃO'}`);
    
    // Se tiver WAF, aguardar mais
    if (analysis.hasAwsWaf || analysis.hasChallenge) {
      console.log("\n⚠️ AWS WAF detectado! Aguardando resolução...");
      console.log("⏳ Aguardando 2 minutos...");
      
      await new Promise(resolve => setTimeout(resolve, 120000));
      
      // Verificar novamente
      const analysis2 = await page.evaluate(() => {
        return {
          hasAwsWaf: document.body.innerHTML.includes('AwsWafIntegration'),
          hasChallenge: document.body.innerHTML.includes('challenge-container'),
          hasResults: document.querySelector('.result-container') !== null,
          hasAngular: document.querySelector('app-root') !== null,
        };
      });
      
      console.log("\n📊 Análise após 2 minutos:");
      console.log(`   AWS WAF: ${analysis2.hasAwsWaf ? '⚠️ AINDA PRESENTE' : '✅ RESOLVIDO'}`);
      console.log(`   Challenge: ${analysis2.hasChallenge ? '⚠️ AINDA PRESENTE' : '✅ RESOLVIDO'}`);
      console.log(`   Resultados: ${analysis2.hasResults ? '✅ SIM' : '❌ NÃO'}`);
      console.log(`   Angular App: ${analysis2.hasAngular ? '✅ SIM' : '❌ NÃO'}`);
      
      // Screenshot
      await page.screenshot({ path: 'test-stf-after-wait.png', fullPage: true });
      console.log("\n📸 Screenshot salvo: test-stf-after-wait.png");
    }
    
    console.log("\n✅ Teste concluído!");
    
  } catch (error) {
    console.error(`\n❌ Erro: ${error.message}`);
    console.error(error.stack);
    
  } finally {
    if (browser) {
      await browser.close();
      console.log("🔒 Browser fechado");
    }
  }
}

testSTF();

