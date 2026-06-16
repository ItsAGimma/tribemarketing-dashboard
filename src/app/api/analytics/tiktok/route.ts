import { NextRequest, NextResponse } from "next/server";
import { getSetting, setSetting } from "@/lib/db";

function getOAuthUrl(clientKey: string, redirectUri: string) {
  const params = new URLSearchParams({
    client_key: clientKey,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "user.info.basic,video.list",
  });
  return `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;
}

export async function GET() {
  try {
    const accessToken = await getSetting("tiktok_access_token");
    if (!accessToken) return NextResponse.json({ success: false, error: "niet_verbonden" });

    // Gebruikersinfo
    const userRes = await fetch(
      "https://open.tiktokapis.com/v2/user/info/?fields=display_name,follower_count,following_count,likes_count,video_count",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(15000),
      }
    );
    const userData = await userRes.json();

    if (userData.error?.code && userData.error.code !== "ok") {
      if (userData.error.code === "access_token_invalid") {
        return NextResponse.json({ success: false, error: "token_verlopen" });
      }
      return NextResponse.json({ success: false, error: userData.error.message });
    }

    // Video's ophalen
    const videosRes = await fetch(
      "https://open.tiktokapis.com/v2/video/list/?fields=title,cover_image_url,like_count,comment_count,share_count,view_count,create_time",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ max_count: 20 }),
        signal: AbortSignal.timeout(15000),
      }
    );
    const videosData = await videosRes.json();

    const gebruiker = userData.data?.user || {};
    const videos = (videosData.data?.videos || []).map((v: {
      title?: string;
      view_count: number;
      like_count: number;
      comment_count: number;
      share_count: number;
      create_time: number;
    }) => ({
      titel: v.title || "Geen titel",
      weergaven: v.view_count || 0,
      likes: v.like_count || 0,
      reacties: v.comment_count || 0,
      delingen: v.share_count || 0,
      datum: new Date(v.create_time * 1000).toISOString(),
    }));

    return NextResponse.json({
      success: true,
      data: {
        gebruiker: {
          naam: gebruiker.display_name,
          volgers: gebruiker.follower_count,
          volgend: gebruiker.following_count,
          likes: gebruiker.likes_count,
          videos: gebruiker.video_count,
        },
        videos,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { actie, code, redirect_uri } = await req.json();
    const clientKey = await getSetting("tiktok_client_key");
    const clientSecret = await getSetting("tiktok_client_secret");

    if (!clientKey || !clientSecret) {
      return NextResponse.json({ success: false, error: "Stel eerst TikTok credentials in via de Instellingenpagina." });
    }

    if (actie === "oauth_url") {
      const url = getOAuthUrl(clientKey, redirect_uri || "http://localhost:3000/analytics");
      return NextResponse.json({ success: true, data: { url } });
    }

    if (actie === "exchange_code" && code) {
      const tokenRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_key: clientKey,
          client_secret: clientSecret,
          code,
          grant_type: "authorization_code",
          redirect_uri: redirect_uri || "http://localhost:3000/analytics",
        }),
      });
      const tokenData = await tokenRes.json();
      if (tokenData.access_token) {
        await setSetting("tiktok_access_token", tokenData.access_token);
        if (tokenData.refresh_token) await setSetting("tiktok_refresh_token", tokenData.refresh_token);
        return NextResponse.json({ success: true });
      }
      return NextResponse.json({ success: false, error: tokenData.error_description || "Token uitwisseling mislukt" });
    }

    return NextResponse.json({ success: false, error: "Onbekende actie" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
