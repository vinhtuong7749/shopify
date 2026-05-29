# CamoSignal Email Marketing Template Guide

## Da nghien cuu tu theme hien tai

- Store dang dung Shopify theme voi brand CamoSignal: hunting/tactical apparel, tone copy "Raised Here. Stood Here." va "Built for those who hunt, protect, and live by their values".
- App messaging dang bat: Shopify Inbox chat co greeting cho tactical gear/hunting apparel.
- Lead capture dang bat: smart newsletter popup voi offer `CAMOSIGNAL10`, headline "GET 10% OFF FOR YOUR FIRST ORDER AND LOTS OF GOOD DEALS", tag signup `newsletter, popup, apparel`.
- Social proof dang co: Judge.me reviews app. Email nen co mot hang review ngan thay vi chi ban hang.
- San pham/trang chu dang day: Independence Day drop, best sellers, hunting collections `Turkey`, `Deer`, `Waterfowl`, `Fishing`, va hats.
- Brand tokens: forest green `#2c3d33`, warm off-white `#faf6ee`, white, muted gray `#535353`, gold accent `#ffd875`. Font web la Anton/Oswald, nhung email nen fallback ve Arial/Arial Narrow de an toan.

## File template

Template HTML preview nam o:

`docs/camosignal-email-marketing-template.html`

Template Liquid nam o:

`docs/camosignal-email-marketing-template.liquid`

Template an toan cho editor trong screenshot nam o:

`docs/camosignal-email-marketing-template-messaging.html`

Preset campaign mau nam o:

`docs/camosignal-email-campaign-presets.md`

File HTML preview chi de xem trong browser local. File Liquid chi dung neu app ho tro full Shopify Liquid. Voi editor trong screenshot, hay dung file `camosignal-email-marketing-template-messaging.html`, vi editor do chi chap nhan HTML + `{{ unsubscribe_link }}` + `{{ open_tracking_block }}`, khong chap nhan `{% assign %}`, `{% for %}`, hoac `{% comment %}`.

## Cach chon san pham

Chon 6 san pham chinh cho block `Selected Favorites`.

Nen chon theo cong thuc:

1. Hai san pham hero dung voi campaign, vi du Independence Day tee, deer/turkey hunting tee, hoac seasonal drop.
2. Hai best sellers co appeal rong, de nguoi moi vao brand de click.
3. Hai san pham tang AOV, vi du hat, hoodie, sweatshirt, hoac personalized patch item.

Quy tac nhanh:

- Anh san pham: dung anh Shopify CDN ty le 4:5 hoac gan 900x1125.
- Ten san pham: giu duoi 32 ky tu neu co the, vi mobile co 2 cot nen text dai de vo layout.
- Gia: dung `From $24.95` neu co nhieu variant.
- CTA: giu ngan, vi du `Shop Now`.
- Link: link thang den product URL hoac campaign collection URL.

## Nhung cho can thay trong Liquid

Nam trong block `CAMPAIGN CONFIG` o dau file `.liquid`:

- `product_handles`: thay 6 handle san pham, cach nhau bang dau phay.
- `hero_image_url`: thay bang anh campaign tren Shopify CDN.
- `campaign_url`: thay bang collection/campaign URL.
- `coupon_code`: neu campaign khac welcome flow, thay `CAMOSIGNAL10`.
- `headline`, `subheadline`, `email_preheader`: thay theo campaign.
- Editor trong screenshot bat buoc co `{{ unsubscribe_link }}` va `{{ open_tracking_block }}`. File Liquid da them san 2 bien nay, khong xoa chung.

Muon thay nhanh hon nua thi copy preset trong `docs/camosignal-email-campaign-presets.md`, paste de len block `CAMPAIGN CONFIG`, roi chi thay URL anh va 6 handles.

Neu email app khong ho tro `all_products[handle]`, hay dung HTML preview lam layout va map san pham bang product picker cua app.

## Campaign copy goi y

Welcome email:

- Subject: `Welcome to CamoSignal - 10% off your first order`
- Preheader: `Use code CAMOSIGNAL10 on field-ready apparel picked for the season.`
- Hero: `Gear Up For The Season`
- Product mix: 2 best seller tees, 2 Independence Day items, 2 hats/accessories.

Seasonal drop:

- Subject: `New CamoSignal picks for the season`
- Preheader: `Fresh hunting-inspired apparel, ready for the next weekend out.`
- Hero: `Built On The Ground`
- Product mix: 6 products from the same collection or seasonal angle.

Browse/product follow-up:

- Subject: `Still thinking it over?`
- Preheader: `Your CamoSignal pick is still here, plus a few close matches.`
- Hero: `Your Next Everyday Field Tee`
- Product mix: viewed product first, then 5 alternatives by same collection, animal, season, or apparel type.

Post-purchase cross-sell:

- Subject: `A few pieces that pair well with your order`
- Preheader: `Hats, hoodies, and tees that finish the kit.`
- Hero: `Complete The Setup`
- Product mix: hats/accessories first, then related apparel.

## Design rules de giu dep

- Dung 1 hero manh, 6 product card, 1 coupon band, 1 review line. Neu them nhieu hon 6 san pham thi email se de thanh catalog dai.
- Khong dung nhieu mau moi ngoai green/off-white/gray/gold.
- CTA chinh nen la green tren nen white, hoac off-white tren nen green.
- Neu hero da co text trong anh, giam text HTML ben duoi de tranh lap.
- Review nen ngan 1 cau, co the lay tu Judge.me neu co review that.

## Khi build trong email app

Neu app co product picker:

- Dung template nay nhu wireframe.
- Tao block product desktop 3 cot x 2 hang, mobile 2 cot x 3 hang.
- Map san pham bang product picker cua app thay vi copy tay HTML card.

Neu app chi co custom HTML:

- Copy toan bo HTML.
- Thay placeholder URL va text.
- Gui test email toi Gmail va mobile truoc khi campaign chay.

Neu app ho tro Liquid:

- Copy file `.liquid`.
- Doi `product_handles`, `campaign_url`, `hero_image_url`, `coupon_code`.
- Gui test email de dam bao app co quyen render `all_products[handle]`.
