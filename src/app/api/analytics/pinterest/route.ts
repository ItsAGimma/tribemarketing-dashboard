import { NextRequest, NextResponse } from "next/server";
import { getSetting, setSetting } from "@/lib/db";

export async function GET() {
  try {
    const accessToken = await getSetting("pinterest_access_token");
    if (!accessToken) {
      return NextResponse.json({ success: false, error: "niet_verbonden" });
    }

    // Haal top pins op
    const res = await fetch("https://api.pinterest.com/v5/pins?page_size=25", {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(15000),
    });

    if (res.status === 401) {
      return NextResponse.json({ success: false, error: "token_verlopen" });
    }

    const data = await res.json();
    const pins = (data.items || []).map((pin: { id: string; title?: string; description?: string; link?: string }) => ({
      id: pin.id,
      titel: pin.title || pin.description?.slice(0, 60) || "Naamloos",
      link: pin.link || "",
    }));

    return NextResponse.json({ success: true, data: { pins } });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { actie, code, redirect_uri } = await req.json();
    const clientId = await getSetting("pinterest_client_id");
    const clientSecret = await getSetting("pinterest_client_secret");

    if (!clientId || !clientSecret) {
      return NextResponse.json({ success: false, error: "Stel eerst Pinterest credentials in via de Instellingenpagina." });
    }

    if (actie === "oauth_url") {
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirect_uri || "http://localhost:3000/analytics",
        response_type: "code",
        scope: "pins:read,user_accounts:read",
      });
      const url = `https://www.pinterest.com/oauth/?${params.toString()}`;
      return NextResponse.json({ success: true, data: { url } });
    }

    if (actie === "exchange_code" && code) {
      const tokenRes = await fetch("https://api.pinterest.com/v5/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirect_uri || "http://localhost:3000/analytics",
        }),
      });
      const tokenData = await tokenRes.json();
      if (tokenData.access_token) {
        await setSetting("pinterest_access_token", tokenData.access_token);
        return NextResponse.json({ success: true });
      }
      return NextResponse.json({ success: false, error: tokenData.message || "Token uitwisseling mislukt" });
    }

    return NextResponse.json({ success: false, error: "Onbekende actie" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
