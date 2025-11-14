# 🏛️ Scraper STJ/TFR - Superior Tribunal de Justiça / Tribunal Federal de Recursos

Extrai jurisprudências do site do STJ usando **BrowserCloud.io** com **resolução automática de Cloudflare Turnstile**.

> **📝 MIGRAÇÃO:** Este projeto foi migrado de **Scrapeless** para **BrowserCloud.io** devido à falta de saldo no Scrapeless. O BrowserCloud.io oferece resolução automática de CAPTCHA (incluindo Cloudflare Turnstile) e modo stealth.

## ✅ STATUS ATUAL: FUNCIONAL COM BROWSERCLOUD.IO

**SOLUÇÃO IMPLEMENTADA:**
- ✅ **BrowserCloud.io** com resolução automática de **Cloudflare Turnstile**
- ✅ **Stealth Mode** para evitar detecção de bot
- ✅ **Proxy Datacenter BR** para melhor performance
- ✅ **Context Persistence** para manter cookies entre sessões

**RECURSOS DO BROWSERCLOUD.IO:**
- ✅ Resolve automaticamente: reCAPTCHA, FunCaptcha, GeeTest, **Cloudflare Turnstile**
- ✅ Stealth Mode anti-detecção
- ✅ Proxy Pool com 100M+ IPs de 195 países
- ✅ Compatível com Puppeteer (mesma API)
- ✅ Free Trial disponível

---

## 📋 Características

- ✅ **BrowserCloud.io Cloud Browser** (resolução automática de CAPTCHA)
- ✅ **Suporte Dual Tribunal**: STJ e TFR
- ✅ **Campo sigla_tribunal**: Identificação do tribunal de origem
- ✅ **Cloudflare Turnstile**: ✅ RESOLVIDO AUTOMATICAMENTE
- ✅ **Puppeteer-core + WebSocket**
- ✅ **OpenAI GPT-4o-mini**: Categorização de ementas
- ✅ **OpenAI text-embedding-3-small**: Geração de embeddings (1536 dimensões)
- ✅ **Pinecone Vector Database**: Armazenamento de embeddings

---

## 🚀 Instalação

```bash
# Instalar dependências
npm install

# Copiar arquivo de exemplo de variáveis de ambiente
cp .env.sample .env

# Editar .env com suas credenciais
# - BROWSERCLOUD_TOKEN (obtenha em: https://browsercloud.io/)
# - OPENAI_API_KEY
# - PINECONE_API_KEY
```

---

## ⚙️ Configuração

### 1. Variáveis de Ambiente (`.env`)

```env
# BrowserCloud.io (RECOMENDADO - Resolve Cloudflare Turnstile!)
BROWSERCLOUD_TOKEN=YOUR_TOKEN_HERE
BROWSERCLOUD_TIMEOUT=90000
BROWSERCLOUD_SOLVE_CAPTCHA=true
BROWSERCLOUD_STEALTH_MODE=true
BROWSERCLOUD_PROXY=datacenter
BROWSERCLOUD_PROXY_COUNTRY=BR
BROWSERCLOUD_PROXY_STICKY=true
BROWSERCLOUD_BLOCK_ADS=false
BROWSERCLOUD_BLOCK_COOKIE_BANNERS=true
BROWSERCLOUD_CONTEXT=stj-scraper
BROWSERCLOUD_BLOCK_RES=image,media,font

# STJ URL
STJ_URL=https://scon.stj.jus.br/SCON/jurisprudencia/toc.jsp

# OpenAI
OPENAI_API_KEY=sk-proj-YOUR_OPENAI_API_KEY_HERE
OPENAI_MODEL=gpt-4o-mini

# Pinecone
PINECONE_API_KEY=pcsk_YOUR_PINECONE_API_KEY_HERE
PINECONE_ENVIRONMENT=us-east-1
PINECONE_CLOUD=aws
PINECONE_INDEX_NAME=jurisprudencias-stj
PINECONE_DIMENSION=1536
PINECONE_TYPE=DENSE
PINECONE_CAPACITY_MODE=SERVERLESS
```

**Obter Token BrowserCloud.io:**
1. Acesse: https://browsercloud.io/
2. Crie uma conta (Free Trial disponível)
3. Copie seu API token
4. Cole no `.env` em `BROWSERCLOUD_TOKEN`

### 2. Configuração de Busca (`config/busca.json`)

```json
{
  "tribunal": "STJ",
  "livre": "",
  "processo": "",
  "pagina": 1,
  "max_paginas": 3
}
```

**Opções:**
- `tribunal`: `"STJ"`, `"TFR"`, `"STJ;TFR"`, ou vazio para ambos
- `livre`: Pesquisa livre (qualquer campo)
- `processo`: Número do processo
- `pagina`: Paginação
  - Número único: `1`
  - Intervalo: `"1-5"`
  - Lista: `"1,3,5"`
  - Todas as páginas: `"TODAS"`, `"ALL"`, `"TODOS"`, ou `""`
- `max_paginas`: Proteção contra loops infinitos

### 3. Seletores (`config/fields.json`)

⚠️ **ATENÇÃO**: Os seletores atuais são **PLACEHOLDERS** e precisam ser ajustados após análise da estrutura HTML real do site do STJ.

---

## 📊 Estrutura de Dados

### Item Extraído

Cada item extraído contém:

```javascript
{
  sigla_tribunal: "STJ",  // ou "TFR" - Identificação do tribunal de origem
  numero_processo: "REsp 1234567/SP",
  classe: "Recurso Especial",
  relator: "Min. FULANO DE TAL",
  data_julgamento: "01/01/2024",
  data_publicacao: "15/01/2024",
  ementa: "Texto completo da ementa...",
  link_detalhes: "https://...",
  
  // Campos adicionados pela categorização OpenAI:
  categoria: "Direito Civil",
  codigo_categoria: "01",
  desc_categoria: "Questões relacionadas ao Direito Civil"
}
```

### Metadata Pinecone

```javascript
{
  sigla_tribunal: "STJ",  // Identificação do tribunal de origem
  numero_processo: "REsp 1234567/SP",
  classe: "Recurso Especial",
  relator: "Min. FULANO DE TAL",
  data_julgamento: "01/01/2024",
  data_publicacao: "15/01/2024",
  ementa: "Texto completo da ementa...",
  link_detalhes: "https://...",
  categoria: "Direito Civil",
  codigo_categoria: "01",
  desc_categoria: "Questões relacionadas ao Direito Civil"
}
```

### Namespace Pinecone

Formato: `{tribunal}-{categoria}` (normalizado para lowercase e sem acentos)

Exemplos:
- `stj-direito-civil`
- `stj-direito-penal`
- `tfr-direito-administrativo`
- `tfr-direito-tributario`

---

## 🎯 Uso

```bash
npm start
```

⚠️ **ATENÇÃO**: O scraper está **INCOMPLETO** devido ao bloqueio do Cloudflare Turnstile.

---

## 📁 Estrutura de Pastas

```
STJ/
├── config/
│   ├── busca.json          # Configuração de busca
│   ├── fields.json         # Seletores HTML (⚠️ PLACEHOLDERS)
│   └── categorias.csv      # 23 categorias jurídicas
├── prompts/
│   ├── prompt_categoria.txt
│   └── prompt_regras_agente.txt
├── logs/                   # Logs de execução
├── screenshots/            # Screenshots de debug
├── scraps/                 # Dados extraídos (JSON)
├── .env.sample            # Exemplo de variáveis de ambiente
├── .gitignore
├── index.js               # Script principal (⚠️ INCOMPLETO)
├── package.json
└── README.md
```

---

## 🔧 Desenvolvimento

### Próximos Passos

1. **Resolver Cloudflare Turnstile**
   - Investigar API oficial do STJ
   - Implementar scraping manual assistido
   - Avaliar serviços especializados

2. **Analisar Estrutura HTML**
   - Usar screenshots fornecidos
   - Identificar seletores corretos
   - Atualizar `config/fields.json`

3. **Implementar Extração**
   - Conectar ao Scrapeless
   - Navegar até página de busca
   - Preencher formulário
   - Extrair resultados

4. **Testar Categorização**
   - Validar categorias OpenAI
   - Verificar embeddings
   - Confirmar upload Pinecone

---

## 📝 Notas Técnicas

### Cloudflare Turnstile vs reCAPTCHA V2

| Aspecto | reCAPTCHA V2 | Cloudflare Turnstile |
|---------|--------------|---------------------|
| **TJSP** | ❌ Não usa | ✅ Usa (Scrapeless resolve) |
| **STF** | ❌ Não usa | ❌ Não usa (AWS WAF) |
| **STJ** | ❌ Não usa | ✅ Usa (Scrapeless **NÃO** resolve) |

### Diferenças STJ vs STF

- **STF**: AWS WAF (sem CAPTCHA visível)
- **STJ**: Cloudflare Turnstile (CAPTCHA visível e bloqueante)

---

## 📄 Licença

MIT

---

## 👤 Autor

Sulivan Leite

