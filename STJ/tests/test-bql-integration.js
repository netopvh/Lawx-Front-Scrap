/**
 * ═══════════════════════════════════════════════════════════════════════
 * TESTE DE INTEGRAÇÃO BQL
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * Testa a integração com Browserless BQL usando as queries que funcionaram.
 * 
 * USO:
 * node STJ/tests/test-bql-integration.js [stj|tfr]
 */

import dotenv from 'dotenv';
import { BrowserlessBQL, STJ_SEARCH_QUERY, TFR_SEARCH_QUERY } from '../lib/browserless-bql.js';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: 'STJ/.env' });

const SCREENSHOT_DIR = 'screenshots';
const HTML_DIR = 'scraps';

// Criar diretórios se não existirem
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}
if (!fs.existsSync(HTML_DIR)) {
  fs.mkdirSync(HTML_DIR, { recursive: true });
}

/**
 * Salva screenshot em arquivo
 */
function saveScreenshot(base64Data, filename) {
  const buffer = Buffer.from(base64Data, 'base64');
  const filepath = path.join(SCREENSHOT_DIR, filename);
  fs.writeFileSync(filepath, buffer);
  console.log(`📸 Screenshot salvo: ${filepath}`);
  return filepath;
}

/**
 * Salva HTML em arquivo
 */
function saveHTML(htmlContent, filename) {
  const filepath = path.join(HTML_DIR, filename);
  fs.writeFileSync(filepath, htmlContent, 'utf-8');
  console.log(`📄 HTML salvo: ${filepath}`);
  return filepath;
}

/**
 * Testa busca no STJ
 */
async function testSTJ() {
  console.log('\n🔍 Testando busca no STJ...\n');
  
  const client = new BrowserlessBQL({
    token: process.env.BROWSERLESS_API_KEY
  });

  const variables = {
    searchTerm: 'Advogado',
    dateStart: '09/11/2025',
    dateEnd: '10/11/2025'
  };

  try {
    console.log('📡 Executando query BQL para STJ...');
    console.log('🔑 Variáveis:', variables);
    
    const result = await client.execute(STJ_SEARCH_QUERY, 'STJSearch', variables);
    
    console.log('\n✅ Query executada com sucesso!');
    console.log('\n📊 Resultado:');
    console.log(JSON.stringify(result, null, 2));

    // Salvar screenshot se disponível
    if (result.data?.screenshot?.base64) {
      const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
      saveScreenshot(result.data.screenshot.base64, `stj_${timestamp}.png`);
    }

    // Salvar HTML se disponível
    if (result.data?.html?.html) {
      const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
      saveHTML(result.data.html.html, `stj_${timestamp}.html`);
    }

    // Verificar se Cloudflare foi resolvido
    if (result.data?.verify) {
      console.log('\n🛡️ Cloudflare:');
      console.log(`   - Encontrado: ${result.data.verify.found}`);
      console.log(`   - Resolvido: ${result.data.verify.solved}`);
      console.log(`   - Tempo: ${result.data.verify.time}ms`);
    }

    return result;
  } catch (error) {
    console.error('\n❌ Erro ao executar query STJ:', error.message);
    throw error;
  }
}

/**
 * Testa busca no TFR
 */
async function testTFR() {
  console.log('\n🔍 Testando busca no TFR...\n');
  
  const client = new BrowserlessBQL({
    token: process.env.BROWSERLESS_API_KEY
  });

  const variables = {
    searchTerm: 'Advogado'
  };

  try {
    console.log('📡 Executando query BQL para TFR...');
    console.log('🔑 Variáveis:', variables);
    
    const result = await client.execute(TFR_SEARCH_QUERY, 'TFRSearch', variables);
    
    console.log('\n✅ Query executada com sucesso!');
    console.log('\n📊 Resultado:');
    console.log(JSON.stringify(result, null, 2));

    // Salvar screenshot se disponível
    if (result.data?.screenshot?.base64) {
      const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
      saveScreenshot(result.data.screenshot.base64, `tfr_${timestamp}.png`);
    }

    // Salvar HTML se disponível
    if (result.data?.html?.html) {
      const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
      saveHTML(result.data.html.html, `tfr_${timestamp}.html`);
    }

    // Verificar se Cloudflare foi resolvido
    if (result.data?.verify) {
      console.log('\n🛡️ Cloudflare:');
      console.log(`   - Encontrado: ${result.data.verify.found}`);
      console.log(`   - Resolvido: ${result.data.verify.solved}`);
      console.log(`   - Tempo: ${result.data.verify.time}ms`);
    }

    return result;
  } catch (error) {
    console.error('\n❌ Erro ao executar query TFR:', error.message);
    throw error;
  }
}

/**
 * Main
 */
async function main() {
  const tribunal = process.argv[2] || 'stj';

  console.log('═══════════════════════════════════════════════════════');
  console.log('  TESTE DE INTEGRAÇÃO BROWSERLESS BQL');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`\n🏛️  Tribunal: ${tribunal.toUpperCase()}`);
  console.log(`🔑 API Key: ${process.env.BROWSERLESS_API_KEY?.substring(0, 10)}...`);

  try {
    if (tribunal.toLowerCase() === 'stj') {
      await testSTJ();
    } else if (tribunal.toLowerCase() === 'tfr') {
      await testTFR();
    } else {
      console.error('\n❌ Tribunal inválido. Use: stj ou tfr');
      process.exit(1);
    }

    console.log('\n✅ Teste concluído com sucesso!');
    console.log('═══════════════════════════════════════════════════════\n');
  } catch (error) {
    console.error('\n❌ Teste falhou:', error);
    console.log('═══════════════════════════════════════════════════════\n');
    process.exit(1);
  }
}

main();

