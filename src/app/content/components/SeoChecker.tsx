"use client";

import { useState } from "react";
import Link from "next/link";

interface Check {
  naam: string;
  categorie: "Technisch" | "Content" | "Sociaal" | "Structuur";
  status: "goed" | "waarschuwing" | "fout";
  waarde?: string;
  beschrijving: string;
  tip?: string;
}

interface SeoResultaat {
  url: string;
  score: number;
  checks: Check[];
}

const statusConfig = {
  goed:       { icoon: "✓", kleur: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", label: "Goed" },
  waarschuwing: { icoon: "!", kleur: "text-amber-700",   bg: "bg-amber-50",   border: "border-amber-200",   label: "Verbeteren" },
  fout:       { icoon: "✕", kleur: "text-red-700",     bg: "bg-red-50",     border: "border-red-200",     label: "Fout" },
};

const categorieVolgorde: Check["categorie"][] = ["Technisch", "Content", "Structuur", "Sociaal"];
const categorieIcoon: Record<string, string> = {
  Technisch: "⚙️",
  Content: "📄",
  Structuur: "🏗️",
  Sociaal: "🔗",
};

function ScoreRing({ score }: { score: number }) {
  const kleur = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444";
  const radius = 40;
  const omtrek = 2 * Math.PI * radius;
  const gevuld = (score / 100) * omtrek;

  return (
    <div className="relative flex items-center justify-center w-28 h-28">
      <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="10" />
        <circle
          cx="50" cy="50" r={radius}
          fill="none"
          stroke={kleur}
          strokeWidth="10"
          strokeDasharray={`${gevuld} ${omtrek - gevuld}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-2xl font-bold" style={{ color: kleur }}>{score}</p>
        <p className="text-xs text-gray-400 font-medium">/100</p>
      </div>
    </div>
  );
}

function CheckKaart({ check }: { check: Check }) {
  const [tipOpen, setTipOpen] = useState(false);
  const cfg = statusConfig[check.status];

  return (
    <div className={`rounded-xl border p-4 ${cfg.bg} ${cfg.border}`}>
      <div className="flex items-start gap-3">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
          check.status === "goed" ? "bg-emerald-200 text-emerald-800" :
          check.status === "waarschuwing" ? "bg-amber-200 text-amber-800" :
          "bg-red-200 text-red-800"
        }`}>
          {cfg.icoon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className={`font-semibold text-sm ${cfg.kleur}`}>{check.naam}</p>
            {check.tip && (
              <button
                onClick={() => setTipOpen(!tipOpen)}
                className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${
                  tipOpen ? "bg-brand-600 text-white" : "bg-white/80 text-gray-600 hover:bg-white"
                }`}
              >
                {tipOpen ? "Tip verbergen" : "💡 Tip"}
              </button>
            )}
          </div>
          {check.waarde && (
            <p className={`text-xs font-mono mt-1 ${cfg.kleur} opacity-80`}>{check.waarde}</p>
          )}
          <p className={`text-xs mt-1 ${cfg.kleur} opacity-75`}>{check.beschrijving}</p>
          {tipOpen && check.tip && (
            <div className="mt-3 p-3 bg-white/80 rounded-lg border border-white text-xs text-gray-700 leading-relaxed">
              <span className="font-semibold text-brand-600">Tip: </span>{check.tip}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SeoChecker() {
  const [url, setUrl] = useState("");
  const [laden, setLaden] = useState(false);
  const [resultaat, setResultaat] = useState<SeoResultaat | null>(null);
  const [fout, setFout] = useState<string | null>(null);

  async function handleAnalyse(e: React.FormEvent) {
    e.preventDefault();
    setLaden(true);
    setFout(null);
    setResultaat(null);

    let analyseUrl = url.trim();
    if (!analyseUrl.startsWith("http")) analyseUrl = "https://" + analyseUrl;

    try {
      const res = await fetch("/api/seo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: analyseUrl }),
      });
      const data = await res.json();
      if (data.success) setResultaat(data.data);
      else setFout(data.error || "Analyse mislukt");
    } catch {
      setFout("Verbindingsfout");
    } finally {
      setLaden(false);
    }
  }

  const aantalGoed = resultaat?.checks.filter(c => c.status === "goed").length ?? 0;
  const aantalWaarschuwing = resultaat?.checks.filter(c => c.status === "waarschuwing").length ?? 0;
  const aantalFout = resultaat?.checks.filter(c => c.status === "fout").length ?? 0;

  return (
    <div className="max-w-3xl space-y-6">
      {/* Formulier */}
      <div className="card">
        <h2 className="section-title">SEO Analyse</h2>
        <form onSubmit={handleAnalyse} className="flex gap-3">
          <input
            type="text"
            className="input flex-1"
            placeholder="https://jouwsite.nl/pagina"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
          />
          <button type="submit" disabled={laden} className="btn-primary whitespace-nowrap">
            {laden ? "Analyseren…" : "Analyseer"}
          </button>
        </form>
        <p className="text-xs text-gray-400 mt-2">
          Voeg een Google PageSpeed API key toe in{" "}
          <Link href="/instellingen" className="text-brand-600 hover:underline">Instellingen</Link>{" "}
          voor Lighthouse-scores en uitgebreide laadtijddata.
        </p>
      </div>

      {laden && (
        <div className="card text-center py-10">
          <div className="inline-block w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-gray-500 text-sm">Pagina ophalen en analyseren…</p>
        </div>
      )}

      {fout && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          ✕ {fout}
        </div>
      )}

      {resultaat && (
        <>
          {/* Score overzicht */}
          <div className="card flex items-center gap-8">
            <ScoreRing score={resultaat.score} />
            <div className="flex-1">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">SEO Score</p>
              <p className="font-medium text-gray-700 text-sm break-all mb-4">{resultaat.url}</p>
              <div className="flex gap-4">
                <div className="text-center">
                  <p className="text-xl font-bold text-emerald-600">{aantalGoed}</p>
                  <p className="text-xs text-gray-400">Goed</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-amber-500">{aantalWaarschuwing}</p>
                  <p className="text-xs text-gray-400">Verbeteren</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-red-500">{aantalFout}</p>
                  <p className="text-xs text-gray-400">Fout</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-gray-700">{resultaat.checks.length}</p>
                  <p className="text-xs text-gray-400">Totaal</p>
                </div>
              </div>
            </div>
          </div>

          {/* Checks per categorie */}
          {categorieVolgorde.map((cat) => {
            const checksInCat = resultaat.checks.filter(c => c.categorie === cat);
            if (checksInCat.length === 0) return null;
            const goedInCat = checksInCat.filter(c => c.status === "goed").length;
            return (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-3">
                  <span>{categorieIcoon[cat]}</span>
                  <h3 className="font-bold text-sm text-gray-700">{cat}</h3>
                  <span className="text-xs text-gray-400">({goedInCat}/{checksInCat.length} goed)</span>
                </div>
                <div className="space-y-2">
                  {checksInCat.map(check => (
                    <CheckKaart key={check.naam} check={check} />
                  ))}
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
