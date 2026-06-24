import { NextRequest, NextResponse } from "next/server";
import { getLinkByToken, logLinkKlik } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  const link = await getLinkByToken(params.token);

  if (!link) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  const referrer = req.headers.get("referer") ?? null;
  const ua = req.headers.get("user-agent") ?? "";
  const apparaat = /mobile|android|iphone|ipad/i.test(ua) ? "mobiel" : "desktop";

  logLinkKlik(link.id, referrer, apparaat);

  // Inject token als SubID zodat CJ conversies terugkoppelbaar zijn aan deze link
  let doelUrl = link.url;
  try {
    const url = new URL(link.url);
    url.searchParams.set("sid", params.token);
    doelUrl = url.toString();
  } catch {}

  return NextResponse.redirect(doelUrl, { status: 307 });
}
