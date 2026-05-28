# Order tracking feasibility note

Updated: 2026-05-28

## Recommended starting point

Use the Shopify storefront page as a branded tracking hub, but do not promise native order lookup from Liquid alone.

The current theme starts with `direct_link` mode:

- Customer enters a tracking number.
- Theme detects common carriers and opens the official carrier tracking page.
- Customers with an order number are sent to `/account` or support instead of an unsupported Liquid lookup flow.

This works without a paid app, API key, CORS proxy, or scraping.

## Why not frontend scraping

Frontend scraping through public CORS proxies is not production-safe. Tracking sites often block proxy traffic, and their HTML is not a stable data contract.

## Why not order number + email lookup in theme code

Shopify protects order status details. Official docs describe access through shipping emails, customer accounts, or identity verification on the order status page. A normal theme template cannot query arbitrary orders by order number and email without a backend/app.

## Upgrade path

When API credentials are available, switch the theme section to `backend` mode and point it at a private endpoint:

- Cloudflare Worker + 17TRACK API for multi-carrier tracking.
- Cloudflare Worker + AfterShip API if the plan/API permissions fit.
- Carrier-specific APIs only when the store controls the shipper authorization, such as USPS MID access.

Existing worker examples:

- `docs/17track-tracking-worker.js`
- `docs/aftership-tracking-worker.js`
- `docs/usps-tracking-worker.js`

## Source references

- Shopify order tracking: https://help.shopify.com/en/manual/fulfillment/setup/order-status-page/order-tracking
- Shopify order status page security: https://help.shopify.com/en/manual/fulfillment/setup/order-status-page/understanding-order-status-pages
- 17TRACK API: https://www.17track.net/en/api
- 17TRACK API quota notes: https://help.17track.net/hc/en-us/articles/37575217580825-Plan-Details
- USPS tracking access changes: https://www.usps.com/business/api-access.htm
