/**
 * Script para testar nth-of-type em H4s
 */

import puppeteer from "puppeteer";

const url = "https://jurisprudencia.stf.jus.br/pages/search?queryString=Advogados&base=acordaos&pesquisa_inteiro_teor=false&sinonimo=true&plural=true&radicais=false&buscaExata=true&page=1&pageSize=10&sort=_score&sortBy=desc";

async function testNthOfType() {
  let browser = null;

  try {
    console.log("🧪 Testando nth-of-type em H4s...\n");

    browser = await puppeteer.launch({ 
      headless: false,
      defaultViewport: null 
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    console.log("📄 Acessando página...");
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
    console.log("✅ Página carregada!\n");

    await new Promise(resolve => setTimeout(resolve, 5000));

    // Testar nth-of-type
    const nthTests = await page.evaluate(() => {
      const container = document.querySelector('.result-container');
      
      const result = {};
      
      // Testar de 1 a 10
      for (let i = 1; i <= 10; i++) {
        const selector = `h4:nth-of-type(${i})`;
        const element = container.querySelector(selector);
        result[selector] = element ? element.textContent?.trim() : null;
        
        // Também testar com span
        const selectorWithSpan = `h4:nth-of-type(${i}) > span`;
        const spanElement = container.querySelector(selectorWithSpan);
        result[selectorWithSpan] = spanElement ? spanElement.textContent?.trim() : null;
      }
      
      // Listar todos os H4s em ordem
      const allH4s = Array.from(container.querySelectorAll('h4'));
      result['all_h4s'] = allH4s.map((h4, i) => ({
        index: i,
        text: h4.textContent?.trim(),
        hasSpan: h4.querySelector('span') !== null,
        spanText: h4.querySelector('span')?.textContent?.trim() || null
      }));
      
      return result;
    });

    console.log("═══════════════════════════════════════════════════════");
    console.log("TESTE DE nth-of-type");
    console.log("═══════════════════════════════════════════════════════\n");
    console.log(JSON.stringify(nthTests, null, 2));

  } catch (error) {
    console.error("❌ Erro:", error.message);
  } finally {
    if (browser) {
      await browser.close();
      console.log("\n🔒 Browser fechado");
    }
  }
}

testNthOfType();

