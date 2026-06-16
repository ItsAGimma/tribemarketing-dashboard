import { NextRequest, NextResponse } from "next/server";
import { getJaaroverzicht } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const jaar = Number(searchParams.get("jaar") || new Date().getFullYear());
    const data = await getJaaroverzicht(jaar);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
