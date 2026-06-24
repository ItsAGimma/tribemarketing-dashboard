import { NextResponse } from "next/server";
import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  try {
    const rawJson = process.env.GA4_SERVICE_ACCOUNT_JSON;
    const propertyId = process.env.GA4_PROPERTY_ID;

    if (!rawJson || !propertyId) {
      return NextResponse.json({ success: false, error: "GA4 credentials ontbreken in omgevingsvariabelen." });
    }

    const credentials = JSON.parse(rawJson);
    const client = new BetaAnalyticsDataClient({ credentials });

    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dimensions: [{ name: "pagePath" }],
      metrics: [{ name: "screenPageViews" }],
      dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
      limit: 1000,
    });

    // Views per pagePath
    const viewsPerPad: Record<string, number> = {};
    for (const row of response.rows ?? []) {
      const pad = row.dimensionValues?.[0]?.value ?? "";
      const views = parseInt(row.metricValues?.[0]?.value ?? "0", 10);
      if (pad && pad !== "(not set)") viewsPerPad[pad] = views;
    }

    // Haal artikelen op uit database
    const sb = getSupabase();
    const { data: artikelen } = await sb
      .from("affiliate_artikelen")
      .select("id, titel, url, affiliate_link_id");

    // Haal klikdata op per link (voor clicks per artikel via referrer)
    const { data: kliks } = await sb
      .from("link_kliks")
      .select("affiliate_link_id, referrer");

    // Bouw clicks per artikel-URL op via referrer
    const clicksPerArtikelUrl: Record<string, number> = {};
    for (const k of kliks ?? []) {
      if (!k.referrer) continue;
      try {
        const pad = new URL(k.referrer).pathname.replace(/\/$/, "");
        clicksPerArtikelUrl[pad] = (clicksPerArtikelUrl[pad] ?? 0) + 1;
      } catch {}
    }

    // Combineer per artikel
    const gezien = new Set<string>();
    const data = (artikelen ?? [])
      .filter((a) => {
        try {
          const pad = new URL(a.url).pathname.replace(/\/$/, "");
          if (gezien.has(pad)) return false;
          gezien.add(pad);
          return true;
        } catch { return false; }
      })
      .map((a) => {
        let pad = "";
        try { pad = new URL(a.url).pathname.replace(/\/$/, ""); } catch {}
        const views = viewsPerPad[pad] ?? 0;
        const clicks = clicksPerArtikelUrl[pad] ?? 0;
        const ctr = views > 0 ? clicks / views : 0;
        return { id: a.id, titel: a.titel, url: a.url, pad, views, clicks, ctr };
      })
      .filter((a) => a.views > 0 || a.clicks > 0)
      .sort((a, b) => b.views - a.views);

    const totaalViews = data.reduce((s, a) => s + a.views, 0);
    const totaalClicks = data.reduce((s, a) => s + a.clicks, 0);

    return NextResponse.json({ success: true, data, totaalViews, totaalClicks });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
