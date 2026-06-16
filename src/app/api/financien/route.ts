import { NextRequest, NextResponse } from "next/server";
import { getTransacties, createTransactie, deleteTransactie, getMaandoverzicht } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    if (searchParams.get("overzicht") === "1") {
      const data = await getMaandoverzicht();
      return NextResponse.json({ success: true, data });
    }
    const items = await getTransacties();
    return NextResponse.json({ success: true, data: items });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.datum || !body.bedrag || !body.type || !body.categorie) {
      return NextResponse.json({ success: false, error: "Vereiste velden ontbreken" }, { status: 400 });
    }
    const id = await createTransactie({
      datum: body.datum,
      bedrag: parseFloat(body.bedrag),
      type: body.type,
      categorie: body.categorie,
      omschrijving: body.omschrijving,
      rekening: body.rekening,
      aftrekbaar: !!body.aftrekbaar,
    });
    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ success: false, error: "ID ontbreekt" }, { status: 400 });
    await deleteTransactie(Number(id));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
