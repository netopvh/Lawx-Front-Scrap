# ⚠️ PROBLEMA: Token Scrapeless Inválido

**Data:** 2025-11-12  
**Status:** 🔴 BLOQUEADO

---

## 🔍 Diagnóstico

### Erro Identificado:
```
❌ Erro ao conectar ao browser: Unexpected server response: 400
```

### Causa Raiz:
O **token do Scrapeless está inválido ou expirado**.

### Evidências:

1. **Todos os testes falharam** com erro 400:
   - ✅ Teste 1 (Mínimo): ❌ FALHOU
   - ✅ Teste 2 (Proxy BR): ❌ FALHOU
   - ✅ Teste 3 (Incognito): ❌ FALHOU
   - ✅ Teste 4 (Completo): ❌ FALHOU

2. **Token atual** (em todos os projetos):
   ```
   SCRAPELESS_TOKEN=sk_qiOPUBP6qRATPOViVy5RRAbjWqs9uYS7YeiedOdL2g10Lc0iDPmABWDMWLRPESfF
   ```

3. **Mesmo erro em todos os projetos**:
   - ❌ STJ: Erro 400
   - ❌ STF: Erro 400
   - ❌ TJSP: Erro 400 (presumido)

---

## 🔧 Soluções

### Solução 1: Obter Novo Token do Scrapeless ⭐ RECOMENDADO

1. **Acessar o painel do Scrapeless:**
   - URL: https://app.scrapeless.com/
   - Fazer login com suas credenciais

2. **Gerar novo token:**
   - Ir em "API Keys" ou "Settings"
   - Criar novo token ou regenerar o existente
   - Copiar o novo token

3. **Atualizar o token em todos os projetos:**
   ```bash
   # STJ
   nano STJ/.env
   # Atualizar linha: SCRAPELESS_TOKEN=sk_NOVO_TOKEN_AQUI
   
   # STF
   nano STF/.env
   # Atualizar linha: SCRAPELESS_TOKEN=sk_NOVO_TOKEN_AQUI
   
   # TJSP
   nano TJSP/.env
   # Atualizar linha: SCRAPELESS_TOKEN=sk_NOVO_TOKEN_AQUI
   ```

4. **Testar a conexão:**
   ```bash
   cd STJ
   node test/test-connection-simple.js
   ```

---

### Solução 2: Verificar Status da Conta Scrapeless

1. **Verificar se a conta está ativa:**
   - Login em https://app.scrapeless.com/
   - Verificar status da assinatura
   - Verificar se há créditos disponíveis

2. **Verificar limites de uso:**
   - Verificar se atingiu o limite de requisições
   - Verificar se a conta foi suspensa

---

### Solução 3: Usar Puppeteer Local (Temporário)

Se não conseguir obter um novo token imediatamente, pode usar Puppeteer local:

1. **Instalar Puppeteer completo:**
   ```bash
   npm install puppeteer
   ```

2. **Modificar o código para usar Puppeteer local:**
   ```javascript
   // Em vez de:
   const browser = await puppeteer.connect({
     browserWSEndpoint: connectionURL,
     defaultViewport: null,
     ignoreHTTPSErrors: true,
   });
   
   // Usar:
   const browser = await puppeteer.launch({
     headless: false,
     defaultViewport: null,
     ignoreHTTPSErrors: true,
   });
   ```

⚠️ **NOTA:** Puppeteer local **NÃO resolve CAPTCHA automaticamente**. Você terá que resolver manualmente.

---

## 📝 Checklist de Verificação

- [ ] Acessar painel do Scrapeless
- [ ] Verificar status da conta
- [ ] Verificar créditos disponíveis
- [ ] Gerar novo token
- [ ] Atualizar token em `.env` de todos os projetos (STJ, STF, TJSP)
- [ ] Testar conexão com `test-connection-simple.js`
- [ ] Executar scraper principal

---

## 🔗 Links Úteis

- **Scrapeless Dashboard:** https://app.scrapeless.com/
- **Scrapeless Docs:** https://docs.scrapeless.com/
- **Scrapeless API Reference:** https://docs.scrapeless.com/api-reference

---

## 📊 Testes Realizados

### Teste de Conexão Simples
```bash
cd STJ
node test/test-connection-simple.js
```

**Resultado:**
```
Teste 1 (Mínimo):     ❌ FALHOU - Unexpected server response: 400
Teste 2 (Proxy BR):   ❌ FALHOU - Unexpected server response: 400
Teste 3 (Incognito):  ❌ FALHOU - Unexpected server response: 400
Teste 4 (Completo):   ❌ FALHOU - Unexpected server response: 400
```

---

## 🎯 Próximos Passos

1. **URGENTE:** Obter novo token do Scrapeless
2. Atualizar token em todos os projetos
3. Testar conexão
4. Continuar com o desenvolvimento do scraper STJ

---

**⚠️ BLOQUEADO ATÉ OBTER NOVO TOKEN DO SCRAPELESS**

