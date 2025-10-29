# Configuração de Busca TJSP

Este diretório contém os arquivos de configuração para o scraper do TJSP.

## Arquivos

- **`busca.json`** - Arquivo de configuração principal (edite este arquivo)
- **`busca-exemplo.json`** - Exemplo de configuração preenchida
- **`README.md`** - Este arquivo de documentação

## Como Usar

1. Edite o arquivo `busca.json` com os parâmetros de busca desejados
2. Execute o scraper: `node index.js`
3. O scraper irá ler a configuração e preencher o formulário automaticamente

## 🎯 Nomes Amigáveis

Os campos no arquivo `busca.json` usam **exatamente os mesmos nomes que aparecem no formulário do TJSP**, tornando muito mais fácil saber o que preencher!

Por exemplo:
- ✅ `"Pesquisa livre"` ao invés de `"buscaInteiroTeor"`
- ✅ `"Data de publicação (início)"` ao invés de `"dtPublicacaoInicio"`
- ✅ `"Origem": ["2° grau"]` ao invés de `"origensSelecionadas": ["T"]`

## Campos Disponíveis

### Campos de Texto

| Campo no JSON | Descrição | Exemplo |
|---------------|-----------|---------|
| `"Pesquisa livre"` | Busca livre no texto completo do acórdão | `"Advogado"` |
| `"Pesquisa livre (ementa)"` | Busca livre na ementa do acórdão | `"Responsabilidade civil"` |
| `"Número do processo"` | Número do processo de origem | `"1234567-89.2024.8.26.0100"` |
| `"Número do registro"` | Número do registro do acórdão | `"2024.0000123456"` |
| `"Data de julgamento (início)"` | Data inicial de julgamento | `"01/01/2024"` |
| `"Data de julgamento (fim)"` | Data final de julgamento | `"31/12/2024"` |
| `"Data de publicação (início)"` | Data inicial de publicação | `"01/01/2024"` |
| `"Data de publicação (fim)"` | Data final de publicação | `"31/12/2024"` |
| `"Nome do agente"` | Nome do agente (advogado, promotor, etc) | `"João da Silva"` |
| `"Nome do juiz"` | Nome do juiz/relator | `"Maria Santos"` |
| `"Nome da comarca"` | Nome da comarca | `"São Paulo"` |
| `"Classe processual"` | Classe processual | `"Apelação"` |
| `"Assunto"` | Assunto do processo | `"Direito Civil"` |
| `"Seção"` | Seção do tribunal | `"Direito Privado"` |

### Campos Booleanos

| Campo no JSON | Descrição | Valores |
|---------------|-----------|---------|
| `"Pesquisar com sinônimos"` | Pesquisar com sinônimos | `true` ou `false` |

### Campos de Array (Múltipla Escolha)

| Campo no JSON | Descrição | Valores Possíveis |
|---------------|-----------|-------------------|
| `"Origem"` | Origens da decisão | `["2° grau"]`<br>`["Colégios Recursais"]`<br>`["2° grau", "Colégios Recursais"]` |
| `"Tipo de decisão"` | Tipos de decisão | `["Acórdãos"]`<br>`["Homologações"]`<br>`["Decisões Monocráticas"]`<br>`["Acórdãos", "Homologações", "Decisões Monocráticas"]` |

### Campos de Seleção (Escolha Única)

| Campo no JSON | Descrição | Valores Possíveis |
|---------------|-----------|-------------------|
| `"Ordenar por"` | Ordenação dos resultados | `"Data de Publicação"` ou `"Relevância"` |

## Exemplos de Uso

### Exemplo 1: Busca Simples

```json
{
  "Pesquisa livre": "Advogado",
  "Pesquisar com sinônimos": true,
  "Origem": ["2° grau"],
  "Tipo de decisão": ["Acórdãos"],
  "Ordenar por": "Data de Publicação"
}
```

### Exemplo 2: Busca por Período

```json
{
  "Pesquisa livre": "Responsabilidade civil",
  "Data de publicação (início)": "01/01/2024",
  "Data de publicação (fim)": "31/12/2024",
  "Pesquisar com sinônimos": true,
  "Origem": ["2° grau"],
  "Tipo de decisão": ["Acórdãos"],
  "Ordenar por": "Data de Publicação"
}
```

### Exemplo 3: Busca por Número de Processo

```json
{
  "Número do processo": "1234567-89.2024.8.26.0100",
  "Origem": ["2° grau"],
  "Tipo de decisão": ["Acórdãos", "Homologações", "Decisões Monocráticas"],
  "Ordenar por": "Data de Publicação"
}
```

### Exemplo 4: Busca Avançada

```json
{
  "Pesquisa livre": "Dano moral",
  "Pesquisa livre (ementa)": "Indenização",
  "Data de publicação (início)": "01/01/2024",
  "Data de publicação (fim)": "31/12/2024",
  "Nome da comarca": "São Paulo",
  "Classe processual": "Apelação",
  "Assunto": "Direito Civil",
  "Pesquisar com sinônimos": true,
  "Origem": ["2° grau"],
  "Tipo de decisão": ["Acórdãos"],
  "Ordenar por": "Relevância"
}
```

## Notas Importantes

1. **Nomes amigáveis**: Use os nomes dos campos exatamente como aparecem no formulário do TJSP
2. **Strings vazias** (`""`) e **arrays vazios** (`[]`) são ignorados pelo scraper
3. **Campos booleanos** com valor `false` também são ignorados
4. **Datas** devem estar no formato `DD/MM/AAAA`
5. **Número de processo** deve seguir o formato padrão do CNJ: `NNNNNNN-DD.AAAA.J.TR.OOOO`
6. Os campos `_comentario`, `_instrucoes` e `_ajuda` são apenas informativos e são ignorados pelo scraper
7. **Conversão automática**: O scraper converte automaticamente os nomes amigáveis para os nomes técnicos dos campos

## Estrutura do Arquivo

O arquivo `busca.json` deve conter um objeto JSON com os campos que você deseja preencher. Você pode deixar campos vazios se não quiser usá-los:

```json
{
  "_comentario": "Configuração de busca para TJSP",
  "_instrucoes": "Use os nomes dos campos como aparecem no formulário",

  "Pesquisa livre": "Seu termo de busca aqui",
  "Data de publicação (início)": "01/01/2024",
  "Data de publicação (fim)": "31/12/2024",
  "Pesquisar com sinônimos": true,
  "Origem": ["2° grau"],
  "Tipo de decisão": ["Acórdãos"],
  "Ordenar por": "Data de Publicação",

  "_ajuda": {
    "Pesquisa livre": "Busca no texto completo",
    ...
  }
}
```

## Mapeamento de Valores

O scraper converte automaticamente os valores amigáveis para os valores técnicos:

### Origem
- `"2° grau"` → `"T"`
- `"Colégios Recursais"` → `"R"`

### Tipo de decisão
- `"Acórdãos"` → `"A"`
- `"Homologações"` → `"H"`
- `"Decisões Monocráticas"` → `"D"`

### Ordenar por
- `"Data de Publicação"` → `"dtPublicacao"`
- `"Relevância"` → `"relevancia"`

## Troubleshooting

- **Erro ao carregar configuração**: Verifique se o arquivo `busca.json` está no diretório `config/` e se é um JSON válido
- **Campos não preenchidos**: Verifique se os nomes dos campos estão corretos e se os valores não estão vazios
- **Datas inválidas**: Certifique-se de usar o formato `DD/MM/AAAA`
- **Arrays vazios**: Se não quiser usar um campo de array, deixe-o como `[]`

