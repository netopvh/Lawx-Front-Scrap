# 📋 PLANO DE REFATORAÇÃO STJ/index.js

## 🎯 OBJETIVO

Refatorar `STJ/index.js` para usar **Browserless BQL** ao invés de Puppeteer direto, mantendo a mesma interface de execução dos outros scrapers (STF e TJSP).

---

## 📊 ANÁLISE DO CÓDIGO ATUAL

### **Funções que serão REMOVIDAS** (relacionadas a Puppeteer/CAPTCHA):

1. ❌ `addCaptchaListener(page)` - Não necessário (BQL resolve automaticamente)
2. ❌ `isCaptchaResolved(page)` - Não necessário (BQL resolve automaticamente)
3. ❌ `onCaptchaFinished(page, timeout)` - Não necessário (BQL resolve automaticamente)
4. ❌ `clearAllCookies(page)` - Não necessário (BQL gerencia sessão)
5. ❌ `connectBrowser()` - Substituído por `bqlClient.execute()`
6. ❌ `navigateToSTJ(page)` - Substituído por query BQL
7. ❌ `fillSearchForm(page, buscaConfig, tribunal, fieldMapping)` - Substituído por variáveis BQL
8. ❌ `submitForm(page)` - Substituído por query BQL
9. ❌ `extractResults(page, fieldsConfig, tribunal)` - Substituído por parsing de HTML com JSDOM

**Total:** ~800 linhas removidas

---

### **Funções que serão MANTIDAS** (OpenAI, Pinecone, utilitárias):

1. ✅ `ensureDirectories()` - Utilitária
2. ✅ `loadConfig(filename)` - Utilitária
3. ✅ `loadCategories()` - Utilitária
4. ✅ `loadPrompt(filename)` - Utilitária
5. ✅ `parsePagination(paginaConfig)` - Utilitária
6. ✅ `categorizeEmenta(ementa)` - OpenAI
7. ✅ `generateEmbedding(text)` - OpenAI
8. ✅ `ensurePineconeIndex()` - Pinecone
9. ✅ `log(message, level)` - Logging
10. ✅ `initLog()` - Logging
11. ✅ `closeLog()` - Logging
12. ✅ `getTimestampedFilename(prefix, extension)` - Utilitária

**Total:** ~400 linhas mantidas

---

### **Funções que serão CRIADAS** (BQL):

1. ✨ `executeBQLSearch(tribunal, searchParams)` - Executa query BQL
2. ✨ `parseHTMLResults(html, tribunal, fieldsConfig)` - Extrai resultados do HTML
3. ✨ `buildSearchVariables(buscaConfig, tribunal)` - Constrói variáveis para query BQL
4. ✨ `saveDebugFiles(html, screenshot, tribunal)` - Salva HTML e screenshot para debug

**Total:** ~200 linhas novas

---

## 🔄 FLUXO ATUAL vs NOVO

### **FLUXO ATUAL (Puppeteer):**

```
1. connectBrowser() → WebSocket Browserless
2. page.goto(url)
3. addCaptchaListener(page)
4. onCaptchaFinished(page) → Aguardar resolução manual
5. fillSearchForm(page, config) → page.type(), page.select()
6. submitForm(page) → page.click()
7. extractResults(page) → page.evaluate()
8. categorizeEmenta() → OpenAI
9. generateEmbedding() → OpenAI
10. upsertToPinecone() → Pinecone
```

**Problemas:**
- ❌ Cloudflare bloqueia
- ❌ CAPTCHA não resolve automaticamente
- ❌ Código complexo (~1300 linhas)
- ❌ Difícil de debugar

---

### **FLUXO NOVO (BQL):**

```
1. buildSearchVariables(buscaConfig, tribunal) → { searchTerm, dateStart, dateEnd }
2. executeBQLSearch(tribunal, variables) → HTTP POST com query GraphQL
   ├─ verify(type: cloudflare) → Resolve automaticamente
   ├─ removeVLibra → Remove widget
   ├─ type(selector, text) → Preenche formulário
   ├─ click(selector) → Submete
   └─ html { html } → Retorna HTML
3. saveDebugFiles(html, screenshot, tribunal) → Salva para debug
4. parseHTMLResults(html, tribunal, fieldsConfig) → JSDOM parsing
5. categorizeEmenta() → OpenAI (mantido)
6. generateEmbedding() → OpenAI (mantido)
7. upsertToPinecone() → Pinecone (mantido)
```

**Vantagens:**
- ✅ Cloudflare resolvido automaticamente
- ✅ Código simples (~600 linhas)
- ✅ Fácil de debugar (HTML salvo)
- ✅ Screenshots automáticos

---

## 📝 IMPLEMENTAÇÃO PASSO A PASSO

### **Fase 1: Preparação** ✅

- [x] Criar `STJ/lib/browserless-bql.js` com queries
- [x] Criar `STJ/tests/test-bql-integration.js` para testes
- [x] Atualizar imports no `index.js`

---

### **Fase 2: Novas Funções BQL** ⏳

#### **2.1. `buildSearchVariables(buscaConfig, tribunal)`**

```javascript
/**
 * Constrói variáveis para query BQL baseado em busca.json
 */
function buildSearchVariables(buscaConfig, tribunal) {
  const searchTerm = buscaConfig["Pesquisa livre"] || buscaConfig["pesquisa_livre"] || "";
  
  // STJ usa datas, TFR não
  if (tribunal === "STJ") {
    return {
      searchTerm,
      dateStart: buscaConfig["Data de publicação inicial"] || "",
      dateEnd: buscaConfig["Data de publicação final"] || ""
    };
  } else {
    return {
      searchTerm
    };
  }
}
```

---

#### **2.2. `executeBQLSearch(tribunal, variables)`**

```javascript
/**
 * Executa busca BQL para tribunal específico
 */
async function executeBQLSearch(tribunal, variables) {
  try {
    log(`🔍 Executando busca BQL para ${tribunal}...`, "INFO");
    log(`   Variáveis: ${JSON.stringify(variables)}`, "INFO");
    
    const query = tribunal === "STJ" ? STJ_SEARCH_QUERY : TFR_SEARCH_QUERY;
    const operationName = tribunal === "STJ" ? "STJSearch" : "TFRSearch";
    
    const result = await bqlClient.execute(query, operationName, variables);
    
    if (!result.data) {
      throw new Error("BQL retornou dados vazios");
    }
    
    log(`✅ Busca BQL concluída para ${tribunal}`, "SUCCESS");
    
    // Verificar se Cloudflare foi resolvido
    if (result.data.verify) {
      log(`🛡️ Cloudflare: ${result.data.verify.solved ? 'Resolvido ✅' : 'Não resolvido ❌'}`, "INFO");
      log(`   Tempo: ${result.data.verify.time}ms`, "INFO");
    }
    
    return result.data;
  } catch (error) {
    log(`❌ Erro ao executar busca BQL: ${error.message}`, "ERROR");
    throw error;
  }
}
```

---

#### **2.3. `saveDebugFiles(html, screenshot, tribunal)`**

```javascript
/**
 * Salva HTML e screenshot para debugging
 */
function saveDebugFiles(html, screenshot, tribunal) {
  try {
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
    
    // Salvar HTML
    if (html) {
      const htmlPath = path.join(SCRAP_DIR, `${tribunal.toLowerCase()}_${timestamp}.html`);
      fs.writeFileSync(htmlPath, html, 'utf-8');
      log(`📄 HTML salvo: ${htmlPath}`, "INFO");
    }
    
    // Salvar screenshot
    if (screenshot) {
      const screenshotPath = path.join(SCREENSHOT_DIR, `${tribunal.toLowerCase()}_${timestamp}.png`);
      const buffer = Buffer.from(screenshot, 'base64');
      fs.writeFileSync(screenshotPath, buffer);
      log(`📸 Screenshot salvo: ${screenshotPath}`, "INFO");
    }
  } catch (error) {
    log(`⚠️ Erro ao salvar arquivos de debug: ${error.message}`, "WARNING");
  }
}
```

---

#### **2.4. `parseHTMLResults(html, tribunal, fieldsConfig)`**

```javascript
/**
 * Extrai resultados do HTML usando JSDOM
 */
function parseHTMLResults(html, tribunal, fieldsConfig) {
  try {
    log(`📊 Extraindo resultados do HTML para ${tribunal}...`, "INFO");
    
    const dom = new JSDOM(html);
    const document = dom.window.document;
    
    const extraction = fieldsConfig.extraction || {};
    const results = [];
    
    // Seletores de extração do fields.json
    const containerSelector = extraction.container || "div.resultado";
    const containers = document.querySelectorAll(containerSelector);
    
    log(`   Encontrados ${containers.length} containers`, "INFO");
    
    containers.forEach((container, index) => {
      const result = {
        sigla_tribunal: tribunal
      };
      
      // Extrair cada campo usando seletores do fields.json
      Object.keys(extraction).forEach(key => {
        if (key === "container") return;
        
        const selector = extraction[key];
        const element = container.querySelector(selector);
        
        if (element) {
          result[key] = element.textContent.trim();
        }
      });
      
      results.push(result);
    });
    
    log(`✅ Extraídos ${results.length} resultados`, "SUCCESS");
    return results;
  } catch (error) {
    log(`❌ Erro ao extrair resultados: ${error.message}`, "ERROR");
    return [];
  }
}
```

---

### **Fase 3: Refatorar `main()`** ⏳

```javascript
async function main() {
  try {
    initLog();
    log("═══════════════════════════════════════════════════════", "INFO");
    log("=== INICIANDO SCRAPER STJ/TFR (BQL) ===", "INFO");
    log("═══════════════════════════════════════════════════════", "INFO");
    
    ensureDirectories();
    
    // Carregar configurações
    log("📂 Carregando configurações...", "INFO");
    const buscaConfig = loadConfig("busca.json");
    const fieldsConfig = loadConfig("fields.json");
    log("✅ Configurações carregadas", "SUCCESS");
    
    // Verificar Pinecone
    log("🔍 Verificando índice Pinecone...", "INFO");
    const pineconeReady = await ensurePineconeIndex();
    if (!pineconeReady) {
      throw new Error("Falha ao verificar/criar índice Pinecone");
    }
    
    // Determinar tribunais
    const tribunalConfig = buscaConfig.tribunal || "";
    let tribunais = tribunalConfig.split(";").map(t => t.trim()).filter(t => t);
    if (tribunais.length === 0) {
      tribunais = ["STJ", "TFR"];
    }
    log(`📋 Tribunais a processar: ${tribunais.join(", ")}`, "INFO");
    
    // Processar cada tribunal
    for (const tribunal of tribunais) {
      log("", "INFO");
      log("═══════════════════════════════════════════════════════", "INFO");
      log(`📋 PROCESSANDO TRIBUNAL: ${tribunal}`, "INFO");
      log("═══════════════════════════════════════════════════════", "INFO");
      
      try {
        // 1. Construir variáveis BQL
        const variables = buildSearchVariables(buscaConfig, tribunal);
        
        // 2. Executar busca BQL
        const bqlResult = await executeBQLSearch(tribunal, variables);
        
        // 3. Salvar arquivos de debug
        saveDebugFiles(bqlResult.html?.html, bqlResult.screenshot?.base64, tribunal);
        
        // 4. Extrair resultados do HTML
        const results = parseHTMLResults(bqlResult.html?.html, tribunal, fieldsConfig);
        
        if (results.length === 0) {
          log(`⚠️ Nenhum resultado encontrado para ${tribunal}`, "WARNING");
          continue;
        }
        
        log(`📊 Processando ${results.length} resultados...`, "INFO");
        
        // 5. Processar cada resultado (OpenAI + Pinecone)
        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          
          log("", "INFO");
          log(`─────────────────────────────────────────────────────`, "INFO");
          log(`📄 Processando resultado ${i + 1}/${results.length}`, "INFO");
          log(`   Processo: ${result.numero_processo || "N/A"}`, "INFO");
          log(`   Tribunal: ${result.sigla_tribunal}`, "INFO");
          
          try {
            // Categorizar ementa
            const categoriaData = await categorizeEmenta(result.ementa || "");
            
            // Gerar embedding
            const embedding = await generateEmbedding(result.ementa || "");
            
            if (!embedding) {
              log(`⚠️ Falha ao gerar embedding - pulando resultado`, "WARNING");
              continue;
            }
            
            // Preparar metadata
            const metadata = {
              numero_processo: result.numero_processo || "",
              sigla_tribunal: result.sigla_tribunal,
              relator: result.relator || "",
              orgao_julgador: result.orgao_julgador || "",
              data_julgamento: result.data_julgamento || "",
              data_publicacao: result.data_publicacao || "",
              ementa: result.ementa || "",
              link_detalhes: result.link_detalhes || "",
              categoria: categoriaData.categoria || "",
              categoria_codigo: categoriaData.codigo || "",
            };
            
            // Upsert no Pinecone
            await upsertToPinecone(result.numero_processo, embedding, metadata);
            
            log(`✅ Resultado ${i + 1} processado com sucesso`, "SUCCESS");
          } catch (error) {
            log(`❌ Erro ao processar resultado ${i + 1}: ${error.message}`, "ERROR");
          }
        }
        
        log(`✅ Tribunal ${tribunal} processado com sucesso`, "SUCCESS");
      } catch (error) {
        log(`❌ Erro ao processar tribunal ${tribunal}: ${error.message}`, "ERROR");
      }
    }
    
    log("", "INFO");
    log("═══════════════════════════════════════════════════════", "SUCCESS");
    log("✅ SCRAPING CONCLUÍDO COM SUCESSO!", "SUCCESS");
    log("═══════════════════════════════════════════════════════", "SUCCESS");
    
  } catch (error) {
    log(`❌ Erro fatal: ${error.message}`, "ERROR");
    if (error.stack) log(error.stack, "ERROR");
  } finally {
    closeLog();
  }
}

// Executar
main();
```

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

- [ ] Adicionar dependência `jsdom` no `package.json`
- [ ] Criar função `buildSearchVariables()`
- [ ] Criar função `executeBQLSearch()`
- [ ] Criar função `saveDebugFiles()`
- [ ] Criar função `parseHTMLResults()`
- [ ] Refatorar função `main()`
- [ ] Remover funções antigas de Puppeteer/CAPTCHA
- [ ] Testar com `node STJ/index.js`
- [ ] Validar resultados no Pinecone
- [ ] Atualizar documentação

---

## 🎯 PRÓXIMO PASSO

**Executar teste BQL primeiro para validar HTML retornado:**

```bash
node STJ/tests/test-bql-integration.js stj
```

**Depois analisar HTML para identificar seletores corretos e atualizar `fields.json`.**

