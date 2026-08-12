const crypto = require("crypto");

const RD_TOKEN_URL = "https://api.rd.services/auth/token";
const RD_FIELDS_URL = "https://api.rd.services/platform/contacts/fields";
const SIGNATURE_WINDOW_SECONDS = 300;

function safeEqual(expected, received) {
  if (!expected || !received) return false;
  const expectedValue = Buffer.from(expected);
  const receivedValue = Buffer.from(received);
  return expectedValue.length === receivedValue.length && crypto.timingSafeEqual(expectedValue, receivedValue);
}

function isAuthorized(req) {
  const timestamp = req.headers["x-rd-timestamp"];
  const signature = req.headers["x-rd-signature"];
  const parsedTimestamp = Number(timestamp);
  if (!Number.isFinite(parsedTimestamp) || Math.abs(Date.now() / 1000 - parsedTimestamp) > SIGNATURE_WINDOW_SECONDS) {
    return false;
  }

  const message = `${timestamp}:GET:/api/rd/fields`;
  const expected = crypto.createHmac("sha256", process.env.RD_CLIENT_SECRET).update(message).digest("hex");
  return safeEqual(expected, signature);
}

module.exports = async function fields(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Método não permitido." });
  }

  if (!process.env.RD_CLIENT_ID || !process.env.RD_CLIENT_SECRET || !process.env.RD_REFRESH_TOKEN) {
    return res.status(503).json({ error: "A consulta permanente do RD ainda não foi configurada." });
  }

  if (!isAuthorized(req)) {
    return res.status(401).json({ error: "Não autorizado." });
  }

  try {
    const tokenResponse = await fetch(RD_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: process.env.RD_CLIENT_ID,
        client_secret: process.env.RD_CLIENT_SECRET,
        refresh_token: process.env.RD_REFRESH_TOKEN,
      }),
    });

    if (!tokenResponse.ok) {
      return res.status(502).json({ error: "Não foi possível renovar o acesso ao RD." });
    }

    const token = await tokenResponse.json();
    if (!token.access_token || typeof token.access_token !== "string") {
      return res.status(502).json({ error: "O RD não retornou um token de acesso válido." });
    }

    const fieldsResponse = await fetch(RD_FIELDS_URL, {
      headers: { Authorization: `Bearer ${token.access_token}`, Accept: "application/json" },
    });

    if (!fieldsResponse.ok) {
      return res.status(502).json({ error: "Não foi possível consultar os campos do RD." });
    }

    return res.status(200).json(await fieldsResponse.json());
  } catch {
    return res.status(502).json({ error: "Falha ao comunicar com o RD." });
  }
};
