# STJ Serverless Scraper

Função serverless para scraping de jurisprudências do STJ e TFR usando Browserless BQL.

Compatível com **AWS Lambda** e **Azure Functions** para alta escalabilidade.

---

## 📋 **Visão Geral**

Esta função serverless:

- ✅ Recebe parâmetros de busca via POST (JSON)
- ✅ Executa scraping usando Browserless BQL
- ✅ Extrai dados estruturados do HTML
- ✅ Retorna JSON com resultados
- ✅ Vive apenas durante a execução (alta escala)
- ✅ Suporta integração com S3, DynamoDB, SQS, etc.

---

## 🚀 **Instalação**

```bash
cd STJ/serverless
npm install
```

---

## 🔧 **Configuração**

### **1. Variáveis de Ambiente**

Crie um arquivo `.env` em `STJ/`:

```env
BROWSERLESS_API_KEY=sua_chave_browserless_aqui

# Opcional - para armazenamento
S3_BUCKET=meu-bucket-scraping
DYNAMODB_TABLE=stj-scraping-results
SQS_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/123456789012/stj-queue
```

### **2. AWS Credentials (para deploy)**

```bash
aws configure
# Ou use AWS_ACCESS_KEY_ID e AWS_SECRET_ACCESS_KEY
```

---

## 🧪 **Teste Local**

```bash
npm test
```

Ou diretamente:

```bash
node test-local.js
```

**Saída esperada:**

```
═══════════════════════════════════════════════════════
  TESTE LOCAL - STJ SERVERLESS SCRAPER
═══════════════════════════════════════════════════════

📋 Evento de entrada:
{
  "tribunal": "STJ",
  "searchTerm": "Advogado",
  "dateStart": "09/11/2025",
  "dateEnd": "10/11/2025"
}

🚀 Executando handler...

✅ Sucesso!
🏛️  Tribunal: STJ
📄 Total de resultados: 15
```

---

## 📦 **Deploy**

### **AWS Lambda (Serverless Framework)**

#### **1. Instalar Serverless Framework**

```bash
npm install -g serverless
```

#### **2. Deploy**

```bash
npm run deploy:aws
```

Ou:

```bash
serverless deploy --stage prod
```

#### **3. Testar no AWS**

```bash
curl -X POST https://abc123.execute-api.us-east-1.amazonaws.com/dev/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "tribunal": "STJ",
    "searchTerm": "Advogado",
    "dateStart": "09/11/2025",
    "dateEnd": "10/11/2025"
  }'
```

#### **4. Ver logs**

```bash
npm run logs:aws
```

#### **5. Remover deploy**

```bash
npm run remove:aws
```

---

### **Azure Functions**

#### **1. Instalar Azure Functions Core Tools**

```bash
npm install -g azure-functions-core-tools@4
```

#### **2. Criar Function App no Azure**

```bash
az functionapp create \
  --resource-group meu-resource-group \
  --consumption-plan-location eastus \
  --runtime node \
  --runtime-version 18 \
  --functions-version 4 \
  --name stj-scraper \
  --storage-account meustorage
```

#### **3. Configurar variáveis de ambiente**

```bash
az functionapp config appsettings set \
  --name stj-scraper \
  --resource-group meu-resource-group \
  --settings BROWSERLESS_API_KEY=sua_chave_aqui
```

#### **4. Deploy**

```bash
npm run deploy:azure
```

---

## 📡 **API**

### **Endpoint**

```
POST /scrape
```

### **Request Body**

```json
{
  "tribunal": "STJ",
  "searchTerm": "Advogado",
  "dateStart": "09/11/2025",
  "dateEnd": "10/11/2025"
}
```

**Campos:**

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `tribunal` | `string` | ✅ | `"STJ"` ou `"TFR"` |
| `searchTerm` | `string` | ✅ | Termo de busca |
| `dateStart` | `string` | ❌ | Data inicial (DD/MM/YYYY) - apenas STJ |
| `dateEnd` | `string` | ❌ | Data final (DD/MM/YYYY) - apenas STJ |

### **Response**

```json
{
  "success": true,
  "tribunal": "STJ",
  "totalResults": 15,
  "results": [
    {
      "numero": "REsp 123456",
      "ementa": "Texto da ementa...",
      "data": "01/01/2025",
      "relator": "Min. João Silva",
      "orgaoJulgador": "Terceira Turma",
      "tipo": "Recurso Especial",
      "link": "https://..."
    }
  ],
  "metadata": {
    "executionTime": 45000,
    "timestamp": "2025-11-11T10:30:00Z",
    "searchParams": {
      "searchTerm": "Advogado",
      "dateStart": "09/11/2025",
      "dateEnd": "10/11/2025"
    }
  }
}
```

---

## 💾 **Armazenamento**

A função retorna JSON na resposta HTTP, mas você pode integrar armazenamento:

### **Opções disponíveis (comentadas no código):**

1. **AWS S3** - Salvar JSON em bucket
2. **AWS DynamoDB** - Salvar metadados e resultados
3. **AWS SQS** - Enviar para fila de processamento
4. **Azure Blob Storage** - Salvar JSON em blob
5. **Azure Service Bus** - Enviar para fila
6. **MongoDB/CosmosDB** - Salvar em banco NoSQL
7. **Pinecone** - Gerar embeddings e salvar (como projeto original)

### **Como habilitar:**

1. Abra `handler.js`
2. Localize a seção `💾 ÁREA DE ARMAZENAMENTO (COMENTADA)`
3. Descomente a função desejada
4. Instale dependências necessárias
5. Configure variáveis de ambiente
6. Atualize permissões IAM em `serverless.yml`

---

## 🔍 **Ajustar Seletores HTML**

Os seletores em `lib/extractor.js` são **exemplos genéricos**.

Para ajustar:

1. Execute teste local: `npm test`
2. Analise o HTML salvo em `test-output.json`
3. Identifique seletores CSS corretos
4. Atualize `extractSTJResults()` e `extractTFRResults()`

**Exemplo:**

```javascript
// Antes (genérico)
const resultItems = document.querySelectorAll('.resultado-item');

// Depois (específico)
const resultItems = document.querySelectorAll('div.jurisprudenciaResult');
```

---

## 📊 **Custos Estimados**

### **AWS Lambda**

- **Requests:** 1 milhão grátis/mês
- **Compute:** 400.000 GB-s grátis/mês
- **Custo por execução (120s, 512MB):** ~$0.0001

**Exemplo:** 10.000 execuções/mês = **$1.00**

### **Browserless**

- **Plano Free:** 6 horas/mês grátis
- **Plano Starter:** $29/mês (100 horas)
- **Custo por scraping (60s):** ~$0.01

**Exemplo:** 10.000 execuções/mês = **$100.00**

---

## 🛠️ **Troubleshooting**

### **Erro: BROWSERLESS_API_KEY não configurada**

```bash
# Adicione ao .env
echo "BROWSERLESS_API_KEY=sua_chave" >> ../. env
```

### **Erro: Timeout (408)**

- Aumente `timeout` em `serverless.yml` (máximo 900s)
- Reduza `waitForTimeout` em `lib/queries.js`

### **Erro: Nenhum resultado encontrado**

- Verifique seletores em `lib/extractor.js`
- Analise HTML em `test-output.json`
- Teste query no dashboard Browserless

---

## 📚 **Estrutura de Arquivos**

```
STJ/serverless/
├── handler.js              # Handler principal (Lambda/Azure)
├── lib/
│   ├── queries.js          # Queries BQL (STJ e TFR)
│   └── extractor.js        # Extração de dados do HTML
├── package.json            # Dependências
├── serverless.yml          # Config Serverless Framework (AWS)
├── test-local.js           # Script de teste local
├── README.md               # Esta documentação
└── .env                    # Variáveis de ambiente (não commitar)
```

---

## 🎯 **Próximos Passos**

1. ✅ Testar localmente: `npm test`
2. ✅ Ajustar seletores em `lib/extractor.js`
3. ✅ Configurar armazenamento (S3, DynamoDB, etc.)
4. ✅ Deploy no AWS: `npm run deploy:aws`
5. ✅ Testar endpoint público
6. ✅ Configurar monitoramento (CloudWatch, Application Insights)
7. ✅ Implementar rate limiting se necessário

---

## 📞 **Suporte**

- **Browserless Docs:** https://docs.browserless.io/
- **Serverless Framework:** https://www.serverless.com/framework/docs
- **AWS Lambda:** https://docs.aws.amazon.com/lambda/
- **Azure Functions:** https://docs.microsoft.com/azure/azure-functions/

---

## 📝 **Licença**

MIT

