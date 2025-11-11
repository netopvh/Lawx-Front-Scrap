/**
 * Extratores de dados HTML para STJ e TFR
 * Usa JSDOM para parsing do HTML retornado pelo Browserless
 */

import { JSDOM } from 'jsdom';

/**
 * Extrai resultados de jurisprudências do STJ
 * 
 * @param {string} html - HTML da página de resultados
 * @returns {Array} Array de objetos com dados extraídos
 */
export function extractSTJResults(html) {
  const dom = new JSDOM(html);
  const document = dom.window.document;
  
  const results = [];
  
  // TODO: Ajustar seletores conforme estrutura real do HTML
  // Estes são seletores de exemplo que precisam ser validados
  
  // Opção 1: Se os resultados estão em uma lista
  const resultItems = document.querySelectorAll('.resultado-item, .jurisprudencia-item, .acordao-item');
  
  if (resultItems.length > 0) {
    resultItems.forEach((item, index) => {
      try {
        const result = {
          numero: extractText(item, '.numero, .processo-numero, [class*="numero"]'),
          ementa: extractText(item, '.ementa, .texto-ementa, [class*="ementa"]'),
          data: extractText(item, '.data, .data-publicacao, [class*="data"]'),
          relator: extractText(item, '.relator, .ministro, [class*="relator"]'),
          orgaoJulgador: extractText(item, '.orgao, .turma, [class*="orgao"]'),
          tipo: extractText(item, '.tipo, .classe, [class*="tipo"]'),
          // Campos adicionais
          link: extractAttribute(item, 'a', 'href'),
          index: index + 1
        };
        
        // Só adiciona se tiver pelo menos número ou ementa
        if (result.numero || result.ementa) {
          results.push(result);
        }
      } catch (error) {
        console.error(`Erro ao extrair item ${index}:`, error.message);
      }
    });
  } else {
    // Opção 2: Se os resultados estão em uma tabela
    const rows = document.querySelectorAll('table tr, tbody tr');
    
    rows.forEach((row, index) => {
      // Pular cabeçalho
      if (index === 0 && row.querySelector('th')) return;
      
      try {
        const cells = row.querySelectorAll('td');
        
        if (cells.length > 0) {
          const result = {
            numero: cells[0]?.textContent?.trim() || '',
            ementa: cells[1]?.textContent?.trim() || '',
            data: cells[2]?.textContent?.trim() || '',
            relator: cells[3]?.textContent?.trim() || '',
            index: index
          };
          
          if (result.numero || result.ementa) {
            results.push(result);
          }
        }
      } catch (error) {
        console.error(`Erro ao extrair linha ${index}:`, error.message);
      }
    });
  }
  
  // Se não encontrou nada, tentar extração genérica
  if (results.length === 0) {
    console.warn('Nenhum resultado encontrado com seletores específicos. Tentando extração genérica...');
    return extractGenericResults(document, 'STJ');
  }
  
  console.log(`[STJ] Extraídos ${results.length} resultados`);
  return results;
}

/**
 * Extrai resultados de jurisprudências do TFR
 * 
 * @param {string} html - HTML da página de resultados
 * @returns {Array} Array de objetos com dados extraídos
 */
export function extractTFRResults(html) {
  const dom = new JSDOM(html);
  const document = dom.window.document;
  
  const results = [];
  
  // TODO: Ajustar seletores conforme estrutura real do HTML
  // Estes são seletores de exemplo que precisam ser validados
  
  const resultItems = document.querySelectorAll('.resultado-item, .jurisprudencia-item, .acordao-item');
  
  if (resultItems.length > 0) {
    resultItems.forEach((item, index) => {
      try {
        const result = {
          numero: extractText(item, '.numero, .processo-numero, [class*="numero"]'),
          ementa: extractText(item, '.ementa, .texto-ementa, [class*="ementa"]'),
          data: extractText(item, '.data, .data-publicacao, [class*="data"]'),
          relator: extractText(item, '.relator, .ministro, [class*="relator"]'),
          orgaoJulgador: extractText(item, '.orgao, .turma, [class*="orgao"]'),
          tipo: extractText(item, '.tipo, .classe, [class*="tipo"]'),
          link: extractAttribute(item, 'a', 'href'),
          index: index + 1
        };
        
        if (result.numero || result.ementa) {
          results.push(result);
        }
      } catch (error) {
        console.error(`Erro ao extrair item ${index}:`, error.message);
      }
    });
  } else {
    // Tentar extração de tabela
    const rows = document.querySelectorAll('table tr, tbody tr');
    
    rows.forEach((row, index) => {
      if (index === 0 && row.querySelector('th')) return;
      
      try {
        const cells = row.querySelectorAll('td');
        
        if (cells.length > 0) {
          const result = {
            numero: cells[0]?.textContent?.trim() || '',
            ementa: cells[1]?.textContent?.trim() || '',
            data: cells[2]?.textContent?.trim() || '',
            relator: cells[3]?.textContent?.trim() || '',
            index: index
          };
          
          if (result.numero || result.ementa) {
            results.push(result);
          }
        }
      } catch (error) {
        console.error(`Erro ao extrair linha ${index}:`, error.message);
      }
    });
  }
  
  // Se não encontrou nada, tentar extração genérica
  if (results.length === 0) {
    console.warn('Nenhum resultado encontrado com seletores específicos. Tentando extração genérica...');
    return extractGenericResults(document, 'TFR');
  }
  
  console.log(`[TFR] Extraídos ${results.length} resultados`);
  return results;
}

/**
 * Extração genérica quando seletores específicos falham
 * 
 * @param {Document} document - Documento DOM
 * @param {string} tribunal - Nome do tribunal
 * @returns {Array} Array de resultados genéricos
 */
function extractGenericResults(document, tribunal) {
  const results = [];
  
  // Tentar encontrar qualquer elemento que pareça um resultado
  const possibleContainers = document.querySelectorAll('div[class*="result"], div[class*="item"], article, section');
  
  possibleContainers.forEach((container, index) => {
    const text = container.textContent?.trim() || '';
    
    // Se o container tem texto significativo (mais de 50 caracteres)
    if (text.length > 50) {
      results.push({
        rawText: text.substring(0, 500), // Limitar a 500 caracteres
        index: index + 1,
        tribunal,
        note: 'Extração genérica - seletores específicos não encontrados'
      });
    }
  });
  
  // Se ainda não encontrou nada, retornar mensagem de aviso
  if (results.length === 0) {
    console.warn(`[${tribunal}] Nenhum resultado encontrado. HTML pode estar vazio ou estrutura mudou.`);
    return [{
      error: 'Nenhum resultado encontrado',
      tribunal,
      note: 'Verifique os seletores em extractor.js ou analise o HTML retornado'
    }];
  }
  
  return results;
}

/**
 * Extrai texto de um elemento usando seletor CSS
 * 
 * @param {Element} parent - Elemento pai
 * @param {string} selector - Seletor CSS
 * @returns {string} Texto extraído ou string vazia
 */
function extractText(parent, selector) {
  try {
    const element = parent.querySelector(selector);
    return element?.textContent?.trim() || '';
  } catch (error) {
    return '';
  }
}

/**
 * Extrai atributo de um elemento usando seletor CSS
 * 
 * @param {Element} parent - Elemento pai
 * @param {string} selector - Seletor CSS
 * @param {string} attribute - Nome do atributo
 * @returns {string} Valor do atributo ou string vazia
 */
function extractAttribute(parent, selector, attribute) {
  try {
    const element = parent.querySelector(selector);
    return element?.getAttribute(attribute) || '';
  } catch (error) {
    return '';
  }
}

/**
 * Limpa e normaliza texto
 * 
 * @param {string} text - Texto a limpar
 * @returns {string} Texto limpo
 */
export function cleanText(text) {
  if (!text) return '';
  
  return text
    .replace(/\s+/g, ' ') // Múltiplos espaços -> 1 espaço
    .replace(/\n+/g, ' ') // Quebras de linha -> espaço
    .trim();
}

