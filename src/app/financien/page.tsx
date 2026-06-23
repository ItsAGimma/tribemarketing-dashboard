"use client";

import { useState, useEffect } from "react";
import { CreditCard, User, Pencil } from "lucide-react";
import Tabs from "@/components/Tabs";
import KpiCard from "@/components/KpiCard";
import { type Persoon } from "@/components/PersoonSelector";
import { logActie } from "@/lib/audit";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

interface Transactie {
  id: number;
  datum: string;
  bedrag: number;
  type: "inkomsten" | "uitgaven";
  categorie: string;
  omschrijving: string | null;
  rekening: string | null;
  aftrekbaar: number;
  platform: string | null;
}

interface Maanddata {
  maand: string;
  inkomsten: number;
  uitgaven: number;
}

const categorieenInkomsten = ["Affiliate", "Overig"];
const categorieenUitgaven = ["Hosting", "Tools", "Marketing", "Overig"];
const lege = { datum: new Date().toISOString().split("T")[0], bedrag: "", type: "inkomsten", categorie: "Affiliate", omschrijving: "", rekening: "", aftrekbaar: false, toegevoegd_door: "" as Persoon | "", platform: "" };

function maandLabel(maand: string) {
  const [jaar, mnd] = maand.split("-");
  return new Date(parseInt(jaar), parseInt(mnd) - 1, 1).toLocaleDateString("nl-NL", { month: "short", year: "2-digit" });
}

const euro = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });

export default function FinancienPage() {
  const [actieveTab, setActieveTab] = useState<"transacties" | "onttrekkingen">("transacties");
  const [transacties, setTransacties] = useState<Transactie[]>([]);
  const [maanddata, setMaanddata] = useState<Maanddata[]>([]);
  const [formulier, setFormulier] = useState(lege);
  const [toonFormulier, setToonFormulier] = useState(false);
  const [filterMaand, setFilterMaand] = useState("alle");
  const [filterType, setFilterType] = useState("alle");
  const [filterPlatform, setFilterPlatform] = useState("alle");
  const [bewerkId, setBewerkId] = useState<number | null>(null);
  const [platforms, setPlatforms] = useState<{ id: number; naam: string }[]>([]);

  useEffect(() => {
    laad();
    fetch("/api/affiliate-platforms").then(r => r.json()).then(d => {
      if (d.success) setPlatforms(d.data.filter((p: { actief: boolean }) => p.actief));
    });
  }, []);

  async function laad() {
    const [tRes, mRes] = await Promise.all([fetch("/api/financien"), fetch("/api/financien?overzicht=1")]);
    const tData = await tRes.json();
    const mData = await mRes.json();
    if (tData.success) setTransacties(tData.data);
    if (mData.success) setMaanddata(mData.data);
  }

  function openBewerken(t: Transactie) {
    setFormulier({
      datum: t.datum,
      bedrag: String(t.bedrag),
      type: t.type,
      categorie: t.categorie,
      omschrijving: t.omschrijving || "",
      rekening: t.rekening || "",
      aftrekbaar: !!t.aftrekbaar,
      toegevoegd_door: "",
      platform: t.platform || "",
    });
    setBewerkId(t.id);
    setToonFormulier(true);
  }

  async function handleToevoegen(e: React.FormEvent) {
    e.preventDefault();
    if (!formulier.toegevoegd_door) return;
    if (formulier.type === "inkomsten" && formulier.categorie === "Affiliate" && !formulier.platform) return;
    if (!formulier.omschrijving.trim()) return;

    if (bewerkId) {
      await fetch("/api/financien", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: bewerkId, ...formulier, bedrag: parseFloat(formulier.bedrag) }),
      });
      await logActie("bewerkt", "transacties", bewerkId, `${formulier.omschrijving || formulier.categorie}`, formulier.toegevoegd_door);
    } else {
      const res = await fetch("/api/financien", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formulier, bedrag: parseFloat(formulier.bedrag) }),
      });
      const json = await res.json();
      await logActie("aangemaakt", "transacties", json.id ?? "", `${formulier.type} €${formulier.bedrag} - ${formulier.omschrijving || formulier.categorie}`, formulier.toegevoegd_door);
    }

    setFormulier(lege);
    setBewerkId(null);
    setToonFormulier(false);
    laad();
  }

  async function handleVerwijder(id: number) {
    const t = transacties.find(x => x.id === id);
    await fetch("/api/financien", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    await logActie("verwijderd", "transacties", id, t?.omschrijving || t?.categorie || String(id));
    setTransacties(prev => prev.filter(t => t.id !== id));
    laad();
  }

  const totaalInkomsten = transacties.filter(t => t.type === "inkomsten").reduce((s, t) => s + t.bedrag, 0);
  const totaalUitgaven = transacties.filter(t => t.type === "uitgaven").reduce((s, t) => s + t.bedrag, 0);
  const winst = totaalInkomsten - totaalUitgaven;

  const gefilterd = transacties
    .filter(t => filterMaand === "alle" || t.datum.startsWith(filterMaand))
    .filter(t => filterType === "alle" || t.type === filterType)
    .filter(t => filterPlatform === "alle" || t.platform === filterPlatform);

  const uniekeMaanden = [...new Set(transacties.map(t => t.datum.slice(0, 7)))].sort().reverse();
  const categorieenActueel = formulier.type === "inkomsten" ? categorieenInkomsten : categorieenUitgaven;

  const grafiekBron = filterPlatform === "alle" ? transacties : transacties.filter(t => t.type === "uitgaven" || t.platform === filterPlatform);
  const grafiekPerMaand: Record<string, { inkomsten: number; uitgaven: number }> = {};
  for (const t of grafiekBron) {
    const m = t.datum.slice(0, 7);
    if (!grafiekPerMaand[m]) grafiekPerMaand[m] = { inkomsten: 0, uitgaven: 0 };
    grafiekPerMaand[m][t.type] += t.bedrag;
  }
  const grafiekData = Object.entries(grafiekPerMaand)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([m, d]) => ({ naam: maandLabel(m), Inkomsten: d.inkomsten, Uitgaven: d.uitgaven }));

  return (
    <>
    <div className="max-w-4xl space-y-8">
      <h1 className="page-title">Financiën</h1>

      <Tabs
        tabs={[
          { id: "transacties", label: "Transacties", icon: CreditCard },
          { id: "onttrekkingen", label: "Onttrekkingen", icon: User },
        ]}
        active={actieveTab}
        onChange={id => setActieveTab(id as "transacties" | "onttrekkingen")}
      />

      {actieveTab === "onttrekkingen" && <OnttrekkingenTab />}

      {actieveTab === "transacties" && (
        <div className="space-y-6">
          {/* KPI's */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <KpiCard label="Totaal inkomsten" value={euro.format(totaalInkomsten)} accent="#2D6A4F" valueColor="#2D6A4F" />
            <KpiCard label="Totaal uitgaven" value={euro.format(totaalUitgaven)} accent="#E05252" valueColor="#E05252" />
            <KpiCard
              label="Winst / verlies"
              value={`${winst >= 0 ? "+" : ""}${euro.format(winst)}`}
              accent={winst >= 0 ? "#004BAD" : "#E05252"}
              valueColor={winst >= 0 ? "#004BAD" : "#E05252"}
            />
          </div>

          {/* Grafiek */}
          {grafiekData.length > 0 && (
            <div className="card">
              <h2 className="section-title mb-5">Inkomsten vs Uitgaven per maand</h2>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={grafiekData} margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="naam" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `€${v}`} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: number, n: string) => [euro.format(v), n]} cursor={{ fill: "#f8fafc" }} />
                  <Legend />
                  <Bar dataKey="Inkomsten" fill="#2D6A4F" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Uitgaven" fill="#E05252" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Transacties */}
          <div className="card">
            {/* Header rij */}
            <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
              <h2 className="section-title mb-0">Transacties</h2>
              <button onClick={() => setToonFormulier(true)} className="btn-primary shrink-0">+ Toevoegen</button>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 mb-5 flex-wrap">
              <select className="input w-auto text-sm" value={filterMaand} onChange={e => setFilterMaand(e.target.value)}>
                <option value="alle">Alle maanden</option>
                {uniekeMaanden.map(m => <option key={m} value={m}>{maandLabel(m)}</option>)}
              </select>
              <select className="input w-auto text-sm" value={filterType} onChange={e => setFilterType(e.target.value)}>
                <option value="alle">Alle types</option>
                <option value="inkomsten">Inkomsten</option>
                <option value="uitgaven">Uitgaven</option>
              </select>
              {platforms.length > 0 && (
                <select className="input w-auto text-sm" value={filterPlatform} onChange={e => setFilterPlatform(e.target.value)}>
                  <option value="alle">Alle platforms</option>
                  {platforms.map(p => <option key={p.id} value={p.naam}>{p.naam}</option>)}
                </select>
              )}
            </div>

            {/* Lijst */}
            {gefilterd.length === 0 ? (
              <p className="text-center text-gray-400 py-10">Geen transacties gevonden.</p>
            ) : (
              <div className="space-y-2">
                {gefilterd.map(t => (
                  <div key={t.id} className="flex items-center gap-4 px-4 py-3 rounded-xl border border-gray-100 bg-white hover:bg-gray-50/50 transition-colors">
                    {/* Datum */}
                    <div className="w-14 shrink-0 text-center">
                      <p className="text-xs font-semibold text-gray-800">
                        {new Date(t.datum).toLocaleDateString("nl-NL", { day: "numeric", month: "short" }).split(" ")[0]}
                      </p>
                      <p className="text-[10px] text-gray-400 uppercase">
                        {new Date(t.datum).toLocaleDateString("nl-NL", { month: "short" })}
                      </p>
                    </div>

                    {/* Verticale lijn */}
                    <div className="w-px h-8 bg-gray-100 shrink-0" />

                    {/* Omschrijving + badges */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#0f172a] truncate">{t.omschrijving || t.categorie}</p>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="badge bg-gray-100 text-gray-500 text-[10px]">{t.categorie}</span>
                        {t.platform && <span className="badge bg-brand-50 text-brand-600 text-[10px]">{t.platform}</span>}
                        {t.rekening && (
                          <span className={`badge text-[10px] ${t.rekening === "bedrijfsrekening" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"}`}>
                            {t.rekening === "bedrijfsrekening" ? "Bedrijf" : "Privé"}
                          </span>
                        )}
                        {!!t.aftrekbaar && <span className="badge bg-emerald-50 text-emerald-600 text-[10px]">Aftrekbaar</span>}
                      </div>
                    </div>

                    {/* Bedrag */}
                    <p className={`text-sm font-bold shrink-0 ${t.type === "inkomsten" ? "text-green-600" : "text-red-500"}`}>
                      {t.type === "inkomsten" ? "+" : "−"}{euro.format(t.bedrag)}
                    </p>

                    {/* Acties */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => openBewerken(t)} className="p-1.5 rounded-lg text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleVerwijder(t.id)} className="p-1.5 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors text-lg leading-none">×</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>

    {/* Transactie modal */}
    {toonFormulier && (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} onClick={() => { setToonFormulier(false); setBewerkId(null); setFormulier(lege); }}>
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
          <h3 className="font-semibold text-gray-800 mb-5">{bewerkId ? "Transactie bewerken" : "Transactie toevoegen"}</h3>
          <form onSubmit={handleToevoegen} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Datum</label>
              <input type="date" className="input" value={formulier.datum} onChange={e => setFormulier(p => ({ ...p, datum: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Bedrag (€)</label>
              <input type="number" step="0.01" min="0" className="input" placeholder="0,00" value={formulier.bedrag} onChange={e => setFormulier(p => ({ ...p, bedrag: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Type</label>
              <select className="input" value={formulier.type} onChange={e => setFormulier(p => ({ ...p, type: e.target.value, categorie: e.target.value === "inkomsten" ? "Affiliate" : "Hosting", platform: "" }))}>
                <option value="inkomsten">Inkomsten</option>
                <option value="uitgaven">Uitgaven</option>
              </select>
            </div>
            <div>
              <label className="label">Categorie</label>
              <select className="input" value={formulier.categorie} onChange={e => setFormulier(p => ({ ...p, categorie: e.target.value, platform: "" }))}>
                {categorieenActueel.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">Omschrijving <span className="text-red-400">*</span></label>
              <input type="text" className="input" placeholder="bijv. Booking.com commissie januari" value={formulier.omschrijving} onChange={e => setFormulier(p => ({ ...p, omschrijving: e.target.value }))} required />
            </div>
            {formulier.type === "inkomsten" && formulier.categorie === "Affiliate" && (
              <div className="col-span-2">
                <label className="label">Affiliate platform <span className="text-red-400">*</span></label>
                {platforms.length === 0 ? (
                  <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    Geen actieve platforms. <a href="/platformen" className="underline font-medium">Voeg er eerst een toe →</a>
                  </p>
                ) : (
                  <select className="input" value={formulier.platform} onChange={e => setFormulier(p => ({ ...p, platform: e.target.value }))} required>
                    <option value="">Selecteer platform...</option>
                    {platforms.map(p => <option key={p.id} value={p.naam}>{p.naam}</option>)}
                  </select>
                )}
              </div>
            )}
            {formulier.type === "uitgaven" && (
              <div>
                <label className="label">Betaald via</label>
                <select className="input" value={formulier.rekening} onChange={e => setFormulier(p => ({ ...p, rekening: e.target.value }))} required>
                  <option value="">Kies rekening...</option>
                  <option value="bedrijfsrekening">Bedrijfsrekening</option>
                  <option value="persoonlijke rekening">Persoonlijke rekening</option>
                </select>
              </div>
            )}
            {formulier.type === "uitgaven" && (
              <div className="flex items-center gap-3 py-1">
                <input type="checkbox" id="aftrekbaar" checked={formulier.aftrekbaar} onChange={e => setFormulier(p => ({ ...p, aftrekbaar: e.target.checked }))} className="w-4 h-4 accent-brand-600 rounded" />
                <label htmlFor="aftrekbaar" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Zakelijk aftrekbaar
                </label>
              </div>
            )}
            <div className="col-span-2">
              <label className="label">Ingevoerd door <span className="text-red-400">*</span></label>
              <select className="input" value={formulier.toegevoegd_door} onChange={e => setFormulier(p => ({ ...p, toegevoegd_door: e.target.value as "Luciano" | "Jolien" }))}>
                <option value="">Selecteer persoon...</option>
                <option value="Luciano">Luciano</option>
                <option value="Jolien">Jolien</option>
              </select>
            </div>
            <div className="col-span-2 flex gap-3 pt-1">
              <button type="submit" className="btn-primary flex-1" disabled={
                !formulier.toegevoegd_door || !formulier.omschrijving.trim() ||
                (formulier.type === "inkomsten" && formulier.categorie === "Affiliate" && !formulier.platform)
              }>{bewerkId ? "Opslaan" : "Toevoegen"}</button>
              <button type="button" onClick={() => { setToonFormulier(false); setBewerkId(null); setFormulier(lege); }} className="btn-secondary flex-1">Annuleren</button>
            </div>
          </form>
        </div>
      </div>
    )}
    </>
  );
}

// ─── Onttrekkingen Tab ──────────────────────────────────────────────────────

interface Onttrekking {
  id: number;
  datum: string;
  vennoot: string;
  bedrag: number;
  omschrijving: string | null;
}

function OnttrekkingenTab() {
  const [items, setItems] = useState<Onttrekking[]>([]);
  const [jaar, setJaar] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [toonFormulier, setToonFormulier] = useState(false);
  const [form, setForm] = useState({ datum: new Date().toISOString().slice(0, 10), vennoot: "Luciano", bedrag: "", omschrijving: "", toegevoegd_door: "" as Persoon | "" });

  const laad = async () => {
    setLoading(true);
    const res = await fetch(`/api/onttrekkingen?jaar=${jaar}`);
    const json = await res.json();
    if (json.success) setItems(json.data);
    setLoading(false);
  };

  useEffect(() => { laad(); }, [jaar]);

  const toevoegen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.toegevoegd_door) return;
    const res = await fetch("/api/onttrekkingen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, bedrag: parseFloat(form.bedrag) }),
    });
    const json = await res.json();
    await logActie("aangemaakt", "onttrekkingen", json.id ?? "", `${form.vennoot} €${form.bedrag}`, form.toegevoegd_door);
    setForm({ datum: new Date().toISOString().slice(0, 10), vennoot: "Luciano", bedrag: "", omschrijving: "", toegevoegd_door: "" });
    setToonFormulier(false);
    laad();
  };

  const verwijder = async (id: number) => {
    const item = items.find(i => i.id === id);
    await fetch("/api/onttrekkingen", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    await logActie("verwijderd", "onttrekkingen", id, item?.vennoot ? `${item.vennoot} €${item.bedrag}` : String(id));
    laad();
  };

  const totaalLuciano = items.filter(i => i.vennoot === "Luciano").reduce((s, i) => s + i.bedrag, 0);
  const totaalJolien = items.filter(i => i.vennoot === "Jolien").reduce((s, i) => s + i.bedrag, 0);
  const totaal = totaalLuciano + totaalJolien;

  return (
    <>
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="section-title">Onttrekkingen</h2>
          <p className="text-sm text-gray-500 mt-0.5">Privé-opnames per vennoot (50/50 VOF)</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={jaar} onChange={e => setJaar(Number(e.target.value))} className="input text-sm py-2">
            {[2024, 2025, 2026].map(j => <option key={j}>{j}</option>)}
          </select>
          <button onClick={() => setToonFormulier(true)} className="btn-primary">+ Onttrekking</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <KpiCard label="Luciano opgenomen" value={euro.format(totaalLuciano)} accent="#004BAD" />
        <KpiCard label="Jolien opgenomen" value={euro.format(totaalJolien)} accent="#7c3aed" />
        <KpiCard label="Totaal opgenomen" value={euro.format(totaal)} accent="#6B7280">
          {Math.abs(totaalLuciano - totaalJolien) > 0.01 && (
            <p className="text-xs text-amber-600 mt-2">
              Verschil: {euro.format(Math.abs(totaalLuciano - totaalJolien))} t.g.v. {totaalLuciano < totaalJolien ? "Luciano" : "Jolien"}
            </p>
          )}
        </KpiCard>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Datum</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Vennoot</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Omschrijving</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Bedrag</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Laden...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Geen onttrekkingen in {jaar}</td></tr>
            ) : items.map(item => (
              <tr key={item.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-3 text-gray-600">{new Date(item.datum).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${item.vennoot === "Luciano" ? "bg-brand-50 text-brand-700" : "bg-purple-50 text-purple-700"}`}>{item.vennoot}</span>
                </td>
                <td className="px-4 py-3 text-gray-600">{item.omschrijving || "—"}</td>
                <td className="px-4 py-3 text-right font-semibold text-[#0f172a]">{euro.format(item.bedrag)}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => verwijder(item.id)} className="text-gray-300 hover:text-red-400 text-lg">×</button>
                </td>
              </tr>
            ))}
          </tbody>
          {items.length > 0 && (
            <tfoot className="border-t border-gray-100 bg-gray-50">
              <tr>
                <td colSpan={3} className="px-4 py-3 text-sm font-semibold text-gray-600">Totaal {jaar}</td>
                <td className="px-4 py-3 text-right font-bold text-[#0f172a]">{euro.format(totaal)}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>

    {/* Onttrekking modal */}
    {toonFormulier && (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} onClick={() => setToonFormulier(false)}>
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
          <h3 className="font-semibold text-gray-800 mb-5">Onttrekking toevoegen</h3>
          <form onSubmit={toevoegen} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Datum</label>
              <input type="date" className="input" value={form.datum} onChange={e => setForm({ ...form, datum: e.target.value })} required />
            </div>
            <div>
              <label className="label">Vennoot</label>
              <select className="input" value={form.vennoot} onChange={e => setForm({ ...form, vennoot: e.target.value })}>
                <option>Luciano</option>
                <option>Jolien</option>
              </select>
            </div>
            <div>
              <label className="label">Bedrag (€)</label>
              <input type="number" step="0.01" className="input" placeholder="0,00" value={form.bedrag} onChange={e => setForm({ ...form, bedrag: e.target.value })} required />
            </div>
            <div>
              <label className="label">Omschrijving (optioneel)</label>
              <input type="text" className="input" placeholder="bijv. maandelijkse opname" value={form.omschrijving} onChange={e => setForm({ ...form, omschrijving: e.target.value })} />
            </div>
            <div className="col-span-2">
              <label className="label">Ingevoerd door <span className="text-red-400">*</span></label>
              <select className="input" value={form.toegevoegd_door} onChange={e => setForm(p => ({ ...p, toegevoegd_door: e.target.value as "Luciano" | "Jolien" }))}>
                <option value="">Selecteer persoon...</option>
                <option value="Luciano">Luciano</option>
                <option value="Jolien">Jolien</option>
              </select>
            </div>
            <div className="col-span-2 flex gap-3 pt-1">
              <button type="submit" className="btn-primary flex-1" disabled={!form.toegevoegd_door}>Toevoegen</button>
              <button type="button" onClick={() => setToonFormulier(false)} className="btn-secondary flex-1">Annuleren</button>
            </div>
          </form>
        </div>
      </div>
    )}
    </>
  );
}
