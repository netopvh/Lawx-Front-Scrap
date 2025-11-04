# 🛠️ Tools - Ferramentas de Validação e Utilidades

Esta pasta contém ferramentas reutilizáveis para auxiliar no desenvolvimento de scrapers.

---

## 📋 Ferramentas Disponíveis

### 1. **validate-site.js** - Validador de Site

Detecta proteções anti-bot e analisa a estrutura de um site antes de iniciar o desenvolvimento de um scraper.

#### **O que detecta:**

- ✅ **Cloudflare Turnstile**
- ✅ **reCAPTCHA** (v2, v3, Enterprise)
- ✅ **hCaptcha**
- ✅ **Cloudflare Challenge Page**
- ✅ **JavaScript obrigatório**
- ✅ **Parâmetros de URL** (GET params)

#### **Como usar:**

```bash
# Sintaxe básica
node tools/validate-site.js <URL>

# Exemplo 1: STF
node tools/validate-site.js https://jurisprudencia.stf.jus.br/pages/search

# Exemplo 2: URL com parâmetros
node tools/validate-site.js "https://jurisprudencia.stf.jus.br/pages/search?base=acordaos&queryString=Direito&page=1"

# Exemplo 3: TJSP
node tools/validate-site.js https://esaj.tjsp.jus.br/cjsg/resultadoCompleta.do
```

#### **Saídas geradas:**

1. **Console**: Log detalhado da validação
2. **Screenshot**: `tools/screenshots/validation-TIMESTAMP.png`
3. **Relatório JSON**: `tools/reports/validation-report-TIMESTAMP.json`

#### **Exemplo de saída no console:**

```
═══════════════════════════════════════════════════════
VALIDADOR DE SITE - Detectando Proteções Anti-Bot
═══════════════════════════════════════════════════════

🔗 URL: https://jurisprudencia.stf.jus.br/pages/search

📊 Analisando estrutura da URL...
✅ URL suporta parâmetros GET!
   Base URL: https://jurisprudencia.stf.jus.br/pages/search
   Query String: ?base=acordaos&queryString=Direito
   Parâmetros encontrados:
      - base = acordaos
      - queryString = Direito

🌐 Iniciando navegador...
✅ Navegador iniciado

🔍 Acessando a página...
   Status HTTP: 200

🔒 Detectando proteções anti-bot...
✅ Screenshot salvo: tools/screenshots/validation-2025-11-04T12-30-45.png

═══════════════════════════════════════════════════════
RESULTADO DA VALIDAÇÃO
═══════════════════════════════════════════════════════

✅ NENHUMA PROTEÇÃO ANTI-BOT DETECTADA!

✅ SITE SEM PROTEÇÕES DETECTADAS - Pode usar Puppeteer normal

✅ Relatório salvo: tools/reports/validation-report-2025-11-04T12-30-45.json

═══════════════════════════════════════════════════════
VALIDAÇÃO CONCLUÍDA
═══════════════════════════════════════════════════════
```

#### **Exemplo de relatório JSON:**

```json
{
  "timestamp": "2025-11-04T12:30:45.123Z",
  "url": "https://jurisprudencia.stf.jus.br/pages/search",
  "success": true,
  "statusCode": 200,
  "urlAnalysis": {
    "hasParams": true,
    "params": [
      ["base", "acordaos"],
      ["queryString", "Direito"]
    ],
    "baseUrl": "https://jurisprudencia.stf.jus.br/pages/search",
    "queryString": "?base=acordaos&queryString=Direito"
  },
  "protections": {
    "cloudflare_turnstile": false,
    "recaptcha": false,
    "hcaptcha": false,
    "cloudflare_challenge": false,
    "javascript_required": false,
    "details": []
  },
  "screenshot": "tools/screenshots/validation-2025-11-04T12-30-45.png",
  "recommendation": "✅ SITE SEM PROTEÇÕES DETECTADAS - Pode usar Puppeteer normal"
}
```

#### **Interpretando os resultados:**

| Resultado | Recomendação |
|-----------|--------------|
| ✅ **Sem proteções detectadas** | Usar Puppeteer normal (mais rápido e barato) |
| ⚠️ **Cloudflare Turnstile/Challenge** | Usar Scrapeless ou similar |
| ⚠️ **reCAPTCHA** | Usar Scrapeless ou similar |
| ⚠️ **hCaptcha** | Usar Scrapeless ou similar |
| ✅ **URL com parâmetros GET** | Pode construir URLs diretamente (mais simples) |
| ❌ **URL sem parâmetros GET** | Precisa preencher formulários |

---

## 📁 Estrutura de Pastas

```
tools/
├── README.md                    # Este arquivo
├── validate-site.js             # Validador de site
├── screenshots/                 # Screenshots gerados
│   └── validation-*.png
└── reports/                     # Relatórios JSON
    └── validation-report-*.json
```

---

## 🚀 Workflow Recomendado

### **Antes de iniciar um novo scraper:**

1. **Validar o site**:
   ```bash
   node tools/validate-site.js <URL_DO_SITE>
   ```

2. **Analisar o relatório**:
   - Verificar screenshot
   - Ler relatório JSON
   - Identificar proteções

3. **Decidir abordagem**:
   - **Sem proteções** → Puppeteer normal
   - **Com proteções** → Scrapeless + Puppeteer
   - **URL com params** → Construir URLs diretamente
   - **URL sem params** → Preencher formulários

4. **Desenvolver o scraper** com base na análise

---

## 🔧 Requisitos

- Node.js 18+
- Puppeteer instalado (`npm install puppeteer`)

---

## 📝 Notas

- **Screenshots**: Salvos em `tools/screenshots/` (fullPage)
- **Relatórios**: Salvos em `tools/reports/` (JSON)
- **Timeout**: 30 segundos para carregamento da página
- **User-Agent**: Chrome 131 (Windows 10)
- **Viewport**: 1920x1080

---

## 🎯 Exemplos de Uso

### **Validar STF:**
```bash
node tools/validate-site.js https://jurisprudencia.stf.jus.br/pages/search
```

### **Validar TJSP:**
```bash
node tools/validate-site.js https://esaj.tjsp.jus.br/cjsg/resultadoCompleta.do
```

### **Validar com parâmetros:**
```bash
node tools/validate-site.js "https://jurisprudencia.stf.jus.br/pages/search?base=acordaos&queryString=Advogados&page=1&pageSize=100"
```

---

## 📊 Histórico de Validações

Os relatórios JSON ficam salvos em `tools/reports/` e podem ser consultados posteriormente para comparar mudanças no site ao longo do tempo.

---

## 🤝 Contribuindo

Para adicionar novas ferramentas:

1. Criar o script em `tools/`
2. Documentar neste README
3. Seguir o padrão de logs e relatórios
4. Adicionar exemplos de uso

---

## 📄 Licença

Mesma licença do projeto principal.

