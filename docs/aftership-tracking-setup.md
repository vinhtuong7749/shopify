# AfterShip multi-carrier tracking setup

This is now an alternative setup. The current recommended backend for this store is `docs/17track-tracking-worker.js` because AfterShip API permissions may require a higher paid plan.

This setup also works for the custom Shopify tracking page. It uses the AfterShip Tracking API only as a data source, so the storefront does not show AfterShip widgets, iframes, ads, or third-party branding.

## 1. Create an AfterShip API key

1. Create or log in to an AfterShip account.
2. Open AfterShip Tracking API settings.
3. Create an API key.
4. Copy the API key for the Worker secret below.

AfterShip's current Tracking API uses:

```text
Base URL: https://api.aftership.com/tracking/2026-01
Header: as-api-key: YOUR_API_KEY
```

## 2. Deploy the Cloudflare Worker

1. In Cloudflare, create a Worker.
2. Paste the code from `docs/aftership-tracking-worker.js`.
3. Add these Worker variables/secrets:

```text
AFTERSHIP_API_KEY=your_aftership_api_key
ALLOWED_ORIGIN=https://your-shop-domain.com
```

Optional:

```text
AFTERSHIP_API_BASE=https://api.aftership.com/tracking/2026-01
```

4. Deploy the Worker.

## 3. Connect Shopify theme

In Shopify Theme Customizer, open the Tracking page section and set:

```text
Tracking endpoint URL = https://your-worker-name.your-subdomain.workers.dev
Request method = GET
```

The page will call:

```text
https://your-worker-name.your-subdomain.workers.dev?trackingNumber=...
```

## 4. Optional: use a Shopify app proxy

If you want the storefront path to remain `/apps/order-tracking`, create a Shopify app proxy that points to the Worker:

```toml
[access_scopes]
scopes = "write_app_proxy"

[app_proxy]
url = "https://your-worker-name.your-subdomain.workers.dev"
prefix = "apps"
subpath = "order-tracking"
```

Then the theme can keep:

```text
Tracking endpoint URL = /apps/order-tracking
```

## Notes

- Do not put the AfterShip API key in Liquid, JavaScript, Shopify theme settings, or metafields.
- The Worker first checks whether a tracking already exists in AfterShip, then creates one if needed.
- If you know the carrier, you can add `slug` to the endpoint URL, for example `?slug=yunexpress`; otherwise AfterShip will attempt carrier detection.
- For public storefront lookup, consider Cloudflare rate limiting or Turnstile to protect your API quota.
