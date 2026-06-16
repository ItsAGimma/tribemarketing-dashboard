"use client";

import { useState, useEffect } from "react";
import { CreditCard, User } from "lucide-react";
import Tabs from "@/components/Tabs";
import KpiCard from "@/components/KpiCard";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
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
}

interface Maanddata {
  maand: string;
  inkomsten: number;
  uitgaven: number;
}

const categorieenInkomsten = ["Affiliate", "Freelance", "Overig"];
const categorieenUitgaven = ["Hosting", "Tools", "Marketing", "Overig"];

const lege = { datum: new Date().toISOString().split("T")[0], bedrag: "", type: "inkomsten", categorie: "Affiliate", omschrijving: "", rekening: "", aftrekbaar: false };

function maandLabel(maand: string) {
  const [jaar, mnd] = maand.split("-");
  const datum = new Date(parseInt(jaar), parseInt(mnd) - 1, 1);
  return datum.toLocaleDateString("nl-NL", { month: "short", year: "2-digit" });
}

const euroFormaat = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });

export default function FinancienPage() {
  const [transacties, setTransacties] = useState<Transactie[]>([]);
  const [maanddata, setMaanddata] = useState<Maanddata[]>([]);
  const [formulier, setFormulier] = useState(lege);
  const [toonFormulier, setToonFormulier] = useState(false);
  const [filterMaand, setFilterMaand] = useState<string>("alle");

  useEffect(() => { laad(); }, []);

  async function laad() {
    const [tRes, mRes] = await Promise.all([
      fetch("/api/financien"),
      fetch("/api/financien?overzicht=1"),
    ]);
    const tData = await tRes.json();
    const mData = await mRes.json();
    if (tData.success) setTransacties(tData.data);
    if (mData.success) setMaanddata(mData.data);
  }

  async function handleToevoegen(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/financien", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...formulier, bedrag: parseFloat(formulier.bedrag) }),
    });
    setFormulier(lege);
    setToonFormulier(false);
    laad();
  }

  async function handleVerwijder(id: number) {
    await fetch("/api/financien", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setTransacties((prev) => prev.filter((t) => t.id !== id));
    laad();
  }

  // Samenvattingen
  const totaalInkomsten = transacties.filter((t) => t.type === "inkomsten").reduce((s, t) => s + t.bedrag, 0);
  const totaalUitgaven = transacties.filter((t) => t.type === "uitgaven").reduce((s, t) => s + t.bedrag, 0);
  const winst = totaalInkomsten - totaalUitgaven;

  // Gefilterde transacties
  const gefilterd = filterMaand === "alle"
    ? transacties
    : transacties.filter((t) => t.datum.startsWith(filterMaand));

  // Unieke maanden voor filter
  const uniekeMaanden = [...new Set(transacties.map((t) => t.datum.slice(0, 7)))].sort().reverse();

  const categorieenActueel = formulier.type === "inkomsten" ? categorieenInkomsten : categorieenUitgaven;

  const grafiekData = maanddata.map((m) => ({
    naam: maandLabel(m.maand),
    Inkomsten: m.inkomsten,
    Uitgaven: m.uitgaven,
    Winst: m.inkomsten - m.uitgaven,
  }));

  const [actieveTab, setActieveTab] = useState<"transacties" | "onttrekkingen">("transacties");

  return (
    <div className="max-w-5xl space-y-8">
      <h1 className="page-title">Financiën</h1>

      <Tabs
        tabs={[
          { id: "transacties", label: "Transacties", icon: CreditCard },
          { id: "onttrekkingen", label: "Onttrekkingen", icon: User },
        ]}
        active={actieveTab}
        onChange={(id) => setActieveTab(id as "transacties" | "onttrekkingen")}
      />

      {actieveTab === "onttrekkingen" && <OnttrekkingenTab />}
      {actieveTab === "transacties" && (<>

      {/* KPI Kaarten */}
      <div className="grid grid-cols-3 gap-5">
        <KpiCard label="Totaal inkomsten" value={euroFormaat.format(totaalInkomsten)} accent="#2D6A4F" valueColor="#2D6A4F" />
        <KpiCard label="Totaal uitgaven" value={euroFormaat.format(totaalUitgaven)} accent="#E05252" valueColor="#E05252" />
        <KpiCard
          label="Winst / verlies"
          value={`${winst >= 0 ? "+" : ""}${euroFormaat.format(winst)}`}
          accent={winst >= 0 ? "#004BAD" : "#E05252"}
          valueColor={winst >= 0 ? "#004BAD" : "#E05252"}
        />
      </div>

      {/* Grafiek */}
      {grafiekData.length > 0 && (
        <div className="card">
          <h2 className="section-title">Inkomsten vs Uitgaven per maand</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={grafiekData} margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="naam" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `€${v}`} />
              <Tooltip
                formatter={(value: number, name: string) => [euroFormaat.format(value), name]}
              />
              <Legend />
              <Bar dataKey="Inkomsten" fill="#2D6A4F" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Uitgaven" fill="#E05252" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Transacties */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h2 className="section-title mb-0">Transacties</h2>
            <select
              className="input w-auto text-sm"
              value={filterMaand}
              onChange={(e) => setFilterMaand(e.target.value)}
            >
              <option value="alle">Alle maanden</option>
              {uniekeMaanden.map((m) => (
                <option key={m} value={m}>
                  {maandLabel(m)}
                </option>
              ))}
            </select>
          </div>
          <button onClick={() => setToonFormulier(true)} className="btn-primary">
            + Toevoegen
          </button>
        </div>

        {toonFormulier && (
          <form onSubmit={handleToevoegen} className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-xl">
            <div>
              <label className="label">Datum</label>
              <input
                type="date"
                className="input"
                value={formulier.datum}
                onChange={(e) => setFormulier((p) => ({ ...p, datum: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="label">Bedrag (€)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input"
                placeholder="0,00"
                value={formulier.bedrag}
                onChange={(e) => setFormulier((p) => ({ ...p, bedrag: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="label">Type</label>
              <select
                className="input"
                value={formulier.type}
                onChange={(e) => setFormulier((p) => ({ ...p, type: e.target.value, categorie: e.target.value === "inkomsten" ? "Affiliate" : "Hosting" }))}
              >
                <option value="inkomsten">Inkomsten</option>
                <option value="uitgaven">Uitgaven</option>
              </select>
            </div>
            <div>
              <label className="label">Categorie</label>
              <select
                className="input"
                value={formulier.categorie}
                onChange={(e) => setFormulier((p) => ({ ...p, categorie: e.target.value }))}
              >
                {categorieenActueel.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className={formulier.type === "uitgaven" ? "" : "col-span-2"}>
              <label className="label">Omschrijving</label>
              <input
                type="text"
                className="input"
                placeholder="bijv. Booking.com commissie januari"
                value={formulier.omschrijving}
                onChange={(e) => setFormulier((p) => ({ ...p, omschrijving: e.target.value }))}
              />
            </div>
            {formulier.type === "uitgaven" && (
              <div>
                <label className="label">Betaald via</label>
                <select
                  className="input"
                  value={formulier.rekening}
                  onChange={(e) => setFormulier((p) => ({ ...p, rekening: e.target.value }))}
                  required
                >
                  <option value="">Kies rekening...</option>
                  <option value="bedrijfsrekening">Bedrijfsrekening</option>
                  <option value="persoonlijke rekening">Persoonlijke rekening</option>
                </select>
              </div>
            )}
            {formulier.type === "uitgaven" && (
              <div className="col-span-2 flex items-center gap-3 py-1">
                <input
                  type="checkbox"
                  id="aftrekbaar"
                  checked={formulier.aftrekbaar}
                  onChange={(e) => setFormulier((p) => ({ ...p, aftrekbaar: e.target.checked }))}
                  className="w-4 h-4 accent-brand-600 rounded"
                />
                <label htmlFor="aftrekbaar" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Zakelijk aftrekbaar <span className="text-gray-400 font-normal">(telt mee in jaaroverzicht belastingen)</span>
                </label>
              </div>
            )}
            <div className="col-span-2 flex gap-3">
              <button type="submit" className="btn-primary">Toevoegen</button>
              <button type="button" onClick={() => setToonFormulier(false)} className="btn-secondary">Annuleren</button>
            </div>
          </form>
        )}

        {gefilterd.length === 0 ? (
          <p className="text-center text-gray-400 py-8">Geen transacties gevonden.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-gray-100">
                  <th className="pb-3 font-semibold text-gray-600">Datum</th>
                  <th className="pb-3 font-semibold text-gray-600">Omschrijving</th>
                  <th className="pb-3 font-semibold text-gray-600">Categorie</th>
                  <th className="pb-3 font-semibold text-gray-600">Rekening</th>
                  <th className="pb-3 font-semibold text-gray-600">Aftrekbaar</th>
                  <th className="pb-3 font-semibold text-gray-600 text-right">Bedrag</th>
                  <th className="pb-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {gefilterd.map((t) => (
                  <tr key={t.id}>
                    <td className="py-3 text-gray-500">
                      {new Date(t.datum).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}
                    </td>
                    <td className="py-3 text-gray-900">{t.omschrijving || "—"}</td>
                    <td className="py-3">
                      <span className="badge bg-gray-100 text-gray-600">{t.categorie}</span>
                    </td>
                    <td className="py-3">
                      {t.type === "uitgaven" && t.rekening ? (
                        <span className={`badge ${t.rekening === "bedrijfsrekening" ? "bg-brand-50 text-brand-700" : "bg-purple-50 text-purple-700"}`}>
                          {t.rekening === "bedrijfsrekening" ? "Bedrijf" : "Privé"}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="py-3">
                      {t.type === "uitgaven" && t.aftrekbaar ? (
                        <span className="badge bg-emerald-50 text-emerald-700">✓ Aftrekbaar</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className={`py-3 text-right font-semibold ${t.type === "inkomsten" ? "text-green-600" : "text-red-500"}`}>
                      {t.type === "inkomsten" ? "+" : "-"}{euroFormaat.format(t.bedrag)}
                    </td>
                    <td className="py-3">
                      <button
                        onClick={() => handleVerwijder(t.id)}
                        className="text-gray-300 hover:text-red-400 text-lg"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </>)}
    </div>
  );
}

// ─── Onttrekkingen Tab ─────────────────────────────────────

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
  const [form, setForm] = useState({ datum: new Date().toISOString().slice(0, 10), vennoot: "Luciano", bedrag: "", omschrijving: "" });

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
    await fetch("/api/onttrekkingen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, bedrag: parseFloat(form.bedrag) }),
    });
    setForm({ datum: new Date().toISOString().slice(0, 10), vennoot: "Luciano", bedrag: "", omschrijving: "" });
    setToonFormulier(false);
    laad();
  };

  const verwijder = async (id: number) => {
    await fetch("/api/onttrekkingen", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    laad();
  };

  const totaalLuciano = items.filter(i => i.vennoot === "Luciano").reduce((s, i) => s + i.bedrag, 0);
  const totaalJolien = items.filter(i => i.vennoot === "Jolien").reduce((s, i) => s + i.bedrag, 0);
  const totaal = totaalLuciano + totaalJolien;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="section-title">Onttrekkingen</h2>
          <p className="text-sm text-gray-500 mt-0.5">Privé-opnames per vennoot bijhouden (50/50 VOF)</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={jaar} onChange={(e) => setJaar(Number(e.target.value))} className="input text-sm py-2">
            {[2024, 2025, 2026].map((j) => <option key={j}>{j}</option>)}
          </select>
          <button onClick={() => setToonFormulier(true)} className="btn-primary text-sm">+ Onttrekking</button>
        </div>
      </div>

      {/* KPI per vennoot */}
      <div className="grid grid-cols-3 gap-5">
        <KpiCard label="Luciano opgenomen" value={euroFormaat.format(totaalLuciano)} accent="#004BAD" />
        <KpiCard label="Jolien opgenomen" value={euroFormaat.format(totaalJolien)} accent="#7c3aed" />
        <KpiCard label="Totaal opgenomen" value={euroFormaat.format(totaal)} accent="#6B7280">
          {Math.abs(totaalLuciano - totaalJolien) > 0.01 && (
            <p className="text-xs text-amber-600 mt-2">
              Verschil: {euroFormaat.format(Math.abs(totaalLuciano - totaalJolien))} ten gunste van {totaalLuciano < totaalJolien ? "Luciano" : "Jolien"}
            </p>
          )}
        </KpiCard>
      </div>

      {toonFormulier && (
        <div className="card p-6">
          <h3 className="font-semibold text-[#0f172a] mb-4">Onttrekking toevoegen</h3>
          <form onSubmit={toevoegen} className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Datum</label>
              <input type="date" className="input" value={form.datum} onChange={(e) => setForm({ ...form, datum: e.target.value })} required />
            </div>
            <div>
              <label className="label">Vennoot</label>
              <select className="input" value={form.vennoot} onChange={(e) => setForm({ ...form, vennoot: e.target.value })}>
                <option>Luciano</option>
                <option>Jolien</option>
              </select>
            </div>
            <div>
              <label className="label">Bedrag (€)</label>
              <input type="number" step="0.01" className="input" placeholder="0,00" value={form.bedrag} onChange={(e) => setForm({ ...form, bedrag: e.target.value })} required />
            </div>
            <div>
              <label className="label">Omschrijving (optioneel)</label>
              <input type="text" className="input" placeholder="bijv. maandelijkse opname" value={form.omschrijving} onChange={(e) => setForm({ ...form, omschrijving: e.target.value })} />
            </div>
            <div className="col-span-2 flex gap-3 justify-end">
              <button type="button" onClick={() => setToonFormulier(false)} className="btn-secondary text-sm">Annuleren</button>
              <button type="submit" className="btn-primary text-sm">Toevoegen</button>
            </div>
          </form>
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Datum</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Vennoot</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Omschrijving</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Bedrag</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Laden...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Geen onttrekkingen in {jaar}</td></tr>
            ) : items.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-3 text-gray-600">{new Date(item.datum).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${item.vennoot === "Luciano" ? "bg-brand-50 text-brand-700" : "bg-purple-50 text-purple-700"}`}>
                    {item.vennoot}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">{item.omschrijving || "—"}</td>
                <td className="px-4 py-3 text-right font-semibold text-[#0f172a]">{euroFormaat.format(item.bedrag)}</td>
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
                <td className="px-4 py-3 text-right font-bold text-[#0f172a]">{euroFormaat.format(totaal)}</td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
