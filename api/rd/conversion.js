const { CAMPOS_CADASTRO_LP } = require("../../lib/rd-cadastro-fields");

const RD_CONVERSIONS_URL = "https://api.rd.services/platform/conversions";
const ALLOWED_ORIGINS = new Set([
  "https://oderco-lp-revenda.vercel.app",
  "https://www.oderco.com.br",
  "https://oderco.com.br",
]);
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 5;
const attempts = new Map();

const allowedOptions = Object.fromEntries(
  CAMPOS_CADASTRO_LP.map((field) => [field.api_identifier, new Set(field.options)])
);

function text(value, maxLength) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function validCnpj(value) {
  if (!/^\d{14}$/.test(value) || /^(\d)\1{13}$/.test(value)) return false;
  const calculate = (length) => {
    let sum = 0;
    let weight = length - 7;
    for (let index = 0; index < length; index += 1) {
      sum += Number(value[index]) * weight;
      weight -= 1;
      if (weight === 1) weight = 9;
    }
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };
  return calculate(12) === Number(value[12]) && calculate(13) === Number(value[13]);
}

function rateLimited(ip) {
  const now = Date.now();
  const recent = (attempts.get(ip) || []).filter((timestamp) => now - timestamp < WINDOW_MS);
  recent.push(now);
  attempts.set(ip, recent);
  return recent.length > MAX_REQUESTS;
}

function addIfPresent(payload, key, value) {
  if (value) payload[key] = value;
}

module.exports = async function conversion(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método não permitido." });
  }

  const origin = text(req.headers.origin, 200);
  if (!ALLOWED_ORIGINS.has(origin)) {
    return res.status(403).json({ error: "Origem não autorizada." });
  }

  const contentLength = Number(req.headers["content-length"] || 0);
  if (contentLength > 20_000) {
    return res.status(413).json({ error: "Requisição muito grande." });
  }

  const forwarded = text(req.headers["x-forwarded-for"], 200);
  const ip = forwarded.split(",")[0].trim() || text(req.socket?.remoteAddress, 100) || "unknown";
  if (rateLimited(ip)) {
    res.setHeader("Retry-After", "600");
    return res.status(429).json({ error: "Muitas tentativas. Aguarde alguns minutos." });
  }

  const body = req.body && typeof req.body === "object" && !Array.isArray(req.body) ? req.body : {};
  if (text(body.website, 200)) return res.status(200).json({ ok: true });

  const cnpj = text(body.cnpj, 20).replace(/\D/g, "");
  const name = text(body.name, 150);
  const email = text(body.email, 254).toLowerCase();
  const mobilePhone = text(body.mobile_phone, 20).replace(/\D/g, "");
  const principalActivity = text(body.principal_activity, 80);
  const businessLine = text(body.business_line, 150);
  const interestArea = text(body.interest_area, 100);
  const servicePreference = text(body.service_preference, 100);

  const valid = validCnpj(cnpj)
    && name.length >= 2
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    && /^\d{10,11}$/.test(mobilePhone)
    && allowedOptions.cf_cadastro_lp_principal_atividade.has(principalActivity)
    && allowedOptions.cf_cadastro_lp_ramo_atividade.has(businessLine)
    && allowedOptions.cf_cadastro_lp_area_interesse.has(interestArea)
    && allowedOptions.cf_cadastro_lp_preferencia_atendimento.has(servicePreference);

  if (!valid) return res.status(400).json({ error: "Confira os dados informados." });
  if (!process.env.RD_API_KEY) {
    return res.status(503).json({ error: "Integração temporariamente indisponível." });
  }

  const payload = {
    conversion_identifier: "cadastro-lp-revenda",
    name,
    email,
    mobile_phone: mobilePhone,
    cf_cnpj: cnpj,
    cf_cadastro_lp_principal_atividade: principalActivity,
    cf_cadastro_lp_ramo_atividade: businessLine,
    cf_cadastro_lp_area_interesse: interestArea,
    cf_cadastro_lp_preferencia_atendimento: servicePreference,
    tags: ["cadastro-lp-revenda"],
  };

  addIfPresent(payload, "company_name", text(body.company_name, 200));
  addIfPresent(payload, "company_address", text(body.company_address, 300));
  addIfPresent(payload, "city", text(body.city, 100));
  addIfPresent(payload, "state", text(body.state, 2).toUpperCase());
  addIfPresent(payload, "cf_razao_social", text(body.company_name, 200));
  addIfPresent(payload, "cf_cnae", text(body.cnae, 200));
  addIfPresent(payload, "cf_bairro", text(body.district, 120));

  const url = new URL(RD_CONVERSIONS_URL);
  url.searchParams.set("api_key", process.env.RD_API_KEY);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ event_type: "CONVERSION", event_family: "CDP", payload }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) return res.status(502).json({ error: "O RD não aceitou o cadastro." });
    return res.status(200).json({ ok: true });
  } catch {
    return res.status(502).json({ error: "Não foi possível enviar o cadastro agora." });
  }
};
