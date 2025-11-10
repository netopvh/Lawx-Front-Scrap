# 🛡️ GUIA: Bypass de Cloudflare com Browserless BQL

**Data:** 2025-11-08  
**Branch:** `feature/stj-browserless-migration`  
**Documentação:** https://docs.browserless.io/browserql/bot-detection/solving-captchas

---

## 🎯 **OBJETIVO**

Resolver o bloqueio do Cloudflare Turnstile/Challenge na página do STJ usando BrowserQL.

---

## ⚠️ **REQUISITOS OBRIGATÓRIOS**

### **1. Proxy Residencial ATIVADO**

O Browserless **EXIGE** proxy residencial para resolver Cloudflare. Sem proxy residencial, o `verify` mutation **NÃO FUNCIONA**.

**Como ativar no Dashboard:**

1. Acesse: https://www.browserless.io/playground
2. Clique no botão **⚙️ Settings** (canto superior direito)
3. Procure por **"Residential Proxy"** ou **"Proxy"**
4. Ative a opção **"Enable Residential Proxy"**
5. Selecione país: **BR (Brasil)**
6. Clique **Save**

**Como ativar na Query BQL:**

```graphql
mutation Example {
  # Ativar proxy residencial do Brasil
  proxy(url: "*", country: BR) {
    time
  }
  
  # ... resto da query
}
```

---

## 🔍 **TIPOS DE PROTEÇÃO CLOUDFLARE**

O Cloudflare usa **2 tipos** de proteção que precisam ser tratados de forma diferente:

### **Tipo 1: Cloudflare Challenge Page**

**Identificação:**
- Página mostra "Checking your browser..."
- Título: "Just a moment..."
- URL contém `cloudflare.com`
- Seletor: `a[href*="cloudflare.com"]`

**Solução:**
```graphql
# Detectar Challenge Page
waitForSelector(selector: "a[href*='cloudflare.com']", timeout: 1000) {
  time
}

# Se detectado, resolver
if(selector: "a[href*='cloudflare.com']") {
  verify(type: cloudflare, timeout: 30000) {
    found
    solved
    time
  }
  
  # Aguardar navegação após resolução
  waitForNavigation(waitUntil: networkIdle, timeout: 30000) {
    status
    time
  }
}
```

---

### **Tipo 2: Cloudflare Turnstile**

**Identificação:**
- Widget de verificação embutido na página
- Checkbox "Verify you are human"
- Seletor: `.cf-turnstile` ou `iframe[src*='challenges.cloudflare.com']`

**Solução:**
```graphql
# Detectar Turnstile
waitForSelector(selector: ".cf-turnstile", timeout: 1000) {
  time
}

# Se detectado, resolver
if(selector: ".cf-turnstile") {
  verify(type: cloudflare, timeout: 30000) {
    found
    solved
    time
  }
  
  # Aguardar 2 segundos após resolução
  waitForTimeout(time: 2000) {
    time
  }
}
```

---

## 📝 **QUERY BQL COMPLETA PARA STJ**

Arquivo: `STJ/browserql/test-captcha-detection.bql`

**Fluxo da Query:**

```
1. Ativar proxy residencial (BR)
   ↓
2. Navegar para STJ
   ↓
3. Detectar Cloudflare Challenge Page?
   ├─ SIM → Resolver com verify() → Aguardar navegação
   └─ NÃO → Continuar
   ↓
4. Detectar Cloudflare Turnstile?
   ├─ SIM → Resolver com verify() → Aguardar 2s
   └─ NÃO → Continuar
   ↓
5. Detectar reCAPTCHA? (fallback)
   ├─ SIM → Resolver com solve()
   └─ NÃO → Continuar
   ↓
6. Aguardar formulário carregar (input[name="livre"])
   ↓
7. Validar que formulário carregou
   ↓
8. Capturar screenshot e HTML
```

---

## 🧪 **COMO TESTAR NO DASHBOARD**

### **Passo 1: Configurar Dashboard**

1. Acesse: https://www.browserless.io/playground
2. Faça login com suas credenciais
3. Clique em **⚙️ Settings**
4. Configure:
   - **API Key:** `05da69a8-cd79-48f8-bf69-4d7eb4ea5bf5`
   - **Residential Proxy:** ✅ ATIVADO
   - **Country:** BR (Brasil)
5. Clique **Save**

---

### **Passo 2: Copiar Query**

1. Abra o arquivo: `STJ/browserql/test-captcha-detection.bql`
2. Copie **TODO** o conteúdo (186 linhas)
3. Cole no editor do dashboard

---

### **Passo 3: Executar**

1. Clique no botão **▶️ Run**
2. Aguarde execução (~30-60 segundos)
3. Observe os logs no painel direito

---

### **Passo 4: Analisar Resultados**

#### **✅ SUCESSO - Cloudflare Resolvido**

**Logs esperados:**
```json
{
  "verifyChallenge": {
    "found": true,
    "solved": true,
    "time": 5234
  },
  "formValidation": {
    "formLoaded": true,
    "found": 4,
    "total": 4,
    "missing": "none",
    "pageTitle": "STJ - Pesquisa de Jurisprudência",
    "currentUrl": "https://scon.stj.jus.br/SCON/jurisprudencia/toc.jsp"
  },
  "pageTitle": {
    "title": "STJ - Pesquisa de Jurisprudência"
  }
}
```

**Screenshot mostrará:**
- ✅ Formulário de pesquisa avançada do STJ
- ✅ Campos: `input[name="livre"]`, `select[name="b"]`, etc.
- ✅ Título diferente de "Just a moment..."

---

#### **❌ FALHA - Cloudflare NÃO Resolvido**

**Logs esperados:**
```json
{
  "verifyChallenge": {
    "found": true,
    "solved": false,
    "time": 30000
  },
  "formValidation": {
    "formLoaded": false,
    "found": 0,
    "total": 4,
    "missing": "tribunal, livre, processo, submitButton",
    "pageTitle": "Just a moment...",
    "currentUrl": "https://scon.stj.jus.br/SCON/jurisprudencia/toc.jsp"
  },
  "pageTitle": {
    "title": "Just a moment..."
  }
}
```

**Screenshot mostrará:**
- ❌ Página de challenge do Cloudflare
- ❌ Mensagem "Checking your browser..."
- ❌ Formulário STJ não carregado

**Possíveis causas:**
1. ❌ Proxy residencial **NÃO ATIVADO** (causa mais comum)
2. ❌ Timeout muito curto (aumentar para 60000ms)
3. ❌ Cloudflare detectou automação (usar stealth mode)
4. ❌ IP do proxy bloqueado (trocar região do proxy)

---

## 🔧 **TROUBLESHOOTING**

### **Problema 1: "Proxy residencial não ativado"**

**Erro:**
```json
{
  "error": "Residential proxy is required for Cloudflare verification"
}
```

**Solução:**
1. Verifique se ativou proxy nas configurações do dashboard
2. Verifique se a query tem `proxy(url: "*", country: BR)`
3. Tente trocar país: `country: US` ou `country: GB`

---

### **Problema 2: "Timeout ao resolver Cloudflare"**

**Erro:**
```json
{
  "verifyChallenge": {
    "found": true,
    "solved": false,
    "time": 30000
  }
}
```

**Solução:**
1. Aumentar timeout: `verify(type: cloudflare, timeout: 60000)`
2. Adicionar `waitForTimeout` antes do verify:
   ```graphql
   waitForTimeout(time: 3000) { time }
   verify(type: cloudflare, timeout: 60000) { ... }
   ```

---

### **Problema 3: "Formulário não carrega após resolver Cloudflare"**

**Erro:**
```json
{
  "formValidation": {
    "formLoaded": false,
    "pageTitle": "STJ - Pesquisa de Jurisprudência"
  }
}
```

**Solução:**
1. Aumentar timeout do `waitForSelector`:
   ```graphql
   waitForForm: waitForSelector(selector: "input[name='livre']", timeout: 30000)
   ```
2. Adicionar `waitForNavigation` após verify:
   ```graphql
   verify(type: cloudflare) { ... }
   waitForNavigation(waitUntil: networkIdle, timeout: 30000) { ... }
   ```

---

## 📊 **COMPARAÇÃO: verify vs solve**

| Aspecto | `verify` | `solve` |
|---------|----------|---------|
| **Uso** | Cloudflare Turnstile/Challenge | reCAPTCHA, hCaptcha |
| **Custo** | ✅ Grátis (sem custo de unidades) | ❌ Pago (consome unidades) |
| **Proxy** | ⚠️ Obrigatório (residencial) | ✅ Opcional |
| **Timeout** | ~5-30 segundos | ~30-60 segundos |
| **Auto-detect** | ❌ Não (precisa especificar `type: cloudflare`) | ✅ Sim (detecta automaticamente) |

---

## 🚀 **PRÓXIMOS PASSOS**

### **Se Cloudflare for resolvido com sucesso:**

1. ✅ Atualizar código `STJ/index.js` para usar Browserless
2. ✅ Adicionar lógica de Cloudflare bypass no código Node.js
3. ✅ Testar scraping completo (STJ e TFR)
4. ✅ Documentar solução no CHANGELOG.md

### **Se Cloudflare NÃO for resolvido:**

1. ⚠️ Testar com diferentes regiões de proxy (US, GB, DE)
2. ⚠️ Testar com stealth mode adicional
3. ⚠️ Considerar usar Scrapeless (que funcionava antes)
4. ⚠️ Considerar usar solução híbrida (Browserless + Scrapeless)

---

## 📚 **REFERÊNCIAS**

- **Documentação Browserless:** https://docs.browserless.io/browserql/bot-detection/solving-captchas
- **Blog Bypass Cloudflare:** https://www.browserless.io/blog/bypass-cloudflare-with-puppeteer
- **BrowserQL Schema:** https://docs.browserless.io/api-reference/browserql-schema
- **Playground:** https://www.browserless.io/playground

---

**Teste agora e compartilhe os resultados!** 🚀

