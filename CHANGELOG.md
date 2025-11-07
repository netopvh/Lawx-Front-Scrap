# Changelog

## [2025-11-07] - TJSP e STF Funcionais com Proxy ANY

### ✅ TJSP - Resolvido problema de bot detection
**Problema**: TJSP detectava "suspeita de acesso via robô" mesmo com CAPTCHA resolvido

**Solução**:
- Ativar proxy com país ANY (`SCRAPELESS_PROXY=TRUE`, `SCRAPELESS_PROXY_COUNTRY=ANY`)
- Aguardar navegação completa com `networkidle2` (timeout 60s)
- Adicionar diagnóstico detalhado (título, URL, body text)
- Aumentar delay pós-validação para 3s

**Resultado**:
- ✅ 60 jurisprudências extraídas (3 páginas)
- ✅ 100% categorização OpenAI (14 categorias)
- ✅ 100% upload Pinecone
- ✅ Div#tabs encontrada
- ✅ Paginação funcionando

**Configuração final**:
```env
SCRAPELESS_PROXY=TRUE
SCRAPELESS_PROXY_COUNTRY=ANY
ANTI_DETECTION_EXPERIMENTAL=FALSE
HUMAN_DELAY_MULTIPLIER=2.0
PUPPETEER_EVERY_PAGE_ANONIMOUS=FALSE
```

---

### ✅ STF - Resolvido problema de URL modificada pelo Scrapeless
**Problema**: Scrapeless modificava URL de `jurisprudencia` para `jurisprudenncia` (com "nn" extra), causando erro `net::ERR_CERT_AUTHORITY_INVALID`

**Solução**:
- Ativar proxy com país ANY (`SCRAPELESS_PROXY=TRUE`, `SCRAPELESS_PROXY_COUNTRY=ANY`)

**Resultado**:
- ✅ 20 jurisprudências extraídas (páginas 2 e 3, página 1 sem resultados)
- ✅ 100% categorização OpenAI (4 categorias)
- ✅ 100% upload Pinecone
- ✅ URL correta mantida

**Configuração final**:
```env
SCRAPELESS_PROXY=TRUE
SCRAPELESS_PROXY_COUNTRY=ANY
```

---

### 📝 Próximos passos
- [ ] Desenvolver/corrigir STJ
- [ ] Testar TFR (quando disponível)
- [ ] Aumentar número de páginas processadas em produção

