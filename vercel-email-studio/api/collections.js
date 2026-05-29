export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const upstream = await fetch("https://camosignal.com/collections.json?limit=250", {
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
