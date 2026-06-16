import { NextRequest, NextResponse } from "next/server";
import { getOnttrekkingen, createOnttrekking, deleteOnttrekking } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const jaar = searchParams.get("jaar") ? Number(searchParams.get("jaar")) : undefined;
    const items = await getOnttrekkingen(jaar);
    return NextResponse.json({ success: true, data: items });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.datum || !body.vennoot || !body.bedrag) {
      return NextResponse.json({ success: false, error: "Vereiste velden ontbreken" }, { status: 400 });
    }
    const id = await createOnttrekking({ ...body, bedrag: parseFloat(body.bedrag) });
    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    await deleteOnttrekking(Number(id));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
