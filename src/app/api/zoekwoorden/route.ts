import { NextRequest, NextResponse } from "next/server";
import { getZoekwoorden, saveZoekwoord, deleteZoekwoord, getSetting } from "@/lib/db";
import Anthropic from "@anthropic-ai/sdk";

export async function GET() {
  try {
    const items = await getZoekwoorden();
    return NextResponse.json({ success: true, data: items });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { zoekwoord, actie, id, suggesties: meegestuurde } = await req.json();

    if (actie === "verwijder" && id) {
      await deleteZoekwoord(Number(id));
      return NextResponse.json({ success: true });
    }

    if (!zoekwoord) return NextResponse.json({ success: false, error: "Zoekwoord ontbreekt" }, { status: 400 });

    // Google Autocomplete
    const encoded = encodeURIComponent(zoekwoord);
    const res = await fetch(
      `https://suggestqueries.google.com/complete/search?client=firefox&q=${encoded}&hl=nl`,
      { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(10000) }
    );
    const json = await res.json();
    const suggesties: string[] = Array.isArray(json[1]) ? json[1].slice(0, 20) : [];

    if (actie === "opslaan") {
      const insertId = await saveZoekwoord(zoekwoord, meegestuurde ?? suggesties);
      return NextResponse.json({ success: true, data: { id: insertId, zoekwoord, suggesties: meegestuurde ?? suggesties } });
    }

    // Claude AI analyse (optioneel — alleen als API key aanwezig is)
    let claudeAnalyse: { zoekintentie: string; contentIdee: string; moeilijkheid: string; tips: string[] } | null = null;
    const claudeApiKey = process.env.ANTHROPIC_API_KEY || await getSetting("claude_api_key");
    if (claudeApiKey && suggesties.length > 0) {
      try {
        const client = new Anthropic({ apiKey: claudeApiKey });
        const message = await client.messages.create({
          model: "claude-opus-4-8",
          max_tokens: 600,
          messages: [
            {
              role: "user",
              content: `Je bent een SEO-expert voor een travel blog (TravelTribe.life). Analyseer het zoekwoord "${zoekwoord}" en de bijbehorende Google suggesties:

${suggesties.join(", ")}

Geef een korte analyse in JSON met exact deze velden:
{
  "zoekintentie": "informatief / commercieel / navigationeel / transactioneel — leg kort uit",
  "contentIdee": "één concrete blogtitel voor dit zoekwoord",
  "moeilijkheid": "laag / middel / hoog — met korte reden",
  "tips": ["tip 1", "tip 2", "tip 3"]
}

Antwoord alleen met de JSON, geen extra tekst.`,
            },
          ],
        });

        const tekst = message.content[0].type === "text" ? message.content[0].text.trim() : "";
        const cleanTekst = tekst.replace(/^```json\s*/, "").replace(/\s*```$/, "");
        claudeAnalyse = JSON.parse(cleanTekst);
      } catch (err) {
        console.error("Claude fout:", err);
        return NextResponse.json({ success: true, data: { zoekwoord, suggesties, claudeAnalyse: null, claudeFout: String(err) } });
      }
    }

    return NextResponse.json({ success: true, data: { zoekwoord, suggesties, claudeAnalyse } });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
