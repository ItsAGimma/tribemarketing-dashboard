"use client";

import { useEffect, useState, useRef } from "react";
import { Trash2 } from "lucide-react";

interface Taak {
  id: number;
  titel: string;
  voltooid: boolean;
  aangemaakt_op: string;
}

export default function TakenPage() {
  const [taken, setTaken] = useState<Taak[]>([]);
  const [nieuw, setNieuw] = useState("");
  const [laden, setLaden] = useState(false);
  const [filter, setFilter] = useState<"alle" | "open" | "voltooid">("alle");
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
    await fetch("/api/taken", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
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
            <div key={taak.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 group">
              <button
                onClick={() => handleToggle(taak)}
                className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                  taak.voltooid
                    ? "bg-[#004BAD] border-[#004BAD]"
                    : "border-gray-300 hover:border-[#004BAD]"
                }`}
              >
                {taak.voltooid && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
              <span className={`flex-1 text-sm ${taak.voltooid ? "line-through text-gray-400" : "text-ink"}`}>
                {taak.titel}
              </span>
              <button
                onClick={() => handleVerwijder(taak.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 p-1"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
