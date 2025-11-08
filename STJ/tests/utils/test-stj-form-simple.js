/**
 * ═══════════════════════════════════════════════════════════════════════
 * TEST: Formulário STJ Simples (sem CAPTCHA)
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * OBJETIVO:
 * Testar navegação e preenchimento básico do formulário STJ com Browserless.
 * 
 * COMO USAR:
 * node tests/utils/test-stj-form-simple.js
 * 
 * RESULTADO ESPERADO:
 * - Navegação para página STJ
 * - Detecção de CAPTCHA (se presente)
 * - Screenshot da página
 * - Exit code 0
 * 
 * NOTA:
 * Este teste NÃO aguarda resolução de CAPTCHA, apenas detecta sua presença.
 * ═══════════════════════════════════════════════════════════════════════
 */

import puppeteer from "puppeteer-core";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

dotenv.config();

async function testSTJFormSimple() {
  let browser;
  
  try {
    console.log("═══════════════════════════════════════════════════════");
    console.log("🧪 TESTE: Formulário STJ Simples");
    console.log("═══════════════════════════════════════════════════════\n");

    // Validar variáveis de ambiente
    const apiKey = process.env.BROWSERLESS_API_KEY;
    const region = process.env.BROWSERLESS_REGION || "production-sfo";
    const stjUrl = process.env.STJ_URL || "https://scon.stj.jus.br/SCON/jurisprudencia/toc.jsp";

    if (!apiKey) {
      throw new Error("❌ BROWSERLESS_API_KEY não configurada no .env");
    }

    console.log(`📋 Configurações:`);
    console.log(`   API Key: ${apiKey.substring(0, 8)}...`);
    console.log(`   Região: ${region}`);
    console.log(`   URL STJ: ${stjUrl}\n`);

    // Conectar ao Browserless
    const connectionURL = `wss://${region}.browserless.io?token=${apiKey}`;
    
    console.log(`🌐 Conectando ao Browserless...`);
    browser = await puppeteer.connect({
      browserWSEndpoint: connectionURL,
      defaultViewport: null,
      ignoreHTTPSErrors: true,
    });
    console.log(`✅ Conectado!\n`);

    // Criar nova página
    const page = await browser.newPage();
    console.log(`📄 Página criada\n`);

    // Navegar para STJ
    console.log(`🌐 Navegando para ${stjUrl}...`);
    await page.goto(stjUrl, { 
      waitUntil: "domcontentloaded",
      timeout: 30000 
    });
    console.log(`✅ Navegação concluída!\n`);

    // Aguardar 3 segundos para página carregar
    console.log(`⏳ Aguardando 3 segundos...`);
    await new Promise(resolve => setTimeout(resolve, 3000));
    console.log(`✅ Aguardado!\n`);

    // Detectar CAPTCHA
    console.log(`🔍 Detectando CAPTCHA...`);
    const captchaDetected = await page.evaluate(() => {
      const recaptcha = document.querySelector('.g-recaptcha, iframe[src*="recaptcha"]');
      const turnstile = document.querySelector('.cf-turnstile, #cf-turnstile');
      const hcaptcha = document.querySelector('.h-captcha');
      
      return {
        recaptcha: recaptcha !== null,
        turnstile: turnstile !== null,
        hcaptcha: hcaptcha !== null,
        any: recaptcha !== null || turnstile !== null || hcaptcha !== null
      };
    });

    if (captchaDetected.any) {
      console.log(`⚠️ CAPTCHA DETECTADO:`);
      if (captchaDetected.recaptcha) console.log(`   - reCAPTCHA: ✅`);
      if (captchaDetected.turnstile) console.log(`   - Cloudflare Turnstile: ✅`);
      if (captchaDetected.hcaptcha) console.log(`   - hCaptcha: ✅`);
    } else {
      console.log(`✅ Nenhum CAPTCHA detectado`);
    }
    console.log();

    // Verificar se formulário está presente
    console.log(`🔍 Verificando formulário...`);
    const formDetected = await page.evaluate(() => {
      const livreInput = document.querySelector('input[name="livre"]');
      const tribunalSelect = document.querySelector('select[name="tribunal"]');
      
      return {
        livreInput: livreInput !== null,
        tribunalSelect: tribunalSelect !== null,
        both: livreInput !== null && tribunalSelect !== null
      };
    });

    if (formDetected.both) {
      console.log(`✅ Formulário detectado:`);
      console.log(`   - Campo "livre": ✅`);
      console.log(`   - Select "tribunal": ✅`);
    } else {
      console.log(`⚠️ Formulário não detectado completamente:`);
      console.log(`   - Campo "livre": ${formDetected.livreInput ? '✅' : '❌'}`);
      console.log(`   - Select "tribunal": ${formDetected.tribunalSelect ? '✅' : '❌'}`);
    }
    console.log();

    // Capturar screenshot
    console.log(`📸 Capturando screenshot...`);
    const screenshotsDir = "screenshots";
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const screenshotPath = path.join(screenshotsDir, `test-stj-form-${timestamp}.png`);
    
    await page.screenshot({ 
      path: screenshotPath, 
      fullPage: true 
    });
    console.log(`✅ Screenshot salvo: ${screenshotPath}\n`);

    // Obter título da página
    const title = await page.title();
    console.log(`📋 Título da página: "${title}"\n`);

    // Fechar browser
    console.log(`🔒 Fechando browser...`);
    await browser.close();
    console.log(`✅ Browser fechado!\n`);

    console.log("═══════════════════════════════════════════════════════");
    console.log("✅ TESTE CONCLUÍDO COM SUCESSO!");
    console.log("═══════════════════════════════════════════════════════");
    console.log(`\n📊 RESUMO:`);
    console.log(`   CAPTCHA detectado: ${captchaDetected.any ? '⚠️ SIM' : '✅ NÃO'}`);
    console.log(`   Formulário detectado: ${formDetected.both ? '✅ SIM' : '❌ NÃO'}`);
    console.log(`   Screenshot: ${screenshotPath}`);
    console.log();

    process.exit(0);

  } catch (error) {
    console.error("\n═══════════════════════════════════════════════════════");
    console.error("❌ TESTE FALHOU!");
    console.error("═══════════════════════════════════════════════════════");
    console.error(`\n❌ Erro: ${error.message}\n`);
    
    if (error.stack) {
      console.error("Stack trace:");
      console.error(error.stack);
    }

    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error(`⚠️ Erro ao fechar browser: ${closeError.message}`);
      }
    }

    process.exit(1);
  }
}

testSTJFormSimple();

