import { NextRequest, NextResponse } from "next/server";
import { getZakelijkeKosten, createZakelijkeKost, deleteZakelijkeKost } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const jaar = searchParams.get("jaar") ? Number(searchParams.get("jaar")) : undefined;
    const data = await getZakelijkeKosten(jaar);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (body.actie === "importeer" && body.transactie_id) {
      const id = await createZakelijkeKost({
        datum: body.datum,
        omschrijving: body.omschrijving,
        bedrag: body.bedrag,
        categorie: body.categorie,
        transactie_id: body.transactie_id,
      });
      return NextResponse.json({ success: true, data: { id } });
    }
    if (!body.datum || !body.omschrijving || !body.bedrag || !body.categorie) {
      return NextResponse.json({ success: false, error: "Vereiste velden ontbreken" }, { status: 400 });
    }
    const id = await createZakelijkeKost(body);
    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    await deleteZakelijkeKost(Number(id));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
