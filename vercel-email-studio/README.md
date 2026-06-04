# CamoSignal Email Studio

Static Vercel deploy folder for the CamoSignal email campaign editor.

This folder intentionally contains only:

- `index.html`
- local banner assets under `images/`
- serverless email/product APIs under `api/`
- `package.json` for API dependencies
- `vercel.json`

Deploy this folder, not the full Shopify theme repo.

## Email Sending Setup

Recommended production setup is Resend through Vercel environment variables:

- `RESEND_API_KEY`
- `EMAIL_FROM`, for example `CamoSignal <newsletter@camosignal.com>`
- `EMAIL_REPLY_TO`, for example `support.camosignal@gmail.com`
- `EMAIL_UNSUBSCRIBE_URL`, your real unsubscribe URL

To send from `@camosignal.com`, verify the domain in Resend first and add the DNS records Resend gives you. After the DNS status is verified, set `EMAIL_FROM` to an address on that domain and redeploy.

SMTP is also supported with:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_SECURE`
- `EMAIL_FROM`
