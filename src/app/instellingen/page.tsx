"use client";

import { useEffect, useState } from "react";

const secties = [
  {
    titel: "Claude AI",
    velden: [
      {
        sleutel: "claude_api_key",
        label: "Claude API Key",
        placeholder: "sk-ant-...",
        type: "password",
        beschrijving: "Vereist voor AI-analyse bij zoekwoordenonderzoek (zoekintentie, content ideeën, SEO tips). Gebruik je bestaande Anthropic account.",
        link: "https://console.anthropic.com/settings/keys",
      },
    ],
  },
  {
    titel: "SEO",
    velden: [
      {
        sleutel: "pagespeed_api_key",
        label: "Google PageSpeed Insights API Key",
        placeholder: "AIza...",
        beschrijving: "Vereist voor de SEO Checker (laadtijdmeting). Gratis aan te maken.",
        link: "https://developers.google.com/speed/docs/insights/v5/get-started",
      },
    ],
  },
  {
    titel: "Pinterest",
    velden: [
      {
        sleutel: "pinterest_client_id",
        label: "Pinterest Client ID",
        placeholder: "1234567",
        beschrijving: "Pinterest API v5 OAuth app. Redirect URI instellen: http://localhost:3000/analytics?state=pinterest",
        link: "https://developers.pinterest.com/",
      },
      {
        sleutel: "pinterest_client_secret",
        label: "Pinterest Client Secret",
        placeholder: "••••••••",
        type: "password",
        beschrijving: "Pinterest API v5 OAuth secret.",
        link: "https://developers.pinterest.com/",
      },
    ],
  },
  {
    titel: "Facebook / Meta",
    velden: [
      {
        sleutel: "facebook_access_token",
        label: "Meta Graph API Access Token",
        placeholder: "EAAB...",
        type: "password",
        beschrijving: "Plak hier direct je access token (begint met EAAB). Hiermee sla je de OAuth-stap over.",
        link: "https://developers.facebook.com/tools/explorer/",
      },
      {
        sleutel: "facebook_page_id",
        label: "Facebook Page ID",
        placeholder: "1234567890",
        beschrijving: "Het ID van je pagina. Vind je via Graph API Explorer met de query 'me/accounts', of op je pagina onder Info → Pagina-ID.",
        link: "https://developers.facebook.com/tools/explorer/",
      },
      {
        sleutel: "facebook_app_id",
        label: "Facebook App ID (optioneel)",
        placeholder: "1234567890",
        beschrijving: "Alleen nodig als je de OAuth-flow wilt gebruiken i.p.v. een access token.",
        link: "https://developers.facebook.com/",
      },
      {
        sleutel: "facebook_app_secret",
        label: "Facebook App Secret (optioneel)",
        placeholder: "••••••••",
        type: "password",
        beschrijving: "Alleen nodig voor de OAuth-flow (App Dashboard → Instellingen → Basis).",
        link: "https://developers.facebook.com/",
      },
    ],
  },
  {
    titel: "TikTok",
    velden: [
      {
        sleutel: "tiktok_client_key",
        label: "TikTok Client Key",
        placeholder: "aw1234...",
        beschrijving: "TikTok for Developers app. Redirect URI: http://localhost:3000/analytics?state=tiktok",
        link: "https://developers.tiktok.com/",
      },
      {
        sleutel: "tiktok_client_secret",
        label: "TikTok Client Secret",
        placeholder: "••••••••",
        type: "password",
        beschrijving: "TikTok app secret.",
        link: "https://developers.tiktok.com/",
      },
    ],
  },
];

export default function InstellingenPage() {
  const [waarden, setWaarden] = useState<Record<string, string>>({});
  const [opslaan, setOpslaan] = useState(false);
  const [melding, setMelding] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/instellingen")
      .then((r) => r.json())
      .then((d) => setWaarden(d.data || {}));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setOpslaan(true);
    try {
      const res = await fetch("/api/instellingen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(waarden),
      });
      const data = await res.json();
      setMelding(data.success ? "✅ Instellingen opgeslagen!" : "❌ Er ging iets mis.");
    } catch {
      setMelding("❌ Verbindingsfout.");
    } finally {
      setOpslaan(false);
      setTimeout(() => setMelding(null), 4000);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="page-title">Instellingen</h1>
      <p className="text-gray-500 mb-8 -mt-2">
        Sla hier je API sleutels en credentials op. Ze worden veilig in de lokale database bewaard.
      </p>

      <form onSubmit={handleSubmit} className="space-y-8">
        {secties.map((sectie) => (
          <div key={sectie.titel}>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
              {sectie.titel}
            </h2>
            <div className="space-y-4">
              {sectie.velden.map((veld) => (
                <div key={veld.sleutel} className="card">
                  <label className="label">{veld.label}</label>
                  <input
                    type={veld.type || "text"}
                    className="input"
                    placeholder={veld.placeholder}
                    value={waarden[veld.sleutel] || ""}
                    onChange={(e) => setWaarden((prev) => ({ ...prev, [veld.sleutel]: e.target.value }))}
                  />
                  <p className="text-xs text-gray-400 mt-1.5">
                    {veld.beschrijving} —{" "}
                    <a href={veld.link} target="_blank" rel="noopener noreferrer" className="text-brand-500 hover:underline">
                      Aanmaken
                    </a>
                  </p>
                  {veld.sleutel === "facebook_page_id" && (
                    <FacebookPaginaZoeker
                      token={waarden["facebook_access_token"] || ""}
                      onKies={(id) => setWaarden((prev) => ({ ...prev, facebook_page_id: id }))}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {melding && (
          <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">
            {melding}
          </div>
        )}

        <button type="submit" disabled={opslaan} className="btn-primary w-full">
          {opslaan ? "Opslaan..." : "Instellingen opslaan"}
        </button>
      </form>
    </div>
  );
}

function FacebookPaginaZoeker({ token, onKies }: { token: string; onKies: (id: string) => void }) {
  const [laden, setLaden] = useState(false);
  const [paginas, setPaginas] = useState<{ id: string; name: string }[] | null>(null);
  const [fout, setFout] = useState<string | null>(null);

  async function zoek() {
    setLaden(true);
    setFout(null);
    setPaginas(null);
    try {
      const res = await fetch("/api/analytics/facebook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actie: "lijst_paginas", access_token: token || undefined }),
      });
      const data = await res.json();
      if (data.success) setPaginas(data.data.paginas);
      else setFout(data.error);
    } catch {
      setFout("Verbindingsfout");
    } finally {
      setLaden(false);
    }
  }

  return (
    <div className="mt-3">
      <button type="button" onClick={zoek} disabled={laden} className="btn-secondary text-xs py-1.5 px-3">
        {laden ? "Zoeken..." : "🔎 Zoek mijn pagina's automatisch"}
      </button>

      {fout && <p className="text-xs text-red-500 mt-2">{fout}</p>}

      {paginas && paginas.length === 0 && (
        <p className="text-xs text-gray-400 mt-2">Geen pagina&apos;s gevonden voor dit token.</p>
      )}

      {paginas && paginas.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {paginas.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onKies(p.id)}
              className="flex items-center justify-between w-full text-left px-3 py-2 rounded-lg border border-hairline hover:border-brand-300 hover:bg-brand-50 transition-colors"
            >
              <span className="text-sm font-medium text-ink">{p.name}</span>
              <span className="text-xs text-muted">ID: {p.id}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
