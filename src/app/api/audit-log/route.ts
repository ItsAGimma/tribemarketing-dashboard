import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET() {
  try {
    const sb = getSupabase();
    const { data } = await sb
      .from("audit_log")
      .select("*")
      .order("aangemaakt_op", { ascending: false })
      .limit(200);
    return NextResponse.json({ success: true, data: data ?? [] });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { actie, tabel, record_id, omschrijving, door } = await req.json();
    if (!actie || !tabel) {
      return NextResponse.json({ success: false, error: "Verplichte velden ontbreken" }, { status: 400 });
    }
    const sb = getSupabase();
    await sb.from("audit_log").insert({ actie, tabel, record_id: String(record_id ?? ""), omschrijving, door });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
