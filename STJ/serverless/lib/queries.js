/**
 * Queries BQL para STJ e TFR
 * Baseadas nos scripts testados e funcionais em STJ/scripts/
 */

/**
 * Constrói query BQL para busca no STJ
 * 
 * @param {string} searchTerm - Termo de busca
 * @param {string} dateStart - Data inicial (formato DD/MM/YYYY) - Opcional
 * @param {string} dateEnd - Data final (formato DD/MM/YYYY) - Opcional
 * @returns {string} Query GraphQL
 */
export function buildSTJQuery(searchTerm, dateStart = null, dateEnd = null) {
  // Se datas não fornecidas, usar últimos 30 dias
  const hoje = new Date();
  const trintaDiasAtras = new Date(hoje);
  trintaDiasAtras.setDate(hoje.getDate() - 30);
  
  const dataInicio = dateStart || formatDate(trintaDiasAtras);
  const dataFim = dateEnd || formatDate(hoje);
  
  return `
mutation BuscaSTJ {
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
  
  publicacaoDataInicio: type(
    selector: "input#dtpb1"
    text: "${dataInicio}"
    visible: true
  ) {
    selector
    text
    time
  }
  
  publicacaoDataFinal: type(
    selector: "input#dtpb2"
    text: "${dataFim}"
    visible: true
  ) {
    selector
    text
    time
  }
  
  escreveEmPesquisaLivre: type(
    selector: "input#pesquisaLivre"
    text: "${searchTerm}"
    visible: true
  ) {
    x
    y
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
}
`;
}

/**
 * Constrói query BQL para busca no TFR
 * 
 * @param {string} searchTerm - Termo de busca
 * @returns {string} Query GraphQL
 */
export function buildTFRQuery(searchTerm) {
  return `
mutation BuscaTFR {
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
    selector: "label[for='b1']"
    visible: true
  ) {
    x
    y
  }
  
  escreveEmPesquisaLivre: type(
    selector: "input#livre"
    text: "${searchTerm}"
    visible: true
  ) {
    x
    y
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
    timeout: 120000
  ) {
    time
  }
  
  html {
    html
  }
}
`;
}

/**
 * Formata data para DD/MM/YYYY
 * 
 * @param {Date} date - Data a formatar
 * @returns {string} Data formatada
 */
function formatDate(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

