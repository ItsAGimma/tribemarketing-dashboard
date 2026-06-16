"use client";

import { useState, useEffect } from "react";
import KpiCard from "@/components/KpiCard";

interface Kwartaal {
  kwartaal: number;
  label: string;
  omzet: number;
  btw_te_betalen: number;
}

interface BtwData {
  btwStatus: string;
  kwartalen: Kwartaal[];
}

const KWARTAAL_NAMEN: Record<number, string> = {
  1: "Q1 (jan–mrt)",
  2: "Q2 (apr–jun)",
  3: "Q3 (jul–sep)",
  4: "Q4 (okt–dec)",
};

const DEADLINES: Record<number, string> = {
  1: "30 april",
  2: "31 juli",
  3: "31 oktober",
  4: "31 januari",
};

export default function BtwOverzicht() {
  const [data, setData] = useState<BtwData | null>(null);
  const [jaar, setJaar] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [btwStatus, setBtwStatus] = useState("btw_plichtig");
  const [opslaanStatus, setOpslaanStatus] = useState(false);

  const laad = async () => {
    setLoading(true);
    const res = await fetch(`/api/belastingen/btw?jaar=${jaar}`);
    const json = await res.json();
    if (json.success) {
      setData(json.data);
      setBtwStatus(json.data.btwStatus || "btw_plichtig");
    }
    setLoading(false);
  };

  useEffect(() => { laad(); }, [jaar]);

  const slaStatusOp = async () => {
    setOpslaanStatus(true);
    await fetch("/api/belastingen/btw", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ btw_status: btwStatus }),
    });
    setOpslaanStatus(false);
    laad();
  };

  const kwartalen = data?.kwartalen ?? [];
  const totaalOmzet = kwartalen.reduce((s, k) => s + (k.omzet ?? 0), 0);
  const totaalBtw = kwartalen.reduce((s, k) => s + (k.btw_te_betalen ?? 0), 0);
  const heeftData = kwartalen.some((k) => k.omzet > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="section-title">BTW Overzicht</h2>
          <p className="text-sm text-gray-500 mt-0.5">Kwartaaloverzicht BTW voor de aangifte</p>
        </div>
        <select
          value={jaar}
          onChange={(e) => setJaar(Number(e.target.value))}
          className="input text-sm py-2"
        >
          {[2024, 2025, 2026].map((j) => <option key={j}>{j}</option>)}
        </select>
      </div>

      <div className="card p-5">
        <h3 className="font-semibold text-[#0f172a] mb-3">BTW Regime</h3>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="btw" value="btw_plichtig" checked={btwStatus === "btw_plichtig"} onChange={() => setBtwStatus("btw_plichtig")} className="accent-brand-600" />
            <span className="text-sm font-medium">BTW-plichtig</span>
            <span className="text-xs text-gray-400">(standaard)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="btw" value="kor" checked={btwStatus === "kor"} onChange={() => setBtwStatus("kor")} className="accent-brand-600" />
            <span className="text-sm font-medium">KOR</span>
            <span className="text-xs text-gray-400">(kleine ondernemersregeling)</span>
          </label>
          <button onClick={slaStatusOp} disabled={opslaanStatus} className="btn-primary text-xs py-1.5 px-3 ml-auto">
            {opslaanStatus ? "Opslaan..." : "Opslaan"}
          </button>
        </div>
        {btwStatus === "kor" && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-700">
            <strong>KOR actief:</strong> Je hoeft geen BTW af te dragen en kunt geen BTW terugvragen. De BTW-aangifte is niet van toepassing.
          </div>
        )}
      </div>

      {btwStatus === "kor" ? (
        <div className="card p-8 text-center text-gray-400">
          <p className="text-4xl mb-3">✓</p>
          <p className="font-medium text-gray-600">KOR is actief</p>
          <p className="text-sm mt-1">Je bent vrijgesteld van BTW-aangifte</p>
        </div>
      ) : loading ? (
        <div className="card p-8 text-center text-gray-400">Laden...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <KpiCard label={`Totale omzet ${jaar}`} value={`€${totaalOmzet.toFixed(2)}`} accent="#2D6A4F" />
            <KpiCard label="Totaal BTW afdragen" value={`€${totaalBtw.toFixed(2)}`} accent="#004BAD" />
          </div>

          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <h3 className="font-semibold text-sm text-[#0f172a]">Kwartaaloverzicht {jaar}</h3>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Kwartaal</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Omzet excl. BTW</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">BTW afdragen</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Deadline aangifte</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {!heeftData ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Geen facturen gevonden voor {jaar}</td></tr>
                ) : kwartalen.map((k) => (
                  <tr key={k.kwartaal} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-[#0f172a]">{KWARTAAL_NAMEN[k.kwartaal]}</td>
                    <td className="px-4 py-3 text-right text-gray-700">€{(k.omzet ?? 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-red-600">€{(k.btw_te_betalen ?? 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-gray-500">{DEADLINES[k.kwartaal]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card p-4 bg-blue-50 border-blue-100">
            <p className="text-sm text-blue-700">
              <strong>Tip:</strong> BTW-aangifte doe je elk kwartaal via{" "}
              <strong>Mijn Belastingdienst Zakelijk</strong>. Zorg dat je aangifte op tijd indient om boetes te voorkomen.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
