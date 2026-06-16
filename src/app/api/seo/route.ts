import { NextRequest, NextResponse } from "next/server";
import { getSetting } from "@/lib/db";

interface Check {
  naam: string;
  categorie: "Technisch" | "Content" | "Sociaal" | "Structuur";
  status: "goed" | "waarschuwing" | "fout";
  waarde?: string;
  beschrijving: string;
  tip?: string;
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ success: false, error: "URL ontbreekt" }, { status: 400 });

    let analyseUrl = url.trim();
    if (!analyseUrl.startsWith("http")) analyseUrl = "https://" + analyseUrl;

    let html = "";
    let laadtijdMs: number | undefined;
    let statusCode: number | undefined;

    try {
      const start = Date.now();
      const response = await fetch(analyseUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; TribeMarketing-SEO-Checker/1.0)" },
        signal: AbortSignal.timeout(15000),
        redirect: "follow",
      });
      laadtijdMs = Date.now() - start;
      statusCode = response.status;
      html = await response.text();
    } catch {
      return NextResponse.json({ success: false, error: "URL kon niet worden opgehaald. Controleer de URL en probeer opnieuw." }, { status: 400 });
    }

    const checks: Check[] = [];

    // ─── TECHNISCH ────────────────────────────────────────────────

    // HTTP statuscode
    checks.push({
      naam: "HTTP Statuscode",
      categorie: "Technisch",
      status: statusCode === 200 ? "goed" : statusCode && statusCode < 400 ? "waarschuwing" : "fout",
      waarde: String(statusCode),
      beschrijving: statusCode === 200 ? "Pagina reageert correct met statuscode 200." : `Pagina reageert met statuscode ${statusCode}.`,
      tip: statusCode !== 200 ? "Zorg dat de pagina een 200 OK-statuscode retourneert. Redirect-ketens vertragen de laadtijd en kunnen indexering schaden." : undefined,
    });

    // HTTPS
    checks.push({
      naam: "HTTPS",
      categorie: "Technisch",
      status: analyseUrl.startsWith("https://") ? "goed" : "fout",
      waarde: analyseUrl.startsWith("https://") ? "Beveiligd" : "Niet beveiligd",
      beschrijving: analyseUrl.startsWith("https://") ? "De pagina gebruikt HTTPS." : "De pagina gebruikt geen HTTPS.",
      tip: !analyseUrl.startsWith("https://") ? "Installeer een SSL-certificaat (gratis via Let's Encrypt). Zonder HTTPS geeft Google een lagere ranking en zien bezoekers een beveiligingswaarschuwing." : undefined,
    });

    // URL-lengte en structuur
    const urlPath = new URL(analyseUrl).pathname;
    const urlLen = analyseUrl.length;
    const heeftDynamischeParams = analyseUrl.includes("?") && analyseUrl.includes("=");
    const urlStatus = urlLen > 115 ? "waarschuwing" : heeftDynamischeParams ? "waarschuwing" : "goed";
    checks.push({
      naam: "URL-structuur",
      categorie: "Technisch",
      status: urlStatus,
      waarde: `${urlLen} tekens${heeftDynamischeParams ? " · bevat query-parameters" : ""}`,
      beschrijving: urlLen > 115 ? "URL is lang — Google knipt URLs boven ~115 tekens af in zoekresultaten." : heeftDynamischeParams ? "URL bevat dynamische parameters die moeilijk leesbaar zijn voor zoekmachines." : "URL heeft een goede, leesbare structuur.",
      tip: urlStatus !== "goed" ? `Gebruik korte, beschrijvende slugs zoals /blog/thailand-tips in plaats van /page?id=123&cat=travel. Huidige pad: ${urlPath}` : undefined,
    });

    // Viewport (mobiel)
    const hasViewport = /<meta[^>]+name=["']viewport["'][^>]+>/i.test(html);
    checks.push({
      naam: "Viewport (mobiel)",
      categorie: "Technisch",
      status: hasViewport ? "goed" : "fout",
      waarde: hasViewport ? "Aanwezig" : "Ontbreekt",
      beschrijving: hasViewport ? "Viewport meta-tag aanwezig — pagina is mobielvriendelijk geconfigureerd." : "Geen viewport meta-tag gevonden.",
      tip: !hasViewport ? 'Voeg toe aan je <head>: <meta name="viewport" content="width=device-width, initial-scale=1">. Zonder dit geeft Google een lagere mobiele ranking.' : undefined,
    });

    // HTML lang-attribuut
    const langMatch = html.match(/<html[^>]+lang=["']([^"']*)["']/i);
    const lang = langMatch?.[1] || "";
    checks.push({
      naam: "HTML taalattribuut",
      categorie: "Technisch",
      status: lang ? "goed" : "waarschuwing",
      waarde: lang || "Ontbreekt",
      beschrijving: lang ? `Taal ingesteld op "${lang}".` : "Geen lang-attribuut gevonden op het <html>-element.",
      tip: !lang ? 'Voeg lang="nl" (of de juiste taalcode) toe aan je <html>-tag. Dit helpt zoekmachines de taal bepalen en screenreaders correct voor te lezen.' : undefined,
    });

    // Meta robots
    const robotsMatch = html.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']*)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']robots["']/i);
    const robotsContent = robotsMatch?.[1]?.toLowerCase() || "";
    const isNoindex = robotsContent.includes("noindex");
    checks.push({
      naam: "Meta robots",
      categorie: "Technisch",
      status: isNoindex ? "fout" : "goed",
      waarde: robotsContent || "Geen meta robots (standaard: index, follow)",
      beschrijving: isNoindex ? "⚠️ Pagina staat ingesteld op NOINDEX — zoekmachines slaan deze pagina over!" : "Pagina is indexeerbaar.",
      tip: isNoindex ? 'Verwijder de noindex-instelling als je wilt dat Google deze pagina indexeert. Controleer ook je robots.txt.' : undefined,
    });

    // Canonical
    const canonicalMatch = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i)
      || html.match(/<link[^>]+href=["']([^"']*)["'][^>]+rel=["']canonical["']/i);
    checks.push({
      naam: "Canonical tag",
      categorie: "Technisch",
      status: canonicalMatch ? "goed" : "waarschuwing",
      waarde: canonicalMatch ? canonicalMatch[1] : "Ontbreekt",
      beschrijving: canonicalMatch ? "Canonical tag aanwezig." : "Geen canonical tag gevonden.",
      tip: !canonicalMatch ? "Voeg een canonical tag toe om duplicate content te voorkomen: <link rel=\"canonical\" href=\"https://jouwsite.nl/pagina\">. Zonder canonical kun je een SEO-boete krijgen als dezelfde content op meerdere URLs staat." : undefined,
    });

    // Favicon
    const hasFavicon = /<link[^>]+rel=["'][^"']*icon[^"']*["']/i.test(html);
    checks.push({
      naam: "Favicon",
      categorie: "Technisch",
      status: hasFavicon ? "goed" : "waarschuwing",
      waarde: hasFavicon ? "Aanwezig" : "Ontbreekt",
      beschrijving: hasFavicon ? "Favicon aanwezig." : "Geen favicon gevonden.",
      tip: !hasFavicon ? "Voeg een favicon toe via <link rel=\"icon\" href=\"/favicon.ico\">. Een favicon verhoogt de herkenbaarheid in browser-tabbladen en bladwijzers." : undefined,
    });

    // Laadtijd
    const apiKey = await getSetting("pagespeed_api_key");
    let pagespeedScore: number | undefined;
    let pagespeedFcp: number | undefined;

    if (apiKey) {
      try {
        const psUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(analyseUrl)}&key=${apiKey}&strategy=mobile`;
        const psRes = await fetch(psUrl, { signal: AbortSignal.timeout(20000) });
        const psData = await psRes.json();
        pagespeedFcp = psData?.lighthouseResult?.audits?.["first-contentful-paint"]?.numericValue;
        pagespeedScore = psData?.lighthouseResult?.categories?.performance?.score
          ? Math.round(psData.lighthouseResult.categories.performance.score * 100)
          : undefined;
      } catch { /* stil falen */ }
    }

    const lt = pagespeedFcp ?? laadtijdMs;
    const ltSec = lt ? lt / 1000 : undefined;
    checks.push({
      naam: "Laadtijd",
      categorie: "Technisch",
      status: ltSec === undefined ? "waarschuwing" : ltSec <= 2 ? "goed" : ltSec <= 4 ? "waarschuwing" : "fout",
      waarde: ltSec !== undefined
        ? `${ltSec.toFixed(2)}s${pagespeedFcp ? " (FCP)" : " (serverrespons)"}${pagespeedScore !== undefined ? ` · PageSpeed score: ${pagespeedScore}/100` : ""}`
        : "Onbekend",
      beschrijving: ltSec === undefined
        ? "Laadtijd kon niet worden gemeten."
        : ltSec <= 2 ? "Snelle laadtijd." : ltSec <= 4 ? "Matige laadtijd." : "Trage laadtijd — dit schaadt ranking en conversie.",
      tip: ltSec && ltSec > 2
        ? "Optimaliseer afbeeldingen (gebruik WebP), schakel browser-caching in, gebruik een CDN en minimaliseer JavaScript. Elke seconde vertraging kost gemiddeld 7% conversie."
        : !apiKey ? "Voeg een Google PageSpeed API key toe in Instellingen voor een uitgebreide laadtijdanalyse met Lighthouse score." : undefined,
    });

    // ─── CONTENT ──────────────────────────────────────────────────

    // Title tag
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const title = titleMatch?.[1]?.trim() || "";
    const titleLen = title.length;
    checks.push({
      naam: "Title tag",
      categorie: "Content",
      status: !title ? "fout" : titleLen >= 30 && titleLen <= 60 ? "goed" : "waarschuwing",
      waarde: title ? `"${title}" (${titleLen} tekens)` : "Ontbreekt",
      beschrijving: !title ? "Geen title tag gevonden." : titleLen < 30 ? "Title is te kort." : titleLen > 60 ? "Title wordt afgeknipt in Google." : "Title heeft een goede lengte.",
      tip: !title
        ? "Voeg een unieke, beschrijvende title toe aan elke pagina. Dit is het meest invloedrijke on-page SEO-element."
        : titleLen < 30
        ? `Je title "${title}" is te kort. Voeg het hoofdzoekwoord toe en beschrijf de pagina beter. Streef naar 50–60 tekens.`
        : titleLen > 60
        ? `Je title is ${titleLen} tekens lang. Schrap overbodige woorden — Google toont maximaal ~60 tekens.`
        : undefined,
    });

    // Meta description
    const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i);
    const desc = descMatch?.[1]?.trim() || "";
    const descLen = desc.length;
    checks.push({
      naam: "Meta description",
      categorie: "Content",
      status: !desc ? "fout" : descLen >= 120 && descLen <= 160 ? "goed" : "waarschuwing",
      waarde: desc ? `"${desc.slice(0, 80)}${desc.length > 80 ? "…" : ""}" (${descLen} tekens)` : "Ontbreekt",
      beschrijving: !desc ? "Geen meta description gevonden." : descLen < 120 ? "Meta description is te kort." : descLen > 160 ? "Meta description wordt afgeknipt." : "Meta description heeft een goede lengte.",
      tip: !desc
        ? "Schrijf een pakkende meta description van 120–160 tekens. Hoewel Google het niet altijd gebruikt, verhoogt een goede description de click-through rate."
        : descLen < 120
        ? "Breid de meta description uit. Voeg een call-to-action toe zoals 'Lees meer →' of 'Bekijk alle tips'."
        : descLen > 160
        ? `De description is ${descLen} tekens. Google knipt alles na ~160 tekens af. Schrap de minst belangrijke woorden.`
        : undefined,
    });

    // Woordenaantal
    const tekst = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const wordCount = tekst.split(" ").filter(w => w.length > 1).length;
    checks.push({
      naam: "Woordenaantal",
      categorie: "Content",
      status: wordCount >= 800 ? "goed" : wordCount >= 400 ? "waarschuwing" : "fout",
      waarde: `${wordCount} woorden`,
      beschrijving: wordCount < 400 ? "Zeer weinig inhoud." : wordCount < 800 ? "Matige hoeveelheid inhoud." : "Goede hoeveelheid inhoud.",
      tip: wordCount < 800
        ? `Je pagina heeft ${wordCount} woorden. Pagina's met 1000+ woorden scoren gemiddeld hoger in Google. Voeg meer diepgaande informatie, FAQ's of praktische tips toe.`
        : undefined,
    });

    // Afbeeldingen zonder alt
    const imgMatches = html.match(/<img[^>]*/gi) || [];
    const totaalAfbeeldingen = imgMatches.length;
    const zondeAlt = imgMatches.filter(img => !img.match(/alt=["'][^"']+["']/i)).length;
    checks.push({
      naam: "Alt-teksten",
      categorie: "Content",
      status: zondeAlt === 0 ? "goed" : zondeAlt <= 2 ? "waarschuwing" : "fout",
      waarde: totaalAfbeeldingen === 0 ? "Geen afbeeldingen" : `${totaalAfbeeldingen - zondeAlt}/${totaalAfbeeldingen} afbeeldingen hebben alt-tekst`,
      beschrijving: zondeAlt === 0 ? "Alle afbeeldingen hebben een alt-tekst." : `${zondeAlt} afbeelding${zondeAlt > 1 ? "en missen" : " mist"} een alt-tekst.`,
      tip: zondeAlt > 0
        ? `Voeg beschrijvende alt-teksten toe aan alle afbeeldingen. Gebruik het zoekwoord waar relevant, maar wees beschrijvend: alt="Strandvakantie Thailand Koh Samui" is beter dan alt="foto1".`
        : undefined,
    });

    // Links
    const alleLinks = html.match(/<a[^>]+href=["']([^"']*)["']/gi) || [];
    const baseHost = new URL(analyseUrl).hostname;
    const internLinks = alleLinks.filter(l => {
      const hrefMatch = l.match(/href=["']([^"']*)/i);
      const href = hrefMatch?.[1] || "";
      return href.startsWith("/") || href.includes(baseHost);
    }).length;
    const externLinks = alleLinks.length - internLinks;
    checks.push({
      naam: "Links",
      categorie: "Content",
      status: internLinks >= 3 ? "goed" : internLinks >= 1 ? "waarschuwing" : "fout",
      waarde: `${internLinks} intern · ${externLinks} extern`,
      beschrijving: internLinks === 0 ? "Geen interne links gevonden." : `${internLinks} interne en ${externLinks} externe links.`,
      tip: internLinks < 3
        ? "Voeg meer interne links toe naar gerelateerde pagina's op je site. Dit verdeelt SEO-waarde, helpt bezoekers navigeren en verbetert de crawlbaarheid."
        : externLinks > 20
        ? "Je hebt veel externe links. Overweeg niet-relevante externe links te verwijderen of rel=\"nofollow\" toe te voegen."
        : undefined,
    });

    // ─── STRUCTUUR ────────────────────────────────────────────────

    // H1
    const h1Matches = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/gi) || [];
    const h1Count = h1Matches.length;
    const h1Tekst = h1Matches[0]?.replace(/<[^>]+>/g, "").trim().slice(0, 60) || "";
    checks.push({
      naam: "H1-kop",
      categorie: "Structuur",
      status: h1Count === 1 ? "goed" : h1Count === 0 ? "fout" : "waarschuwing",
      waarde: h1Count === 0 ? "Geen H1 gevonden" : `${h1Count}× · "${h1Tekst}${h1Tekst.length >= 60 ? "…" : ""}"`,
      beschrijving: h1Count === 0 ? "Geen H1-kop gevonden." : h1Count > 1 ? `${h1Count} H1-koppen — gebruik er precies één.` : "Één H1-kop aanwezig.",
      tip: h1Count === 0
        ? "Voeg één H1-kop toe die het hoofdonderwerp van de pagina beschrijft. Dit is na de title tag het belangrijkste SEO-element. Zet er je zoekwoord in."
        : h1Count > 1
        ? `Je hebt ${h1Count} H1-koppen. Kies er één als hoofdkop en maak de rest H2. Zoekmachines verwachten één H1 per pagina.`
        : undefined,
    });

    // H2/H3 structuur en hiërarchie
    const h2Count = (html.match(/<h2[^>]*>/gi) || []).length;
    const h3Count = (html.match(/<h3[^>]*>/gi) || []).length;
    const h4Count = (html.match(/<h4[^>]*>/gi) || []).length;
    const skipH2 = h3Count > 0 && h2Count === 0;
    checks.push({
      naam: "Koppenstructuur",
      categorie: "Structuur",
      status: h2Count >= 2 && !skipH2 ? "goed" : h2Count >= 1 ? "waarschuwing" : "fout",
      waarde: `H1:${h1Count} · H2:${h2Count} · H3:${h3Count}${h4Count > 0 ? ` · H4:${h4Count}` : ""}`,
      beschrijving: skipH2
        ? "H3-koppen zonder H2 — de hiërarchie klopt niet."
        : h2Count === 0
        ? "Geen H2-koppen gevonden."
        : h2Count < 2
        ? "Weinig H2-koppen — meer structuur helpt leesbaarheid en SEO."
        : "Goede koppenstructuur.",
      tip: h2Count === 0
        ? "Deel de pagina op in secties met H2-koppen. Dit maakt de tekst scanbaar voor bezoekers en helpt Google de structuur begrijpen."
        : skipH2
        ? "Gebruik koppen in de juiste volgorde: H1 → H2 → H3. Je hebt H3-koppen zonder H2."
        : h2Count < 2
        ? "Voeg meer H2-tussenkoppen toe. Een goede vuistregel: gebruik een H2 voor elke 200–300 woorden tekst."
        : undefined,
    });

    // ─── SOCIAAL ──────────────────────────────────────────────────

    // Open Graph
    const ogTitle = /<meta[^>]+property=["']og:title["'][^>]+>/i.test(html);
    const ogDesc = /<meta[^>]+property=["']og:description["'][^>]+>/i.test(html);
    const ogImage = /<meta[^>]+property=["']og:image["'][^>]+>/i.test(html);
    const ogUrl = /<meta[^>]+property=["']og:url["'][^>]+>/i.test(html);
    const ogCount = [ogTitle, ogDesc, ogImage, ogUrl].filter(Boolean).length;
    checks.push({
      naam: "Open Graph",
      categorie: "Sociaal",
      status: ogCount === 4 ? "goed" : ogCount >= 2 ? "waarschuwing" : "fout",
      waarde: `${ogCount}/4 · title:${ogTitle ? "✓" : "✗"} description:${ogDesc ? "✓" : "✗"} image:${ogImage ? "✓" : "✗"} url:${ogUrl ? "✓" : "✗"}`,
      beschrijving: ogCount === 4 ? "Alle Open Graph tags aanwezig." : ogCount === 0 ? "Geen Open Graph tags gevonden." : `Slechts ${ogCount}/4 Open Graph tags.`,
      tip: ogCount < 4
        ? `Voeg de ontbrekende OG-tags toe: ${!ogTitle ? "og:title, " : ""}${!ogDesc ? "og:description, " : ""}${!ogImage ? "og:image (min. 1200×630px), " : ""}${!ogUrl ? "og:url" : ""}. Dit bepaalt hoe je pagina eruitziet als hij gedeeld wordt op Facebook, WhatsApp en LinkedIn.`
        : undefined,
    });

    // Twitter Cards
    const twitterCard = /<meta[^>]+name=["']twitter:card["'][^>]+>/i.test(html);
    const twitterTitle = /<meta[^>]+name=["']twitter:title["'][^>]+>/i.test(html);
    const twitterImage = /<meta[^>]+name=["']twitter:image["'][^>]+>/i.test(html);
    const twitterCount = [twitterCard, twitterTitle, twitterImage].filter(Boolean).length;
    checks.push({
      naam: "Twitter/X Cards",
      categorie: "Sociaal",
      status: twitterCount === 3 ? "goed" : twitterCount >= 1 ? "waarschuwing" : "fout",
      waarde: twitterCount === 0 ? "Ontbreekt" : `${twitterCount}/3 aanwezig`,
      beschrijving: twitterCount === 3 ? "Twitter Card tags aanwezig." : twitterCount === 0 ? "Geen Twitter Card tags." : `${twitterCount}/3 Twitter Card tags.`,
      tip: twitterCount < 3
        ? 'Voeg Twitter Card tags toe voor een betere weergave op X/Twitter: <meta name="twitter:card" content="summary_large_image">, twitter:title en twitter:image. OG-tags worden door Twitter gebruikt als fallback, maar eigen tags geven meer controle.'
        : undefined,
    });

    // Structured data (JSON-LD)
    const jsonLdMatches = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
    const schemaTypes: string[] = [];
    for (const match of jsonLdMatches) {
      const typeMatch = match.match(/"@type"\s*:\s*"([^"]+)"/g) || [];
      typeMatch.forEach(t => {
        const type = t.match(/"([^"]+)"$/)?.[1];
        if (type) schemaTypes.push(type);
      });
    }
    checks.push({
      naam: "Structured Data",
      categorie: "Sociaal",
      status: jsonLdMatches.length > 0 ? "goed" : "waarschuwing",
      waarde: jsonLdMatches.length === 0 ? "Geen JSON-LD gevonden" : `${jsonLdMatches.length} blok${jsonLdMatches.length > 1 ? "ken" : ""} · ${schemaTypes.join(", ") || "type onbekend"}`,
      beschrijving: jsonLdMatches.length > 0 ? `Structured data aanwezig (${schemaTypes.join(", ") || "JSON-LD"}).` : "Geen structured data (JSON-LD / Schema.org) gevonden.",
      tip: jsonLdMatches.length === 0
        ? "Voeg JSON-LD structured data toe voor rich results in Google. Voor een reiswebsite zijn handig: Article, BreadcrumbList, FAQPage, TouristDestination of Review. Gebruik schema.org als referentie."
        : undefined,
    });

    const goedCount = checks.filter(c => c.status === "goed").length;
    const score = Math.round((goedCount / checks.length) * 100);

    return NextResponse.json({ success: true, data: { url: analyseUrl, score, checks } });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
