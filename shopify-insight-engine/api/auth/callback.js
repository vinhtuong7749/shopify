import {
  appendSetCookie,
  appUrl,
  clearStateCookie,
  exchangeCodeForToken,
  normalizeStoreDomain,
  redirect,
  requestUrl,
  sessionCookie,
  validState,
  verifyShopifyHmac,
} from "../lib/shopify-oauth.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const url = requestUrl(req);
  const shop = normalizeStoreDomain(url.searchParams.get("shop"));
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!shop || !code) {
    return res.status(400).json({ error: "Missing Shopify OAuth callback parameters" });
  }

  if (!validState(req, state)) {
    return res.status(400).json({ error: "Invalid Shopify OAuth state" });
  }

  if (!verifyShopifyHmac(url)) {
    return res.status(400).json({ error: "Invalid Shopify OAuth HMAC" });
  }

  try {
    const accessToken = await exchangeCodeForToken(shop, code);
    appendSetCookie(res, sessionCookie({
      shop,
      accessToken,
      createdAt: new Date().toISOString(),
    }));
    appendSetCookie(res, clearStateCookie());
    return redirect(res, `${appUrl(req).replace(/\/+$/g, "")}/?shop=${encodeURIComponent(shop)}&connected=1`);
  } catch (error) {
    return res.status(error.status || 500).json({
      error: error instanceof Error ? error.message : "Unable to complete Shopify OAuth",
    });
  }
}
