/**
 * Teste de parâmetros do BrowserCloud.io
 * Descobre quais parâmetros funcionam com a conta atual
 */

import puppeteer from "puppeteer-core";
import dotenv from "dotenv";

dotenv.config();

const API_TOKEN = process.env.BROWSERCLOUD_TOKEN;

console.log("🔍 Token:", API_TOKEN ? `${API_TOKEN.substring(0, 10)}...` : "❌ NÃO ENCONTRADO");

if (!API_TOKEN) {
  console.log("\n❌ ERRO: Token não encontrado!");
  process.exit(1);
}

async function testParams(name, params) {
  console.log(`\n${"=".repeat(70)}`);
  console.log(`📝 TESTE: ${name}`);
  console.log("=".repeat(70));
  
  try {
    const query = new URLSearchParams(params).toString();
    const connectionURL = `wss://chrome-v2.browsercloud.io?${query}`;
    console.log("🔗 Parâmetros:", Object.keys(params).filter(k => k !== 'token').join(', '));
    
    console.log("⏳ Conectando...");
    const browser = await puppeteer.connect({
      browserWSEndpoint: connectionURL,
      defaultViewport: null,
    });
    
    console.log("✅ SUCESSO!");
    await browser.close();
    return true;
  } catch (error) {
    console.log(`❌ FALHOU: ${error.message}`);
    return false;
  }
}

(async () => {
  console.log("\n🚀 Testando parâmetros do BrowserCloud.io...\n");
  
  const results = {};
  
  // Teste 1: Apenas token
  results.basic = await testParams("Apenas token", {
    token: API_TOKEN,
  });
  
  // Teste 2: Com timeout
  results.timeout = await testParams("Com timeout", {
    token: API_TOKEN,
    timeout: 60000,
  });
  
  // Teste 3: Com solveCaptcha (sem valor)
  results.solveCaptcha_flag = await testParams("solveCaptcha (flag sem valor)", {
    token: API_TOKEN,
    solveCaptcha: "",
  });
  
  // Teste 4: Com solveCaptcha=true
  results.solveCaptcha_true = await testParams("solveCaptcha=true", {
    token: API_TOKEN,
    solveCaptcha: "true",
  });
  
  // Teste 5: Com stealthMode (sem valor)
  results.stealthMode_flag = await testParams("stealthMode (flag sem valor)", {
    token: API_TOKEN,
    stealthMode: "",
  });
  
  // Teste 6: Com stealthMode=true
  results.stealthMode_true = await testParams("stealthMode=true", {
    token: API_TOKEN,
    stealthMode: "true",
  });
  
  // Teste 7: Com proxy datacenter
  results.proxy_datacenter = await testParams("proxy=datacenter", {
    token: API_TOKEN,
    proxy: "datacenter",
  });
  
  // Teste 8: Com proxy datacenter + country
  results.proxy_country = await testParams("proxy=datacenter + proxyCountry=BR", {
    token: API_TOKEN,
    proxy: "datacenter",
    proxyCountry: "BR",
  });
  
  // Teste 9: Com proxySticky (sem valor)
  results.proxySticky_flag = await testParams("proxy + proxySticky (flag)", {
    token: API_TOKEN,
    proxy: "datacenter",
    proxyCountry: "BR",
    proxySticky: "",
  });
  
  // Teste 10: Com blockCookieBanners (sem valor)
  results.blockCookieBanners_flag = await testParams("blockCookieBanners (flag)", {
    token: API_TOKEN,
    blockCookieBanners: "",
  });
  
  // Teste 11: Com context
  results.context = await testParams("context=stj-scraper", {
    token: API_TOKEN,
    context: "stj-scraper",
  });
  
  // Teste 12: Com blockRes
  results.blockRes = await testParams("blockRes=image,media,font", {
    token: API_TOKEN,
    blockRes: "image,media,font",
  });
  
  // Teste 13: Configuração completa SEM solveCaptcha e stealthMode
  results.full_no_captcha = await testParams("Completo (SEM solveCaptcha/stealthMode)", {
    token: API_TOKEN,
    timeout: 90000,
    proxy: "datacenter",
    proxyCountry: "BR",
    proxySticky: "",
    blockCookieBanners: "",
    context: "stj-scraper",
    blockRes: "image,media,font",
  });
  
  console.log("\n" + "=".repeat(70));
  console.log("📊 RESUMO DOS TESTES");
  console.log("=".repeat(70));
  
  for (const [key, value] of Object.entries(results)) {
    console.log(`${value ? "✅" : "❌"} ${key}`);
  }
  
  console.log("\n" + "=".repeat(70));
  console.log("💡 RECOMENDAÇÕES:");
  console.log("=".repeat(70));
  
  if (results.solveCaptcha_flag || results.solveCaptcha_true) {
    console.log("✅ solveCaptcha está disponível!");
  } else {
    console.log("❌ solveCaptcha NÃO está disponível - pode ser recurso pago");
  }
  
  if (results.stealthMode_flag || results.stealthMode_true) {
    console.log("✅ stealthMode está disponível!");
  } else {
    console.log("❌ stealthMode NÃO está disponível - pode ser recurso pago");
  }
  
  if (results.full_no_captcha) {
    console.log("✅ Configuração completa (sem CAPTCHA solver) funciona!");
    console.log("\n📝 Use esta configuração no .env:");
    console.log("   BROWSERCLOUD_SOLVE_CAPTCHA=false");
    console.log("   BROWSERCLOUD_STEALTH_MODE=false");
  }
  
  console.log("\n🔗 Para mais informações: https://browsercloud.io/docs/launch-options");
})();

