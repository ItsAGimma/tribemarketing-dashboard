import { NextRequest, NextResponse } from "next/server";
import { getKilometers, createKilometerrit, deleteKilometerrit } from "@/lib/db";

const KM_TARIEF = 0.23;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const jaar = searchParams.get("jaar") ? Number(searchParams.get("jaar")) : undefined;
    const ritten = await getKilometers(jaar) as { datum: string; km: number }[];

    const totaalKm = ritten.reduce((s, r) => s + r.km, 0);
    const totaalAftrekbaar = totaalKm * KM_TARIEF;

    // Maandoverzicht
    const maanden: Record<string, { maand: string; km: number; aftrekbaar: number }> = {};
    for (const r of ritten) {
      const m = r.datum.slice(0, 7);
      if (!maanden[m]) maanden[m] = { maand: m, km: 0, aftrekbaar: 0 };
      maanden[m].km += r.km;
      maanden[m].aftrekbaar += r.km * KM_TARIEF;
    }

    return NextResponse.json({
      success: true,
      data: {
        ritten,
        totaalKm: Math.round(totaalKm * 10) / 10,
        totaalAftrekbaar: Math.round(totaalAftrekbaar * 100) / 100,
        maanden: Object.values(maanden).sort((a, b) => a.maand.localeCompare(b.maand)),
        tarief: KM_TARIEF,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.datum || !body.van || !body.naar || !body.km) {
      return NextResponse.json({ success: false, error: "Vereiste velden ontbreken" }, { status: 400 });
    }
    const id = await createKilometerrit({ ...body, km: parseFloat(body.km) });
    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    await deleteKilometerrit(Number(id));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
