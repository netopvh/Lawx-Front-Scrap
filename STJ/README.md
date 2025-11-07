# 🏛️ Scraper STJ/TFR - Superior Tribunal de Justiça / Tribunal Federal de Recursos

Extrai jurisprudências do site do STJ usando **Scrapeless Cloud Browser** com suporte a **Cloudflare Turnstile**.

## ⚠️ STATUS ATUAL: BLOQUEADO POR CLOUDFLARE TURNSTILE

**PROBLEMA IDENTIFICADO:**
- O site do STJ usa **Cloudflare Turnstile** (não reCAPTCHA V2)
- O Scrapeless **detecta** o Cloudflare (`type: "cloudflare"`)
- O Scrapeless **NÃO consegue resolver** automaticamente
- Página fica presa em "Just a moment..."

**SOLUÇÕES POSSÍVEIS:**
1. **API Oficial**: Verificar se STJ oferece API pública
2. **Scraping Manual Assistido**: Usuário resolve CAPTCHA, script continua automaticamente
3. **Serviço Especializado**: FlareSolverr (open-source) ou 2Captcha/Anti-Captcha (pagos)
4. **Análise de Screenshots**: Implementar seletores baseados em screenshots fornecidos

---

## 📋 Características

- ✅ **Scrapeless Cloud Browser** (escalabilidade)
- ✅ **Suporte Dual Tribunal**: STJ e TFR
- ✅ **Campo sigla_tribunal**: Identificação do tribunal de origem
- ⚠️ **Cloudflare Turnstile**: BLOQUEIO ATIVO - NÃO RESOLVIDO
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
# - SCRAPELESS_TOKEN
# - OPENAI_API_KEY
# - PINECONE_API_KEY
```

---

## ⚙️ Configuração

### 1. Variáveis de Ambiente (`.env`)

```env
# Scrapeless
SCRAPELESS_TOKEN=sk_YOUR_TOKEN_HERE
SCRAPELESS_PROXY_COUNTRY=BR
SCRAPELESS_SESSION_RECORDING=true
SCRAPELESS_SESSION_TTL=900
SCRAPELESS_SESSION_NAME=STJ Scraper - Cloudflare Turnstile

# STJ URL
STJ_URL=https://scon.stj.jus.br/SCON/

# OpenAI
OPENAI_API_KEY=sk-proj-YOUR_OPENAI_API_KEY_HERE
OPENAI_MODEL=gpt-4o-mini

# Pinecone
PINECONE_API_KEY=pcsk_YOUR_PINECONE_API_KEY_HERE
PINECONE_ENVIRONMENT=us-east-1
PINECONE_CLOUD=aws
PINECONE_INDEX_NAME=jurisprudencias-tjsp
PINECONE_DIMENSION=1536
PINECONE_TYPE=DENSE
PINECONE_CAPACITY_MODE=SERVERLESS
```

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

