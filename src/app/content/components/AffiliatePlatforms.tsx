"use client";

import { useEffect, useState } from "react";
import { Trash2, Pause, Play, ExternalLink } from "lucide-react";

interface Platform {
  id: number;
  naam: string;
  url: string | null;
  commissie_percentage: number | null;
  actief: boolean;
}

const leeg = { naam: "", url: "", commissie_percentage: "" };

export default function AffiliatePlatforms() {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [formulier, setFormulier] = useState(leeg);
  const [toonFormulier, setToonFormulier] = useState(false);
  const [opslaan, setOpslaan] = useState(false);

  useEffect(() => { laad(); }, []);

  async function laad() {
    const res = await fetch("/api/affiliate-platforms");
    const data = await res.json();
    if (data.success) setPlatforms(data.data);
  }

  async function handleToevoegen(e: React.FormEvent) {
    e.preventDefault();
    setOpslaan(true);
    try {
      await fetch("/api/affiliate-platforms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          naam: formulier.naam,
          url: formulier.url,
          commissie_percentage: formulier.commissie_percentage ? parseFloat(formulier.commissie_percentage) : null,
        }),
      });
      setFormulier(leeg);
      setToonFormulier(false);
      await laad();
    } finally {
      setOpslaan(false);
    }
  }

  async function handleToggle(platform: Platform) {
    setPlatforms((prev) => prev.map((p) => p.id === platform.id ? { ...p, actief: !p.actief } : p));
    await fetch("/api/affiliate-platforms", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: platform.id, actief: !platform.actief }),
    });
  }

  async function handleVerwijder(id: number) {
    setPlatforms((prev) => prev.filter((p) => p.id !== id));
    await fetch("/api/affiliate-platforms", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  }

  const actief = platforms.filter((p) => p.actief);
  const gepauzeerd = platforms.filter((p) => !p.actief);

  return (
    <>
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">{actief.length} actief · {gepauzeerd.length} gepauzeerd</p>
        <button onClick={() => setToonFormulier(true)} className="btn-primary">
          + Platform toevoegen
        </button>
      </div>

      {platforms.length === 0 && (
        <div className="card text-center py-10">
          <p className="text-muted text-sm">Nog geen platforms toegevoegd.</p>
        </div>
      )}

      {platforms.length > 0 && (
        <div className="space-y-2">
          {platforms.map((platform) => (
            <div
              key={platform.id}
              className={`flex items-center gap-4 px-4 py-3 bg-white rounded-xl border shadow-sm ${
                platform.actief ? "border-gray-100" : "border-gray-100 opacity-60"
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-ink">{platform.naam}</span>
                  {platform.actief ? (
                    <span className="text-xs font-medium px-1.5 py-0.5 rounded-md bg-green-50 text-green-700">Actief</span>
                  ) : (
                    <span className="text-xs font-medium px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-500">Gepauzeerd</span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  {platform.commissie_percentage != null && (
                    <span className="text-xs text-muted">{platform.commissie_percentage}% commissie</span>
                  )}
                  {platform.url && (
                    <a
                      href={platform.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-brand-500 hover:underline"
                    >
                      <ExternalLink size={10} />
                      {new URL(platform.url).hostname}
                    </a>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleToggle(platform)}
                  title={platform.actief ? "Pauzeren" : "Activeren"}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  {platform.actief ? <Pause size={15} /> : <Play size={15} />}
                </button>
                <button
                  onClick={() => handleVerwijder(platform.id)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>

    {/* Modal */}
    {toonFormulier && (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} onClick={() => { setToonFormulier(false); setFormulier(leeg); }}>
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
          <h3 className="font-semibold text-gray-800 mb-5">Nieuw platform</h3>
          <form onSubmit={handleToevoegen} className="space-y-4">
            <div>
              <label className="label">Naam <span className="text-red-400">*</span></label>
              <input
                type="text"
                className="input"
                placeholder="bijv. Bol.com, Amazon, Coolblue"
                value={formulier.naam}
                onChange={(e) => setFormulier((p) => ({ ...p, naam: e.target.value }))}
                required
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">URL (optioneel)</label>
                <input
                  type="url"
                  className="input"
                  placeholder="https://..."
                  value={formulier.url}
                  onChange={(e) => setFormulier((p) => ({ ...p, url: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Commissie %</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  className="input"
                  placeholder="bijv. 8.5"
                  value={formulier.commissie_percentage}
                  onChange={(e) => setFormulier((p) => ({ ...p, commissie_percentage: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={opslaan} className="btn-primary flex-1">
                {opslaan ? "Opslaan..." : "Toevoegen"}
              </button>
              <button type="button" onClick={() => { setToonFormulier(false); setFormulier(leeg); }} className="btn-secondary flex-1">
                Annuleren
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
    </>
  );
}
