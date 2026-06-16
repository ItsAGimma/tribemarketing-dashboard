"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface LogRegel {
  id: number;
  actie: string;
  tabel: string;
  record_id: string;
  omschrijving: string;
  door: string;
  aangemaakt_op: string;
}

const ACTIE_STIJL: Record<string, string> = {
  aangemaakt: "bg-green-50 text-green-700",
  bewerkt: "bg-blue-50 text-blue-700",
  verwijderd: "bg-red-50 text-red-600",
};

const TABEL_LABEL: Record<string, string> = {
  transacties: "Financiën",
  content_kalender: "Content",
  affiliate_links: "Affiliate",
  facturen: "Facturen",
  zakelijke_kosten: "Zakelijke kosten",
  onttrekkingen: "Onttrekkingen",
  kilometers: "Kilometers",
  zoekwoorden: "Zoekwoorden",
};

export default function AuditLogPage() {
  const [log, setLog] = useState<LogRegel[]>([]);
  const [laden, setLaden] = useState(true);
  const [filter, setFilter] = useState<string>("alle");

  useEffect(() => {
    fetch("/api/audit-log")
      .then((r) => r.json())
      .then((d) => { if (d.success) setLog(d.data); setLaden(false); });
  }, []);

  const gefilterd = filter === "alle" ? log : log.filter((r) => r.tabel === filter);
  const tabellen = [...new Set(log.map((r) => r.tabel))];

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/instellingen" className="flex items-center gap-1.5 text-sm text-muted hover:text-ink">
          <ArrowLeft size={15} /> Instellingen
        </Link>
      </div>

      <div>
        <h1 className="page-title">Audit log</h1>
        <p className="text-sm text-muted mt-1">Alle wijzigingen in het dashboard, gesorteerd op nieuwste eerst.</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter("alle")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${filter === "alle" ? "bg-[#004BAD] text-white border-[#004BAD]" : "bg-white text-muted border-hairline"}`}
        >
          Alles ({log.length})
        </button>
        {tabellen.map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${filter === t ? "bg-[#004BAD] text-white border-[#004BAD]" : "bg-white text-muted border-hairline"}`}
          >
            {TABEL_LABEL[t] || t}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        {laden ? (
          <p className="text-sm text-muted p-4">Laden...</p>
        ) : gefilterd.length === 0 ? (
          <p className="text-sm text-muted p-4">Geen activiteit gevonden.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-hairline">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Wanneer</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Actie</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Sectie</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Omschrijving</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Door</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {gefilterd.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 text-muted whitespace-nowrap">
                    {new Date(r.aangemaakt_op).toLocaleString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${ACTIE_STIJL[r.actie] || "bg-gray-100 text-gray-600"}`}>
                      {r.actie}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">{TABEL_LABEL[r.tabel] || r.tabel}</td>
                  <td className="px-4 py-3 text-ink">{r.omschrijving || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${r.door === "Luciano" ? "bg-[#e6eefa] text-[#004BAD]" : "bg-purple-50 text-purple-700"}`}>
                      {r.door}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
