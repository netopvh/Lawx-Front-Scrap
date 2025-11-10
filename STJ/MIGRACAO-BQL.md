# 🚀 MIGRAÇÃO PARA BROWSERLESS BQL

## 📋 RESUMO

Migração do scraper STJ/TFR de Puppeteer direto para **Browserless BQL (BrowserQL)**, baseado nas queries que funcionaram nos testes manuais.

---

## ✅ O QUE FUNCIONOU NOS TESTES

### **Scripts Testados com Sucesso:**

1. **`STJ/scripts/busca-stj.graphql`** ✅
   - URL: `https://scon.stj.jus.br/SCON/jurisprudencia/toc.jsp`
   - Seletores: `input#pesquisaLivre`, `button#idMostrarPesquisaAvancada`
   - Cloudflare: **RESOLVIDO** com `verify(type: cloudflare)`
   - Proxy residencial: **FUNCIONANDO**

2. **`STJ/scripts/busca-stjtfr.graphql`** ✅
   - URL: `https://scon.stj.jus.br/SCON/juritfr`
   - Seletores: `input#livre`, `label[for='b3']`
   - Cloudflare: **RESOLVIDO** com `verify(type: cloudflare)`
   - Proxy residencial: **FUNCIONANDO**

3. **`STJ/exemplo-busca-stj-tfr.js`** ✅
   - Cliente Node.js que executa queries BQL via HTTP
   - Configuração de proxy residencial
   - Opções humanlike, blockAds, blockConsentModals

---

## 🔑 DESCOBERTAS IMPORTANTES

### **1. URLs Diferentes para STJ e TFR**

| Tribunal | URL | Observação |
|----------|-----|------------|
| **STJ** | `https://scon.stj.jus.br/SCON/jurisprudencia/toc.jsp` | Pesquisa avançada |
| **TFR** | `https://scon.stj.jus.br/SCON/juritfr` | Pesquisa simples |

### **2. Seletores Diferentes**

| Campo | STJ | TFR |
|-------|-----|-----|
| **Campo de busca** | `input#pesquisaLivre` | `input#livre` |
| **Botão pesquisa avançada** | `button#idMostrarPesquisaAvancada` | N/A |
| **Tipo de documento** | N/A | `label[for='b3']` (Acórdãos e Súmulas) |
| **Botão pesquisar** | `button[aria-label='Pesquisar']` | `input[type='submit'][value='Pesquisar']` |

### **3. Remoção do VLibras é Necessária**

O widget VLibras (acessibilidade) interfere com a automação. Ambas as queries incluem código para removê-lo:

```javascript
// Remove bloco entre <!--INI VLIBRAS --> e <!--END VLIBRAS -->
const walker = document.createTreeWalker(document, NodeFilter.SHOW_COMMENT, null, false);
// ... código de remoção
```

### **4. Cloudflare Turnstile Resolvido**

```graphql
verify(type: cloudflare, timeout: 10000) {
  found
  solved
  time
}
```

**Resultado:** ✅ `solved: true` em ambos os testes

### **5. Configuração de Proxy Residencial**

```javascript
const proxyString = "&proxy=residential&proxySticky=true&proxyCountry=br";
const optionsString = "&humanlike=true&blockAds=true&blockConsentModals=true";
```

**Parâmetros importantes:**
- `proxy=residential` - Proxy residencial (obrigatório para Cloudflare)
- `proxySticky=true` - Mantém o mesmo IP durante a sessão
- `proxyCountry=br` - IP brasileiro
- `humanlike=true` - Simula comportamento humano
- `blockAds=true` - Bloqueia anúncios
- `blockConsentModals=true` - Bloqueia modais de consentimento

---

## 📁 NOVA ARQUITETURA

### **Arquivos Criados:**

```
STJ/
├── lib/
│   └── browserless-bql.js          # Cliente BQL + Queries STJ/TFR
├── tests/
│   └── test-bql-integration.js     # Teste de integração
├── scripts/
│   ├── busca-stj.graphql           # Query STJ (testada ✅)
│   └── busca-stjtfr.graphql        # Query TFR (testada ✅)
└── exemplo-busca-stj-tfr.js        # Exemplo de uso (testado ✅)
```

### **`STJ/lib/browserless-bql.js`**

**Exports:**
- `BrowserlessBQL` - Classe cliente para executar queries BQL
- `STJ_SEARCH_QUERY` - Query GraphQL para busca no STJ
- `TFR_SEARCH_QUERY` - Query GraphQL para busca no TFR

**Métodos:**
- `execute(query, operationName, variables)` - Executa query BQL
- `executeFile(filePath, operationName, variables)` - Executa query de arquivo

### **`STJ/tests/test-bql-integration.js`**

**Uso:**
```bash
# Testar STJ
node STJ/tests/test-bql-integration.js stj

# Testar TFR
node STJ/tests/test-bql-integration.js tfr
```

**Funcionalidades:**
- ✅ Executa query BQL
- ✅ Salva screenshot em `screenshots/`
- ✅ Salva HTML em `scraps/`
- ✅ Exibe informações do Cloudflare
- ✅ Tratamento de erros

---

## 🎯 PRÓXIMOS PASSOS

### **Fase 1: Validação** ⏳

1. ✅ Criar cliente BQL (`browserless-bql.js`)
2. ✅ Criar queries STJ/TFR baseadas nos scripts que funcionaram
3. ✅ Criar script de teste de integração
4. ⏳ **EXECUTAR TESTE:** `node STJ/tests/test-bql-integration.js stj`
5. ⏳ **EXECUTAR TESTE:** `node STJ/tests/test-bql-integration.js tfr`
6. ⏳ Validar screenshots e HTML salvos

### **Fase 2: Extração de Dados** ⏳

7. ⏳ Analisar HTML retornado para identificar seletores de resultados
8. ⏳ Adicionar `mapSelector` nas queries para extrair jurisprudências
9. ⏳ Criar função de parsing de resultados
10. ⏳ Testar extração com dados reais

### **Fase 3: Integração com index.js** ⏳

11. ⏳ Substituir `connectBrowser()` por `BrowserlessBQL`
12. ⏳ Substituir `fillSearchForm()` por queries BQL
13. ⏳ Substituir `extractJurisprudencias()` por parsing de resultados BQL
14. ⏳ Manter funções de embedding e Pinecone
15. ⏳ Testar scraping completo (STJ e TFR)

### **Fase 4: Paginação** ⏳

16. ⏳ Adicionar suporte a paginação nas queries BQL
17. ⏳ Testar navegação entre páginas
18. ⏳ Validar extração de múltiplas páginas

### **Fase 5: Documentação e Limpeza** ⏳

19. ⏳ Atualizar README.md
20. ⏳ Atualizar CHANGELOG.md
21. ⏳ Remover código Puppeteer antigo
22. ⏳ Commit final e merge

---

## 🧪 COMO TESTAR AGORA

### **1. Testar STJ:**

```bash
cd D:\Workspace\Lawx-TJSP
node STJ/tests/test-bql-integration.js stj
```

**Resultado esperado:**
- ✅ Cloudflare resolvido
- ✅ Screenshot salvo em `screenshots/stj_*.png`
- ✅ HTML salvo em `scraps/stj_*.html`
- ✅ Console mostra resultado JSON

### **2. Testar TFR:**

```bash
node STJ/tests/test-bql-integration.js tfr
```

**Resultado esperado:**
- ✅ Cloudflare resolvido
- ✅ Screenshot salvo em `screenshots/tfr_*.png`
- ✅ HTML salvo em `scraps/tfr_*.html`
- ✅ Console mostra resultado JSON

### **3. Analisar Resultados:**

1. Abrir screenshot para validar visualmente
2. Abrir HTML para identificar seletores de resultados
3. Verificar se há jurisprudências na página
4. Identificar estrutura HTML dos resultados

---

## 📊 COMPARAÇÃO: ANTES vs DEPOIS

| Aspecto | Antes (Puppeteer) | Depois (BQL) |
|---------|-------------------|--------------|
| **Cloudflare** | ❌ Bloqueado | ✅ Resolvido |
| **Proxy** | ❌ Não configurado | ✅ Residencial BR |
| **Código** | ~1300 linhas | ~300 linhas |
| **Manutenção** | Difícil | Fácil |
| **Debugging** | Screenshots manuais | Screenshots automáticos |
| **Escalabilidade** | Limitada | Alta |
| **Custo** | Scrapeless (esgotado) | Browserless (ativo) |

---

## 🔧 CONFIGURAÇÃO NECESSÁRIA

### **Variáveis de Ambiente (`.env`):**

```env
BROWSERLESS_API_KEY=2TOoE1zEzEZ65mGf5ad499b004d2cfab0c5b75a03d5a942be
BROWSERLESS_REGION=production-sfo
```

### **Dependências:**

```json
{
  "dependencies": {
    "node-fetch": "^3.3.2"
  }
}
```

---

## 📚 REFERÊNCIAS

- **Browserless BQL Docs:** https://docs.browserless.io/browserql
- **Solving CAPTCHAs:** https://docs.browserless.io/browserql/bot-detection/solving-captchas
- **BQL Schema:** https://docs.browserless.io/bql-schema
- **Scripts que funcionaram:** `STJ/scripts/busca-stj.graphql`, `STJ/scripts/busca-stjtfr.graphql`

---

## ✅ STATUS ATUAL

| Item | Status |
|------|--------|
| Cliente BQL criado | ✅ Concluído |
| Queries STJ/TFR criadas | ✅ Concluído |
| Script de teste criado | ✅ Concluído |
| **Teste STJ** | ⏳ **AGUARDANDO EXECUÇÃO** |
| **Teste TFR** | ⏳ **AGUARDANDO EXECUÇÃO** |
| Extração de dados | ⏳ Pendente |
| Integração com index.js | ⏳ Pendente |
| Paginação | ⏳ Pendente |

---

**🚀 PRÓXIMO PASSO: Executar `node STJ/tests/test-bql-integration.js stj` e validar resultados!**

