import { NextResponse } from "next/server";
import { getSetting } from "@/lib/db";

export async function GET() {
  const apiKey = process.env.MAILERLITE_API_KEY || await getSetting("mailerlite_api_key");
  if (!apiKey) {
    return NextResponse.json({ success: false, error: "MAILERLITE_API_KEY niet ingesteld" });
  }

  try {
    const res = await fetch("https://connect.mailerlite.com/api/subscribers?limit=1", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(10000),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({ success: false, error: data.message || "MailerLite API fout" });
    }

    console.log("[mailerlite] raw response:", JSON.stringify(data).slice(0, 500));

    return NextResponse.json({
      success: true,
      data: {
        subscribers: data.meta?.total ?? 0,
      },
      _debug: { meta: data.meta, keys: Object.keys(data) },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) });
  }
}
