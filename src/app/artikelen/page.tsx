"use client";

import { useState } from "react";

interface ArtikelRij {
  id: number;
  titel: string;
  url: string;
  views: number;
  clicks: number;
  ctr: number;
}

export default function ArtikelenPage() {
  const [data, setData] = useState<ArtikelRij[] | null>(null);
  const [fout, setFout] = useState<string | null>(null);
  const [laden, setLaden] = useState(false);

  function ophalen() {
    setLaden(true);
    setFout(null);
    fetch("/api/ga4")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setData(d.data);
        else setFout(d.error);
      })
      .catch((e) => setFout(String(e)))
      .finally(() => setLaden(false));
  }

  const totaalViews = data?.reduce((s, a) => s + a.views, 0) ?? 0;
  const totaalClicks = data?.reduce((s, a) => s + a.clicks, 0) ?? 0;
  const gemCtr = totaalViews > 0 ? (totaalClicks / totaalViews) * 100 : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="page-title mb-0">Artikelen</h1>
        <button onClick={ophalen} disabled={laden} className="btn-primary">
          {laden ? "Laden..." : data ? "Verversen" : "Ophalen"}
        </button>
      </div>

      {fout && <div className="card"><p className="text-sm text-red-500">{fout}</p></div>}

      {!data && !laden && !fout && (
        <div className="card text-center py-12">
          <p className="text-sm text-muted">Klik op Ophalen om GA4 artikeldata te laden voor de afgelopen 30 dagen.</p>
        </div>
      )}

      {laden && <div className="card"><p className="text-sm text-muted">Laden...</p></div>}

      {data && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="rounded-xl p-4" style={{ background: "var(--color-background-secondary, #f8f9fb)" }}>
              <p className="text-xs text-muted mb-1">Totale views</p>
              <p className="text-xl font-medium">{totaalViews.toLocaleString("nl-NL")}</p>
            </div>
            <div className="rounded-xl p-4" style={{ background: "var(--color-background-secondary, #f8f9fb)" }}>
              <p className="text-xs text-muted mb-1">Totale clicks</p>
              <p className="text-xl font-medium">{totaalClicks}</p>
            </div>
            <div className="rounded-xl p-4" style={{ background: "var(--color-background-secondary, #f8f9fb)" }}>
              <p className="text-xs text-muted mb-1">Gem. CTR</p>
              <p className="text-xl font-medium">{totaalViews > 0 ? `${gemCtr.toFixed(1)}%` : "—"}</p>
            </div>
          </div>

          {data.length === 0 ? (
            <div className="card">
              <p className="text-sm text-muted">Geen artikeldata gevonden. Controleer of de artikel-URLs overeenkomen met de pagepaths in GA4.</p>
            </div>
          ) : (
            <div className="card p-0 overflow-x-auto">
              <table className="w-full text-sm min-w-[480px]">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-4 text-xs font-medium text-muted">Artikel</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-muted">Views</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-muted">Clicks</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-muted">CTR</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((artikel) => (
                    <tr key={artikel.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 px-4">
                        <a href={artikel.url} target="_blank" rel="noopener noreferrer" className="font-medium text-[#0f172a] hover:text-[#185FA5] hover:underline">
                          {artikel.titel}
                        </a>
                      </td>
                      <td className="py-3 px-4 text-right text-muted">{artikel.views.toLocaleString("nl-NL")}</td>
                      <td className="py-3 px-4 text-right text-muted">{artikel.clicks}</td>
                      <td className="py-3 px-4 text-right font-medium text-[#0f172a]">
                        {artikel.views > 0 ? `${(artikel.ctr * 100).toFixed(1)}%` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
