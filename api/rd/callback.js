const crypto = require("crypto");

const RD_TOKEN_URL = "https://api.rd.services/auth/token?token_by=code";
const RD_FIELDS_URL = "https://api.rd.services/platform/contacts/fields";

function captureRefreshToken(refreshToken) {
  const encodedPublicKey = process.env.RD_TOKEN_CAPTURE_PUBLIC_KEY;
  if (!encodedPublicKey || !refreshToken) return null;

  const publicKey = crypto.createPublicKey({
    key: Buffer.from(encodedPublicKey, "base64"),
    format: "der",
    type: "spki",
  });
  const encryptedToken = crypto.publicEncrypt(
    { key: publicKey, oaepHash: "sha256" },
    Buffer.from(refreshToken, "utf8")
  );

  return encryptedToken.toString("base64");
}

function getCookie(header, name) {
  const prefix = `${name}=`;
  return (header || "").split(/;\s*/).reduce((value, part) => {
    if (value || !part.startsWith(prefix)) return value;
    return decodeURIComponent(part.slice(prefix.length));
  }, "");
}

function statesMatch(expected, received) {
  if (!expected || !received) return false;
  const expectedValue = Buffer.from(expected);
  const receivedValue = Buffer.from(received);
  return expectedValue.length === receivedValue.length && crypto.timingSafeEqual(expectedValue, receivedValue);
}

module.exports = async function callback(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Método não permitido." });
  }

  const code = typeof req.query.code === "string" ? req.query.code : "";
  const state = typeof req.query.state === "string" ? req.query.state : "";
  const expectedState = getCookie(req.headers.cookie, "rd_oauth_state");

  res.setHeader(
    "Set-Cookie",
    "rd_oauth_state=; Path=/api/rd/callback; HttpOnly; Secure; SameSite=Lax; Max-Age=0"
  );

  if (!code || !statesMatch(expectedState, state)) {
    return res.status(400).json({ error: "Autorização inválida ou expirada. Inicie novamente por /api/rd/connect." });
  }

  if (!process.env.RD_CLIENT_ID || !process.env.RD_CLIENT_SECRET) {
    return res.status(500).json({ error: "Credenciais do RD não estão configuradas." });
  }

  try {
    const tokenResponse = await fetch(RD_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: process.env.RD_CLIENT_ID,
        client_secret: process.env.RD_CLIENT_SECRET,
        code,
      }),
    });

    if (!tokenResponse.ok) {
      return res.status(502).json({ error: "O RD recusou a autorização. Inicie novamente a conexão." });
    }

    const token = await tokenResponse.json();
    if (!token.access_token || typeof token.access_token !== "string") {
      return res.status(502).json({ error: "O RD não retornou um token de acesso válido." });
    }

    const encryptedRefreshToken = captureRefreshToken(token.refresh_token);

    const fieldsResponse = await fetch(RD_FIELDS_URL, {
      headers: { Authorization: `Bearer ${token.access_token}`, Accept: "application/json" },
    });

    if (!fieldsResponse.ok) {
      return res.status(502).json({ error: "Não foi possível consultar os campos do RD." });
    }

    const fields = await fieldsResponse.json();
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({
      audited_at: new Date().toISOString(),
      note: "Inventário temporário. Nenhum token foi salvo ou exibido.",
      setup: encryptedRefreshToken
        ? { status: "ready", encrypted_refresh_token: encryptedRefreshToken }
        : { status: "refresh_token_not_returned" },
      fields,
    });
  } catch {
    return res.status(502).json({ error: "Falha ao comunicar com o RD. Tente novamente." });
  }
};
