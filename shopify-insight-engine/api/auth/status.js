import {
  appendSetCookie,
  bearerToken,
  env,
  exchangeSessionTokenForAccessToken,
  getShopifySession,
  normalizeStoreDomain,
  oauthConfigured,
  requestUrl,
  sessionCookie,
  shopFromIdToken,
} from "../lib/shopify-oauth.js";

async function sessionFromRequest(req, res) {
  const session = getShopifySession(req);
  if (session?.accessToken) return session;

  const token = bearerToken(req);
  if (!token || !oauthConfigured()) return null;

  const url = requestUrl(req);
  const shop = normalizeStoreDomain(url.searchParams.get("shop"))
    || shopFromIdToken(token)
    || normalizeStoreDomain(env("SHOPIFY_STORE_DOMAIN"));

  if (!shop) return null;

  const accessToken = await exchangeSessionTokenForAccessToken(shop, token);
  const freshSession = {
    shop,
    accessToken,
    createdAt: new Date().toISOString(),
    mode: "token-exchange",
  };
  appendSetCookie(res, sessionCookie(freshSession));
  return freshSession;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = await sessionFromRequest(req, res).catch(() => getShopifySession(req));
  return res.status(200).json({
    oauthConfigured: oauthConfigured(),
    connected: Boolean(session?.accessToken),
    shop: session?.shop || normalizeStoreDomain(env("SHOPIFY_STORE_DOMAIN")) || "",
  });
}
