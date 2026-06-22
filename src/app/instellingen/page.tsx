"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { logActie } from "@/lib/audit";

const secties = [
  {
    titel: "Claude AI",
    beschrijving: "Vereist voor AI-analyse in het zoekwoordenonderzoek.",
    velden: [
      { sleutel: "claude_api_key", label: "API Key", placeholder: "sk-ant-...", type: "password", link: "https://console.anthropic.com/settings/keys", linkLabel: "Aanmaken via Anthropic Console" },
    ],
  },
  {
    titel: "MailerLite",
    beschrijving: "Toont het aantal subscribers op het dashboard.",
    velden: [
      { sleutel: "mailerlite_api_key", label: "API Key", placeholder: "eyJ...", type: "password", link: "https://app.mailerlite.com/integrations/api", linkLabel: "Aanmaken via MailerLite" },
    ],
  },
  {
    titel: "Google PageSpeed",
    beschrijving: "Vereist voor laadtijdmeting in de SEO Checker. Gratis aan te maken.",
    velden: [
      { sleutel: "pagespeed_api_key", label: "API Key", placeholder: "AIza...", link: "https://developers.google.com/speed/docs/insights/v5/get-started", linkLabel: "Aanmaken via Google" },
    ],
  },
  {
    titel: "Pinterest",
    beschrijving: "OAuth app voor Pinterest Analytics. Redirect URI: http://localhost:3000/analytics?state=pinterest",
    velden: [
      { sleutel: "pinterest_client_id", label: "Client ID", placeholder: "1234567", link: "https://developers.pinterest.com/", linkLabel: "Pinterest Developers" },
      { sleutel: "pinterest_client_secret", label: "Client Secret", placeholder: "••••••••", type: "password", link: "https://developers.pinterest.com/", linkLabel: "Pinterest Developers" },
    ],
  },
  {
    titel: "Facebook / Meta",
    beschrijving: "Graph API voor Facebook en Instagram statistieken.",
    velden: [
      { sleutel: "facebook_access_token", label: "Access Token", placeholder: "EAAB...", type: "password", link: "https://developers.facebook.com/tools/explorer/", linkLabel: "Graph API Explorer" },
      { sleutel: "facebook_page_id", label: "Page ID", placeholder: "1234567890", link: "https://developers.facebook.com/tools/explorer/", linkLabel: "Graph API Explorer", zoeker: true },
      { sleutel: "facebook_app_id", label: "App ID (optioneel)", placeholder: "1234567890", link: "https://developers.facebook.com/", linkLabel: "Facebook Developers" },
      { sleutel: "facebook_app_secret", label: "App Secret (optioneel)", placeholder: "••••••••", type: "password", link: "https://developers.facebook.com/", linkLabel: "Facebook Developers" },
    ],
  },
  {
    titel: "CJ Affiliate",
    beschrijving: "Commissiedata ophalen via de CJ GraphQL API.",
    velden: [
      { sleutel: "cj_api_token", label: "Personal Access Token", placeholder: "••••••••", type: "password", link: "https://developers.cj.com/account/personal-access-tokens", linkLabel: "Aanmaken via CJ Developer Portal" },
      { sleutel: "cj_publisher_cid", label: "Publisher CID", placeholder: "1234567", link: "https://members.cj.com/member/publisher/home.do", linkLabel: "Vinden in je CJ account" },
    ],
  },
  {
    titel: "TikTok",
    beschrijving: "TikTok for Developers app. Redirect URI: http://localhost:3000/analytics?state=tiktok",
    velden: [
      { sleutel: "tiktok_client_key", label: "Client Key", placeholder: "aw1234...", link: "https://developers.tiktok.com/", linkLabel: "TikTok Developers" },
      { sleutel: "tiktok_client_secret", label: "Client Secret", placeholder: "••••••••", type: "password", link: "https://developers.tiktok.com/", linkLabel: "TikTok Developers" },
    ],
  },
];

export default function InstellingenPage() {
  const [waarden, setWaarden] = useState<Record<string, string>>({});
  const [opslaan, setOpslaan] = useState(false);
  const [melding, setMelding] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/instellingen").then((r) => r.json()).then((d) => setWaarden(d.data || {}));
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
      if (data.success) {
        await logActie("bewerkt", "instellingen", "settings", "Instellingen bijgewerkt");
        setMelding("Instellingen opgeslagen!");
      } else {
        setMelding("Er ging iets mis.");
      }
    } catch {
      setMelding("Verbindingsfout.");
    } finally {
      setOpslaan(false);
      setTimeout(() => setMelding(null), 4000);
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="page-title mb-1">Instellingen</h1>
        <p className="text-sm text-gray-500">API sleutels en credentials worden veilig opgeslagen in de database.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {secties.map((sectie) => (
          <div key={sectie.titel} className="card space-y-4">
            <div className="pb-3 border-b border-gray-100">
              <h2 className="font-semibold text-[#0f172a] text-sm">{sectie.titel}</h2>
              <p className="text-xs text-gray-400 mt-0.5">{sectie.beschrijving}</p>
            </div>
            {sectie.velden.map((veld) => (
              <div key={veld.sleutel}>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="label mb-0">{veld.label}</label>
                  <a href={veld.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] text-brand-500 hover:underline">
                    {veld.linkLabel} <ExternalLink size={10} />
                  </a>
                </div>
                <input
                  type={veld.type || "text"}
                  className="input"
                  placeholder={veld.placeholder}
                  value={waarden[veld.sleutel] || ""}
                  onChange={(e) => setWaarden((prev) => ({ ...prev, [veld.sleutel]: e.target.value }))}
                />
                {"zoeker" in veld && veld.zoeker && (
                  <FacebookPaginaZoeker
                    token={waarden["facebook_access_token"] || ""}
                    onKies={(id) => setWaarden((prev) => ({ ...prev, facebook_page_id: id }))}
                  />
                )}
              </div>
            ))}
          </div>
        ))}

        {melding && (
          <div className="px-4 py-3 rounded-xl bg-green-50 border border-green-200 text-sm text-green-700">
            {melding}
          </div>
        )}

        <button type="submit" disabled={opslaan} className="btn-primary w-full">
          {opslaan ? "Opslaan..." : "Instellingen opslaan"}
        </button>
      </form>

      <div className="border-t border-gray-100 pt-6">
        <a
          href="/instellingen/audit-log"
          className="flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200 bg-white hover:border-brand-300 transition-colors"
        >
          <div>
            <p className="text-sm font-medium text-[#0f172a]">Audit log</p>
            <p className="text-xs text-gray-400 mt-0.5">Bekijk alle wijzigingen: wie heeft wat toegevoegd, bewerkt of verwijderd</p>
          </div>
          <span className="text-gray-400 text-sm">→</span>
        </a>
      </div>
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
    <div className="mt-2">
      <button type="button" onClick={zoek} disabled={laden} className="btn-secondary text-xs py-1.5 px-3">
        {laden ? "Zoeken..." : "Zoek mijn pagina's automatisch"}
      </button>
      {fout && <p className="text-xs text-red-500 mt-2">{fout}</p>}
      {paginas && paginas.length === 0 && <p className="text-xs text-gray-400 mt-2">Geen pagina&apos;s gevonden.</p>}
      {paginas && paginas.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {paginas.map((p) => (
            <button key={p.id} type="button" onClick={() => onKies(p.id)} className="flex items-center justify-between w-full text-left px-3 py-2 rounded-lg border border-gray-200 hover:border-brand-300 hover:bg-brand-50 transition-colors">
              <span className="text-sm font-medium text-[#0f172a]">{p.name}</span>
              <span className="text-xs text-gray-400">ID: {p.id}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
