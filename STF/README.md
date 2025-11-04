# 🏛️ STF Scraper - Sistema de Extração de Jurisprudências

Sistema automatizado para extração de dados de jurisprudências do **Supremo Tribunal Federal (STF)** usando Scrapeless Cloud Browser com detecção automática de AWS WAF.

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
- [Diferenças vs TJSP](#diferenças-vs-tjsp)

---

## 🎯 Sobre o Projeto

Este projeto automatiza a extração de dados de jurisprudências do STF usando **Scrapeless Cloud Browser** para escalabilidade. O site do STF **não possui CAPTCHA**, mas utiliza **AWS WAF (Web Application Firewall)** que é detectado e resolvido automaticamente pelo sistema.

### Tecnologias Utilizadas

- **Node.js** - Runtime JavaScript
- **Puppeteer-core** - Automação de navegador via WebSocket
- **Scrapeless** - Navegador cloud escalável
- **dotenv** - Gerenciamento de variáveis de ambiente

---

## ✨ Funcionalidades

- ✅ **Scrapeless Cloud Browser** - Navegador cloud para escalabilidade
- ✅ **Detecção automática de AWS WAF** - Aguarda resolução do challenge JavaScript
- ✅ **URL com parâmetros GET** - Construção direta de URLs sem formulários
- ✅ **Paginação simples** - Via parâmetros `page=1`, `page=2`, etc.
- ✅ **Sem CAPTCHA** - Site não possui CAPTCHA (apenas AWS WAF)
- ✅ **Logs detalhados** em arquivo e console
- ✅ **Screenshots automáticos** de debug quando necessário
- ✅ **Configuração via JSON** (sem código)
- ✅ **Extração estruturada de dados** (sem HTML desnecessário)

---

## 📦 Pré-requisitos

- **Node.js** 18+ instalado
- **Conta Scrapeless** (obtenha em [scrapeless.com](https://scrapeless.com/))
- **Token da API Scrapeless**

---

## 🚀 Instalação

1. **Navegue até o diretório STF:**
   ```bash
   cd STF
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Configure as variáveis de ambiente:**
   
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
SCRAPELESS_SESSION_RECORDING=true
SCRAPELESS_SESSION_TTL=900
SCRAPELESS_SESSION_NAME=STF Scraper - Cloud Browser

# URL do STF (OPCIONAL)
STF_URL=https://jurisprudencia.stf.jus.br/pages/search
```

⚠️ **IMPORTANTE**: Não use `SCRAPELESS_PROXY_COUNTRY=BR` pois causa erros de túnel. O Scrapeless escolhe automaticamente o melhor proxy.

### 2. Configuração de Busca (`config/busca.json`)

Este é o arquivo **MAIS IMPORTANTE** do projeto. É aqui que você define **O QUE** será buscado no STF.

#### Exemplo de Configuração:

```json
{
  "queryString": "Advogados",
  "base": "acordaos",
  "pesquisa_inteiro_teor": false,
  "sinonimo": true,
  "plural": true,
  "radicais": false,
  "buscaExata": true,
  "page": "1-3",
  "pageSize": 10,
  "sort": "_score",
  "sortBy": "desc"
}
```

#### Campos Disponíveis:

| Campo | Tipo | Descrição | Exemplo |
|-------|------|-----------|---------|
| `queryString` | Texto | Termo de busca | `"Advogados"` |
| `base` | Texto | **Tipo de documento** (ver opções abaixo) | `"acordaos"`, `"decisoes"`, `"sumulas"` |
| `pesquisa_inteiro_teor` | Boolean | Buscar no texto completo | `true` ou `false` |
| `sinonimo` | Boolean | Buscar sinônimos | `true` ou `false` |
| `plural` | Boolean | Buscar plural | `true` ou `false` |
| `radicais` | Boolean | Buscar radicais | `true` ou `false` |
| `buscaExata` | Boolean | Busca exata | `true` ou `false` |
| `page` | Texto | Paginação (ver abaixo) | `"1-3"` ou `"1,3,5"` |
| `pageSize` | Número | Resultados por página | `10` a `100` |
| `sort` | Texto | Campo de ordenação | `"_score"`, `"data"` |
| `sortBy` | Texto | Direção da ordenação | `"asc"` ou `"desc"` |

#### 📚 **Opções de Base de Dados (`base`)**

O parâmetro `base` permite escolher entre diferentes tipos de documentos jurídicos:

| Valor | Descrição | Quantidade Aproximada |
|-------|-----------|----------------------|
| `acordaos` | **Acórdãos** (padrão) | ~31.000 documentos |
| `repercussao_geral` | Repercussão Geral | ~500 documentos |
| `sumulas` | Súmulas | ~12 documentos |
| `decisoes` | Decisões Monocráticas | ~122.000 documentos |
| `informativos` | Informativos | ~600 documentos |

**Exemplos de uso:**

```json
// Buscar súmulas sobre direito tributário
{
  "queryString": "Direito Tributário",
  "base": "sumulas",
  "page": "1-5",
  "pageSize": 50
}

// Buscar decisões monocráticas sobre contratos
{
  "queryString": "Contratos",
  "base": "decisoes",
  "page": "1-10",
  "pageSize": 100
}

// Buscar informativos sobre direitos humanos
{
  "queryString": "Direitos Humanos",
  "base": "informativos",
  "page": "1-3",
  "pageSize": 20
}
```

---

## 📄 Paginação - Regras de Negócio

O campo `"page"` em `config/busca.json` controla quais páginas serão processadas. Você tem **2 formatos** disponíveis:

### 1. **Intervalo de Páginas**
```json
"page": "1-5"
```
- Processa **páginas 1, 2, 3, 4 e 5** (intervalo contínuo)
- Formato: `"início-fim"`

### 2. **Páginas Específicas**
```json
"page": "1,3,5,10"
```
- Processa **apenas as páginas 1, 3, 5 e 10** (páginas isoladas)
- Formato: números separados por `,` (vírgula)

### Exemplos Práticos:

| Configuração | Resultado |
|--------------|-----------|
| `"page": "1-3"` | Páginas 1, 2 e 3 |
| `"page": "1,5,10"` | Páginas 1, 5 e 10 |
| `"page": "2-5"` | Páginas 2, 3, 4 e 5 |
| `"page": "1-10"` | Páginas 1 a 10 |

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
   - **Screenshots**: `screenshots/` (quando necessário)

---

## 📊 Estrutura de Dados

### JSON de Saída (`scraps/scrap_*.json`)

```json
{
  "timestamp": "2025-11-04T17:17:18.208Z",
  "total_items": 30,
  "total_pages": 3,
  "items": [
    {
      "numero_processo": "RE 1182189",
      "tipo_decisao": "Repercussão Geral",
      "orgao_julgador": "Tribunal Pleno",
      "relator": "Min. MARCO AURÉLIO",
      "ementa": "Texto completo da ementa..."
    }
  ]
}
```

### Campos Extraídos:

| Campo | Descrição |
|-------|-----------|
| `numero_processo` | Número do processo (ex: RE 1182189) |
| `tipo_decisao` | Tipo de decisão |
| `orgao_julgador` | Órgão julgador |
| `relator` | Nome do relator |
| `ementa` | Texto completo da ementa |

⚠️ **NOTA**: Os seletores em `config/fields.json` ainda precisam ser refinados para extrair todos os campos corretamente.

---

## 📸 Screenshots e Logs

### Screenshots Automáticos

O sistema captura screenshots quando:

| Prefixo | Quando | Descrição |
|---------|--------|-----------|
| `no-results_` | ⚠️ Sem resultados | Quando nenhum resultado é encontrado |

### Logs

Todos os logs são salvos em:
- **Console**: Saída em tempo real
- **Arquivo**: `logs/log_YYYY-MM-DD_HH-MM-SS.log`

Exemplo de log:
```
[2025-11-04T17:16:28.655Z] [INFO] === INICIANDO SCRAPER STF ===
[2025-11-04T17:16:32.476Z] [SUCCESS] ✅ Conectado ao browser cloud!
[2025-11-04T17:16:40.890Z] [WARNING] ⚠️ AWS WAF Challenge detectado! Aguardando resolução...
[2025-11-04T17:16:57.921Z] [SUCCESS] ✅ AWS WAF Challenge resolvido!
[2025-11-04T17:17:01.103Z] [SUCCESS] ✅ 10 resultados encontrados na página
[2025-11-04T17:17:01.290Z] [SUCCESS] ✅ Página 1: 10 itens extraídos
```

---

## 🔧 Regras de Negócio

### 1. Detecção de AWS WAF Challenge

O sistema detecta automaticamente se a página contém AWS WAF Challenge procurando por:
- `AwsWafIntegration` no HTML
- `challenge-container` no HTML

Quando detectado:
- ⏳ Aguarda até 90 segundos para resolução automática
- ✅ Verifica a cada 1 segundo se o conteúdo real carregou
- 📝 Loga o processo completo

### 2. Validação de Sucesso

O scraper só considera sucesso quando:
1. ✅ Página foi carregada
2. ✅ AWS WAF foi resolvido (se presente)
3. ✅ Elementos `.result-container` foram encontrados
4. ✅ Dados foram extraídos

### 3. Estrutura de Dados

- **Sem HTML**: Apenas dados estruturados
- **Campos vazios**: Representados como `""` (string vazia)

---

## 🐛 Troubleshooting

### Erro: "net::ERR_TUNNEL_CONNECTION_FAILED"

**Causa**: Problema intermitente com proxy do Scrapeless.

**Solução**: 
- Execute novamente (erro é temporário)
- Verifique se não está usando `SCRAPELESS_PROXY_COUNTRY` no `.env`

### Erro: "AWS WAF Challenge não foi resolvido"

**Causa**: Timeout aguardando o AWS WAF resolver o challenge (90 segundos).

**Solução**:
1. Verifique sua conexão com internet
2. Aumente o timeout em `index.js` (linha ~340):
   ```javascript
   { timeout: 120000, polling: 1000 }
   ```
3. Verifique se o token Scrapeless está correto
4. Verifique se tem créditos na conta Scrapeless

### Nenhum resultado encontrado

**Causa**: Seletores HTML podem ter mudado ou busca não retorna resultados.

**Solução**:
1. Teste a mesma busca manualmente no site do STF
2. Execute `node inspect-page.js` para inspecionar a estrutura HTML
3. Atualize `config/fields.json` com os seletores corretos

### Dados extraídos estão incorretos

**Causa**: Seletores em `config/fields.json` estão muito genéricos.

**Solução**:
1. Execute `node extract-sample.js` para ver a estrutura HTML real
2. Refine os seletores em `config/fields.json`

---

## 📁 Estrutura do Projeto

```
STF/
├── config/
│   ├── busca.json          # ⚙️ Configuração de busca (EDITE AQUI)
│   └── fields.json         # 🗺️ Mapeamento de campos (REFINAR)
├── logs/                   # 📝 Logs de execução
├── screenshots/            # 📸 Screenshots de debug
├── scraps/                 # 💾 Dados extraídos (JSON)
├── .env                    # 🔐 Variáveis de ambiente (NÃO COMMITAR)
├── index.js                # 🚀 Script principal
├── inspect-page.js         # 🔍 Script de inspeção HTML
├── extract-sample.js       # 📄 Script de extração de amostra
├── package.json            # 📦 Dependências
└── README.md               # 📖 Este arquivo
```

---

## 🔄 Diferenças vs TJSP

| Aspecto | TJSP | STF |
|---------|------|-----|
| **CAPTCHA** | ✅ Cloudflare Turnstile | ❌ Não possui |
| **AWS WAF** | ❌ Não possui | ✅ Possui (auto-resolvido) |
| **Fingerprint** | ✅ Customizado | ❌ Não necessário |
| **Proxy Country** | ✅ BR | ❌ Removido (causa erros) |
| **Método de busca** | POST com formulário | GET com URL params |
| **Paginação** | AJAX complexo | URL params simples |
| **Velocidade** | ~2min/página | ~20s/página |
| **OpenAI** | ✅ Categorização | ❌ Não implementado |
| **Pinecone** | ✅ Upload vetores | ❌ Não implementado |

---

## 📝 Notas Técnicas

### AWS WAF Challenge

O site do STF usa AWS WAF (Web Application Firewall) que apresenta um challenge JavaScript na primeira requisição:

```javascript
// Detecta AWS WAF
const hasWafChallenge = await page.evaluate(() => {
  return document.body.innerHTML.includes('AwsWafIntegration');
});

// Aguarda resolução automática
if (hasWafChallenge) {
  await page.waitForFunction(
    () => {
      const hasResults = document.querySelector('.result-container') !== null;
      const noChallenge = !document.body.innerHTML.includes('AwsWafIntegration');
      return hasResults && noChallenge;
    },
    { timeout: 90000, polling: 1000 }
  );
}
```

O WAF executa JavaScript que:
1. Gera um token via `AwsWafIntegration.getToken()`
2. Recarrega a página automaticamente
3. Libera o acesso ao conteúdo real

### Scrapeless sem Proxy Country

O scraper **NÃO** usa `proxyCountry: "BR"` pois estava causando erros `ERR_TUNNEL_CONNECTION_FAILED`. Sem especificar o país, o Scrapeless escolhe automaticamente o melhor proxy e funciona perfeitamente.

---

## 🔮 Próximas Melhorias

- [ ] Refinar seletores em `config/fields.json` para extrair todos os campos corretamente
- [ ] Adicionar extração de PDF (se disponível)
- [ ] Implementar retry automático em caso de erros
- [ ] Adicionar validação de dados extraídos
- [ ] Implementar categorização com OpenAI (opcional)
- [ ] Implementar upload para Pinecone (opcional)

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

