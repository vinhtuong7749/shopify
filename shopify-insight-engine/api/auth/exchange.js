import {
  appendSetCookie,
  bearerToken,
  env,
  exchangeSessionTokenForAccessToken,
  normalizeStoreDomain,
  oauthConfigured,
  sessionCookie,
  shopFromIdToken,
} from "../lib/shopify-oauth.js";

function sendJson(res, status, body) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  return res.status(status).json(body);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  if (!oauthConfigured()) {
    return sendJson(res, 501, {
      error: "Shopify OAuth is not configured. Set SHOPIFY_API_KEY and SHOPIFY_API_SECRET.",
    });
  }

  const token = String(req.body?.idToken || req.body?.sessionToken || bearerToken(req) || "").trim();
  if (!token) {
    return sendJson(res, 400, { error: "Missing Shopify session token" });
  }

  const shop = normalizeStoreDomain(req.body?.shop)
    || shopFromIdToken(token)
    || normalizeStoreDomain(env("SHOPIFY_STORE_DOMAIN"));

  if (!shop) {
    return sendJson(res, 400, { error: "Missing or invalid Shopify shop domain" });
  }

  try {
    const accessToken = await exchangeSessionTokenForAccessToken(shop, token);
    appendSetCookie(res, sessionCookie({
      shop,
      accessToken,
      createdAt: new Date().toISOString(),
      mode: "token-exchange",
    }));

    return sendJson(res, 200, { connected: true, shop });
  } catch (error) {
    return sendJson(res, error.status || 500, {
      error: error instanceof Error ? error.message : "Unable to connect Shopify session",
    });
  }
}
