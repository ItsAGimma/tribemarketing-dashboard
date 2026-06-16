import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET() {
  try {
    const sb = getSupabase();
    const huidigeMaand = new Date().toISOString().slice(0, 7); // "2026-06"
    const vorige = new Date();
    vorige.setMonth(vorige.getMonth() - 1);
    const vorigeMaand = vorige.toISOString().slice(0, 7);

    // Transacties ophalen en in JS aggregeren
    const { data: transData } = await sb.from("transacties").select("datum, type, bedrag, omschrijving, categorie");
    const trans = (transData ?? []) as { datum: string; type: string; bedrag: number; omschrijving: string | null; categorie: string }[];

    const dezeMaand = trans.filter((t) => (t.datum || "").startsWith(huidigeMaand));
    const inkomsten = dezeMaand.filter((t) => t.type === "inkomsten").reduce((s, t) => s + t.bedrag, 0);
    const uitgaven = dezeMaand.filter((t) => t.type === "uitgaven").reduce((s, t) => s + t.bedrag, 0);

    const vorigeInkomsten = trans
      .filter((t) => (t.datum || "").startsWith(vorigeMaand) && t.type === "inkomsten")
      .reduce((s, t) => s + t.bedrag, 0);

    // Content kalender stats
    const { data: contentData } = await sb.from("content_kalender").select("titel, status, publicatiedatum, categorie");
    const content = (contentData ?? []) as { titel: string; status: string; publicatiedatum: string | null; categorie: string | null }[];

    const gepubliceerd = content.filter((c) => c.status === "gepubliceerd").length;
    const gepland = content.filter((c) => c.status === "gepland").length;
    const concept = content.filter((c) => c.status === "concept").length;

    const vandaag = new Date().toISOString().slice(0, 10);
    const aankomend = content
      .filter((c) => c.status === "gepland" && c.publicatiedatum && c.publicatiedatum >= vandaag)
      .sort((a, b) => (a.publicatiedatum || "").localeCompare(b.publicatiedatum || ""))
      .slice(0, 4)
      .map((c) => ({ titel: c.titel, publicatiedatum: c.publicatiedatum, categorie: c.categorie }));

    // Affiliate links
    const { count: aantalAffiliate } = await sb.from("affiliate_links").select("*", { count: "exact", head: true });

    // Zoekwoorden
    const { count: aantalZoekwoorden } = await sb.from("zoekwoorden").select("*", { count: "exact", head: true });

    // Recente transacties
    const recenteTransacties = [...trans]
      .sort((a, b) => (b.datum || "").localeCompare(a.datum || ""))
      .slice(0, 5);

    return NextResponse.json({
      success: true,
      data: {
        financien: { inkomsten, uitgaven, vorigeInkomsten },
        content: { gepubliceerd, gepland, concept, aankomend },
        affiliate: { aantalLinks: aantalAffiliate ?? 0 },
        zoekwoorden: { aantal: aantalZoekwoorden ?? 0 },
        recenteTransacties,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
