import { NextRequest, NextResponse } from "next/server";
import { getContentItems, createContentItem, updateContentItem, deleteContentItem } from "@/lib/db";

export async function GET() {
  try {
    const items = await getContentItems();
    return NextResponse.json({ success: true, data: items });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const id = await createContentItem({
      titel: body.titel,
      status: body.status || "idee",
      publicatiedatum: body.publicatiedatum,
      categorie: body.categorie,
    });
    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.id) return NextResponse.json({ success: false, error: "ID ontbreekt" }, { status: 400 });
    await updateContentItem(Number(body.id), body);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ success: false, error: "ID ontbreekt" }, { status: 400 });
    await deleteContentItem(Number(id));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
