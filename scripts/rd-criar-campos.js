#!/usr/bin/env node
/*
 * Cria os 4 campos personalizados [CADASTRO-LP] no RD Station Marketing.
 *
 * O script só faz GET (inventário) e POST (criação). Não altera nem remove
 * nenhum campo existente, e aborta se algum dos identificadores já existir.
 *
 * O access_token vive apenas na memória deste processo: não é impresso,
 * não é gravado em disco e não vai para a Vercel nem para o git.
 *
 * Uso:
 *   node scripts/rd-criar-campos.js              # confere o que seria criado
 *   node scripts/rd-criar-campos.js --criar      # cria de fato
 *   node scripts/rd-criar-campos.js --criar --code=ABC   # se você já tem um code
 */

const fs = require("fs");
const http = require("http");
const path = require("path");
const { CAMPOS_CADASTRO_LP, fieldPayload } = require("../lib/rd-cadastro-fields");

const RD_AUTH_DIALOG = "https://api.rd.services/auth/dialog";
const RD_TOKEN_URL = "https://api.rd.services/auth/token?token_by=code";
const RD_FIELDS_URL = "https://api.rd.services/platform/contacts/fields";

const CALLBACK_PORT = 8787;
const CALLBACK_PATH = "/callback";
const REDIRECT_URI = `http://localhost:${CALLBACK_PORT}${CALLBACK_PATH}`;

const CAMPOS = CAMPOS_CADASTRO_LP.map((field) => ({
  ...field,
  nome: field.name,
  opcoes: field.options,
}));

function carregarEnv() {
  const arquivo = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(arquivo)) return;
  for (const linha of fs.readFileSync(arquivo, "utf8").split("\n")) {
    const match = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const valor = match[2].replace(/^["']|["']$/g, "").trim();
    if (!process.env[match[1]]) process.env[match[1]] = valor;
  }
}

function aguardarCode(clientId) {
  return new Promise((resolve, reject) => {
    const url = new URL(RD_AUTH_DIALOG);
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", REDIRECT_URI);

    const servidor = http.createServer((req, res) => {
      const recebida = new URL(req.url, `http://localhost:${CALLBACK_PORT}`);
      if (recebida.pathname !== CALLBACK_PATH) {
        res.writeHead(404).end();
        return;
      }
      const code = recebida.searchParams.get("code");
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(
        code
          ? "<h1>Autorizado</h1><p>Pode fechar esta aba e voltar ao terminal.</p>"
          : "<h1>Falhou</h1><p>O RD não devolveu um code.</p>"
      );
      servidor.close();
      code ? resolve(code) : reject(new Error("O RD não devolveu um code."));
    });

    servidor.on("error", reject);
    servidor.listen(CALLBACK_PORT, () => {
      console.log("\nAbra este link no navegador e autorize a conta da Oderço:\n");
      console.log(`  ${url}\n`);
      console.log(`Aguardando o retorno em ${REDIRECT_URI} ...`);
    });
  });
}

async function trocarCodePorToken(code) {
  const resposta = await fetch(RD_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: process.env.RD_CLIENT_ID,
      client_secret: process.env.RD_CLIENT_SECRET,
      code,
    }),
  });

  if (!resposta.ok) {
    throw new Error(`O RD recusou a troca do code (HTTP ${resposta.status}).`);
  }

  const { access_token: accessToken } = await resposta.json();
  if (!accessToken) throw new Error("O RD não retornou um access_token.");
  return accessToken;
}

async function listarCampos(accessToken) {
  const resposta = await fetch(RD_FIELDS_URL, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
  });
  if (!resposta.ok) {
    throw new Error(`Não foi possível listar os campos (HTTP ${resposta.status}).`);
  }
  const corpo = await resposta.json();
  return corpo.fields || corpo;
}

async function criarCampo(accessToken, campo) {
  const resposta = await fetch(RD_FIELDS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(fieldPayload({
      api_identifier: campo.api_identifier,
      name: campo.nome,
      options: campo.opcoes,
    })),
  });

  const corpo = await resposta.json().catch(() => ({}));
  if (!resposta.ok) {
    throw new Error(`HTTP ${resposta.status} — ${JSON.stringify(corpo)}`);
  }
  return corpo;
}

async function main() {
  carregarEnv();

  const criar = process.argv.includes("--criar");
  const codeArg = process.argv.find((a) => a.startsWith("--code="));

  if (!process.env.RD_CLIENT_ID || !process.env.RD_CLIENT_SECRET) {
    throw new Error("RD_CLIENT_ID e RD_CLIENT_SECRET precisam estar no .env.");
  }

  console.log("Campos que este script cria:\n");
  for (const campo of CAMPOS) {
    console.log(`  ${campo.api_identifier}`);
    console.log(`    nome:   ${campo.nome}`);
    console.log(`    tipo:   escolha única (${campo.opcoes.length} opções)`);
  }

  if (!criar) {
    console.log("\nModo conferência. Rode com --criar para criar de fato.");
    return;
  }

  const code = codeArg ? codeArg.slice("--code=".length) : await aguardarCode(process.env.RD_CLIENT_ID);
  const accessToken = await trocarCodePorToken(code);
  console.log("\nAutorizado.");

  const existentes = await listarCampos(accessToken);
  const identificadores = new Set(existentes.map((c) => c.api_identifier));
  console.log(`Inventário atual: ${existentes.length} campos.`);

  const conflitos = CAMPOS.filter((c) => identificadores.has(c.api_identifier));
  if (conflitos.length) {
    console.log("\nJá existem no RD, nada será feito:");
    conflitos.forEach((c) => console.log(`  ${c.api_identifier}`));
  }

  const pendentes = CAMPOS.filter((c) => !identificadores.has(c.api_identifier));
  if (!pendentes.length) {
    console.log("\nNada a criar.");
    return;
  }

  console.log("");
  for (const campo of pendentes) {
    try {
      const criado = await criarCampo(accessToken, campo);
      console.log(`  criado  ${criado.api_identifier || campo.api_identifier}`);
    } catch (erro) {
      console.log(`  FALHOU  ${campo.api_identifier} — ${erro.message}`);
    }
  }
}

main().catch((erro) => {
  console.error(`\nErro: ${erro.message}`);
  process.exit(1);
});
