/**
 * Script Simples - Inspeção Manual dos Resultados do STJ
 * 
 * Abre o Edge, você faz a pesquisa, e depois me informa os seletores CSS
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import readline from 'readline';

const TRIBUNAL = process.argv[2] || 'stj';

const URLS = {
  stj: 'https://scon.stj.jus.br/SCON/',
  tfr: 'https://scon.stj.jus.br/SCON/juritfr/'
};

function waitForEnter(message) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    rl.question(message, () => {
      rl.close();
      resolve();
    });
  });
}

console.log('\n' + '='.repeat(80));
console.log(`🔍 INSPEÇÃO MANUAL - ${TRIBUNAL.toUpperCase()}`);
console.log('='.repeat(80) + '\n');

(async () => {
  let browser;
  
  try {
    // Encontrar Edge
    const edgePaths = [
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
    ];
    
    let edgePath = null;
    for (const p of edgePaths) {
      if (fs.existsSync(p)) {
        edgePath = p;
        break;
      }
    }

    console.log('🚀 Abrindo Microsoft Edge em modo anônimo...\n');
    
    browser = await puppeteer.launch({
      headless: false,
      executablePath: edgePath,
      defaultViewport: null,
      args: [
        '--inprivate',
        '--start-maximized',
        '--disable-blink-features=AutomationControlled'
      ],
      ignoreDefaultArgs: ['--enable-automation']
    });

    const pages = await browser.pages();
    const page = pages[0] || await browser.newPage();

    console.log(`📍 Navegando para: ${URLS[TRIBUNAL]}\n`);
    await page.goto(URLS[TRIBUNAL], { waitUntil: 'networkidle2' });

    console.log('📋 INSTRUÇÕES:\n');
    console.log('   1. Resolva o Cloudflare Turnstile (se aparecer)');
    console.log('   2. Faça uma pesquisa de teste (ex: "Advogados")');
    console.log('   3. Aguarde os resultados carregarem');
    console.log('   4. Abra o DevTools (F12)');
    console.log('   5. Inspecione o HTML dos resultados');
    console.log('   6. Identifique os seletores CSS:\n');
    console.log('      - Container de cada resultado (ex: .resultado-item, article, .card)');
    console.log('      - numero_processo');
    console.log('      - classe');
    console.log('      - relator');
    console.log('      - orgao_julgador (ou turma)');
    console.log('      - data_julgamento');
    console.log('      - data_publicacao');
    console.log('      - ementa');
    console.log('      - link_detalhes (href para inteiro teor)\n');

    await waitForEnter('   Pressione ENTER quando terminar a inspeção: ');

    console.log('\n✅ Navegador será fechado.');
    console.log('\n📝 PRÓXIMO PASSO:');
    console.log('   Informe os seletores CSS que você identificou para que eu possa');
    console.log('   atualizar o arquivo STJ/config/fields.json\n');

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
})();

