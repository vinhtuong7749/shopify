import {
  appendSetCookie,
  bearerToken,
  env,
  exchangeSessionTokenForAccessToken,
  getShopifySession,
  normalizeStoreDomain,
  oauthConfigured,
  sessionCookie,
  shopFromIdToken,
} from "./lib/shopify-oauth.js";

const CURRENCY = "USD";
const SHOPIFY_API_VERSION = "2026-04";
const DEFAULT_SHOPIFY_TIME_ZONE = "America/New_York";

const INSIGHT_ORDERS_QUERY = `
query InsightOrders($first: Int!, $after: String, $query: String!) {
  orders(first: $first, after: $after, query: $query, sortKey: PROCESSED_AT) {
    pageInfo {
      hasNextPage
      endCursor
    }
    nodes {
      id
      processedAt
      sourceName
      currentSubtotalLineItemsQuantity
      currentSubtotalPriceSet {
        shopMoney {
          amount
          currencyCode
        }
      }
      currentTotalPriceSet {
        shopMoney {
          amount
          currencyCode
        }
      }
      currentTotalDiscountsSet {
        shopMoney {
          amount
          currencyCode
        }
      }
      totalRefundedSet {
        shopMoney {
          amount
          currencyCode
        }
      }
      lineItems(first: 50) {
        pageInfo {
          hasNextPage
        }
        nodes {
          quantity
          sku
          title
          discountedTotalSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          variant {
            id
            sku
            inventoryQuantity
            product {
              title
              productType
              vendor
              tags
              featuredImage {
                url
                altText
              }
              collections(first: 20) {
                nodes {
                  title
                  handle
                }
              }
            }
          }
        }
      }
    }
  }
}
`;

const INSIGHT_ORDERS_COUNT_QUERY = `
query InsightOrdersCount($query: String!) {
  ordersCount(query: $query) {
    count
    precision
  }
}
`;

const INSIGHT_SHOP_QUERY = `
query InsightShop {
  shop {
    ianaTimezone
  }
}
`;

const demoSnapshot = {
  generatedAt: "2026-06-09T08:00:00.000Z",
  currency: CURRENCY,
  current: {
    label: "7 ngày gần nhất",
    netSales: 38420,
    grossSales: 42970,
    orders: 426,
    sessions: 23880,
    refunds: 1840,
    discounts: 2710,
    unitsSold: 611,
    adSpend: 8120,
  },
  previous: {
    label: "7 ngày trước đó",
    netSales: 48290,
    grossSales: 51480,
    orders: 511,
    sessions: 24640,
    refunds: 1020,
    discounts: 1940,
    unitsSold: 744,
    adSpend: 6920,
  },
  channels: [
    {
      name: "Paid Social",
      current: { netSales: 14280, orders: 151, sessions: 10220, adSpend: 5460 },
      previous: { netSales: 21940, orders: 218, sessions: 10480, adSpend: 4320 },
    },
    {
      name: "Organic Search",
      current: { netSales: 8210, orders: 96, sessions: 4920, adSpend: 0 },
      previous: { netSales: 8890, orders: 101, sessions: 4680, adSpend: 0 },
    },
    {
      name: "Email",
      current: { netSales: 6140, orders: 72, sessions: 1830, adSpend: 120 },
      previous: { netSales: 5480, orders: 61, sessions: 1710, adSpend: 120 },
    },
    {
      name: "Direct",
      current: { netSales: 9790, orders: 107, sessions: 6910, adSpend: 0 },
      previous: { netSales: 11980, orders: 131, sessions: 7770, adSpend: 0 },
    },
  ],
  devices: [
    {
      name: "Mobile",
      current: { netSales: 21320, orders: 236, sessions: 17380 },
      previous: { netSales: 32210, orders: 343, sessions: 18090 },
    },
    {
      name: "Desktop",
      current: { netSales: 15140, orders: 161, sessions: 5120 },
      previous: { netSales: 13760, orders: 143, sessions: 4930 },
    },
    {
      name: "Tablet",
      current: { netSales: 1960, orders: 29, sessions: 1380 },
      previous: { netSales: 2320, orders: 25, sessions: 1620 },
    },
  ],
  products: [
    {
      title: "Whitetail Deer Camp Hoodie",
      sku: "POD-HOODIE-DEER-CAMP",
      collections: [{ title: "Deer Hunting", handle: "deer-hunting" }],
      inventory: 18,
      current: { netSales: 8940, orders: 82, unitsSold: 96 },
      previous: { netSales: 13860, orders: 126, unitsSold: 154 },
    },
    {
      title: "World Turkey Slam Comfort Colors T-shirt",
      sku: "POD-CC-TURKEY-SLAM",
      collections: [{ title: "Turkey Hunting", handle: "turkey-hunting" }],
      inventory: 54,
      current: { netSales: 10380, orders: 74, unitsSold: 79 },
      previous: { netSales: 9580, orders: 68, unitsSold: 72 },
    },
    {
      title: "Bass Fishing Bella Canvas T-shirt",
      sku: "POD-BC-BASS-FISH",
      collections: [{ title: "Fishing", handle: "fishing" }, { title: "Bass Fishing", handle: "bass-fishing" }],
      inventory: 12,
      current: { netSales: 3280, orders: 91, unitsSold: 112 },
      previous: { netSales: 4150, orders: 116, unitsSold: 139 },
    },
    {
      title: "Duck Blind Long Sleeve Shirt",
      sku: "POD-LS-DUCK-BLIND",
      collections: [{ title: "Duck Hunting", handle: "duck-hunting" }],
      inventory: 86,
      current: { netSales: 6320, orders: 58, unitsSold: 67 },
      previous: { netSales: 8720, orders: 81, unitsSold: 94 },
    },
    {
      title: "Hunting Dad Gildan T-shirt",
      sku: "POD-GILDAN-HUNT-DAD",
      collections: [{ title: "Hunting Lifestyle", handle: "hunting-lifestyle" }],
      inventory: 113,
      current: { netSales: 4680, orders: 62, unitsSold: 74 },
      previous: { netSales: 5110, orders: 67, unitsSold: 83 },
    },
  ],
  series: [
    { date: "2026-06-03", netSales: 6710, orders: 72, sessions: 3710 },
    { date: "2026-06-04", netSales: 6110, orders: 68, sessions: 3490 },
    { date: "2026-06-05", netSales: 5480, orders: 61, sessions: 3380 },
    { date: "2026-06-06", netSales: 5190, orders: 57, sessions: 3270 },
    { date: "2026-06-07", netSales: 5030, orders: 55, sessions: 3220 },
    { date: "2026-06-08", netSales: 4860, orders: 54, sessions: 3310 },
    { date: "2026-06-09", netSales: 5040, orders: 59, sessions: 3500 },
  ],
};

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round((number(value) + Number.EPSILON) * factor) / factor;
}

function safeDivide(numerator, denominator) {
  const bottom = number(denominator);
  if (!bottom) return 0;
  return number(numerator) / bottom;
}

function boolEnv(name, fallback = false) {
  const value = env(name);
  if (!value) return fallback;
  return /^(1|true|yes|on)$/i.test(value);
}

function requestUrl(req) {
  return new URL(req.url || "/", `https://${req.headers?.host || "localhost"}`);
}

function requestHeader(req, name) {
  const headers = req.headers || {};
  return headers[name] || headers[name.toLowerCase()] || "";
}

function accessKeyValid(req) {
  const configured = env("INSIGHT_ACCESS_KEY");
  if (!configured) return true;
  const url = requestUrl(req);
  const provided = String(requestHeader(req, "x-insight-key") || url.searchParams.get("key") || "").trim();
  return provided && provided === configured;
}

function liveDataConfigured() {
  return Boolean(env("SHOPIFY_STORE_DOMAIN") && env("SHOPIFY_ADMIN_ACCESS_TOKEN"));
}

async function shopifySessionFromRequest(req, res) {
  const session = getShopifySession(req);
  if (session?.accessToken) return session;

  const sessionToken = bearerToken(req);
  if (!sessionToken || !oauthConfigured()) return null;

  const url = requestUrl(req);
  const shop = normalizeStoreDomain(url.searchParams.get("shop"))
    || shopFromIdToken(sessionToken)
    || normalizeStoreDomain(env("SHOPIFY_STORE_DOMAIN"));

  if (!shop) return null;

  const accessToken = await exchangeSessionTokenForAccessToken(shop, sessionToken);
  const freshSession = {
    shop,
    accessToken,
    createdAt: new Date().toISOString(),
    mode: "token-exchange",
  };
  appendSetCookie(res, sessionCookie(freshSession));
  return freshSession;
}

function pctChange(current, previous) {
  const base = number(previous);
  if (!base) return number(current) ? 1 : 0;
  return (number(current) - base) / Math.abs(base);
}

function describePctChange(value, digits = 1) {
  const pct = round(Math.abs(number(value)) * 100, digits);
  if (!pct) return "không đổi";
  return `${number(value) < 0 ? "giảm" : "tăng"} ${pct}%`;
}

function normalizePeriod(period = {}) {
  const netSales = number(period.netSales ?? period.net_sales ?? period.sales ?? period.revenue);
  const grossSales = number(period.grossSales ?? period.gross_sales ?? netSales);
  const orders = number(period.orders);
  const sessions = number(period.sessions ?? period.visits);
  const refunds = number(period.refunds ?? period.returns);
  const discounts = number(period.discounts ?? period.discount);
  const unitsSold = number(period.unitsSold ?? period.units_sold ?? period.itemsSold ?? period.items_sold);
  const adSpend = number(period.adSpend ?? period.ad_spend ?? period.spend);

  return {
    label: period.label || "",
    netSales,
    grossSales,
    orders,
    sessions,
    refunds,
    discounts,
    unitsSold,
    adSpend,
  };
}

function derivedMetrics(period = {}) {
  const normalized = normalizePeriod(period);
  return {
    ...normalized,
    conversionRate: safeDivide(normalized.orders, normalized.sessions),
    aov: safeDivide(normalized.netSales, normalized.orders),
    refundRate: safeDivide(normalized.refunds, normalized.grossSales),
    discountRate: safeDivide(normalized.discounts, normalized.grossSales),
    roas: safeDivide(normalized.netSales, normalized.adSpend),
    unitsPerOrder: safeDivide(normalized.unitsSold, normalized.orders),
  };
}

const SEASON_PLAYBOOK = [
  {
    key: "deer",
    label: "Mùa hươu đuôi trắng",
    shortLabel: "Deer",
    activity: "Săn hươu",
    start: "09-15",
    end: "01-15",
    peakStart: "10-20",
    peakEnd: "12-05",
    buildUpDays: 60,
    keywords: ["deer", "whitetail", "buck", "doe", "rut", "antler", "archery", "bow hunting", "muzzleloader"],
    focus: "đồ ngụy trang, lớp giữ nhiệt, áo khoác, quần đi săn, cam an toàn, kiểm soát mùi",
    action: "Ưu tiên bộ sưu tập săn hươu, kiểm tra tồn kho size bán chạy, chuẩn bị combo giữ ấm và trang đích trước cao điểm rut/firearm.",
  },
  {
    key: "spring-turkey",
    label: "Mùa gà tây mùa xuân",
    shortLabel: "Turkey",
    activity: "Săn gà tây",
    start: "03-15",
    end: "05-31",
    peakStart: "04-01",
    peakEnd: "05-15",
    buildUpDays: 45,
    keywords: ["turkey", "gobbler", "turkey hunter", "turkey hunting", "turkey slam", "world slam of turkey", "world turkey slam"],
    focus: "áo nhẹ, đồ ngụy trang, áo vest, đồ gọi gà, mồi nhử, mũ",
    action: "Chuẩn bị nội dung quảng cáo cho mùa gà tây sớm, ưu tiên hàng nhẹ và phụ kiện cho các chuyến đi săn buổi sáng.",
  },
  {
    key: "waterfowl",
    label: "Mùa chim nước",
    shortLabel: "Waterfowl",
    activity: "Săn vịt/ngỗng",
    start: "09-01",
    end: "02-15",
    peakStart: "10-15",
    peakEnd: "01-31",
    buildUpDays: 45,
    keywords: ["duck", "goose", "waterfowl", "mallard", "duck blind", "goose hunting"],
    focus: "lớp chống nước, lớp giữ nhiệt, áo khoác, họa tiết ngụy trang cho chòi săn",
    action: "Theo dõi nhóm chống nước và giữ ấm, tạo bộ sưu tập cho mùa vịt/ngỗng và kiểm tra tồn kho trước các đợt lạnh.",
  },
  {
    key: "upland",
    label: "Mùa chim đồng và thú nhỏ",
    shortLabel: "Upland",
    activity: "Săn chim đồng và thú nhỏ",
    start: "09-01",
    end: "01-31",
    peakStart: "10-01",
    peakEnd: "12-31",
    buildUpDays: 35,
    keywords: ["upland", "pheasant", "quail", "dove hunting", "rabbit", "small game"],
    focus: "quần đi săn, áo vest, mũ, cam an toàn, đồ đi đồng",
    action: "Tách riêng nhóm chim đồng/thú nhỏ, nhấn mạnh độ bền khi di chuyển nhiều và khả năng dễ nhận diện.",
  },
  {
    key: "spring-fishing",
    label: "Mùa câu xuân",
    shortLabel: "Câu xuân",
    activity: "Câu cá",
    start: "03-01",
    end: "06-15",
    peakStart: "04-01",
    peakEnd: "05-31",
    buildUpDays: 45,
    keywords: ["fish", "fishing", "bass", "trout", "crappie", "lure", "rod", "reel", "tackle"],
    focus: "áo chống nắng, mũ, hộp đồ câu, mồi giả, cần/máy câu",
    action: "Đưa sản phẩm câu cá lên sớm từ cuối đông, theo dõi tìm kiếm/email cho bass và trout khi thời tiết ấm dần.",
  },
  {
    key: "summer-fishing",
    label: "Mùa câu hè",
    shortLabel: "Câu hè",
    activity: "Câu cá",
    start: "06-01",
    end: "09-15",
    peakStart: "06-15",
    peakEnd: "08-31",
    buildUpDays: 30,
    keywords: ["fish", "fishing", "bass", "catfish", "saltwater", "deep sea", "lake life"],
    focus: "áo chống UV, đồ làm mát, mũ, đồ đi nắng/đi nước",
    action: "Theo dõi nhóm chống nắng và đi nước, tách lưu lượng mùa câu hè khỏi nhóm săn bắn để đọc đúng nhu cầu.",
  },
  {
    key: "ice-cold",
    label: "Mùa lạnh / câu cá trên băng",
    shortLabel: "Mùa lạnh",
    activity: "Câu cá mùa lạnh / săn cuối mùa",
    start: "12-01",
    end: "02-28",
    peakStart: "12-15",
    peakEnd: "01-31",
    buildUpDays: 45,
    keywords: ["ice fishing", "thermal", "insulated", "cold weather", "winter hunting", "winter fishing"],
    focus: "lớp giữ nhiệt, áo khoác cách nhiệt, găng tay, hoodie, fleece",
    action: "Giữ đủ tồn kho nhóm giữ ấm và tạo combo cuối mùa cho nhu cầu săn/câu trong thời tiết lạnh.",
  },
];

const POD_APPAREL_RULES = [
  {
    key: "comfort-colors",
    label: "Comfort Colors",
    keywords: ["comfort colors", "comfort color", "cc1717", "1717", "c1717"],
  },
  {
    key: "bella-canvas",
    label: "Bella Canvas",
    keywords: ["bella canvas", "bella+canvas", "bella", "bc3001", "3001"],
  },
  {
    key: "gildan-shirt",
    label: "Gildan T-shirt",
    keywords: ["gildan", "g5000", "gildan 5000", "g64000", "gildan softstyle"],
  },
  {
    key: "hoodie",
    label: "Hoodie",
    keywords: ["hoodie", "hooded", "pullover", "zip hoodie"],
  },
  {
    key: "sweatshirt",
    label: "Sweatshirt",
    keywords: ["sweatshirt", "crewneck", "crew neck", "fleece"],
  },
  {
    key: "long-sleeve",
    label: "Long sleeve",
    keywords: ["long sleeve", "long-sleeve", "ls shirt", "longsleeve"],
  },
  {
    key: "tank-top",
    label: "Tank top",
    keywords: ["tank top", "tank", "sleeveless"],
  },
  {
    key: "hat-cap",
    label: "Mũ / cap",
    keywords: ["hat", "cap", "trucker", "dad hat", "snapback", "beanie"],
  },
  {
    key: "shirt",
    label: "T-shirt / tee",
    keywords: ["t-shirt", "tee", "shirt", "unisex shirt"],
  },
];

const POD_THEME_RULES = [
  {
    key: "deer-whitetail",
    label: "Deer / Whitetail",
    discipline: "Hunting",
    keywords: ["deer", "whitetail", "buck", "doe", "rut", "antler", "bow hunting"],
  },
  {
    key: "turkey",
    label: "Turkey hunting",
    discipline: "Hunting",
    keywords: ["turkey", "gobbler", "world turkey slam", "turkey slam", "beard season"],
  },
  {
    key: "duck-waterfowl",
    label: "Duck / Waterfowl",
    discipline: "Hunting",
    keywords: ["duck", "waterfowl", "goose", "mallard", "blind", "duck blind"],
  },
  {
    key: "upland-small-game",
    label: "Upland / small game",
    discipline: "Hunting",
    keywords: ["upland", "pheasant", "quail", "dove", "rabbit", "small game"],
  },
  {
    key: "bass-fishing",
    label: "Bass fishing",
    discipline: "Fishing",
    keywords: ["bass", "largemouth", "smallmouth", "bass fishing"],
  },
  {
    key: "fishing-general",
    label: "Fishing general",
    discipline: "Fishing",
    keywords: ["fish", "fishing", "trout", "catfish", "crappie", "lure", "rod", "reel", "lake life"],
  },
  {
    key: "funny-outdoors",
    label: "Funny outdoors",
    discipline: "Lifestyle",
    keywords: ["funny", "dad", "beer", "weekend", "camp", "camping", "outdoor"],
  },
  {
    key: "patriotic",
    label: "Patriotic outdoor",
    discipline: "Lifestyle",
    keywords: ["patriotic", "american", "usa", "flag", "freedom"],
  },
  {
    key: "dog-wildlife",
    label: "Dogs / wildlife",
    discipline: "Lifestyle",
    keywords: ["dog", "dogs", "labrador", "wildlife", "retriever"],
  },
  {
    key: "hunting-general",
    label: "Hunting general",
    discipline: "Hunting",
    keywords: ["hunt", "hunting", "hunter", "camo", "camouflage", "outfitter"],
  },
];

function normalizeTags(tags) {
  if (Array.isArray(tags)) return tags.filter(Boolean);
  if (!tags) return [];
  return String(tags)
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function normalizeCollections(collections) {
  const raw = Array.isArray(collections)
    ? collections
    : Array.isArray(collections?.nodes)
      ? collections.nodes
      : Array.isArray(collections?.edges)
        ? collections.edges.map((edge) => edge.node)
        : collections
          ? String(collections).split(",")
          : [];

  return raw
    .map((collection) => {
      if (!collection) return null;
      if (typeof collection === "string") {
        const title = collection.trim();
        return title ? { title, handle: slug(title) } : null;
      }
      const title = String(collection.title || collection.name || collection.handle || "").trim();
      const handle = String(collection.handle || slug(title)).trim();
      return title || handle ? { title: title || handle, handle } : null;
    })
    .filter(Boolean);
}

function collectionLabel(collections) {
  return normalizeCollections(collections)
    .map((collection) => collection.title || collection.handle)
    .filter(Boolean)
    .slice(0, 4)
    .join(", ");
}

function normalizeProductImage(image) {
  if (!image) return { imageUrl: "", imageAlt: "" };
  if (typeof image === "string") {
    return { imageUrl: image.trim(), imageAlt: "" };
  }
  const source = image.image || image.featuredImage || image;
  return {
    imageUrl: String(source.url || source.src || source.originalSrc || "").trim(),
    imageAlt: String(source.altText || source.alt || "").trim(),
  };
}

function collectionText(product = {}) {
  return normalizeCollections(product.collections)
    .flatMap((collection) => [collection.title, collection.handle])
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function tagText(product = {}) {
  return normalizeTags(product.tags).join(" ").toLowerCase();
}

function titleText(product = {}) {
  return [
    product.name,
    product.title,
    product.label,
    product.sku,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function podProductText(product = {}) {
  return [
    product.name,
    product.title,
    product.label,
    product.sku,
    product.productType,
    product.vendor,
    ...normalizeTags(product.tags),
    collectionLabel(product.collections),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function keywordHits(text, keywords = []) {
  return keywords.filter((keyword) => text.includes(keyword));
}

function classifyByRules(product, rules, fallback) {
  const text = podProductText(product);
  const matches = rules
    .map((rule) => ({
      ...rule,
      matchedKeywords: keywordHits(text, rule.keywords),
    }))
    .filter((rule) => rule.matchedKeywords.length)
    .sort((a, b) => b.matchedKeywords.length - a.matchedKeywords.length);

  if (!matches.length) {
    return {
      ...fallback,
      matchedKeywords: [],
      confidence: "low",
    };
  }

  const best = matches[0];
  return {
    key: best.key,
    label: best.label,
    discipline: best.discipline || fallback.discipline || "",
    matchedKeywords: best.matchedKeywords,
    confidence: best.matchedKeywords.length >= 2 ? "high" : "medium",
  };
}

function classifyApparel(product) {
  return classifyByRules(product, POD_APPAREL_RULES, {
    key: "other-apparel",
    label: "Áo in khác",
    discipline: "Apparel",
  });
}

function classifyPodTheme(product) {
  return classifyByRules(product, POD_THEME_RULES, {
    key: "unclassified-theme",
    label: "Chưa rõ theme",
    discipline: "Chưa rõ",
  });
}

function classifyPodProduct(product) {
  const apparel = classifyApparel(product);
  const theme = classifyPodTheme(product);
  return {
    apparelKey: apparel.key,
    apparelLabel: apparel.label,
    apparelConfidence: apparel.confidence,
    themeKey: theme.key,
    themeLabel: theme.label,
    themeDiscipline: theme.discipline,
    themeConfidence: theme.confidence,
    matchedKeywords: [...apparel.matchedKeywords, ...theme.matchedKeywords],
  };
}

function emptyPodGroup(key, label, kind, extra = {}) {
  return {
    key,
    label,
    kind,
    currentSales: 0,
    previousSales: 0,
    unitsSold: 0,
    inventory: 0,
    productCount: 0,
    products: [],
    ...extra,
  };
}

function enrichPodGroup(group, periodDays) {
  const topProduct = [...group.products].sort((a, b) => b.currentSales - a.currentSales)[0] || null;
  const deltaPct = pctChange(group.currentSales, group.previousSales);
  const daysOfCover = round(safeDivide(group.inventory, safeDivide(group.unitsSold, periodDays)), 1);
  const trend = deltaPct >= 0.15 ? "scale" : deltaPct <= -0.15 ? "fix" : "watch";
  const action = trend === "scale"
    ? "Đang có tín hiệu tăng. Ưu tiên scale mẫu thắng cuộc, tạo biến thể màu/thông điệp, và đẩy paid/email có kiểm soát."
    : trend === "fix"
      ? "Đang giảm so với kỳ trước. Kiểm tra mockup, giá, offer, creative, keyword trend và trang sản phẩm trước khi đổ thêm traffic."
      : "Theo dõi thêm theo ngày; dùng nhóm này làm baseline khi test mẫu mới.";

  return {
    ...group,
    currentSales: round(group.currentSales, 2),
    previousSales: round(group.previousSales, 2),
    unitsSold: round(group.unitsSold, 0),
    inventory: round(group.inventory, 0),
    deltaPct,
    daysOfCover,
    topProduct: topProduct ? topProduct.name : "",
    topProductImageUrl: topProduct ? topProduct.imageUrl || "" : "",
    topProductImageAlt: topProduct ? topProduct.imageAlt || topProduct.name || "" : "",
    topProductSales: topProduct ? topProduct.currentSales : 0,
    action,
    trend,
  };
}

function buildPodDailyMix(rows, products, dimension) {
  const productBySku = new Map();
  const productByName = new Map();
  for (const product of products || []) {
    if (product.sku) productBySku.set(product.sku, product);
    if (product.name) productByName.set(product.name, product);
  }

  const fieldKey = dimension === "theme" ? "themeKey" : "apparelKey";
  const fieldLabel = dimension === "theme" ? "themeLabel" : "apparelLabel";
  const groups = new Map();
  for (const row of rows || []) {
    const product = productBySku.get(row.sku) || productByName.get(row.label) || {
      name: row.label,
      sku: row.sku,
      imageUrl: row.imageUrl || "",
      imageAlt: row.imageAlt || row.label || "",
      ...classifyPodProduct(row),
    };
    const key = `${row.date}||${product[fieldKey] || "unknown"}`;
    if (!groups.has(key)) {
      groups.set(key, {
        ...emptyDailyRow(row.date, product[fieldLabel] || "Chưa rõ"),
        sku: dimension === "theme" ? (product.themeDiscipline || "") : "POD blank",
        groupKey: product[fieldKey] || "unknown",
        dimension,
      });
    }
    addMetric(groups.get(key), row);
  }
  return normalizeDailyRows([...groups.values()]);
}

function buildPodAnalytics({ products, productDaily, seasonality, periodDays }) {
  const apparelMap = new Map();
  const themeMap = new Map();

  for (const product of products || []) {
    const apparelKey = product.apparelKey || "other-apparel";
    const themeKey = product.themeKey || "unclassified-theme";
    if (!apparelMap.has(apparelKey)) {
      apparelMap.set(apparelKey, emptyPodGroup(apparelKey, product.apparelLabel || "Áo in khác", "apparel"));
    }
    if (!themeMap.has(themeKey)) {
      themeMap.set(themeKey, emptyPodGroup(themeKey, product.themeLabel || "Chưa rõ theme", "theme", {
        discipline: product.themeDiscipline || "Chưa rõ",
      }));
    }

    for (const group of [apparelMap.get(apparelKey), themeMap.get(themeKey)]) {
      group.currentSales += number(product.currentSales);
      group.previousSales += number(product.previousSales);
      group.unitsSold += number(product.unitsSold);
      group.inventory += number(product.inventory);
      group.productCount += 1;
      group.products.push(product);
    }
  }

  const apparelMix = [...apparelMap.values()]
    .map((group) => enrichPodGroup(group, periodDays))
    .sort((a, b) => b.currentSales - a.currentSales);
  const themeMix = [...themeMap.values()]
    .map((group) => enrichPodGroup(group, periodDays))
    .sort((a, b) => b.currentSales - a.currentSales);

  const topApparel = apparelMix[0] || null;
  const topTheme = themeMix[0] || null;
  const scaleTheme = themeMix
    .filter((group) => group.currentSales > 0)
    .sort((a, b) => b.deltaPct - a.deltaPct || b.currentSales - a.currentSales)[0] || null;
  const weakTheme = themeMix
    .filter((group) => group.currentSales > 0)
    .sort((a, b) => a.deltaPct - b.deltaPct || b.currentSales - a.currentSales)[0] || null;

  const opportunities = [];
  if (scaleTheme && scaleTheme.deltaPct >= 0.08) {
    opportunities.push({
      type: "scale",
      title: `Scale theme ${scaleTheme.label}`,
      evidence: `${scaleTheme.label} đạt ${round(scaleTheme.deltaPct * 100, 1)}% doanh thu so với kỳ trước. Mẫu tốt: ${scaleTheme.topProduct || "chưa rõ"}.`,
      action: "Tăng biến thể thiết kế, test thêm mockup trên blank đang bán tốt, và đẩy ngân sách có kiểm soát.",
      imageUrl: scaleTheme.topProductImageUrl || "",
      imageAlt: scaleTheme.topProductImageAlt || scaleTheme.topProduct || scaleTheme.label,
      priority: 86,
    });
  }
  if (topApparel) {
    opportunities.push({
      type: "blank",
      title: `Blank bán chạy: ${topApparel.label}`,
      evidence: `${topApparel.label} đóng góp ${round(safeDivide(topApparel.currentSales, products.reduce((sum, item) => sum + number(item.currentSales), 0)) * 100, 1)}% doanh thu sản phẩm.`,
      action: "Sử dụng làm sản phẩm lõi (base) để nhân bản các theme hunting/fishing đang có tín hiệu.",
      imageUrl: topApparel.topProductImageUrl || "",
      imageAlt: topApparel.topProductImageAlt || topApparel.topProduct || topApparel.label,
      priority: 74,
    });
  }
  if (weakTheme && weakTheme.deltaPct <= -0.12) {
    opportunities.push({
      type: "cut",
      title: `Giảm/Tắt traffic theme ${weakTheme.label}`,
      evidence: `Doanh thu ${describePctChange(weakTheme.deltaPct)}. Kéo lùi chính: ${weakTheme.topProduct || "chưa rõ"}.`,
      action: "Tạm ngưng ads, kiểm tra lại trend timing, title, mockup trước khi tiêu thêm tiền.",
      imageUrl: weakTheme.topProductImageUrl || "",
      imageAlt: weakTheme.topProductImageAlt || weakTheme.topProduct || weakTheme.label,
      priority: 72,
    });
  }
  for (const season of seasonality?.categories || []) {
    if (!["active", "preseason", "upcoming"].includes(season.phase)) continue;
    if (season.productCount >= 2) continue;
    opportunities.push({
      type: "wait",
      title: `Cần thêm dữ liệu cho ${season.shortLabel}`,
      evidence: `${season.label} đang ở ${season.phaseLabel.toLowerCase()} nhưng mới có ${season.productCount} mẫu.`,
      action: "Tạo thêm 2-3 design POD để có đủ mẫu thử nghiệm tín hiệu thị trường.",
      priority: season.phase === "active" ? 82 : 66,
    });
  }

  const classifiedCount = products.filter((product) => product.themeKey !== "unclassified-theme").length;
  const overview = [
    {
      label: "Blank tạo doanh thu",
      value: topApparel?.label || "Chưa có",
      detail: topApparel ? `${round(safeDivide(topApparel.currentSales, products.reduce((sum, item) => sum + number(item.currentSales), 0)) * 100, 1)}% doanh thu POD` : "Cần thêm sản phẩm",
    },
    {
      label: "Theme mạnh nhất",
      value: topTheme?.label || "Chưa có",
      detail: topTheme ? `${topTheme.discipline || "Theme"} | ${formatNumberForText(topTheme.productCount)} mẫu` : "Cần theme từ title/tag",
    },
    {
      label: "Tín hiệu scale",
      value: scaleTheme?.label || "Chưa rõ",
      detail: scaleTheme ? `${round(scaleTheme.deltaPct * 100, 1)}% so với kỳ trước` : "Cần thêm dữ liệu",
    },
    {
      label: "Độ phủ theme",
      value: `${classifiedCount}/${products.length}`,
      detail: "Sản phẩm đã đọc được hunting/fishing/lifestyle",
    },
  ];

  return {
    assumption: "Mô hình POD chỉ đánh giá áo in/hat in dựa trên title, SKU, product type, vendor và tags. Thêm tag chuẩn sẽ làm insight chính xác hơn.",
    overview,
    apparelMix,
    themeMix,
    opportunities: opportunities
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 8),
    apparelDaily: buildPodDailyMix(productDaily, products, "apparel"),
    themeDaily: buildPodDailyMix(productDaily, products, "theme"),
  };
}

function formatNumberForText(value) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(number(value));
}

function buildDemoDailyDetail(snapshot) {
  const days = snapshot.series || [];
  const daySalesTotal = days.reduce((sum, day) => sum + number(day.netSales), 0);
  const productDaily = [];
  const channelDaily = [];

  for (const [productIndex, product] of (snapshot.products || []).entries()) {
    for (const [dayIndex, day] of days.entries()) {
      const dayShare = safeDivide(day.netSales, daySalesTotal);
      const variance = 0.86 + ((((productIndex + 2) * (dayIndex + 3)) % 7) / 20);
      const netSales = round(number(product.current?.netSales) * dayShare * variance, 0);
      const orders = Math.max(0, Math.round(number(product.current?.orders) * dayShare * variance));
      const unitsSold = Math.max(0, Math.round(number(product.current?.unitsSold) * dayShare * variance));

      productDaily.push({
        date: day.date,
        label: product.title,
        sku: product.sku,
        imageUrl: product.imageUrl,
        imageAlt: product.imageAlt || product.title,
        productType: product.productType,
        vendor: product.vendor,
        tags: product.tags,
        collections: product.collections,
        inventory: product.inventory,
        netSales,
        grossSales: round(netSales * 1.08, 0),
        orders,
        refunds: productIndex === 0 && dayIndex >= days.length - 2 ? round(netSales * 0.04, 0) : 0,
        discounts: round(netSales * 0.06, 0),
        unitsSold,
      });
    }
  }

  for (const [channelIndex, channel] of (snapshot.channels || []).entries()) {
    for (const [dayIndex, day] of days.entries()) {
      const dayShare = safeDivide(day.netSales, daySalesTotal);
      const variance = 0.9 + ((((channelIndex + 1) * (dayIndex + 4)) % 6) / 18);
      const netSales = round(number(channel.current?.netSales) * dayShare * variance, 0);
      const orders = Math.max(0, Math.round(number(channel.current?.orders) * dayShare * variance));

      channelDaily.push({
        date: day.date,
        label: channel.name,
        netSales,
        grossSales: round(netSales * 1.07, 0),
        orders,
        sessions: Math.max(0, Math.round(number(channel.current?.sessions) * dayShare * variance)),
        refunds: 0,
        discounts: round(netSales * 0.05, 0),
        unitsSold: orders,
      });
    }
  }

  return { productDaily, channelDaily };
}

demoSnapshot.detail = buildDemoDailyDetail(demoSnapshot);

function metricRow(key, label, current, previous, format = "number", missing = false) {
  const currentValue = number(current[key]);
  const previousValue = number(previous[key]);
  return {
    key,
    label,
    format,
    current: currentValue,
    previous: previousValue,
    delta: currentValue - previousValue,
    deltaPct: pctChange(currentValue, previousValue),
    missing,
  };
}

function impactRow(key, label, value) {
  return {
    key,
    label,
    value: round(value, 2),
  };
}

function seasonDate(monthDay, year) {
  const [month, day] = String(monthDay || "01-01").split("-").map((part) => number(part, 1));
  return new Date(Date.UTC(year, month - 1, day));
}

function seasonWindow(season, year) {
  const start = seasonDate(season.start, year);
  let end = seasonDate(season.end, year);
  if (end < start) end = seasonDate(season.end, year + 1);
  const peakStart = seasonDate(season.peakStart || season.start, year);
  let peakEnd = seasonDate(season.peakEnd || season.end, year);
  if (peakEnd < peakStart) peakEnd = seasonDate(season.peakEnd || season.end, year + 1);
  return { start, end, peakStart, peakEnd };
}

function daysUntil(from, to) {
  return Math.ceil((to.getTime() - from.getTime()) / 86400000);
}

function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart <= bEnd && bStart <= aEnd;
}

function formatMonthDay(date) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
  }).format(date);
}

function seasonPhaseLabel(phase) {
  if (phase === "active") return "Đang trong mùa";
  if (phase === "preseason") return "Giai đoạn chuẩn bị";
  if (phase === "postseason") return "Vừa qua mùa";
  if (phase === "upcoming") return "Sắp tới";
  return "Ngoài mùa";
}

function seasonStatus(season, currentStart, currentEnd, anchorDate) {
  const years = [anchorDate.getUTCFullYear() - 1, anchorDate.getUTCFullYear(), anchorDate.getUTCFullYear() + 1];
  const windows = years.map((year) => seasonWindow(season, year));
  const overlapping = windows.find((window) => rangesOverlap(currentStart, currentEnd, window.start, window.end));
  if (overlapping) {
    const inPeak = rangesOverlap(currentStart, currentEnd, overlapping.peakStart, overlapping.peakEnd);
    return {
      phase: "active",
      phaseLabel: inPeak ? "Cao điểm mùa" : seasonPhaseLabel("active"),
      start: dayKey(overlapping.start),
      end: dayKey(overlapping.end),
      peakStart: dayKey(overlapping.peakStart),
      peakEnd: dayKey(overlapping.peakEnd),
      daysToStart: 0,
      priority: inPeak ? 96 : 86,
    };
  }

  const preseason = windows.find((window) => {
    const leadStart = addUtcDays(window.start, -number(season.buildUpDays, 45));
    return anchorDate >= leadStart && anchorDate < window.start;
  });
  if (preseason) {
    const days = Math.max(0, daysUntil(anchorDate, preseason.start));
    return {
      phase: "preseason",
      phaseLabel: seasonPhaseLabel("preseason"),
      start: dayKey(preseason.start),
      end: dayKey(preseason.end),
      peakStart: dayKey(preseason.peakStart),
      peakEnd: dayKey(preseason.peakEnd),
      daysToStart: days,
      priority: days <= 21 ? 82 : 68,
    };
  }

  const postseason = windows.find((window) => anchorDate > window.end && anchorDate <= addUtcDays(window.end, 21));
  if (postseason) {
    return {
      phase: "postseason",
      phaseLabel: seasonPhaseLabel("postseason"),
      start: dayKey(postseason.start),
      end: dayKey(postseason.end),
      peakStart: dayKey(postseason.peakStart),
      peakEnd: dayKey(postseason.peakEnd),
      daysToStart: 0,
      priority: 38,
    };
  }

  const next = windows
    .filter((window) => window.start >= anchorDate)
    .sort((a, b) => a.start - b.start)[0] || windows[windows.length - 1];
  const days = Math.max(0, daysUntil(anchorDate, next.start));
  return {
    phase: days <= 120 ? "upcoming" : "offseason",
    phaseLabel: days <= 120 ? seasonPhaseLabel("upcoming") : seasonPhaseLabel("offseason"),
    start: dayKey(next.start),
    end: dayKey(next.end),
    peakStart: dayKey(next.peakStart),
    peakEnd: dayKey(next.peakEnd),
    daysToStart: days,
    priority: days <= 90 ? 48 : 22,
  };
}

function productSeasonMatches(product) {
  const collectionSource = collectionText(product);
  const tagSource = tagText(product);
  const titleSource = titleText(product);
  return SEASON_PLAYBOOK
    .map((season) => {
      const collectionHits = keywordHits(collectionSource, season.keywords);
      const tagHits = keywordHits(tagSource, season.keywords);
      const titleHits = keywordHits(titleSource, season.keywords);
      const source = collectionHits.length
        ? "collection"
        : tagHits.length
          ? "tag"
          : titleHits.length
            ? "title"
            : "";
      const matched = [...new Set([...collectionHits, ...tagHits, ...titleHits])];
      return {
        key: season.key,
        label: season.label,
        shortLabel: season.shortLabel,
        source,
        sourceLabel: source === "collection"
          ? "Theo bộ sưu tập"
          : source === "tag"
            ? "Theo tag"
            : source === "title"
              ? "Theo tên sản phẩm"
              : "",
        evidence: source === "collection"
          ? collectionLabel(product.collections)
          : source === "tag"
            ? normalizeTags(product.tags).join(", ")
            : product.name || product.title || product.sku || "",
        matchedKeywords: matched,
        score: collectionHits.length * 4 + tagHits.length * 3 + titleHits.length,
      };
    })
    .filter((match) => match.score > 0);
}

function buildSeasonality({ snapshot, products, periodDays }) {
  const series = snapshot.series || [];
  const sourceRange = snapshot.source?.currentRange || {};
  const currentStart = utcDateOnly(sourceRange.start || series[0]?.date || dayKey(snapshot.generatedAt || new Date()));
  const currentEnd = utcDateOnly(sourceRange.end || series[series.length - 1]?.date || dayKey(snapshot.generatedAt || new Date()));
  const anchorDate = currentEnd || new Date(snapshot.generatedAt || Date.now());
  const safeStart = currentStart || anchorDate;
  const safeEnd = currentEnd || anchorDate;

  const seasons = SEASON_PLAYBOOK.map((season) => {
    const status = seasonStatus(season, safeStart, safeEnd, anchorDate);
    return {
      key: season.key,
      label: season.label,
      shortLabel: season.shortLabel,
      activity: season.activity,
      focus: season.focus,
      action: season.action,
      ...status,
      rangeLabel: `${formatMonthDay(utcDateOnly(status.start))} - ${formatMonthDay(utcDateOnly(status.end))}`,
      peakLabel: `${formatMonthDay(utcDateOnly(status.peakStart))} - ${formatMonthDay(utcDateOnly(status.peakEnd))}`,
    };
  }).sort((a, b) => b.priority - a.priority);

  const seasonByKey = new Map(seasons.map((season) => [season.key, season]));
  const seasonProducts = [];
  const categoryMap = new Map(seasons.map((season) => [season.key, {
    ...season,
    currentSales: 0,
    previousSales: 0,
    unitsSold: 0,
    inventory: 0,
    productCount: 0,
    matchedProducts: [],
    daysOfCover: 0,
    deltaPct: 0,
  }]));

  for (const product of products || []) {
    const matches = productSeasonMatches(product);
    if (!matches.length) {
      seasonProducts.push({
        ...product,
        seasonLabels: ["Chưa phân loại mùa"],
        activeFit: "missing",
        activeFitLabel: "Thiếu collection/tag mùa vụ",
        classificationSource: "missing",
        classificationSourceLabel: "Chưa có collection/tag phù hợp",
        classificationEvidence: collectionLabel(product.collections) || "Chưa đọc được collection mùa vụ",
        recommendedAction: "Đưa sản phẩm vào đúng collection mùa vụ/theme như Turkey, Deer, Duck, Fishing, Bass hoặc thêm tag theme rõ ràng; app sẽ không tự gán mùa chỉ vì tên áo.",
      });
      continue;
    }

    const matchedSeasons = matches
      .map((match) => seasonByKey.get(match.key))
      .filter(Boolean)
      .sort((a, b) => b.priority - a.priority);
    const best = matchedSeasons[0];
    const bestMatch = matches.find((match) => match.key === best?.key) || matches[0];
    seasonProducts.push({
      ...product,
      seasonLabels: matchedSeasons.slice(0, 3).map((season) => season.shortLabel),
      activeFit: best?.phase || "offseason",
      activeFitLabel: best?.phaseLabel || "Ngoài mùa",
      classificationSource: bestMatch?.source || "title",
      classificationSourceLabel: bestMatch?.sourceLabel || "Theo dữ liệu sản phẩm",
      classificationEvidence: bestMatch?.evidence || "",
      matchedKeywords: bestMatch?.matchedKeywords || [],
      recommendedAction: best?.action || "Theo dõi theo mùa vụ phù hợp.",
    });

    for (const match of matches) {
      const category = categoryMap.get(match.key);
      if (!category) continue;
      category.currentSales += number(product.currentSales);
      category.previousSales += number(product.previousSales);
      category.unitsSold += number(product.unitsSold);
      category.inventory += number(product.inventory);
      category.productCount += 1;
      category.matchedProducts.push(product.name);
    }
  }

  const categories = [...categoryMap.values()].map((category) => {
    const daysOfCover = round(safeDivide(category.inventory, safeDivide(category.unitsSold, periodDays)), 1);
    return {
      ...category,
      currentSales: round(category.currentSales, 2),
      previousSales: round(category.previousSales, 2),
      deltaPct: pctChange(category.currentSales, category.previousSales),
      daysOfCover,
      matchedProducts: category.matchedProducts.slice(0, 5),
    };
  }).sort((a, b) => {
    const activeWeight = (phase) => (phase === "active" ? 3 : phase === "preseason" ? 2 : phase === "upcoming" ? 1 : 0);
    return activeWeight(b.phase) - activeWeight(a.phase) || b.currentSales - a.currentSales;
  });

  const alerts = [];
  for (const category of categories) {
    const isActionableSeason = ["active", "preseason"].includes(category.phase);
    if (!isActionableSeason || !category.productCount) continue;

    if (category.deltaPct <= -0.18 && category.currentSales > 0) {
      alerts.push({
        severity: category.deltaPct <= -0.35 ? "high" : "medium",
        score: category.deltaPct <= -0.35 ? 79 : 62,
        title: `${category.shortLabel} yếu so với mùa`,
        evidence: `${category.label} đang ở ${category.phaseLabel.toLowerCase()}, nhưng doanh thu nhóm sản phẩm liên quan ${describePctChange(category.deltaPct)}.`,
        action: category.action,
      });
    }

    if (category.unitsSold >= 10 && category.daysOfCover > 0 && category.daysOfCover <= 21) {
      alerts.push({
        severity: category.daysOfCover <= 10 ? "high" : "medium",
        score: category.daysOfCover <= 10 ? 77 : 63,
        title: `${category.shortLabel} có rủi ro thiếu hàng`,
        evidence: `${category.label} còn khoảng ${category.daysOfCover} ngày hàng nếu giữ tốc độ bán hiện tại.`,
        action: "Ưu tiên bổ sung tồn kho hoặc giảm lưu lượng quảng cáo vào sản phẩm sắp hết hàng trong giai đoạn mùa vụ.",
      });
    }
  }

  return {
    anchorDate: dayKey(anchorDate),
    assumption: "Mô hình mùa vụ bán lẻ toàn quốc tại Mỹ; ngày pháp lý cần kiểm tra theo từng bang/khu vực.",
    active: seasons.filter((season) => ["active", "preseason", "postseason"].includes(season.phase)).slice(0, 4),
    upcoming: seasons.filter((season) => season.phase === "upcoming").slice(0, 5),
    seasons,
    categories,
    products: seasonProducts.sort((a, b) => b.currentSales - a.currentSales),
    alerts,
    coverage: products?.length ? "modeled" : "missing",
  };
}

function revenueDecomposition(current, previous) {
  if (!current.sessions || !previous.sessions) {
    const previousAov = safeDivide(previous.netSales, previous.orders);
    const currentAov = safeDivide(current.netSales, current.orders);
    const orderVolume = (current.orders - previous.orders) * previousAov;
    const aov = current.orders * (currentAov - previousAov);
    const unexplained = current.netSales - previous.netSales - orderVolume - aov;

    return [
      impactRow("orderVolume", "Lượng đơn", orderVolume),
      impactRow("aov", "Giá trị đơn", aov),
      impactRow("other", "Khác", unexplained),
    ];
  }

  const previousConversion = safeDivide(previous.orders, previous.sessions);
  const currentConversion = safeDivide(current.orders, current.sessions);
  const previousAov = safeDivide(previous.netSales, previous.orders);
  const currentAov = safeDivide(current.netSales, current.orders);

  const traffic = (current.sessions - previous.sessions) * previousConversion * previousAov;
  const conversion = current.sessions * (currentConversion - previousConversion) * previousAov;
  const aov = current.sessions * currentConversion * (currentAov - previousAov);
  const unexplained = current.netSales - previous.netSales - traffic - conversion - aov;

  return [
    impactRow("traffic", "Lưu lượng", traffic),
    impactRow("conversion", "Chuyển đổi", conversion),
    impactRow("aov", "Giá trị đơn", aov),
    impactRow("other", "Khác", unexplained),
  ];
}

function normalizeBreakdown(items = []) {
  return items.map((item) => ({
    name: item.name || item.title || item.sku || "Chưa rõ",
    sku: item.sku || "",
    ...normalizeProductImage(item.image || item.featuredImage || item.imageUrl),
    productType: item.productType || item.product_type || item.type || "",
    vendor: item.vendor || "",
    tags: normalizeTags(item.tags),
    collections: normalizeCollections(item.collections),
    inventory: number(item.inventory),
    current: derivedMetrics(item.current || {}),
    previous: derivedMetrics(item.previous || {}),
  }));
}

function compareByMetric(items, metric) {
  return items
    .map((item) => ({
      ...item,
      valueDelta: number(item.current[metric]) - number(item.previous[metric]),
      valueDeltaPct: pctChange(item.current[metric], item.previous[metric]),
    }))
    .sort((a, b) => a.valueDelta - b.valueDelta);
}

function severityFromScore(score) {
  if (score >= 85) return "critical";
  if (score >= 65) return "high";
  if (score >= 40) return "medium";
  return "low";
}

function slug(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function addIssue(issues, score, title, evidence, action, dimension = "Store") {
  issues.push({
    id: slug(`${dimension}-${title}`),
    severity: severityFromScore(score),
    score,
    dimension,
    title,
    evidence,
    action,
  });
}

function buildIssues({ current, previous, channels, devices, products, decomposition, periodDays = 7 }) {
  const issues = [];
  const salesDeltaPct = pctChange(current.netSales, previous.netSales);
  const sessionsDeltaPct = pctChange(current.sessions, previous.sessions);
  const conversionDeltaPct = pctChange(current.conversionRate, previous.conversionRate);
  const ordersDeltaPct = pctChange(current.orders, previous.orders);
  const aovDeltaPct = pctChange(current.aov, previous.aov);
  const refundDeltaPct = pctChange(current.refundRate, previous.refundRate);
  const discountDeltaPct = pctChange(current.discountRate, previous.discountRate);
  const hasTrafficData = current.sessions > 0 && previous.sessions > 0;

  if (salesDeltaPct <= -0.1) {
    const mainDriver = decomposition
      .filter((item) => item.value < 0)
      .sort((a, b) => a.value - b.value)[0];
    addIssue(
      issues,
      salesDeltaPct <= -0.2 ? 88 : 68,
      "Doanh thu đang giảm rõ rệt",
      `Doanh thu thuần ${describePctChange(salesDeltaPct)} so với kỳ so sánh. Yếu tố kéo giảm lớn nhất: ${mainDriver?.label || "chưa rõ"}.`,
      mainDriver?.key === "conversion"
        ? "Kiểm tra trang sản phẩm, giỏ hàng, thanh toán và trải nghiệm mobile trước khi tăng ngân sách kéo khách."
        : mainDriver?.key === "traffic"
          ? "Kiểm tra phân phối quảng cáo, lịch gửi email, trang đích organic và lỗi ở từng kênh truy cập."
          : mainDriver?.key === "orderVolume"
          ? "Xem lượng đơn theo sản phẩm/kênh, sau đó so sánh lượt truy cập và chuyển đổi từ Shopify Analytics hoặc file import."
          : "Rà lại mức giảm giá, combo và cơ cấu sản phẩm vì giá trị đơn hàng đang thấp hơn.",
      "Doanh thu",
    );
  }

  if (hasTrafficData && conversionDeltaPct <= -0.12) {
    const weakDevice = compareByMetric(devices, "conversionRate")[0];
    const weakChannel = compareByMetric(channels, "conversionRate")[0];
    addIssue(
      issues,
      conversionDeltaPct <= -0.25 ? 86 : 62,
      "Tỷ lệ chuyển đổi đang là điểm nghẽn",
      `Tỷ lệ chuyển đổi từ ${round(previous.conversionRate * 100, 2)}% còn ${round(current.conversionRate * 100, 2)}%. Thiết bị yếu nhất: ${weakDevice?.name || "không có"}. Kênh yếu nhất: ${weakChannel?.name || "không có"}.`,
      "Kiểm tra lại hành trình mua hàng trên thiết bị/kênh yếu nhất, rồi rà tồn kho, tốc độ trang, ma sát thanh toán và độ rõ của ưu đãi.",
      "Chuyển đổi",
    );
  }

  if (hasTrafficData && sessionsDeltaPct <= -0.12) {
    const weakChannel = compareByMetric(channels, "sessions")[0];
    addIssue(
      issues,
      58,
      "Lưu lượng truy cập thấp hơn kỳ so sánh",
      `Phiên truy cập ${describePctChange(sessionsDeltaPct)}. Kênh kéo giảm phiên truy cập lớn nhất: ${weakChannel?.name || "không có"}.`,
      "Kiểm tra nguồn thu hút khách, trạng thái chiến dịch, lịch gửi email, thay đổi xếp hạng organic và các link trang đích bị lỗi.",
      "Thu hút khách",
    );
  }

  if (!hasTrafficData && ordersDeltaPct <= -0.12) {
    addIssue(
      issues,
      ordersDeltaPct <= -0.25 ? 76 : 55,
      "Số đơn thấp hơn kỳ so sánh",
      `Đơn hàng ${describePctChange(ordersDeltaPct)}. Lượt truy cập và tỷ lệ chuyển đổi chưa có trong Admin API ở lần chạy này.`,
      "Bổ sung phiên truy cập/CVR từ Shopify Analytics hoặc file import để biết đơn giảm do ít khách vào hay do chuyển đổi kém.",
      "Đơn hàng",
    );
  }

  if (aovDeltaPct <= -0.08) {
    addIssue(
      issues,
      54,
      "Giá trị đơn trung bình đang giảm",
      `AOV ${describePctChange(aovDeltaPct)}; tỷ lệ giảm giá ${describePctChange(discountDeltaPct)}.`,
      "Rà lại mức giảm giá, cơ cấu sản phẩm, tỷ lệ mua combo và độ nổi bật của upsell trong giỏ hàng.",
      "Trưng bày sản phẩm",
    );
  }

  if (current.refundRate >= 0.04 && refundDeltaPct >= 0.25) {
    addIssue(
      issues,
      72,
      "Tỷ lệ hoàn tiền tăng",
      `Tỷ lệ hoàn tiền tăng từ ${round(previous.refundRate * 100, 2)}% lên ${round(current.refundRate * 100, 2)}%.`,
      "Tách hoàn tiền theo sản phẩm/lý do, rồi kiểm tra size, thời gian xử lý đơn và kỳ vọng đặt ra trên trang sản phẩm.",
      "Chất lượng",
    );
  }

  if (discountDeltaPct >= 0.2 && salesDeltaPct <= 0.05) {
    addIssue(
      issues,
      49,
      "Đang phụ thuộc nhiều hơn vào giảm giá",
      `Tỷ lệ giảm giá ${describePctChange(discountDeltaPct)} trong khi doanh thu thuần ${describePctChange(salesDeltaPct)}.`,
      "Tạm dừng giảm giá đại trà, so sánh biên lợi nhuận đóng góp và chuyển ưu đãi sang combo hoặc nhóm khách hàng mục tiêu.",
      "Biên lợi nhuận",
    );
  }

  const weakPaid = channels
    .filter((channel) => channel.current.adSpend > 0)
    .map((channel) => ({
      ...channel,
      roasDelta: pctChange(channel.current.roas, channel.previous.roas),
      spendDelta: pctChange(channel.current.adSpend, channel.previous.adSpend),
    }))
    .filter((channel) => channel.current.roas < 3 && channel.spendDelta > 0.1)
    .sort((a, b) => a.current.roas - b.current.roas)[0];

  if (weakPaid) {
    addIssue(
      issues,
      70,
      "Chi quảng cáo chưa tạo doanh thu hiệu quả",
      `${weakPaid.name} có ROAS ${round(weakPaid.current.roas, 2)} trong khi chi tiêu ${describePctChange(weakPaid.spendDelta)}.`,
      "Dời ngân sách khỏi nhóm quảng cáo yếu, kiểm tra độ khớp của trang đích và so sánh chuyển đổi theo mẫu quảng cáo trước khi tăng ngân sách.",
      "Quảng cáo trả phí",
    );
  }

  const productDrag = compareByMetric(products, "netSales")[0];
  if (productDrag && productDrag.valueDeltaPct <= -0.18) {
    addIssue(
      issues,
      productDrag.valueDeltaPct <= -0.35 ? 78 : 56,
      "Một sản phẩm đang kéo doanh thu xuống",
      `Doanh thu thuần của ${productDrag.name} ${describePctChange(productDrag.valueDeltaPct)}.`,
      "Kiểm tra tồn kho, giá bán, trang đích chiến dịch, chuyển đổi trang sản phẩm và vị trí hiển thị gần đây của sản phẩm này.",
      "Sản phẩm",
    );
  }

  const lowStock = products
    .map((product) => ({
      ...product,
      daysOfCover: safeDivide(product.inventory, safeDivide(product.current.unitsSold, periodDays)),
    }))
    .filter((product) => product.current.unitsSold >= 10 && product.daysOfCover > 0 && product.daysOfCover <= 14)
    .sort((a, b) => a.daysOfCover - b.daysOfCover)[0];

  if (lowStock) {
    addIssue(
      issues,
      64,
      "Sản phẩm bán nhanh có tồn kho thấp",
      `${lowStock.name} còn khoảng ${round(lowStock.daysOfCover, 1)} ngày hàng nếu giữ tốc độ bán hiện tại.`,
      "Bổ sung tồn kho hoặc giảm lưu lượng quảng cáo để tránh đẩy nhu cầu vào sản phẩm sắp hết hàng.",
      "Tồn kho",
    );
  }

  return issues.sort((a, b) => b.score - a.score);
}

function summarize(issues, current, previous) {
  if (!issues.length) {
    return {
      headline: "Hiệu suất cửa hàng đang ổn định",
      narrative: "Chưa thấy biến động lớn vượt ngưỡng cảnh báo. Tiếp tục theo dõi cơ cấu kênh, tỷ lệ chuyển đổi và số ngày còn hàng.",
    };
  }

  const lead = issues[0];
  return {
    headline: lead.title,
    narrative: `${lead.evidence} Việc nên làm tiếp theo: ${lead.action}`,
    netSalesDeltaPct: pctChange(current.netSales, previous.netSales),
  };
}

export function analyzeSnapshot(snapshot = demoSnapshot) {
  const current = derivedMetrics(snapshot.current || {});
  const previous = derivedMetrics(snapshot.previous || {});
  const channels = normalizeBreakdown(snapshot.channels || []);
  const devices = normalizeBreakdown(snapshot.devices || []);
  const products = normalizeBreakdown(snapshot.products || []);
  const periodDays = Math.max(1, number(snapshot.source?.days, 7));
  const decomposition = revenueDecomposition(current, previous);
  const dataNotes = [];
  if (!current.sessions || !previous.sessions) {
    dataNotes.push("Muốn phân tích lưu lượng và chuyển đổi chính xác hơn, cần thêm phiên truy cập từ Shopify Analytics hoặc file import.");
  }
  if (snapshot.source?.type === "shopify-admin-api") {
    dataNotes.push("Đã có chi tiết theo đơn hàng, sản phẩm, nguồn đơn hàng và từng ngày từ Shopify Admin API.");
  }
  dataNotes.push("Mùa săn/câu đang dùng mô hình bán lẻ toàn quốc; cần kiểm tra quy định theo bang nếu dùng cho lịch pháp lý.");
  if (!channels.length) {
    dataNotes.push("Phân tích theo kênh cần thêm dữ liệu channel/source.");
  }
  if (!products.length) {
    dataNotes.push("Phân tích sản phẩm và tồn kho cần thêm dữ liệu sản phẩm.");
  }
  for (const warning of [...(snapshot.warnings || []), ...(snapshot.source?.warnings || [])]) {
    if (warning) dataNotes.push(warning);
  }

  const coverage = {
    revenue: current.netSales || previous.netSales ? "live" : "empty",
    orders: current.orders || previous.orders ? "live" : "empty",
    products: products.length ? "live" : "missing",
    traffic: current.sessions && previous.sessions ? "live" : "missing",
    paidSpend: current.adSpend || previous.adSpend ? "manual" : "missing",
  };

  const metrics = [
    metricRow("netSales", "Doanh thu thuần", current, previous, "currency"),
    metricRow("orders", "Đơn hàng (Unique)", current, previous, "number"),
    metricRow("unitsSold", "Số lượng bán (Units)", current, previous, "number"),
    metricRow("aov", "Giá trị đơn trung bình", current, previous, "currency"),
    metricRow("sessions", "Phiên truy cập", current, previous, "number", !current.sessions && !previous.sessions),
    metricRow("conversionRate", "Tỷ lệ chuyển đổi", current, previous, "percent", !current.sessions && !previous.sessions),
    metricRow("roas", "ROAS", current, previous, "number", !current.adSpend && !previous.adSpend),
  ];

  const productTable = compareByMetric(products, "netSales").map((product) => {
    const classification = classifyPodProduct(product);
    return {
      name: product.name,
      sku: product.sku,
      imageUrl: product.imageUrl,
      imageAlt: product.imageAlt || product.name,
      productType: product.productType,
      vendor: product.vendor,
      tags: product.tags,
      collections: product.collections,
      inventory: product.inventory,
      currentSales: product.current.netSales,
      previousSales: product.previous.netSales,
      deltaPct: product.valueDeltaPct,
      unitsSold: product.current.unitsSold,
      daysOfCover: round(safeDivide(product.inventory, safeDivide(product.current.unitsSold, periodDays)), 1),
      ...classification,
    };
  });

  const seasonality = buildSeasonality({ snapshot, products: productTable, periodDays });
  const productDailyRows = normalizeDailyRows(snapshot.detail?.productDaily || []);
  const pod = buildPodAnalytics({ products: productTable, productDaily: productDailyRows, seasonality, periodDays });
  coverage.seasonality = seasonality.coverage;
  coverage.podModel = products.length ? "modeled" : "missing";
  dataNotes.push(pod.assumption);

  const issues = [
    ...buildIssues({ current, previous, channels, devices, products, decomposition, periodDays }),
    ...seasonality.alerts.map((alert) => ({
      id: slug(`mua-vu-${alert.title}`),
      severity: alert.severity,
      score: alert.score,
      dimension: "Mùa vụ",
      title: alert.title,
      evidence: alert.evidence,
      action: alert.action,
    })),
  ].sort((a, b) => b.score - a.score);

  const channelTable = channels.map((channel) => ({
    name: channel.name,
    currentSales: channel.current.netSales,
    previousSales: channel.previous.netSales,
    deltaPct: pctChange(channel.current.netSales, channel.previous.netSales),
    conversionRate: channel.current.conversionRate,
    roas: channel.current.roas,
    adSpend: channel.current.adSpend,
  })).sort((a, b) => a.currentSales - b.currentSales);

  return {
    generatedAt: snapshot.generatedAt || new Date().toISOString(),
    currency: snapshot.currency || CURRENCY,
    periods: {
      current: current.label || snapshot.current?.label || "Kỳ hiện tại",
      previous: previous.label || snapshot.previous?.label || "Kỳ so sánh",
    },
    source: snapshot.source || {},
    coverage,
    summary: summarize(issues, current, previous),
    metrics,
    decomposition,
    issues,
    dataNotes,
    seasonality,
    pod,
    tables: {
      daily: normalizeDailyRows(snapshot.series || []),
      productDaily: productDailyRows,
      apparelDaily: pod.apparelDaily,
      themeDaily: pod.themeDaily,
      channelDaily: normalizeDailyRows(snapshot.detail?.channelDaily || []),
      seasonCategories: seasonality.categories,
      seasonProducts: seasonality.products,
      blankMix: pod.apparelMix,
      trendThemes: pod.themeMix,
      podOpportunities: pod.opportunities,
      channels: channelTable,
      products: productTable,
      devices: devices.map((device) => ({
        name: device.name,
        currentSales: device.current.netSales,
        deltaPct: pctChange(device.current.netSales, device.previous.netSales),
        conversionRate: device.current.conversionRate,
        sessions: device.current.sessions,
      })),
    },
    series: snapshot.series || [],
  };
}

function moneyAmount(bag) {
  return number(bag?.shopMoney?.amount);
}

function moneyCurrency(bag) {
  return String(bag?.shopMoney?.currencyCode || "").trim();
}

function isoDate(date) {
  return date.toISOString();
}

function dayKey(value) {
  return new Date(value).toISOString().slice(0, 10);
}

function validTimeZone(value) {
  const timeZone = String(value || "").trim();
  if (!timeZone) return "";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return timeZone;
  } catch {
    return "";
  }
}

function defaultShopifyTimeZone() {
  return validTimeZone(env("SHOPIFY_TIME_ZONE"))
    || validTimeZone(env("SHOPIFY_IANA_TIME_ZONE"))
    || DEFAULT_SHOPIFY_TIME_ZONE;
}

function timeZoneParts(value, timeZone) {
  const date = new Date(value);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: number(map.year),
    month: number(map.month),
    day: number(map.day),
    hour: number(map.hour),
    minute: number(map.minute),
    second: number(map.second),
  };
}

function zonedDateKey(value, timeZone = DEFAULT_SHOPIFY_TIME_ZONE) {
  const parts = timeZoneParts(value, timeZone);
  return [
    String(parts.year).padStart(4, "0"),
    String(parts.month).padStart(2, "0"),
    String(parts.day).padStart(2, "0"),
  ].join("-");
}

function timeZoneOffsetMs(date, timeZone) {
  const parts = timeZoneParts(date, timeZone);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return asUtc - date.getTime();
}

function zonedDateStartUtc(dateKey, timeZone) {
  const [year, month, day] = String(dateKey || "").split("-").map((part) => number(part));
  if (!year || !month || !day) return null;
  const localAsUtc = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  let offset = timeZoneOffsetMs(localAsUtc, timeZone);
  let instant = new Date(localAsUtc.getTime() - offset);
  offset = timeZoneOffsetMs(instant, timeZone);
  instant = new Date(localAsUtc.getTime() - offset);
  return Number.isNaN(instant.getTime()) ? null : instant;
}

function addDaysToDateKey(dateKey, days) {
  const date = utcDateOnly(dateKey);
  if (!date) return "";
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function dateKeyRangeDays(startKey, endExclusiveKey) {
  const start = utcDateOnly(startKey);
  const end = utcDateOnly(endExclusiveKey);
  if (!start || !end) return 0;
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000));
}

function addUtcDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function utcDateOnly(value) {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function rangeDays(start, end) {
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000));
}

function formatRangeLabel(start, endExclusive) {
  const endInclusive = addUtcDays(endExclusive, -1);
  const formatter = new Intl.DateTimeFormat("vi-VN", {
    month: "short",
    day: "numeric",
    year: start.getUTCFullYear() === endInclusive.getUTCFullYear() ? undefined : "numeric",
    timeZone: "UTC",
  });
  const endFormatter = new Intl.DateTimeFormat("vi-VN", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  if (dayKey(start) === dayKey(endInclusive)) return endFormatter.format(start);
  return `${formatter.format(start)} - ${endFormatter.format(endInclusive)}`;
}

function formatDateKeyRangeLabel(startKey, endExclusiveKey) {
  const start = utcDateOnly(startKey);
  const endInclusive = utcDateOnly(addDaysToDateKey(endExclusiveKey, -1));
  if (!start || !endInclusive) return "";
  const formatter = new Intl.DateTimeFormat("vi-VN", {
    month: "short",
    day: "numeric",
    year: start.getUTCFullYear() === endInclusive.getUTCFullYear() ? undefined : "numeric",
    timeZone: "UTC",
  });
  const endFormatter = new Intl.DateTimeFormat("vi-VN", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  if (startKey === addDaysToDateKey(endExclusiveKey, -1)) return endFormatter.format(start);
  return `${formatter.format(start)} - ${endFormatter.format(endInclusive)}`;
}

function addMetric(target, values = {}) {
  target.netSales += number(values.netSales);
  target.grossSales += number(values.grossSales);
  target.orders += number(values.orders);
  target.sessions += number(values.sessions);
  target.refunds += number(values.refunds);
  target.discounts += number(values.discounts);
  target.unitsSold += number(values.unitsSold);
  target.adSpend += number(values.adSpend);
}

function dateKeyInRange(dateKey, startKey, endExclusiveKey) {
  if (!startKey || !endExclusiveKey) return true;
  return dateKey >= startKey && dateKey < endExclusiveKey;
}

function emptyDailyRow(date, label = "") {
  return {
    date,
    label,
    netSales: 0,
    grossSales: 0,
    orders: 0,
    sessions: 0,
    refunds: 0,
    discounts: 0,
    unitsSold: 0,
    adSpend: 0,
  };
}

function emptyPeriod(label = "") {
  return {
    label,
    netSales: 0,
    grossSales: 0,
    orders: 0,
    sessions: 0,
    refunds: 0,
    discounts: 0,
    unitsSold: 0,
    adSpend: 0,
  };
}

function fillSeries(seriesMap, startKey, endExclusiveKey) {
  const rows = [];
  for (let date = startKey; date && date < endExclusiveKey; date = addDaysToDateKey(date, 1)) {
    rows.push(seriesMap.get(date) || {
      date,
      netSales: 0,
      grossSales: 0,
      orders: 0,
      sessions: 0,
      refunds: 0,
      discounts: 0,
      unitsSold: 0,
    });
  }
  return rows;
}

function shopifyQueryForRange(start, end) {
  return `processed_at:>=${isoDate(start)} processed_at:<${isoDate(end)} status:any`;
}

async function shopifyGraphql(query, variables, session) {
  const store = normalizeStoreDomain(env("SHOPIFY_STORE_DOMAIN")) || normalizeStoreDomain(session?.shop);
  const token = env("SHOPIFY_ADMIN_ACCESS_TOKEN") || session?.accessToken;
  const version = env("SHOPIFY_API_VERSION", SHOPIFY_API_VERSION);

  if (!store || !token) {
    throw Object.assign(new Error("Chưa cấu hình dữ liệu Shopify trực tiếp"), { status: 501 });
  }

  const response = await fetch(`https://${store}/admin/api/${version}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": token,
    },
    body: JSON.stringify({ query, variables }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.errors) {
    const message = payload.errors?.map?.((error) => error.message).join("; ")
      || `Shopify Admin API returned ${response.status}`;
    throw Object.assign(new Error(message), { status: response.status || 502, payload });
  }

  return payload.data;
}

async function shopifyTimeZone(session) {
  const fallback = defaultShopifyTimeZone();
  try {
    const data = await shopifyGraphql(INSIGHT_SHOP_QUERY, {}, session);
    return validTimeZone(data?.shop?.ianaTimezone) || fallback;
  } catch {
    return fallback;
  }
}

const ORDER_PAGE_SIZE = 100;

function combineOrderFetchResults(results = []) {
  return results.reduce((combined, result) => ({
    orders: [...combined.orders, ...(result.orders || [])],
    meta: {
      expected: combined.meta.expected + number(result.meta?.expected),
      fetched: combined.meta.fetched + number(result.meta?.fetched),
      pages: combined.meta.pages + number(result.meta?.pages),
      chunks: combined.meta.chunks + number(result.meta?.chunks, 1),
      truncated: combined.meta.truncated || Boolean(result.meta?.truncated),
      precision: result.meta?.precision || combined.meta.precision,
      warnings: [...combined.meta.warnings, ...(result.meta?.warnings || [])],
    },
  }), {
    orders: [],
    meta: {
      expected: 0,
      fetched: 0,
      pages: 0,
      chunks: 0,
      truncated: false,
      precision: "",
      warnings: [],
    },
  });
}

async function countOrders(start, end, session) {
  const query = shopifyQueryForRange(start, end);
  const data = await shopifyGraphql(INSIGHT_ORDERS_COUNT_QUERY, { query }, session);
  return {
    count: number(data?.ordersCount?.count),
    precision: data?.ordersCount?.precision || "",
  };
}

async function fetchOrdersWindow(start, end, session, expected = null) {
  const orders = [];
  const maxPages = Math.max(1, Math.min(number(env("SHOPIFY_ORDER_MAX_PAGES"), 25), 100));
  let after = null;
  let pages = 0;
  let hasMore = false;

  for (let page = 0; page < maxPages; page += 1) {
    const data = await shopifyGraphql(INSIGHT_ORDERS_QUERY, {
      first: ORDER_PAGE_SIZE,
      after,
      query: shopifyQueryForRange(start, end),
    }, session);

    const connection = data?.orders;
    orders.push(...(connection?.nodes || []));
    pages += 1;
    hasMore = Boolean(connection?.pageInfo?.hasNextPage);
    if (!hasMore) break;
    after = connection.pageInfo.endCursor;
    if (!after) break;
  }

  const expectedCount = expected === null ? orders.length : number(expected);
  return {
    orders,
    meta: {
      expected: expectedCount,
      fetched: orders.length,
      pages,
      chunks: 1,
      truncated: hasMore || (expectedCount > orders.length),
      precision: "",
      warnings: [],
    },
  };
}

async function fetchOrders(start, end, session, depth = 0) {
  let count = null;
  try {
    count = await countOrders(start, end, session);
  } catch {
    count = null;
  }

  const expected = count?.count ?? null;
  const days = rangeDays(start, end);
  const shouldSplit = expected !== null && expected > ORDER_PAGE_SIZE && days > 1 && depth < 8;

  if (shouldSplit) {
    const splitDays = Math.max(1, Math.floor(days / 2));
    const midpoint = addUtcDays(start, splitDays);
    const combined = combineOrderFetchResults([
      await fetchOrders(start, midpoint, session, depth + 1),
      await fetchOrders(midpoint, end, session, depth + 1),
    ]);
    combined.meta.precision = count.precision || combined.meta.precision;
    return combined;
  }

  const result = await fetchOrdersWindow(start, end, session, expected);
  result.meta.precision = count?.precision || "";
  if (expected !== null && result.orders.length < expected && days > 1 && depth < 8) {
    const splitDays = Math.max(1, Math.floor(days / 2));
    const midpoint = addUtcDays(start, splitDays);
    const combined = combineOrderFetchResults([
      await fetchOrders(start, midpoint, session, depth + 1),
      await fetchOrders(midpoint, end, session, depth + 1),
    ]);
    combined.meta.precision = count?.precision || combined.meta.precision;
    return combined;
  }

  if (expected !== null && result.orders.length < expected) {
    result.meta.warnings.push(`Đã đọc ${result.orders.length}/${expected} đơn trong khoảng ${formatRangeLabel(start, end)}.`);
  }

  return result;
}

function summarizeOrders(orders, label, timeZone = DEFAULT_SHOPIFY_TIME_ZONE, range = {}) {
  const period = emptyPeriod(label);
  const channels = new Map();
  const products = new Map();
  const series = new Map();
  const productDaily = new Map();
  const channelDaily = new Map();
  const warnings = [];
  const seenOrderIds = new Set();
  let duplicateOrders = 0;
  let outsideRangeOrders = 0;
  let currency = "";

  for (const order of orders) {
    if (order.id) {
      if (seenOrderIds.has(order.id)) {
        duplicateOrders += 1;
        continue;
      }
      seenOrderIds.add(order.id);
    }

    const date = zonedDateKey(order.processedAt, timeZone);
    if (!dateKeyInRange(date, range.startKey, range.endExclusiveKey)) {
      outsideRangeOrders += 1;
      continue;
    }

    const netSales = moneyAmount(order.currentTotalPriceSet);
    const grossSales = moneyAmount(order.currentSubtotalPriceSet) || netSales;
    const discounts = moneyAmount(order.currentTotalDiscountsSet);
    const refunds = moneyAmount(order.totalRefundedSet);
    const unitsSold = number(order.currentSubtotalLineItemsQuantity);
    const orderCurrency = moneyCurrency(order.currentTotalPriceSet);
    if (!currency && orderCurrency) currency = orderCurrency;

    addMetric(period, {
      netSales,
      grossSales,
      orders: 1,
      refunds,
      discounts,
      unitsSold,
    });

    const channelName = order.sourceName || "Không rõ";
    if (!channels.has(channelName)) channels.set(channelName, emptyPeriod(channelName));
    addMetric(channels.get(channelName), {
      netSales,
      grossSales,
      orders: 1,
      refunds,
      discounts,
      unitsSold,
    });

    if (!series.has(date)) series.set(date, emptyDailyRow(date));
    const day = series.get(date);
    addMetric(day, {
      netSales,
      grossSales,
      orders: 1,
      refunds,
      discounts,
      unitsSold,
    });

    const channelDailyKey = `${date}||${channelName}`;
    if (!channelDaily.has(channelDailyKey)) {
      channelDaily.set(channelDailyKey, emptyDailyRow(date, channelName));
    }
    addMetric(channelDaily.get(channelDailyKey), {
      netSales,
      grossSales,
      orders: 1,
      refunds,
      discounts,
      unitsSold,
    });

    if (order.lineItems?.pageInfo?.hasNextPage) {
      warnings.push(`Order ${order.id} has more than 50 line items; product metrics may be partial.`);
    }

    for (const line of order.lineItems?.nodes || []) {
      const variant = line.variant || {};
      const productSource = variant.product || {};
      const productTitle = productSource.title || line.title || "Sản phẩm chưa rõ";
      const sku = variant.sku || line.sku || "";
      const key = variant.id || sku || productTitle;
      const productImage = normalizeProductImage(productSource.featuredImage);
      if (!products.has(key)) {
        products.set(key, {
          title: productTitle,
          sku,
          ...productImage,
          productType: productSource.productType || "",
          vendor: productSource.vendor || "",
          tags: normalizeTags(productSource.tags),
          collections: normalizeCollections(productSource.collections),
          inventory: number(variant.inventoryQuantity),
          period: emptyPeriod(productTitle),
        });
      }

      const product = products.get(key);
      if (productImage.imageUrl) {
        product.imageUrl = productImage.imageUrl;
        product.imageAlt = productImage.imageAlt || product.imageAlt || productTitle;
      }
      product.productType = productSource.productType || product.productType || "";
      product.vendor = productSource.vendor || product.vendor || "";
      product.tags = normalizeTags(productSource.tags?.length ? productSource.tags : product.tags);
      product.collections = normalizeCollections(productSource.collections?.nodes?.length ? productSource.collections : product.collections);
      product.inventory = number(variant.inventoryQuantity, product.inventory);
      const lineSales = moneyAmount(line.discountedTotalSet);
      const lineQuantity = number(line.quantity);
      addMetric(product.period, {
        netSales: lineSales,
        grossSales: lineSales,
        orders: 1,
        unitsSold: lineQuantity,
      });

      const productDailyKey = `${date}||${key}`;
      if (!productDaily.has(productDailyKey)) {
        productDaily.set(productDailyKey, {
          ...emptyDailyRow(date, productTitle),
          sku,
          imageUrl: product.imageUrl,
          imageAlt: product.imageAlt || productTitle,
          productType: product.productType,
          vendor: product.vendor,
          tags: product.tags,
          collections: product.collections,
          inventory: number(variant.inventoryQuantity),
        });
      }
      const dailyProduct = productDaily.get(productDailyKey);
      dailyProduct.inventory = number(variant.inventoryQuantity, dailyProduct.inventory);
      addMetric(dailyProduct, {
        netSales: lineSales,
        grossSales: lineSales,
        orders: 1,
        unitsSold: lineQuantity,
      });
    }
  }

  if (duplicateOrders) {
    warnings.push(`Đã bỏ qua ${duplicateOrders} đơn bị trùng khi đọc dữ liệu Shopify.`);
  }
  if (outsideRangeOrders) {
    warnings.push(`Đã bỏ qua ${outsideRangeOrders} đơn nằm ngoài ngày đang xem sau khi quy đổi theo múi giờ ${timeZone}.`);
  }

  return {
    period,
    currency,
    channels,
    products,
    series,
    productDaily,
    channelDaily,
    warnings,
  };
}

function combineBreakdowns(currentMap, previousMap, type) {
  const keys = new Set([...currentMap.keys(), ...previousMap.keys()]);
  return [...keys].map((key) => {
    const current = currentMap.get(key) || emptyPeriod();
    const previous = previousMap.get(key) || emptyPeriod();
    if (type === "product") {
      const source = currentMap.get(key) || previousMap.get(key);
      return {
        title: source?.title || current.label || previous.label || "Sản phẩm chưa rõ",
        sku: source?.sku || "",
        productType: source?.productType || "",
        vendor: source?.vendor || "",
        imageUrl: source?.imageUrl || "",
        imageAlt: source?.imageAlt || source?.title || "",
        tags: normalizeTags(source?.tags),
        collections: normalizeCollections(source?.collections),
        inventory: number(source?.inventory),
        current: current.period || current,
        previous: previous.period || previous,
      };
    }
    return {
      name: current.label || previous.label || "Không rõ",
      current,
      previous,
    };
  });
}

function normalizeDailyRows(rows = []) {
  return rows.map((row) => {
    const metrics = derivedMetrics(row);
    return {
      date: row.date,
      label: row.label || row.name || row.title || "",
      sku: row.sku || "",
      imageUrl: row.imageUrl || normalizeProductImage(row.image || row.featuredImage).imageUrl,
      imageAlt: row.imageAlt || normalizeProductImage(row.image || row.featuredImage).imageAlt,
      netSales: metrics.netSales,
      grossSales: metrics.grossSales,
      orders: metrics.orders,
      refunds: metrics.refunds,
      discounts: metrics.discounts,
      unitsSold: metrics.unitsSold,
      aov: metrics.aov,
      refundRate: metrics.refundRate,
      discountRate: metrics.discountRate,
      inventory: number(row.inventory),
      groupKey: row.groupKey || "",
      dimension: row.dimension || "",
      productType: row.productType || "",
      vendor: row.vendor || "",
      tags: normalizeTags(row.tags),
      collections: normalizeCollections(row.collections),
      apparelKey: row.apparelKey || "",
      apparelLabel: row.apparelLabel || "",
      themeKey: row.themeKey || "",
      themeLabel: row.themeLabel || "",
      themeDiscipline: row.themeDiscipline || "",
    };
  });
}

function applyManualMetrics(snapshot, url) {
  const currentSessions = number(url.searchParams.get("currentSessions"));
  const previousSessions = number(url.searchParams.get("previousSessions"));
  const currentAdSpend = number(url.searchParams.get("currentAdSpend"));
  const previousAdSpend = number(url.searchParams.get("previousAdSpend"));

  if (currentSessions) snapshot.current.sessions = currentSessions;
  if (previousSessions) snapshot.previous.sessions = previousSessions;
  if (currentAdSpend) snapshot.current.adSpend = currentAdSpend;
  if (previousAdSpend) snapshot.previous.adSpend = previousAdSpend;

  return snapshot;
}

export async function buildShopifySnapshot(options = {}) {
  const session = options.session || null;
  const now = options.now ? new Date(options.now) : new Date();
  const timeZone = validTimeZone(options.timeZone) || await shopifyTimeZone(session);
  const requestedStartKey = options.start || "";
  const requestedEndKey = options.end || "";
  const requestedStart = requestedStartKey ? zonedDateStartUtc(requestedStartKey, timeZone) : null;
  const requestedEnd = requestedEndKey ? zonedDateStartUtc(requestedEndKey, timeZone) : null;
  const hasAnyCustomRange = Boolean(options.start || options.end);
  const hasCustomRange = Boolean(requestedStart && requestedEnd);
  let days = Math.max(1, Math.min(number(options.days, 7), 60));
  let currentStart;
  let currentEnd;
  let currentStartKey;
  let currentEndKey;

  if (hasAnyCustomRange && !hasCustomRange) {
    throw Object.assign(new Error("Hãy cung cấp cả ngày bắt đầu và ngày kết thúc theo định dạng YYYY-MM-DD"), { status: 400 });
  }

  if (hasCustomRange) {
    if (requestedEndKey < requestedStartKey) {
      throw Object.assign(new Error("Ngày kết thúc phải bằng hoặc sau ngày bắt đầu"), { status: 400 });
    }
    currentStartKey = requestedStartKey;
    currentEndKey = addDaysToDateKey(requestedEndKey, 1);
    currentStart = requestedStart;
    currentEnd = zonedDateStartUtc(currentEndKey, timeZone);
    days = Math.min(dateKeyRangeDays(currentStartKey, currentEndKey), 60);
    currentEndKey = addDaysToDateKey(currentStartKey, days);
    currentEnd = zonedDateStartUtc(currentEndKey, timeZone);
  } else {
    currentEndKey = addDaysToDateKey(zonedDateKey(now, timeZone), 1);
    currentStartKey = addDaysToDateKey(currentEndKey, -days);
    currentStart = zonedDateStartUtc(currentStartKey, timeZone);
    currentEnd = zonedDateStartUtc(currentEndKey, timeZone);
  }

  const previousEndKey = currentStartKey;
  const previousStartKey = addDaysToDateKey(previousEndKey, -days);
  const previousEnd = zonedDateStartUtc(previousEndKey, timeZone);
  const previousStart = zonedDateStartUtc(previousStartKey, timeZone);

  const [currentFetch, previousFetch] = await Promise.all([
    fetchOrders(currentStart, currentEnd, session),
    fetchOrders(previousStart, previousEnd, session),
  ]);
  const currentOrders = currentFetch.orders;
  const previousOrders = previousFetch.orders;

  const currentLabel = hasCustomRange
    ? formatDateKeyRangeLabel(currentStartKey, currentEndKey)
    : `${days} ngày gần nhất`;
  const previousLabel = hasCustomRange
    ? `${formatDateKeyRangeLabel(previousStartKey, previousEndKey)} so sánh`
    : `${days} ngày trước đó`;
  const current = summarizeOrders(currentOrders, currentLabel, timeZone, {
    startKey: currentStartKey,
    endExclusiveKey: currentEndKey,
  });
  const previous = summarizeOrders(previousOrders, previousLabel, timeZone, {
    startKey: previousStartKey,
    endExclusiveKey: previousEndKey,
  });
  previous.period.label = previousLabel;
  const series = fillSeries(current.series, currentStartKey, currentEndKey);

  return {
    generatedAt: now.toISOString(),
    currency: current.currency || previous.currency || CURRENCY,
    current: current.period,
    previous: previous.period,
    channels: combineBreakdowns(current.channels, previous.channels),
    devices: [],
    products: combineBreakdowns(current.products, previous.products, "product"),
    series,
    detail: {
      productDaily: normalizeDailyRows([...current.productDaily.values()]),
      channelDaily: normalizeDailyRows([...current.channelDaily.values()]),
    },
    warnings: [...current.warnings, ...previous.warnings],
    source: {
      type: "shopify-admin-api",
      timeZone,
      days,
      rangeMode: hasCustomRange ? "custom" : "preset",
      currentRange: {
        start: currentStartKey,
        end: addDaysToDateKey(currentEndKey, -1),
      },
      previousRange: {
        start: previousStartKey,
        end: addDaysToDateKey(previousEndKey, -1),
      },
      orderCount: {
        current: currentOrders.length,
        previous: previousOrders.length,
        currentExpected: currentFetch.meta.expected || currentOrders.length,
        previousExpected: previousFetch.meta.expected || previousOrders.length,
        currentPrecision: currentFetch.meta.precision,
        previousPrecision: previousFetch.meta.precision,
        currentChunks: currentFetch.meta.chunks,
        previousChunks: previousFetch.meta.chunks,
        currentPages: currentFetch.meta.pages,
        previousPages: previousFetch.meta.pages,
        truncated: currentFetch.meta.truncated || previousFetch.meta.truncated,
      },
      warnings: [...currentFetch.meta.warnings, ...previousFetch.meta.warnings],
    },
  };
}

function sendJson(res, status, body) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  return res.status(status).json(body);
}

export default async function handler(req, res) {
  const url = requestUrl(req);

  if (req.method === "GET") {
    if (url.searchParams.get("source") === "status") {
      const session = await shopifySessionFromRequest(req, res).catch(() => getShopifySession(req));
      const timeZone = await shopifyTimeZone(session);
      return sendJson(res, 200, {
        liveConfigured: liveDataConfigured(),
        oauthConfigured: oauthConfigured(),
        oauthConnected: Boolean(session?.accessToken),
        accessKeyRequired: Boolean(env("INSIGHT_ACCESS_KEY")),
        shopDomainConfigured: Boolean(env("SHOPIFY_STORE_DOMAIN")),
        oauthShop: session?.shop || "",
        timeZone,
        apiVersion: env("SHOPIFY_API_VERSION", SHOPIFY_API_VERSION),
      });
    }

    if (url.searchParams.get("source") === "shopify") {
      let session = null;
      try {
        session = await shopifySessionFromRequest(req, res);
      } catch (error) {
        if (!accessKeyValid(req)) {
          return sendJson(res, error.status || 401, {
            error: error instanceof Error ? error.message : "Chưa thể xác thực kết nối Shopify",
            authUrl: "/api/auth/start",
          });
        }
      }

      if (!session?.accessToken && !accessKeyValid(req)) {
        return sendJson(res, 401, { error: "Khóa truy cập không đúng hoặc chưa được nhập" });
      }

      try {
        if (!env("SHOPIFY_ADMIN_ACCESS_TOKEN") && !session?.accessToken) {
          return sendJson(res, 401, {
            error: oauthConfigured()
              ? "Shopify chưa được kết nối. Hãy bấm Kết nối Shopify trước."
              : "Shopify OAuth chưa được cấu hình. Hãy set SHOPIFY_API_KEY và SHOPIFY_API_SECRET.",
            authUrl: "/api/auth/start",
          });
        }

        const snapshot = applyManualMetrics(await buildShopifySnapshot({
          days: url.searchParams.get("days"),
          start: url.searchParams.get("start"),
          end: url.searchParams.get("end"),
          session,
        }), url);
        return sendJson(res, 200, {
          source: "shopify",
          snapshot,
          analysis: analyzeSnapshot(snapshot),
        });
      } catch (error) {
        return sendJson(res, error.status || 500, {
          error: error instanceof Error ? error.message : "Chưa thể tải dữ liệu Shopify trực tiếp",
        });
      }
    }

    return sendJson(res, 200, {
      source: "demo",
      analysis: analyzeSnapshot(demoSnapshot),
      sample: demoSnapshot,
    });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return sendJson(res, 405, { error: "Phương thức không được hỗ trợ" });
  }

  try {
    if (!accessKeyValid(req) && boolEnv("INSIGHT_REQUIRE_KEY_FOR_UPLOADS")) {
      return sendJson(res, 401, { error: "Khóa truy cập không đúng hoặc chưa được nhập" });
    }

    const snapshot = req.body?.snapshot || req.body;
    if (!snapshot || !snapshot.current || !snapshot.previous) {
      return sendJson(res, 400, {
        error: "Thiếu snapshot phân tích. Hãy cung cấp object current và previous.",
      });
    }

    return sendJson(res, 200, {
      source: "upload",
      analysis: analyzeSnapshot(snapshot),
    });
  } catch (error) {
    return sendJson(res, 500, {
      error: "Chưa thể phân tích snapshot",
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}
