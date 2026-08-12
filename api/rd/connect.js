const crypto = require("crypto");

const REDIRECT_URI = "https://oderco-lp-revenda.vercel.app/api/rd/callback";
const RD_AUTHORIZATION_URL = "https://api.rd.services/auth/dialog";

module.exports = function connect(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Método não permitido." });
  }

  if (!process.env.RD_CLIENT_ID) {
    return res.status(500).json({ error: "RD_CLIENT_ID não está configurado." });
  }

  const state = crypto.randomBytes(32).toString("hex");
  const authorizationUrl = new URL(RD_AUTHORIZATION_URL);
  authorizationUrl.searchParams.set("client_id", process.env.RD_CLIENT_ID);
  authorizationUrl.searchParams.set("redirect_uri", REDIRECT_URI);
  authorizationUrl.searchParams.set("state", state);

  res.setHeader(
    "Set-Cookie",
    `rd_oauth_state=${state}; Path=/api/rd/callback; HttpOnly; Secure; SameSite=Lax; Max-Age=600`
  );
  return res.redirect(302, authorizationUrl.toString());
};
