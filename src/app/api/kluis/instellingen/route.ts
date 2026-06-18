import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { getSupabaseServer } from "@/lib/supabase-server";
import crypto from "crypto";

async function getCurrentUserId(): Promise<string | null> {
  try {
    const sb = getSupabaseServer();
    const { data: { user } } = await sb.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

function hashPin(pin: string, salt: string): string {
  return crypto.pbkdf2Sync(pin, salt, 100000, 32, "sha256").toString("base64");
}

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ success: false, error: "Niet ingelogd" }, { status: 401 });

  const sb = getSupabase();
  const { data } = await sb.from("kluis_instellingen").select("id").eq("user_id", userId).maybeSingle();

  return NextResponse.json({ success: true, hasSetup: !!data });
}

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ success: false, error: "Niet ingelogd" }, { status: 401 });

  const { pin } = await req.json();
  if (!pin || pin.length < 6) return NextResponse.json({ success: false, error: "Pincode te kort" }, { status: 400 });

  const salt = crypto.randomBytes(32).toString("base64");
  const pin_hash = hashPin(pin, salt);

  const sb = getSupabase();
  const { error } = await sb.from("kluis_instellingen").upsert({ user_id: userId, pin_hash, pin_salt: salt }, { onConflict: "user_id" });
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

export async function PUT(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ success: false, error: "Niet ingelogd" }, { status: 401 });

  const { pin } = await req.json();
  if (!pin || pin.length < 6) return NextResponse.json({ success: false, error: "Pincode te kort" }, { status: 400 });

  const salt = crypto.randomBytes(32).toString("base64");
  const pin_hash = hashPin(pin, salt);

  const sb = getSupabase();
  const { error } = await sb.from("kluis_instellingen").update({ pin_hash, pin_salt: salt }).eq("user_id", userId);
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
