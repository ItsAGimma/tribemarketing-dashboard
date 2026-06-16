import { NextRequest, NextResponse } from "next/server";
import { getSetting, setSetting } from "@/lib/db";
import { getSupabase } from "@/lib/supabase";

// Kwartaal BTW-overzicht op basis van facturen
async function getBtwPerKwartaal(jaar: number) {
  const sb = getSupabase();
  const { data } = await sb
    .from("facturen")
    .select("datum, bedrag, btw_tarief, btw_bedrag, status");
  const facturen = ((data ?? []) as { datum: string; bedrag: number; btw_tarief: number; btw_bedrag: number; status: string }[])
    .filter((f) => (f.datum || "").startsWith(String(jaar)));

  const kwartalen: Record<number, { omzet: number; btw_te_betalen: number; details: { tarief: number; omzet: number; btw: number }[] }> = {
    1: { omzet: 0, btw_te_betalen: 0, details: [] },
    2: { omzet: 0, btw_te_betalen: 0, details: [] },
    3: { omzet: 0, btw_te_betalen: 0, details: [] },
    4: { omzet: 0, btw_te_betalen: 0, details: [] },
  };

  for (const f of facturen) {
    const maand = parseInt(f.datum.slice(5, 7));
    const kwartaal = Math.ceil(maand / 3) as 1 | 2 | 3 | 4;
    kwartalen[kwartaal].omzet += f.bedrag;
    kwartalen[kwartaal].btw_te_betalen += f.btw_bedrag;

    const bestaand = kwartalen[kwartaal].details.find(d => d.tarief === f.btw_tarief);
    if (bestaand) {
      bestaand.omzet += f.bedrag;
      bestaand.btw += f.btw_bedrag;
    } else {
      kwartalen[kwartaal].details.push({ tarief: f.btw_tarief, omzet: f.bedrag, btw: f.btw_bedrag });
    }
  }

  return Object.entries(kwartalen).map(([k, v]) => ({
    kwartaal: Number(k),
    label: `Q${k} ${jaar}`,
    ...v,
    details: v.details.sort((a, b) => b.tarief - a.tarief),
  }));
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const jaar = Number(searchParams.get("jaar") || new Date().getFullYear());
    const btwStatus = await getSetting("btw_status") || "plichtig";
    const kwartalen = btwStatus === "kor" ? [] : await getBtwPerKwartaal(jaar);
    return NextResponse.json({ success: true, data: { btwStatus, kwartalen } });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { btw_status } = await req.json();
    if (btw_status) await setSetting("btw_status", btw_status);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
