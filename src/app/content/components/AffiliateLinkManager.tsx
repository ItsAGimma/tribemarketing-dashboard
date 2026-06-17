"use client";

import { useState, useEffect } from "react";
import KpiCard from "@/components/KpiCard";
import { logActie } from "@/lib/audit";

interface Artikel {
  id: number;
  affiliate_link_id: number;
  titel: string;
  url: string;
}

interface AffiliateLink {
  id: number;
  naam: string;
  url: string;
  platform: string | null;
  categorie: string | null;
  notities: string | null;
  aangemaakt_op: string;
  artikelen: Artikel[];
}

const lege = { naam: "", url: "", platform: "", categorie: "", notities: "", toegevoegd_door: "" };
const leegArtikel = { titel: "", url: "" };

export default function AffiliateLinkManager() {
  const [links, setLinks] = useState<AffiliateLink[]>([]);
  const [formulier, setFormulier] = useState(lege);
  const [toonFormulier, setToonFormulier] = useState(false);
  const [zoek, setZoek] = useState("");
  const [uitgeklapt, setUitgeklapt] = useState<number | null>(null);
  const [artikelFormulier, setArtikelFormulier] = useState<{ linkId: number | null } & typeof leegArtikel>({ linkId: null, ...leegArtikel });

  useEffect(() => { laad(); }, []);

  async function laad() {
    const res = await fetch("/api/affiliate-links");
    const data = await res.json();
    if (data.success) setLinks(data.data);
  }

  async function handleOpslaan(e: React.FormEvent) {
    e.preventDefault();
    if (!formulier.toegevoegd_door) return;
    const res = await fetch("/api/affiliate-links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formulier),
    });
    const json = await res.json();
    await logActie("aangemaakt", "affiliate_links", json.id ?? "", formulier.naam, formulier.toegevoegd_door);
    setFormulier(lege);
    setToonFormulier(false);
    laad();
  }

  async function handleVerwijder(id: number) {
    if (!confirm("Affiliate link verwijderen? Gekoppelde artikelen worden ook verwijderd.")) return;
    const link = links.find((l) => l.id === id);
    await fetch("/api/affiliate-links", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await logActie("verwijderd", "affiliate_links", id, link?.naam || String(id));
    laad();
  }

  async function handleArtikelToevoegen(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/affiliate-links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "artikel_toevoegen",
        affiliate_link_id: artikelFormulier.linkId,
        titel: artikelFormulier.titel,
        url: artikelFormulier.url,
      }),
    });
    setArtikelFormulier({ linkId: null, ...leegArtikel });
    laad();
  }

  async function handleArtikelVerwijder(artikel_id: number) {
    await fetch("/api/affiliate-links", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ artikel_id }),
    });
    laad();
  }

  const gefilterd = links.filter(
    (l) =>
      l.naam.toLowerCase().includes(zoek.toLowerCase()) ||
      (l.platform || "").toLowerCase().includes(zoek.toLowerCase()) ||
      (l.categorie || "").toLowerCase().includes(zoek.toLowerCase())
  );

  return (
    <>
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <input
          type="text"
          className="input max-w-xs"
          placeholder="Zoek op naam, platform of categorie..."
          value={zoek}
          onChange={(e) => setZoek(e.target.value)}
        />
        <button onClick={() => setToonFormulier(true)} className="btn-primary">
          + Link toevoegen
        </button>
      </div>

      {/* Overzicht statistieken */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <KpiCard label="Totaal links" value={String(links.length)} accent="#004BAD" />
        <KpiCard label="Gekoppelde artikelen" value={String(links.reduce((s, l) => s + l.artikelen.length, 0))} accent="#7c3aed" />
        <div className="card card-hover relative overflow-hidden" style={{ paddingTop: 24 }}>
          <div className="absolute top-0 left-0 right-0" style={{ height: 3, backgroundColor: "#D1D5DB" }} />
          <p className="card-title mb-2">Clicks &amp; CTR</p>
          <p className="text-sm font-medium text-muted mt-1">API-koppeling volgt</p>
        </div>
      </div>

      {/* Links lijst */}
      <div className="space-y-3">
        {gefilterd.length === 0 ? (
          <div className="card p-8 text-center text-gray-400">Geen affiliate links gevonden.</div>
        ) : gefilterd.map((link) => (
          <div key={link.id} className="card p-0 overflow-hidden">
            <div
              className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
              onClick={() => setUitgeklapt(uitgeklapt === link.id ? null : link.id)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-semibold text-[#0f172a]">{link.naam}</p>
                  {link.platform && <span className="badge bg-brand-50 text-brand-600">{link.platform}</span>}
                  {link.categorie && <span className="badge bg-gray-100 text-gray-600">{link.categorie}</span>}
                </div>
                <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-500 hover:underline truncate block max-w-lg" onClick={(e) => e.stopPropagation()}>
                  {link.url}
                </a>
                {link.notities && <p className="text-xs text-gray-400 mt-0.5">{link.notities}</p>}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs text-gray-400">{link.artikelen.length} {link.artikelen.length === 1 ? "artikel" : "artikelen"}</span>
                <span className="text-gray-300 text-sm">{uitgeklapt === link.id ? "▲" : "▼"}</span>
                <button onClick={(e) => { e.stopPropagation(); handleVerwijder(link.id); }} className="btn-danger py-1 px-2 text-xs">🗑️</button>
              </div>
            </div>

            {uitgeklapt === link.id && (
              <div className="border-t border-gray-100 bg-gray-50/50 p-4 space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-[#0f172a] mb-2">Gekoppelde artikelen</h4>
                  {link.artikelen.length === 0 ? (
                    <p className="text-sm text-gray-400">Nog geen artikelen gekoppeld.</p>
                  ) : (
                    <div className="space-y-2 mb-3">
                      {link.artikelen.map((artikel) => (
                        <div key={artikel.id} className="flex items-center gap-3 bg-white rounded-xl px-3 py-2 border border-gray-100">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#0f172a]">{artikel.titel}</p>
                            <a href={artikel.url} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-500 hover:underline truncate block">{artikel.url}</a>
                          </div>
                          <button onClick={() => handleArtikelVerwijder(artikel.id)} className="text-gray-300 hover:text-red-400 text-lg leading-none shrink-0">×</button>
                        </div>
                      ))}
                    </div>
                  )}
                  {artikelFormulier.linkId === link.id ? (
                    <form onSubmit={handleArtikelToevoegen} className="flex gap-2 items-end">
                      <div className="flex-1">
                        <label className="label text-xs">Artikel titel</label>
                        <input type="text" className="input text-sm py-2" placeholder="bijv. De beste hotels in Barcelona" value={artikelFormulier.titel} onChange={(e) => setArtikelFormulier((p) => ({ ...p, titel: e.target.value }))} required autoFocus />
                      </div>
                      <div className="flex-1">
                        <label className="label text-xs">Artikel URL</label>
                        <input type="url" className="input text-sm py-2" placeholder="https://traveltribe.life/..." value={artikelFormulier.url} onChange={(e) => setArtikelFormulier((p) => ({ ...p, url: e.target.value }))} required />
                      </div>
                      <button type="submit" className="btn-primary text-sm py-2">Koppelen</button>
                      <button type="button" onClick={() => setArtikelFormulier({ linkId: null, ...leegArtikel })} className="btn-secondary text-sm py-2">Annuleer</button>
                    </form>
                  ) : (
                    <button onClick={() => setArtikelFormulier({ linkId: link.id, ...leegArtikel })} className="text-sm text-brand-600 hover:text-brand-700 font-medium">+ Artikel koppelen</button>
                  )}
                </div>
                <div className="border-t border-gray-100 pt-3">
                  <h4 className="text-sm font-semibold text-[#0f172a] mb-2">Prestaties</h4>
                  <div className="grid grid-cols-3 gap-3">
                    {["Clicks", "Impressies", "CTR"].map((label) => (
                      <div key={label} className="bg-white rounded-xl border border-gray-100 p-3 text-center">
                        <p className="text-xs text-gray-400 mb-1">{label}</p>
                        <p className="text-sm font-medium text-gray-300">—</p>
                        <p className="text-xs text-gray-300 mt-0.5">API volgt</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>

    {/* Modal */}
    {toonFormulier && (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} onClick={() => setToonFormulier(false)}>
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
          <h3 className="font-semibold text-gray-800 mb-5">Nieuwe affiliate link</h3>
          <form onSubmit={handleOpslaan} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Naam</label>
              <input type="text" className="input" placeholder="bijv. Booking.com partner" value={formulier.naam} onChange={(e) => setFormulier((p) => ({ ...p, naam: e.target.value }))} required autoFocus />
            </div>
            <div>
              <label className="label">Platform</label>
              <input type="text" className="input" placeholder="bijv. Booking.com" value={formulier.platform} onChange={(e) => setFormulier((p) => ({ ...p, platform: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="label">Affiliate URL</label>
              <input type="url" className="input" placeholder="https://affiliate.booking.com/..." value={formulier.url} onChange={(e) => setFormulier((p) => ({ ...p, url: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Categorie</label>
              <input type="text" className="input" placeholder="bijv. Hotels, Vluchten" value={formulier.categorie} onChange={(e) => setFormulier((p) => ({ ...p, categorie: e.target.value }))} />
            </div>
            <div>
              <label className="label">Notities</label>
              <input type="text" className="input" placeholder="bijv. 4% commissie" value={formulier.notities} onChange={(e) => setFormulier((p) => ({ ...p, notities: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="label">Ingevoerd door <span className="text-red-400">*</span></label>
              <select className="input" value={formulier.toegevoegd_door} onChange={(e) => setFormulier((p) => ({ ...p, toegevoegd_door: e.target.value }))}>
                <option value="">Selecteer persoon...</option>
                <option value="Luciano">Luciano</option>
                <option value="Jolien">Jolien</option>
              </select>
            </div>
            <div className="col-span-2 flex gap-3 pt-1">
              <button type="submit" className="btn-primary flex-1" disabled={!formulier.toegevoegd_door}>Toevoegen</button>
              <button type="button" onClick={() => setToonFormulier(false)} className="btn-secondary flex-1">Annuleren</button>
            </div>
          </form>
        </div>
      </div>
    )}
    </>
  );
}
