"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Layout,
  Link2,
  Search,
  Receipt,
  Calendar,
  ArrowUpRight,
  CalendarPlus,
  Wallet,
} from "lucide-react";

interface DashboardData {
  financien: { inkomsten: number; uitgaven: number; vorigeInkomsten: number };
  content: {
    gepubliceerd: number;
    gepland: number;
    concept: number;
    aankomend: { titel: string; publicatiedatum: string; categorie: string | null }[];
  };
  affiliate: { aantalLinks: number };
  zoekwoorden: { aantal: number };
  recenteTransacties: { datum: string; omschrijving: string; bedrag: number; type: string; categorie: string }[];
}

function euro(n: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

function Trend({ huidig, vorig }: { huidig: number; vorig: number }) {
  if (vorig === 0) return null;
  const pct = Math.round(((huidig - vorig) / vorig) * 100);
  const pos = pct >= 0;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${pos ? "text-[#2D6A4F]" : "text-[#E05252]"}`}>
      {pos ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
      {Math.abs(pct)}% t.o.v. vorige maand
    </span>
  );
}

const maanden = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

export default function HomePage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const nu = new Date();

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => { if (d.success) setData(d.data); });
  }, []);

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64 text-muted text-sm">
        Laden...
      </div>
    );
  }

  const { financien, content, affiliate, zoekwoorden, recenteTransacties } = data;
  const winst = financien.inkomsten - financien.uitgaven;

  return (
    <div className="max-w-5xl space-y-10">
      {/* Header */}
      <div>
        <h1 className="page-title mb-1">Goedemorgen</h1>
        <p className="text-muted text-sm">
          {nu.getDate()} {maanden[nu.getMonth()]} {nu.getFullYear()} · Tribe Marketing Dashboard
        </p>
      </div>

      {/* Financiën KPIs */}
      <div>
        <p className="section-label mb-4">Deze maand</p>
        <div className="grid grid-cols-3 gap-5">
          <div className="card card-hover relative overflow-hidden" style={{ paddingTop: 24 }}>
            <div className="absolute top-0 left-0 right-0" style={{ height: 3, backgroundColor: "#2D6A4F" }} />
            <p className="card-title mb-2">Inkomsten</p>
            <p className="kpi-value">{euro(financien.inkomsten)}</p>
            <div className="mt-2"><Trend huidig={financien.inkomsten} vorig={financien.vorigeInkomsten} /></div>
          </div>
          <div className="card card-hover relative overflow-hidden" style={{ paddingTop: 24 }}>
            <div className="absolute top-0 left-0 right-0" style={{ height: 3, backgroundColor: "#E05252" }} />
            <p className="card-title mb-2">Uitgaven</p>
            <p className="kpi-value">{euro(financien.uitgaven)}</p>
          </div>
          <div className="card card-hover relative overflow-hidden" style={{ paddingTop: 24 }}>
            <div className="absolute top-0 left-0 right-0" style={{ height: 3, backgroundColor: "#004BAD" }} />
            <p className="card-title mb-2">Winst</p>
            <p className="kpi-value" style={{ color: winst >= 0 ? "#1A1A1A" : "#E05252" }}>{euro(winst)}</p>
          </div>
        </div>
      </div>

      {/* Content & overige stats */}
      <div>
        <p className="section-label mb-4">Overzicht</p>
        <div className="grid grid-cols-4 gap-5">
          {[
            { href: "/content", icon: Layout, label: "Gepubliceerd", value: content.gepubliceerd, sub: `${content.gepland} gepland · ${content.concept} concept` },
            { href: "/content", icon: Link2, label: "Affiliate links", value: affiliate.aantalLinks, sub: "actieve links" },
            { href: "/content", icon: Search, label: "Zoekwoorden", value: zoekwoorden.aantal, sub: "opgeslagen" },
            { href: "/financien", icon: Receipt, label: "Transacties", value: recenteTransacties.length, sub: "recent" },
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <Link key={i} href={stat.href} className="card card-hover">
                <div className="flex items-center justify-between mb-3">
                  <span className="flex items-center justify-center rounded-lg" style={{ width: 34, height: 34, backgroundColor: "#e6eefa" }}>
                    <Icon size={17} style={{ color: "#004BAD" }} />
                  </span>
                </div>
                <p className="kpi-value" style={{ fontSize: 24 }}>{stat.value}</p>
                <p className="card-title mt-1.5" style={{ textTransform: "none", letterSpacing: 0, fontSize: 12 }}>{stat.label}</p>
                <p className="text-xs text-muted mt-0.5">{stat.sub}</p>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Aankomende content + recente transacties */}
      <div className="grid grid-cols-2 gap-6">
        {/* Aankomende content */}
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <h2 className="card-title mb-0">Aankomende content</h2>
            <Link href="/content" className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: "#004BAD" }}>
              Alles <ArrowUpRight size={13} />
            </Link>
          </div>
          {content.aankomend.length === 0 ? (
            <p className="text-sm text-muted">Geen geplande content.</p>
          ) : (
            <div className="space-y-4">
              {content.aankomend.map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="flex items-center justify-center rounded-lg shrink-0" style={{ width: 38, height: 38, backgroundColor: "#e6eefa" }}>
                    <Calendar size={16} style={{ color: "#004BAD" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{item.titel}</p>
                    <p className="text-xs text-muted">
                      {item.publicatiedatum
                        ? `${new Date(item.publicatiedatum).getDate()} ${maanden[new Date(item.publicatiedatum).getMonth()]}`
                        : "—"}
                      {item.categorie ? ` · ${item.categorie}` : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recente transacties */}
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <h2 className="card-title mb-0">Recente transacties</h2>
            <Link href="/financien" className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: "#004BAD" }}>
              Alles <ArrowUpRight size={13} />
            </Link>
          </div>
          {recenteTransacties.length === 0 ? (
            <p className="text-sm text-muted">Geen transacties gevonden.</p>
          ) : (
            <div className="space-y-4">
              {recenteTransacties.map((t, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{t.omschrijving || t.categorie}</p>
                    <p className="text-xs text-muted">{new Date(t.datum).toLocaleDateString("nl-NL")}</p>
                  </div>
                  <span className="text-sm font-semibold shrink-0" style={{ color: t.type === "inkomsten" ? "#2D6A4F" : "#E05252" }}>
                    {t.type === "inkomsten" ? "+" : "-"}{euro(t.bedrag)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Snelkoppelingen */}
      <div>
        <p className="section-label mb-4">Snelkoppelingen</p>
        <div className="grid grid-cols-4 gap-4">
          {[
            { href: "/content", label: "Content plannen", icon: CalendarPlus },
            { href: "/content?tab=zoekwoorden", label: "Zoekwoord zoeken", icon: Search },
            { href: "/financien", label: "Transactie toevoegen", icon: Wallet },
            { href: "/content?tab=affiliate", label: "Affiliate link", icon: Link2 },
          ].map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.label}
                href={link.href}
                className="card card-hover flex items-center gap-3"
              >
                <span className="flex items-center justify-center rounded-lg shrink-0" style={{ width: 34, height: 34, backgroundColor: "#e6eefa" }}>
                  <Icon size={17} style={{ color: "#004BAD" }} />
                </span>
                <span className="text-sm font-medium text-ink">{link.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
