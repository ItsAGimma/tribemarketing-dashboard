import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET() {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("taken")
    .select("*")
    .order("voltooid", { ascending: true })
    .order("aangemaakt_op", { ascending: false });
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, data: data ?? [] });
}

export async function POST(req: NextRequest) {
  const { titel } = await req.json();
  if (!titel?.trim()) return NextResponse.json({ success: false, error: "Titel vereist" }, { status: 400 });
  const sb = getSupabase();
  const { data, error } = await sb.from("taken").insert({ titel: titel.trim() }).select().single();
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, data });
}

export async function PATCH(req: NextRequest) {
  const { id, voltooid } = await req.json();
  const sb = getSupabase();
  const { error } = await sb.from("taken").update({ voltooid }).eq("id", id);
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  const sb = getSupabase();
  const { error } = await sb.from("taken").delete().eq("id", id);
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
