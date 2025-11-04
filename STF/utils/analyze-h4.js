/**
 * Script para analisar a estrutura do H4 em detalhes
 */

import puppeteer from "puppeteer";
import fs from "fs";

const url = "https://jurisprudencia.stf.jus.br/pages/search?queryString=Advogados&base=acordaos&pesquisa_inteiro_teor=false&sinonimo=true&plural=true&radicais=false&buscaExata=true&page=1&pageSize=10&sort=_score&sortBy=desc";

async function analyzeH4() {
  let browser = null;

  try {
    console.log("🔍 Analisando estrutura do H4...\n");

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

    // Analisar H4 em detalhes
    const h4Analysis = await page.evaluate(() => {
      const container = document.querySelector('.result-container');
      if (!container) return null;

      const h4 = container.querySelector('h4');
      if (!h4) return null;

      const result = {
        innerHTML: h4.innerHTML,
        innerText: h4.innerText,
        textContent: h4.textContent,
        childNodes: [],
        children: [],
        spans: []
      };

      // Analisar todos os childNodes (incluindo text nodes)
      h4.childNodes.forEach((node, i) => {
        result.childNodes.push({
          index: i,
          nodeType: node.nodeType, // 1=Element, 3=Text
          nodeName: node.nodeName,
          nodeValue: node.nodeValue,
          textContent: node.textContent?.trim() || '',
          className: node.className || ''
        });
      });

      // Analisar apenas elementos filhos
      Array.from(h4.children).forEach((child, i) => {
        result.children.push({
          index: i,
          tagName: child.tagName,
          className: child.className,
          textContent: child.textContent?.trim() || ''
        });
      });

      // Analisar spans especificamente
      const spans = h4.querySelectorAll('span');
      spans.forEach((span, i) => {
        result.spans.push({
          index: i,
          textContent: span.textContent?.trim() || '',
          className: span.className,
          parent: span.parentElement?.tagName
        });
      });

      return result;
    });

    console.log("═══════════════════════════════════════════════════════");
    console.log("ESTRUTURA DO H4");
    console.log("═══════════════════════════════════════════════════════\n");
    console.log("innerHTML:");
    console.log(h4Analysis.innerHTML);
    console.log("\n\ninnerText:");
    console.log(h4Analysis.innerText);
    console.log("\n\ntextContent:");
    console.log(h4Analysis.textContent);

    console.log("\n\n═══════════════════════════════════════════════════════");
    console.log("CHILD NODES (incluindo text nodes)");
    console.log("═══════════════════════════════════════════════════════\n");
    console.log(JSON.stringify(h4Analysis.childNodes, null, 2));

    console.log("\n\n═══════════════════════════════════════════════════════");
    console.log("CHILDREN (apenas elementos)");
    console.log("═══════════════════════════════════════════════════════\n");
    console.log(JSON.stringify(h4Analysis.children, null, 2));

    console.log("\n\n═══════════════════════════════════════════════════════");
    console.log("SPANS");
    console.log("═══════════════════════════════════════════════════════\n");
    console.log(JSON.stringify(h4Analysis.spans, null, 2));

    // Salvar análise
    fs.writeFileSync("h4-analysis.json", JSON.stringify(h4Analysis, null, 2), "utf-8");
    console.log("\n\n💾 Análise completa salva em: h4-analysis.json");

    // Testar seletores específicos
    console.log("\n\n═══════════════════════════════════════════════════════");
    console.log("TESTANDO SELETORES ESPECÍFICOS");
    console.log("═══════════════════════════════════════════════════════\n");

    const selectorTests = await page.evaluate(() => {
      const container = document.querySelector('.result-container');
      const h4 = container.querySelector('h4');
      
      return {
        'h4': h4?.textContent?.trim() || '',
        'h4 > span': Array.from(h4.querySelectorAll('span')).map(s => s.textContent?.trim()),
        'h4 > span:nth-child(1)': h4.querySelector('span:nth-child(1)')?.textContent?.trim() || '',
        'h4 > span:nth-child(2)': h4.querySelector('span:nth-child(2)')?.textContent?.trim() || '',
        'h4 > span:nth-child(3)': h4.querySelector('span:nth-child(3)')?.textContent?.trim() || '',
        'h4 > span:nth-child(4)': h4.querySelector('span:nth-child(4)')?.textContent?.trim() || '',
        'h4 > span:nth-child(5)': h4.querySelector('span:nth-child(5)')?.textContent?.trim() || '',
        'h4 > span:nth-child(6)': h4.querySelector('span:nth-child(6)')?.textContent?.trim() || '',
        'h4 > span:nth-of-type(1)': h4.querySelector('span:nth-of-type(1)')?.textContent?.trim() || '',
        'h4 > span:nth-of-type(2)': h4.querySelector('span:nth-of-type(2)')?.textContent?.trim() || '',
        'h4 > span:nth-of-type(3)': h4.querySelector('span:nth-of-type(3)')?.textContent?.trim() || '',
        'h4 > span:nth-of-type(4)': h4.querySelector('span:nth-of-type(4)')?.textContent?.trim() || '',
        'h4 > span:nth-of-type(5)': h4.querySelector('span:nth-of-type(5)')?.textContent?.trim() || '',
      };
    });

    console.log(JSON.stringify(selectorTests, null, 2));

  } catch (error) {
    console.error("❌ Erro:", error.message);
  } finally {
    if (browser) {
      await browser.close();
      console.log("\n🔒 Browser fechado");
    }
  }
}

analyzeH4();

