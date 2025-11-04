# 🔍 Utilitários de Análise - STF

Esta pasta contém scripts de análise e debug da estrutura HTML do site STF, usados durante o desenvolvimento do scraper.

> **Nota:** Scripts de teste foram movidos para a pasta `test/`

## 📋 Índice

- [Scripts de Análise de Estrutura](#scripts-de-análise-de-estrutura)
- [Scripts de Debug](#scripts-de-debug)
- [Scripts de Extração](#scripts-de-extração)
- [Arquivos de Dados](#arquivos-de-dados)
- [Como Usar](#como-usar)

---

## 🔍 Scripts de Análise de Estrutura

### `analyze-structure.js`

Analisar estrutura completa da página STF.

**Uso:**

```bash
node utils/analyze-structure.js
```

**Gera:**

- `structure-analysis.json` - Análise completa da estrutura
- `structure-screenshot.png` - Screenshot da página

### `analyze-h4.js`

Analisar especificamente os elementos H4 da página.

**Uso:**

```bash
node utils/analyze-h4.js
```

**Gera:**

- `h4-analysis.json` - Lista de todos os H4s e seus conteúdos

### `analyze-spans.js`

Analisar elementos SPAN dentro dos H4s.

**Uso:**

```bash
node utils/analyze-spans.js
```

**Gera:**

- `spans-analysis.json` - Análise de spans e seus pais

### `find-spans-parent.js`

Encontrar elementos pai dos spans com dados.

**Uso:**

```bash
node utils/find-spans-parent.js
```

**Gera:**

- `span-locations.json` - Localização de cada span na árvore DOM

---

## 🐛 Scripts de Debug

### `debug-html.js`

Capturar e salvar HTML da página para análise offline.

**Uso:**

```bash
node utils/debug-html.js
```

**Gera:**

- `debug-page.html` - HTML completo da página

### `inspect-page.js`

Inspecionar página e capturar screenshot.

**Uso:**

```bash
node utils/inspect-page.js
```

**Gera:**

- `inspect-page.html` - HTML da página
- `inspect-screenshot.png` - Screenshot

---

## 📦 Scripts de Extração

### `extract-sample.js`

Extrair amostra de dados de um arquivo JSON salvo.

**Uso:**

```bash
node utils/extract-sample.js
```

---

## 📄 Arquivos de Dados

### Arquivos JSON

- `base-options.json` - Opções de base disponíveis no STF
- `h4-analysis.json` - Análise de elementos H4
- `span-locations.json` - Localização de spans
- `spans-analysis.json` - Análise de spans
- `structure-analysis.json` - Estrutura completa da página

### Arquivos HTML

- `debug-page.html` - HTML capturado para debug
- `inspect-page.html` - HTML capturado para inspeção

### Screenshots

- `inspect-screenshot.png` - Screenshot de inspeção
- `structure-screenshot.png` - Screenshot de estrutura

---

## 🚀 Como Usar

### Analisar Estrutura da Página

Se precisar entender melhor a estrutura HTML da página:

```bash
node utils/analyze-structure.js
```

### Analisar Elementos H4

Para entender como os dados estão organizados nos H4s:

```bash
node utils/analyze-h4.js
```

### Debug de HTML

Para capturar HTML completo e analisar offline:

```bash
node utils/debug-html.js
```

---

## 📝 Notas

- Todos os scripts usam as mesmas variáveis de ambiente do `.env`
- Scripts de análise geram arquivos JSON na pasta `utils/`
- Screenshots são salvos na pasta `utils/`
- Estes scripts são apenas para desenvolvimento/debug
- **NÃO** são necessários para execução do scraper principal
- **Scripts de teste** foram movidos para a pasta `test/`

---

## 🔧 Manutenção

Estes scripts foram criados durante o desenvolvimento para:

- Analisar estrutura HTML do site
- Debugar problemas de extração
- Validar seletores CSS
- Entender organização dos dados

Podem ser removidos em produção, mas são úteis para:

- Troubleshooting de extração
- Desenvolvimento de novas features
- Análise de mudanças no site STF
