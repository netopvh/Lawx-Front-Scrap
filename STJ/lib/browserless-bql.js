/**
 * ═══════════════════════════════════════════════════════════════════════
 * BROWSERLESS BQL CLIENT
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * Cliente para executar queries BQL (BrowserQL) no Browserless.
 * Baseado nos scripts que funcionaram em STJ/scripts/
 */

import fetch from 'node-fetch';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Configuração do Browserless BQL
 */
export class BrowserlessBQL {
  constructor(config = {}) {
    this.endpoint = config.endpoint || "https://production-sfo.browserless.io/chromium/bql";
    this.token = config.token || process.env.BROWSERLESS_API_KEY;
    this.proxyString = config.proxyString || "&proxy=residential&proxySticky=true&proxyCountry=br";
    this.optionsString = config.optionsString || "&humanlike=true&blockAds=true&blockConsentModals=true";
  }

  /**
   * Executa uma query BQL
   * @param {string} query - Query GraphQL/BQL
   * @param {string} operationName - Nome da operação
   * @param {object} variables - Variáveis da query
   * @returns {Promise<object>} Resultado da query
   */
  async execute(query, operationName = null, variables = {}) {
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        operationName,
        variables
      })
    };

    const url = `${this.endpoint}?token=${this.token}${this.proxyString}${this.optionsString}`;

    try {
      const response = await fetch(url, options);
      const data = await response.json();

      if (data.errors) {
        console.error('BQL Errors:', JSON.stringify(data.errors, null, 2));
        throw new Error(`BQL Error: ${data.errors[0]?.message || 'Unknown error'}`);
      }

      return data;
    } catch (error) {
      console.error('BQL Execution Error:', error);
      throw error;
    }
  }

  /**
   * Executa uma query BQL de um arquivo
   * @param {string} filePath - Caminho do arquivo .graphql
   * @param {string} operationName - Nome da operação
   * @param {object} variables - Variáveis da query
   * @returns {Promise<object>} Resultado da query
   */
  async executeFile(filePath, operationName = null, variables = {}) {
    const query = readFileSync(filePath, 'utf8');
    return this.execute(query, operationName, variables);
  }
}

/**
 * Query BQL para busca no STJ
 * Baseado em STJ/scripts/busca-stj.graphql
 */
export const STJ_SEARCH_QUERY = `
mutation STJSearch($searchTerm: String!, $dateStart: String, $dateEnd: String) {
  viewport(width: 1366, height: 768) {
    width
    height
    time
  }
  
  goto(
    url: "https://scon.stj.jus.br/SCON/jurisprudencia/toc.jsp"
    waitUntil: domContentLoaded
  ) {
    status
  }
  
  waitForTimeout(time: 5000) {
    time
  }
  
  verify(type: cloudflare, timeout: 10000) {
    found
    solved
    time
  }
  
  waitForNavigation(waitUntil: domContentLoaded, timeout: 20000) {
    status
  }
  
  esperaCampoBusca: waitForSelector(
    selector: "input#pesquisaLivre"
    visible: true
    timeout: 10000
  ) {
    selector
    time
  }
  
  removeVLibra: evaluate(
    content: """
    try {
      const walker = document.createTreeWalker(document, NodeFilter.SHOW_COMMENT, null, false);
      let startComment = null, endComment = null;
      while (walker.nextNode()) {
        const val = walker.currentNode.nodeValue.trim();
        if (val === 'INI VLIBRAS') startComment = walker.currentNode;
        if (val === 'END VLIBRAS') { endComment = walker.currentNode; break; }
      }
      if (startComment && endComment) {
        let node = startComment;
        while (node && node !== endComment) {
          const next = node.nextSibling;
          try { node.remove(); } catch(e){}
          node = next;
        }
        try { endComment.remove(); } catch(e){}
      }
      
      document.querySelectorAll('div[vw], [vw-access-button], iframe[src*="vlibras"], iframe[src*="VLibras"]').forEach(el => {
        try { el.remove(); } catch(e) { if (el.style) el.style.display = 'none'; }
      });
      
      document.querySelectorAll('div, .vlibras, .vw-widget, [aria-label*="VLibras"]').forEach(el => {
        if (el && el.style) {
          el.style.pointerEvents = 'none';
          el.style.visibility = 'hidden';
          el.style.opacity = '0';
          el.style.zIndex = '0';
        }
      });
      
      return 'VLibras removido com sucesso';
    } catch (err) {
      return 'Erro ao remover VLibras: ' + err.message;
    }
    """
  ) {
    value
  }
  
  esperarRemocaoVLibra: waitForTimeout(time: 5000) {
    time
  }
  
  clicaEmPesquisaAvancada: click(
    selector: "button#idMostrarPesquisaAvancada"
    visible: true
  ) {
    x
    y
  }
  
  esperaCarregarPesquisaAvancada: waitForTimeout(time: 5000) {
    time
  }
  
  escreveEmPesquisaLivre: type(
    selector: "input#pesquisaLivre"
    text: $searchTerm
    visible: true
  ) {
    selector
    text
    time
  }
  
  esperaEscreverBusca: waitForTimeout(time: 5000) {
    time
  }
  
  buscar: click(selector: "button[aria-label='Pesquisar']") {
    x
    y
  }
  
  esperaConcluirBusca: waitForNavigation(
    waitUntil: domContentLoaded
    timeout: 10000
  ) {
    time
  }
  
  html {
    html
  }
  
  screenshot: screenshot(fullPage: true) {
    base64
  }
}
`;

/**
 * Query BQL para busca no TFR
 * Baseado em STJ/scripts/busca-stjtfr.graphql
 */
export const TFR_SEARCH_QUERY = `
mutation TFRSearch($searchTerm: String!) {
  viewport(width: 1366, height: 768) {
    width
    height
    time
  }
  
  goto(
    url: "https://scon.stj.jus.br/SCON/juritfr"
    waitUntil: domContentLoaded
  ) {
    status
  }
  
  waitForTimeout(time: 5000) {
    time
  }
  
  verify(type: cloudflare, timeout: 10000) {
    found
    solved
    time
  }
  
  waitForNavigation(waitUntil: domContentLoaded, timeout: 20000) {
    status
  }
  
  esperaCampoBusca: waitForSelector(
    selector: "input#livre"
    visible: true
    timeout: 10000
  ) {
    selector
    time
  }
  
  removeVLibra: evaluate(
    content: """
    try {
      const walker = document.createTreeWalker(document, NodeFilter.SHOW_COMMENT, null, false);
      let startComment = null, endComment = null;
      while (walker.nextNode()) {
        const val = walker.currentNode.nodeValue.trim();
        if (val === 'INI VLIBRAS') startComment = walker.currentNode;
        if (val === 'END VLIBRAS') { endComment = walker.currentNode; break; }
      }
      if (startComment && endComment) {
        let node = startComment;
        while (node && node !== endComment) {
          const next = node.nextSibling;
          try { node.remove(); } catch(e){}
          node = next;
        }
        try { endComment.remove(); } catch(e){}
      }
      
      document.querySelectorAll('div[vw], [vw-access-button], iframe[src*="vlibras"], iframe[src*="VLibras"]').forEach(el => {
        try { el.remove(); } catch(e) { if (el.style) el.style.display = 'none'; }
      });
      
      document.querySelectorAll('div, .vlibras, .vw-widget, [aria-label*="VLibras"]').forEach(el => {
        if (el && el.style) {
          el.style.pointerEvents = 'none';
          el.style.visibility = 'hidden';
          el.style.opacity = '0';
          el.style.zIndex = '0';
        }
      });
      
      return 'VLibras removido com sucesso';
    } catch (err) {
      return 'Erro ao remover VLibras: ' + err.message;
    }
    """
  ) {
    value
  }
  
  esperarRemocaoVLibra: waitForTimeout(time: 5000) {
    time
  }
  
  clicarEmAcordaosESumulas: click(
    selector: "label[for='b3']"
    visible: true
  ) {
    x
    y
  }
  
  escreveEmPesquisaLivre: type(
    selector: "input#livre"
    text: $searchTerm
    visible: true
  ) {
    selector
    text
    time
  }
  
  esperaEscreverBusca: waitForTimeout(time: 5000) {
    time
  }
  
  buscar: click(selector: "input[type='submit'][value='Pesquisar']", timeout: 5000) {
    x
    y
  }
  
  esperaConcluirBusca: waitForNavigation(
    waitUntil: domContentLoaded
    timeout: 10000
  ) {
    time
  }
  
  html {
    html
  }
  
  screenshot: screenshot(fullPage: true) {
    base64
  }
}
`;

