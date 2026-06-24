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

    // Haal klikdata en artikel-titels op uit database
    const sb = getSupabase();
    const [{ data: kliks }, { data: artikelen }] = await Promise.all([
      sb.from("link_kliks").select("referrer"),
      sb.from("affiliate_artikelen").select("url, titel"),
    ]);

    // Clicks per pad via referrer
    const clicksPerPad: Record<string, number> = {};
    for (const k of kliks ?? []) {
      if (!k.referrer) continue;
      try {
        const pad = new URL(k.referrer).pathname.replace(/\/$/, "");
        clicksPerPad[pad] = (clicksPerPad[pad] ?? 0) + 1;
      } catch {}
    }

    // Titel-lookup via affiliate_artikelen
    const titelPerPad: Record<string, string> = {};
    for (const a of artikelen ?? []) {
      try {
        const pad = new URL(a.url).pathname.replace(/\/$/, "");
        if (!titelPerPad[pad]) titelPerPad[pad] = a.titel;
      } catch {}
    }

    // Gebruik GA4 als bron — toon alle pagina's met views
    const data = Object.entries(viewsPerPad)
      .map(([pad, views]) => {
        const clicks = clicksPerPad[pad] ?? 0;
        const titel = titelPerPad[pad] ?? pad;
        return { pad, titel, views, clicks, ctr: views > 0 ? clicks / views : 0 };
      })
      .filter((a) => a.views > 0)
      .sort((a, b) => b.views - a.views)
      .slice(0, 100);

    return NextResponse.json({
      success: true,
      data,
      totaalViews: data.reduce((s: number, a: { views: number }) => s + a.views, 0),
      totaalClicks: data.reduce((s: number, a: { clicks: number }) => s + a.clicks, 0),
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
