import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET() {
  const sb = getSupabase();
  const { data, error } = await sb.from("kluis_wachtwoorden").select("*").order("naam");
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, data });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { naam, url, encrypted_wachtwoord, wachtwoord_iv, encrypted_gebruikersnaam, gebruikersnaam_iv, encrypted_notities, notities_iv } = body;
  if (!naam || !encrypted_wachtwoord || !wachtwoord_iv) {
    return NextResponse.json({ success: false, error: "naam en wachtwoord zijn verplicht" }, { status: 400 });
  }
  const sb = getSupabase();
  const { data, error } = await sb.from("kluis_wachtwoorden").insert({
    naam, url: url || null,
    encrypted_wachtwoord, wachtwoord_iv,
    encrypted_gebruikersnaam: encrypted_gebruikersnaam || null, gebruikersnaam_iv: gebruikersnaam_iv || null,
    encrypted_notities: encrypted_notities || null, notities_iv: notities_iv || null,
  }).select("id").single();
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, id: data.id });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, ...fields } = body;
  if (!id) return NextResponse.json({ success: false, error: "id ontbreekt" }, { status: 400 });
  const sb = getSupabase();
  const { error } = await sb.from("kluis_wachtwoorden").update(fields).eq("id", id);
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ success: false, error: "id ontbreekt" }, { status: 400 });
  const sb = getSupabase();
  const { error } = await sb.from("kluis_wachtwoorden").delete().eq("id", id);
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
