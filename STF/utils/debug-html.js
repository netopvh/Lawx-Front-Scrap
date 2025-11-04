/**
 * Script de debug para inspecionar HTML do STF
 */

import puppeteer from "puppeteer";
import fs from "fs";

const url = "https://jurisprudencia.stf.jus.br/pages/search?queryString=Advogados&base=acordaos&pesquisa_inteiro_teor=false&sinonimo=true&plural=true&radicais=false&buscaExata=true&page=1&pageSize=100&sort=_score&sortBy=desc";

async function debug() {
  console.log("🔍 Iniciando debug do HTML...");
  console.log("URL:", url);

  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  console.log("📄 Acessando página...");
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

  console.log("⏳ Aguardando 5 segundos para JavaScript carregar...");
  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log("📊 Extraindo informações...");

  const info = await page.evaluate(() => {
    const result = {
      title: document.title,
      spans: [],
      matCards: [],
      divs: [],
      allText: document.body.innerText.substring(0, 500)
    };

    // Buscar todos os spans
    document.querySelectorAll('span').forEach((span, index) => {
      if (index < 20) { // Primeiros 20 spans
        result.spans.push({
          index,
          class: span.className,
          text: span.innerText.substring(0, 100)
        });
      }
    });

    // Buscar mat-cards
    document.querySelectorAll('mat-card').forEach((card, index) => {
      if (index < 10) {
        result.matCards.push({
          index,
          class: card.className,
          text: card.innerText.substring(0, 100)
        });
      }
    });

    // Buscar divs com classes específicas
    const selectors = [
      '.result-item',
      '.result-card',
      '[class*="result"]',
      '[class*="card"]',
      '[class*="item"]'
    ];

    selectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        result.divs.push({
          selector,
          count: elements.length,
          firstClass: elements[0].className,
          firstText: elements[0].innerText.substring(0, 100)
        });
      }
    });

    return result;
  });

  console.log("\n═══════════════════════════════════════════════════════");
  console.log("INFORMAÇÕES DA PÁGINA");
  console.log("═══════════════════════════════════════════════════════");
  console.log("\n📌 Título:", info.title);
  console.log("\n📌 Primeiros 500 caracteres do body:");
  console.log(info.allText);
  console.log("\n📌 Spans encontrados:", info.spans.length);
  info.spans.forEach(span => {
    console.log(`  [${span.index}] class="${span.class}" text="${span.text}"`);
  });
  console.log("\n📌 Mat-cards encontrados:", info.matCards.length);
  info.matCards.forEach(card => {
    console.log(`  [${card.index}] class="${card.class}" text="${card.text}"`);
  });
  console.log("\n📌 Divs com classes específicas:");
  info.divs.forEach(div => {
    console.log(`  ${div.selector}: ${div.count} elementos`);
    console.log(`    class="${div.firstClass}"`);
    console.log(`    text="${div.firstText}"`);
  });

  // Salvar HTML completo
  const html = await page.content();
  fs.writeFileSync("debug-page.html", html, "utf-8");
  console.log("\n💾 HTML completo salvo em: debug-page.html");

  console.log("\n⏸️  Pressione ENTER para fechar o navegador...");
  await new Promise(resolve => {
    process.stdin.once('data', resolve);
  });

  await browser.close();
  console.log("✅ Debug concluído!");
}

debug().catch(console.error);

