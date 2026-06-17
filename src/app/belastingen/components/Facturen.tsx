"use client";

import { useState, useEffect } from "react";
import KpiCard from "@/components/KpiCard";
import { type Persoon } from "@/components/PersoonSelector";
import { logActie } from "@/lib/audit";

interface Factuur {
  id: number;
  factuurnummer: string;
  klant: string;
  datum: string;
  vervaldatum: string | null;
  bedrag: number;
  btw_tarief: number;
  btw_bedrag: number;
  status: "concept" | "verzonden" | "betaald" | "verlopen";
  omschrijving: string | null;
}

const STATUS_LABELS: Record<string, { label: string; class: string }> = {
  concept: { label: "Concept", class: "bg-gray-100 text-gray-600" },
  verzonden: { label: "Verzonden", class: "bg-blue-50 text-blue-700" },
  betaald: { label: "Betaald", class: "bg-green-50 text-green-700" },
  verlopen: { label: "Verlopen", class: "bg-red-50 text-red-600" },
};

const leegForm = { factuurnummer: "", klant: "", datum: new Date().toISOString().slice(0, 10), vervaldatum: "", bedrag: "", btw_tarief: "21", omschrijving: "", status: "verzonden", toegevoegd_door: "" as Persoon | "" };

export default function Facturen() {
  const [facturen, setFacturen] = useState<Factuur[]>([]);
  const [loading, setLoading] = useState(true);
  const [toonFormulier, setToonFormulier] = useState(false);
  const [opslaan, setOpslaan] = useState(false);
  const [form, setForm] = useState(leegForm);

  const laad = async () => {
    setLoading(true);
    const res = await fetch("/api/belastingen/facturen");
    const json = await res.json();
    if (json.success) setFacturen(json.data);
    setLoading(false);
  };

  useEffect(() => { laad(); }, []);

  const btwBedrag = () => (parseFloat(form.bedrag) || 0) * (parseFloat(form.btw_tarief) || 0) / 100;

  const toevoegen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.toegevoegd_door) return;
    setOpslaan(true);
    try {
      const res = await fetch("/api/belastingen/facturen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, bedrag: parseFloat(form.bedrag), btw_tarief: parseFloat(form.btw_tarief), btw_bedrag: btwBedrag() }),
      });
      const json = await res.json();
      await logActie("aangemaakt", "facturen", json.id ?? "", `${form.factuurnummer} - ${form.klant}`, form.toegevoegd_door);
      setToonFormulier(false);
      setForm(leegForm);
      laad();
    } finally {
      setOpslaan(false);
    }
  };

  const updateStatus = async (id: number, status: string) => {
    await fetch("/api/belastingen/facturen", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
    laad();
  };

  const verwijder = async (id: number) => {
    if (!confirm("Factuur verwijderen?")) return;
    const f = facturen.find((x) => x.id === id);
    await fetch("/api/belastingen/facturen", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    await logActie("verwijderd", "facturen", id, f ? `${f.factuurnummer} - ${f.klant}` : String(id));
    laad();
  };

  const totaalOpen = facturen.filter(f => f.status !== "betaald").reduce((s, f) => s + f.bedrag, 0);
  const totaalBetaald = facturen.filter(f => f.status === "betaald").reduce((s, f) => s + f.bedrag, 0);

  return (
    <>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="section-title">Facturen</h2>
          <p className="text-sm text-gray-500 mt-0.5">Uitgaande facturen beheren en bijhouden</p>
        </div>
        <button onClick={() => setToonFormulier(true)} className="btn-primary">+ Factuur toevoegen</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <KpiCard label="Totaal betaald" value={`€${totaalBetaald.toFixed(2)}`} accent="#2D6A4F" />
        <KpiCard label="Openstaand" value={`€${totaalOpen.toFixed(2)}`} accent="#F59E0B" />
        <KpiCard label="Totaal facturen" value={String(facturen.length)} accent="#004BAD" />
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Factuur #</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Klant</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Datum</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Excl. BTW</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">BTW</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Laden...</td></tr>
            ) : facturen.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Nog geen facturen toegevoegd</td></tr>
            ) : facturen.map((f) => {
              const s = STATUS_LABELS[f.status] || STATUS_LABELS.concept;
              return (
                <tr key={f.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-mono font-medium text-brand-600">{f.factuurnummer}</td>
                  <td className="px-4 py-3 font-medium text-[#0f172a]">{f.klant}</td>
                  <td className="px-4 py-3 text-gray-600">{f.datum}</td>
                  <td className="px-4 py-3 text-right font-semibold text-[#0f172a]">€{f.bedrag.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-gray-600">€{f.btw_bedrag.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <select value={f.status} onChange={(e) => updateStatus(f.id, e.target.value)} className={`text-xs font-medium px-2 py-1 rounded-lg border-0 cursor-pointer ${s.class}`}>
                      <option value="concept">Concept</option>
                      <option value="verzonden">Verzonden</option>
                      <option value="betaald">Betaald</option>
                      <option value="verlopen">Verlopen</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => verwijder(f.id)} className="text-gray-300 hover:text-red-400 text-lg">×</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>

    {/* Modal */}
    {toonFormulier && (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} onClick={() => { setToonFormulier(false); setForm(leegForm); }}>
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
          <h3 className="font-semibold text-gray-800 mb-5">Nieuwe factuur</h3>
          <form onSubmit={toevoegen} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Factuurnummer</label>
              <input type="text" className="input" placeholder="FAC-2026-001" value={form.factuurnummer} onChange={(e) => setForm({ ...form, factuurnummer: e.target.value })} required autoFocus />
            </div>
            <div>
              <label className="label">Klant</label>
              <input type="text" className="input" placeholder="Bedrijfsnaam" value={form.klant} onChange={(e) => setForm({ ...form, klant: e.target.value })} required />
            </div>
            <div>
              <label className="label">Factuurdatum</label>
              <input type="date" className="input" value={form.datum} onChange={(e) => setForm({ ...form, datum: e.target.value })} required />
            </div>
            <div>
              <label className="label">Vervaldatum</label>
              <input type="date" className="input" value={form.vervaldatum} onChange={(e) => setForm({ ...form, vervaldatum: e.target.value })} />
            </div>
            <div>
              <label className="label">Bedrag excl. BTW (€)</label>
              <input type="number" step="0.01" className="input" placeholder="0.00" value={form.bedrag} onChange={(e) => setForm({ ...form, bedrag: e.target.value })} required />
            </div>
            <div>
              <label className="label">BTW tarief</label>
              <select className="input" value={form.btw_tarief} onChange={(e) => setForm({ ...form, btw_tarief: e.target.value })}>
                <option value="21">21% (standaard)</option>
                <option value="9">9% (laag)</option>
                <option value="0">0% (vrijgesteld)</option>
              </select>
            </div>
            {form.bedrag && (
              <div className="col-span-2 px-3 py-2 bg-gray-50 rounded-xl text-sm border border-gray-100">
                <span className="text-gray-500">BTW: </span><span className="font-semibold">€{btwBedrag().toFixed(2)}</span>
                <span className="text-gray-400 mx-2">·</span>
                <span className="text-gray-500">Totaal incl.: </span><span className="font-semibold">€{(parseFloat(form.bedrag) + btwBedrag()).toFixed(2)}</span>
              </div>
            )}
            <div className="col-span-2">
              <label className="label">Omschrijving (optioneel)</label>
              <input type="text" className="input" placeholder="Diensten / werkzaamheden" value={form.omschrijving} onChange={(e) => setForm({ ...form, omschrijving: e.target.value })} />
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="concept">Concept</option>
                <option value="verzonden">Verzonden</option>
                <option value="betaald">Betaald</option>
              </select>
            </div>
            <div>
              <label className="label">Ingevoerd door <span className="text-red-400">*</span></label>
              <select className="input" value={form.toegevoegd_door} onChange={(e) => setForm((p) => ({ ...p, toegevoegd_door: e.target.value as Persoon }))}>
                <option value="">Selecteer persoon...</option>
                <option value="Luciano">Luciano</option>
                <option value="Jolien">Jolien</option>
              </select>
            </div>
            <div className="col-span-2 flex gap-3 pt-1">
              <button type="submit" disabled={opslaan || !form.toegevoegd_door} className="btn-primary flex-1">{opslaan ? "Opslaan..." : "Toevoegen"}</button>
              <button type="button" onClick={() => { setToonFormulier(false); setForm(leegForm); }} className="btn-secondary flex-1">Annuleren</button>
            </div>
          </form>
        </div>
      </div>
    )}
    </>
  );
}
