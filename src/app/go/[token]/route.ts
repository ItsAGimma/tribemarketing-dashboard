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

  return NextResponse.redirect(link.url, { status: 307 });
}
