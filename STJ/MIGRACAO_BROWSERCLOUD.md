# 🔄 Migração: Scrapeless → BrowserCloud.io

**Data:** 2025-11-12  
**Autor:** Sulivan Leite  
**Motivo:** Scrapeless sem saldo

---

## 📋 Sobre o BrowserCloud.io

**BrowserCloud.io** é uma alternativa ao Scrapeless que oferece:

### ✨ Recursos Principais:
- ✅ **Bypass de CAPTCHA automático** (reCAPTCHA, FunCaptcha, GeeTest, **Cloudflare Turnstile**)
- ✅ **Stealth Mode** para evitar detecção de bots
- ✅ **Proxy Pool** com 100M+ IPs de 195 países
- ✅ **Datacenter Proxies** (70M IPs rápidos)
- ✅ **Residential Proxies** (premium para sites difíceis)
- ✅ **Context & Cache** para persistência de sessão
- ✅ **Compatível com Puppeteer** (mesma API)
- ✅ **Free Trial** disponível

### 🎯 Vantagens para o STJ:
- ✅ **Resolve Cloudflare Turnstile** automaticamente
- ✅ **Stealth Mode** reduz detecção de bot
- ✅ **Proxy BR** disponível
- ✅ **Mesma API do Puppeteer** (migração fácil)

---

## 🔧 Configuração

### 1. Obter Token (Free Trial)

1. **Acessar:** https://browsercloud.io/
2. **Criar conta** e obter API token
3. **Free Trial** disponível sem cartão de crédito

### 2. Configuração do `.env`

```env
# BrowserCloud API Configuration
BROWSERCLOUD_TOKEN=seu_token_aqui
BROWSERCLOUD_PROXY=datacenter
BROWSERCLOUD_PROXY_COUNTRY=BR
BROWSERCLOUD_SOLVE_CAPTCHA=true
BROWSERCLOUD_STEALTH_MODE=true
BROWSERCLOUD_TIMEOUT=60000
```

---

## 🔌 Conexão com Puppeteer

### Exemplo Básico:
```javascript
import puppeteer from "puppeteer-core";

const browser = await puppeteer.connect({
  browserWSEndpoint: `wss://chrome-v2.browsercloud.io?token=API_TOKEN`,
});
```

### Exemplo Completo (com todas as features):
```javascript
const queryParams = new URLSearchParams({
  token: process.env.BROWSERCLOUD_TOKEN,
  timeout: 60000,                    // 60 segundos
  solveCaptcha: true,                // ✅ Resolve CAPTCHA automaticamente
  stealthMode: true,                 // ✅ Modo stealth
  proxy: 'datacenter',               // datacenter ou residential
  proxyCountry: 'BR',                // Brasil
  proxySticky: true,                 // Mesmo IP durante sessão
  blockAds: true,                    // Bloquear anúncios
  blockCookieBanners: true,          // Aceitar cookies automaticamente
  context: 'stj-scraper',            // Persistir cookies entre sessões
}).toString();

const connectionURL = `wss://chrome-v2.browsercloud.io?${queryParams}`;

const browser = await puppeteer.connect({
  browserWSEndpoint: connectionURL,
  defaultViewport: null,
  ignoreHTTPSErrors: true,
});
```

---

## 📊 Parâmetros Disponíveis

| Parâmetro | Valores | Descrição |
|-----------|---------|-----------|
| `token` | `API_TOKEN` | **Obrigatório** - Token da API |
| `timeout` | `60000` (ms) | Timeout da sessão (padrão: 30s) |
| `solveCaptcha` | `true/false` | **Resolve CAPTCHA automaticamente** |
| `stealthMode` | `true/false` | Modo stealth anti-detecção |
| `proxy` | `datacenter`, `residential` | Tipo de proxy |
| `proxyCountry` | `BR`, `US`, `GB`, etc | País do proxy (ISO 2 letras) |
| `proxySticky` | `true/false` | Manter mesmo IP na sessão |
| `blockAds` | `true/false` | Bloquear anúncios (uBlock) |
| `blockCookieBanners` | `true/false` | Aceitar cookies automaticamente |
| `context` | `string` | ID único para persistir cookies |
| `cache` | `string` | ID único para persistir cache |
| `blockRes` | `image,media,font` | Recursos a bloquear (otimização) |

---

## 🎯 Configuração Recomendada para STJ

```javascript
const queryParams = new URLSearchParams({
  token: process.env.BROWSERCLOUD_TOKEN,
  timeout: 90000,                    // 90 segundos (STJ pode ser lento)
  solveCaptcha: true,                // ✅ ESSENCIAL para Cloudflare Turnstile
  stealthMode: true,                 // ✅ ESSENCIAL para evitar detecção
  proxy: 'datacenter',               // Datacenter é mais rápido
  proxyCountry: 'BR',                // Brasil (STJ é brasileiro)
  proxySticky: true,                 // Manter IP durante sessão
  blockCookieBanners: true,          // Aceitar cookies automaticamente
  context: 'stj-scraper',            // Persistir cookies entre execuções
  blockRes: 'image,media,font',      // Otimizar tráfego
}).toString();
```

---

## 💰 Custos

### Modelo de Créditos:
- **1 crédito** = 1 segundo de uso do browser
- **Free Trial** disponível
- **Pricing:** https://browsercloud.io/pricing

### Otimização de Custos:
- ✅ Use `blockRes=image,media,font` para reduzir tráfego
- ✅ Use `timeout` adequado (não muito alto)
- ✅ Feche o browser assim que terminar
- ✅ Use `datacenter` proxy (mais barato que `residential`)

---

## 🔍 CAPTCHAs Suportados

- ✅ **reCAPTCHA v2**
- ✅ **reCAPTCHA v3**
- ✅ **FunCaptcha**
- ✅ **GeeTest**
- ✅ **Cloudflare Turnstile** ⭐ (problema do STJ!)

---

## 🚀 Próximos Passos

1. ✅ Criar conta em https://browsercloud.io/
2. ✅ Obter API token
3. ✅ Atualizar `.env` com token
4. ✅ Atualizar `index.js` com nova conexão
5. ✅ Testar conexão
6. ✅ Testar scraper STJ

---

## 📚 Documentação

- **Site:** https://browsercloud.io/
- **Docs:** https://browsercloud.io/docs
- **Puppeteer:** https://browsercloud.io/docs/puppeteer
- **Launch Options:** https://browsercloud.io/docs/launch-options
- **Proxies:** https://browsercloud.io/docs/proxies

---

**✅ BrowserCloud.io é a solução ideal para resolver o problema do Cloudflare Turnstile no STJ!**

