# Shopify Insight Engine

This MVP adds an analytics layer for CamoSignal that turns Shopify metrics into prioritized issues and recommended actions.

## Files

- `shopify-insight-engine/index.html` - dashboard UI for the insight engine.
- `shopify-insight-engine/api/insights.js` - serverless endpoint that analyzes a snapshot and returns KPIs, revenue drivers, issues, and tables.
- `shopify-insight-engine/package.json` - standalone app metadata and local checks.
- `shopify-insight-engine/vercel.json` - Vercel config for this app.

## Current MVP

The first version works without Shopify credentials, and can also use live Shopify Admin API data when env vars are configured.

- `GET /api/insights` returns a demo snapshot and its analysis.
- `GET /api/insights?source=shopify&days=7` returns a live Shopify snapshot and its analysis.
- `GET /api/insights?source=status` returns live connector status.
- `POST /api/insights` accepts a JSON snapshot and returns the same analysis shape.
- The dashboard can import JSON snapshots or simple CSV files.

## Snapshot Shape

```json
{
  "generatedAt": "2026-06-09T08:00:00.000Z",
  "currency": "USD",
  "current": {
    "label": "Last 7 days",
    "netSales": 38420,
    "grossSales": 42970,
    "orders": 426,
    "sessions": 23880,
    "refunds": 1840,
    "discounts": 2710,
    "unitsSold": 611,
    "adSpend": 8120
  },
  "previous": {
    "label": "Previous 7 days",
    "netSales": 48290,
    "grossSales": 51480,
    "orders": 511,
    "sessions": 24640,
    "refunds": 1020,
    "discounts": 1940,
    "unitsSold": 744,
    "adSpend": 6920
  },
  "channels": [],
  "devices": [],
  "products": [],
  "series": []
}
```

## What It Detects

- Net sales drops and the likely driver: traffic, conversion, AOV, or other.
- Conversion drops by channel and device.
- Traffic drops by acquisition source.
- AOV pressure.
- Refund rate increases.
- Discount pressure without matching sales lift.
- Paid spend inefficiency.
- Product-level revenue drag.
- Low inventory cover for fast sellers.

## CSV Import

The dashboard supports two simple CSV formats.

Metric format:

```csv
metric,current,previous
net_sales,38420,48290
orders,426,511
sessions,23880,24640
refunds,1840,1020
discounts,2710,1940
ad_spend,8120,6920
units_sold,611,744
```

Daily format:

```csv
date,period,net_sales,orders,sessions,refunds,discounts
2026-06-02,previous,6900,74,3500,120,280
2026-06-09,current,5040,59,3500,210,390
```

If no `period` column exists, the importer sorts rows by date and treats the first half as the comparison period and the second half as the current period.

## Next Data Connector

To connect real Shopify data, add a scheduled serverless endpoint that:

1. Reads Shopify Admin API credentials from Vercel environment variables.
2. Pulls order/report data for the current and comparison periods.
3. Aggregates metrics into the snapshot shape above.
4. Sends the snapshot to `analyzeSnapshot`.
5. Stores the result in a database, Google Sheet, or sends it by email.

Recommended environment variables:

- `SHOPIFY_STORE_DOMAIN`
- `SHOPIFY_ADMIN_ACCESS_TOKEN`
- `INSIGHT_ACCESS_KEY`
- `SHOPIFY_API_VERSION`
- `SHOPIFY_ORDER_MAX_PAGES`
- `INSIGHT_REPORT_RECIPIENTS`
- `INSIGHT_LOOKBACK_DAYS`

Important Shopify note: Admin API order access is limited to recent orders by default. Older order history can require Shopify approval for the `read_all_orders` scope.

Admin API scope note: the live connector currently needs `read_orders` and `read_products`. The validated Admin GraphQL query also reports optional order-source scopes such as marketplace/quick-sale reads depending on the store's sales channels.

Traffic note: Shopify Admin API does not include storefront sessions/conversion in this connector. The dashboard supports manual `currentSessions` and `previousSessions` values so conversion diagnostics can be layered on top of live orders.

## Suggested Rollout

1. Deploy the current MVP with demo/import support.
2. Export one Shopify report and validate the numbers against the dashboard.
3. Add Admin API or ShopifyQL data sync.
4. Add daily/weekly email summaries.
5. Add advertising and GA4 data for stronger root-cause analysis.
