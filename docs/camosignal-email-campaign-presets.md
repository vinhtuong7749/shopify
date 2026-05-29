# CamoSignal Campaign Presets

Copy one preset into the `CAMPAIGN CONFIG` block at the top of:

`docs/camosignal-email-marketing-template.liquid`

## Welcome Offer

```liquid
{%- assign default_campaign_url = shop_url | append: '/collections/all' -%}
{%- assign campaign_url = campaign_url | default: default_campaign_url -%}
{%- assign hero_image_url = hero_image_url | default: 'SHOPIFY_CDN_HERO_IMAGE_URL' -%}
{%- assign hero_alt = hero_alt | default: 'CamoSignal seasonal apparel drop' -%}
{%- assign coupon_code = coupon_code | default: 'CAMOSIGNAL10' -%}
{%- assign email_preheader = email_preheader | default: 'Use code CAMOSIGNAL10 on field-ready apparel picked for the season.' -%}
{%- assign headline = headline | default: 'Gear Up For The Season' -%}
{%- assign subheadline = subheadline | default: 'Start with the CamoSignal favorites built for hunters, protectors, and everyday wear.' -%}
{%- assign product_handles = product_handles | default: 'land-of-the-free-t-shirt-1,independence-1776-don-t-tread-on-me-t-shirt,patriotic-moose-hunting-t-shirt-copy-2,liberty-or-death-gadsden-flag-t-shirt,personalized-dad-trucker-hat-with-leather-patch,grand-turkey-slam-trucker-hat-with-leather-patch' -%}
```

## Seasonal Drop

```liquid
{%- assign default_campaign_url = shop_url | append: '/collections/all' -%}
{%- assign campaign_url = campaign_url | default: default_campaign_url -%}
{%- assign hero_image_url = hero_image_url | default: 'SHOPIFY_CDN_HERO_IMAGE_URL' -%}
{%- assign hero_alt = hero_alt | default: 'CamoSignal new seasonal drop' -%}
{%- assign coupon_code = coupon_code | default: 'CAMOSIGNAL10' -%}
{%- assign email_preheader = email_preheader | default: 'Fresh CamoSignal picks for the next season out.' -%}
{%- assign headline = headline | default: 'Built On The Ground' -%}
{%- assign subheadline = subheadline | default: 'Fresh hunting-inspired apparel with grounded graphics, soft fits, and a field-ready feel.' -%}
{%- assign product_handles = product_handles | default: 'PRODUCT_HANDLE_1,PRODUCT_HANDLE_2,PRODUCT_HANDLE_3,PRODUCT_HANDLE_4,PRODUCT_HANDLE_5,PRODUCT_HANDLE_6' -%}
```

## Browse Follow-Up

```liquid
{%- assign default_campaign_url = shop_url | append: '/collections/all' -%}
{%- assign campaign_url = campaign_url | default: default_campaign_url -%}
{%- assign hero_image_url = hero_image_url | default: 'SHOPIFY_CDN_HERO_IMAGE_URL' -%}
{%- assign hero_alt = hero_alt | default: 'CamoSignal product picks' -%}
{%- assign coupon_code = coupon_code | default: 'CAMOSIGNAL10' -%}
{%- assign email_preheader = email_preheader | default: 'Still thinking it over? Your next CamoSignal pick is here.' -%}
{%- assign headline = headline | default: 'Still Thinking It Over?' -%}
{%- assign subheadline = subheadline | default: 'Here are the pieces closest to what caught your eye.' -%}
{%- assign product_handles = product_handles | default: 'VIEWED_OR_RELATED_HANDLE,PRODUCT_HANDLE_2,PRODUCT_HANDLE_3,PRODUCT_HANDLE_4,PRODUCT_HANDLE_5,PRODUCT_HANDLE_6' -%}
```

## Fast Checklist

- Replace `SHOPIFY_CDN_HERO_IMAGE_URL`.
- Replace all `PRODUCT_HANDLE_*` values with real Shopify handles.
- Keep exactly 6 product handles for the 6-card layout.
- Send one test email on desktop and phone before scheduling.
