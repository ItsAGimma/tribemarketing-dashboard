import { NextRequest, NextResponse } from "next/server";
import { getAllSettings, setSetting } from "@/lib/db";

export async function GET() {
  try {
    const settings = await getAllSettings();
    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const keys = [
      "claude_api_key",
      "pagespeed_api_key",
      "pinterest_client_id",
      "pinterest_client_secret",
      "facebook_app_id",
      "facebook_app_secret",
      "facebook_access_token",
      "facebook_page_id",
      "tiktok_client_key",
      "tiktok_client_secret",
    ];
    for (const key of keys) {
      if (body[key] !== undefined) {
        await setSetting(key, body[key]);
      }
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
