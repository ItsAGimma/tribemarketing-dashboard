"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

const REDIRECT_BASE = "https://boekenvia.traveltribe.life";

interface Detail {
  link: { id: number; naam: string; platform: string | null; token: string | null; url: string };
  kliks: number;
  mobiel: number;
  desktop: number;
  referrers: Record<string, { count: number; laatste: string }>;
  recent: { tijdstip: string; artikel: string; apparaat: string }[];
}

function formatTijdstip(iso: string) {
  const d = new Date(iso);
  const nu = new Date();
  const gisteren = new Date(nu); gisteren.setDate(nu.getDate() - 1);
  const tijd = d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === nu.toDateString()) return `vandaag, ${tijd}`;
  if (d.toDateString() === gisteren.toDateString()) return `gisteren, ${tijd}`;
  return `${d.getDate()} ${d.toLocaleDateString("nl-NL", { month: "short" })}, ${tijd}`;
}

export default function LinkDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<Detail | null>(null);
  const [fout, setFout] = useState<string | null>(null);
  const [tab, setTab] = useState<"artikelen" | "apparaten" | "recent">("artikelen");

  useEffect(() => {
    fetch(`/api/link-kliks/${id}`).then(r => r.json()).then(d => {
      if (d.success) setData(d);
      else setFout(d.error);
    });
  }, [id]);

  if (fout) return <div className="card"><p className="text-sm text-muted">{fout}</p></div>;
  if (!data) return <div className="card"><p className="text-sm text-muted">Laden...</p></div>;

  const { link, kliks, mobiel, desktop, referrers, recent } = data;
  const conversie = "—";

  return (
    <div className="max-w-3xl space-y-5">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-muted hover:text-[#0f172a] transition-colors">
        <ArrowLeft size={15} /> Terug naar prestaties
      </button>

      <div className="card p-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-5 border-b border-gray-100">
          <div>
            <p className="font-semibold text-[#0f172a] text-base">{link.naam}</p>
            {link.token && <p className="text-xs text-[#185FA5] mt-0.5">{REDIRECT_BASE}/{link.token}</p>}
          </div>
        </div>

        {/* KPI's */}
        <div className="grid grid-cols-4 divide-x divide-gray-100 border-b border-gray-100">
          {[
            { label: "Totaal kliks", val: kliks, groen: false },
            { label: "Mobiel", val: `${kliks > 0 ? Math.round(mobiel / kliks * 100) : 0}%`, groen: false },
            { label: "CJ transacties", val: "—", groen: false },
            { label: "Conversie", val: conversie, groen: true },
          ].map(({ label, val, groen }) => (
            <div key={label} className="p-4">
              <p className="text-xs text-muted mb-1">{label}</p>
              <p className={`text-xl font-medium ${groen ? "text-[#0F6E56]" : "text-[#0f172a]"}`}>{val}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-5">
          {(["artikelen", "apparaten", "recent"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`py-3 px-3 text-sm mr-2 border-b-2 transition-colors ${tab === t ? "border-[#1D9E75] text-[#0f172a] font-medium" : "border-transparent text-muted hover:text-[#0f172a]"}`}
            >
              {t === "artikelen" ? "Klikken per artikel" : t === "apparaten" ? "Apparaten" : "Recente kliks"}
            </button>
          ))}
        </div>

        {/* Tab inhoud */}
        <div className="p-5">
          {tab === "artikelen" && (
            Object.keys(referrers).length === 0 ? (
              <p className="text-sm text-muted">Nog geen artikeldata. Kliks vanuit directe URL-invoer bevatten geen artikelinformatie.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 text-xs font-medium text-muted">Artikel</th>
                    <th className="text-right py-2 text-xs font-medium text-muted">Kliks</th>
                    <th className="text-right py-2 text-xs font-medium text-muted">Laatste klik</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(referrers).sort((a, b) => b[1].count - a[1].count).map(([slug, info]) => (
                    <tr key={slug} className="border-b border-gray-50 last:border-0">
                      <td className="py-2.5 text-[#0f172a]">{slug}</td>
                      <td className="py-2.5 text-right text-muted">{info.count}</td>
                      <td className="py-2.5 text-right text-muted">{formatTijdstip(info.laatste)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}

          {tab === "apparaten" && (
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Mobiel", count: mobiel, kleur: "#378ADD" },
                { label: "Desktop", count: desktop, kleur: "#B4B2A9" },
              ].map(({ label, count, kleur }) => (
                <div key={label} className="rounded-xl p-4" style={{ background: "var(--color-background-secondary, #f8f9fb)" }}>
                  <p className="text-xs text-muted mb-1">{label}</p>
                  <p className="text-2xl font-medium text-[#0f172a] mb-3">{count}</p>
                  <div className="h-1.5 rounded-full bg-gray-200">
                    <div className="h-1.5 rounded-full" style={{ width: `${kliks > 0 ? Math.round(count / kliks * 100) : 0}%`, background: kleur }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "recent" && (
            recent.length === 0 ? (
              <p className="text-sm text-muted">Nog geen kliks.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 text-xs font-medium text-muted">Tijdstip</th>
                    <th className="text-left py-2 text-xs font-medium text-muted">Artikel</th>
                    <th className="text-right py-2 text-xs font-medium text-muted">Apparaat</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((k, i) => (
                    <tr key={i} className="border-b border-gray-50 last:border-0">
                      <td className="py-2.5 text-muted">{formatTijdstip(k.tijdstip)}</td>
                      <td className="py-2.5 text-[#0f172a]">{k.artikel}</td>
                      <td className="py-2.5 text-right">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${k.apparaat === "mobiel" ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
                          {k.apparaat === "mobiel" ? "Mobiel" : "Desktop"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
        </div>
      </div>
    </div>
  );
}
