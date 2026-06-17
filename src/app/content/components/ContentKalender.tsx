"use client";

import { useState, useEffect } from "react";
import { type Persoon } from "@/components/PersoonSelector";
import { logActie } from "@/lib/audit";

interface ContentItem {
  id: number;
  titel: string;
  status: "idee" | "in_bewerking" | "gepubliceerd";
  publicatiedatum: string | null;
  categorie: string | null;
  aangemaakt_op: string;
}

const statusKleur = {
  idee: "bg-gray-100 text-gray-600",
  in_bewerking: "bg-yellow-100 text-yellow-700",
  gepubliceerd: "bg-green-100 text-green-700",
};

const statusLabel = {
  idee: "Idee",
  in_bewerking: "In bewerking",
  gepubliceerd: "Gepubliceerd",
};

const lege = { titel: "", status: "idee", publicatiedatum: "", categorie: "", toegevoegd_door: "" as Persoon | "" };

export default function ContentKalender() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [formulier, setFormulier] = useState(lege);
  const [bewerkId, setBewerkId] = useState<number | null>(null);
  const [toonFormulier, setToonFormulier] = useState(false);
  const [filter, setFilter] = useState<string>("alle");

  useEffect(() => { laad(); }, []);

  async function laad() {
    const res = await fetch("/api/content-kalender");
    const data = await res.json();
    if (data.success) setItems(data.data);
  }

  async function handleOpslaan(e: React.FormEvent) {
    e.preventDefault();
    if (!formulier.toegevoegd_door) return;
    if (bewerkId) {
      await fetch("/api/content-kalender", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: bewerkId, ...formulier }),
      });
      await logActie("bewerkt", "content_kalender", bewerkId, formulier.titel, formulier.toegevoegd_door);
    } else {
      const res = await fetch("/api/content-kalender", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formulier),
      });
      const json = await res.json();
      await logActie("aangemaakt", "content_kalender", json.id ?? "", formulier.titel, formulier.toegevoegd_door);
    }
    setFormulier(lege);
    setBewerkId(null);
    setToonFormulier(false);
    laad();
  }

  async function handleVerwijder(id: number) {
    const item = items.find((i) => i.id === id);
    await fetch("/api/content-kalender", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await logActie("verwijderd", "content_kalender", id, item?.titel || String(id));
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function handleBewerk(item: ContentItem) {
    setFormulier({ titel: item.titel, status: item.status, publicatiedatum: item.publicatiedatum || "", categorie: item.categorie || "", toegevoegd_door: "" });
    setBewerkId(item.id);
    setToonFormulier(true);
  }

  function sluitModal() {
    setToonFormulier(false);
    setBewerkId(null);
    setFormulier(lege);
  }

  const gefilterd = filter === "alle" ? items : items.filter((i) => i.status === filter);

  return (
    <>
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {["alle", "idee", "in_bewerking", "gepubliceerd"].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                filter === s ? "bg-brand-600 text-white shadow-sm" : "bg-white border border-gray-200 text-gray-500 hover:text-[#0f172a]"
              }`}
            >
              {s === "alle" ? "Alle" : statusLabel[s as keyof typeof statusLabel]}
              <span className="ml-1.5 opacity-60">({s === "alle" ? items.length : items.filter((i) => i.status === s).length})</span>
            </button>
          ))}
        </div>
        <button onClick={() => { setToonFormulier(true); setBewerkId(null); setFormulier(lege); }} className="btn-primary">
          + Artikel toevoegen
        </button>
      </div>

      <div className="card">
        {gefilterd.length === 0 ? (
          <p className="text-center text-gray-400 py-8">Geen artikelen gevonden.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {gefilterd.map((item) => (
              <div key={item.id} className="py-4 first:pt-0 last:pb-0 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`badge ${statusKleur[item.status]}`}>{statusLabel[item.status]}</span>
                    {item.categorie && <span className="badge bg-brand-50 text-brand-600">{item.categorie}</span>}
                  </div>
                  <p className="font-medium text-gray-900 truncate">{item.titel}</p>
                  {item.publicatiedatum && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(item.publicatiedatum).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => handleBewerk(item)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors text-sm">✏️</button>
                  <button onClick={() => handleVerwijder(item.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors text-sm">🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>

    {/* Modal */}
    {toonFormulier && (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} onClick={sluitModal}>
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
          <h3 className="font-semibold text-gray-800 mb-5">{bewerkId ? "Artikel bewerken" : "Nieuw artikel"}</h3>
          <form onSubmit={handleOpslaan} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Titel <span className="text-red-400">*</span></label>
              <input type="text" className="input" placeholder="bijv. De beste stranden van Thailand" value={formulier.titel} onChange={(e) => setFormulier((p) => ({ ...p, titel: e.target.value }))} required autoFocus />
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={formulier.status} onChange={(e) => setFormulier((p) => ({ ...p, status: e.target.value }))}>
                <option value="idee">Idee</option>
                <option value="in_bewerking">In bewerking</option>
                <option value="gepubliceerd">Gepubliceerd</option>
              </select>
            </div>
            <div>
              <label className="label">Publicatiedatum</label>
              <input type="date" className="input" value={formulier.publicatiedatum} onChange={(e) => setFormulier((p) => ({ ...p, publicatiedatum: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="label">Categorie</label>
              <input type="text" className="input" placeholder="bijv. Azië, Budget reizen, Tips" value={formulier.categorie} onChange={(e) => setFormulier((p) => ({ ...p, categorie: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="label">Ingevoerd door <span className="text-red-400">*</span></label>
              <select className="input" value={formulier.toegevoegd_door} onChange={(e) => setFormulier((p) => ({ ...p, toegevoegd_door: e.target.value as Persoon }))}>
                <option value="">Selecteer persoon...</option>
                <option value="Luciano">Luciano</option>
                <option value="Jolien">Jolien</option>
              </select>
            </div>
            <div className="col-span-2 flex gap-3 pt-1">
              <button type="submit" className="btn-primary flex-1" disabled={!formulier.toegevoegd_door}>{bewerkId ? "Opslaan" : "Toevoegen"}</button>
              <button type="button" onClick={sluitModal} className="btn-secondary flex-1">Annuleren</button>
            </div>
          </form>
        </div>
      </div>
    )}
    </>
  );
}
