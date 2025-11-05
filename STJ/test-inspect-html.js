/**
 * Script de Teste - Inspeção Manual da Estrutura HTML do STJ/TFR
 * 
 * OBJETIVO:
 * - Abrir navegador local (headless: false)
 * - Navegar para página de resultados do STJ ou TFR
 * - Permitir inspeção manual da estrutura HTML
 * - Aguardar resolução manual do Cloudflare Turnstile
 * - Salvar HTML dos resultados para análise
 * 
 * USO:
 * node test-inspect-html.js [stj|tfr]
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Configuração
const TRIBUNAL = process.argv[2] || 'stj'; // 'stj' ou 'tfr'
const HEADLESS = false; // Navegador visível para inspeção manual
const TIMEOUT = 300000; // 5 minutos para inspeção manual

// URLs
const URLS = {
  stj: {
    base: 'https://scon.stj.jus.br/SCON/',
    nome: 'STJ - Superior Tribunal de Justiça'
  },
  tfr: {
    base: 'https://scon.stj.jus.br/SCON/juritfr/',
    nome: 'TFR - Tribunal Federal de Recursos'
  }
};

const config = URLS[TRIBUNAL.toLowerCase()];

if (!config) {
  console.error('❌ Tribunal inválido. Use: node test-inspect-html.js [stj|tfr]');
  process.exit(1);
}

console.log(`\n${'='.repeat(80)}`);
console.log(`🔍 INSPEÇÃO MANUAL DA ESTRUTURA HTML - ${config.nome}`);
console.log(`${'='.repeat(80)}\n`);

(async () => {
  let browser;
  
  try {
    console.log('🚀 Iniciando navegador local...');
    browser = await puppeteer.launch({
      headless: HEADLESS,
      defaultViewport: { width: 1920, height: 1080 },
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security'
      ]
    });

    const page = await browser.newPage();
    
    // Configurar timeout
    page.setDefaultTimeout(TIMEOUT);
    page.setDefaultNavigationTimeout(TIMEOUT);

    console.log(`\n📍 Navegando para: ${config.base}`);
    await page.goto(config.base, { waitUntil: 'networkidle2' });

    console.log('\n' + '='.repeat(80));
    console.log('⏸️  NAVEGADOR ABERTO PARA INSPEÇÃO MANUAL');
    console.log('='.repeat(80));
    console.log('\n📋 INSTRUÇÕES:');
    console.log('   1. Resolva o Cloudflare Turnstile se aparecer');
    console.log('   2. Faça uma pesquisa de teste (ex: "Advogados")');
    console.log('   3. Aguarde os resultados carregarem');
    console.log('   4. Abra o DevTools (F12)');
    console.log('   5. Inspecione a estrutura HTML dos resultados');
    console.log('   6. Identifique os seletores CSS para cada campo');
    console.log('\n📝 CAMPOS A IDENTIFICAR:');
    
    if (TRIBUNAL === 'stj') {
      console.log('   - Container de cada resultado');
      console.log('   - numero_processo');
      console.log('   - classe');
      console.log('   - relator');
      console.log('   - orgao_julgador');
      console.log('   - data_julgamento');
      console.log('   - data_publicacao');
      console.log('   - ementa');
      console.log('   - link_detalhes');
    } else {
      console.log('   - Container de cada resultado');
      console.log('   - numero_acordao');
      console.log('   - classe');
      console.log('   - relator');
      console.log('   - data_julgamento');
      console.log('   - data_publicacao');
      console.log('   - ementa');
      console.log('   - link_detalhes');
    }

    console.log('\n⏱️  Aguardando inspeção manual...');
    console.log('   (O script aguardará até 5 minutos)');
    console.log('   (Pressione Ctrl+C para encerrar antes)\n');

    // Aguardar manualmente
    await new Promise(resolve => {
      console.log('💡 Quando terminar a inspeção, pressione Ctrl+C\n');
      
      // Aguardar 5 minutos ou até Ctrl+C
      setTimeout(() => {
        console.log('\n⏰ Tempo de inspeção esgotado (5 minutos)');
        resolve();
      }, TIMEOUT);
    });

  } catch (error) {
    console.error('\n❌ Erro durante inspeção:', error.message);
  } finally {
    if (browser) {
      console.log('\n🔒 Fechando navegador...');
      await browser.close();
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ INSPEÇÃO CONCLUÍDA');
    console.log('='.repeat(80));
    console.log('\n📝 PRÓXIMOS PASSOS:');
    console.log('   1. Anote os seletores CSS identificados');
    console.log('   2. Atualize o arquivo: STJ/config/fields.json');
    console.log('   3. Execute o scraper de teste\n');
  }
})();

