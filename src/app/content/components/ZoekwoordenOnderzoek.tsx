"use client";

import { useState, useEffect } from "react";

interface ClaudeAnalyse {
  zoekintentie: string;
  contentIdee: string;
  moeilijkheid: string;
  tips: string[];
}

interface OpgeslagenZoekwoord {
  id: number;
  zoekwoord: string;
  suggesties: string;
  opgeslagen_op: string;
}

export default function ZoekwoordenOnderzoek() {
  const [invoer, setInvoer] = useState("");
  const [suggesties, setSuggesties] = useState<string[]>([]);
  const [huidigZoekwoord, setHuidigZoekwoord] = useState("");
  const [laden, setLaden] = useState(false);
  const [opgeslagen, setOpgeslagen] = useState<OpgeslagenZoekwoord[]>([]);
  const [fout, setFout] = useState<string | null>(null);
  const [claudeAnalyse, setClaudeAnalyse] = useState<ClaudeAnalyse | null>(null);

  useEffect(() => {
    laadOpgeslagen();
  }, []);

  async function laadOpgeslagen() {
    const res = await fetch("/api/zoekwoorden");
    const data = await res.json();
    if (data.success) setOpgeslagen(data.data);
  }

  async function handleZoeken(e: React.FormEvent) {
    e.preventDefault();
    setLaden(true);
    setFout(null);
    setSuggesties([]);
    setClaudeAnalyse(null);
    try {
      const res = await fetch("/api/zoekwoorden", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zoekwoord: invoer }),
      });
      const data = await res.json();
      if (data.success) {
        setSuggesties(data.data.suggesties);
        setHuidigZoekwoord(invoer);
        setClaudeAnalyse(data.data.claudeAnalyse ?? null);
      } else {
        setFout(data.error);
      }
    } catch {
      setFout("Verbindingsfout");
    } finally {
      setLaden(false);
    }
  }

  async function handleOpslaan() {
    await fetch("/api/zoekwoorden", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ zoekwoord: huidigZoekwoord, suggesties, actie: "opslaan" }),
    });
    laadOpgeslagen();
  }

  async function handleVerwijder(id: number) {
    await fetch("/api/zoekwoorden", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actie: "verwijder", id }),
    });
    setOpgeslagen((prev) => prev.filter((z) => z.id !== id));
  }

  const moeilijkheidKleur: Record<string, string> = {
    laag: "bg-green-50 text-green-700 border-green-200",
    middel: "bg-yellow-50 text-yellow-700 border-yellow-200",
    hoog: "bg-red-50 text-red-700 border-red-200",
  };

  // Groepeer suggesties op prefix
  const groepen: Record<string, string[]> = {};
  for (const s of suggesties) {
    const woorden = s.split(" ");
    const prefix = woorden.slice(0, 2).join(" ");
    if (!groepen[prefix]) groepen[prefix] = [];
    groepen[prefix].push(s);
  }

  return (
    <div className="max-w-3xl space-y-6">
      <form onSubmit={handleZoeken} className="card">
        <h2 className="section-title">Zoekwoordenonderzoek</h2>
        <div className="flex gap-3">
          <input
            type="text"
            className="input flex-1"
            placeholder="bijv. reizen thailand"
            value={invoer}
            onChange={(e) => setInvoer(e.target.value)}
            required
          />
          <button type="submit" disabled={laden} className="btn-primary">
            {laden ? "Zoeken..." : "Zoek"}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Suggesties via Google Autocomplete · AI-analyse via Claude (indien API key ingesteld)
        </p>
      </form>

      {fout && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">❌ {fout}</div>
      )}

      {claudeAnalyse && (
        <div className="card border-l-4 border-l-brand-400 space-y-4">
          <h2 className="section-title mb-0">AI-analyse voor &ldquo;{huidigZoekwoord}&rdquo;</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Zoekintentie</p>
              <p className="text-sm text-gray-700">{claudeAnalyse.zoekintentie}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Moeilijkheid</p>
              <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full border ${moeilijkheidKleur[claudeAnalyse.moeilijkheid.split(" ")[0].toLowerCase()] ?? "bg-gray-50 text-gray-600 border-gray-200"}`}>
                {claudeAnalyse.moeilijkheid}
              </span>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Content idee</p>
            <p className="text-sm font-medium text-brand-700 bg-brand-50 rounded-lg px-3 py-2">{claudeAnalyse.contentIdee}</p>
          </div>

          {claudeAnalyse.tips.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">SEO-tips</p>
              <ul className="space-y-1.5">
                {claudeAnalyse.tips.map((tip, i) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-700">
                    <span className="text-brand-500 shrink-0">→</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {suggesties.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title mb-0">
              Suggesties voor &ldquo;{huidigZoekwoord}&rdquo;
              <span className="ml-2 badge bg-brand-100 text-brand-700">{suggesties.length}</span>
            </h2>
            <button onClick={handleOpslaan} className="btn-secondary text-sm">
              💾 Opslaan
            </button>
          </div>

          <div className="space-y-4">
            {Object.entries(groepen).map(([prefix, items]) => (
              <div key={prefix}>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{prefix}</p>
                <div className="flex flex-wrap gap-2">
                  {items.map((s) => (
                    <span key={s} className="badge bg-gray-100 text-gray-700 text-sm px-3 py-1">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {opgeslagen.length > 0 && (
        <div className="card">
          <h2 className="section-title">Opgeslagen zoekwoorden</h2>
          <div className="space-y-3">
            {opgeslagen.map((item) => {
              const sug = JSON.parse(item.suggesties || "[]") as string[];
              return (
                <div key={item.id} className="border border-gray-100 rounded-lg p-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{item.zoekwoord}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {sug.length} suggesties · {new Date(item.opgeslagen_op).toLocaleDateString("nl-NL")}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {sug.slice(0, 8).map((s) => (
                          <span key={s} className="badge bg-gray-50 text-gray-600">{s}</span>
                        ))}
                        {sug.length > 8 && (
                          <span className="badge bg-gray-50 text-gray-400">+{sug.length - 8}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleVerwijder(item.id)}
                      className="text-gray-300 hover:text-red-400 text-lg ml-2"
                    >
                      ×
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
