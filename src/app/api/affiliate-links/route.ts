import { NextRequest, NextResponse } from "next/server";
import {
  getAffiliateLinksMetArtikelen,
  createAffiliateLink,
  updateAffiliateLink,
  deleteAffiliateLink,
  createAffiliateArtikel,
  deleteAffiliateArtikel,
} from "@/lib/db";

export async function GET() {
  try {
    const links = await getAffiliateLinksMetArtikelen();
    return NextResponse.json({ success: true, data: links });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Artikel koppelen
    if (body.action === "artikel_toevoegen") {
      if (!body.affiliate_link_id || !body.titel || !body.url) {
        return NextResponse.json({ success: false, error: "Vereiste velden ontbreken" }, { status: 400 });
      }
      const id = await createAffiliateArtikel(body);
      return NextResponse.json({ success: true, data: { id } });
    }

    // Nieuwe affiliate link
    if (!body.naam || !body.url) {
      return NextResponse.json({ success: false, error: "Naam en URL zijn verplicht" }, { status: 400 });
    }
    const id = await createAffiliateLink(body);
    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.id || !body.naam || !body.url) {
      return NextResponse.json({ success: false, error: "ID, naam en URL zijn verplicht" }, { status: 400 });
    }
    await updateAffiliateLink(Number(body.id), {
      naam: body.naam,
      url: body.url,
      platform: body.platform || null,
      categorie: body.categorie || null,
      notities: body.notities || null,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.artikel_id) {
      await deleteAffiliateArtikel(Number(body.artikel_id));
      return NextResponse.json({ success: true });
    }

    if (!body.id) return NextResponse.json({ success: false, error: "ID ontbreekt" }, { status: 400 });
    await deleteAffiliateLink(Number(body.id));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
