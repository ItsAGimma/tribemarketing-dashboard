"use client";

import { useEffect, useState, useRef } from "react";
import { Trash2, Pencil } from "lucide-react";

const PERSONEN = ["Luciano", "Jolien"] as const;

interface Taak {
  id: number;
  titel: string;
  voltooid: boolean;
  deadline: string | null;
  geclaimd_door: string | null;
  aangemaakt_op: string;
}

interface EditState {
  id: number;
  titel: string;
  deadline: string;
  geclaimd_door: string;
}

export default function TakenPage() {
  const [taken, setTaken] = useState<Taak[]>([]);
  const [nieuw, setNieuw] = useState("");
  const [laden, setLaden] = useState(false);
  const [filter, setFilter] = useState<"alle" | "open" | "voltooid">("alle");
  const [edit, setEdit] = useState<EditState | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => { laad(); }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setEdit(null);
      }
    }
    if (edit) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [edit]);

  async function laad() {
    const res = await fetch("/api/taken");
    const data = await res.json();
    if (data.success) setTaken(data.data);
  }

  async function handleToevoegen(e: React.FormEvent) {
    e.preventDefault();
    if (!nieuw.trim() || laden) return;
    setLaden(true);
    await fetch("/api/taken", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titel: nieuw }),
    });
    setNieuw("");
    await laad();
    setLaden(false);
    inputRef.current?.focus();
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
    });
  }

  const gefilterd = taken.filter((t) =>
    filter === "alle" ? true : filter === "open" ? !t.voltooid : t.voltooid
  );
  const aantalOpen = taken.filter((t) => !t.voltooid).length;

  return (
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

      <div className="card divide-y divide-gray-50">
        {gefilterd.length === 0 ? (
          <p className="text-center text-gray-400 py-8 text-sm">
            {filter === "open" ? "Geen openstaande taken." : filter === "voltooid" ? "Nog niets voltooid." : "Geen taken."}
          </p>
        ) : (
          gefilterd.map((taak) => (
            <div key={taak.id} className="relative">
              <div className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 group">
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
                  <div className="flex items-center gap-2 mt-0.5">
                    {taak.deadline && (
                      <span className="text-xs text-muted">
                        📅 {new Date(taak.deadline).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}
                      </span>
                    )}
                    {taak.geclaimd_door && (
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${
                        taak.geclaimd_door === "Luciano" ? "bg-blue-50 text-[#004BAD]" : "bg-purple-50 text-purple-700"
                      }`}>
                        {taak.geclaimd_door}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEdit(taak)}
                    className="text-gray-400 hover:text-[#004BAD] p-1"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleVerwijder(taak.id)}
                    className="text-gray-400 hover:text-red-500 p-1"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Inline dropdown */}
              {edit?.id === taak.id && (
                <div
                  ref={dropdownRef}
                  className="absolute right-0 z-20 w-72 bg-white rounded-xl border border-gray-200 shadow-lg p-4 space-y-3"
                  style={{ top: "calc(100% - 4px)" }}
                >
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
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setEdit((p) => p && ({ ...p, geclaimd_door: p.geclaimd_door === "Luciano" ? "" : "Luciano" }))}
                        className={`flex-1 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                          edit.geclaimd_door === "Luciano"
                            ? "bg-[#004BAD] text-white border-[#004BAD]"
                            : "bg-white text-gray-600 border-gray-200 hover:border-[#004BAD]"
                        }`}
                      >
                        Luciano
                      </button>
                      <button
                        type="button"
                        onClick={() => setEdit((p) => p && ({ ...p, geclaimd_door: p.geclaimd_door === "Jolien" ? "" : "Jolien" }))}
                        className={`flex-1 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                          edit.geclaimd_door === "Jolien"
                            ? "bg-purple-600 text-white border-purple-600"
                            : "bg-white text-gray-600 border-gray-200 hover:border-purple-400"
                        }`}
                      >
                        Jolien
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={handleOpslaan} className="btn-primary flex-1 text-sm py-1.5">
                      Opslaan
                    </button>
                    <button onClick={() => setEdit(null)} className="btn-secondary flex-1 text-sm py-1.5">
                      Annuleren
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
