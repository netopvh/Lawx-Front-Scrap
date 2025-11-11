/**
 * Script de teste local para a função serverless
 * 
 * Uso:
 *   node test-local.js
 */

import { handler } from './handler.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carregar .env do diretório pai (STJ/)
dotenv.config({ path: join(__dirname, '..', '.env') });

/**
 * Simula evento do API Gateway
 */
const mockEvent = {
  body: JSON.stringify({
    tribunal: 'STJ',
    searchTerm: 'Advogado',
    dateStart: '09/11/2025',
    dateEnd: '10/11/2025'
  }),
  headers: {
    'Content-Type': 'application/json'
  },
  httpMethod: 'POST',
  path: '/scrape'
};

/**
 * Simula contexto Lambda
 */
const mockContext = {
  functionName: 'stj-scraper-local',
  functionVersion: '1',
  invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:stj-scraper-local',
  memoryLimitInMB: '512',
  awsRequestId: 'local-test-' + Date.now(),
  logGroupName: '/aws/lambda/stj-scraper-local',
  logStreamName: '2025/11/11/[$LATEST]local',
  getRemainingTimeInMillis: () => 120000
};

/**
 * Executa teste
 */
async function runTest() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  TESTE LOCAL - STJ SERVERLESS SCRAPER');
  console.log('═══════════════════════════════════════════════════════\n');
  
  console.log('📋 Evento de entrada:');
  console.log(JSON.stringify(JSON.parse(mockEvent.body), null, 2));
  console.log('');
  
  console.log('🔑 Variáveis de ambiente:');
  console.log(`BROWSERLESS_API_KEY: ${process.env.BROWSERLESS_API_KEY ? '✅ Configurada' : '❌ Não configurada'}`);
  console.log('');
  
  if (!process.env.BROWSERLESS_API_KEY) {
    console.error('❌ ERRO: BROWSERLESS_API_KEY não configurada no .env');
    console.error('   Crie um arquivo .env em STJ/ com:');
    console.error('   BROWSERLESS_API_KEY=sua_chave_aqui');
    process.exit(1);
  }
  
  console.log('🚀 Executando handler...\n');
  
  const startTime = Date.now();
  
  try {
    const response = await handler(mockEvent, mockContext);
    
    const executionTime = Date.now() - startTime;
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  RESULTADO');
    console.log('═══════════════════════════════════════════════════════\n');
    
    console.log(`⏱️  Tempo de execução: ${executionTime}ms (${(executionTime / 1000).toFixed(2)}s)`);
    console.log(`📊 Status HTTP: ${response.statusCode}`);
    console.log('');
    
    const body = JSON.parse(response.body);
    
    if (body.success) {
      console.log('✅ Sucesso!');
      console.log(`🏛️  Tribunal: ${body.tribunal}`);
      console.log(`📄 Total de resultados: ${body.totalResults}`);
      console.log('');
      
      if (body.results && body.results.length > 0) {
        console.log('📋 Primeiros 3 resultados:');
        body.results.slice(0, 3).forEach((result, index) => {
          console.log(`\n${index + 1}. ${result.numero || 'Sem número'}`);
          console.log(`   Ementa: ${(result.ementa || 'Sem ementa').substring(0, 100)}...`);
          console.log(`   Data: ${result.data || 'Sem data'}`);
          console.log(`   Relator: ${result.relator || 'Sem relator'}`);
        });
      }
      
      console.log('\n📊 Metadados:');
      console.log(JSON.stringify(body.metadata, null, 2));
      
    } else {
      console.log('❌ Erro na execução:');
      console.log(body.error);
      if (body.stack) {
        console.log('\n📚 Stack trace:');
        console.log(body.stack);
      }
    }
    
    console.log('\n═══════════════════════════════════════════════════════\n');
    
    // Salvar resposta completa em arquivo
    const fs = await import('fs');
    const outputPath = join(__dirname, 'test-output.json');
    fs.writeFileSync(outputPath, JSON.stringify(body, null, 2));
    console.log(`💾 Resposta completa salva em: ${outputPath}`);
    
  } catch (error) {
    console.error('\n❌ ERRO FATAL:');
    console.error(error);
    process.exit(1);
  }
}

// Executar teste
runTest();

