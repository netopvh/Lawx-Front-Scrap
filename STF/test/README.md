# 🧪 Testes - STF Scraper

Esta pasta contém scripts de teste e validação do scraper STF.

## 📋 Índice

- [Testes de Conexão](#testes-de-conexão)
- [Testes de Navegação](#testes-de-navegação)
- [Testes de Extração](#testes-de-extração)
- [Testes de Seletores](#testes-de-seletores)
- [Como Usar](#como-usar)

---

## 🔌 Testes de Conexão

### `check-scrapeless.js`
**Propósito:** Verificar disponibilidade do Scrapeless antes de executar o scraper.

**Uso:**
```bash
node test/check-scrapeless.js
```

**Saída:**
- ✅ Scrapeless disponível (mostra tempo de conexão em ms)
- ❌ Scrapeless indisponível (mostra erro e sugere usar fallback)

**Quando usar:**
- Antes de executar o scraper principal
- Para diagnosticar problemas de conexão
- Para verificar se há rate limiting

---

### `test-scrapeless-connection.js`
**Propósito:** Testar conexão Scrapeless com diferentes configurações de proxy.

**Uso:**
```bash
node test/test-scrapeless-connection.js
```

**Testa:**
1. STF com Proxy BR ✅ (deve funcionar)
2. STF com Proxy AUTO ❌ (geralmente falha)
3. STF com Proxy US ❌ (geralmente falha)
4. Google com Proxy BR (teste de controle)
5. TJSP com Proxy BR (teste de controle)

**Quando usar:**
- Para diagnosticar problemas de proxy
- Para validar que Proxy BR funciona melhor
- Para identificar rate limiting

---

## 🌐 Testes de Navegação

### `test-stf-simple.js`
**Propósito:** Teste simples de navegação no STF com Scrapeless.

**Uso:**
```bash
node test/test-stf-simple.js
```

**Verifica:**
- Conexão ao Scrapeless
- Navegação para página de busca
- Detecção de AWS WAF Challenge
- Presença de resultados
- Carregamento do Angular

**Quando usar:**
- Para validar que a navegação básica funciona
- Para verificar se AWS WAF está sendo apresentado
- Para testar com URL simplificada

---

### `test-navigation.js`
**Propósito:** Teste completo do fluxo de navegação com todos os delays.

**Uso:**
```bash
node test/test-navigation.js
```

**Fluxo testado:**
1. Conectar ao Scrapeless
2. Aguardar 3s
3. Criar página
4. Aguardar 3s
5. Navegar para STF
6. Aguardar 10s para JavaScript
7. Verificar resultados

**Quando usar:**
- Para validar o fluxo completo de navegação
- Para testar delays entre operações
- Para diagnosticar em qual etapa ocorre falha

---

## 📊 Testes de Extração

### `test-selectors.js`
**Propósito:** Testar seletores CSS e extração de dados.

**Uso:**
```bash
node test/test-selectors.js
```

**Testa:**
- Seletores definidos em `config/fields.json`
- Lógica customizada de extração de H4s
- Todos os campos: número, órgão, relator, datas, ementa, links

**Saída:**
- Mostra cada campo extraído
- Valida se campos obrigatórios estão presentes
- Identifica campos vazios

**Quando usar:**
- Quando dados extraídos estão incorretos
- Após mudanças no site STF
- Para validar novos seletores

---

## 🎯 Testes de Seletores

### `test-nth-of-type.js`
**Propósito:** Testar seletores CSS `nth-of-type` para extração.

**Uso:**
```bash
node test/test-nth-of-type.js
```

**Testa:**
- Seletores `h4:nth-of-type(N)`
- Seletores `h4:nth-of-type(N) > span`
- Validação de qual nth-of-type corresponde a qual campo

**Quando usar:**
- Para entender a estrutura de H4s na página
- Para ajustar seletores nth-of-type
- Para diagnosticar por que campos estão vazios

---

## 📁 Arquivos de Dados

### Arquivos JSON
- `test-extraction.json` - Dados extraídos durante testes

### Screenshots
- `test-screenshot.png` - Screenshot capturado durante testes

---

## 🚀 Como Usar

### **Workflow Recomendado**

#### 1. Antes de executar o scraper principal:
```bash
# Verificar se Scrapeless está disponível
node test/check-scrapeless.js
```

#### 2. Se houver problemas de conexão:
```bash
# Testar diferentes configurações de proxy
node test/test-scrapeless-connection.js
```

#### 3. Se houver problemas de navegação:
```bash
# Testar navegação completa
node test/test-navigation.js
```

#### 4. Se dados extraídos estiverem incorretos:
```bash
# Validar seletores
node test/test-selectors.js
```

---

## 🔍 Troubleshooting

### Erro: `ERR_TUNNEL_CONNECTION_FAILED`

**Possíveis causas:**
- Rate limiting do Scrapeless
- Proxy incorreto (use sempre BR)
- Quota excedida

**Solução:**
1. Execute `check-scrapeless.js` para verificar disponibilidade
2. Aguarde 15-30 minutos
3. Verifique se está usando Proxy BR

---

### Erro: Dados extraídos vazios

**Possíveis causas:**
- Seletores CSS incorretos
- Estrutura HTML do site mudou
- JavaScript não carregou completamente

**Solução:**
1. Execute `test-selectors.js` para validar seletores
2. Aumente delays de carregamento
3. Verifique se Angular carregou (`app-root` presente)

---

### Erro: AWS WAF Challenge

**Possíveis causas:**
- Proxy não-BR sendo usado
- Fingerprint suspeito

**Solução:**
1. Use sempre Proxy BR
2. Execute `test-stf-simple.js` para verificar se WAF aparece
3. Com Proxy BR, WAF geralmente não aparece

---

## 📝 Notas

- Todos os testes usam as mesmas variáveis de ambiente do `.env`
- Testes **NÃO** modificam dados de produção
- Screenshots e JSONs são salvos na pasta `test/`
- Testes podem ser executados quantas vezes necessário
- **NÃO** são necessários para execução do scraper principal

---

## 🎯 Próximos Passos

Após validar que todos os testes passam:

1. ✅ `check-scrapeless.js` - Scrapeless disponível
2. ✅ `test-navigation.js` - Navegação funciona
3. ✅ `test-selectors.js` - Dados extraídos corretamente

Você pode executar o scraper principal com confiança:

```bash
node index.js
```

