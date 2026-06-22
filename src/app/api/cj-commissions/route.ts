import { NextResponse } from "next/server";
import { getSetting } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const CJ_ENDPOINT = "https://commissions.api.cj.com/query";

export async function GET() {
  try {
    const token = await getSetting("cj_api_token");
    const cid = await getSetting("cj_publisher_cid");

    if (!token || !cid) {
      return NextResponse.json({ success: false, error: "CJ API token of Publisher CID ontbreekt in instellingen." }, { status: 400 });
    }

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
      let body = "";
      try { body = await res.text(); } catch {}
      return NextResponse.json({ success: false, error: `CJ API fout: ${res.status}`, detail: body }, { status: 502 });
    }

    const json = await res.json();

    if (json.errors) {
      return NextResponse.json({ success: false, error: json.errors[0]?.message || "Onbekende CJ fout" }, { status: 502 });
    }

    const records = json.data?.publisherCommissions?.records ?? [];

    // Groepeer commissies per adverteerder
    const perAdverteerder: Record<string, { commissie: number; transacties: number; omzet: number }> = {};
    for (const r of records) {
      if (r.actionStatus === "extended" || r.actionStatus === "reversed") continue;
      const naam = r.advertiserName || "Onbekend";
      if (!perAdverteerder[naam]) perAdverteerder[naam] = { commissie: 0, transacties: 0, omzet: 0 };
      perAdverteerder[naam].commissie += parseFloat(r.pubCommissionAmountUsd || "0");
      perAdverteerder[naam].transacties += 1;
      perAdverteerder[naam].omzet += parseFloat(r.saleAmountUsd || "0");
    }

    return NextResponse.json({ success: true, data: perAdverteerder, totaal: records.length, periode: { van: vanDatum, tot: totDatum } });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
