import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET() {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("affiliate_platforms")
    .select("*")
    .order("naam", { ascending: true });
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, data: data ?? [] });
}

export async function POST(req: NextRequest) {
  const { naam, url, commissie_percentage } = await req.json();
  if (!naam?.trim()) return NextResponse.json({ success: false, error: "Naam vereist" }, { status: 400 });
  const sb = getSupabase();
  const { data, error } = await sb
    .from("affiliate_platforms")
    .insert({ naam: naam.trim(), url: url || null, commissie_percentage: commissie_percentage || null })
    .select()
    .single();
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, data });
}

export async function PATCH(req: NextRequest) {
  const { id, actief } = await req.json();
  const sb = getSupabase();
  const { error } = await sb.from("affiliate_platforms").update({ actief }).eq("id", id);
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  const sb = getSupabase();
  const { error } = await sb.from("affiliate_platforms").delete().eq("id", id);
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
