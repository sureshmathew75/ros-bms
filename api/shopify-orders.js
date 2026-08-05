// /api/shopify-orders.js
// Vercel serverless function — Shopify credentials live only here, as
// server-side environment variables, never sent to the browser.
//
// Called by the "Import from Shopify" button in ros-bms. Returns paid
// orders in a simplified shape ready to preview/import as sales.
//
// Shopify's 2026 Dev Dashboard apps don't hand out a static access token —
// instead we exchange a Client ID + Client Secret for a short-lived token
// on each request (the "client credentials grant"). Required Vercel
// environment variables (set in Project Settings, not in code or git):
//   SHOPIFY_STORE_DOMAIN     e.g. "your-store" (just the subdomain, no .myshopify.com)
//   SHOPIFY_CLIENT_ID        from the app's Settings tab in the Dev Dashboard
//   SHOPIFY_CLIENT_SECRET    from the same place — keep this secret

const SHOPIFY_API_VERSION = "2026-01";

async function getAccessToken(shopDomain, clientId, clientSecret) {
  const res = await fetch(`https://${shopDomain}.myshopify.com/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token request failed (${res.status}): ${text}`);
  }
  const data = await res.json();
  return data.access_token;
}

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const shopDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;

  if (!shopDomain || !clientId || !clientSecret) {
    res.status(500).json({ error: "Shopify credentials are not configured on the server yet." });
    return;
  }

  // Optional: only fetch orders created in the last N days (defaults to 30)
  const days = Math.min(Math.max(parseInt(req.query.days, 10) || 30, 1), 90);
  const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  try {
    const accessToken = await getAccessToken(shopDomain, clientId, clientSecret);

    const url =
      `https://${shopDomain}.myshopify.com/admin/api/${SHOPIFY_API_VERSION}/orders.json` +
      `?financial_status=paid&status=any&limit=250&created_at_min=${encodeURIComponent(sinceDate)}`;

    const shopifyRes = await fetch(url, {
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
    });

    if (!shopifyRes.ok) {
      const text = await shopifyRes.text();
      res.status(shopifyRes.status).json({ error: `Shopify API error: ${text}` });
      return;
    }

    const data = await shopifyRes.json();
    const orders = (data.orders || []).map((o) => {
      const addr = o.shipping_address || o.billing_address || {};
      const addressParts = [addr.address1, addr.address2, addr.city, addr.province, addr.zip, addr.country]
        .filter(Boolean);
      const items = (o.line_items || []).map((li) => ({
        name: li.name || li.title || "Item",
        qty: li.quantity || 1,
        price: parseFloat(li.price) || 0,
      }));
      return {
        shopifyOrderId: String(o.id),
        orderNumber: o.name || "",
        date: (o.created_at || "").slice(0, 10),
        customer: [o.customer?.first_name, o.customer?.last_name].filter(Boolean).join(" ") || addr.name || "Shopify Customer",
        phone: o.customer?.phone || addr.phone || "",
        address: addressParts.join(", "),
        items,
        amount: parseFloat(o.total_price) || 0,
        currency: o.currency || "GBP",
      };
    });

    res.status(200).json({ orders });
  } catch (err) {
    res.status(500).json({ error: `Failed to fetch Shopify orders: ${err.message}` });
  }
};
