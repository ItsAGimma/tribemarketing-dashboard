import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET() {
  const sb = getSupabase();
  const { data } = await sb.from("kluis_instellingen").select("*").limit(1).maybeSingle();
  return NextResponse.json({ success: true, data });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { pin_salt, encrypted_master_key, master_key_iv, recovery_salt, recovery_encrypted_master_key, recovery_iv } = body;
  if (!pin_salt || !encrypted_master_key || !master_key_iv || !recovery_salt || !recovery_encrypted_master_key || !recovery_iv) {
    return NextResponse.json({ success: false, error: "Verplichte velden ontbreken" }, { status: 400 });
  }
  const sb = getSupabase();
  const { error } = await sb.from("kluis_instellingen").insert({
    pin_salt, encrypted_master_key, master_key_iv, recovery_salt, recovery_encrypted_master_key, recovery_iv,
  });
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { id, pin_salt, encrypted_master_key, master_key_iv } = body;
  if (!id || !pin_salt || !encrypted_master_key || !master_key_iv) {
    return NextResponse.json({ success: false, error: "Verplichte velden ontbreken" }, { status: 400 });
  }
  const sb = getSupabase();
  const { error } = await sb.from("kluis_instellingen").update({ pin_salt, encrypted_master_key, master_key_iv }).eq("id", id);
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
