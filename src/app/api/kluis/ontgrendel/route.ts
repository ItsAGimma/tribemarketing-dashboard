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

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ success: false, error: "Niet ingelogd" }, { status: 401 });

  const masterKey = process.env.KLUIS_MASTER_KEY;
  if (!masterKey) return NextResponse.json({ success: false, error: "Configuratiefout" }, { status: 500 });

  const { pin } = await req.json();
  if (!pin) return NextResponse.json({ success: false, error: "Pincode vereist" }, { status: 400 });

  const sb = getSupabase();
  const { data } = await sb.from("kluis_instellingen").select("pin_hash, pin_salt").eq("user_id", userId).maybeSingle();
  if (!data) return NextResponse.json({ success: false, error: "Geen kluis gevonden" }, { status: 404 });

  const hash = crypto.pbkdf2Sync(pin, data.pin_salt, 100000, 32, "sha256").toString("base64");

  if (hash !== data.pin_hash) return NextResponse.json({ success: false, error: "Verkeerde pincode" }, { status: 401 });

  return NextResponse.json({ success: true, masterKey });
}
