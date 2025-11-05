/**
 * ═══════════════════════════════════════════════════════════════════════
 * SCRAPER STJ/TFR - Superior Tribunal de Justiça / Tribunal Federal de Recursos
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Extrai jurisprudências do site do STJ usando Scrapeless Cloud Browser.
 *
 * CARACTERÍSTICAS:
 * - Scrapeless Cloud Browser (escalabilidade)
 * - Suporte dual tribunal: STJ e TFR
 * - Cloudflare Turnstile (⚠️ BLOQUEIO ATIVO - NÃO RESOLVIDO)
 * - Puppeteer-core + WebSocket
 * - Campo sigla_tribunal para identificação do tribunal de origem
 *
 * ⚠️ PROBLEMA CONHECIDO:
 * O site do STJ usa Cloudflare Turnstile que atualmente bloqueia o acesso
 * automatizado. O Scrapeless detecta mas não consegue resolver automaticamente.
 * 
 * SOLUÇÕES POSSÍVEIS:
 * 1. API oficial do STJ (se disponível)
 * 2. Scraping manual assistido (usuário resolve CAPTCHA)
 * 3. Serviço especializado (FlareSolverr, 2Captcha, Anti-Captcha)
 * 4. Análise dos screenshots fornecidos
 *
 * ═══════════════════════════════════════════════════════════════════════
 */

import puppeteer from "puppeteer-core";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import OpenAI from "openai";
import { Pinecone } from "@pinecone-database/pinecone";

// Carregar variáveis de ambiente
dotenv.config();

// Inicializar cliente OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Inicializar cliente Pinecone
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

// ═══════════════════════════════════════════════════════════════════════
// CONFIGURAÇÕES
// ═══════════════════════════════════════════════════════════════════════

const STJ_BASE_URL = process.env.STJ_URL || "https://scon.stj.jus.br/SCON/";
const LOG_DIR = "logs";
const SCREENSHOT_DIR = "screenshots";
const SCRAP_DIR = "scraps";

let logFilePath = null;

// ═══════════════════════════════════════════════════════════════════════
// FUNÇÕES DE LOG
// ═══════════════════════════════════════════════════════════════════════

function initLog() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }

  const timestamp = new Date()
    .toISOString()
    .replace(/:/g, "-")
    .replace(/\..+/, "")
    .replace("T", "_");

  logFilePath = path.join(LOG_DIR, `stj_${timestamp}.log`);
  log("═══════════════════════════════════════════════════════", "INFO");
  log("=== LOG INICIADO ===", "INFO");
  log("═══════════════════════════════════════════════════════", "INFO");
}

function log(message, level = "INFO") {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}`;

  console.log(logMessage);

  if (logFilePath) {
    fs.appendFileSync(logFilePath, logMessage + "\n", "utf-8");
  }
}

function closeLog() {
  if (logFilePath) {
    log("═══════════════════════════════════════════════════════", "INFO");
    log("=== LOG FINALIZADO ===", "INFO");
    log("═══════════════════════════════════════════════════════", "INFO");
  }
}

// ═══════════════════════════════════════════════════════════════════════
// FUNÇÕES AUXILIARES
// ═══════════════════════════════════════════════════════════════════════

function ensureDirectories() {
  [LOG_DIR, SCREENSHOT_DIR, SCRAP_DIR].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

function loadConfig(filename) {
  try {
    const configPath = path.join(process.cwd(), "config", filename);
    if (!fs.existsSync(configPath)) {
      log(`⚠️ Arquivo ${filename} não encontrado`, "WARNING");
      return {};
    }
    const content = fs.readFileSync(configPath, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    log(`❌ Erro ao carregar ${filename}: ${error.message}`, "ERROR");
    return {};
  }
}

function loadCategories() {
  try {
    const csvPath = path.join(process.cwd(), "config", "categorias.csv");
    if (!fs.existsSync(csvPath)) {
      log("⚠️ Arquivo categorias.csv não encontrado", "WARNING");
      return [];
    }

    const content = fs.readFileSync(csvPath, "utf-8");
    const lines = content.split("\n").filter((line) => line.trim());

    // Pular cabeçalho
    const categories = lines.slice(1).map((line) => {
      const [codigo, categoria, descricao] = line.split(";").map((s) => s.trim());
      return { codigo, categoria, descricao };
    });

    return categories;
  } catch (error) {
    log(`❌ Erro ao carregar categorias: ${error.message}`, "ERROR");
    return [];
  }
}

function loadPrompt(filename) {
  try {
    const promptPath = path.join(process.cwd(), "prompts", filename);
    if (!fs.existsSync(promptPath)) {
      log(`⚠️ Arquivo ${filename} não encontrado`, "WARNING");
      return "";
    }
    return fs.readFileSync(promptPath, "utf-8");
  } catch (error) {
    log(`❌ Erro ao carregar prompt ${filename}: ${error.message}`, "ERROR");
    return "";
  }
}

function parsePagination(paginaConfig) {
  // Suporta: número (1), intervalo (1-5), lista (1,3,5), ou TODAS/ALL/TODOS/""
  if (!paginaConfig || paginaConfig === "" || 
      paginaConfig === "TODAS" || paginaConfig === "ALL" || 
      paginaConfig === "TODOS" || paginaConfig === "TODAS") {
    return null; // Será detectado automaticamente
  }

  const str = String(paginaConfig);

  // Intervalo: "1-5"
  if (str.includes("-")) {
    const [start, end] = str.split("-").map(Number);
    const pages = [];
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  // Lista: "1,3,5"
  if (str.includes(",")) {
    return str.split(",").map(Number);
  }

  // Número único: "1"
  return [Number(str)];
}

// ═══════════════════════════════════════════════════════════════════════
// FUNÇÕES DE CATEGORIZAÇÃO (OpenAI)
// ═══════════════════════════════════════════════════════════════════════

async function categorizeEmenta(ementa) {
  try {
    const categories = loadCategories();
    const categoriesList = categories.map((c) => c.categoria).join(", ");

    const promptCategoria = loadPrompt("prompt_categoria.txt");
    const promptRegras = loadPrompt("prompt_regras_agente.txt");

    const systemPrompt = promptCategoria.replace("{valid_categories_list}", categoriesList);

    log(`🤖 Enviando ementa para OpenAI (modelo: ${process.env.OPENAI_MODEL})...`, "INFO");

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "system", content: promptRegras },
        { role: "user", content: ementa },
      ],
      temperature: 0.3,
      max_tokens: 100,
    });

    const categoria = response.choices[0].message.content.trim();
    log(`✅ Categoria retornada: ${categoria}`, "SUCCESS");

    const categoryData = categories.find((c) => c.categoria === categoria);

    if (!categoryData) {
      log(`⚠️ Categoria '${categoria}' não encontrada na lista válida`, "WARNING");
      return {
        categoria: "Outros",
        codigo_categoria: "23",
        desc_categoria: "Outros assuntos não classificados",
      };
    }

    return {
      categoria: categoryData.categoria,
      codigo_categoria: categoryData.codigo,
      desc_categoria: categoryData.descricao,
    };
  } catch (error) {
    log(`❌ Erro ao categorizar ementa: ${error.message}`, "ERROR");
    return {
      categoria: "Outros",
      codigo_categoria: "23",
      desc_categoria: "Erro na categorização",
    };
  }
}

async function generateEmbedding(text) {
  try {
    log("🔢 Gerando embedding com OpenAI...", "INFO");

    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
      encoding_format: "float",
    });

    const embedding = response.data[0].embedding;
    log(`✅ Embedding gerado (dimensão: ${embedding.length})`, "SUCCESS");

    return embedding;
  } catch (error) {
    log(`❌ Erro ao gerar embedding: ${error.message}`, "ERROR");
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// FUNÇÕES PINECONE
// ═══════════════════════════════════════════════════════════════════════

async function ensurePineconeIndex() {
  try {
    const indexName = process.env.PINECONE_INDEX_NAME;
    const dimension = parseInt(process.env.PINECONE_DIMENSION || "1536");
    const cloud = process.env.PINECONE_CLOUD || "aws";
    const region = process.env.PINECONE_ENVIRONMENT || "us-east-1";

    log(`🔍 Verificando se índice '${indexName}' existe...`, "INFO");

    const existingIndexes = await pinecone.listIndexes();
    const indexExists = existingIndexes.indexes?.some((idx) => idx.name === indexName);

    if (indexExists) {
      log(`✅ Índice '${indexName}' já existe - usando índice existente`, "SUCCESS");
      return true;
    }

    log(`📝 Índice '${indexName}' não existe - criando novo índice...`, "INFO");
    log(`   Dimensão: ${dimension}`, "INFO");
    log(`   Cloud: ${cloud}`, "INFO");
    log(`   Region: ${region}`, "INFO");

    await pinecone.createIndex({
      name: indexName,
      dimension: dimension,
      metric: "cosine",
      spec: {
        serverless: {
          cloud: cloud,
          region: region,
        },
      },
    });

    log(`✅ Índice '${indexName}' criado com sucesso!`, "SUCCESS");
    return true;
  } catch (error) {
    log(`❌ Erro ao verificar/criar índice Pinecone: ${error.message}`, "ERROR");
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// FUNÇÃO PRINCIPAL (PLACEHOLDER)
// ═══════════════════════════════════════════════════════════════════════

async function main() {
  let browser = null;

  try {
    initLog();

    log("═══════════════════════════════════════════════════════", "INFO");
    log("=== INICIANDO SCRAPER STJ/TFR ===", "INFO");
    log("═══════════════════════════════════════════════════════", "INFO");

    ensureDirectories();

    log("📂 Carregando configurações...", "INFO");
    const buscaConfig = loadConfig("busca.json");
    const fieldsConfig = loadConfig("fields.json");
    log("✅ Configurações carregadas", "SUCCESS");

    // Determinar tribunal(is) a processar
    const tribunalConfig = buscaConfig.tribunal || "";
    const tribunais = tribunalConfig
      .split(";")
      .map((t) => t.trim())
      .filter((t) => t);

    if (tribunais.length === 0 || tribunalConfig === "") {
      tribunais.push("STJ", "TFR");
    }

    log(`📋 Tribunais a processar: ${tribunais.join(", ")}`, "INFO");

    // ⚠️ PROBLEMA: Cloudflare Turnstile bloqueia acesso
    log("", "INFO");
    log("⚠️⚠️⚠️ ATENÇÃO ⚠️⚠️⚠️", "WARNING");
    log("O site do STJ usa Cloudflare Turnstile que bloqueia acesso automatizado.", "WARNING");
    log("O Scrapeless detecta mas NÃO consegue resolver automaticamente.", "WARNING");
    log("", "WARNING");
    log("SOLUÇÕES POSSÍVEIS:", "WARNING");
    log("1. Verificar se STJ oferece API oficial", "WARNING");
    log("2. Implementar scraping manual assistido (usuário resolve CAPTCHA)", "WARNING");
    log("3. Usar serviço especializado (FlareSolverr, 2Captcha, Anti-Captcha)", "WARNING");
    log("4. Analisar screenshots fornecidos e implementar seletores corretos", "WARNING");
    log("", "WARNING");
    log("Por enquanto, este scraper está INCOMPLETO e NÃO FUNCIONAL.", "WARNING");
    log("⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️", "WARNING");
    log("", "INFO");

    // TODO: Implementar scraping quando solução para Cloudflare for encontrada

  } catch (error) {
    log(`❌ Erro fatal no main(): ${error.message}`, "ERROR");
    if (error.stack) log(error.stack, "ERROR");
  } finally {
    if (browser) {
      await browser.close();
      log("🔒 Browser fechado", "INFO");
    }

    closeLog();
  }
}

// Executar
main();

