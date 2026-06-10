# CamoSignal Shopify Insight Engine

Standalone Vercel app for Shopify performance diagnostics.

## What It Does

- Loads demo analytics data.
- Imports JSON or simple CSV snapshots.
- Loads live Shopify order/product data when Admin API env vars are configured.
- Connects a Dev Dashboard Shopify app through OAuth.
- Calculates sales, conversion, AOV, refund, discount, and ROAS KPIs.
- Highlights priority issues, suggested actions, source coverage, and daily calendar trends.
- Shows revenue drivers, sales trend, channel performance, product watchlist, seasonal hunting/fishing radar, and device signals.
- Uses a U.S. retail seasonality playbook for deer, turkey, waterfowl, upland, spring fishing, summer fishing, and cold/ice seasons. This is for merchandising analysis, not legal season guidance.

## Files

- `index.html` - dashboard UI.
- `api/insights.js` - serverless analysis endpoint.
- `vercel.json` - Vercel routing/cache config.

## Local Checks

```bash
npm run check
```

For a local preview without Vercel CLI:

```bash
npm run dev
```

On Windows PowerShell, if `npm.ps1` is blocked by execution policy, use:

```bash
npm.cmd run dev
```

For a full Vercel preview, run this folder with Vercel CLI:

```bash
vercel dev
```

## Deploy

Deploy this folder as its own Vercel project, separate from `vercel-email-studio`.

## Data

Open the app and use **Sample JSON** to download the expected snapshot format. Use **Live Shopify** after configuring the env vars below.

## Live Shopify Setup

Create a Shopify Dev Dashboard app with these Admin API scopes:

- `read_orders`
- `read_products`

If you need orders older than Shopify's default order access window, request `read_all_orders` approval from Shopify.

Set these Vercel environment variables:

- `SHOPIFY_STORE_DOMAIN` - your `*.myshopify.com` admin domain.
- `SHOPIFY_API_KEY` - Client ID from the Dev Dashboard app.
- `SHOPIFY_API_SECRET` - Secret from the Dev Dashboard app.
- `APP_URL` - `https://shopify-insight-engine.vercel.app`.
- `SHOPIFY_REDIRECT_URI` - `https://shopify-insight-engine.vercel.app/api/auth/callback`.
- `INSIGHT_ACCESS_KEY` - password-like key users enter in the dashboard before calling live data.
- `SHOPIFY_API_VERSION` - optional, defaults to `2026-04`.
- `SHOPIFY_TIME_ZONE` - optional IANA timezone override such as `America/New_York`; otherwise the app reads `shop.ianaTimezone` from Shopify and falls back to `America/New_York`.
- `SHOPIFY_ORDER_MAX_PAGES` - optional, defaults to `25`; each page fetches 100 orders.

Optional fallback:

- `SHOPIFY_ADMIN_ACCESS_TOKEN` - a static Admin API token. If set, the app can call Shopify without OAuth cookies.

In Shopify Dev Dashboard, set:

- App URL: `https://shopify-insight-engine.vercel.app`
- Redirect URL: `https://shopify-insight-engine.vercel.app/api/auth/callback`

After that, open the app and use **Connect Shopify** once. The callback stores an encrypted, HTTP-only session cookie for the shop.

Live endpoint:

```text
/api/insights?source=shopify&days=7
```

Optional live query parameters:

- `days` - preset trailing window; supports any 1-60 day value.
- `start` and `end` - custom inclusive date range in `YYYY-MM-DD` format. When set, the comparison window is the same number of days immediately before `start`.
- `currentSessions`
- `previousSessions`
- `currentAdSpend`
- `previousAdSpend`

Admin API does not provide storefront sessions/conversion in this connector, so import those from Shopify Analytics, GA4, or enter them in the dashboard for stronger conversion diagnostics.
