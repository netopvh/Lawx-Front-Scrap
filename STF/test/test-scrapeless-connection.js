/**
 * Script para testar conexão Scrapeless com diferentes configurações
 */

import puppeteer from "puppeteer-core";
import dotenv from "dotenv";

dotenv.config();

async function testConnection(config) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`🧪 TESTE: ${config.name}`);
  console.log(`${"=".repeat(60)}`);
  
  let browser = null;
  
  try {
    // Construir query params
    const queryParams = {
      token: process.env.SCRAPELESS_TOKEN,
      sessionRecording: false,
      sessionTTL: 300,
      sessionName: `Test - ${config.name}`,
    };
    
    // Adicionar configurações específicas
    if (config.proxyCountry) {
      queryParams.proxyCountry = config.proxyCountry;
      console.log(`📍 Proxy Country: ${config.proxyCountry}`);
    } else {
      console.log(`📍 Proxy Country: AUTO`);
    }
    
    const query = new URLSearchParams(queryParams);
    const connectionURL = `wss://browser.scrapeless.com/api/v2/browser?${query.toString()}`;
    
    console.log(`🔗 Conectando ao Scrapeless...`);
    const startConnect = Date.now();
    
    browser = await puppeteer.connect({
      browserWSEndpoint: connectionURL,
      defaultViewport: null,
      ignoreHTTPSErrors: true,
    });
    
    const connectTime = Date.now() - startConnect;
    console.log(`✅ Conectado em ${connectTime}ms`);
    
    const page = await browser.newPage();
    console.log(`✅ Página criada`);
    
    // Testar navegação
    console.log(`🌐 Navegando para: ${config.url}`);
    const startNav = Date.now();
    
    try {
      await page.goto(config.url, { 
        waitUntil: "domcontentloaded", 
        timeout: 30000 
      });
      
      const navTime = Date.now() - startNav;
      console.log(`✅ Navegação bem-sucedida em ${navTime}ms`);
      
      // Verificar conteúdo
      const title = await page.title();
      console.log(`📄 Título da página: ${title}`);
      
      const hasContent = await page.evaluate(() => {
        return {
          bodyLength: document.body.innerHTML.length,
          hasAwsWaf: document.body.innerHTML.includes('AwsWafIntegration'),
          hasChallenge: document.body.innerHTML.includes('challenge-container'),
        };
      });
      
      console.log(`📊 Análise do conteúdo:`);
      console.log(`   - Tamanho do HTML: ${hasContent.bodyLength} bytes`);
      console.log(`   - AWS WAF detectado: ${hasContent.hasAwsWaf ? '⚠️ SIM' : '✅ NÃO'}`);
      console.log(`   - Challenge detectado: ${hasContent.hasChallenge ? '⚠️ SIM' : '✅ NÃO'}`);
      
      console.log(`\n✅ TESTE PASSOU!`);
      return true;
      
    } catch (navError) {
      const navTime = Date.now() - startNav;
      console.log(`❌ Erro na navegação após ${navTime}ms:`);
      console.log(`   ${navError.message}`);
      console.log(`\n❌ TESTE FALHOU!`);
      return false;
    }
    
  } catch (error) {
    console.log(`❌ Erro na conexão:`);
    console.log(`   ${error.message}`);
    console.log(`\n❌ TESTE FALHOU!`);
    return false;
    
  } finally {
    if (browser) {
      await browser.close();
      console.log(`🔒 Browser fechado`);
    }
  }
}

async function runAllTests() {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`🚀 INICIANDO TESTES DE CONEXÃO SCRAPELESS`);
  console.log(`${"=".repeat(60)}`);
  
  const tests = [
    {
      name: "STF com Proxy BR",
      url: "https://jurisprudencia.stf.jus.br/pages/search",
      proxyCountry: "BR",
    },
    {
      name: "STF com Proxy AUTO",
      url: "https://jurisprudencia.stf.jus.br/pages/search",
      proxyCountry: null,
    },
    {
      name: "STF com Proxy US",
      url: "https://jurisprudencia.stf.jus.br/pages/search",
      proxyCountry: "US",
    },
    {
      name: "Google.com com Proxy BR (controle)",
      url: "https://www.google.com",
      proxyCountry: "BR",
    },
    {
      name: "TJSP com Proxy BR (controle)",
      url: "https://esaj.tjsp.jus.br/cjsg/resultadoCompleta.do",
      proxyCountry: "BR",
    },
  ];
  
  const results = [];
  
  for (const test of tests) {
    const passed = await testConnection(test);
    results.push({ name: test.name, passed });
    
    // Aguardar entre testes
    console.log(`\n⏳ Aguardando 5 segundos antes do próximo teste...\n`);
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  // Resumo
  console.log(`\n${"=".repeat(60)}`);
  console.log(`📊 RESUMO DOS TESTES`);
  console.log(`${"=".repeat(60)}`);
  
  results.forEach(result => {
    const status = result.passed ? '✅ PASSOU' : '❌ FALHOU';
    console.log(`${status} - ${result.name}`);
  });
  
  const passedCount = results.filter(r => r.passed).length;
  const totalCount = results.length;
  
  console.log(`\n📈 Total: ${passedCount}/${totalCount} testes passaram`);
  console.log(`${"=".repeat(60)}\n`);
}

runAllTests().catch(console.error);

