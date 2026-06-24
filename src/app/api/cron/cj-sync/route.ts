import { NextRequest, NextResponse } from "next/server";
import { getSetting, saveCjCommissies } from "@/lib/db";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CJ_ENDPOINT = "https://commissions.api.cj.com/query";

export async function GET(req: NextRequest) {
  // Vercel stuurt automatisch Authorization: Bearer {CRON_SECRET} bij cron jobs
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const token = await getSetting("cj_api_token");
    const cid = await getSetting("cj_publisher_cid");

    if (!token || !cid) {
      return NextResponse.json({ success: false, error: "CJ API token of Publisher CID ontbreekt." });
    }

    // Haal alle affiliate links op zodat we token → id kunnen koppelen
    const sb = getSupabase();
    const { data: links } = await sb.from("affiliate_links").select("id, token");
    const tokenMap: Record<string, number> = {};
    for (const l of links ?? []) {
      if (l.token) tokenMap[l.token] = l.id;
    }

    // Haal commissies op van afgelopen 30 dagen
    const nu = new Date();
    const van = new Date(nu);
    van.setDate(van.getDate() - 30);
    const vanDatum = van.toISOString().replace(/\.\d{3}Z$/, "Z");
    const totDatum = nu.toISOString().replace(/\.\d{3}Z$/, "Z");

    const query = `{
      publisherCommissions(
        forPublishers: ["${cid}"]
        sincePostingDate: "${vanDatum}"
        beforePostingDate: "${totDatum}"
      ) {
        count
        records {
          commissionId
          publisherSubId
          pubCommissionAmountUsd
          advertiserName
          postingDate
          saleAmountUsd
          actionStatus
        }
      }
    }`;

    const res = await fetch(CJ_ENDPOINT, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(25000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return NextResponse.json({ success: false, error: `CJ API fout: ${res.status}`, detail: body });
    }

    const json = await res.json();
    if (json.errors) {
      return NextResponse.json({ success: false, error: json.errors[0]?.message });
    }

    const records = json.data?.publisherCommissions?.records ?? [];

    const commissies = records
      .filter((r: { actionStatus: string }) => r.actionStatus !== "extended" && r.actionStatus !== "reversed")
      .map((r: {
        commissionId: string;
        publisherSubId: string | null;
        advertiserName: string;
        pubCommissionAmountUsd: string;
        saleAmountUsd: string;
        actionStatus: string;
        postingDate: string;
      }) => ({
        commission_id: r.commissionId,
        affiliate_link_id: r.publisherSubId ? (tokenMap[r.publisherSubId] ?? null) : null,
        adverteerder: r.advertiserName || "Onbekend",
        commissie_usd: parseFloat(r.pubCommissionAmountUsd || "0"),
        omzet_usd: parseFloat(r.saleAmountUsd || "0"),
        status: r.actionStatus,
        posting_date: r.postingDate,
      }));

    await saveCjCommissies(commissies);

    const gekoppeld = commissies.filter((c: { affiliate_link_id: number | null }) => c.affiliate_link_id !== null).length;

    return NextResponse.json({
      success: true,
      totaal: commissies.length,
      gekoppeld,
      periode: { van: vanDatum, tot: totDatum },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
