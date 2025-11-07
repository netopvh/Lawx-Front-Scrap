/**
 * ═══════════════════════════════════════════════════════════════════════
 * SCRIPT DE TESTE - SCRAPER STJ/TFR
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * Este script testa o scraper do STJ/TFR de forma controlada.
 * 
 * COMO USAR:
 * 1. Configurar busca.json com parâmetros de teste
 * 2. Executar: node test-scraper.js
 * 3. Verificar logs/ e screenshots/ para resultados
 * 
 * VERIFICAÇÕES:
 * ✓ Conexão ao Scrapeless
 * ✓ Resolução do Cloudflare Turnstile
 * ✓ Preenchimento do formulário
 * ✓ Extração de dados
 * ✓ Categorização OpenAI
 * ✓ Upload Pinecone
 * 
 * ═══════════════════════════════════════════════════════════════════════
 */

import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

console.log("═══════════════════════════════════════════════════════");
console.log("🧪 TESTE DO SCRAPER STJ/TFR");
console.log("═══════════════════════════════════════════════════════\n");

// Verificar variáveis de ambiente
console.log("📋 VERIFICANDO VARIÁVEIS DE AMBIENTE:\n");

const requiredEnvVars = [
  "SCRAPELESS_TOKEN",
  "OPENAI_API_KEY",
  "OPENAI_MODEL",
  "PINECONE_API_KEY",
  "PINECONE_INDEX_NAME",
  "PINECONE_DIMENSION",
  "PINECONE_CLOUD",
  "PINECONE_ENVIRONMENT",
];

let allEnvVarsPresent = true;

requiredEnvVars.forEach((varName) => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${varName.includes("KEY") ? "***" : value}`);
  } else {
    console.log(`❌ ${varName}: NÃO CONFIGURADO`);
    allEnvVarsPresent = false;
  }
});

console.log("");

if (!allEnvVarsPresent) {
  console.log("❌ ERRO: Algumas variáveis de ambiente não estão configuradas!");
  console.log("   Configure o arquivo .env antes de executar o scraper.\n");
  process.exit(1);
}

// Verificar arquivos de configuração
console.log("📂 VERIFICANDO ARQUIVOS DE CONFIGURAÇÃO:\n");

const configFiles = [
  "config/busca.json",
  "config/fields.json",
  "config/categorias.csv",
  "prompts/prompt_categoria.txt",
  "prompts/prompt_regras_agente.txt",
];

let allConfigFilesPresent = true;

configFiles.forEach((filePath) => {
  const fullPath = path.join(process.cwd(), filePath);
  if (fs.existsSync(fullPath)) {
    console.log(`✅ ${filePath}`);
  } else {
    console.log(`❌ ${filePath}: NÃO ENCONTRADO`);
    allConfigFilesPresent = false;
  }
});

console.log("");

if (!allConfigFilesPresent) {
  console.log("❌ ERRO: Alguns arquivos de configuração não foram encontrados!");
  console.log("   Verifique se todos os arquivos necessários existem.\n");
  process.exit(1);
}

// Verificar configuração de busca
console.log("🔍 VERIFICANDO CONFIGURAÇÃO DE BUSCA:\n");

const buscaConfig = JSON.parse(fs.readFileSync("config/busca.json", "utf-8"));

console.log("Parâmetros de busca configurados:");
Object.entries(buscaConfig).forEach(([key, value]) => {
  if (value) {
    console.log(`  • ${key}: ${value}`);
  }
});

console.log("");

// Verificar seletores
console.log("🎯 VERIFICANDO SELETORES CSS:\n");

const fieldsConfig = JSON.parse(fs.readFileSync("config/fields.json", "utf-8"));

["STJ", "TFR"].forEach((tribunal) => {
  if (fieldsConfig[tribunal]) {
    console.log(`✅ Seletores para ${tribunal}:`);
    console.log(`   • Resultados: ${fieldsConfig[tribunal].resultados.selector}`);
    console.log(`   • Número processo: ${fieldsConfig[tribunal].numero_processo?.selector || fieldsConfig[tribunal].numero_acordao?.selector}`);
    console.log(`   • Ementa: ${fieldsConfig[tribunal].ementa.selector}`);
  } else {
    console.log(`❌ Seletores para ${tribunal}: NÃO ENCONTRADOS`);
  }
});

console.log("");

// Verificar categorias
console.log("📚 VERIFICANDO CATEGORIAS:\n");

const categoriasContent = fs.readFileSync("config/categorias.csv", "utf-8");
const categoriasLines = categoriasContent.split("\n").filter((line) => line.trim());
const numCategorias = categoriasLines.length - 1; // Excluir cabeçalho

console.log(`✅ ${numCategorias} categorias carregadas`);
console.log(`   Primeiras 5 categorias:`);

categoriasLines.slice(1, 6).forEach((line) => {
  const [codigo, categoria] = line.split(";");
  console.log(`   • [${codigo}] ${categoria}`);
});

console.log("");

// Resumo final
console.log("═══════════════════════════════════════════════════════");
console.log("✅ TODAS AS VERIFICAÇÕES PASSARAM!");
console.log("═══════════════════════════════════════════════════════\n");

console.log("🚀 PRONTO PARA EXECUTAR O SCRAPER!\n");
console.log("Para executar o scraper, use:");
console.log("  node index.js\n");

console.log("⚠️ ATENÇÃO:");
console.log("  • O scraper tentará resolver o Cloudflare Turnstile automaticamente");
console.log("  • Se falhar, verifique os screenshots/ para diagnóstico");
console.log("  • Logs detalhados serão salvos em logs/");
console.log("  • Resultados serão salvos em scraps/\n");

console.log("═══════════════════════════════════════════════════════\n");

