/**
 * Script para extrair HTML de exemplo de um resultado
 */

import puppeteer from "puppeteer-core";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const url = "https://jurisprudencia.stf.jus.br/pages/search?queryString=Advogados&base=acordaos&pesquisa_inteiro_teor=false&sinonimo=true&plural=true&radicais=false&buscaExata=true&page=1&pageSize=10&sort=_score&sortBy=desc";

async function extractSample() {
  let browser = null;

  try {
    console.log("🔍 Extraindo amostra de HTML...");

    const query = new URLSearchParams({
      token: process.env.SCRAPELESS_TOKEN,
      sessionRecording: true,
      sessionTTL: 900,
      sessionName: "STF Sample Extractor",
    });

    const connectionURL = `wss://browser.scrapeless.com/api/v2/browser?${query.toString()}`;
    
    console.log("🌐 Conectando ao Scrapeless...");
    browser = await puppeteer.connect({
      browserWSEndpoint: connectionURL,
      defaultViewport: null,
      ignoreHTTPSErrors: true,
    });
    console.log("✅ Conectado!");

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setBypassCSP(true);

    console.log("📄 Acessando página...");
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    console.log("✅ Página carregada!");

    // Aguardar WAF
    const hasWafChallenge = await page.evaluate(() => {
      return document.body.innerHTML.includes('AwsWafIntegration');
    });

    if (hasWafChallenge) {
      console.log("⚠️ Aguardando AWS WAF...");
      await page.waitForFunction(
        () => {
          const hasResults = document.querySelector('.result-container') !== null;
          const noChallenge = !document.body.innerHTML.includes('AwsWafIntegration');
          return hasResults && noChallenge;
        },
        { timeout: 90000, polling: 1000 }
      );
      console.log("✅ WAF resolvido!");
    }

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Extrair HTML do primeiro resultado
    const firstResultHTML = await page.evaluate(() => {
      const container = document.querySelector('.result-container');
      return container ? container.outerHTML : null;
    });

    if (firstResultHTML) {
      fs.writeFileSync("first-result.html", firstResultHTML, "utf-8");
      console.log("\n💾 HTML do primeiro resultado salvo em: first-result.html");
      console.log("\n📏 Tamanho:", firstResultHTML.length, "caracteres");
      console.log("\n📄 Primeiros 2000 caracteres:");
      console.log(firstResultHTML.substring(0, 2000));
    } else {
      console.log("❌ Nenhum resultado encontrado");
    }

    // Extrair estrutura de todos os campos
    const structure = await page.evaluate(() => {
      const container = document.querySelector('.result-container');
      if (!container) return null;

      const result = {
        h3: container.querySelector('h3')?.innerText || null,
        spans: [],
        divs: [],
        paragraphs: []
      };

      container.querySelectorAll('span').forEach((span, i) => {
        if (i < 10) {
          result.spans.push({
            index: i,
            class: span.className,
            text: span.innerText.substring(0, 100)
          });
        }
      });

      container.querySelectorAll('div').forEach((div, i) => {
        if (i < 10 && div.innerText.trim()) {
          result.divs.push({
            index: i,
            class: div.className,
            text: div.innerText.substring(0, 150)
          });
        }
      });

      container.querySelectorAll('p').forEach((p, i) => {
        if (i < 5) {
          result.paragraphs.push({
            index: i,
            class: p.className,
            text: p.innerText.substring(0, 200)
          });
        }
      });

      return result;
    });

    console.log("\n\n═══════════════════════════════════════════════════════");
    console.log("ESTRUTURA DO RESULTADO");
    console.log("═══════════════════════════════════════════════════════\n");
    console.log(JSON.stringify(structure, null, 2));

  } catch (error) {
    console.error("❌ Erro:", error.message);
  } finally {
    if (browser) {
      await browser.close();
      console.log("\n🔒 Browser fechado");
    }
  }
}

extractSample();

