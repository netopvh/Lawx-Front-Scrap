/**
 * Script para encontrar onde estão os spans com os dados
 */

import puppeteer from "puppeteer";
import fs from "fs";

const url = "https://jurisprudencia.stf.jus.br/pages/search?queryString=Advogados&base=acordaos&pesquisa_inteiro_teor=false&sinonimo=true&plural=true&radicais=false&buscaExata=true&page=1&pageSize=10&sort=_score&sortBy=desc";

async function findSpansParent() {
  let browser = null;

  try {
    console.log("🔍 Procurando onde estão os spans com dados...\n");

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

    // Procurar spans específicos
    const spanLocations = await page.evaluate(() => {
      const container = document.querySelector('.result-container');
      if (!container) return null;

      const result = {
        targetSpans: [],
        allH4s: []
      };

      // Procurar spans com textos específicos
      const targetTexts = [
        'Tribunal Pleno',
        'Min. MARCO AURÉLIO',
        'Min. EDSON FACHIN',
        '25/04/2023',
        '16/06/2023'
      ];

      targetTexts.forEach(targetText => {
        const spans = Array.from(container.querySelectorAll('span'));
        const matchingSpan = spans.find(s => s.textContent?.trim() === targetText);
        
        if (matchingSpan) {
          // Construir caminho até o container
          let path = [];
          let current = matchingSpan;
          
          while (current && current !== container) {
            const tag = current.tagName;
            const className = current.className;
            const index = Array.from(current.parentElement?.children || []).indexOf(current);
            
            path.unshift({
              tag,
              className,
              index,
              id: current.id || ''
            });
            
            current = current.parentElement;
          }
          
          result.targetSpans.push({
            text: targetText,
            path: path,
            innerHTML: matchingSpan.parentElement?.innerHTML?.substring(0, 200) || '',
            parentTag: matchingSpan.parentElement?.tagName,
            parentClass: matchingSpan.parentElement?.className
          });
        }
      });

      // Listar todos os H4s no container
      const h4s = container.querySelectorAll('h4');
      h4s.forEach((h4, i) => {
        result.allH4s.push({
          index: i,
          textContent: h4.textContent?.trim() || '',
          innerHTML: h4.innerHTML,
          className: h4.className,
          parentTag: h4.parentElement?.tagName,
          parentClass: h4.parentElement?.className,
          nextSibling: h4.nextElementSibling?.tagName || null,
          nextSiblingClass: h4.nextElementSibling?.className || null
        });
      });

      return result;
    });

    console.log("═══════════════════════════════════════════════════════");
    console.log("LOCALIZAÇÃO DOS SPANS COM DADOS");
    console.log("═══════════════════════════════════════════════════════\n");
    
    spanLocations.targetSpans.forEach(span => {
      console.log(`\n📍 "${span.text}"`);
      console.log(`   Parent: <${span.parentTag} class="${span.parentClass}">`);
      console.log(`   Path: ${span.path.map(p => `${p.tag}[${p.index}]`).join(' > ')}`);
      console.log(`   HTML: ${span.innerHTML.substring(0, 100)}...`);
    });

    console.log("\n\n═══════════════════════════════════════════════════════");
    console.log("TODOS OS H4s ENCONTRADOS");
    console.log("═══════════════════════════════════════════════════════\n");
    console.log(JSON.stringify(spanLocations.allH4s, null, 2));

    // Salvar análise
    fs.writeFileSync("span-locations.json", JSON.stringify(spanLocations, null, 2), "utf-8");
    console.log("\n\n💾 Análise completa salva em: span-locations.json");

    // Testar seletores alternativos
    console.log("\n\n═══════════════════════════════════════════════════════");
    console.log("TESTANDO SELETORES ALTERNATIVOS");
    console.log("═══════════════════════════════════════════════════════\n");

    const alternativeSelectors = await page.evaluate(() => {
      const container = document.querySelector('.result-container');
      
      return {
        'Todos os H4s': Array.from(container.querySelectorAll('h4')).map(h => h.textContent?.trim()),
        'H4 seguido de span': container.querySelector('h4 + span')?.textContent?.trim() || '',
        'H4 seguido de div': container.querySelector('h4 + div')?.textContent?.trim().substring(0, 100) || '',
        'Div após H4': container.querySelector('h4 ~ div')?.textContent?.trim().substring(0, 100) || '',
        'Span com "Tribunal"': container.querySelector('span:contains("Tribunal")')?.textContent?.trim() || 'N/A',
        'Span com "Min."': Array.from(container.querySelectorAll('span')).filter(s => s.textContent?.includes('Min.')).map(s => s.textContent?.trim()),
        'Span com data': Array.from(container.querySelectorAll('span')).filter(s => /\d{2}\/\d{2}\/\d{4}/.test(s.textContent || '')).map(s => s.textContent?.trim())
      };
    });

    console.log(JSON.stringify(alternativeSelectors, null, 2));

  } catch (error) {
    console.error("❌ Erro:", error.message);
  } finally {
    if (browser) {
      await browser.close();
      console.log("\n🔒 Browser fechado");
    }
  }
}

findSpansParent();

