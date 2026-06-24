import { NextResponse } from "next/server";
import { JWT } from "google-auth-library";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

async function getGa4AccessToken(credentials: { client_email: string; private_key: string }) {
  const auth = new JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
  });
  const { token } = await auth.getAccessToken();
  return token;
}

export async function GET() {
  try {
    const rawJson = process.env.GA4_SERVICE_ACCOUNT_JSON;
    const propertyId = process.env.GA4_PROPERTY_ID;

    if (!rawJson || !propertyId) {
      return NextResponse.json({ success: false, error: "GA4 credentials ontbreken in omgevingsvariabelen." });
    }

    const credentials = JSON.parse(rawJson);
    const accessToken = await getGa4AccessToken(credentials);

    const res = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dimensions: [{ name: "pagePath" }],
          metrics: [{ name: "screenPageViews" }],
          dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
          limit: 1000,
        }),
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return NextResponse.json({ success: false, error: `GA4 API fout: ${res.status}`, detail: body });
    }

    const json = await res.json();

    // Views per pagePath
    const viewsPerPad: Record<string, number> = {};
    for (const row of json.rows ?? []) {
      const pad: string = (row.dimensionValues?.[0]?.value ?? "").replace(/\/$/, "");
      const views = parseInt(row.metricValues?.[0]?.value ?? "0", 10);
      if (pad && pad !== "(not set)") viewsPerPad[pad] = views;
    }

    // Haal artikelen en klikdata op uit database
    const sb = getSupabase();
    const [{ data: artikelen }, { data: kliks }] = await Promise.all([
      sb.from("affiliate_artikelen").select("id, titel, url, affiliate_link_id"),
      sb.from("link_kliks").select("referrer"),
    ]);

    // Clicks per artikel-URL via referrer
    const clicksPerPad: Record<string, number> = {};
    for (const k of kliks ?? []) {
      if (!k.referrer) continue;
      try {
        const pad = new URL(k.referrer).pathname.replace(/\/$/, "");
        clicksPerPad[pad] = (clicksPerPad[pad] ?? 0) + 1;
      } catch {}
    }

    // Combineer per artikel (dedup op pad)
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
        const clicks = clicksPerPad[pad] ?? 0;
        return { id: a.id, titel: a.titel, url: a.url, pad, views, clicks, ctr: views > 0 ? clicks / views : 0 };
      })
      .filter((a) => a.views > 0 || a.clicks > 0)
      .sort((a, b) => b.views - a.views);

    return NextResponse.json({
      success: true,
      data,
      totaalViews: data.reduce((s, a) => s + a.views, 0),
      totaalClicks: data.reduce((s, a) => s + a.clicks, 0),
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
