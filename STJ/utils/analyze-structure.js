/**
 * Script de Análise Automática da Estrutura HTML do STJ/TFR
 *
 * OBJETIVO:
 * - Abrir navegador local e navegar para STJ/TFR
 * - Aguardar resolução manual do Cloudflare
 * - Analisar estrutura do formulário de busca
 * - Analisar estrutura dos resultados
 * - Gerar fields.json e busca.json automaticamente
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TRIBUNAL = process.argv[2] || 'stj'; // 'stj' ou 'tfr'

const URLS = {
  stj: {
    base: 'https://scon.stj.jus.br/SCON/',
    nome: 'STJ - Superior Tribunal de Justiça'
  },
  tfr: {
    base: 'https://scon.stj.jus.br/SCON/juritfr/',
    nome: 'TFR - Tribunal Federal de Recursos'
  }
};

const config = URLS[TRIBUNAL.toLowerCase()];

if (!config) {
  console.error('❌ Tribunal inválido. Use: node analyze-structure.js [stj|tfr]');
  process.exit(1);
}

// Função para aguardar input do usuário
function waitForEnter(message) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question(message, () => {
      rl.close();
      resolve();
    });
  });
}

console.log(`\n${'='.repeat(80)}`);
console.log(`🔍 ANÁLISE AUTOMÁTICA - ${config.nome}`);
console.log(`${'='.repeat(80)}\n`);

(async () => {
  let browser;

  try {
    console.log('🚀 Iniciando Microsoft Edge...');
    console.log('   (Aguarde o Edge abrir em modo anônimo...)\n');

    // Tentar encontrar o Edge instalado
    const edgePaths = [
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
      process.env.LOCALAPPDATA + '\\Microsoft\\Edge\\Application\\msedge.exe'
    ];

    let edgePath = null;
    for (const p of edgePaths) {
      if (fs.existsSync(p)) {
        edgePath = p;
        break;
      }
    }

    if (!edgePath) {
      console.error('❌ Microsoft Edge não encontrado!');
      console.log('   Tentando usar Chrome como fallback...\n');
    } else {
      console.log(`✅ Edge encontrado: ${edgePath}\n`);
    }

    browser = await puppeteer.launch({
      headless: false,
      executablePath: edgePath || undefined, // undefined usa Chrome padrão
      defaultViewport: null, // Usar tamanho da janela
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--inprivate', // Modo anônimo do Edge
        '--start-maximized',
        '--disable-blink-features=AutomationControlled'
      ],
      devtools: false,
      ignoreDefaultArgs: ['--enable-automation']
    });

    // Obter todas as páginas abertas e usar a primeira (janela anônima)
    const pages = await browser.pages();
    const page = pages.length > 0 ? pages[0] : await browser.newPage();
    page.setDefaultTimeout(120000);

    console.log(`📍 Navegando para: ${config.base}`);
    console.log('   (Aguarde o carregamento...)\n');

    await page.goto(config.base, { waitUntil: 'networkidle2' });

    console.log('\n⏸️  AGUARDANDO RESOLUÇÃO DO CLOUDFLARE...');
    console.log('   Por favor, resolva o CAPTCHA se aparecer');
    console.log('   Pressione ENTER quando a página carregar completamente\n');

    // Aguardar input do usuário
    await new Promise(resolve => {
      process.stdin.once('data', () => resolve());
    });

    console.log('\n✅ Continuando análise...\n');

    // Aguardar um pouco para garantir que a página está estável
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('📋 ANALISANDO FORMULÁRIO DE BUSCA...\n');

    // Analisar campos do formulário com tratamento de erro
    let formFields = [];
    try {
      formFields = await page.evaluate(() => {
        const fields = [];

        // Buscar todos os inputs, selects e textareas
        const inputs = document.querySelectorAll('input[type="text"], input[type="search"], textarea, select');

        inputs.forEach(input => {
          const label = input.labels?.[0]?.textContent?.trim() ||
                       input.placeholder ||
                       input.name ||
                       input.id;

          if (label && input.name) {
            fields.push({
              label: label,
              name: input.name,
              id: input.id,
              type: input.tagName.toLowerCase(),
              placeholder: input.placeholder || ''
            });
          }
        });

        return fields;
      });
    } catch (error) {
      console.error('⚠️  Erro ao analisar formulário:', error.message);
      console.log('   Continuando com análise manual...\n');
    }

    console.log('✅ Campos do formulário encontrados:');
    formFields.forEach((field, i) => {
      console.log(`   ${i + 1}. ${field.label}`);
      console.log(`      - name: "${field.name}"`);
      console.log(`      - id: "${field.id}"`);
      console.log(`      - type: ${field.type}`);
      if (field.placeholder) console.log(`      - placeholder: "${field.placeholder}"`);
      console.log('');
    });

    // Salvar análise do formulário
    const buscaConfig = {
      _description: `Configuração de busca para ${config.nome}`,
      _fields_disponiveis: formFields.map(f => ({
        label: f.label,
        name: f.name,
        type: f.type
      }))
    };

    console.log('\n📝 INSTRUÇÕES PARA ANÁLISE DOS RESULTADOS:');
    console.log('   1. Faça uma pesquisa de teste (ex: "Advogados")');
    console.log('   2. Aguarde os resultados carregarem');

    await waitForEnter('   3. Pressione ENTER quando os resultados estiverem visíveis: ');

    console.log('\n🔍 ANALISANDO ESTRUTURA DOS RESULTADOS...\n');

    // Analisar estrutura dos resultados
    const resultsStructure = await page.evaluate(() => {
      const analysis = {
        containers: [],
        possibleSelectors: {},
        sampleData: {}
      };

      // Procurar por containers comuns de resultados
      const possibleContainers = [
        '.resultado', '.result', '.item-resultado', '.acordao', '.jurisprudencia',
        '[class*="resultado"]', '[class*="acordao"]', '[class*="item"]',
        'article', '.card', '.list-group-item', 'tr'
      ];

      possibleContainers.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          analysis.containers.push({
            selector: selector,
            count: elements.length,
            sample: elements[0]?.className || elements[0]?.tagName
          });
        }
      });

      // Procurar por campos específicos no primeiro resultado
      const searchTerms = {
        numero_processo: ['processo', 'número', 'numero', 'n°', 'nº'],
        classe: ['classe', 'tipo'],
        relator: ['relator', 'ministro'],
        orgao_julgador: ['órgão', 'orgao', 'turma', 'seção', 'secao'],
        data_julgamento: ['julgamento', 'julg'],
        data_publicacao: ['publicação', 'publicacao', 'public', 'dje'],
        ementa: ['ementa', 'resumo'],
        decisao: ['decisão', 'decisao', 'acórdão', 'acordao']
      };

      // Buscar elementos que contenham esses termos
      Object.keys(searchTerms).forEach(field => {
        const terms = searchTerms[field];
        const elements = [];

        terms.forEach(term => {
          // Buscar em labels, spans, divs, etc
          const found = Array.from(document.querySelectorAll('*')).filter(el => {
            const text = el.textContent?.toLowerCase() || '';
            const className = el.className?.toLowerCase() || '';
            const id = el.id?.toLowerCase() || '';
            
            return (text.includes(term) || className.includes(term) || id.includes(term)) &&
                   el.children.length === 0 && // Elementos folha
                   text.length < 200; // Não muito grande
          });

          elements.push(...found);
        });

        if (elements.length > 0) {
          const el = elements[0];
          analysis.possibleSelectors[field] = {
            selector: el.className ? `.${el.className.split(' ')[0]}` : el.tagName.toLowerCase(),
            sample: el.textContent?.trim().substring(0, 100),
            className: el.className,
            id: el.id,
            tagName: el.tagName
          };
        }
      });

      // Capturar HTML do primeiro resultado
      if (analysis.containers.length > 0) {
        const firstContainer = document.querySelector(analysis.containers[0].selector);
        if (firstContainer) {
          analysis.sampleData.html = firstContainer.outerHTML.substring(0, 1000);
          analysis.sampleData.text = firstContainer.textContent?.trim().substring(0, 500);
        }
      }

      return analysis;
    });

    console.log('✅ ANÁLISE DOS RESULTADOS:\n');

    console.log('📦 Containers encontrados:');
    resultsStructure.containers.forEach((container, i) => {
      console.log(`   ${i + 1}. Seletor: "${container.selector}"`);
      console.log(`      - Quantidade: ${container.count}`);
      console.log(`      - Amostra: ${container.sample}\n`);
    });

    console.log('🎯 Campos identificados:');
    Object.keys(resultsStructure.possibleSelectors).forEach(field => {
      const data = resultsStructure.possibleSelectors[field];
      console.log(`   ${field}:`);
      console.log(`      - Seletor sugerido: "${data.selector}"`);
      console.log(`      - Amostra: "${data.sample}"`);
      console.log(`      - Tag: ${data.tagName}\n`);
    });

    if (resultsStructure.sampleData.html) {
      console.log('📄 Amostra do HTML do primeiro resultado:');
      console.log(resultsStructure.sampleData.html.substring(0, 500) + '...\n');
    }

    // Salvar análise completa
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const analysisFile = path.join(__dirname, 'logs', `analysis-${TRIBUNAL}-${timestamp}.json`);
    
    fs.mkdirSync(path.join(__dirname, 'logs'), { recursive: true });
    fs.writeFileSync(analysisFile, JSON.stringify({
      tribunal: TRIBUNAL,
      timestamp: new Date().toISOString(),
      formFields: formFields,
      resultsStructure: resultsStructure,
      buscaConfig: buscaConfig
    }, null, 2));

    console.log(`💾 Análise completa salva em: ${analysisFile}\n`);

    console.log('⏸️  Navegador permanecerá aberto para inspeção manual');
    console.log('   Pressione ENTER para fechar e gerar arquivos de configuração\n');

    await new Promise(resolve => {
      process.stdin.once('data', () => resolve());
    });

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
    
    console.log('\n✅ Análise concluída!');
    console.log('📝 Próximo passo: Revisar análise e atualizar fields.json e busca.json\n');
  }
})();

