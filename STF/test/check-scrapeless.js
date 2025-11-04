/**
 * Verificar se Scrapeless está disponível
 */

import puppeteer from "puppeteer-core";
import dotenv from "dotenv";

dotenv.config();

async function checkScrapeless() {
  console.log("🔍 Verificando disponibilidade do Scrapeless...\n");
  
  let browser = null;
  
  try {
    const query = new URLSearchParams({
      token: process.env.SCRAPELESS_TOKEN,
      proxyCountry: "BR",
      sessionRecording: false,
      sessionTTL: 300,
      sessionName: "Health Check",
    });
    
    const connectionURL = `wss://browser.scrapeless.com/api/v2/browser?${query.toString()}`;
    
    console.log("⏳ Tentando conectar (timeout 10s)...");
    const startTime = Date.now();
    
    browser = await Promise.race([
      puppeteer.connect({
        browserWSEndpoint: connectionURL,
        defaultViewport: null,
        ignoreHTTPSErrors: true,
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Timeout")), 10000)
      )
    ]);
    
    const connectTime = Date.now() - startTime;
    console.log(`✅ Scrapeless DISPONÍVEL! (${connectTime}ms)`);
    console.log("✅ Pode executar o scraper normalmente.\n");
    
    return true;
    
  } catch (error) {
    console.log(`❌ Scrapeless INDISPONÍVEL: ${error.message}`);
    console.log("⚠️ O scraper usará Puppeteer local como fallback.\n");
    
    return false;
    
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

checkScrapeless();

