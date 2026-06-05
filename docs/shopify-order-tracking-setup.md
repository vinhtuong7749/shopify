# Shopify email + order number tracking setup

This setup powers the custom `Track Your Order` page when customers enter the email used at checkout and their order number.

## What it does

1. The storefront sends `email` and `orderNumber` to a private endpoint.
2. The endpoint queries Shopify Admin GraphQL for recent orders with that email.
3. The endpoint verifies that the order number matches.
4. The endpoint returns fulfillment tracking info: carrier, tracking number, tracking URL, status, and an initial timeline event.
5. The Worker takes the tracking number from Shopify and calls the tracking API to enrich the response with live carrier events.

The theme never receives or stores Shopify Admin API credentials.

## 1. Create Admin API credentials

Create a Shopify custom app or backend app with Admin API access.

Required scope:

```text
read_orders
```

Depending on how fulfillments are managed, Shopify may also require one or more fulfillment-order scopes:

```text
read_assigned_fulfillment_orders
read_merchant_managed_fulfillment_orders
read_third_party_fulfillment_orders
```

By default, Shopify Admin API order access is limited to recent orders. If you need older orders, request Shopify's `read_all_orders` access for the app.

## 2. Deploy the Worker

1. In Cloudflare, create a Worker.
2. Paste the code from `docs/shopify-order-tracking-worker.js`.
3. Add these Worker secrets or variables:

```text
SHOPIFY_SHOP_DOMAIN=apepsd-ha.myshopify.com
SHOPIFY_CLIENT_ID=9f4e64008f3e223c8296dadb4315d642
SHOPIFY_CLIENT_SECRET=your-dev-dashboard-client-secret
ALLOWED_ORIGIN=https://your-shop-domain.com
```

Optional:

```text
SHOPIFY_API_VERSION=2026-04
ORDER_LOOKUP_LIMIT=25
TRACKING_LOOKUP_ENDPOINT=https://your-17track-or-aftership-worker.example
TRACKING_LOOKUP_METHOD=POST
```

If you do not set `TRACKING_LOOKUP_ENDPOINT`, the Worker uses the current tracking API:

```text
https://tracking-api-ru28.onrender.com/api/search
```

Set `TRACKING_LOOKUP_ENDPOINT=off` if you only want Shopify's stored fulfillment tracking link and do not want the Worker to call a carrier tracking API.
If you set a custom `TRACKING_LOOKUP_ENDPOINT`, use the endpoint from `docs/17track-tracking-worker.js`, `docs/aftership-tracking-worker.js`, or another API that accepts `trackingNumber`.
`ORDER_LOOKUP_LIMIT` is capped at 50 in the Worker to avoid overly broad storefront lookups.

## 3. Connect Shopify theme

In the Tracking page section, use:

```text
Lookup method = Email and order number
Tracking mode = Backend/API lookup
Lookup endpoint URL = https://camosignal-order-tracking.camosignal.workers.dev
Request method = POST
```

The current `templates/page.tracking.json` already uses those defaults.

## 4. Add a Shopify app proxy

For a clean storefront URL, create an app proxy that points to the Worker:

```toml
[access_scopes]
scopes = "read_orders,read_assigned_fulfillment_orders,read_merchant_managed_fulfillment_orders,read_third_party_fulfillment_orders,write_app_proxy"

[app_proxy]
url = "https://your-worker-name.your-subdomain.workers.dev"
prefix = "apps"
subpath = "order-tracking"
```

Then the storefront calls:

```text
https://camosignal-order-tracking.camosignal.workers.dev
```

## Security notes

- Do not put `SHOPIFY_CLIENT_SECRET` or Admin API tokens in Liquid, theme settings, metafields, or browser JavaScript.
- Email + order number is safer than email-only, but still rate limit this endpoint.
- The Worker returns tracking data only after both email and order number match.
- Avoid returning customer addresses or full order contents from this endpoint.
- Keep `REQUIRE_STOREFRONT_ORIGIN`, `REQUIRE_JSON_POST`, and `REQUIRE_FORM_TIMING` enabled for public use.
- Keep the KV-backed rate limits enabled. The current deployment limits by IP, email hash, and email+order hash.
- To lock down the Render tracking API, set `TRACKING_LOOKUP_SECRET` on the Worker and require the same value in the Render API via the `X-CamoSignal-Tracking-Secret` header.
