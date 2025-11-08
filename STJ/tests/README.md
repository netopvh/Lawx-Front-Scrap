# 🧪 Tests - Scripts Utilitários e TDD

Esta pasta contém **scripts JavaScript/Node.js** para testes automatizados, validações e desenvolvimento local.

---

## 🎯 **O que são estes testes?**

Scripts Node.js para:
- ✅ Validar conexões com serviços externos (Browserless, OpenAI, Pinecone)
- ✅ Testar regras de negócio com browser local (Puppeteer)
- ✅ Testes unitários (TDD)
- ✅ Testes de integração
- ✅ Utilitários de desenvolvimento

---

## 📁 **Estrutura de Pastas**

```
tests/
├── utils/                          # Scripts utilitários
│   ├── test-browserless-connection.js    # Validar conexão Browserless
│   ├── test-browserless-balance.js       # Verificar saldo da conta
│   ├── test-openai-connection.js         # Validar API OpenAI
│   ├── test-pinecone-connection.js       # Validar API Pinecone
│   └── validate-fields-config.js         # Validar fields.json
├── local/                          # Testes com browser local
│   ├── test-stj-local.js                 # Testar STJ localmente
│   └── test-tfr-local.js                 # Testar TFR localmente
├── unit/                           # Testes unitários (TDD)
│   ├── test-field-mapping.test.js        # Mapeamento de campos
│   ├── test-extraction.test.js           # Extração de dados
│   └── test-pagination.test.js           # Lógica de paginação
└── integration/                    # Testes de integração
    └── test-full-pipeline.test.js        # Pipeline completo
```

---

## 🚀 **Como Usar**

### **1. Testes Utilitários (`utils/`)**

Executar individualmente:

```bash
# Testar conexão com Browserless
node tests/utils/test-browserless-connection.js

# Verificar saldo da conta Browserless
node tests/utils/test-browserless-balance.js

# Validar conexão com OpenAI
node tests/utils/test-openai-connection.js

# Validar conexão com Pinecone
node tests/utils/test-pinecone-connection.js

# Validar configuração fields.json
node tests/utils/validate-fields-config.js
```

### **2. Testes Locais (`local/`)**

⚠️ **IMPORTANTE:** Estes testes usam **Puppeteer local** (não Browserless).

```bash
# Instalar Puppeteer completo (apenas para testes locais)
npm install --save-dev puppeteer

# Testar STJ localmente
node tests/local/test-stj-local.js

# Testar TFR localmente
node tests/local/test-tfr-local.js
```

### **3. Testes Unitários (`unit/`)**

```bash
# Executar todos os testes unitários
npm test

# Executar teste específico
npm test -- test-field-mapping.test.js
```

### **4. Testes de Integração (`integration/`)**

```bash
# Executar pipeline completo
node tests/integration/test-full-pipeline.test.js
```

---

## 📊 **Diferença entre `tests/` e `browserql/`**

| Aspecto | `tests/` | `browserql/` |
|---------|----------|--------------|
| **Formato** | `.js` (JavaScript/Node.js) | `.bql` (GraphQL) |
| **Execução** | `node script.js` | Dashboard web |
| **Propósito** | Testes automatizados | Testes manuais visuais |
| **Browser** | Local ou remoto | Browserless remoto |
| **CI/CD** | ✅ Sim | ❌ Não |
| **TDD** | ✅ Sim | ❌ Não |

---

## ⚠️ **IMPORTANTE**

### **Testes Locais vs Produção**

- ❌ **NÃO** use browser local em produção
- ✅ Use browser local **apenas para desenvolvimento/testes**
- ✅ Em produção, use **Browserless** (configurado em `STJ/index.js`)

### **Puppeteer vs Puppeteer-core**

- **`puppeteer`** (dev dependency): Inclui Chromium, usado em testes locais
- **`puppeteer-core`** (dependency): Não inclui Chromium, usado em produção com Browserless

---

## 🔧 **Configuração**

### **Variáveis de Ambiente**

Os testes usam as mesmas variáveis do `.env`:

```env
BROWSERLESS_API_KEY=your_api_key_here
BROWSERLESS_REGION=production-sfo
OPENAI_API_KEY=your_openai_key_here
PINECONE_API_KEY=your_pinecone_key_here
```

### **Instalar Dependências de Teste**

```bash
# Instalar Puppeteer completo (para testes locais)
npm install --save-dev puppeteer

# Instalar framework de testes (opcional)
npm install --save-dev jest
```

---

## 📝 **Exemplo de Teste Utilitário**

```javascript
// tests/utils/test-browserless-connection.js
import puppeteer from "puppeteer-core";
import dotenv from "dotenv";

dotenv.config();

async function testConnection() {
  try {
    console.log("🧪 Testando conexão com Browserless...");
    
    const browser = await puppeteer.connect({
      browserWSEndpoint: `wss://${process.env.BROWSERLESS_REGION}.browserless.io?token=${process.env.BROWSERLESS_API_KEY}`,
    });
    
    console.log("✅ Conectado!");
    
    const page = await browser.newPage();
    await page.goto("https://example.com");
    const title = await page.title();
    
    console.log(`📄 Título: ${title}`);
    
    await browser.close();
    console.log("✅ Teste concluído!");
  } catch (error) {
    console.error("❌ Erro:", error.message);
    process.exit(1);
  }
}

testConnection();
```

---

## 📝 **Exemplo de Teste Local**

```javascript
// tests/local/test-stj-local.js
import puppeteer from "puppeteer"; // Puppeteer completo (com Chromium)
import dotenv from "dotenv";

dotenv.config();

async function testSTJLocal() {
  try {
    console.log("🧪 Testando STJ com browser local...");
    
    // Usar Puppeteer local (não Browserless)
    const browser = await puppeteer.launch({
      headless: false, // Mostrar navegador
      devtools: true,  // Abrir DevTools
    });
    
    const page = await browser.newPage();
    await page.goto("https://scon.stj.jus.br/SCON/jurisprudencia/toc.jsp");
    
    // Testar preenchimento de formulário
    await page.type("input[name='livre']", "Advogado");
    await page.select("select[name='tribunal']", "STJ");
    
    console.log("✅ Formulário preenchido!");
    
    // Aguardar interação manual
    await page.waitForTimeout(10000);
    
    await browser.close();
    console.log("✅ Teste concluído!");
  } catch (error) {
    console.error("❌ Erro:", error.message);
    process.exit(1);
  }
}

testSTJLocal();
```

---

## 🤝 **Contribuindo**

Ao criar novos testes:

1. Use nomes descritivos (`test-<funcionalidade>.js`)
2. Adicione comentários explicativos
3. Use `try/catch` para tratamento de erros
4. Retorne exit code apropriado (`process.exit(1)` em caso de erro)
5. Documente dependências necessárias
6. Atualize este README

---

## 📚 **Recursos**

- **Puppeteer Docs:** https://pptr.dev/
- **Jest Docs:** https://jestjs.io/
- **Browserless Docs:** https://docs.browserless.io/

---

**Última atualização:** 2025-11-08

