/**
 * Script para analisar a estrutura de spans dentro do result-container
 */

import puppeteer from "puppeteer";
import fs from "fs";

const url = "https://jurisprudencia.stf.jus.br/pages/search?queryString=Advogados&base=acordaos&pesquisa_inteiro_teor=false&sinonimo=true&plural=true&radicais=false&buscaExata=true&page=1&pageSize=10&sort=_score&sortBy=desc";

async function analyzeSpans() {
  let browser = null;

  try {
    console.log("🔍 Analisando estrutura de spans...\n");

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

    // Analisar estrutura detalhada
    const analysis = await page.evaluate(() => {
      const container = document.querySelector('.result-container');
      if (!container) return null;

      const result = {
        allSpans: [],
        allDivs: [],
        allParagraphs: [],
        allLinks: [],
        structure: {}
      };

      // Coletar TODOS os spans com seus pais
      const spans = container.querySelectorAll('span');
      spans.forEach((span, i) => {
        const text = span.innerText?.trim() || span.textContent?.trim() || '';
        if (text && text.length < 200) {
          result.allSpans.push({
            index: i,
            text: text,
            class: span.className,
            parent: span.parentElement?.tagName,
            parentClass: span.parentElement?.className
          });
        }
      });

      // Coletar divs diretos do container
      const directDivs = Array.from(container.children).filter(el => el.tagName === 'DIV');
      directDivs.forEach((div, i) => {
        const text = div.innerText?.trim() || '';
        if (text && text.length < 300) {
          result.allDivs.push({
            index: i,
            text: text.substring(0, 150),
            class: div.className,
            hasSpans: div.querySelectorAll('span').length
          });
        }
      });

      // Coletar parágrafos
      const paragraphs = container.querySelectorAll('p');
      paragraphs.forEach((p, i) => {
        result.allParagraphs.push({
          index: i,
          text: p.innerText.substring(0, 100),
          class: p.className
        });
      });

      // Coletar links
      const links = container.querySelectorAll('a');
      links.forEach((a, i) => {
        result.allLinks.push({
          index: i,
          text: a.innerText?.trim().substring(0, 50) || '',
          href: a.href,
          mattooltip: a.getAttribute('mattooltip')
        });
      });

      // Tentar identificar campos específicos
      result.structure = {
        numero_processo: container.querySelector('h4')?.innerText || '',
        
        // Procurar por padrões de texto
        orgao_julgador: null,
        relator: null,
        redator: null,
        data_julgamento: null,
        data_publicacao: null
      };

      // Procurar órgão julgador (geralmente contém "Turma" ou "Pleno")
      spans.forEach(span => {
        const text = span.innerText?.trim() || '';
        if (text.includes('Turma') || text.includes('Pleno')) {
          result.structure.orgao_julgador = text;
        }
        if (text.startsWith('Min.')) {
          if (!result.structure.relator) {
            result.structure.relator = text;
          } else if (!result.structure.redator) {
            result.structure.redator = text;
          }
        }
        // Procurar datas no formato DD/MM/YYYY
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(text)) {
          if (!result.structure.data_julgamento) {
            result.structure.data_julgamento = text;
          } else if (!result.structure.data_publicacao) {
            result.structure.data_publicacao = text;
          }
        }
      });

      return result;
    });

    console.log("═══════════════════════════════════════════════════════");
    console.log("TODOS OS SPANS ENCONTRADOS");
    console.log("═══════════════════════════════════════════════════════\n");
    console.log(JSON.stringify(analysis.allSpans, null, 2));

    console.log("\n\n═══════════════════════════════════════════════════════");
    console.log("ESTRUTURA IDENTIFICADA");
    console.log("═══════════════════════════════════════════════════════\n");
    console.log(JSON.stringify(analysis.structure, null, 2));

    console.log("\n\n═══════════════════════════════════════════════════════");
    console.log("TODOS OS LINKS");
    console.log("═══════════════════════════════════════════════════════\n");
    console.log(JSON.stringify(analysis.allLinks, null, 2));

    // Salvar análise
    fs.writeFileSync("spans-analysis.json", JSON.stringify(analysis, null, 2), "utf-8");
    console.log("\n\n💾 Análise completa salva em: spans-analysis.json");

  } catch (error) {
    console.error("❌ Erro:", error.message);
  } finally {
    if (browser) {
      await browser.close();
      console.log("\n🔒 Browser fechado");
    }
  }
}

analyzeSpans();

