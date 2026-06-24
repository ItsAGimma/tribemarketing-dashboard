import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { getCjCommissiesPerLink } from "@/lib/db";
import { JWT } from "google-auth-library";

async function getGa4Views(paden: string[]): Promise<number> {
  try {
    const rawJson = process.env.GA4_SERVICE_ACCOUNT_JSON;
    const propertyId = process.env.GA4_PROPERTY_ID;
    if (!rawJson || !propertyId || paden.length === 0) return 0;
    const credentials = JSON.parse(rawJson);
    const auth = new JWT({ email: credentials.client_email, key: credentials.private_key, scopes: ["https://www.googleapis.com/auth/analytics.readonly"] });
    const { token } = await auth.getAccessToken();
    const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        dimensions: [{ name: "pagePath" }],
        metrics: [{ name: "screenPageViews" }],
        dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
        dimensionFilter: { filter: { fieldName: "pagePath", inListFilter: { values: paden } } },
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return 0;
    const json = await res.json();
    return (json.rows ?? []).reduce((s: number, r: { metricValues: { value: string }[] }) => s + parseInt(r.metricValues?.[0]?.value ?? "0", 10), 0);
  } catch { return 0; }
}

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sb = getSupabase();
    const id = Number(params.id);

    const { data: link } = await sb
      .from("affiliate_links")
      .select("id, naam, platform, token, url")
      .eq("id", id)
      .single();

    if (!link) return NextResponse.json({ success: false, error: "Niet gevonden" }, { status: 404 });

    const { data: kliks } = await sb
      .from("link_kliks")
      .select("referrer, apparaat, aangemaakt_op")
      .eq("affiliate_link_id", id)
      .order("aangemaakt_op", { ascending: false });

    const lijst = kliks ?? [];

    const referrers: Record<string, { count: number; laatste: string }> = {};
    for (const k of lijst) {
      if (k.referrer) {
        let slug = k.referrer;
        try { slug = new URL(k.referrer).pathname.replace(/\/$/, "").split("/").pop() || k.referrer; } catch {}
        if (!referrers[slug]) referrers[slug] = { count: 0, laatste: k.aangemaakt_op };
        referrers[slug].count += 1;
        if (k.aangemaakt_op > referrers[slug].laatste) referrers[slug].laatste = k.aangemaakt_op;
      }
    }

    const mobiel = lijst.filter(k => k.apparaat === "mobiel").length;

    const { data: artikelen } = await sb.from("affiliate_artikelen").select("url").eq("affiliate_link_id", id);
    const artikelPaden = (artikelen ?? []).map(a => { try { return new URL(a.url).pathname.replace(/\/$/, ""); } catch { return ""; } }).filter(Boolean);

    const [cjData, views] = await Promise.all([
      getCjCommissiesPerLink(),
      getGa4Views(artikelPaden),
    ]);
    const cjLink = cjData[id] ?? { conversies: 0, commissie_usd: 0 };

    return NextResponse.json({
      success: true,
      link,
      kliks: lijst.length,
      mobiel,
      desktop: lijst.length - mobiel,
      conversies: cjLink.conversies,
      commissie_usd: cjLink.commissie_usd,
      views,
      referrers,
      recent: lijst.slice(0, 50).map(k => {
        let slug = k.referrer ?? "—";
        try { if (k.referrer) slug = new URL(k.referrer).pathname.replace(/\/$/, "").split("/").pop() || k.referrer; } catch {}
        return { tijdstip: k.aangemaakt_op, artikel: slug, apparaat: k.apparaat };
      }),
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
