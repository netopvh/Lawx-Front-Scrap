import axios from 'axios';

const options = {
  method: 'POST',
  url: "https://production-sfo.browserless.io/chromium/bql",
  params: {
    token: "2TOoE1zEzEZ65mGf5ad499b004d2cfab0c5b75a03d5a942be",
    proxy: 'residential',
    proxySticky: true,
    proxyCountry: "br",
    humanlike: true,
    blockAds: true,
    blockConsentModals: true,
  },
  headers: {
    "Content-Type": "application/json",
  },
  data: {
    query: `
mutation BuscaSTJ_TFR {
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
      // 1️⃣ Remove bloco entre <!--INI VLIBRAS --> e <!--END VLIBRAS -->
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
    
      // 2️⃣ Remove ou oculta elementos típicos do VLibras
      document.querySelectorAll('div[vw], [vw-access-button], iframe[src*="vlibras"], iframe[src*="VLibras"]').forEach(el => {
        try { el.remove(); } catch(e) { if (el.style) el.style.display = 'none'; }
      });
    
      // 3️⃣ Reduz z-index e interações se algo restar
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
  selector: "label[for='b1']",
  visible: true
) {
  x
  y
}
  escreveEmPesquisaLivre: type(
    selector: "input#livre"
    text: "Advogado"
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
    `,
    operationName: "BuscaSTJ_TFR",
  }
}

const { data } = await axios.request(options);
console.log(data);