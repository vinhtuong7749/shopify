# CamoSignal order tracking Worker

This Worker receives the storefront payload:

```json
{
  "email": "customer@example.com",
  "orderNumber": "1599",
  "orderName": "#1599"
}
```

It verifies the Shopify order by email + order number, reads the fulfillment tracking number, sends that tracking number to the tracking API, and returns the enriched status/timeline to the theme.

## Deploy

Run these commands from this directory:

```powershell
npm install
npx wrangler login
npx wrangler secret put SHOPIFY_CLIENT_SECRET
npm run check
npm run deploy
```

When prompted for `SHOPIFY_CLIENT_SECRET`, paste the app Secret from Shopify Dev Dashboard settings. The Worker uses Shopify's client credentials grant to request short-lived Admin API access tokens.

Current Camo Signal settings:

```text
SHOPIFY_SHOP_DOMAIN=apepsd-ha.myshopify.com
SHOPIFY_CLIENT_ID=9f4e64008f3e223c8296dadb4315d642
```

Required Shopify scopes:

```text
read_orders
read_assigned_fulfillment_orders
read_merchant_managed_fulfillment_orders
read_third_party_fulfillment_orders
```

If you need orders older than Shopify's default recent-order window, request `read_all_orders` access for the app.

## Anti-scraping controls

The deployed Worker currently enables:

- Storefront origin check: only `https://camosignal.com` browser requests are accepted.
- JSON-only POST requests with a small body limit.
- Honeypot and form timing checks from the theme.
- Cloudflare KV rate limits:
  - IP: 100 attempts per 5 minutes.
  - IP: 1000 attempts per day.
  - Email hash: 200 attempts per hour.
  - Email + order hash: 100 attempts per hour.
  - Tracking number hash: 200 attempts per hour.
- Generic not-found messages so bots cannot distinguish "order missing" from "order has no tracking".
- Minimal order payload: no Shopify order ID or customer details are returned.

If the tracking API validates an internal header, set `TRACKING_LOOKUP_SECRET` on this Worker and require the same value on that API. The Worker will send it as `X-CamoSignal-Tracking-Secret`.

## Test the deployed Worker directly

After deploy, Wrangler prints a URL like:

```text
https://camosignal-order-tracking.camosignal.workers.dev
```

Test it:

```powershell
$body = @{ email='nobody@example.com'; orderNumber='TEST123'; orderName='#TEST123' } | ConvertTo-Json -Compress
Invoke-WebRequest -Uri 'https://camosignal-order-tracking.camosignal.workers.dev' -Method Post -Body $body -ContentType 'application/json' -Headers @{ Origin='https://camosignal.com' }
```

Use a real order only when you are comfortable sending its Shopify fulfillment tracking number to the configured tracking API.

## Connect the theme

Fastest path:

1. Open Shopify Theme Customizer.
2. Open the tracking page section.
3. Set `Lookup endpoint URL` to the deployed Worker URL.
4. Keep `Request method = POST`.

Cleaner storefront URL:

Create a Shopify app proxy that maps:

```text
/apps/order-tracking -> https://camosignal-order-tracking.camosignal.workers.dev
```

Then keep the theme setting:

```text
Lookup endpoint URL = https://camosignal-order-tracking.camosignal.workers.dev
```

## Tracking API

By default the Worker posts the Shopify tracking number to:

```text
https://tracking-api-ru28.onrender.com/api/search
```

Override it with:

```powershell
npx wrangler secret put TRACKING_LOOKUP_ENDPOINT
```

Or set `TRACKING_LOOKUP_ENDPOINT=off` if you only want Shopify's stored tracking link.
