"use client";

import { useState, useEffect } from "react";

interface Jaaroverzicht {
  jaar: number;
  inkomsten: number;
  uitgaven: number;
  zakelijkeKosten: number;
  totaalAftrekbaar: number;
  kmRitten: number;
  kmAftrekbaar: number;
  belastbareWinst: number;
  perCategorie: { categorie: string; totaal: number }[];
}

function Rij({ label, waarde, highlight, sub }: { label: string; waarde: string; highlight?: boolean; sub?: boolean }) {
  return (
    <div className={`flex justify-between items-center py-3 px-4 ${highlight ? "bg-brand-50 rounded-xl font-bold" : sub ? "pl-8" : ""}`}>
      <span className={`text-sm ${highlight ? "text-brand-700" : sub ? "text-gray-400" : "text-gray-600"}`}>{label}</span>
      <span className={`font-semibold ${highlight ? "text-brand-700 text-base" : "text-[#0f172a]"}`}>{waarde}</span>
    </div>
  );
}

export default function Jaaroverzicht() {
  const [data, setData] = useState<Jaaroverzicht | null>(null);
  const [jaar, setJaar] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);

  const laad = async () => {
    setLoading(true);
    const res = await fetch(`/api/belastingen/jaaroverzicht?jaar=${jaar}`);
    const json = await res.json();
    if (json.success) setData(json.data);
    setLoading(false);
  };

  useEffect(() => { laad(); }, [jaar]);

  const drukAf = () => window.print();

  const ib_schatting = (winst: number) => {
    if (winst <= 0) return 0;
    // Vereenvoudigd: 36.97% tot €73.031, 49.5% daarboven (2026)
    const grens = 73031;
    if (winst <= grens) return winst * 0.3697;
    return grens * 0.3697 + (winst - grens) * 0.495;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="section-title">Jaaroverzicht</h2>
          <p className="text-sm text-gray-500 mt-0.5">Samenvatting voor de inkomstenbelastingaangifte</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={jaar}
            onChange={(e) => setJaar(Number(e.target.value))}
            className="input text-sm py-2"
          >
            {[2024, 2025, 2026].map((j) => <option key={j}>{j}</option>)}
          </select>
          <button onClick={drukAf} className="btn-secondary text-sm">🖨️ Afdrukken</button>
        </div>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-gray-400">Laden...</div>
      ) : !data ? null : (
        <>
          <div className="grid grid-cols-2 gap-6">
            {/* Inkomsten & Uitgaven */}
            <div className="card divide-y divide-gray-50">
              <div className="px-4 py-3 bg-gray-50">
                <h3 className="font-semibold text-sm text-[#0f172a]">Inkomsten & Uitgaven {jaar}</h3>
              </div>
              <Rij label="Totale inkomsten" waarde={`€${data.inkomsten.toFixed(2)}`} />
              <Rij label="Totale uitgaven" waarde={`-€${data.uitgaven.toFixed(2)}`} />
              <Rij label="Brutowinst" waarde={`€${(data.inkomsten - data.uitgaven).toFixed(2)}`} highlight />
            </div>

            {/* Aftrekposten */}
            <div className="card divide-y divide-gray-50">
              <div className="px-4 py-3 bg-gray-50">
                <h3 className="font-semibold text-sm text-[#0f172a]">Aftrekbare Kosten {jaar}</h3>
              </div>
              <Rij label="Zakelijke kosten (gemarkeerd in Financiën)" waarde={`€${data.zakelijkeKosten.toFixed(2)}`} />
              <Rij label="Kilometervergoeding" waarde={`€${data.kmAftrekbaar.toFixed(2)}`} />
              <Rij label={`(${data.kmRitten} km × €0,23)`} waarde="" sub />
              <Rij label="Totaal aftrekbaar" waarde={`€${data.totaalAftrekbaar.toFixed(2)}`} highlight />
            </div>
          </div>

          {/* Belastbaar resultaat */}
          <div className="card divide-y divide-gray-50">
            <div className="px-4 py-3 bg-gray-50">
              <h3 className="font-semibold text-sm text-[#0f172a]">Belastbaar Resultaat {jaar}</h3>
            </div>
            <Rij label="Inkomsten" waarde={`€${data.inkomsten.toFixed(2)}`} />
            <Rij label="Zakelijke kosten" waarde={`-€${data.zakelijkeKosten.toFixed(2)}`} />
            <Rij label="Kilometeraftrek" waarde={`-€${data.kmAftrekbaar.toFixed(2)}`} />
            <Rij label="Belastbare winst" waarde={`€${data.belastbareWinst.toFixed(2)}`} highlight />
            <div className="px-4 py-3">
              <p className="text-xs text-gray-400">
                Geschatte inkomstenbelasting (indicatief): <strong className="text-gray-600">€{ib_schatting(data.belastbareWinst).toFixed(2)}</strong>
                <span className="ml-2 text-gray-400">— Raadpleeg altijd een belastingadviseur voor de definitieve aangifte</span>
              </p>
            </div>
          </div>

          {/* Kosten per categorie */}
          {data.perCategorie.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                <h3 className="font-semibold text-sm text-[#0f172a]">Aftrekbare kosten per categorie</h3>
              </div>
              <div className="divide-y divide-gray-50">
                {data.perCategorie.map((c) => (
                  <div key={c.categorie} className="flex justify-between items-center px-4 py-3">
                    <span className="text-sm text-gray-600">{c.categorie}</span>
                    <span className="font-semibold text-[#0f172a]">€{c.totaal.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
