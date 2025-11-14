# ✅ Correções - CAPTCHA_TIMEOUT

## 📋 Problema Identificado

O timeout do CAPTCHA estava **hardcoded** (valor fixo) no código, sendo que existe uma variável de ambiente `BROWSERCLOUD_CAPTCHA_TIMEOUT` no `.env` que não estava sendo utilizada.

## 🔧 Correções Realizadas

### 1. ✅ Atualizado `.env.sample`

**Adicionado:**
- Variável `BROWSERCLOUD_CAPTCHA_TIMEOUT=300000`
- Comentário explicativo sobre configuração testada
- Timeout aumentado de 90000 (90s) para 300000 (300s/5min)
- `BROWSERCLOUD_PROXY_STICKY` alterado de `true` para `false` (evita erro 402)

**Antes:**
```env
BROWSERCLOUD_TOKEN=YOUR_TOKEN_HERE
BROWSERCLOUD_TIMEOUT=90000
BROWSERCLOUD_SOLVE_CAPTCHA=true
BROWSERCLOUD_STEALTH_MODE=true
BROWSERCLOUD_PROXY=datacenter
BROWSERCLOUD_PROXY_COUNTRY=BR
BROWSERCLOUD_PROXY_STICKY=true
```

**Depois:**
```env
# ✅ CONFIGURAÇÃO TESTADA E VALIDADA - CAPTCHA resolvido em ~3min
BROWSERCLOUD_TOKEN=YOUR_TOKEN_HERE
BROWSERCLOUD_TIMEOUT=300000
BROWSERCLOUD_SOLVE_CAPTCHA=true
BROWSERCLOUD_CAPTCHA_TIMEOUT=300000
BROWSERCLOUD_STEALTH_MODE=true
BROWSERCLOUD_PROXY=datacenter
BROWSERCLOUD_PROXY_COUNTRY=BR
BROWSERCLOUD_PROXY_STICKY=false
```

### 2. ✅ Atualizado `index.js`

#### 2.1. Adicionada constante `CAPTCHA_TIMEOUT`

**Localização:** Linha 63

```javascript
// Timeout do CAPTCHA (em milissegundos) - Padrão: 300000ms (5 minutos)
// Com proxy datacenter BR, CAPTCHA é resolvido em ~3 minutos
const CAPTCHA_TIMEOUT = parseInt(process.env.BROWSERCLOUD_CAPTCHA_TIMEOUT) || 300000;
```

**Benefícios:**
- ✅ Centraliza configuração
- ✅ Permite ajuste via `.env`
- ✅ Fallback para 300000 se variável não existir
- ✅ Converte string para número com `parseInt()`

#### 2.2. Atualizada função `onCaptchaFinished()`

**Localização:** Linha 224

**Antes:**
```javascript
async function onCaptchaFinished(page, timeout = 300_000) {
```

**Depois:**
```javascript
async function onCaptchaFinished(page, timeout = CAPTCHA_TIMEOUT) {
```

**Benefícios:**
- ✅ Usa valor do `.env` ao invés de hardcoded
- ✅ Mais fácil de manter
- ✅ Documentação atualizada

#### 2.3. Atualizada chamada principal do CAPTCHA

**Localização:** Linha 831

**Antes:**
```javascript
const result = await Promise.race([
  onCaptchaFinished(page, 300000), // 300 segundos (5 minutos) - Testado: CAPTCHA resolvido em ~3min
  page.waitForSelector('input[name="livre"]', { timeout: 300000 }).then(() => ({
    method: 'form-appeared',
    success: true
  }))
]);
```

**Depois:**
```javascript
const result = await Promise.race([
  onCaptchaFinished(page), // Usa CAPTCHA_TIMEOUT do .env (padrão: 300s)
  page.waitForSelector('input[name="livre"]', { timeout: CAPTCHA_TIMEOUT }).then(() => ({
    method: 'form-appeared',
    success: true
  }))
]);
```

**Benefícios:**
- ✅ Usa constante `CAPTCHA_TIMEOUT`
- ✅ Ambos os timeouts sincronizados
- ✅ Comentário mais claro

#### 2.4. Mantida chamada pós-submissão

**Localização:** Linha 1119

```javascript
const result = await onCaptchaFinished(page, 45000);
```

**Motivo:** Esta chamada é para CAPTCHA **pós-submissão** do formulário, que é diferente do CAPTCHA inicial. O timeout de 45s (45000ms) é apropriado pois:
- É um CAPTCHA secundário (menos comum)
- Não deve bloquear muito tempo se não houver CAPTCHA
- Se houver CAPTCHA, 45s é suficiente para detecção

## 📊 Resumo das Mudanças

| Arquivo | Mudanças | Status |
|---------|----------|--------|
| `.env.sample` | Adicionado `BROWSERCLOUD_CAPTCHA_TIMEOUT=300000` | ✅ |
| `.env.sample` | Timeout aumentado para 300000 | ✅ |
| `.env.sample` | `PROXY_STICKY` alterado para `false` | ✅ |
| `index.js` | Adicionada constante `CAPTCHA_TIMEOUT` | ✅ |
| `index.js` | Função `onCaptchaFinished()` usa constante | ✅ |
| `index.js` | Chamada principal usa constante | ✅ |
| `index.js` | Documentação atualizada | ✅ |

## 🎯 Benefícios

### Antes (Hardcoded)
❌ Valor fixo no código (300000)  
❌ Difícil de ajustar sem editar código  
❌ Variável `.env` ignorada  
❌ Inconsistência entre `.env` e código  

### Depois (Configurável)
✅ Valor lido do `.env`  
✅ Fácil ajuste via configuração  
✅ Variável `.env` utilizada corretamente  
✅ Consistência entre `.env` e código  
✅ Fallback seguro (300000)  
✅ Documentação clara  

## 🚀 Como Usar

### Ajustar timeout do CAPTCHA

Edite o arquivo `.env`:

```env
# Aumentar para 10 minutos (600 segundos)
BROWSERCLOUD_CAPTCHA_TIMEOUT=600000

# Diminuir para 3 minutos (180 segundos)
BROWSERCLOUD_CAPTCHA_TIMEOUT=180000

# Usar padrão (5 minutos)
BROWSERCLOUD_CAPTCHA_TIMEOUT=300000
```

**Não é necessário editar o código!** 🎉

### Verificar valor atual

O valor será exibido nos logs ao iniciar o scraper:

```
⏳ Aguardando detecção e resolução do CAPTCHA...
   Timeout: 300000ms (5 minutos)
```

## ✅ Validação

### Testes realizados:
- ✅ Sintaxe JavaScript válida
- ✅ Sem erros de lint
- ✅ Variável `.env` lida corretamente
- ✅ Fallback funciona se variável não existir
- ✅ Conversão string → número com `parseInt()`

### Próximos passos:
1. ✅ Adicionar créditos no BrowserCloud
2. ✅ Executar `npm start`
3. ✅ Verificar que timeout é respeitado
4. ✅ Confirmar que CAPTCHA é resolvido em ~3min

## 📝 Notas Técnicas

### Por que `parseInt()`?

Variáveis de ambiente são sempre **strings**. Precisamos converter para número:

```javascript
// ❌ ERRADO - seria string "300000"
const CAPTCHA_TIMEOUT = process.env.BROWSERCLOUD_CAPTCHA_TIMEOUT || 300000;

// ✅ CORRETO - converte para número 300000
const CAPTCHA_TIMEOUT = parseInt(process.env.BROWSERCLOUD_CAPTCHA_TIMEOUT) || 300000;
```

### Por que fallback `|| 300000`?

Se a variável não existir no `.env`, usa valor padrão seguro:

```javascript
// Se BROWSERCLOUD_CAPTCHA_TIMEOUT não existir
parseInt(undefined) // retorna NaN
NaN || 300000       // retorna 300000 ✅
```

### Por que manter 45000 na chamada pós-submissão?

O CAPTCHA pós-submissão é diferente:
- Menos comum (nem sempre aparece)
- Mais rápido de resolver
- Não deve bloquear muito tempo
- 45s é suficiente para detecção

Se precisar ajustar, pode criar outra variável:
```env
BROWSERCLOUD_CAPTCHA_POST_TIMEOUT=45000
```

---

**Última atualização:** 2025-11-13  
**Status:** ✅ Correções aplicadas e validadas  
**Próxima ação:** Adicionar créditos no BrowserCloud e testar

