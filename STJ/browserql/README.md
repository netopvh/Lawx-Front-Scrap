# 📋 BrowserQL - Queries para Testes Manuais

Esta pasta contém **queries BQL (BrowserQL)** para testes manuais no **dashboard web do Browserless**.

---

## 🎯 **O que é BrowserQL?**

BrowserQL é uma API GraphQL do Browserless que permite automatizar navegadores usando queries GraphQL ao invés de código Puppeteer/Playwright.

**Vantagens:**
- ✅ Testes visuais no navegador
- ✅ Debugging interativo
- ✅ Exportação de código em várias linguagens
- ✅ Sem necessidade de escrever código

---

## 🚀 **Como Usar**

### **1. Acesse o Dashboard Browserless**
```
https://www.browserless.io/playground
```

### **2. Faça Login**
Use suas credenciais do Browserless.

### **3. Configure a API Key**
Clique no botão **⚙️ Settings** (¦¦¦) no canto superior direito e configure:
- **API Token:** Sua API Key do Browserless
- **Region:** `production-sfo` (ou outra região)

### **4. Cole a Query BQL**
Copie o conteúdo de um dos arquivos `.bql` desta pasta e cole no editor.

### **5. Execute**
Clique no botão **▶️ Run** para executar a query.

### **6. Visualize os Resultados**
- **JSON:** Dados extraídos
- **Screenshots:** Capturas de tela
- **HTML:** Código HTML limpo
- **Logs:** Logs de execução

### **7. Exporte o Código (Opcional)**
Clique no botão **</>** para exportar a query como código em:
- JavaScript (Fetch API)
- Python (Requests)
- cURL
- Node.js (Axios)

---

## 📁 **Arquivos Disponíveis**

| Arquivo | Descrição |
|---------|-----------|
| `test-connection.bql` | Teste básico de conexão |
| `test-all-form-fields.bql` | **⭐ Testar TODOS os campos do formulário (RECOMENDADO)** |
| `test-stj-form-fill.bql` | Preencher formulário de pesquisa STJ |
| `test-stj-scraping.bql` | Extrair dados de jurisprudências STJ |
| `test-tfr-form-fill.bql` | Preencher formulário de pesquisa TFR |
| `test-captcha-detection.bql` | Detectar presença de CAPTCHA |
| `test-pagination.bql` | Testar navegação entre páginas |

---

## 🔧 **Estrutura de uma Query BQL**

```graphql
# Configure settings by clicking the ¦¦¦ button on the right
mutation ExampleQuery {
  
  # Navegar para URL
  goto(url: "https://example.com", waitUntil: networkIdle) {
    status
  }
  
  # Preencher campo de texto
  type(selector: "input[name='search']", text: "teste") {
    success
  }
  
  # Clicar em botão
  click(selector: "button[type='submit']") {
    success
  }
  
  # Aguardar elemento
  waitForSelector(selector: ".results") {
    success
  }
  
  # Extrair dados com mapSelector
  results: mapSelector(selector: ".result-item") {
    title: mapSelector(selector: ".title") {
      text: innerText
    }
    link: mapSelector(selector: "a") {
      href: attribute(name: "href") {
        value
      }
    }
  }
  
  # Capturar screenshot
  screenshot {
    base64
  }
  
  # Exportar HTML limpo
  html(clean: {
    removeAttributes: true,
    removeNonTextNodes: true
  }) {
    html
  }
}
```

---

## 📚 **Documentação Oficial**

- **BrowserQL Schema:** https://docs.browserless.io/browserql/schema
- **Playground:** https://www.browserless.io/playground
- **Exemplos:** https://docs.browserless.io/browserql/examples

---

## ⚠️ **IMPORTANTE**

- ❌ **NÃO** use estas queries em produção
- ✅ Use apenas para **testes manuais** e **debugging visual**
- ✅ Para automação em produção, use o código JavaScript em `STJ/index.js`
- ✅ Para testes automatizados, use os scripts em `STJ/tests/`

---

## 🤝 **Contribuindo**

Ao criar novas queries BQL:

1. Use nomes descritivos (`test-<funcionalidade>.bql`)
2. Adicione comentários explicativos
3. Documente os seletores CSS usados
4. Teste antes de commitar
5. Atualize esta tabela de arquivos

---

## 📝 **Notas**

- Queries BQL são **stateless** (cada mutation é independente)
- Use `waitUntil` para garantir que a página carregou completamente
- Use `mapSelector` para extrair dados repetitivos (listas)
- Use `clean` no `html` para remover ruído do HTML

---

**Última atualização:** 2025-11-08

