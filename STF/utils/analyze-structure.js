/**
 * Script para analisar a estrutura real da página do STF
 */

import puppeteer from "puppeteer";
import fs from "fs";

const url = "https://jurisprudencia.stf.jus.br/pages/search?queryString=Advogados&base=acordaos&pesquisa_inteiro_teor=false&sinonimo=true&plural=true&radicais=false&buscaExata=true&page=1&pageSize=10&sort=_score&sortBy=desc";

async function analyze() {
  let browser = null;

  try {
    console.log("🔍 Analisando estrutura da página do STF...\n");

    console.log("🌐 Iniciando navegador local...");
    browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null
    });
    console.log("✅ Navegador iniciado!\n");

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    console.log("📄 Acessando página...");
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
    console.log("✅ Página carregada!\n");

    await new Promise(resolve => setTimeout(resolve, 5000));

    // Analisar estrutura completa
    const analysis = await page.evaluate(() => {
      const results = [];
      
      // Procurar por diferentes seletores possíveis
      const possibleSelectors = [
        '.result-container',
        'mat-card',
        '.mat-card',
        '[class*="result"]',
        '[class*="card"]',
        'app-resultado',
        '.search-result',
        '.resultado'
      ];

      let foundSelector = null;
      let elements = [];

      for (const selector of possibleSelectors) {
        elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          foundSelector = selector;
          break;
        }
      }

      if (!foundSelector) {
        return {
          error: "Nenhum seletor de resultado encontrado",
          bodyPreview: document.body.innerText.substring(0, 500)
        };
      }

      // Analisar primeiro resultado em detalhes
      const firstResult = elements[0];
      
      const structure = {
        foundSelector: foundSelector,
        totalResults: elements.length,
        firstResultHTML: firstResult.outerHTML.substring(0, 2000),
        firstResultClasses: firstResult.className,
        
        // Procurar campos específicos
        fields: {
          h1: firstResult.querySelector('h1')?.innerText || null,
          h2: firstResult.querySelector('h2')?.innerText || null,
          h3: firstResult.querySelector('h3')?.innerText || null,
          h4: firstResult.querySelector('h4')?.innerText || null,
          h5: firstResult.querySelector('h5')?.innerText || null,
        },
        
        // Analisar todos os spans
        spans: [],
        divs: [],
        paragraphs: [],
        links: []
      };

      // Coletar spans
      firstResult.querySelectorAll('span').forEach((span, i) => {
        if (i < 20 && span.innerText.trim()) {
          structure.spans.push({
            index: i,
            class: span.className,
            text: span.innerText.trim().substring(0, 100)
          });
        }
      });

      // Coletar divs com texto
      firstResult.querySelectorAll('div').forEach((div, i) => {
        if (i < 20 && div.innerText.trim() && div.children.length === 0) {
          structure.divs.push({
            index: i,
            class: div.className,
            text: div.innerText.trim().substring(0, 150)
          });
        }
      });

      // Coletar parágrafos
      firstResult.querySelectorAll('p').forEach((p, i) => {
        if (i < 10) {
          structure.paragraphs.push({
            index: i,
            class: p.className,
            text: p.innerText.trim().substring(0, 200)
          });
        }
      });

      // Coletar links
      firstResult.querySelectorAll('a').forEach((a, i) => {
        if (i < 10) {
          structure.links.push({
            index: i,
            class: a.className,
            href: a.href,
            text: a.innerText.trim().substring(0, 100)
          });
        }
      });

      // Procurar por atributos data-*
      const dataAttributes = {};
      for (const attr of firstResult.attributes) {
        if (attr.name.startsWith('data-')) {
          dataAttributes[attr.name] = attr.value;
        }
      }
      structure.dataAttributes = dataAttributes;

      return structure;
    });

    console.log("═══════════════════════════════════════════════════════");
    console.log("ANÁLISE DA ESTRUTURA DA PÁGINA");
    console.log("═══════════════════════════════════════════════════════\n");
    console.log(JSON.stringify(analysis, null, 2));

    // Salvar análise em arquivo
    fs.writeFileSync("structure-analysis.json", JSON.stringify(analysis, null, 2), "utf-8");
    console.log("\n\n💾 Análise completa salva em: structure-analysis.json");

    // Tirar screenshot
    await page.screenshot({ path: "structure-screenshot.png", fullPage: true });
    console.log("📸 Screenshot salvo em: structure-screenshot.png");

    // Extrair opções do menu lateral (bases disponíveis)
    console.log("\n\n═══════════════════════════════════════════════════════");
    console.log("OPÇÕES DE BASE (MENU LATERAL)");
    console.log("═══════════════════════════════════════════════════════\n");

    const baseOptions = await page.evaluate(() => {
      const options = [];
      
      // Procurar por checkboxes, radio buttons ou links no menu lateral
      const possibleSelectors = [
        'mat-checkbox',
        'mat-radio-button',
        'input[type="checkbox"]',
        'input[type="radio"]',
        '[class*="filter"]',
        '[class*="sidebar"]',
        '[class*="menu"]'
      ];

      for (const selector of possibleSelectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          elements.forEach((el, i) => {
            if (i < 20) {
              options.push({
                selector: selector,
                index: i,
                text: el.innerText?.trim() || el.textContent?.trim() || '',
                value: el.value || '',
                checked: el.checked || false,
                class: el.className
              });
            }
          });
        }
      }

      return options;
    });

    console.log(JSON.stringify(baseOptions, null, 2));
    fs.writeFileSync("base-options.json", JSON.stringify(baseOptions, null, 2), "utf-8");
    console.log("\n💾 Opções de base salvas em: base-options.json");

  } catch (error) {
    console.error("❌ Erro:", error.message);
  } finally {
    if (browser) {
      await browser.close();
      console.log("\n🔒 Browser fechado");
    }
  }
}

analyze();

