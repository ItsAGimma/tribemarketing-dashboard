import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sb = getSupabase();

    const { data: links } = await sb
      .from("affiliate_links")
      .select("id, naam, platform, token")
      .order("aangemaakt_op", { ascending: false });

    const { data: kliks } = await sb
      .from("link_kliks")
      .select("affiliate_link_id, referrer, apparaat, aangemaakt_op");

    const data = (links ?? []).map((link) => {
      const linkKliks = (kliks ?? []).filter((k) => k.affiliate_link_id === link.id);
      const mobiel = linkKliks.filter((k) => k.apparaat === "mobiel").length;
      const referrers: Record<string, number> = {};
      for (const k of linkKliks) {
        if (k.referrer) {
          try {
            const slug = new URL(k.referrer).pathname.replace(/\/$/, "").split("/").pop() || k.referrer;
            referrers[slug] = (referrers[slug] ?? 0) + 1;
          } catch {
            referrers[k.referrer] = (referrers[k.referrer] ?? 0) + 1;
          }
        }
      }
      return {
        id: link.id,
        naam: link.naam,
        platform: link.platform,
        token: link.token,
        kliks: linkKliks.length,
        mobiel,
        desktop: linkKliks.length - mobiel,
        referrers,
      };
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
