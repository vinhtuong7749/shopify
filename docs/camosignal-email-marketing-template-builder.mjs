import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// CAMPAIGN CONFIG - EDIT THIS BLOCK ONLY
// ============================================================================
// 1. Change banner.src, banner.href, offer text, section text, and products here.
// 2. Run one of these commands:
//    powershell -ExecutionPolicy Bypass -File docs/build-camosignal-email.ps1
//    node docs/camosignal-email-marketing-template-builder.mjs
// 3. Paste the generated file into Shopify/Messaging:
//    docs/camosignal-email-marketing-template-messaging.html
//
// Note: Messaging does not run Liquid loops or JavaScript, so this builder creates
// a final static HTML file for Messaging. Do not paste this builder file itself.
// For real sending, upload local banner images to Shopify Files/CDN and replace
// banner.src with the public https://cdn.shopify.com/... URL.
// ============================================================================

const CAMPAIGN = {
  outputFile: "camosignal-email-marketing-template-messaging.html",
  shopUrl: "https://camosignal.com",
  preheader:
    "CamoSignal Favorites are here. Use code CAMOSIGNAL10 for 10% off your first order.",

  tracking: {
    openTrackingBlock: "{{ open_tracking_block }}",
    unsubscribeLink: "{{ unsubscribe_link }}",
  },

  banner: {
    src: "./images/camosignal-email-banner-final-5x4.jpg",
    href: "https://camosignal.com/collections/all",
    alt: "CamoSignal Favorites - use code CAMOSIGNAL10",
    width: 600,
    height: 480,
  },

  offer: {
    eyebrow: "Welcome offer",
    headline: "Use code CAMOSIGNAL10",
    body: "Take 10% off your first order. Shop the selected favorites below.",
  },

  productsHeader: {
    title: "Shop The Drop",
    note: "6 campaign picks",
  },

  productGrid: {
    desktopColumns: 3,
    mobileColumns: 2,
    desktopImageWidth: 166,
    desktopImageStageHeight: 210,
    mobileImageWidth: 148,
  },

  products: [
    {
      title: "True American Original '76 T-shirt",
      url: "https://camosignal.com/products/true-american-original-76-t-shirt",
      image:
        "https://cdn.shopify.com/s/files/1/0741/7987/0911/files/TrueAmericanOriginal_76T-shirt_2.jpg?v=1780027122",
      price: "$24.95",
      compareAt: "$34.95",
      badge: "28% OFF",
    },
    {
      title: "Patriotic Setters 250th Anniversary T-shirt",
      url: "https://camosignal.com/products/patriotic-setters-250th-anniversary-t-shirt",
      image:
        "https://cdn.shopify.com/s/files/1/0741/7987/0911/files/PatrioticSetters250thAnniversaryT-shirt_2.jpg?v=1780026442",
      price: "$24.95",
      compareAt: "$34.95",
      badge: "28% OFF",
    },
    {
      title: "Patriotic Dalmatians Dog T-shirt",
      url: "https://camosignal.com/products/patriotic-dalmatians-dog-t-shirt",
      image:
        "https://cdn.shopify.com/s/files/1/0741/7987/0911/files/PatrioticDalmatiansDogT-shirt_1.jpg?v=1780026027",
      price: "$24.95",
      compareAt: "$34.95",
      badge: "28% OFF",
    },
    {
      title: "Firefall Yosemite National Park T-shirt",
      url: "https://camosignal.com/products/firefall-yosemite-naitonal-park-t-shirt",
      image:
        "https://cdn.shopify.com/s/files/1/0741/7987/0911/files/FirefallYosemiteNaitonalParkT-shirt_5.jpg?v=1780024434",
      price: "$24.95",
      compareAt: "$34.95",
      badge: "28% OFF",
    },
    {
      title: "Yosemite 'Keep Bears Wild' T-shirt",
      url: "https://camosignal.com/products/yosemite-keep-bears-wild-t-shirt",
      image:
        "https://cdn.shopify.com/s/files/1/0741/7987/0911/files/Yosemite_KeepBearsWild_T-shirt_1.jpg?v=1780023355",
      price: "$24.95",
      compareAt: "$34.95",
      badge: "28% OFF",
    },
    {
      title: "Yellowstone Est. 1872 T-shirt",
      url: "https://camosignal.com/products/yellowstone-est-1872-t-shirt",
      image:
        "https://cdn.shopify.com/s/files/1/0741/7987/0911/files/YellowstoneEst.1872T-shirt_1.jpg?v=1780022693",
      price: "$24.95",
      compareAt: "$34.95",
      badge: "28% OFF",
    },
  ],

  bottomCta: {
    label: "View All Products",
    url: "https://camosignal.com/collections/all",
  },

  footer: {
    brand: "CAMOSIGNAL",
    reason:
      "You are receiving this email because you joined the CamoSignal community or made a purchase from camosignal.com.",
    supportEmail: "support.camosignal@gmail.com",
    instagramUrl: "https://www.instagram.com/camo.signal/",
    facebookUrl: "https://www.facebook.com/profile.php?id=61575744733042",
    visitStoreUrl: "https://camosignal.com/collections/all",
  },
};

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function chunk(items, size) {
  const rows = [];
  for (let index = 0; index < items.length; index += size) {
    rows.push(items.slice(index, index + size));
  }
  return rows;
}

function renderBadge(product, mobile = false) {
  if (!product.badge) return "";

  const style = mobile
    ? "display:inline-block; min-width:52px; min-height:20px; padding:4px 8px; border-radius:999px; background-color:#e21b23; color:#ffffff; font-family:'Segoe UI', Arial, Helvetica, sans-serif; font-size:11px; line-height:12px; font-weight:500; letter-spacing:0.04em; text-transform:uppercase; text-align:center;"
    : "display:inline-block; min-width:64px; min-height:24px; padding:6px 12px; border-radius:999px; background-color:#e21b23; color:#ffffff; font-family:'Segoe UI', Arial, Helvetica, sans-serif; font-size:13px; line-height:14px; font-weight:500; letter-spacing:0.04em; text-transform:uppercase; text-align:center;";

  const padding = mobile ? "0 0 5px 0" : "0 0 6px 0";

  return `
                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                              <tr>
                                <td align="left" style="padding:${padding};">
                                  <span style="${style}">${escapeHtml(product.badge)}</span>
                                </td>
                              </tr>
                            </table>`;
}

function renderPrice(product, mobile = false) {
  const priceStyle = mobile
    ? "margin:0 0 9px 0; font-family:'Oswald', 'Arial Narrow', Arial, sans-serif; font-size:12px; line-height:16px; color:#2c3d33; font-weight:700;"
    : "margin:0 0 12px 0; font-family:'Oswald', 'Arial Narrow', Arial, sans-serif; font-size:13px; line-height:17px; color:#2c3d33; font-weight:700;";

  const compareAt = product.compareAt
    ? ` <span style="color:#777777; font-weight:400; text-decoration:line-through; margin-left:${mobile ? "3" : "4"}px;">${escapeHtml(product.compareAt)}</span>`
    : "";

  return `<p style="${priceStyle}"><span style="color:#c0392b; font-weight:700;">${escapeHtml(product.price)}</span>${compareAt}</p>`;
}

function renderDesktopProduct(product, config) {
  return `
                    <td width="33.333%" valign="top" style="padding:0 8px 26px 8px;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;">
                        <tr>
                          <td style="padding:0; background-color:#ffffff;">${renderBadge(product)}
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                              <tr>
                                <td align="center" valign="middle" height="${config.desktopImageStageHeight}" style="height:${config.desktopImageStageHeight}px; padding:0; line-height:0;">
                                  <a href="${escapeAttr(product.url)}" style="display:block;">
                                    <img src="${escapeAttr(product.image)}" width="${config.desktopImageWidth}" alt="${escapeAttr(product.title)}" style="width:100%; max-width:${config.desktopImageWidth}px; height:auto; margin:0 auto; background-color:#ffffff;">
                                  </a>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                        <tr>
                          <td align="left" style="padding:4px 0 0 0; text-align:left;">
                            <p style="margin:0 0 5px 0; font-family:'Oswald', 'Arial Narrow', Arial, sans-serif; font-size:11px; line-height:15px; font-weight:700; color:#2c3d33; min-height:18px; text-transform:uppercase; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(product.title)}</p>
                            ${renderPrice(product)}
                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                              <tr>
                                <td align="center" style="background:#2c3d33; border:0; border-radius:8px;">
                                  <a class="btn-dark" href="${escapeAttr(product.url)}" style="display:block; padding:14px 15px; font-family:'Oswald', 'Arial Narrow', Arial, sans-serif; font-size:10px; line-height:13px; font-weight:600; color:#faf6ee; text-transform:uppercase; letter-spacing:1.5px; border-radius:8px;">SHOP NOW</a>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>`;
}

function renderMobileProduct(product, config) {
  return `
                    <td class="mobile-product-cell" width="50%" valign="top" style="padding:0 6px 22px 6px;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;">
                        <tr>
                          <td style="padding:0; background-color:#ffffff;">${renderBadge(product, true)}
                            <a href="${escapeAttr(product.url)}" style="display:block;"><img class="mobile-product-image" src="${escapeAttr(product.image)}" width="${config.mobileImageWidth}" alt="${escapeAttr(product.title)}" style="width:100%; max-width:${config.mobileImageWidth}px; height:auto; margin:0 auto;"></a>
                          </td>
                        </tr>
                        <tr>
                          <td align="left" style="padding:4px 0 0 0; text-align:left;">
                            <p class="mobile-title" style="margin:0 0 4px 0; font-family:'Oswald', 'Arial Narrow', Arial, sans-serif; font-size:10px; line-height:14px; min-height:28px; font-weight:700; color:#2c3d33; text-transform:uppercase; overflow:hidden;">${escapeHtml(product.title)}</p>
                            ${renderPrice(product, true)}
                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                              <tr>
                                <td align="center" style="background:#2c3d33; border:0; border-radius:8px;">
                                  <a class="mobile-button btn-dark" href="${escapeAttr(product.url)}" style="display:block; padding:11px 6px; font-family:'Oswald', 'Arial Narrow', Arial, sans-serif; font-size:10px; line-height:13px; font-weight:600; color:#faf6ee; text-transform:uppercase; letter-spacing:1.1px; border-radius:8px;">SHOP NOW</a>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>`;
}

function renderEmptyCell() {
  return `
                    <td width="33.333%" valign="top" style="padding:0 8px 26px 8px;">&nbsp;</td>`;
}

function renderRows(products, columns, renderProduct, config) {
  return chunk(products, columns)
    .map((row) => {
      const cells = row.map((product) => renderProduct(product, config));
      while (columns === 3 && cells.length < columns) cells.push(renderEmptyCell());
      return `
                  <tr>${cells.join("")}
                  </tr>`;
    })
    .join("");
}

function renderEmail(campaign) {
  const desktopRows = renderRows(
    campaign.products,
    campaign.productGrid.desktopColumns,
    renderDesktopProduct,
    campaign.productGrid,
  );

  const mobileRows = renderRows(
    campaign.products,
    campaign.productGrid.mobileColumns,
    renderMobileProduct,
    campaign.productGrid,
  );

  return `<!doctype html>
<!--
  FINAL STATIC HTML FOR SHOPIFY/MESSAGING.
  Edit docs/camosignal-email-marketing-template-builder.mjs, then rebuild.
  Do not edit repeated product cards here unless you only need a one-time change.
-->
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <title>CamoSignal Marketing Email</title>
  <!-- Generated from docs/camosignal-email-marketing-template-builder.mjs -->
  <!--[if !mso]><!-->
  <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&display=swap" rel="stylesheet">
  <!--<![endif]-->
  <style>
    html,
    body {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      background: #f5fbf7;
    }

    * {
      -ms-text-size-adjust: 100%;
      -webkit-text-size-adjust: 100%;
      box-sizing: border-box;
    }

    table,
    td {
      mso-table-lspace: 0pt !important;
      mso-table-rspace: 0pt !important;
      border-collapse: collapse !important;
    }

    img {
      -ms-interpolation-mode: bicubic;
      border: 0;
      display: block;
      height: auto;
      line-height: 100%;
      outline: none;
      text-decoration: none;
    }

    a {
      text-decoration: none;
    }

    .btn-dark:hover {
      background-color: #3a4e42 !important;
    }

    @media screen and (max-width: 640px) {
      .email-shell {
        width: 100% !important;
        max-width: 100% !important;
      }

      .mobile-pad {
        padding-left: 18px !important;
        padding-right: 18px !important;
      }

      .mobile-center {
        text-align: center !important;
      }

      .hide-mobile {
        display: none !important;
      }

      .desktop-product-grid {
        display: none !important;
        max-height: 0 !important;
        overflow: hidden !important;
        mso-hide: all !important;
      }

      .mobile-product-grid {
        display: table !important;
        max-height: none !important;
        overflow: visible !important;
        width: 100% !important;
      }

      .mobile-product-cell {
        display: table-cell !important;
        width: 50% !important;
        padding: 0 5px 22px 5px !important;
        vertical-align: top !important;
      }

      .mobile-product-image {
        width: 100% !important;
        max-width: ${campaign.productGrid.mobileImageWidth}px !important;
      }

      .mobile-title {
        font-size: 10px !important;
        line-height: 14px !important;
        min-height: 28px !important;
      }

      .mobile-button {
        padding: 11px 6px !important;
        font-size: 10px !important;
        line-height: 13px !important;
        letter-spacing: 1.1px !important;
      }
    }
  </style>
</head>
<body style="margin:0; padding:0; background-color:#f5fbf7;">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent; line-height:1px;">
    ${escapeHtml(campaign.preheader)}
  </div>
  ${campaign.tracking.openTrackingBlock}

  <center role="article" aria-roledescription="email" lang="en" style="width:100%; background-color:#f5fbf7; padding:20px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%; background-color:#f5fbf7;">
      <tr>
        <td align="center" style="padding:12px;">
          <table role="presentation" class="email-shell" width="600" cellpadding="0" cellspacing="0" style="width:600px; max-width:600px; background-color:#ffffff; border:1px solid #d7eadf; border-radius:8px; overflow:hidden;">

            <tr>
              <td style="background-color:#102d20;">
                <a href="${escapeAttr(campaign.banner.href)}" style="display:block;">
                  <img src="${escapeAttr(campaign.banner.src)}" width="${campaign.banner.width}" height="${campaign.banner.height}" alt="${escapeAttr(campaign.banner.alt)}" style="width:100%; max-width:${campaign.banner.width}px; height:auto; background-color:#102d20; color:#ffffff; font-family:Arial, sans-serif; font-size:14px; display:block;">
                </a>
              </td>
            </tr>

            <tr>
              <td class="mobile-pad" style="padding:24px 34px 10px 34px; background-color:#ffffff;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5fbf7; border:1px solid #d7eadf; border-radius:8px;">
                  <tr>
                    <td align="center" style="padding:20px 18px;">
                      <p style="margin:0 0 6px 0; font-family:'Oswald', 'Arial Narrow', Arial, sans-serif; font-size:12px; line-height:16px; font-weight:600; color:#5a6e5f; letter-spacing:0.08em; text-transform:uppercase;">
                        ${escapeHtml(campaign.offer.eyebrow)}
                      </p>
                      <p style="margin:0; font-family:'Oswald', 'Arial Narrow', Arial, sans-serif; font-size:26px; line-height:32px; font-weight:700; color:#2c3d33; text-transform:uppercase;">
                        ${escapeHtml(campaign.offer.headline)}
                      </p>
                      <p style="margin:6px 0 0 0; font-family:Arial, sans-serif; font-size:13px; line-height:19px; color:#2c3d33;">
                        ${escapeHtml(campaign.offer.body)}
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td class="mobile-pad" style="padding:34px 34px 18px 34px; background-color:#ffffff;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td>
                      <h2 style="margin:0; font-family:'Oswald', 'Arial Narrow', Arial, sans-serif; font-size:30px; line-height:35px; font-weight:700; color:#2c3d33; text-transform:uppercase; letter-spacing:0;">
                        ${escapeHtml(campaign.productsHeader.title)}
                      </h2>
                    </td>
                    <td class="hide-mobile" align="right" valign="bottom" style="font-family:Arial, sans-serif; font-size:12px; line-height:18px; color:#5a6e5f; font-weight:700;">
                      ${escapeHtml(campaign.productsHeader.note)}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:0 26px 8px 26px; background-color:#ffffff;">
                <table role="presentation" class="desktop-product-grid" width="100%" cellpadding="0" cellspacing="0">${desktopRows}
                </table>

                <table role="presentation" class="mobile-product-grid" width="100%" cellpadding="0" cellspacing="0" style="display:none; max-height:0; overflow:hidden; mso-hide:all;">${mobileRows}
                </table>
              </td>
            </tr>

            <tr>
              <td align="center" style="padding:8px 34px 42px 34px; background-color:#ffffff;">
                <table role="presentation" cellpadding="0" cellspacing="0" align="center">
                  <tr>
                    <td align="center" style="background:#2c3d33; border-radius:8px;">
                      <a href="${escapeAttr(campaign.bottomCta.url)}" style="display:inline-block; padding:15px 34px; font-family:'Oswald', 'Arial Narrow', Arial, sans-serif; font-size:12px; line-height:16px; font-weight:700; color:#ffffff; text-transform:uppercase; letter-spacing:1.2px; border-radius:8px;">
                        ${escapeHtml(campaign.bottomCta.label)}
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="background-color:#102d20; padding:34px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td class="mobile-center" style="font-family:'Oswald', 'Arial Narrow', Arial, sans-serif; font-size:20px; line-height:24px; font-weight:700; color:#ffffff; text-transform:uppercase; letter-spacing:0.08em;">
                      ${escapeHtml(campaign.footer.brand)}
                    </td>
                    <td class="mobile-center" align="right" style="font-family:Arial, sans-serif; font-size:12px; line-height:20px; font-weight:700;">
                      <a href="${escapeAttr(campaign.footer.instagramUrl)}" style="color:#ffffff;">Instagram</a>
                      <span style="color:#dff2e6; margin:0 8px;">|</span>
                      <a href="${escapeAttr(campaign.footer.facebookUrl)}" style="color:#ffffff;">Facebook</a>
                    </td>
                  </tr>
                </table>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:22px;">
                  <tr>
                    <td height="1" style="background-color:#2f7a55; line-height:1px; font-size:1px;">&nbsp;</td>
                  </tr>
                </table>
                <p style="margin:18px 0 0 0; font-family:Arial, sans-serif; font-size:11px; line-height:18px; color:#dff2e6;">
                  ${escapeHtml(campaign.footer.reason)}
                </p>
                <p style="margin:8px 0 0 0; font-family:Arial, sans-serif; font-size:11px; line-height:18px; color:#dff2e6;">
                  Need help? Email us at <a href="mailto:${escapeAttr(campaign.footer.supportEmail)}" style="color:#ffffff; text-decoration:underline;">${escapeHtml(campaign.footer.supportEmail)}</a>.
                </p>
                <p style="margin:12px 0 0 0; font-family:Arial, sans-serif; font-size:11px; line-height:18px; font-weight:700;">
                  <a href="${campaign.tracking.unsubscribeLink}" style="color:#ffffff; text-decoration:underline;">Unsubscribe</a>
                  <span style="color:#dff2e6; margin:0 6px;">|</span>
                  <a href="${escapeAttr(campaign.footer.visitStoreUrl)}" style="color:#ffffff; text-decoration:underline;">Visit store</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </center>
</body>
</html>
`;
}

function validateCampaign(campaign) {
  if (!campaign.products.length) {
    throw new Error("CAMPAIGN.products must contain at least one product.");
  }

  for (const [index, product] of campaign.products.entries()) {
    for (const field of ["title", "url", "image", "price"]) {
      if (!product[field]) {
        throw new Error(`Product ${index + 1} is missing ${field}.`);
      }
    }
  }
}

validateCampaign(CAMPAIGN);

const outputPath = path.join(__dirname, CAMPAIGN.outputFile);
fs.writeFileSync(outputPath, renderEmail(CAMPAIGN), "utf8");
console.log(`Generated ${outputPath}`);
