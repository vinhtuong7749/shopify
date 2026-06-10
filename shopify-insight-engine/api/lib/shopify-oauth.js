import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

export const SHOPIFY_SCOPES = "read_orders,read_products";
const SESSION_COOKIE = "csi_shopify_session";
const STATE_COOKIE = "csi_oauth_state";

export function env(name, fallback = "") {
  return String(process.env[name] || fallback).trim();
}

export function normalizeStoreDomain(value) {
  const domain = String(value || "")
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/g, "")
    .toLowerCase();
  const pattern = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/;
  return domain.length <= 253 && pattern.test(domain) ? domain : "";
}

export function appUrl(req) {
  return env("APP_URL") || `https://${req.headers?.host || "localhost"}`;
}

export function callbackUrl(req) {
  return env("SHOPIFY_REDIRECT_URI") || `${appUrl(req).replace(/\/+$/g, "")}/api/auth/callback`;
}

export function oauthConfigured() {
  return Boolean(env("SHOPIFY_API_KEY") && env("SHOPIFY_API_SECRET"));
}

function base64url(buffer) {
  return Buffer.from(buffer).toString("base64url");
}

function fromBase64url(value) {
  return Buffer.from(String(value || ""), "base64url");
}

export function parseCookies(req) {
  return Object.fromEntries(
    String(req.headers?.cookie || "")
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        if (index < 0) return [part, ""];
        return [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
      }),
  );
}

export function serializeCookie(name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  parts.push(`Path=${options.path || "/"}`);
  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
  if (options.httpOnly !== false) parts.push("HttpOnly");
  if (options.secure !== false) parts.push("Secure");
  parts.push(`SameSite=${options.sameSite || "None"}`);
  return parts.join("; ");
}

export function appendSetCookie(res, cookie) {
  const current = res.getHeader?.("Set-Cookie");
  if (!current) {
    res.setHeader("Set-Cookie", cookie);
  } else if (Array.isArray(current)) {
    res.setHeader("Set-Cookie", [...current, cookie]);
  } else {
    res.setHeader("Set-Cookie", [current, cookie]);
  }
}

function secretKey() {
  const secret = env("SHOPIFY_API_SECRET") || env("INSIGHT_ACCESS_KEY");
  if (!secret) return null;
  return createHash("sha256").update(secret).digest();
}

export function encryptSession(session) {
  const key = secretKey();
  if (!key) return "";
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(session), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return base64url(Buffer.concat([iv, tag, encrypted]));
}

export function decryptSession(value) {
  try {
    const key = secretKey();
    if (!key || !value) return null;
    const payload = fromBase64url(value);
    const iv = payload.subarray(0, 12);
    const tag = payload.subarray(12, 28);
    const encrypted = payload.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
    return JSON.parse(decrypted);
  } catch {
    return null;
  }
}

export function getShopifySession(req) {
  const session = decryptSession(parseCookies(req)[SESSION_COOKIE]);
  if (!session?.accessToken || !normalizeStoreDomain(session.shop)) return null;
  return session;
}

export function bearerToken(req) {
  const authorization = String(req.headers?.authorization || req.headers?.Authorization || "");
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

export function shopFromIdToken(token) {
  try {
    const [, payload] = String(token || "").split(".");
    if (!payload) return "";
    const claims = JSON.parse(fromBase64url(payload).toString("utf8"));
    const destination = String(claims.dest || claims.iss || "").replace(/^https?:\/\//i, "");
    return normalizeStoreDomain(destination);
  } catch {
    return "";
  }
}

export function sessionCookie(session) {
  return serializeCookie(SESSION_COOKIE, encryptSession(session), {
    maxAge: 60 * 60 * 24 * 365,
  });
}

export function stateCookie(state) {
  return serializeCookie(STATE_COOKIE, state, {
    maxAge: 60 * 10,
  });
}

export function clearStateCookie() {
  return serializeCookie(STATE_COOKIE, "", {
    maxAge: 0,
  });
}

export function makeState() {
  return base64url(randomBytes(24));
}

export function validState(req, state) {
  const expected = parseCookies(req)[STATE_COOKIE];
  return Boolean(expected && state && expected === state);
}

export function verifyShopifyHmac(url) {
  const secret = env("SHOPIFY_API_SECRET");
  const hmac = url.searchParams.get("hmac");
  if (!secret || !hmac) return false;

  const params = [...url.searchParams.entries()]
    .filter(([key]) => key !== "hmac" && key !== "signature")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  const digest = createHmac("sha256", secret).update(params).digest("hex");
  const a = Buffer.from(digest, "utf8");
  const b = Buffer.from(hmac, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function requestUrl(req) {
  return new URL(req.url || "/", `https://${req.headers?.host || "localhost"}`);
}

export function authorizeUrl(req, shop, state) {
  const scope = env("SHOPIFY_SCOPES", SHOPIFY_SCOPES);
  const url = new URL(`https://${shop}/admin/oauth/authorize`);
  url.searchParams.set("client_id", env("SHOPIFY_API_KEY"));
  url.searchParams.set("scope", scope);
  url.searchParams.set("redirect_uri", callbackUrl(req));
  url.searchParams.set("state", state);
  url.searchParams.set("grant_options[]", "");
  return url.toString();
}

export async function exchangeCodeForToken(shop, code) {
  const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: env("SHOPIFY_API_KEY"),
      client_secret: env("SHOPIFY_API_SECRET"),
      code,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.access_token) {
    throw Object.assign(new Error(payload.error_description || payload.error || "Unable to exchange Shopify OAuth code"), {
      status: response.status || 502,
    });
  }

  return payload.access_token;
}

export async function exchangeSessionTokenForAccessToken(shop, sessionToken) {
  const body = new URLSearchParams({
    client_id: env("SHOPIFY_API_KEY"),
    client_secret: env("SHOPIFY_API_SECRET"),
    grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
    subject_token: sessionToken,
    subject_token_type: "urn:ietf:params:oauth:token-type:id_token",
    requested_token_type: "urn:shopify:params:oauth:token-type:offline-access-token",
    expiring: "0",
  });

  const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.access_token) {
    throw Object.assign(new Error(payload.error_description || payload.error || "Unable to exchange Shopify session token"), {
      status: response.status || 502,
    });
  }

  return payload.access_token;
}

export function redirect(res, location, status = 302) {
  res.statusCode = status;
  res.setHeader("Location", location);
  res.end();
}
