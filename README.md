# 🏛️ TJSP Scraper - Sistema de Extração de Acórdãos

Sistema automatizado para extração de dados de acórdãos do **Tribunal de Justiça de São Paulo (TJSP)** com bypass automático de CAPTCHA usando Scrapeless.

## 📋 Índice

- [Sobre o Projeto](#sobre-o-projeto)
- [Funcionalidades](#funcionalidades)
- [Pré-requisitos](#pré-requisitos)
- [Instalação](#instalação)
- [Configuração](#configuração)
- [Como Usar](#como-usar)
- [Estrutura de Dados](#estrutura-de-dados)
- [Screenshots e Logs](#screenshots-e-logs)
- [Regras de Negócio](#regras-de-negócio)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Sobre o Projeto

Este projeto automatiza a extração de dados de acórdãos do TJSP, contornando proteções de CAPTCHA (Cloudflare Turnstile e reCAPTCHA) através do serviço **Scrapeless**. Os dados são extraídos de forma estruturada e salvos em formato JSON para fácil processamento.

### Tecnologias Utilizadas

- **Node.js** - Runtime JavaScript
- **Puppeteer** - Automação de navegador
- **Scrapeless** - Serviço de bypass de CAPTCHA
- **dotenv** - Gerenciamento de variáveis de ambiente

---

## ✨ Funcionalidades

- ✅ **Bypass automático de CAPTCHA** (Cloudflare Turnstile e reCAPTCHA)
- ✅ **Extração estruturada de dados** (sem HTML desnecessário)
- ✅ **Paginação flexível** (processar páginas específicas ou todas)
- ✅ **Logs detalhados** em arquivo e console
- ✅ **Screenshots automáticos** de sucesso e erro
- ✅ **Configuração via JSON** (sem código)
- ✅ **Detecção de falhas** no bypass de CAPTCHA
- ✅ **URLs de PDF** extraídas automaticamente

---

## 📦 Pré-requisitos

- **Node.js** 18+ instalado
- **Conta Scrapeless** (obtenha em [scrapeless.com](https://scrapeless.com/))
- **Token da API Scrapeless**

---

## 🚀 Instalação

1. **Clone o repositório:**
   ```bash
   git clone <url-do-repositorio>
   cd Lawx-TJSP
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Configure as variáveis de ambiente:**
   ```bash
   cp .env.sample .env
   ```
   
   Edite o arquivo `.env` e adicione seu token Scrapeless:
   ```env
   SCRAPELESS_TOKEN=sk_SEU_TOKEN_AQUI
   ```

---

## ⚙️ Configuração

### 1. Variáveis de Ambiente (`.env`)

```env
# Token da API Scrapeless (OBRIGATÓRIO)
SCRAPELESS_TOKEN=sk_SEU_TOKEN_AQUI

# Configurações do Scrapeless (OPCIONAL)
SCRAPELESS_PROXY_COUNTRY=BR
SCRAPELESS_SESSION_RECORDING=true
SCRAPELESS_SESSION_TTL=900
SCRAPELESS_SESSION_NAME=TJSP Scraper - Cloudflare Turnstile

# URL do TJSP (OPCIONAL)
TJSP_URL=https://esaj.tjsp.jus.br/cjsg/resultadoCompleta.do
```

### 2. Configuração de Busca (`config/busca.json`)

Este é o arquivo **MAIS IMPORTANTE** do projeto. É aqui que você define **O QUE** será buscado no TJSP.

#### Exemplo de Configuração:

```json
{
  "Pesquisa livre": "Advogados",
  "Pesquisa livre (ementa)": "",
  "Número do processo": "",
  
  "Data de publicação (início)": "01/01/2025",
  "Data de publicação (fim)": "31/12/2025",
  
  "Pesquisar com sinônimos": true,
  
  "Origem": ["2° grau"],
  "Tipo de decisão": ["Acórdãos"],
  "Ordenar por": "Data de Publicação",
  
  "Pagina": "1-3"
}
```

#### Campos Disponíveis:

| Campo | Tipo | Descrição | Exemplo |
|-------|------|-----------|---------|
| `Pesquisa livre` | Texto | Busca no texto completo | `"Advogados"` |
| `Pesquisa livre (ementa)` | Texto | Busca apenas na ementa | `"Dano moral"` |
| `Número do processo` | Texto | Número específico | `"1234567-89.2023.8.26.0100"` |
| `Data de publicação (início)` | Data | Data inicial | `"01/01/2025"` |
| `Data de publicação (fim)` | Data | Data final | `"31/12/2025"` |
| `Pesquisar com sinônimos` | Boolean | Ativar sinônimos | `true` ou `false` |
| `Origem` | Array | Origem dos processos | `["2° grau"]` |
| `Tipo de decisão` | Array | Tipos de decisão | `["Acórdãos"]` |
| `Ordenar por` | Texto | Ordenação | `"Data de Publicação"` |
| `Pagina` | Texto | Paginação (ver abaixo) | `"1-3"` |

---

## 📄 Paginação - Regras de Negócio

O campo `"Pagina"` em `config/busca.json` controla quais páginas serão processadas. Você tem **4 formatos** disponíveis:

### 1. **Página Única**
```json
"Pagina": "1"
```
- Processa **apenas a página 1**

### 2. **Intervalo de Páginas**
```json
"Pagina": "1-5"
```
- Processa **páginas 1, 2, 3, 4 e 5** (intervalo contínuo)
- Formato: `"início-fim"`

### 3. **Páginas Específicas**
```json
"Pagina": "1;3;5;10"
```
- Processa **apenas as páginas 1, 3, 5 e 10** (páginas isoladas)
- Formato: números separados por `;` (ponto e vírgula)

### 4. **Todas as Páginas**
```json
"Pagina": "TODAS"
```
ou
```json
"Pagina": "ALL"
```
ou
```json
"Pagina": "TODOS"
```
- Processa **TODAS as páginas disponíveis** no resultado
- ⚠️ **ATENÇÃO**: Pode levar muito tempo se houver milhares de páginas!

### Exemplos Práticos:

| Configuração | Resultado |
|--------------|-----------|
| `"Pagina": "1"` | Apenas página 1 |
| `"Pagina": "1-3"` | Páginas 1, 2 e 3 |
| `"Pagina": "1;5;10"` | Páginas 1, 5 e 10 |
| `"Pagina": "TODAS"` | Todas as páginas disponíveis |
| `"Pagina": "2-5"` | Páginas 2, 3, 4 e 5 |

---

## 🎮 Como Usar

1. **Configure sua busca** em `config/busca.json`
2. **Execute o scraper:**
   ```bash
   node index.js
   ```

3. **Acompanhe o progresso** nos logs do terminal

4. **Verifique os resultados:**
   - **JSON**: `scraps/scrap_YYYY-MM-DD_HH-MM-SS.json`
   - **Logs**: `logs/log_YYYY-MM-DD_HH-MM-SS.log`
   - **Screenshots**: `screenshots/shot_YYYY-MM-DD_HH-MM-SS.png`

---

## 📊 Estrutura de Dados

### JSON de Saída (`scraps/scrap_*.json`)

```json
{
  "timestamp": "2025-10-29T17:03:23.456Z",
  "total_resultados": 2564715,
  "total_paginas": 128236,
  "paginas_processadas": [1, 2, 3],
  "items": [
    {
      "numero_processo": "0001431-34.2023.8.26.0238",
      "classe_assunto": "Apelação Cível / Esbulho / Turbação / Ameaça",
      "relator": "Claudia Sarmento Monteleone",
      "comarca": "Ibiúna",
      "orgao_julgador": "23ª Câmara de Direito Privado",
      "data_julgamento": "29/10/2025",
      "data_publicacao": "29/10/2025",
      "ementa": "Texto completo da ementa do acórdão...",
      "pdf_url": "https://esaj.tjsp.jus.br/cjsg/getArquivo.do?cdAcordao=19896042&conversao=pdf"
    }
  ]
}
```

### Campos Extraídos:

| Campo | Descrição |
|-------|-----------|
| `numero_processo` | Número do processo judicial |
| `classe_assunto` | Classe processual e assunto |
| `relator` | Nome do relator do acórdão |
| `comarca` | Comarca de origem |
| `orgao_julgador` | Câmara ou órgão julgador |
| `data_julgamento` | Data do julgamento |
| `data_publicacao` | Data de publicação |
| `ementa` | Texto completo da ementa |
| `pdf_url` | URL para download do PDF |

---

## 📸 Screenshots e Logs

### Screenshots Automáticos

O sistema captura 3 tipos de screenshots:

| Prefixo | Quando | Descrição |
|---------|--------|-----------|
| `shot_` | ✅ Sucesso | Quando div#tabs é encontrada |
| `error_` | ❌ Erro | Qualquer erro que impede o submit |
| `captcha-bypass-fail_` | 🚫 Bypass falhou | Mensagem de reCAPTCHA detectada |

### Logs

Todos os logs são salvos em:
- **Console**: Saída em tempo real
- **Arquivo**: `logs/log_YYYY-MM-DD_HH-MM-SS.log`

Exemplo de log:
```
[2025-10-29T17:03:23.456Z] [INFO] === INICIANDO SCRAPER TJSP ===
[2025-10-29T17:03:24.123Z] [SUCCESS] ✅ Conectado ao browser!
[2025-10-29T17:03:30.789Z] [SUCCESS] ✅ CAPTCHA resolvido com sucesso!
[2025-10-29T17:03:35.456Z] [INFO] 📈 Resultados 1 a 20 de 2564715
[2025-10-29T17:03:35.457Z] [INFO] 📄 Total de páginas disponíveis: 128236
[2025-10-29T17:03:35.458Z] [INFO] 📚 Processando 3 página(s): 1, 2, 3
[2025-10-29T17:03:40.123Z] [SUCCESS] ✅ Página 1: 20 itens extraídos
```

---

## 🔧 Regras de Negócio

### 1. Detecção de Falha no Bypass

O sistema detecta automaticamente se o bypass do reCAPTCHA falhou procurando pela mensagem:

> "Esta página é protegida por reCAPTCHA e ocorreu um problema de validação. Aguarde alguns segundos e tente novamente!"

Quando detectada:
- ❌ Processo é **interrompido imediatamente**
- 📸 Screenshot `captcha-bypass-fail_*.png` é capturado
- 🚫 **NÃO** tenta buscar div#tabs (pois nunca existirá)

### 2. Validação de Sucesso

O scraper só considera sucesso quando:
1. ✅ Formulário foi preenchido
2. ✅ Submit foi realizado
3. ✅ `div#tabs` foi encontrada na página
4. ✅ Dados foram extraídos

### 3. Estrutura de Dados

- **Sem HTML**: Apenas dados estruturados
- **Campos vazios**: Representados como `""` (string vazia)
- **PDF ausente**: `pdf_url: ""`

---

## 🐛 Troubleshooting

### Erro: "Arquivo fields.json não encontrado"
- Verifique se `config/fields.json` existe
- Execute `npm install` novamente

### Erro: "Timeout esperando resolução do CAPTCHA"
- Verifique seu token Scrapeless
- Verifique se tem créditos na conta Scrapeless

### Bypass do reCAPTCHA falhou
- Aguarde alguns minutos e tente novamente
- O TJSP pode estar bloqueando temporariamente

### Nenhum item extraído
- Verifique se os critérios de busca retornam resultados
- Teste a mesma busca manualmente no site do TJSP

---

## 📁 Estrutura do Projeto

```
Lawx-TJSP/
├── config/
│   ├── busca.json          # ⚙️ Configuração de busca (EDITE AQUI)
│   └── fields.json         # 🗺️ Mapeamento de campos
├── logs/                   # 📝 Logs de execução
├── screenshots/            # 📸 Screenshots automáticos
├── scraps/                 # 💾 Dados extraídos (JSON)
├── .env                    # 🔐 Variáveis de ambiente (NÃO COMMITAR)
├── .env.sample             # 📋 Exemplo de variáveis
├── .gitignore              # 🚫 Arquivos ignorados
├── index.js                # 🚀 Script principal
├── package.json            # 📦 Dependências
└── README.md               # 📖 Este arquivo
```

---

## 📝 Licença

Este projeto é de uso interno. Todos os direitos reservados.

---

## 🤝 Suporte

Para dúvidas ou problemas:
1. Verifique a seção [Troubleshooting](#troubleshooting)
2. Revise os logs em `logs/`
3. Verifique os screenshots em `screenshots/`

---

**Desenvolvido com ❤️ para automação jurídica**

