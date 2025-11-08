/**
 * ═══════════════════════════════════════════════════════════════════════
 * TEST: Conexão com Browserless
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * OBJETIVO:
 * Validar se a conexão com o Browserless está funcionando corretamente.
 * 
 * COMO USAR:
 * node tests/utils/test-browserless-connection.js
 * 
 * RESULTADO ESPERADO:
 * - Conexão bem-sucedida
 * - Navegação para example.com
 * - Título da página exibido
 * - Exit code 0
 * 
 * DEPENDÊNCIAS:
 * - puppeteer-core
 * - dotenv
 * 
 * VARIÁVEIS DE AMBIENTE NECESSÁRIAS:
 * - BROWSERLESS_API_KEY
 * - BROWSERLESS_REGION (opcional, padrão: production-sfo)
 * ═══════════════════════════════════════════════════════════════════════
 */

import puppeteer from "puppeteer-core";
import dotenv from "dotenv";

// Carregar variáveis de ambiente
dotenv.config();

async function testBrowserlessConnection() {
  let browser;
  
  try {
    console.log("═══════════════════════════════════════════════════════");
    console.log("🧪 TESTE: Conexão com Browserless");
    console.log("═══════════════════════════════════════════════════════\n");

    // Validar variáveis de ambiente
    const apiKey = process.env.BROWSERLESS_API_KEY;
    const region = process.env.BROWSERLESS_REGION || "production-sfo";

    if (!apiKey) {
      throw new Error("❌ BROWSERLESS_API_KEY não configurada no .env");
    }

    console.log(`📋 Configurações:`);
    console.log(`   API Key: ${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`);
    console.log(`   Região: ${region}\n`);

    // Construir URL de conexão
    const connectionURL = `wss://${region}.browserless.io?token=${apiKey}`;

    console.log(`🌐 Conectando ao Browserless...`);
    console.log(`   URL: wss://${region}.browserless.io\n`);

    // Conectar ao Browserless
    browser = await puppeteer.connect({
      browserWSEndpoint: connectionURL,
      defaultViewport: null,
      ignoreHTTPSErrors: true,
    });

    console.log(`✅ Conectado com sucesso!\n`);

    // Criar nova página
    console.log(`📄 Criando nova página...`);
    const page = await browser.newPage();
    console.log(`✅ Página criada!\n`);

    // Navegar para example.com
    console.log(`🌐 Navegando para https://example.com...`);
    await page.goto("https://example.com", { waitUntil: "networkidle2" });
    console.log(`✅ Navegação concluída!\n`);

    // Obter título da página
    const title = await page.title();
    console.log(`📋 Título da página: "${title}"\n`);

    // Obter URL atual
    const url = page.url();
    console.log(`🔗 URL atual: ${url}\n`);

    // Fechar browser
    console.log(`🔒 Fechando browser...`);
    await browser.close();
    console.log(`✅ Browser fechado!\n`);

    console.log("═══════════════════════════════════════════════════════");
    console.log("✅ TESTE CONCLUÍDO COM SUCESSO!");
    console.log("═══════════════════════════════════════════════════════");

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

    // Tentar fechar browser se ainda estiver aberto
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

// Executar teste
testBrowserlessConnection();

