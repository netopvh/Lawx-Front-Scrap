/**
 * Integrações com serviços externos
 * 
 * Exemplos de integração com:
 * - AWS S3
 * - AWS DynamoDB
 * - AWS SQS
 * - OpenAI (embeddings)
 * - Pinecone (vector database)
 */

// ========================================
// AWS S3
// ========================================

/**
 * Salva dados no S3
 * 
 * Instalação: npm install @aws-sdk/client-s3
 * 
 * @param {Object} data - Dados a salvar
 * @param {string} tribunal - Nome do tribunal
 * @param {string} searchTerm - Termo de busca
 */
export async function saveToS3(data, tribunal, searchTerm) {
  const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
  
  const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const key = `scraping/${tribunal}/${timestamp}-${searchTerm}.json`;
  
  await s3.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    Body: JSON.stringify(data, null, 2),
    ContentType: 'application/json',
    Metadata: {
      tribunal,
      searchTerm,
      timestamp
    }
  }));
  
  console.log(`✅ Salvo no S3: s3://${process.env.S3_BUCKET}/${key}`);
  return key;
}

// ========================================
// AWS DynamoDB
// ========================================

/**
 * Salva dados no DynamoDB
 * 
 * Instalação: npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb
 * 
 * @param {Object} data - Dados a salvar
 * @param {string} tribunal - Nome do tribunal
 * @param {string} searchTerm - Termo de busca
 */
export async function saveToDynamoDB(data, tribunal, searchTerm) {
  const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb');
  const { DynamoDBDocumentClient, PutCommand } = await import('@aws-sdk/lib-dynamodb');
  
  const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
  const docClient = DynamoDBDocumentClient.from(client);
  
  const id = `${tribunal}-${Date.now()}`;
  const timestamp = new Date().toISOString();
  
  await docClient.send(new PutCommand({
    TableName: process.env.DYNAMODB_TABLE,
    Item: {
      id,
      tribunal,
      searchTerm,
      timestamp,
      totalResults: data.totalResults,
      results: data.results,
      metadata: data.metadata,
      ttl: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30 dias
    }
  }));
  
  console.log(`✅ Salvo no DynamoDB: ${id}`);
  return id;
}

// ========================================
// AWS SQS
// ========================================

/**
 * Envia dados para fila SQS
 * 
 * Instalação: npm install @aws-sdk/client-sqs
 * 
 * @param {Object} data - Dados a enviar
 * @param {string} tribunal - Nome do tribunal
 */
export async function sendToSQS(data, tribunal) {
  const { SQSClient, SendMessageCommand } = await import('@aws-sdk/client-sqs');
  
  const sqs = new SQSClient({ region: process.env.AWS_REGION || 'us-east-1' });
  
  const result = await sqs.send(new SendMessageCommand({
    QueueUrl: process.env.SQS_QUEUE_URL,
    MessageBody: JSON.stringify(data),
    MessageAttributes: {
      tribunal: {
        DataType: 'String',
        StringValue: tribunal
      },
      timestamp: {
        DataType: 'String',
        StringValue: new Date().toISOString()
      }
    }
  }));
  
  console.log(`✅ Enviado para SQS: ${result.MessageId}`);
  return result.MessageId;
}

// ========================================
// OpenAI (Embeddings)
// ========================================

/**
 * Gera embeddings usando OpenAI
 * 
 * Instalação: npm install openai
 * 
 * @param {Array} results - Array de resultados
 * @returns {Array} Array de embeddings
 */
export async function generateEmbeddings(results) {
  const OpenAI = (await import('openai')).default;
  
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
  
  const embeddings = [];
  
  for (const result of results) {
    // Concatenar campos relevantes
    const text = [
      result.numero,
      result.ementa,
      result.relator,
      result.orgaoJulgador
    ].filter(Boolean).join(' ');
    
    if (!text.trim()) continue;
    
    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text
      });
      
      embeddings.push({
        ...result,
        embedding: response.data[0].embedding
      });
      
    } catch (error) {
      console.error(`Erro ao gerar embedding para ${result.numero}:`, error.message);
    }
  }
  
  console.log(`✅ Gerados ${embeddings.length} embeddings`);
  return embeddings;
}

// ========================================
// Pinecone (Vector Database)
// ========================================

/**
 * Salva embeddings no Pinecone
 * 
 * Instalação: npm install @pinecone-database/pinecone
 * 
 * @param {Array} embeddings - Array de embeddings
 * @param {string} tribunal - Nome do tribunal
 */
export async function upsertToPinecone(embeddings, tribunal) {
  const { Pinecone } = await import('@pinecone-database/pinecone');
  
  const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY
  });
  
  const index = pinecone.index(process.env.PINECONE_INDEX);
  
  // Preparar vetores para upsert
  const vectors = embeddings.map((item, idx) => ({
    id: `${tribunal}-${Date.now()}-${idx}`,
    values: item.embedding,
    metadata: {
      tribunal,
      numero: item.numero,
      ementa: item.ementa?.substring(0, 1000), // Limitar tamanho
      data: item.data,
      relator: item.relator,
      orgaoJulgador: item.orgaoJulgador,
      tipo: item.tipo,
      link: item.link,
      timestamp: new Date().toISOString()
    }
  }));
  
  // Upsert em lotes de 100
  const batchSize = 100;
  for (let i = 0; i < vectors.length; i += batchSize) {
    const batch = vectors.slice(i, i + batchSize);
    await index.upsert(batch);
    console.log(`✅ Upsert Pinecone: ${i + batch.length}/${vectors.length}`);
  }
  
  console.log(`✅ Total upsert no Pinecone: ${vectors.length} vetores`);
  return vectors.length;
}

// ========================================
// Fluxo Completo (OpenAI + Pinecone)
// ========================================

/**
 * Processa resultados com OpenAI e salva no Pinecone
 * (Mesmo fluxo do projeto original)
 * 
 * @param {Array} results - Array de resultados
 * @param {string} tribunal - Nome do tribunal
 */
export async function processWithOpenAIAndPinecone(results, tribunal) {
  console.log(`🤖 Gerando embeddings para ${results.length} resultados...`);
  const embeddings = await generateEmbeddings(results);
  
  console.log(`💾 Salvando ${embeddings.length} embeddings no Pinecone...`);
  const count = await upsertToPinecone(embeddings, tribunal);
  
  return {
    totalProcessed: results.length,
    totalEmbeddings: embeddings.length,
    totalUpserted: count
  };
}

// ========================================
// Azure Blob Storage
// ========================================

/**
 * Salva dados no Azure Blob Storage
 * 
 * Instalação: npm install @azure/storage-blob
 * 
 * @param {Object} data - Dados a salvar
 * @param {string} tribunal - Nome do tribunal
 * @param {string} searchTerm - Termo de busca
 */
export async function saveToAzureBlob(data, tribunal, searchTerm) {
  const { BlobServiceClient } = await import('@azure/storage-blob');
  
  const blobServiceClient = BlobServiceClient.fromConnectionString(
    process.env.AZURE_STORAGE_CONNECTION_STRING
  );
  
  const containerClient = blobServiceClient.getContainerClient('scraping');
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const blobName = `${tribunal}/${timestamp}-${searchTerm}.json`;
  
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  
  await blockBlobClient.upload(
    JSON.stringify(data, null, 2),
    Buffer.byteLength(JSON.stringify(data)),
    {
      blobHTTPHeaders: {
        blobContentType: 'application/json'
      },
      metadata: {
        tribunal,
        searchTerm,
        timestamp
      }
    }
  );
  
  console.log(`✅ Salvo no Azure Blob: ${blobName}`);
  return blobName;
}

