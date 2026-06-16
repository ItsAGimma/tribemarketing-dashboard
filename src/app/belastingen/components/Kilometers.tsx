"use client";

import { useState, useEffect } from "react";
import KpiCard from "@/components/KpiCard";
import PersoonSelector, { type Persoon } from "@/components/PersoonSelector";
import { logActie } from "@/lib/audit";

interface Rit {
  id: number;
  datum: string;
  van: string;
  naar: string;
  km: number;
  doel: string | null;
}

interface KmData {
  ritten: Rit[];
  totaalKm: number;
  totaalAftrekbaar: number;
  maanden: { maand: string; km: number; aftrekbaar: number }[];
  tarief: number;
}

export default function Kilometers() {
  const [data, setData] = useState<KmData | null>(null);
  const [jaar, setJaar] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [toonFormulier, setToonFormulier] = useState(false);
  const [opslaan, setOpslaan] = useState(false);
  const [form, setForm] = useState({
    datum: new Date().toISOString().slice(0, 10),
    van: "",
    naar: "",
    km: "",
    doel: "",
    toegevoegd_door: "" as Persoon | "",
  });

  const laad = async () => {
    setLoading(true);
    const res = await fetch(`/api/belastingen/kilometers?jaar=${jaar}`);
    const json = await res.json();
    if (json.success) setData(json.data);
    setLoading(false);
  };

  useEffect(() => { laad(); }, [jaar]);

  const toevoegen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.toegevoegd_door) return;
    setOpslaan(true);
    const res = await fetch("/api/belastingen/kilometers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, km: parseFloat(form.km) }),
    });
    const json = await res.json();
    await logActie("aangemaakt", "kilometers", json.id ?? "", `${form.van} → ${form.naar} (${form.km} km)`, form.toegevoegd_door);
    setForm({ datum: new Date().toISOString().slice(0, 10), van: "", naar: "", km: "", doel: "", toegevoegd_door: "" });
    setToonFormulier(false);
    setOpslaan(false);
    laad();
  };

  const verwijder = async (id: number) => {
    if (!confirm("Rit verwijderen?")) return;
    const rit = data?.ritten.find((r) => r.id === id);
    await fetch("/api/belastingen/kilometers", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await logActie("verwijderd", "kilometers", id, rit ? `${rit.van} → ${rit.naar}` : String(id));
    laad();
  };

  const maandNaam = (m: string) => {
    const maanden = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
    const [, maand] = m.split("-");
    return maanden[parseInt(maand) - 1];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="section-title">Kilometerregistratie</h2>
          <p className="text-sm text-gray-500 mt-0.5">Zakelijke reizen bijhouden (€0,23/km aftrekbaar)</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={jaar}
            onChange={(e) => setJaar(Number(e.target.value))}
            className="input text-sm py-2"
          >
            {[2024, 2025, 2026].map((j) => <option key={j}>{j}</option>)}
          </select>
          <button onClick={() => setToonFormulier(true)} className="btn-primary text-sm">
            + Rit toevoegen
          </button>
        </div>
      </div>

      {data && (
        <div className="grid grid-cols-3 gap-5">
          <KpiCard label={`Totaal km ${jaar}`} value={`${data.totaalKm} km`} accent="#004BAD" />
          <KpiCard label="Aftrekbaar" value={`€${data.totaalAftrekbaar.toFixed(2)}`} accent="#2D6A4F" />
          <KpiCard label="Aantal ritten" value={String(data.ritten.length)} accent="#7c3aed" />
        </div>
      )}

      {toonFormulier && (
        <div className="card p-6">
          <h3 className="font-semibold text-[#0f172a] mb-4">Rit toevoegen</h3>
          <form onSubmit={toevoegen} className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Datum</label>
              <input type="date" className="input" value={form.datum} onChange={(e) => setForm({ ...form, datum: e.target.value })} required />
            </div>
            <div>
              <label className="label">Kilometers</label>
              <input type="number" step="0.1" className="input" placeholder="0.0" value={form.km} onChange={(e) => setForm({ ...form, km: e.target.value })} required />
            </div>
            <div>
              <label className="label">Van</label>
              <input type="text" className="input" placeholder="Woonplaats / adres" value={form.van} onChange={(e) => setForm({ ...form, van: e.target.value })} required />
            </div>
            <div>
              <label className="label">Naar</label>
              <input type="text" className="input" placeholder="Bestemming / adres" value={form.naar} onChange={(e) => setForm({ ...form, naar: e.target.value })} required />
            </div>
            <div className="col-span-2">
              <label className="label">Zakelijk doel (optioneel)</label>
              <input type="text" className="input" placeholder="Bijv. klantvergadering, netwerkevent" value={form.doel} onChange={(e) => setForm({ ...form, doel: e.target.value })} />
            </div>
            {form.km && (
              <div className="col-span-2 p-3 bg-gray-50 rounded-xl text-sm">
                <span className="text-gray-500">Aftrekbaar: </span>
                <span className="font-semibold text-emerald-600">€{(parseFloat(form.km) * 0.23).toFixed(2)}</span>
              </div>
            )}
            <div className="col-span-2">
              <PersoonSelector value={form.toegevoegd_door} onChange={(v) => setForm((p) => ({ ...p, toegevoegd_door: v }))} />
            </div>
            <div className="col-span-2 flex gap-3 justify-end">
              <button type="button" onClick={() => setToonFormulier(false)} className="btn-secondary text-sm">Annuleren</button>
              <button type="submit" disabled={opslaan || !form.toegevoegd_door} className="btn-primary text-sm">{opslaan ? "Opslaan..." : "Toevoegen"}</button>
            </div>
          </form>
        </div>
      )}

      {/* Maandoverzicht */}
      {data && data.maanden.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
            <h3 className="font-semibold text-sm text-[#0f172a]">Maandoverzicht {jaar}</h3>
          </div>
          <div className="flex gap-4 p-4 overflow-x-auto">
            {data.maanden.map((m) => (
              <div key={m.maand} className="flex-shrink-0 text-center">
                <p className="text-xs font-medium text-gray-500 uppercase mb-2">{maandNaam(m.maand)}</p>
                <div className="w-16 bg-brand-100 rounded-lg flex items-end justify-center overflow-hidden" style={{ height: "60px" }}>
                  <div
                    className="w-full bg-brand-500 rounded-lg transition-all"
                    style={{ height: `${Math.min(100, (m.km / (data.totaalKm || 1)) * 100)}%` }}
                  />
                </div>
                <p className="text-xs font-semibold text-[#0f172a] mt-1.5">{m.km} km</p>
                <p className="text-xs text-gray-400">€{m.aftrekbaar.toFixed(0)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ritten tabel */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Datum</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Van → Naar</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Doel</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">KM</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Aftrekbaar</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Laden...</td></tr>
            ) : !data || data.ritten.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Geen ritten geregistreerd voor {jaar}</td></tr>
            ) : data.ritten.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-3 text-gray-600">{r.datum}</td>
                <td className="px-4 py-3 font-medium text-[#0f172a]">{r.van} → {r.naar}</td>
                <td className="px-4 py-3 text-gray-500">{r.doel || "—"}</td>
                <td className="px-4 py-3 text-right font-semibold text-[#0f172a]">{r.km} km</td>
                <td className="px-4 py-3 text-right text-emerald-600 font-medium">€{(r.km * 0.23).toFixed(2)}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => verwijder(r.id)} className="text-xs text-red-500 hover:text-red-600 font-medium">Verwijder</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
