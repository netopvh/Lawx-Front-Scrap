// Generated code for BuscaSTJ_TFR
import { readFileSync } from 'fs';
import { join } from 'path';
import fetch from 'node-fetch';

// Configuration variables
const endpoint = "https://production-sfo.browserless.io/chromium/bql";
const token = "2TOoE1zEzEZ65mGf5ad499b004d2cfab0c5b75a03d5a942be";
const proxyString = "&proxy=residential&proxySticky=true&proxyCountry=br";
const optionsString = "&humanlike=true&blockAds=true&blockConsentModals=true";

// Query configuration
const queryFileName = '/STJ/scripts/buscastj_tfr.graphql';
const operationName = 'BuscaSTJ_TFR';

// File paths
const queryPath = join('./', queryFileName);

// Read the GraphQL query from file
const query = readFileSync(queryPath, 'utf8');

async function runBuscaSTJ_TFR() {
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      operationName,
      
    })
  };

  const url = `${endpoint}?token=${token}${proxyString}${optionsString}`;
  console.log('Fetching URL:', url);

  try {
    const response = await fetch(url, options);
    const data = await response.json();

    if (data.errors) {
      console.error('Errors:', data.errors);
      return;
    }

    console.log('Response:', data);
    return data;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

runBuscaSTJ_TFR();