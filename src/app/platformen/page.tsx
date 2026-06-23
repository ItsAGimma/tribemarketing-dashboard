"use client";

import React, { useState, useEffect } from "react";
import { Globe, Link2, TrendingUp, DollarSign } from "lucide-react";
import Tabs from "@/components/Tabs";
import AffiliatePlatforms from "@/app/content/components/AffiliatePlatforms";
import AffiliateLinkManager from "@/app/content/components/AffiliateLinkManager";

const tabs = [
  { id: "platforms", label: "Platformen", icon: Globe },
  { id: "links", label: "Links", icon: Link2 },
  { id: "prestaties", label: "Prestaties", icon: TrendingUp },
  { id: "commissies", label: "Commissies", icon: DollarSign },
];

export default function AffiliatePage() {
  const [actieveTab, setActieveTab] = useState("platforms");
  const [cjData, setCjData] = useState<Record<string, { commissie: number; transacties: number; omzet: number }> | null>(null);
  const [cjPeriode, setCjPeriode] = useState<{ van: string; tot: string } | null>(null);
  const [cjFout, setCjFout] = useState<string | null>(null);
  const [klikData, setKlikData] = useState<{ id: number; naam: string; platform: string | null; token: string | null; kliks: number; mobiel: number; desktop: number; referrers: Record<string, number> }[] | null>(null);
  const [uitgeklapt, setUitgeklapt] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/cj-commissions").then(r => r.json()).then(d => {
      if (d.success) { setCjData(d.data); setCjPeriode(d.periode); }
      else setCjFout(d.detail ? `${d.error} — ${d.detail}` : (d.error || "Onbekende fout"));
    }).catch((e) => setCjFout(`Kan CJ data niet ophalen: ${e}`));

    fetch("/api/link-kliks").then(r => r.json()).then(d => {
      if (d.success) setKlikData(d.data);
    });
  }, []);

  return (
    <div>
      <h1 className="page-title">Affiliate</h1>
      <Tabs tabs={tabs} active={actieveTab} onChange={setActieveTab} className="mb-8" />

      {actieveTab === "platforms" && <AffiliatePlatforms />}
      {actieveTab === "links" && <AffiliateLinkManager />}

      {actieveTab === "prestaties" && (
        <div className="space-y-4">
          {!klikData ? (
            <div className="card"><p className="text-sm text-muted">Laden...</p></div>
          ) : klikData.every(l => l.kliks === 0) ? (
            <div className="card"><p className="text-sm text-muted">Nog geen klikdata beschikbaar. Gebruik de redirect links in je artikelen om kliks bij te houden.</p></div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl p-4" style={{ background: "var(--color-background-secondary, #f8f9fb)" }}>
                  <p className="text-xs text-muted mb-1">Totaal kliks</p>
                  <p className="text-xl font-medium">{klikData.reduce((s, l) => s + l.kliks, 0)}</p>
                </div>
                <div className="rounded-xl p-4" style={{ background: "var(--color-background-secondary, #f8f9fb)" }}>
                  <p className="text-xs text-muted mb-1">Mobiel</p>
                  <p className="text-xl font-medium">{klikData.reduce((s, l) => s + l.kliks, 0) > 0 ? Math.round(klikData.reduce((s, l) => s + l.mobiel, 0) / klikData.reduce((s, l) => s + l.kliks, 0) * 100) : 0}%</p>
                </div>
                <div className="rounded-xl p-4" style={{ background: "var(--color-background-secondary, #f8f9fb)" }}>
                  <p className="text-xs text-muted mb-1">Actieve links</p>
                  <p className="text-xl font-medium">{klikData.filter(l => l.kliks > 0).length}</p>
                </div>
              </div>

              <div className="card p-0 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted">Link</th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-muted">Kliks</th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-muted">Mobiel</th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-muted">Desktop</th>
                      <th className="py-3 px-4 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {klikData.filter(l => l.kliks > 0).sort((a, b) => b.kliks - a.kliks).map((link) => (
                      <React.Fragment key={link.id}>
                        <tr
                          className="border-b border-gray-50 cursor-pointer hover:bg-gray-50/50 transition-colors"
                          onClick={() => setUitgeklapt(uitgeklapt === link.id ? null : link.id)}
                        >
                          <td className="py-3 px-4">
                            <p className="font-medium text-[#0f172a]">{link.naam}</p>
                            {link.platform && <p className="text-xs text-muted">{link.platform}</p>}
                          </td>
                          <td className="py-3 px-4 text-right font-medium">{link.kliks}</td>
                          <td className="py-3 px-4 text-right text-muted">{Math.round(link.mobiel / link.kliks * 100)}%</td>
                          <td className="py-3 px-4 text-right text-muted">{Math.round(link.desktop / link.kliks * 100)}%</td>
                          <td className="py-3 px-4 text-center text-gray-300">{uitgeklapt === link.id ? "▲" : "▼"}</td>
                        </tr>
                        {uitgeklapt === link.id && (
                          <tr className="bg-gray-50/50">
                            <td colSpan={5} className="px-4 py-3">
                              {Object.keys(link.referrers).length === 0 ? (
                                <p className="text-xs text-muted">Geen artikeldata beschikbaar.</p>
                              ) : (
                                <>
                                  <p className="text-xs font-medium text-muted mb-2">Kliks per artikel</p>
                                  <div className="space-y-1">
                                    {Object.entries(link.referrers).sort((a, b) => b[1] - a[1]).map(([slug, count]) => (
                                      <div key={slug} className="flex items-center justify-between text-xs">
                                        <span className="text-[#0f172a] truncate max-w-xs">{slug}</span>
                                        <span className="text-muted ml-4 shrink-0">{count} {count === 1 ? "klik" : "kliks"}</span>
                                      </div>
                                    ))}
                                  </div>
                                </>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {actieveTab === "commissies" && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title mb-0">CJ Affiliate commissies</h2>
            {cjPeriode && <span className="text-xs text-muted">{cjPeriode.van} – {cjPeriode.tot}</span>}
          </div>
          {cjFout ? (
            <p className="text-sm text-muted">{cjFout}</p>
          ) : !cjData ? (
            <p className="text-sm text-muted">Laden...</p>
          ) : Object.keys(cjData).length === 0 ? (
            <p className="text-sm text-muted">Geen commissies gevonden in deze periode.</p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="rounded-xl p-4" style={{ background: "var(--color-background-secondary, #f8f9fb)" }}>
                  <p className="text-xs text-muted mb-1">Totale commissie</p>
                  <p className="text-xl font-medium text-[#0F6E56]">${Object.values(cjData).reduce((s, d) => s + d.commissie, 0).toFixed(2)}</p>
                </div>
                <div className="rounded-xl p-4" style={{ background: "var(--color-background-secondary, #f8f9fb)" }}>
                  <p className="text-xs text-muted mb-1">Transacties</p>
                  <p className="text-xl font-medium">{Object.values(cjData).reduce((s, d) => s + d.transacties, 0)}</p>
                </div>
                <div className="rounded-xl p-4" style={{ background: "var(--color-background-secondary, #f8f9fb)" }}>
                  <p className="text-xs text-muted mb-1">Totale omzet</p>
                  <p className="text-xl font-medium">${Object.values(cjData).reduce((s, d) => s + d.omzet, 0).toFixed(2)}</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 text-xs font-medium text-muted">Adverteerder</th>
                      <th className="text-right py-2 text-xs font-medium text-muted">Transacties</th>
                      <th className="text-right py-2 text-xs font-medium text-muted">Omzet</th>
                      <th className="text-right py-2 text-xs font-medium text-muted">Commissie</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(cjData)
                      .sort((a, b) => b[1].commissie - a[1].commissie)
                      .map(([naam, stats]) => (
                        <tr key={naam} className="border-b border-gray-50 last:border-0">
                          <td className="py-2.5 font-medium text-[#0f172a]">{naam}</td>
                          <td className="py-2.5 text-right text-muted">{stats.transacties}</td>
                          <td className="py-2.5 text-right text-muted">${stats.omzet.toFixed(2)}</td>
                          <td className="py-2.5 text-right font-semibold text-[#2D6A4F]">${stats.commissie.toFixed(2)}</td>
                        </tr>
                      ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-gray-200">
                      <td className="pt-2.5 font-semibold text-[#0f172a]">Totaal</td>
                      <td className="pt-2.5 text-right text-muted">{Object.values(cjData).reduce((s, d) => s + d.transacties, 0)}</td>
                      <td className="pt-2.5 text-right text-muted">${Object.values(cjData).reduce((s, d) => s + d.omzet, 0).toFixed(2)}</td>
                      <td className="pt-2.5 text-right font-semibold text-[#2D6A4F]">${Object.values(cjData).reduce((s, d) => s + d.commissie, 0).toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
