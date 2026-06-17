"use client";

import { useEffect, useState, useRef } from "react";
import { Trash2, Pencil, Clock, Tag } from "lucide-react";

const PERSONEN = ["Luciano", "Jolien"] as const;

interface Taak {
  id: number;
  titel: string;
  voltooid: boolean;
  deadline: string | null;
  geclaimd_door: string | null;
  notitie: string | null;
  aangemaakt_op: string;
}

interface EditState {
  id: number;
  titel: string;
  deadline: string;
  geclaimd_door: string;
  notitie: string;
}

export default function TakenPage() {
  const [taken, setTaken] = useState<Taak[]>([]);
  const [nieuw, setNieuw] = useState("");
  const [laden, setLaden] = useState(false);
  const [filter, setFilter] = useState<"alle" | "open" | "voltooid">("alle");
  const [edit, setEdit] = useState<EditState | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { laad(); }, []);

  async function laad() {
    const res = await fetch("/api/taken");
    const data = await res.json();
    if (data.success) setTaken(data.data);
  }

  async function handleToevoegen(e: React.FormEvent) {
    e.preventDefault();
    if (!nieuw.trim() || laden) return;
    setLaden(true);
    try {
      await fetch("/api/taken", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titel: nieuw }),
      });
      setNieuw("");
      await laad();
    } finally {
      setLaden(false);
      inputRef.current?.focus();
    }
  }

  async function handleToggle(taak: Taak) {
    setTaken((prev) => prev.map((t) => t.id === taak.id ? { ...t, voltooid: !t.voltooid } : t));
    await fetch("/api/taken", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: taak.id, voltooid: !taak.voltooid }),
    });
    await laad();
  }

  async function handleVerwijder(id: number) {
    setTaken((prev) => prev.filter((t) => t.id !== id));
    setEdit(null);
    await fetch("/api/taken", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  }

  async function handleOpslaan() {
    if (!edit) return;
    await fetch("/api/taken", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: edit.id,
        titel: edit.titel,
        deadline: edit.deadline || null,
        geclaimd_door: edit.geclaimd_door || null,
        notitie: edit.notitie || null,
      }),
    });
    setEdit(null);
    await laad();
  }

  function openEdit(taak: Taak) {
    setEdit({
      id: taak.id,
      titel: taak.titel,
      deadline: taak.deadline ?? "",
      geclaimd_door: taak.geclaimd_door ?? "",
      notitie: taak.notitie ?? "",
    });
  }

  const gefilterd = taken.filter((t) =>
    filter === "alle" ? true : filter === "open" ? !t.voltooid : t.voltooid
  );
  const aantalOpen = taken.filter((t) => !t.voltooid).length;

  return (
    <>
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="page-title">Taken</h1>
        <p className="text-muted text-sm -mt-2">{aantalOpen} openstaand</p>
      </div>

      <form onSubmit={handleToevoegen} className="flex gap-3">
        <input
          ref={inputRef}
          type="text"
          className="input flex-1"
          placeholder="Nieuwe taak toevoegen..."
          value={nieuw}
          onChange={(e) => setNieuw(e.target.value)}
        />
        <button type="submit" disabled={laden || !nieuw.trim()} className="btn-primary shrink-0">
          Toevoegen
        </button>
      </form>

      <div className="flex gap-2">
        {(["alle", "open", "voltooid"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-150 ${
              filter === f ? "bg-brand-600 text-white shadow-sm" : "bg-white border border-gray-200 text-gray-500 hover:text-[#0f172a]"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            <span className="ml-1.5 opacity-70">
              ({f === "alle" ? taken.length : f === "open" ? taken.filter((t) => !t.voltooid).length : taken.filter((t) => t.voltooid).length})
            </span>
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {gefilterd.length === 0 ? (
          <p className="text-center text-gray-400 py-8 text-sm">
            {filter === "open" ? "Geen openstaande taken." : filter === "voltooid" ? "Nog niets voltooid." : "Geen taken."}
          </p>
        ) : (
          gefilterd.map((taak) => (
            <div key={taak.id} className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-gray-100 shadow-sm group">
              <button
                onClick={() => handleToggle(taak)}
                className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                  taak.voltooid ? "bg-[#004BAD] border-[#004BAD]" : "border-gray-300 hover:border-[#004BAD]"
                }`}
              >
                {taak.voltooid && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>

              <div className="flex-1 min-w-0">
                <span className={`text-sm ${taak.voltooid ? "line-through text-gray-400" : "text-ink"}`}>
                  {taak.titel}
                </span>
                {(taak.deadline || taak.geclaimd_door) && (
                  <div className="flex items-center gap-2 mt-1">
                    {taak.deadline && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md">
                        <Clock size={10} />
                        {new Date(taak.deadline).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}
                      </span>
                    )}
                    {taak.geclaimd_door && (
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-md ${
                        taak.geclaimd_door === "Luciano" ? "bg-blue-50 text-[#004BAD]" : "bg-purple-50 text-purple-700"
                      }`}>
                        <Tag size={10} />
                        {taak.geclaimd_door}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEdit(taak)} className="text-gray-400 hover:text-[#004BAD] p-1">
                  <Pencil size={14} />
                </button>
                <button onClick={() => handleVerwijder(taak.id)} className="text-gray-400 hover:text-red-500 p-1">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

    </div>

      {/* Centered modal met overlay */}
      {edit && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} onClick={() => setEdit(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-800">Taak bewerken</h3>

            <div>
              <label className="label">Taak</label>
              <input
                type="text"
                className="input"
                value={edit.titel}
                onChange={(e) => setEdit((p) => p && ({ ...p, titel: e.target.value }))}
                autoFocus
              />
            </div>

            <div>
              <label className="label">Notitie</label>
              <textarea
                className="input resize-none"
                rows={3}
                placeholder="Optionele notitie..."
                value={edit.notitie}
                onChange={(e) => setEdit((p) => p && ({ ...p, notitie: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Deadline</label>
                <input
                  type="date"
                  className="input"
                  value={edit.deadline}
                  onChange={(e) => setEdit((p) => p && ({ ...p, deadline: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Claimen</label>
                <select
                  className="input"
                  value={edit.geclaimd_door}
                  onChange={(e) => setEdit((p) => p && ({ ...p, geclaimd_door: e.target.value }))}
                >
                  <option value="">— Niemand —</option>
                  {PERSONEN.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={handleOpslaan} className="btn-primary flex-1">Opslaan</button>
              <button onClick={() => setEdit(null)} className="btn-secondary flex-1">Annuleren</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
