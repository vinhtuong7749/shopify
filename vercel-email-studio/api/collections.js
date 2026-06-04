function normalizeStoreDomain(value) {
  const store = String(Array.isArray(value) ? value[0] : value || "camosignal.com")
    .trim()
    .replace(/^https?:\/\//i, "")
    .split("/")[0]
    .toLowerCase();
  const domainPattern = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,12}$/i;
  return store.length <= 253 && domainPattern.test(store) ? store : "";
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const store = normalizeStoreDomain(req.query.store);
    if (!store) {
      return res.status(400).json({ error: "Invalid store domain" });
    }

    const upstream = await fetch(`https://${store}/collections.json?limit=250`, {
      headers: {
        "User-Agent": "CamoSignal Email Studio",
      },
    });

    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error: `Shopify collections request failed with ${upstream.status}`,
      });
    }

    const data = await upstream.json();
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=3600");
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      error: "Unable to fetch Shopify collections",
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}
