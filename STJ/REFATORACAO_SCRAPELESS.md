# 🔄 Refatoração: Retorno ao Scrapeless

**Data:** 2025-11-12  
**Autor:** Sulivan Leite

---

## 📋 Resumo

O projeto STJ foi **refatorado para usar novamente o Scrapeless Cloud Browser**, comentando todas as referências ao Browserless que haviam sido adicionadas anteriormente.

---

## ✅ Mudanças Realizadas

### 1. **Arquivo `.env`**
- ✅ **Descomentado** todas as variáveis do Scrapeless
- ✅ **Comentado** todas as variáveis do Browserless
- ✅ Mantidas as credenciais originais

**Antes:**
```env
# Browserless API Configuration
BROWSERLESS_API_KEY=2TPCMF0Mpi093n3a0b2b9e1c244f04627f11da25d5f90b4b9
BROWSERLESS_REGION=production-sfo

# Scrapeless API Configuration (DEPRECATED - Migrado para Browserless)
# SCRAPELESS_TOKEN=sk_qiOPUBP6qRATPOViVy5RRAbjWqs9uYS7YeiedOdL2g10Lc0iDPmABWDMWLRPESfF
# SCRAPELESS_PROXY=FALSE
# ...
```

**Depois:**
```env
# Scrapeless API Configuration
SCRAPELESS_TOKEN=sk_qiOPUBP6qRATPOViVy5RRAbjWqs9uYS7YeiedOdL2g10Lc0iDPmABWDMWLRPESfF
SCRAPELESS_PROXY=FALSE
SCRAPELESS_PROXY_COUNTRY=BR
# ...

# Browserless API Configuration (DEPRECATED - Voltando para Scrapeless)
# BROWSERLESS_API_KEY=2TPCMF0Mpi093n3a0b2b9e1c244f04627f11da25d5f90b4b9
# BROWSERLESS_REGION=production-sfo
```

### 2. **Arquivo `README.md`**
- ✅ Adicionada nota informando sobre a refatoração
- ✅ Documentação já estava correta (sempre mencionou Scrapeless)

**Nota adicionada:**
```markdown
> **📝 NOTA:** Este projeto foi refatorado para usar **Scrapeless** novamente. 
> O código relacionado ao **Browserless** foi comentado no arquivo `.env`.
```

### 3. **Código-fonte (`index.js`)**
- ✅ **Nenhuma mudança necessária** - o código já estava usando Scrapeless
- ✅ Não havia nenhuma referência ao Browserless no código
- ✅ Função `connectBrowser()` já estava configurada para Scrapeless

### 4. **Arquivo `.env.sample`**
- ✅ **Nenhuma mudança necessária** - já estava correto com Scrapeless

### 5. **Dependências (`package.json`)**
- ✅ **Nenhuma mudança necessária** - dependências corretas
- ✅ Usa `puppeteer-core` (compatível com Scrapeless)

---

## 🔍 Verificações Realizadas

### Busca por referências ao Browserless:
```powershell
Get-ChildItem -Path "STJ" -Recurse -File | Select-String -Pattern "browserless|BROWSERLESS"
```

**Resultado:**
- ✅ Apenas no arquivo `.env` (agora comentado)
- ✅ Alguns logs antigos (não precisam ser modificados)
- ✅ Nenhuma referência no código-fonte

---

## 🎯 Configuração Atual do Scrapeless

### Variáveis de Ambiente:
```env
SCRAPELESS_TOKEN=sk_qiOPUBP6qRATPOViVy5RRAbjWqs9uYS7YeiedOdL2g10Lc0iDPmABWDMWLRPESfF
SCRAPELESS_PROXY=FALSE
SCRAPELESS_PROXY_COUNTRY=BR
SCRAPELESS_SESSION_RECORDING=true
SCRAPELESS_SESSION_TTL=900
SCRAPELESS_SESSION_NAME=STJ Scraper
PUPPETEER_EVERY_PAGE_ANONIMOUS=FALSE
```

### Conexão WebSocket:
```javascript
const connectionURL = `wss://browser.scrapeless.com/api/v2/browser?${query.toString()}`;

const browser = await puppeteer.connect({
  browserWSEndpoint: connectionURL,
  defaultViewport: null,
  ignoreHTTPSErrors: true,
});
```

---

## 📊 Status do Projeto

### ✅ Funcionalidades Mantidas:
- ✅ Conexão com Scrapeless Cloud Browser
- ✅ Detecção de CAPTCHA (Cloudflare Turnstile)
- ✅ Listeners CDP para eventos de CAPTCHA
- ✅ Screenshots periódicos durante resolução
- ✅ Suporte a proxy (configurável)
- ✅ Modo incognito (configurável)
- ✅ Fingerprint customizado
- ✅ Geolocalização (São Paulo, Brasil)

### ⚠️ Problema Conhecido:
- **Cloudflare Turnstile** ainda bloqueia o acesso
- Scrapeless **detecta** mas **não resolve** automaticamente
- Página fica presa em "Just a moment..."

---

## 🚀 Como Usar

```bash
# 1. Instalar dependências
npm install

# 2. Configurar .env (já está configurado com Scrapeless)
# Verificar se SCRAPELESS_TOKEN está correto

# 3. Executar
npm start
```

---

## 📝 Próximos Passos

1. **Testar conexão com Scrapeless:**
   ```bash
   node test/test-scrapeless-example.js
   ```

2. **Verificar se CAPTCHA é detectado:**
   - Executar `npm start`
   - Verificar logs para eventos CDP de CAPTCHA
   - Analisar screenshots gerados

3. **Soluções alternativas para Cloudflare:**
   - Investigar API oficial do STJ
   - Considerar FlareSolverr
   - Avaliar serviços pagos (2Captcha, Anti-Captcha)

---

## 📚 Referências

- **Scrapeless Docs:** https://docs.scrapeless.com/
- **Puppeteer Core:** https://pptr.dev/
- **Cloudflare Turnstile:** https://developers.cloudflare.com/turnstile/

---

**✅ Refatoração concluída com sucesso!**

