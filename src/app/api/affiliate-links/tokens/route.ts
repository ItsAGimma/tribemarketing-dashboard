import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function generateToken(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export async function POST() {
  try {
    const sb = getSupabase();
    const { data: links } = await sb.from("affiliate_links").select("id, token").is("token", null);

    for (const link of links ?? []) {
      let token = generateToken();
      let unique = false;
      while (!unique) {
        const { data: existing } = await sb.from("affiliate_links").select("id").eq("token", token).maybeSingle();
        if (!existing) unique = true;
        else token = generateToken();
      }
      await sb.from("affiliate_links").update({ token }).eq("id", link.id);
    }

    return NextResponse.json({ success: true, bijgewerkt: (links ?? []).length });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
