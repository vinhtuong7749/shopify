# USPS Tracking setup

This is a single-carrier fallback. For the custom storefront tracking page, use `docs/17track-tracking-setup.md` instead so the same page can support USPS, YunExpress, UPS, FedEx, DHL, and other carriers through one API.

This theme section is only the storefront UI. It must call a private backend that keeps USPS credentials off the browser.

## Fastest path: Cloudflare Worker endpoint

1. Create or log into a USPS Business / Developer account.
2. Create a USPS app and copy the Consumer Key and Consumer Secret.
3. Make sure the USPS Business Portal terms are accepted and Tracking access is available for the MID used by your shipments.
4. Create a Cloudflare Worker and paste `docs/usps-tracking-worker.js`.
5. Add Worker variables or secrets:

```text
USPS_CLIENT_ID=your_usps_consumer_key
USPS_CLIENT_SECRET=your_usps_consumer_secret
ALLOWED_ORIGIN=https://your-shop-domain.com
```

6. Deploy the Worker.
7. In Shopify theme customizer, open the Tracking page section:

```text
Tracking endpoint URL = https://your-worker-name.your-subdomain.workers.dev
Request method = GET
```

The page will call:

```text
https://your-worker-name.your-subdomain.workers.dev?trackingNumber=...
```

## Cleaner storefront URL: Shopify app proxy

If you want the page to keep using `/apps/usps-tracking`, create a Shopify app with app proxy support and point the proxy to the Worker or your own server.

Example app proxy configuration:

```toml
[access_scopes]
scopes = "write_app_proxy"

[app_proxy]
url = "https://your-worker-name.your-subdomain.workers.dev"
prefix = "apps"
subpath = "usps-tracking"
```

Then the storefront path `/apps/usps-tracking` will proxy to your backend.

## Notes

- Do not put USPS Consumer Secret in Liquid, JavaScript, theme settings, or metafields.
- A 403 from USPS usually means the USPS app does not have permission to view that tracking number's MID.
- If your shops ship with their own USPS MID, each shop needs proper USPS authorization.
- If labels are bought through another provider, USPS may block access unless that MID is authorized or you have paid tracking access.
