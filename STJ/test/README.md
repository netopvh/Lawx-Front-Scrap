# 🧪 Testes - STJ/TFR Scraper

Esta pasta contém scripts de teste e validação do scraper STJ/TFR.

## 📋 Índice

- [Testes de CAPTCHA](#testes-de-captcha)
- [Testes de Cloudflare](#testes-de-cloudflare)
- [Testes de Configuração](#testes-de-configuração)
- [Como Usar](#como-usar)

---

## 🔐 Testes de CAPTCHA

### `test-captcha.js`
**Propósito:** Testar resolução de reCAPTCHA v2 pelo Scrapeless.

**Uso:**
```bash
node test/test-captcha.js
```

**Testa:**
- Conexão ao Scrapeless
- Navegação para página de teste com reCAPTCHA v2
- Detecção automática de CAPTCHA
- Resolução automática pelo Scrapeless

**Resultado esperado:**
- ✅ reCAPTCHA v2 resolvido em ~5-10 segundos
- Screenshot salvo: `scrapeless-reCAPTCHA_V2-screenshot.png`

**Quando usar:**
- Para verificar se Scrapeless está resolvendo CAPTCHAs
- Para validar que a API key está funcionando
- Para testar antes de executar o scraper principal

---

## ☁️ Testes de Cloudflare

### `test-scrapeless-example.js`
**Propósito:** Testar resolução de Cloudflare Turnstile em site de exemplo.

**Uso:**
```bash
node test/test-scrapeless-example.js
```

**Testa:**
- Cloudflare Turnstile em site de exemplo (scrapingcourse.com)
- Detecção automática de Cloudflare
- Resolução automática pelo Scrapeless

**Resultado esperado:**
- ✅ Cloudflare resolvido em ~20 segundos
- Screenshot salvo: `scrapeless-example-test.png`

**Quando usar:**
- Para verificar se Scrapeless suporta Cloudflare Turnstile
- Para validar que o solver está funcionando
- Para comparar com resultados do STJ

---

### `test-cloudflare-simple.js`
**Propósito:** Testar Cloudflare no STJ sem proxy.

**Uso:**
```bash
node test/test-cloudflare-simple.js
```

**Testa:**
- Cloudflare no STJ sem proxy BR
- Detecção de Cloudflare
- Tentativa de resolução

**Resultado esperado:**
- ❌ Cloudflare detectado mas NÃO resolvido (STJ requer proxy BR)
- Screenshot salvo: `cloudflare-simple-test.png`

**Quando usar:**
- Para confirmar que STJ requer proxy BR
- Para diagnosticar problemas de Cloudflare

---

### `test-cloudflare-bypass.js`
**Propósito:** Testar técnicas avançadas de bypass de Cloudflare.

**Uso:**
```bash
node test/test-cloudflare-bypass.js
```

**Testa:**
- Técnicas anti-detecção customizadas
- Cloudflare com configurações avançadas

**Resultado esperado:**
- ❌ Cloudflare detectado mas NÃO resolvido (técnicas customizadas quebram solver)

**Quando usar:**
- Para validar que técnicas anti-detecção customizadas NÃO funcionam
- Para entender por que o solver falha com anti-detecção

---

## ⚙️ Testes de Configuração

### `test-stj-with-proxy.js`
**Propósito:** Testar STJ com proxy BR SEM técnicas anti-detecção.

**Uso:**
```bash
node test/test-stj-with-proxy.js
```

**Testa:**
- Proxy BR ativado
- Geolocation São Paulo, Brasil
- SEM técnicas anti-detecção customizadas

**Resultado esperado:**
- ✅ Cloudflare resolvido em ~20-40 segundos
- Screenshot salvo: `stj-with-proxy-test.png`

**Quando usar:**
- Para validar configuração ideal do STJ
- Para confirmar que proxy BR + sem anti-detecção funciona

---

### `test-stj-no-antidetect.js`
**Propósito:** Testar STJ com proxy BR explicitamente SEM anti-detecção.

**Uso:**
```bash
node test/test-stj-no-antidetect.js
```

**Testa:**
- Proxy BR ativado
- Geolocation São Paulo, Brasil
- Confirmação de que NÃO há técnicas anti-detecção

**Resultado esperado:**
- ✅ Cloudflare resolvido em ~40 segundos
- Screenshot salvo: `stj-no-antidetect-test.png`

**Quando usar:**
- Para validar que ausência de anti-detecção é essencial
- Para comparar com teste que usa anti-detecção

---

### `test-stj-full-config.js`
**Propósito:** Testar STJ com proxy BR + técnicas anti-detecção customizadas.

**Uso:**
```bash
node test/test-stj-full-config.js
```

**Testa:**
- Proxy BR ativado
- Geolocation São Paulo, Brasil
- COM técnicas anti-detecção customizadas (navigator.webdriver, etc.)

**Resultado esperado:**
- ❌ Cloudflare detectado mas NUNCA resolvido (timeout 90s)
- Screenshot salvo: `stj-full-config-test.png`

**Quando usar:**
- Para demonstrar que técnicas anti-detecção QUEBRAM o solver
- Para validar que NÃO devemos usar anti-detecção customizada

---

### `test-url.js`
**Propósito:** Testar diferentes URLs do STJ.

**Uso:**
```bash
node test/test-url.js
```

**Testa:**
- URL raiz do STJ
- URL de pesquisa
- URL de jurisprudência (toc.jsp)

**Resultado esperado:**
- Todas as URLs apresentam Cloudflare Turnstile

**Quando usar:**
- Para verificar quais URLs têm Cloudflare
- Para testar diferentes endpoints do STJ

---

## 📁 Arquivos de Dados

### Screenshots de Teste
- `scrapeless-reCAPTCHA_V2-screenshot.png` - reCAPTCHA v2 resolvido
- `scrapeless-example-test.png` - Cloudflare em site de exemplo
- `cloudflare-simple-test.png` - Cloudflare no STJ sem proxy
- `stj-with-proxy-test.png` - STJ com proxy BR (✅ funciona)
- `stj-no-antidetect-test.png` - STJ sem anti-detecção (✅ funciona)
- `stj-full-config-test.png` - STJ com anti-detecção (❌ quebra)
- `test-root.png` - URL raiz do STJ
- `test-toc.jsp.png` - URL de jurisprudência
- `test-pesquisar.jsp.png` - URL de pesquisa

---

## 🚀 Como Usar

### **Workflow Recomendado**

#### 1. Verificar suporte a CAPTCHA:
```bash
# Testar reCAPTCHA v2
node test/test-captcha.js

# Testar Cloudflare Turnstile
node test/test-scrapeless-example.js
```

#### 2. Validar configuração ideal:
```bash
# Testar STJ com proxy BR (deve funcionar)
node test/test-stj-with-proxy.js

# Testar STJ sem anti-detecção (deve funcionar)
node test/test-stj-no-antidetect.js
```

#### 3. Validar que anti-detecção quebra:
```bash
# Testar STJ com anti-detecção (deve falhar)
node test/test-stj-full-config.js
```

---

## 🔍 Descobertas Importantes

### ✅ **O QUE FUNCIONA**

1. **Proxy BR + Sem Anti-Detecção**
   - Cloudflare resolvido em ~20-40 segundos
   - Scrapeless usa suas próprias técnicas anti-detecção

2. **Geolocation São Paulo, Brasil**
   - Latitude: -23.5505
   - Longitude: -46.6333
   - Ajuda a evitar bloqueios regionais

3. **Timeout de 180 segundos**
   - Cloudflare Turnstile pode demorar até 145 segundos
   - Timeout de 120s é muito curto

### ❌ **O QUE NÃO FUNCIONA**

1. **Técnicas Anti-Detecção Customizadas**
   - navigator.webdriver override
   - chrome.runtime override
   - canvas fingerprinting
   - WebGL spoofing
   - **TODAS interferem com o solver do Scrapeless**

2. **Proxy Desativado**
   - STJ requer IP brasileiro
   - Sem proxy BR, Cloudflare nunca é resolvido

3. **Timeout Curto**
   - 120 segundos é insuficiente
   - Cloudflare pode demorar até 145 segundos

---

## 📝 Notas

- Todos os testes usam as mesmas variáveis de ambiente do `.env`
- Testes **NÃO** modificam dados de produção
- Screenshots são salvos na pasta `test/`
- Testes podem ser executados quantas vezes necessário
- **NÃO** são necessários para execução do scraper principal

---

## 🎯 Conclusão

**Configuração Ideal para STJ:**
- ✅ Proxy BR ativado (`SCRAPELESS_PROXY=TRUE`, `SCRAPELESS_PROXY_COUNTRY=BR`)
- ✅ Modo incognito ativado
- ✅ Geolocation São Paulo, Brasil
- ✅ Timeout de 180 segundos
- ❌ **SEM** técnicas anti-detecção customizadas

**Resultado:**
- Cloudflare Turnstile resolvido em ~20-145 segundos
- Taxa de sucesso: ~100%

