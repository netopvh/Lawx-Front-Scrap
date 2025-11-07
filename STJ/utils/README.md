# 🔍 Utilitários de Análise - STJ/TFR

Esta pasta contém scripts de análise e debug da estrutura HTML do site STJ/TFR, usados durante o desenvolvimento do scraper.

> **Nota:** Scripts de teste foram movidos para a pasta `test/`

## 📋 Índice

- [Scripts de Análise de Estrutura](#scripts-de-análise-de-estrutura)
- [Scripts de Inspeção Manual](#scripts-de-inspeção-manual)
- [Como Usar](#como-usar)

---

## 🔍 Scripts de Análise de Estrutura

### `analyze-structure.js`

Analisar estrutura completa da página STJ/TFR.

**Uso:**

```bash
node utils/analyze-structure.js
```

**Funcionalidades:**
- Conecta ao Scrapeless Cloud Browser
- Navega para página de resultados do STJ/TFR
- Analisa estrutura HTML completa
- Identifica elementos de resultados
- Captura screenshots

**Gera:**
- Análise JSON da estrutura
- Screenshots da página

**Quando usar:**
- Para entender estrutura HTML do site
- Para identificar seletores CSS
- Para debugar problemas de extração
- Após mudanças no site STJ/TFR

---

## 📊 Scripts de Inspeção Manual

### `inspect-results-manual.js`

Inspecionar manualmente resultados de jurisprudência.

**Uso:**

```bash
node utils/inspect-results-manual.js
```

**Funcionalidades:**
- Conecta ao Scrapeless
- Navega para página de resultados
- Aguarda resolução de Cloudflare
- Extrai HTML dos resultados
- Salva para análise offline

**Gera:**
- HTML dos resultados
- Análise JSON da estrutura
- Screenshots

**Quando usar:**
- Para analisar estrutura de resultados
- Para validar seletores de extração
- Para debugar problemas de parsing
- Para entender organização dos dados

---

## 🚀 Como Usar

### Analisar Estrutura da Página

Se precisar entender melhor a estrutura HTML da página:

```bash
node utils/analyze-structure.js
```

### Inspecionar Resultados

Para analisar estrutura dos resultados de jurisprudência:

```bash
node utils/inspect-results-manual.js
```

---

## 📝 Notas

- Todos os scripts usam as mesmas variáveis de ambiente do `.env`
- Scripts de análise geram arquivos JSON na pasta `logs/`
- Screenshots são salvos na pasta `screenshots/`
- Estes scripts são apenas para desenvolvimento/debug
- **NÃO** são necessários para execução do scraper principal
- **Scripts de teste** foram movidos para a pasta `test/`

---

## 🔧 Manutenção

Estes scripts foram criados durante o desenvolvimento para:

- Analisar estrutura HTML do site STJ/TFR
- Debugar problemas de extração
- Validar seletores CSS
- Entender organização dos dados
- Resolver problemas de Cloudflare

Podem ser removidos em produção, mas são úteis para:

- Troubleshooting de extração
- Desenvolvimento de novas features
- Análise de mudanças no site STJ/TFR
- Debug de problemas de CAPTCHA/Cloudflare

---

## 🎯 Diferenças STJ vs STF

### STJ/TFR
- ☁️ **Cloudflare Turnstile** (requer proxy BR)
- 📄 Resultados em formato de lista HTML
- 🔍 Estrutura mais complexa
- ⏱️ Tempo de resolução: ~20-145 segundos

### STF
- 🔐 **reCAPTCHA v2** (funciona sem proxy)
- 📄 Resultados em Angular/SPA
- 🔍 Estrutura mais simples
- ⏱️ Tempo de resolução: ~5-10 segundos

---

## 📚 Documentação Adicional

Para mais informações sobre a implementação do STJ/TFR, consulte:

- `docs/ANALISE_HTML_STJ_TFR.md` - Análise detalhada da estrutura HTML
- `docs/IMPLEMENTACAO_COMPLETA.md` - Documentação completa da implementação
- `test/README.md` - Documentação dos testes

