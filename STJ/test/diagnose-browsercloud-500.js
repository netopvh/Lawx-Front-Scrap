/**
 * Script de Diagnóstico para Erro 500 do BrowserCloud.io
 * 
 * Testa diferentes configurações para identificar a causa do erro 500
 */

import puppeteer from "puppeteer-core";
import dotenv from "dotenv";

// Carregar variáveis de ambiente
dotenv.config();

const API_TOKEN = process.env.BROWSERCLOUD_TOKEN;

if (!API_TOKEN) {
  console.error("❌ BROWSERCLOUD_TOKEN não encontrado no .env");
  process.exit(1);
}

console.log("🔍 DIAGNÓSTICO DE ERRO 500 - BrowserCloud.io");
console.log("=".repeat(70));
console.log(`📌 Token: ${API_TOKEN.substring(0, 8)}...`);
console.log("=".repeat(70));

/**
 * Testa uma configuração específica
 */
async function testConfig(name, buildURL) {
  console.log(`\n${"─".repeat(70)}`);
  console.log(`📝 TESTE: ${name}`);
  console.log("─".repeat(70));
  
  try {
    const connectionURL = buildURL(API_TOKEN);
    const debugURL = connectionURL.replace(/token=[^&]+/, 'token=***');
    console.log(`🔗 URL: ${debugURL}`);
    
    console.log("⏳ Conectando...");
    const startTime = Date.now();
    
    const browser = await puppeteer.connect({
      browserWSEndpoint: connectionURL,
      defaultViewport: null,
      ignoreHTTPSErrors: true,
    });
    
    const duration = Date.now() - startTime;
    console.log(`✅ SUCESSO! (${duration}ms)`);
    
    // Testar navegação básica
    const page = await browser.newPage();
    await page.goto('https://example.com', { waitUntil: 'domcontentloaded', timeout: 10000 });
    console.log(`✅ Navegação OK`);
    
    await browser.close();
    return { success: true, duration };
  } catch (error) {
    console.log(`❌ FALHOU: ${error.message}`);
    
    // Detalhes adicionais do erro
    if (error.message.includes('500')) {
      console.log(`   ⚠️ Erro 500 = Problema no servidor BrowserCloud`);
      console.log(`   💡 Possíveis causas:`);
      console.log(`      - Token inválido ou expirado`);
      console.log(`      - Parâmetros incompatíveis`);
      console.log(`      - Limite de uso excedido`);
      console.log(`      - Problema temporário no serviço`);
    }
    
    return { success: false, error: error.message };
  }
}

/**
 * Executa todos os testes
 */
async function runDiagnostics() {
  const results = {};
  
  // TESTE 1: Configuração mínima (apenas token)
  results.minimal = await testConfig(
    "1. Configuração Mínima (apenas token)",
    (token) => `wss://chrome-v2.browsercloud.io?token=${token}`
  );
  
  // TESTE 2: Com timeout
  results.withTimeout = await testConfig(
    "2. Com Timeout",
    (token) => `wss://chrome-v2.browsercloud.io?token=${token}&timeout=60000`
  );
  
  // TESTE 3: Com solveCaptcha (flag)
  results.withCaptcha = await testConfig(
    "3. Com solveCaptcha (flag)",
    (token) => `wss://chrome-v2.browsercloud.io?token=${token}&solveCaptcha`
  );
  
  // TESTE 4: Com stealthMode (flag)
  results.withStealth = await testConfig(
    "4. Com stealthMode (flag)",
    (token) => `wss://chrome-v2.browsercloud.io?token=${token}&stealthMode`
  );
  
  // TESTE 5: Com proxy datacenter
  results.withProxyDatacenter = await testConfig(
    "5. Com Proxy Datacenter",
    (token) => `wss://chrome-v2.browsercloud.io?token=${token}&proxy=datacenter`
  );
  
  // TESTE 6: Com proxy datacenter + proxyCountry
  results.withProxyCountry = await testConfig(
    "6. Com Proxy Datacenter + Country BR",
    (token) => `wss://chrome-v2.browsercloud.io?token=${token}&proxy=datacenter&proxyCountry=BR`
  );
  
  // TESTE 7: Sem proxy (proxy=false)
  results.withoutProxy = await testConfig(
    "7. Sem Proxy (proxy=false)",
    (token) => `wss://chrome-v2.browsercloud.io?token=${token}&proxy=false`
  );
  
  // TESTE 8: Configuração básica recomendada
  results.basicRecommended = await testConfig(
    "8. Configuração Básica Recomendada",
    (token) => `wss://chrome-v2.browsercloud.io?token=${token}&timeout=60000&solveCaptcha&stealthMode`
  );
  
  // TESTE 9: Configuração completa SEM proxy
  results.fullNoProxy = await testConfig(
    "9. Configuração Completa SEM Proxy",
    (token) => `wss://chrome-v2.browsercloud.io?token=${token}&timeout=90000&solveCaptcha&stealthMode&blockCookieBanners&context=stj-scraper&blockRes=${encodeURIComponent('image,media,font')}`
  );
  
  // TESTE 10: Configuração completa COM proxy
  results.fullWithProxy = await testConfig(
    "10. Configuração Completa COM Proxy",
    (token) => `wss://chrome-v2.browsercloud.io?token=${token}&timeout=90000&solveCaptcha&stealthMode&proxy=datacenter&proxyCountry=BR&proxySticky&blockCookieBanners&context=stj-scraper&blockRes=${encodeURIComponent('image,media,font')}`
  );
  
  // TESTE 11: Configuração atual do .env
  results.currentEnv = await testConfig(
    "11. Configuração Atual do .env",
    (token) => {
      let url = `wss://chrome-v2.browsercloud.io?token=${token}`;
      url += `&timeout=${process.env.BROWSERCLOUD_TIMEOUT || 240000}`;
      if (process.env.BROWSERCLOUD_SOLVE_CAPTCHA === "true") url += `&solveCaptcha`;
      if (process.env.BROWSERCLOUD_STEALTH_MODE === "true") url += `&stealthMode`;
      if (process.env.BROWSERCLOUD_PROXY && process.env.BROWSERCLOUD_PROXY !== "false") {
        url += `&proxy=${process.env.BROWSERCLOUD_PROXY}`;
      }
      if (process.env.BROWSERCLOUD_PROXY_COUNTRY) url += `&proxyCountry=${process.env.BROWSERCLOUD_PROXY_COUNTRY}`;
      if (process.env.BROWSERCLOUD_PROXY_STICKY === "true") url += `&proxySticky`;
      if (process.env.BROWSERCLOUD_BLOCK_COOKIE_BANNERS === "true") url += `&blockCookieBanners`;
      if (process.env.BROWSERCLOUD_CONTEXT) url += `&context=${encodeURIComponent(process.env.BROWSERCLOUD_CONTEXT)}`;
      if (process.env.BROWSERCLOUD_BLOCK_RES) url += `&blockRes=${encodeURIComponent(process.env.BROWSERCLOUD_BLOCK_RES)}`;
      return url;
    }
  );
  
  // RESUMO
  console.log("\n" + "=".repeat(70));
  console.log("📊 RESUMO DOS TESTES");
  console.log("=".repeat(70));
  
  let successCount = 0;
  let failCount = 0;
  
  for (const [key, result] of Object.entries(results)) {
    const status = result.success ? "✅" : "❌";
    const details = result.success 
      ? `(${result.duration}ms)` 
      : `(${result.error})`;
    
    console.log(`${status} ${key.padEnd(25)} ${details}`);
    
    if (result.success) successCount++;
    else failCount++;
  }
  
  console.log("=".repeat(70));
  console.log(`✅ Sucessos: ${successCount}`);
  console.log(`❌ Falhas: ${failCount}`);
  console.log("=".repeat(70));
  
  // RECOMENDAÇÕES
  console.log("\n💡 RECOMENDAÇÕES:");
  console.log("─".repeat(70));
  
  if (results.minimal.success) {
    console.log("✅ Token está válido (teste mínimo passou)");
    
    if (!results.currentEnv.success) {
      console.log("⚠️ Configuração atual do .env está falhando");
      console.log("   Problema está nos parâmetros adicionais");
      
      // Identificar qual parâmetro causa problema
      if (!results.withCaptcha.success) {
        console.log("   ❌ Problema: solveCaptcha");
      }
      if (!results.withStealth.success) {
        console.log("   ❌ Problema: stealthMode");
      }
      if (!results.withProxyDatacenter.success) {
        console.log("   ❌ Problema: proxy=datacenter");
      }
      if (!results.withProxyCountry.success) {
        console.log("   ❌ Problema: proxyCountry=BR");
      }
      
      // Sugerir configuração que funciona
      const workingConfigs = Object.entries(results)
        .filter(([_, r]) => r.success)
        .map(([k, _]) => k);
      
      if (workingConfigs.length > 0) {
        console.log(`\n✅ Configurações que funcionam:`);
        workingConfigs.forEach(config => console.log(`   - ${config}`));
      }
    } else {
      console.log("✅ Configuração atual do .env está funcionando!");
    }
  } else {
    console.log("❌ Token parece inválido ou expirado");
    console.log("   1. Verifique se o token está correto no .env");
    console.log("   2. Acesse https://browsercloud.io/ e verifique:");
    console.log("      - Se a conta está ativa");
    console.log("      - Se há créditos disponíveis");
    console.log("      - Se o token não expirou");
    console.log("   3. Gere um novo token se necessário");
  }
  
  console.log("─".repeat(70));
}

// Executar diagnóstico
runDiagnostics().catch(error => {
  console.error("\n❌ Erro fatal no diagnóstico:", error);
  process.exit(1);
});

