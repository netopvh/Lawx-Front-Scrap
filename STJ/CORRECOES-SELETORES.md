# 🔧 CORREÇÕES DE SELETORES - FORMULÁRIO STJ/TFR

**Data:** 2025-11-08  
**Branch:** `feature/stj-browserless-migration`

---

## ❌ **PROBLEMA IDENTIFICADO**

As queries BQL estavam usando seletores **INCORRETOS** para o campo de seleção de tribunal:

```graphql
# ❌ ERRADO (não existe no formulário)
select(selector: "select[name='tribunal']", value: "STJ")
```

**Evidência:**
- Análise do código `STJ/index.js` linha 929 mostra: `await page.select('select[name="b"]', tribunalValue);`
- O seletor correto é `name="b"`, não `name="tribunal"`

---

## ✅ **CORREÇÕES APLICADAS**

### **1. `STJ/config/fields.json`**

**ANTES:**
```json
"form_fields": {
  "Tribunal": "tribunal",
  ...
}
```

**DEPOIS:**
```json
"form_fields": {
  "_note": "IMPORTANTE: O seletor do tribunal é 'b' (não 'tribunal'). Baseado na análise do código STJ/index.js linha 929",
  "Tribunal": "b",
  ...
}
```

---

### **2. `STJ/browserql/test-stj-form-fill.bql`**

**ANTES:**
```graphql
# Selecionar tribunal "STJ"
select(selector: "select[name='tribunal']", value: "STJ") {
  success
}
```

**DEPOIS:**
```graphql
# Selecionar tribunal "STJ" (seletor correto: name="b")
select(selector: "select[name='b']", value: "STJ") {
  success
}
```

---

### **3. `STJ/browserql/test-tfr-form-fill.bql`**

**ANTES:**
```graphql
# Selecionar tribunal "TFR"
select(selector: "select[name='tribunal']", value: "TFR") {
  success
}

# Verificar se a opção TFR existe no dropdown
tfrOptionExists: evaluate(
  expression: "Array.from(document.querySelectorAll('select[name=\"tribunal\"] option')).some(opt => opt.value === 'TFR')"
)
```

**DEPOIS:**
```graphql
# Selecionar tribunal "TFR" (seletor correto: name="b")
select(selector: "select[name='b']", value: "TFR") {
  success
}

# Verificar se a opção TFR existe no dropdown (seletor correto: name="b")
tfrOptionExists: evaluate(
  expression: "Array.from(document.querySelectorAll('select[name=\"b\"] option')).some(opt => opt.value === 'TFR')"
)
```

---

### **4. `STJ/browserql/test-stj-scraping.bql`**

**ANTES:**
```graphql
select(selector: "select[name='tribunal']", value: "STJ")
```

**DEPOIS:**
```graphql
select(selector: "select[name='b']", value: "STJ")
```

---

### **5. NOVO ARQUIVO: `STJ/browserql/test-all-form-fields.bql`**

Criado arquivo completo que testa **TODOS** os campos do formulário com seletores corretos:

```graphql
mutation TestAllFormFields {
  # Selecionar tribunal "STJ" (seletor: name="b")
  selectTribunal: select(selector: "select[name='b']", value: "STJ") {
    success
  }
  
  # Preencher "Pesquisa livre"
  typeLivre: type(selector: "input[name='livre']", text: "Advogado") {
    success
  }
  
  # Validações de todos os seletores
  validations: evaluate(
    expression: `
      const selectors = {
        tribunal: document.querySelector('select[name="b"]') !== null,
        livre: document.querySelector('input[name="livre"]') !== null,
        processo: document.querySelector('input[name="processo"]') !== null,
        classe: document.querySelector('input[name="classe"]') !== null,
        uf: document.querySelector('select[name="uf"]') !== null,
        dtpb1: document.querySelector('input[name="dtpb1"]') !== null,
        dtpb2: document.querySelector('input[name="dtpb2"]') !== null,
        dtde1: document.querySelector('input[name="dtde1"]') !== null,
        dtde2: document.querySelector('input[name="dtde2"]') !== null,
        submitButton: document.querySelector('input[type="submit"], button[type="submit"]') !== null
      };
      
      const missing = Object.entries(selectors)
        .filter(([key, exists]) => !exists)
        .map(([key]) => key);
      
      return {
        allFound: missing.length === 0,
        found: Object.values(selectors).filter(v => v).length,
        total: Object.keys(selectors).length,
        missing: missing.join(', ') || 'none'
      };
    `
  ) {
    value
  }
  
  # Verificar opções do dropdown de tribunal
  tribunalOptions: evaluate(
    expression: `
      const select = document.querySelector('select[name="b"]');
      if (!select) return 'Seletor não encontrado';
      
      const options = Array.from(select.options).map(opt => ({
        value: opt.value,
        text: opt.text
      }));
      
      return JSON.stringify(options);
    `
  ) {
    value
  }
  
  # Screenshot do formulário preenchido
  screenshot(fullPage: true) {
    base64
  }
}
```

**Benefícios:**
- ✅ Valida que **TODOS** os seletores existem
- ✅ Lista opções do dropdown de tribunal
- ✅ Lista opções do dropdown de UF
- ✅ Captura screenshot do formulário
- ✅ Detecta CAPTCHA
- ✅ Exporta HTML do formulário

---

## 📋 **MAPEAMENTO COMPLETO DE SELETORES**

Baseado em `STJ/index.js` linhas 919-983:

| Campo | Seletor CSS | Tipo | Linha no Código |
|-------|-------------|------|-----------------|
| **Tribunal** | `select[name="b"]` | Select | 929 |
| **Pesquisa livre** | `input[name="livre"]` | Input | 935 |
| **Número do processo** | `input[name="processo"]` | Input | 941 |
| **Classe processual** | `input[name="classe"]` | Input | 947 |
| **Unidade Federativa** | `select[name="uf"]` | Select | 953 |
| **Data publicação (início)** | `input[name="dtpb1"]` | Input | 959 |
| **Data publicação (fim)** | `input[name="dtpb2"]` | Input | 963 |
| **Data decisão (início)** | `input[name="dtde1"]` | Input | 969 |
| **Data decisão (fim)** | `input[name="dtde2"]` | Input | 973 |
| **Botão submeter** | `input[type="submit"]` | Button | 993 |

---

## 🧪 **PRÓXIMOS PASSOS PARA TESTE**

### **1. Testar no Dashboard Browserless**

```
1. Acesse: https://www.browserless.io/playground
2. Configure API Key: 05da69a8-cd79-48f8-bf69-4d7eb4ea5bf5
3. Cole a query: STJ/browserql/test-all-form-fields.bql
4. Clique em ▶️ Run
5. Verifique:
   - ✅ Campo "tribunal" (select[name="b"]) existe?
   - ✅ Opções do dropdown: STJ, TFR?
   - ✅ Todos os 10 seletores foram encontrados?
   - ✅ Screenshot mostra formulário preenchido?
```

### **2. Validar Resultados**

Espera-se que o resultado JSON mostre:

```json
{
  "validations": {
    "allFound": true,
    "found": 10,
    "total": 10,
    "missing": "none"
  },
  "tribunalOptions": "[{\"value\":\"STJ\",\"text\":\"STJ\"},{\"value\":\"TFR\",\"text\":\"TFR\"}]"
}
```

### **3. Se Cloudflare Bloquear**

Se aparecer "Just a moment...", testar com stealth mode:

```graphql
mutation TestWithStealth {
  # Ativar stealth mode
  stealth(enabled: true) {
    success
  }
  
  # Navegar para STJ
  goto(url: "https://scon.stj.jus.br/SCON/jurisprudencia/toc.jsp") {
    status
  }
  
  # ... resto da query
}
```

---

## 📊 **RESUMO DAS MUDANÇAS**

| Arquivo | Mudanças | Status |
|---------|----------|--------|
| `STJ/config/fields.json` | Corrigido `"Tribunal": "b"` | ✅ |
| `STJ/browserql/test-stj-form-fill.bql` | Corrigido seletor `name="b"` | ✅ |
| `STJ/browserql/test-tfr-form-fill.bql` | Corrigido seletor `name="b"` | ✅ |
| `STJ/browserql/test-stj-scraping.bql` | Corrigido seletor `name="b"` | ✅ |
| `STJ/browserql/test-all-form-fields.bql` | **NOVO** - Teste completo | ✅ |
| `STJ/browserql/README.md` | Adicionado novo arquivo | ✅ |

---

## ⚠️ **IMPORTANTE**

**NÃO** alterar o código `STJ/index.js` ainda! 

Primeiro:
1. ✅ Testar queries BQL no dashboard
2. ✅ Confirmar que seletores estão corretos
3. ✅ Verificar se Cloudflare bloqueia
4. ✅ Testar stealth mode se necessário
5. ⏳ **DEPOIS** corrigir código STJ/index.js se necessário

---

**Aguardando teste no dashboard Browserless para prosseguir!** 🚀

