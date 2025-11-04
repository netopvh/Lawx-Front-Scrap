/**
 * Script para inspecionar a página do STF com Scrapeless
 */

import puppeteer from "puppeteer-core";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const url = "https://jurisprudencia.stf.jus.br/pages/search?queryString=Advogados&base=acordaos&pesquisa_inteiro_teor=false&sinonimo=true&plural=true&radicais=false&buscaExata=true&page=1&pageSize=10&sort=_score&sortBy=desc";

async function inspect() {
  let browser = null;

  try {
    console.log("🔍 Iniciando inspeção...");
    console.log("URL:", url);

    // Conectar ao Scrapeless
    const query = new URLSearchParams({
      token: process.env.SCRAPELESS_TOKEN,
      proxyCountry: "BR",
      sessionRecording: true,
      sessionTTL: 900,
      sessionName: "STF Inspector",
    });

    const connectionURL = `wss://browser.scrapeless.com/api/v2/browser?${query.toString()}`;
    
    console.log("🌐 Conectando ao Scrapeless...");
    browser = await puppeteer.connect({
      browserWSEndpoint: connectionURL,
      defaultViewport: null,
    });
    console.log("✅ Conectado!");

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    console.log("📄 Acessando página...");
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    console.log("✅ Página inicial carregada!");

    // Detectar e aguardar AWS WAF Challenge
    console.log("🔍 Verificando AWS WAF Challenge...");
    const hasWafChallenge = await page.evaluate(() => {
      return document.body.innerHTML.includes('AwsWafIntegration') ||
             document.body.innerHTML.includes('challenge-container');
    });

    if (hasWafChallenge) {
      console.log("⚠️ AWS WAF Challenge detectado! Aguardando resolução...");

      try {
        await page.waitForFunction(
          () => {
            const hasResults = document.querySelector('.result-container') !== null;
            const hasSearchForm = document.querySelector('input[type="text"]') !== null;
            const noChallenge = !document.body.innerHTML.includes('AwsWafIntegration');

            return (hasResults || hasSearchForm) && noChallenge;
          },
          { timeout: 90000, polling: 1000 }
        );

        console.log("✅ AWS WAF Challenge resolvido!");
        await new Promise(resolve => setTimeout(resolve, 3000));

      } catch (error) {
        console.log(`❌ Timeout aguardando WAF Challenge: ${error.message}`);
      }
    } else {
      console.log("✅ Sem AWS WAF Challenge detectado");
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    console.log("\n📊 Extraindo informações...\n");

    const info = await page.evaluate(() => {
      const result = {
        title: document.title,
        bodyText: document.body.innerText.substring(0, 1000),
        spanCount: document.querySelectorAll('span').length,
        divCount: document.querySelectorAll('div').length,
        matCardCount: document.querySelectorAll('mat-card').length,
        ngStarInserted: [],
        resultSelectors: {}
      };

      // Buscar spans com ng-star-inserted
      document.querySelectorAll('span.ng-star-inserted').forEach((span, index) => {
        if (index < 10) {
          result.ngStarInserted.push({
            index,
            text: span.innerText.substring(0, 200),
            class: span.className
          });
        }
      });

      // Testar vários seletores possíveis
      const selectors = [
        'mat-card',
        '.result-item',
        '.result-card',
        '[class*="result"]',
        '[class*="card"]',
        '[class*="jurisprudencia"]',
        '[class*="acordao"]',
        'app-resultado',
        'app-card',
        '.mat-card'
      ];

      selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          result.resultSelectors[selector] = {
            count: elements.length,
            firstClass: elements[0].className,
            firstText: elements[0].innerText.substring(0, 200)
          };
        }
      });

      return result;
    });

    console.log("═══════════════════════════════════════════════════════");
    console.log("INFORMAÇÕES DA PÁGINA");
    console.log("═══════════════════════════════════════════════════════\n");
    
    console.log("📌 Título:", info.title);
    console.log("\n📌 Contadores:");
    console.log(`   Spans: ${info.spanCount}`);
    console.log(`   Divs: ${info.divCount}`);
    console.log(`   Mat-cards: ${info.matCardCount}`);
    
    console.log("\n📌 Spans com ng-star-inserted:", info.ngStarInserted.length);
    info.ngStarInserted.forEach(span => {
      console.log(`\n   [${span.index}]`);
      console.log(`   Class: ${span.class}`);
      console.log(`   Text: ${span.text}`);
    });

    console.log("\n📌 Seletores de resultados encontrados:");
    Object.entries(info.resultSelectors).forEach(([selector, data]) => {
      console.log(`\n   ${selector}: ${data.count} elementos`);
      console.log(`   Primeira class: ${data.firstClass}`);
      console.log(`   Primeiro texto: ${data.firstText}`);
    });

    console.log("\n📌 Primeiros 1000 caracteres do body:");
    console.log(info.bodyText);

    // Salvar HTML completo
    const html = await page.content();
    fs.writeFileSync("inspect-page.html", html, "utf-8");
    console.log("\n💾 HTML completo salvo em: inspect-page.html");

    // Tirar screenshot
    await page.screenshot({ path: "inspect-screenshot.png", fullPage: true });
    console.log("📸 Screenshot salvo em: inspect-screenshot.png");

    console.log("\n✅ Inspeção concluída!");

  } catch (error) {
    console.error("❌ Erro:", error.message);
    console.error(error.stack);
  } finally {
    if (browser) {
      await browser.close();
      console.log("🔒 Browser fechado");
    }
  }
}

inspect();

