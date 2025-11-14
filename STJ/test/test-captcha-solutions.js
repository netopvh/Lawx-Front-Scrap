/**
 * Script para testar diferentes soluções para o CAPTCHA do STJ
 * 
 * Testa várias configurações de proxy e timeout para encontrar
 * a melhor combinação que resolve o Cloudflare Turnstile
 */

import puppeteer from "puppeteer-core";
import dotenv from "dotenv";

// Carregar variáveis de ambiente
dotenv.config();

const API_TOKEN = process.env.BROWSERCLOUD_TOKEN;
const STJ_URL = "https://scon.stj.jus.br/SCON/jurisprudencia/toc.jsp";

if (!API_TOKEN) {
  console.error("❌ BROWSERCLOUD_TOKEN não encontrado no .env");
  process.exit(1);
}

console.log("🧪 TESTE DE SOLUÇÕES PARA CAPTCHA DO STJ");
console.log("=".repeat(70));
console.log(`📌 Token: ${API_TOKEN.substring(0, 8)}...`);
console.log(`🌐 URL: ${STJ_URL}`);
console.log("=".repeat(70));

/**
 * Aguarda resolução do CAPTCHA
 */
async function waitForCaptchaResolution(page, timeoutMs = 300000) {
  console.log(`⏳ Aguardando resolução do CAPTCHA (timeout: ${timeoutMs / 1000}s)...`);
  
  const startTime = Date.now();
  
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timeout de ${timeoutMs / 1000}s esperando CAPTCHA`));
    }, timeoutMs);
    
    const checkInterval = setInterval(async () => {
      try {
        const title = await page.title();
        const url = page.url();
        
        // Verificar se saiu da página de CAPTCHA
        if (!title.includes("Just a moment") && !title.includes("Verificação")) {
          clearTimeout(timeout);
          clearInterval(checkInterval);
          const duration = ((Date.now() - startTime) / 1000).toFixed(2);
          console.log(`✅ CAPTCHA resolvido em ${duration}s!`);
          resolve(true);
        }
      } catch (error) {
        // Ignorar erros durante verificação
      }
    }, 1000); // Verificar a cada 1 segundo
  });
}

/**
 * Testa uma configuração específica
 */
async function testConfig(name, config) {
  console.log(`\n${"─".repeat(70)}`);
  console.log(`📝 TESTE: ${name}`);
  console.log("─".repeat(70));
  
  let browser = null;
  let page = null;
  
  try {
    // Construir URL de conexão
    let connectionURL = `wss://chrome-v2.browsercloud.io?token=${API_TOKEN}`;
    connectionURL += `&timeout=${config.timeout || 240000}`;
    connectionURL += `&solveCaptcha`;
    connectionURL += `&stealthMode`;
    
    if (config.proxy) {
      connectionURL += `&proxy=${config.proxy}`;
      console.log(`🌐 Proxy: ${config.proxy}`);
    }
    
    if (config.proxyCountry) {
      connectionURL += `&proxyCountry=${config.proxyCountry}`;
      console.log(`🌍 Proxy Country: ${config.proxyCountry}`);
    }
    
    if (config.proxySticky) {
      connectionURL += `&proxySticky`;
      console.log(`📌 Proxy Sticky: ✅`);
    }
    
    connectionURL += `&blockCookieBanners`;
    connectionURL += `&context=stj-test-${Date.now()}`;
    connectionURL += `&blockRes=${encodeURIComponent('image,media,font')}`;
    
    console.log(`⏱️ Timeout: ${config.timeout / 1000}s`);
    console.log(`⏳ CAPTCHA Timeout: ${config.captchaTimeout / 1000}s`);
    
    // Conectar
    console.log("🔌 Conectando ao BrowserCloud...");
    const startConnect = Date.now();
    
    browser = await puppeteer.connect({
      browserWSEndpoint: connectionURL,
      defaultViewport: null,
      ignoreHTTPSErrors: true,
    });
    
    const connectDuration = Date.now() - startConnect;
    console.log(`✅ Conectado em ${connectDuration}ms`);
    
    // Criar página
    page = await browser.newPage();
    
    // Navegar para STJ
    console.log(`🌐 Navegando para ${STJ_URL}...`);
    const startNav = Date.now();
    
    await page.goto(STJ_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    const navDuration = Date.now() - startNav;
    console.log(`✅ Página carregada em ${navDuration}ms`);
    
    // Verificar título
    const title = await page.title();
    console.log(`📄 Título: ${title}`);
    
    // Se está na página de CAPTCHA, aguardar resolução
    if (title.includes("Just a moment") || title.includes("Verificação")) {
      console.log(`🔐 CAPTCHA detectado - aguardando resolução automática...`);
      
      try {
        await waitForCaptchaResolution(page, config.captchaTimeout);
        
        // Verificar título final
        const finalTitle = await page.title();
        console.log(`📄 Título final: ${finalTitle}`);
        
        // Tirar screenshot de sucesso
        const screenshotPath = `screenshots/captcha-success_${Date.now()}.png`;
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`📸 Screenshot salvo: ${screenshotPath}`);
        
        await browser.close();
        return { success: true, config };
        
      } catch (error) {
        console.log(`❌ CAPTCHA não resolvido: ${error.message}`);
        
        // Tirar screenshot de falha
        const screenshotPath = `screenshots/captcha-fail_${Date.now()}.png`;
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`📸 Screenshot salvo: ${screenshotPath}`);
        
        await browser.close();
        return { success: false, error: error.message, config };
      }
    } else {
      console.log(`✅ Sem CAPTCHA - acesso direto!`);
      
      // Tirar screenshot
      const screenshotPath = `screenshots/no-captcha_${Date.now()}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`📸 Screenshot salvo: ${screenshotPath}`);
      
      await browser.close();
      return { success: true, noCaptcha: true, config };
    }
    
  } catch (error) {
    console.log(`❌ FALHOU: ${error.message}`);
    
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        // Ignorar erro ao fechar
      }
    }
    
    return { success: false, error: error.message, config };
  }
}

/**
 * Executa todos os testes
 */
async function runTests() {
  const results = [];
  
  // TESTE 1: Sem proxy, timeout longo
  results.push(await testConfig("1. Sem Proxy + Timeout 5min", {
    timeout: 300000,
    captchaTimeout: 300000,
  }));
  
  // TESTE 2: Proxy datacenter BR
  results.push(await testConfig("2. Proxy Datacenter BR + Timeout 5min", {
    timeout: 300000,
    captchaTimeout: 300000,
    proxy: "datacenter",
    proxyCountry: "BR",
  }));
  
  // TESTE 3: Proxy datacenter BR + Sticky
  results.push(await testConfig("3. Proxy Datacenter BR + Sticky + Timeout 5min", {
    timeout: 300000,
    captchaTimeout: 300000,
    proxy: "datacenter",
    proxyCountry: "BR",
    proxySticky: true,
  }));
  
  // TESTE 4: Proxy residential BR (mais caro, mas mais efetivo)
  results.push(await testConfig("4. Proxy Residential BR + Timeout 5min", {
    timeout: 300000,
    captchaTimeout: 300000,
    proxy: "residential",
    proxyCountry: "BR",
  }));
  
  // TESTE 5: Proxy residential BR + Sticky
  results.push(await testConfig("5. Proxy Residential BR + Sticky + Timeout 5min", {
    timeout: 300000,
    captchaTimeout: 300000,
    proxy: "residential",
    proxyCountry: "BR",
    proxySticky: true,
  }));
  
  // RESUMO
  console.log("\n" + "=".repeat(70));
  console.log("📊 RESUMO DOS TESTES");
  console.log("=".repeat(70));
  
  let successCount = 0;
  let failCount = 0;
  
  results.forEach((result, index) => {
    const status = result.success ? "✅" : "❌";
    const details = result.success 
      ? (result.noCaptcha ? "(Sem CAPTCHA)" : "(CAPTCHA resolvido)")
      : `(${result.error})`;
    
    console.log(`${status} Teste ${index + 1}: ${details}`);
    
    if (result.success) successCount++;
    else failCount++;
  });
  
  console.log("=".repeat(70));
  console.log(`✅ Sucessos: ${successCount}`);
  console.log(`❌ Falhas: ${failCount}`);
  console.log("=".repeat(70));
  
  // RECOMENDAÇÃO
  const successfulConfigs = results.filter(r => r.success);
  
  if (successfulConfigs.length > 0) {
    console.log("\n💡 CONFIGURAÇÕES QUE FUNCIONARAM:");
    console.log("─".repeat(70));
    
    successfulConfigs.forEach((result, index) => {
      console.log(`\n✅ Configuração ${index + 1}:`);
      console.log(`   Proxy: ${result.config.proxy || 'Nenhum'}`);
      console.log(`   Proxy Country: ${result.config.proxyCountry || 'N/A'}`);
      console.log(`   Proxy Sticky: ${result.config.proxySticky ? 'Sim' : 'Não'}`);
      console.log(`   Timeout: ${result.config.timeout / 1000}s`);
      console.log(`   CAPTCHA Timeout: ${result.config.captchaTimeout / 1000}s`);
    });
    
    console.log("\n📝 RECOMENDAÇÃO PARA .env:");
    console.log("─".repeat(70));
    const bestConfig = successfulConfigs[0].config;
    
    if (bestConfig.proxy) {
      console.log(`BROWSERCLOUD_PROXY=${bestConfig.proxy}`);
    } else {
      console.log(`BROWSERCLOUD_PROXY=false`);
    }
    
    if (bestConfig.proxyCountry) {
      console.log(`BROWSERCLOUD_PROXY_COUNTRY=${bestConfig.proxyCountry}`);
    }
    
    if (bestConfig.proxySticky) {
      console.log(`BROWSERCLOUD_PROXY_STICKY=true`);
    }
    
    console.log(`BROWSERCLOUD_TIMEOUT=${bestConfig.timeout}`);
    console.log("\n# No código index.js, ajustar:");
    console.log(`const CAPTCHA_TIMEOUT = ${bestConfig.captchaTimeout}; // ${bestConfig.captchaTimeout / 1000}s`);
    
  } else {
    console.log("\n❌ NENHUMA CONFIGURAÇÃO FUNCIONOU");
    console.log("─".repeat(70));
    console.log("💡 Possíveis ações:");
    console.log("   1. Verificar créditos no BrowserCloud.io");
    console.log("   2. Verificar se solveCaptcha está habilitado na conta");
    console.log("   3. Contatar suporte: support@browsercloud.io");
    console.log("   4. Considerar usar outro serviço de CAPTCHA solving");
  }
  
  console.log("─".repeat(70));
}

// Executar testes
runTests().catch(error => {
  console.error("\n❌ Erro fatal nos testes:", error);
  process.exit(1);
});

