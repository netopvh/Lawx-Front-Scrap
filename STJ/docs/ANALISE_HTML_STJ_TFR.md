# Análise da Estrutura HTML - STJ e TFR

## 📋 Status da Análise

**Data**: 2025-11-05  
**Analista**: AI Assistant  
**Objetivo**: Identificar seletores CSS para extração de dados de jurisprudência do STJ e TFR

---

## 🚨 PROBLEMA IDENTIFICADO

### Cloudflare Turnstile Bloqueando Acesso

Os arquivos HTML salvos (`stj-results-html_2025-11-05_17-15-49.html` e `tfr-results-html_2025-11-05_17-18-05.html`) **NÃO contêm os resultados da pesquisa**.

Ambos mostram apenas a página de verificação do **Cloudflare Turnstile**:

```html
<title>Just a moment...</title>
<h2>Verificação automática em andamento.</h2>
```

**Conclusão**: O Scrapeless detectou o CAPTCHA mas não conseguiu resolvê-lo automaticamente.

---

## 📸 Screenshots Disponíveis

### STJ
1. `screencapture-scon-stj-jus-br-SCON-pesquisar-resultado-stj-acordão-jsp-2025-11-05-12_33_25.pdf` (15MB)
   - **Contém**: Captura completa da página de resultados de acórdãos do STJ
   - **Formato**: PDF (múltiplas páginas)
   - **Uso**: Análise visual da estrutura

2. `stj-results-test_2025-11-05_17-15-49.png` (228KB)
   - **Contém**: Screenshot de teste dos resultados
   - **Formato**: PNG

### TFR
1. `screencapture-scon-stj-jus-br-SCON-juritfr-resultado-toc-jsp-2025-11-05-12_29_11.png` (1.7MB)
   - **Contém**: Captura da página de resultados do TFR
   - **Formato**: PNG

2. `tfr-results-test_2025-11-05_17-18-05.png` (85KB)
   - **Contém**: Screenshot de teste dos resultados TFR
   - **Formato**: PNG

---

## 🔍 Análise Baseada em Conhecimento do STJ

### URLs Identificadas

#### STJ - Jurisprudência
- **Base**: `https://scon.stj.jus.br/SCON/`
- **Pesquisa**: `https://scon.stj.jus.br/SCON/pesquisar.jsp`
- **Resultados**: `https://scon.stj.jus.br/SCON/pesquisar/resultado.stj.acordao.jsp`

#### TFR - Jurisprudência
- **Base**: `https://scon.stj.jus.br/SCON/juritfr/`
- **Pesquisa**: `https://scon.stj.jus.br/SCON/juritfr/toc.jsp`
- **Resultados**: `https://scon.stj.jus.br/SCON/juritfr/resultado/toc.jsp`

---

## 📝 Estrutura Esperada (Baseada em Padrões do STJ)

### Campos a Extrair

#### STJ
1. **numero_processo** - Número do processo/acórdão
2. **classe** - Classe processual (REsp, AgRg, etc.)
3. **relator** - Ministro relator
4. **orgao_julgador** - Turma/Seção
5. **data_julgamento** - Data do julgamento
6. **data_publicacao** - Data da publicação
7. **ementa** - Texto da ementa
8. **link_detalhes** - Link para o inteiro teor
9. **decisao** - Tipo de decisão (Acórdão, Monocrática, etc.)
10. **ramo_direito** - Área do direito

#### TFR
1. **numero_acordao** - Número do acórdão
2. **classe** - Classe processual
3. **relator** - Ministro relator
4. **data_julgamento** - Data do julgamento
5. **data_publicacao** - Data da publicação
6. **ementa** - Texto da ementa
7. **link_detalhes** - Link para o inteiro teor
8. **fonte** - Fonte da publicação

---

## 🎯 Próximos Passos

### Fase 1: Análise Manual dos Screenshots ✅ EM ANDAMENTO
1. ✅ Identificar que os HTMLs salvos contêm apenas Cloudflare
2. ✅ Listar screenshots disponíveis
3. ⏳ **PRÓXIMO**: Analisar visualmente os screenshots para identificar:
   - Estrutura dos cards/itens de resultado
   - Classes CSS utilizadas
   - Hierarquia dos elementos
   - Diferenças entre STJ e TFR

### Fase 2: Implementação dos Seletores
1. Atualizar `config/fields.json` com seletores reais
2. Criar função de teste para validar seletores
3. Documentar diferenças entre STJ e TFR

### Fase 3: Implementação do Scraper
1. Copiar funções de CAPTCHA do TJSP
2. Implementar navegação e preenchimento de formulário
3. Implementar extração com seletores
4. Adicionar campo `sigla_tribunal`
5. Testar com resolução manual do CAPTCHA

---

## 📌 Notas Importantes

### Cloudflare Turnstile
- **Status**: Detectado pelo Scrapeless mas NÃO resolvido automaticamente
- **Solução**: Usar abordagem do TJSP (esperar resolução manual ou automática)
- **Referência**: `TJSP/index.js` linhas com funções:
  - `addCaptchaListener()`
  - `isCaptchaResolved()`
  - `onCaptchaFinished()`

### Campo sigla_tribunal
- **STJ**: `"sigla_tribunal": "STJ"`
- **TFR**: `"sigla_tribunal": "TFR"`
- **Implementação**: Baseado no valor do campo `tribunal` em `config/busca.json`

---

## 🔗 Referências

- **TJSP**: `D:/Workspace/Lawx-TJSP/TJSP/index.js` (1664 linhas)
- **STF**: `D:/Workspace/Lawx-TJSP/STF/index.js` (modificado com sigla_tribunal)
- **Screenshots**: `D:/Workspace/Lawx-TJSP/STJ/screenshots/`

---

## ⚠️ Ação Necessária

**USUÁRIO DEVE**:
1. Abrir os screenshots/PDF manualmente
2. Inspecionar a estrutura HTML dos resultados
3. Identificar os seletores CSS corretos
4. Informar ao assistente os seletores encontrados

**OU**

**ASSISTENTE PODE**:
1. Criar seletores genéricos baseados em padrões comuns
2. Implementar scraper com seletores placeholder
3. Testar e ajustar iterativamente com feedback do usuário

