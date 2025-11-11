/**
 * STJ Serverless Scraper - AWS Lambda / Azure Functions
 * 
 * Esta função serverless executa scraping de jurisprudências do STJ/TFR
 * usando Browserless BQL e retorna os dados extraídos em JSON.
 * 
 * ENTRADA (POST /scrape):
 * {
 *   "tribunal": "STJ" | "TFR",
 *   "searchTerm": "Advogado",
 *   "dateStart": "09/11/2025",  // Opcional (apenas STJ)
 *   "dateEnd": "10/11/2025"     // Opcional (apenas STJ)
 * }
 * 
 * SAÍDA:
 * {
 *   "success": true,
 *   "tribunal": "STJ",
 *   "totalResults": 15,
 *   "results": [
 *     {
 *       "numero": "REsp 123456",
 *       "ementa": "...",
 *       "data": "01/01/2025",
 *       "relator": "Min. João Silva"
 *     }
 *   ],
 *   "metadata": {
 *     "executionTime": 45000,
 *     "timestamp": "2025-11-11T10:30:00Z"
 *   }
 * }
 */

import axios from 'axios';
import { JSDOM } from 'jsdom';
import { extractSTJResults, extractTFRResults } from './lib/extractor.js';
import { buildSTJQuery, buildTFRQuery } from './lib/queries.js';

/**
 * Handler principal para AWS Lambda
 * 
 * @param {Object} event - Evento Lambda (API Gateway)
 * @param {Object} context - Contexto Lambda
 * @returns {Object} Response HTTP
 */
export const handler = async (event, context) => {
  const startTime = Date.now();
  
  try {
    // Parse do body
    const body = typeof event.body === 'string' 
      ? JSON.parse(event.body) 
      : event.body;
    
    // Validação
    const { tribunal, searchTerm, dateStart, dateEnd } = body;
    
    if (!tribunal || !searchTerm) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          error: 'Campos obrigatórios: tribunal, searchTerm'
        })
      };
    }
    
    if (!['STJ', 'TFR'].includes(tribunal)) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          error: 'Tribunal deve ser "STJ" ou "TFR"'
        })
      };
    }
    
    // Executar scraping
    console.log(`[${tribunal}] Iniciando scraping: ${searchTerm}`);
    const scrapingResult = await executeScraping({
      tribunal,
      searchTerm,
      dateStart,
      dateEnd
    });
    
    // Extrair dados do HTML
    console.log(`[${tribunal}] Extraindo dados do HTML...`);
    const results = tribunal === 'STJ' 
      ? extractSTJResults(scrapingResult.html)
      : extractTFRResults(scrapingResult.html);
    
    const executionTime = Date.now() - startTime;
    
    // Resposta de sucesso
    const response = {
      success: true,
      tribunal,
      totalResults: results.length,
      results,
      metadata: {
        executionTime,
        timestamp: new Date().toISOString(),
        searchParams: { searchTerm, dateStart, dateEnd }
      }
    };
    
    // ========================================
    // 💾 ÁREA DE ARMAZENAMENTO (COMENTADA)
    // ========================================
    // Descomente e configure conforme sua necessidade:
    
    // OPÇÃO 1: Salvar no S3
    // await saveToS3(response, tribunal, searchTerm);
    
    // OPÇÃO 2: Salvar no Azure Blob Storage
    // await saveToAzureBlob(response, tribunal, searchTerm);
    
    // OPÇÃO 3: Salvar no DynamoDB
    // await saveToDynamoDB(response, tribunal, searchTerm);
    
    // OPÇÃO 4: Enviar para fila SQS/Service Bus
    // await sendToQueue(response, tribunal);
    
    // OPÇÃO 5: Salvar no MongoDB/CosmosDB
    // await saveToDatabase(response, tribunal, searchTerm);
    
    // OPÇÃO 6: Integração com Pinecone (como no projeto original)
    // const embeddings = await generateEmbeddings(results);
    // await upsertToPinecone(embeddings, tribunal);
    
    console.log(`[${tribunal}] Scraping concluído: ${results.length} resultados em ${executionTime}ms`);
    
    return {
      statusCode: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*' // CORS
      },
      body: JSON.stringify(response)
    };
    
  } catch (error) {
    console.error('Erro no handler:', error);
    
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};

/**
 * Executa scraping usando Browserless BQL
 * 
 * @param {Object} params - Parâmetros de busca
 * @returns {Object} { html, screenshot }
 */
async function executeScraping({ tribunal, searchTerm, dateStart, dateEnd }) {
  const browserlessToken = process.env.BROWSERLESS_API_KEY;
  
  if (!browserlessToken) {
    throw new Error('BROWSERLESS_API_KEY não configurada');
  }
  
  // Construir query BQL
  const query = tribunal === 'STJ'
    ? buildSTJQuery(searchTerm, dateStart, dateEnd)
    : buildTFRQuery(searchTerm);
  
  const operationName = tribunal === 'STJ' ? 'BuscaSTJ' : 'BuscaTFR';
  
  // Configurar requisição
  const options = {
    method: 'POST',
    url: 'https://production-sfo.browserless.io/chromium/bql',
    params: {
      token: browserlessToken,
      proxy: 'residential',
      proxySticky: true,
      proxyCountry: 'br',
      humanlike: true,
      blockAds: true,
      blockConsentModals: true
    },
    headers: {
      'Content-Type': 'application/json'
    },
    data: {
      query,
      operationName
    },
    timeout: 120000 // 2 minutos
  };
  
  console.log(`[${tribunal}] Executando BQL query...`);
  const { data } = await axios.request(options);
  
  if (data.errors) {
    throw new Error(`BQL Error: ${data.errors[0]?.message || 'Unknown error'}`);
  }
  
  // Extrair HTML e screenshot da resposta
  const html = data.data?.html?.html || '';
  const screenshot = data.data?.screenshot?.base64 || '';
  
  if (!html) {
    throw new Error('HTML não retornado pela query BQL');
  }
  
  return { html, screenshot };
}

// ========================================
// 💾 FUNÇÕES DE ARMAZENAMENTO (EXEMPLOS)
// ========================================

/**
 * EXEMPLO: Salvar no S3
 * 
 * Descomente e instale: npm install @aws-sdk/client-s3
 */
/*
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

async function saveToS3(data, tribunal, searchTerm) {
  const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
  
  const key = `scraping/${tribunal}/${Date.now()}-${searchTerm}.json`;
  
  await s3.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    Body: JSON.stringify(data),
    ContentType: 'application/json'
  }));
  
  console.log(`Salvo no S3: ${key}`);
}
*/

/**
 * EXEMPLO: Salvar no DynamoDB
 * 
 * Descomente e instale: npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb
 */
/*
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

async function saveToDynamoDB(data, tribunal, searchTerm) {
  const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
  const docClient = DynamoDBDocumentClient.from(client);
  
  await docClient.send(new PutCommand({
    TableName: process.env.DYNAMODB_TABLE,
    Item: {
      id: `${tribunal}-${Date.now()}`,
      tribunal,
      searchTerm,
      timestamp: new Date().toISOString(),
      data
    }
  }));
  
  console.log(`Salvo no DynamoDB: ${tribunal}-${searchTerm}`);
}
*/

/**
 * EXEMPLO: Enviar para fila SQS
 * 
 * Descomente e instale: npm install @aws-sdk/client-sqs
 */
/*
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

async function sendToQueue(data, tribunal) {
  const sqs = new SQSClient({ region: process.env.AWS_REGION || 'us-east-1' });
  
  await sqs.send(new SendMessageCommand({
    QueueUrl: process.env.SQS_QUEUE_URL,
    MessageBody: JSON.stringify(data),
    MessageAttributes: {
      tribunal: { DataType: 'String', StringValue: tribunal }
    }
  }));
  
  console.log(`Enviado para SQS: ${tribunal}`);
}
*/

