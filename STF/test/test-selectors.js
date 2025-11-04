/**
 * Script para testar os seletores do fields.json
 */

import puppeteer from "puppeteer";
import fs from "fs";

const url = "https://jurisprudencia.stf.jus.br/pages/search?queryString=Advogados&base=acordaos&pesquisa_inteiro_teor=false&sinonimo=true&plural=true&radicais=false&buscaExata=true&page=1&pageSize=10&sort=_score&sortBy=desc";

async function testSelectors() {
  let browser = null;

  try {
    console.log("🧪 Testando seletores do fields.json...\n");

    // Carregar fields.json
    const fieldsConfig = JSON.parse(fs.readFileSync("config/fields.json", "utf-8"));
    console.log("✅ fields.json carregado\n");

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

    // Testar extração
    const items = await page.evaluate((config) => {
      const results = [];
      const resultSelector = config.resultados?.selector || ".result-container";
      const resultElements = document.querySelectorAll(resultSelector);

      console.log(`Encontrados ${resultElements.length} elementos com seletor: ${resultSelector}`);

      resultElements.forEach((element, index) => {
        if (index < 3) { // Apenas primeiros 3 para teste
          const item = { _index: index };

          // Extrair cada campo configurado
          for (const [fieldName, fieldConfig] of Object.entries(config)) {
            if (fieldName === "resultados") continue;
            if (fieldName.startsWith("_")) continue;

            try {
              const selector = fieldConfig.selector;
              const attribute = fieldConfig.attribute;
              const fieldElement = element.querySelector(selector);

              if (fieldElement) {
                if (attribute) {
                  item[fieldName] = fieldElement.getAttribute(attribute) || "";
                } else {
                  item[fieldName] = (fieldElement.innerText || fieldElement.textContent || "").trim();
                }
                item[`_${fieldName}_found`] = true;
              } else {
                item[fieldName] = "";
                item[`_${fieldName}_found`] = false;
              }
            } catch (err) {
              item[fieldName] = "";
              item[`_${fieldName}_found`] = false;
              item[`_${fieldName}_error`] = err.message;
            }
          }

          // Extração customizada para campos que precisam de lógica especial
          // Buscar por padrões de texto nos H4s
          const allH4s = element.querySelectorAll('h4');
          allH4s.forEach(h4 => {
            const text = h4.textContent || '';
            const span = h4.querySelector('span');
            const spanText = span ? span.textContent?.trim() : '';

            if (text.includes('Órgão julgador:') && spanText) {
              item.orgao_julgador = spanText;
              item._orgao_julgador_found = true;
            } else if (text.includes('Relator(a):') && spanText) {
              item.relator = spanText;
              item._relator_found = true;
            } else if (text.includes('Redator(a)') && spanText) {
              item.redator_acordao = spanText;
              item._redator_acordao_found = true;
            } else if (text.includes('Julgamento:') && spanText) {
              item.data_julgamento = spanText;
              item._data_julgamento_found = true;
            } else if (text.includes('Publicação:') && spanText) {
              item.data_publicacao = spanText;
              item._data_publicacao_found = true;
            }
          });

          results.push(item);
        }
      });

      return results;
    }, fieldsConfig);

    console.log("═══════════════════════════════════════════════════════");
    console.log("RESULTADOS DA EXTRAÇÃO (3 primeiros itens)");
    console.log("═══════════════════════════════════════════════════════\n");
    console.log(JSON.stringify(items, null, 2));

    // Salvar resultados
    fs.writeFileSync("test-extraction.json", JSON.stringify(items, null, 2), "utf-8");
    console.log("\n\n💾 Resultados salvos em: test-extraction.json");

    // Análise de campos encontrados/não encontrados
    console.log("\n\n═══════════════════════════════════════════════════════");
    console.log("ANÁLISE DE SELETORES");
    console.log("═══════════════════════════════════════════════════════\n");

    if (items.length > 0) {
      const firstItem = items[0];
      const fields = Object.keys(fieldsConfig).filter(k => k !== "resultados");
      
      fields.forEach(field => {
        const found = firstItem[`_${field}_found`];
        const value = firstItem[field];
        const status = found ? "✅" : "❌";
        const preview = value ? value.substring(0, 50) : "(vazio)";
        
        console.log(`${status} ${field.padEnd(25)} | ${preview}`);
      });
    }

    await page.screenshot({ path: "test-screenshot.png", fullPage: true });
    console.log("\n📸 Screenshot salvo em: test-screenshot.png");

  } catch (error) {
    console.error("❌ Erro:", error.message);
  } finally {
    if (browser) {
      await browser.close();
      console.log("\n🔒 Browser fechado");
    }
  }
}

testSelectors();

