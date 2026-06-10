import {
  appendSetCookie,
  authorizeUrl,
  env,
  makeState,
  normalizeStoreDomain,
  oauthConfigured,
  redirect,
  requestUrl,
  stateCookie,
} from "../lib/shopify-oauth.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!oauthConfigured()) {
    return res.status(501).json({
      error: "Shopify OAuth is not configured. Set SHOPIFY_API_KEY and SHOPIFY_API_SECRET.",
    });
  }

  const url = requestUrl(req);
  const shop = normalizeStoreDomain(url.searchParams.get("shop") || env("SHOPIFY_STORE_DOMAIN"));
  if (!shop) {
    return res.status(400).json({ error: "Missing or invalid shop domain" });
  }

  const state = makeState();
  appendSetCookie(res, stateCookie(state));
  return redirect(res, authorizeUrl(req, shop, state));
}
