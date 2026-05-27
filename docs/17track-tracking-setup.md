# 17TRACK multi-carrier tracking setup

This is the recommended setup for the custom Shopify tracking page when you want multi-carrier data without ads. It uses the 17TRACK Tracking API only as a data source, so the storefront does not show 17TRACK widgets, iframes, ads, or third-party branding.

## 1. Create a 17TRACK API account

1. Open `https://api.17track.net`.
2. Create or log in to your 17TRACK API account.
3. Go to API settings.
4. Copy the API key / access key.

17TRACK's public API guide says the v2 request address is:

```text
https://api.17track.net/track/v2
```

The integration uses:

```text
POST /register
POST /gettrackinfo
Header: 17token: YOUR_API_KEY
```

## 2. Deploy the Cloudflare Worker

1. In Cloudflare, create a Worker.
2. Paste the code from `docs/17track-tracking-worker.js`.
3. Add these Worker variables/secrets:

```text
SEVENTEENTRACK_API_KEY=your_17track_api_key
ALLOWED_ORIGIN=https://your-shop-domain.com
```

Optional:

```text
SEVENTEENTRACK_API_BASE=https://api.17track.net/track/v2
LOOKUP_DELAY_MS=2500
```

4. Deploy the Worker.

## 3. Connect Shopify theme

In Shopify Theme Customizer, open the Tracking page section and set:

```text
Tracking mode = Backend/API lookup
Tracking endpoint URL = https://your-worker-name.your-subdomain.workers.dev
Request method = GET
```

The page will call:

```text
https://your-worker-name.your-subdomain.workers.dev?trackingNumber=...
```

## 4. Optional carrier code

17TRACK can auto-detect many carriers. If you know the numeric 17TRACK carrier code, you can pass it:

```text
https://your-worker-name.your-subdomain.workers.dev?carrier=21051
```

For example, the 17TRACK help article lists USPS as carrier code `21051`.

## 5. Optional: use a Shopify app proxy

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
Tracking mode = Backend/API lookup
Tracking endpoint URL = /apps/order-tracking
```

## Notes

- Do not put the 17TRACK API key in Liquid, JavaScript, Shopify theme settings, or metafields.
- The Worker calls `/register`, waits briefly, then calls `/gettrackinfo`.
- 17TRACK recommends webhook push for production-scale systems. This Worker is designed for simple storefront lookup and testing.
- For public storefront lookup, consider Cloudflare rate limiting or Turnstile to protect your API quota.
