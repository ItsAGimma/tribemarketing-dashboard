"use client";

import { useState, useEffect } from "react";

interface Kost {
  id: number;
  datum: string;
  omschrijving: string;
  bedrag: number;
  categorie: string;
  bron: "handmatig" | "financien";
  geimporteerd?: boolean;
}

const CATEGORIEN = [
  "Software & Tools",
  "Marketing & Advertentie",
  "Kantoorkosten",
  "Reiskosten",
  "Opleiding & Cursussen",
  "Telefoon & Internet",
  "Verzekering",
  "Overig",
];

export default function ZakelijkeKosten() {
  const [kosten, setKosten] = useState<Kost[]>([]);
  const [jaar, setJaar] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [toonFormulier, setToonFormulier] = useState(false);
  const [opslaan, setOpslaan] = useState(false);
  const [form, setForm] = useState({
    datum: new Date().toISOString().slice(0, 10),
    omschrijving: "",
    bedrag: "",
    categorie: CATEGORIEN[0],
  });

  const laad = async () => {
    setLoading(true);
    const res = await fetch(`/api/belastingen/zakelijke-kosten?jaar=${jaar}`);
    const json = await res.json();
    if (json.success) setKosten([...json.data.handmatig, ...json.data.uitFinancien]);
    setLoading(false);
  };

  useEffect(() => { laad(); }, [jaar]);

  const toevoegen = async (e: React.FormEvent) => {
    e.preventDefault();
    setOpslaan(true);
    await fetch("/api/belastingen/zakelijke-kosten", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, bedrag: parseFloat(form.bedrag) }),
    });
    setForm({ datum: new Date().toISOString().slice(0, 10), omschrijving: "", bedrag: "", categorie: CATEGORIEN[0] });
    setToonFormulier(false);
    setOpslaan(false);
    laad();
  };

  const verwijder = async (id: number) => {
    if (!confirm("Kost verwijderen?")) return;
    await fetch("/api/belastingen/zakelijke-kosten", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    laad();
  };

  const importeer = async (id: number) => {
    await fetch("/api/belastingen/zakelijke-kosten", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "importeer", id }),
    });
    laad();
  };

  const totaal = kosten.reduce((s, k) => s + k.bedrag, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="section-title">Zakelijke Kosten</h2>
          <p className="text-sm text-gray-500 mt-0.5">Aftrekbare bedrijfskosten voor de belastingaangifte</p>
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
            + Kost toevoegen
          </button>
        </div>
      </div>

      <div className="card p-5 bg-gradient-to-r from-brand-50 to-blue-50 border-brand-100">
        <p className="text-sm text-gray-500 mb-1">Totaal aftrekbaar {jaar}</p>
        <p className="text-3xl font-bold text-[#0f172a]">€{totaal.toFixed(2)}</p>
        <p className="text-xs text-gray-400 mt-1">{kosten.length} kostenposten</p>
      </div>

      {toonFormulier && (
        <div className="card p-6">
          <h3 className="font-semibold text-[#0f172a] mb-4">Zakelijke kost toevoegen</h3>
          <form onSubmit={toevoegen} className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Datum</label>
              <input type="date" className="input" value={form.datum} onChange={(e) => setForm({ ...form, datum: e.target.value })} required />
            </div>
            <div>
              <label className="label">Bedrag (€)</label>
              <input type="number" step="0.01" className="input" placeholder="0.00" value={form.bedrag} onChange={(e) => setForm({ ...form, bedrag: e.target.value })} required />
            </div>
            <div className="col-span-2">
              <label className="label">Omschrijving</label>
              <input type="text" className="input" placeholder="Bijv. Adobe Premiere abonnement" value={form.omschrijving} onChange={(e) => setForm({ ...form, omschrijving: e.target.value })} required />
            </div>
            <div className="col-span-2">
              <label className="label">Categorie</label>
              <select className="input" value={form.categorie} onChange={(e) => setForm({ ...form, categorie: e.target.value })}>
                {CATEGORIEN.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="col-span-2 flex gap-3 justify-end">
              <button type="button" onClick={() => setToonFormulier(false)} className="btn-secondary text-sm">Annuleren</button>
              <button type="submit" disabled={opslaan} className="btn-primary text-sm">{opslaan ? "Opslaan..." : "Toevoegen"}</button>
            </div>
          </form>
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Datum</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Omschrijving</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Categorie</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Bedrag</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Bron</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Laden...</td></tr>
            ) : kosten.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Geen kosten gevonden voor {jaar}</td></tr>
            ) : kosten.map((k) => (
              <tr key={`${k.bron}-${k.id}`} className="hover:bg-gray-50/50">
                <td className="px-4 py-3 text-gray-600">{k.datum}</td>
                <td className="px-4 py-3 font-medium text-[#0f172a]">{k.omschrijving}</td>
                <td className="px-4 py-3">
                  <span className="badge bg-gray-100 text-gray-600">{k.categorie}</span>
                </td>
                <td className="px-4 py-3 text-right font-semibold text-[#0f172a]">€{k.bedrag.toFixed(2)}</td>
                <td className="px-4 py-3">
                  {k.bron === "financien" ? (
                    <span className="badge bg-purple-50 text-purple-700">Financiën</span>
                  ) : (
                    <span className="badge bg-green-50 text-green-700">Handmatig</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {k.bron === "financien" && !k.geimporteerd ? (
                    <button onClick={() => importeer(k.id)} className="text-xs text-brand-600 hover:text-brand-700 font-medium">Importeer</button>
                  ) : k.bron === "handmatig" ? (
                    <button onClick={() => verwijder(k.id)} className="text-xs text-red-500 hover:text-red-600 font-medium">Verwijder</button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
