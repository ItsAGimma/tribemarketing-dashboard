"use client";

import { useState, useEffect } from "react";
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

  useEffect(() => {
    fetch("/api/cj-commissions").then(r => r.json()).then(d => {
      if (d.success) { setCjData(d.data); setCjPeriode(d.periode); }
      else setCjFout(d.detail ? `${d.error} — ${d.detail}` : (d.error || "Onbekende fout"));
    }).catch((e) => setCjFout(`Kan CJ data niet ophalen: ${e}`));
  }, []);

  return (
    <div>
      <h1 className="page-title">Affiliate</h1>
      <Tabs tabs={tabs} active={actieveTab} onChange={setActieveTab} className="mb-8" />

      {actieveTab === "platforms" && <AffiliatePlatforms />}
      {actieveTab === "links" && <AffiliateLinkManager />}

      {actieveTab === "prestaties" && (
        <div className="card">
          <h2 className="section-title mb-4">Prestaties</h2>
          <p className="text-sm text-muted">Komt binnenkort — klikdata per affiliate link met conversieratio.</p>
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
