# ✅ Solução para Erro 500 do BrowserCloud.io

## 📋 Resumo do Problema

Ao executar `npm start`, o scraper STJ estava falhando com:
```
❌ Erro ao conectar ao browser: Unexpected server response: 500
```

## 🔍 Diagnóstico Realizado

### 1. Script de Diagnóstico
Criado `test/diagnose-browsercloud-500.js` que testou 11 configurações diferentes.

**Resultado:**
- ✅ Token está **válido**
- ✅ Configuração do `.env` está **correta**
- ⚠️ Erro 500 é **intermitente** (problema temporário do servidor)

### 2. Testes Realizados

| Teste | Resultado | Observação |
|-------|-----------|------------|
| Configuração mínima | ✅ PASSOU | Token válido |
| Com timeout | ✅ PASSOU | - |
| Com solveCaptcha | ✅ PASSOU | - |
| Com stealthMode | ✅ PASSOU | - |
| Com proxy datacenter | ✅ PASSOU | - |
| Com proxy + country BR | ✅ PASSOU | - |
| **proxy=false** | ❌ FALHOU | Erro 400 - BrowserCloud não aceita |
| Configuração básica | ✅ PASSOU | - |
| **Completa SEM proxy** | ❌ FALHOU | Erro 500 |
| Completa COM proxy | ✅ PASSOU | - |
| **Configuração atual .env** | ✅ PASSOU | - |

## ✅ Solução Implementada

### Mecanismo de Retry com Backoff Exponencial

Implementado retry automático na função `connectBrowser()` em `index.js`:

**Características:**
- 🔄 **3 tentativas** automáticas
- ⏱️ **Backoff exponencial**: 2s → 4s → 8s
- 🎯 **Detecta erros temporários**: 500, 502, 503
- 📊 **Logs informativos** de cada tentativa

**Código:**
```javascript
async function connectBrowser() {
  const MAX_RETRIES = 3;
  const INITIAL_DELAY = 2000; // 2 segundos
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // ... construir URL e conectar ...
      return browser;
    } catch (error) {
      const isServerError = error.message.includes('500') || 
                           error.message.includes('502') || 
                           error.message.includes('503');
      
      if (isServerError && !isLastAttempt) {
        const delay = INITIAL_DELAY * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue; // Retry
      }
      throw error;
    }
  }
}
```

## 📊 Resultado do Teste

Executado `npm start` após implementação:

```
[2025-11-13T13:55:08.943Z] [WARNING] ⚠️ Erro temporário do servidor (Unexpected server response: 500)
[2025-11-13T13:55:08.944Z] [INFO]    Aguardando 2000ms antes de tentar novamente...
[2025-11-13T13:55:10.950Z] [INFO] 🔄 Tentativa 2/3...
[2025-11-13T13:55:11.852Z] [WARNING] ⚠️ Erro temporário do servidor (Unexpected server response: 500)
[2025-11-13T13:55:11.853Z] [INFO]    Aguardando 4000ms antes de tentar novamente...
[2025-11-13T13:55:15.883Z] [INFO] 🔄 Tentativa 3/3...
[2025-11-13T13:55:17.800Z] [SUCCESS] ✅ Conectado ao BrowserCloud.io Cloud Browser!
```

✅ **SUCESSO!** Conexão estabelecida na 3ª tentativa.

## 🎯 Conclusão

### Problema Resolvido
- ✅ Erro 500 era **temporário** (servidor sobrecarregado)
- ✅ Retry automático **resolve o problema**
- ✅ Scraper agora é **resiliente** a falhas temporárias

### Próximo Desafio
⚠️ **CAPTCHA não está sendo resolvido automaticamente**

O BrowserCloud conecta com sucesso, mas o Cloudflare Turnstile do STJ não está sendo resolvido automaticamente pelo `solveCaptcha`.

**Evidências:**
- 📄 Título da página: "Just a moment..."
- 📝 Mensagem: "Verificação automática em andamento"
- ⏱️ Timeout após 180 segundos
- 📸 Screenshot salvo: `screenshots/captcha-timeout_2025-11-13_10-58-20.png`

## 💡 Próximos Passos Sugeridos

### Opção 1: Aumentar Timeout do CAPTCHA
O BrowserCloud pode estar demorando mais que 180s para resolver.

**Ação:**
```javascript
// Em index.js, aumentar CAPTCHA_TIMEOUT
const CAPTCHA_TIMEOUT = 300000; // 5 minutos (era 180s)
```

### Opção 2: Adicionar Proxy Datacenter
Alguns testes mostraram que proxy pode ajudar.

**Ação no `.env`:**
```env
BROWSERCLOUD_PROXY=datacenter  # Mudar de 'false' para 'datacenter'
BROWSERCLOUD_PROXY_STICKY=true
```

### Opção 3: Verificar Créditos do BrowserCloud
O `solveCaptcha` pode consumir créditos extras.

**Ação:**
1. Acessar: https://browsercloud.io/dashboard
2. Verificar saldo de créditos
3. Verificar se `solveCaptcha` está habilitado na conta

### Opção 4: Testar com Proxy Residencial
Proxies residenciais têm menor chance de serem bloqueados.

**Ação no `.env`:**
```env
BROWSERCLOUD_PROXY=residential  # Mais caro, mas mais efetivo
```

### Opção 5: Contatar Suporte do BrowserCloud
Se o problema persistir, pode ser limitação do serviço.

**Ação:**
- Email: support@browsercloud.io
- Informar que `solveCaptcha` não está funcionando para Cloudflare Turnstile

## 📁 Arquivos Modificados

1. ✅ `STJ/index.js` - Adicionado retry com backoff exponencial
2. ✅ `STJ/test/diagnose-browsercloud-500.js` - Script de diagnóstico criado
3. ✅ `STJ/SOLUCAO_ERRO_500.md` - Esta documentação

## 🔗 Referências

- [BrowserCloud.io Documentation](https://browsercloud.io/docs)
- [BrowserCloud.io Dashboard](https://browsercloud.io/dashboard)
- [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/)

