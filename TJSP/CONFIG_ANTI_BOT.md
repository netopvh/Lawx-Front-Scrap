# 🛡️ Configurações Anti-Bot Detection - TJSP

## 📋 Visão Geral

Este documento descreve as configurações disponíveis para contornar a detecção de bot do site TJSP.

---

## ⚙️ Variáveis de Ambiente

### 1. **ANTI_DETECTION_EXPERIMENTAL**

**Descrição**: Ativa/desativa técnicas anti-detecção experimentais (modificação de `navigator.webdriver`, `chrome.runtime`, etc.)

**Valores**:
- `FALSE` (padrão, **RECOMENDADO**): Desativa técnicas experimentais
- `TRUE`: Ativa técnicas experimentais

**⚠️ ATENÇÃO**: 
- Técnicas experimentais podem **INTERFERIR** com o solver do Scrapeless
- No STJ, essas técnicas **impediram** a resolução do Cloudflare Turnstile
- Scrapeless já possui anti-detecção embutida
- **Use apenas se absolutamente necessário**

**Exemplo**:
```env
ANTI_DETECTION_EXPERIMENTAL=FALSE
```

---

### 2. **HUMAN_DELAY_MULTIPLIER**

**Descrição**: Multiplicador de delay para simular comportamento humano mais realista

**Valores**:
- `1.0`: Delays normais (rápido, pode ser detectado)
- `2.0` (padrão, **RECOMENDADO**): Delays 2x mais lentos (mais humano)
- `3.0`: Delays 3x mais lentos (muito humano, mas mais lento)
- `0.5`: Delays 50% mais rápidos (não recomendado)

**Impacto**:
- Afeta todos os delays: digitação, movimento de mouse, cliques, etc.
- Valores maiores = mais humano, mas execução mais lenta
- Valores menores = mais rápido, mas maior risco de detecção

**Exemplo**:
```env
HUMAN_DELAY_MULTIPLIER=2.0
```

---

### 3. **PUPPETEER_EVERY_PAGE_ANONIMOUS**

**Descrição**: Ativa modo incognito/anônimo no navegador

**Valores**:
- `FALSE` (padrão): Modo normal
- `TRUE`: Modo incognito (sem cookies persistentes entre sessões)

**Benefícios do modo incognito**:
- ✅ Sem cookies persistentes
- ✅ Sem cache entre sessões
- ✅ Fingerprint mais limpo
- ✅ Reduz rastreamento

**Exemplo**:
```env
PUPPETEER_EVERY_PAGE_ANONIMOUS=TRUE
```

---

### 4. **SCRAPELESS_PROXY**

**Descrição**: Ativa/desativa proxy residencial brasileiro

**Valores**:
- `FALSE` (padrão atual): Sem proxy
- `TRUE`: Com proxy residencial BR

**Benefícios do proxy**:
- ✅ IP brasileiro residencial (não datacenter)
- ✅ Mascara características do Scrapeless Cloud Browser
- ✅ Reduz detecção de bot

**Desvantagens**:
- ❌ Pode ser mais lento
- ❌ Custo adicional (se aplicável)

**Exemplo**:
```env
SCRAPELESS_PROXY=TRUE
SCRAPELESS_PROXY_COUNTRY=BR
```

---

## 🎯 Estratégias Recomendadas

### **Estratégia 1: Configuração Conservadora (ATUAL)**
```env
ANTI_DETECTION_EXPERIMENTAL=FALSE
HUMAN_DELAY_MULTIPLIER=2.0
PUPPETEER_EVERY_PAGE_ANONIMOUS=FALSE
SCRAPELESS_PROXY=FALSE
```

**Quando usar**: Primeira tentativa, configuração mais segura

---

### **Estratégia 2: Modo Incognito + Delays Maiores**
```env
ANTI_DETECTION_EXPERIMENTAL=FALSE
HUMAN_DELAY_MULTIPLIER=3.0
PUPPETEER_EVERY_PAGE_ANONIMOUS=TRUE
SCRAPELESS_PROXY=FALSE
```

**Quando usar**: Se Estratégia 1 falhar

---

### **Estratégia 3: Proxy Residencial BR**
```env
ANTI_DETECTION_EXPERIMENTAL=FALSE
HUMAN_DELAY_MULTIPLIER=2.0
PUPPETEER_EVERY_PAGE_ANONIMOUS=TRUE
SCRAPELESS_PROXY=TRUE
```

**Quando usar**: Se Estratégia 2 falhar

---

### **Estratégia 4: Tudo Ativado (ÚLTIMO RECURSO)**
```env
ANTI_DETECTION_EXPERIMENTAL=TRUE
HUMAN_DELAY_MULTIPLIER=3.0
PUPPETEER_EVERY_PAGE_ANONIMOUS=TRUE
SCRAPELESS_PROXY=TRUE
```

**Quando usar**: Apenas se todas as outras estratégias falharem
**⚠️ ATENÇÃO**: Pode interferir com solver do Scrapeless

---

## 📊 Histórico de Testes

### ❌ **Teste 1 - 2025-11-07 (FALHOU)**

**Configuração**:
```env
ANTI_DETECTION_EXPERIMENTAL=TRUE (implícito, sem variável)
HUMAN_DELAY_MULTIPLIER=1.0 (implícito, sem variável)
PUPPETEER_EVERY_PAGE_ANONIMOUS=FALSE
SCRAPELESS_PROXY=FALSE
```

**Resultado**: 
- ❌ 3/3 tentativas falharam
- ✅ CAPTCHA resolvido com sucesso
- ❌ Servidor TJSP detectou bot após submissão
- Mensagem: "suspeita de acesso via robô"

**Conclusão**: Técnicas anti-detecção + delays rápidos não funcionaram

---

## 🔍 Diagnóstico de Problemas

### **Problema: "suspeita de acesso via robô"**

**Possíveis causas**:
1. ❌ Técnicas anti-detecção interferindo com Scrapeless
2. ❌ Delays muito rápidos (comportamento não-humano)
3. ❌ Fingerprint do Scrapeless Cloud Browser detectado
4. ❌ IP de datacenter (sem proxy residencial)
5. ❌ Cookies/sessão persistente marcada como bot

**Soluções a testar** (em ordem):
1. ✅ Desativar `ANTI_DETECTION_EXPERIMENTAL=FALSE`
2. ✅ Aumentar `HUMAN_DELAY_MULTIPLIER=2.0` ou `3.0`
3. ✅ Ativar `PUPPETEER_EVERY_PAGE_ANONIMOUS=TRUE`
4. ✅ Ativar `SCRAPELESS_PROXY=TRUE`

---

## 📝 Notas Importantes

1. **Scrapeless já possui anti-detecção embutida**
   - Não é necessário adicionar técnicas customizadas
   - Técnicas customizadas podem **piorar** a detecção

2. **Delays humanos são críticos**
   - Sites modernos analisam velocidade de digitação
   - Sites modernos analisam padrões de movimento de mouse
   - Delays muito rápidos = detecção garantida

3. **Modo incognito ajuda mas não é garantia**
   - Remove cookies persistentes
   - Não remove fingerprint do navegador
   - Não remove características do Scrapeless Cloud Browser

4. **Proxy residencial é a melhor opção**
   - IP residencial brasileiro é mais confiável
   - Mascara características de datacenter
   - Pode ter custo adicional

---

## 🚀 Próximos Passos

1. ✅ Testar com `ANTI_DETECTION_EXPERIMENTAL=FALSE` (já implementado)
2. ✅ Testar com `HUMAN_DELAY_MULTIPLIER=2.0` (já implementado)
3. ⏳ Testar com `PUPPETEER_EVERY_PAGE_ANONIMOUS=TRUE`
4. ⏳ Testar com `SCRAPELESS_PROXY=TRUE`
5. ⏳ Combinar configurações conforme necessário

---

## 📞 Suporte

Se todas as estratégias falharem, considere:
1. Contatar suporte do Scrapeless
2. Reportar que TJSP está detectando o Cloud Browser
3. Solicitar recomendações específicas para TJSP
4. Verificar se há atualizações no Scrapeless

---

**Última atualização**: 2025-11-07
**Versão**: 1.0.0

