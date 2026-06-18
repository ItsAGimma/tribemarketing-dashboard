import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { getSupabaseServer } from "@/lib/supabase-server";

async function getCurrentUserId(): Promise<string | null> {
  try {
    const sb = getSupabaseServer();
    const { data: { user } } = await sb.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ success: false, error: "Niet ingelogd" }, { status: 401 });

  const sb = getSupabase();

  // Eigen rij ophalen
  const { data: eigenRij } = await sb
    .from("kluis_instellingen")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  // Als geen eigen rij: kijk of er al een kluis bestaat (andere gebruiker of oude rij zonder user_id)
  let bestaandeKluis = null;
  if (!eigenRij) {
    const { data: bestaand } = await sb
      .from("kluis_instellingen")
      .select("*")
      .limit(1)
      .maybeSingle();
    bestaandeKluis = bestaand;
  }

  return NextResponse.json({ success: true, data: eigenRij, bestaandeKluis });
}

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ success: false, error: "Niet ingelogd" }, { status: 401 });

  const body = await req.json();
  const { pin_salt, encrypted_master_key, master_key_iv, recovery_salt, recovery_encrypted_master_key, recovery_iv } = body;
  if (!pin_salt || !encrypted_master_key || !master_key_iv || !recovery_salt || !recovery_encrypted_master_key || !recovery_iv) {
    return NextResponse.json({ success: false, error: "Verplichte velden ontbreken" }, { status: 400 });
  }

  const sb = getSupabase();
  const { data, error } = await sb.from("kluis_instellingen").insert({
    user_id: userId,
    pin_salt, encrypted_master_key, master_key_iv,
    recovery_salt, recovery_encrypted_master_key, recovery_iv,
  }).select("id").single();

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, id: data.id });
}

export async function PUT(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ success: false, error: "Niet ingelogd" }, { status: 401 });

  const body = await req.json();
  const { pin_salt, encrypted_master_key, master_key_iv } = body;
  if (!pin_salt || !encrypted_master_key || !master_key_iv) {
    return NextResponse.json({ success: false, error: "Verplichte velden ontbreken" }, { status: 400 });
  }

  const sb = getSupabase();
  const { error } = await sb
    .from("kluis_instellingen")
    .update({ pin_salt, encrypted_master_key, master_key_iv })
    .eq("user_id", userId);

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
