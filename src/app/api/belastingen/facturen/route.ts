import { NextRequest, NextResponse } from "next/server";
import { getFacturen, createFactuur, updateFactuurStatus, deleteFactuur } from "@/lib/db";

export async function GET() {
  try {
    const items = await getFacturen();
    return NextResponse.json({ success: true, data: items });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.factuurnummer || !body.klant || !body.datum || !body.bedrag) {
      return NextResponse.json({ success: false, error: "Vereiste velden ontbreken" }, { status: 400 });
    }
    const id = await createFactuur({
      factuurnummer: body.factuurnummer,
      klant: body.klant,
      datum: body.datum,
      vervaldatum: body.vervaldatum,
      bedrag: parseFloat(body.bedrag),
      btw_tarief: parseFloat(body.btw_tarief || 0),
      btw_bedrag: parseFloat(body.btw_bedrag || 0),
      status: body.status || "verzonden",
      omschrijving: body.omschrijving,
    });
    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { id, status } = await req.json();
    if (!id || !status) return NextResponse.json({ success: false, error: "ID en status vereist" }, { status: 400 });
    await updateFactuurStatus(Number(id), status);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    await deleteFactuur(Number(id));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
