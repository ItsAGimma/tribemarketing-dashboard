import { NextRequest, NextResponse } from "next/server";
import { getSetting, setSetting } from "@/lib/db";

function getOAuthUrl(appId: string, redirectUri: string) {
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "pages_show_list,pages_read_engagement,read_insights",
  });
  return `https://www.facebook.com/dialog/oauth?${params.toString()}`;
}

export async function GET() {
  try {
    const accessToken = await getSetting("facebook_access_token");
    const pageId = await getSetting("facebook_page_id");

    if (!accessToken) return NextResponse.json({ success: false, error: "niet_verbonden" });
    if (!pageId) return NextResponse.json({ success: false, error: "geen_page" });

    // Paginastatistieken ophalen
    const metricsRes = await fetch(
      `https://graph.facebook.com/v19.0/${pageId}/insights?metric=page_impressions,page_reach,page_engaged_users,page_post_engagements&period=day&since=${Math.floor(Date.now() / 1000) - 30 * 86400}&access_token=${accessToken}`,
      { signal: AbortSignal.timeout(15000) }
    );
    const metricsData = await metricsRes.json();

    if (metricsData.error) {
      if (metricsData.error.code === 190) {
        return NextResponse.json({ success: false, error: "token_verlopen" });
      }
      return NextResponse.json({ success: false, error: metricsData.error.message });
    }

    // Laatste posts ophalen
    const postsRes = await fetch(
      `https://graph.facebook.com/v19.0/${pageId}/posts?fields=message,created_time,likes.summary(true),comments.summary(true),shares&limit=10&access_token=${accessToken}`,
      { signal: AbortSignal.timeout(15000) }
    );
    const postsData = await postsRes.json();

    // Verwerk metrics naar handige structuur
    const metrics: Record<string, number> = {};
    for (const item of metricsData.data || []) {
      const values = item.values || [];
      const totaal = values.reduce((s: number, v: { value: number }) => s + (v.value || 0), 0);
      metrics[item.name] = totaal;
    }

    const posts = (postsData.data || []).map((p: {
      message?: string;
      created_time: string;
      likes?: { summary?: { total_count: number } };
      comments?: { summary?: { total_count: number } };
      shares?: { count: number };
    }) => ({
      bericht: p.message?.slice(0, 80) || "Geen tekst",
      datum: p.created_time,
      likes: p.likes?.summary?.total_count || 0,
      reacties: p.comments?.summary?.total_count || 0,
      delingen: p.shares?.count || 0,
    }));

    return NextResponse.json({ success: true, data: { metrics, posts } });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { actie, code, redirect_uri, page_id, access_token } = await req.json();

    // Haal de pagina's op met het access token (geen App ID/Secret nodig)
    if (actie === "lijst_paginas") {
      const token = access_token || await getSetting("facebook_access_token");
      if (!token) {
        return NextResponse.json({ success: false, error: "Vul eerst je access token in." });
      }
      const res = await fetch(
        `https://graph.facebook.com/v19.0/me/accounts?fields=id,name&access_token=${token}`,
        { signal: AbortSignal.timeout(15000) }
      );
      const data = await res.json();
      if (data.error) {
        return NextResponse.json({ success: false, error: data.error.message });
      }
      const paginas = (data.data || []).map((p: { id: string; name: string }) => ({ id: p.id, name: p.name }));
      return NextResponse.json({ success: true, data: { paginas } });
    }

    if (actie === "set_page" && page_id) {
      await setSetting("facebook_page_id", page_id);
      return NextResponse.json({ success: true });
    }

    const appId = await getSetting("facebook_app_id");
    const appSecret = await getSetting("facebook_app_secret");

    if (!appId || !appSecret) {
      return NextResponse.json({ success: false, error: "Stel eerst Facebook credentials in via de Instellingenpagina." });
    }

    if (actie === "oauth_url") {
      const url = getOAuthUrl(appId, redirect_uri || "http://localhost:3000/analytics");
      return NextResponse.json({ success: true, data: { url } });
    }

    if (actie === "exchange_code" && code) {
      // Wissel code in voor access token
      const tokenRes = await fetch(
        `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirect_uri || "http://localhost:3000/analytics")}&client_secret=${appSecret}&code=${code}`
      );
      const tokenData = await tokenRes.json();

      if (!tokenData.access_token) {
        return NextResponse.json({ success: false, error: tokenData.error?.message || "Token uitwisseling mislukt" });
      }

      // Wissel in voor langdurig token (60 dagen)
      const longRes = await fetch(
        `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${tokenData.access_token}`
      );
      const longData = await longRes.json();
      await setSetting("facebook_access_token", longData.access_token || tokenData.access_token);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: "Onbekende actie" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
