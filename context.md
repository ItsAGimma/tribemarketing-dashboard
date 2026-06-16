# Tribe Marketing Dashboard — Context

## Wat is dit?
Een lokaal marketing- en bedrijfsdashboard voor **Tribe Marketing** (niet TravelTribe).
Draait op `localhost:3000`. Alle tekst is in het **Nederlands**.

## Tech stack
| | |
|---|---|
| Framework | Next.js 14.2.5, App Router |
| Styling | Tailwind CSS + custom utility classes in `globals.css` |
| Database | SQLite via `better-sqlite3` v11.10.0 (v9.x werkt niet op Node 24) |
| Grafieken | Recharts |
| Config | `next.config.mjs` (niet .ts of .js — Next 14 vereist .mjs voor ESM) |

## Starten
```
cd /Users/lucianodejong/Desktop/luciano-dashboard
npm run dev
```

---

## Structuur

```
src/
  app/
    content/          ✍️  Content Hub (kalender, SEO, zoekwoorden, affiliates)
    analytics/        📊  Analytics (Pinterest, Facebook, TikTok)
    financien/        💰  Financiën (inkomsten/uitgaven, rekening-veld)
    belastingen/      🧾  Belastingen (zakelijke kosten, BTW, facturen, jaaroverzicht, km)
    instellingen/     ⚙️  API-sleutels en instellingen
    api/              API routes (Next.js route handlers)
  components/
    Navigation.tsx    Sidebar navigatie
  lib/
    db.ts             Alle database-logica (SQLite, tabellen, queries)
```

---

## Huisstijl
Gebaseerd op **tribemarketing.nl**.

| Element | Waarde |
|---|---|
| Sidebar achtergrond | `#0f172a` (navy) |
| Accent kleur | `#2563eb` (brand-600, blauw) |
| Font | Inter (via CSS @import Google Fonts) |
| Kaarten | `.card` → `rounded-2xl`, `border`, `shadow-sm` |

Tailwind custom kleuren: `brand-50` t/m `brand-900`, `navy-700/800/900`.
Custom utility classes staan in `src/app/globals.css`: `.card`, `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.input`, `.label`, `.badge`, `.section-title`, `.page-title`.

---

## Database tabellen (`src/lib/db.ts`)

| Tabel | Doel |
|---|---|
| `instellingen` | Key-value store voor alle API-sleutels en instellingen |
| `content_kalender` | Contentplanning met platform, status, datum |
| `affiliate_links` | Affiliate links met naam, URL, commissie |
| `zoekwoorden` | SEO zoekwoorden met positie en volume |
| `transacties` | Inkomsten en uitgaven (heeft `rekening` kolom: bedrijf/privé) |
| `zakelijke_kosten` | Handmatig ingevoerde aftrekbare kosten |
| `facturen` | Uitgaande facturen met BTW en status |
| `kilometers` | Zakelijke km-registratie |

**Migratie-patroon:** Nieuwe kolommen toevoegen via `migreer(db, sql)` — wraps `ALTER TABLE` in try/catch zodat bestaande databases niet crashen.

**Let op:** `getDb()` opent een nieuwe verbinding. Routes die complexe queries doen (bijv. btw/route.ts) roepen `db.close()` aan na gebruik.

---

## Secties

### Content Hub (`/content`)
4 tabs: Content Kalender, SEO Checker, Zoekwoorden, Affiliate Links.
- SEO checker: 18 checks in 4 categorieën (Technisch, Content, Structuur, Sociaal). Vereist `pagespeed_api_key` in instellingen.

### Analytics (`/analytics`)
3 tabs: Pinterest, Facebook, TikTok.
- OAuth-flow: callback leest `?state=service` query param en wisselt code in.
- Pinterest: eigen OAuth via `pinterest_client_id` / `pinterest_client_secret`.
- Facebook: `facebook_app_id`, `facebook_app_secret`, `facebook_page_id`. Short-lived token wordt ingewisseld voor 60-daags token.
- TikTok: `tiktok_client_key`, `tiktok_client_secret`. Scopes: `user.info.basic`, `video.list`.

### Financiën (`/financien`)
- Transacties: inkomsten en uitgaven.
- Uitgaven hebben een `rekening` veld: **Bedrijfsrekening** of **Persoonlijke rekening**.
- Badges: blauw = Bedrijf, paars = Privé.
- Grafiek via Recharts (bar chart per maand).

### Belastingen (`/belastingen`)
5 tabs:

| Tab | Route | Doel |
|---|---|---|
| Zakelijke Kosten | `/api/belastingen/zakelijke-kosten` | Handmatig + importeren vanuit Financiën |
| BTW | `/api/belastingen/btw` | Kwartaaloverzicht, KOR/BTW-plichtig instelling |
| Facturen | `/api/belastingen/facturen` | CRUD, statussen: concept/verzonden/betaald/verlopen |
| Jaaroverzicht | `/api/belastingen/jaaroverzicht` | Belastbare winst, aftrekposten, geschatte IB, afdrukken |
| Kilometers | `/api/belastingen/kilometers` | Km-ritten, €0,23/km aftrek, maandgrafiek |

**KM-tarief:** €0,23/km (Nederlandse belastingdienst standaard 2024–2026).
**BTW-regime:** Opgeslagen in `instellingen` tabel als `btw_status` (`btw_plichtig` of `kor`). Bij KOR wordt BTW-UI verborgen.
**Jaaroverzicht formule:** `belastbareWinst = max(0, inkomsten - zakelijkeKosten - kmAftrekbaar)`

---

## Bekende valkuilen

- `next.config` moet `.mjs` zijn (niet `.ts`). Next 14 ondersteunt geen TypeScript config.
- `better-sqlite3` v9.x werkt niet op Node 24 — gebruik v11.10.0+.
- Tailwind `@apply` met `active:` pseudo-class variants werkt niet in `globals.css` — gebruik gewone CSS of inline classes.
- `text-navy-*` klassen werken niet in `@apply` — gebruik hardcoded hex zoals `text-[#1e293b]`.
- `getDb()` is geëxporteerd zodat API routes met complexe queries er direct gebruik van kunnen maken.
- Bij API-response altijd checken welke veldnamen de route daadwerkelijk teruggeeft — component interfaces moeten exact overeenkomen.

---

## Beslissingen

| Beslissing | Reden |
|---|---|
| Google Analytics vervangen door Facebook + TikTok | Google Cloud vereist betaalgegevens; niet gewenst |
| SQLite i.p.v. PostgreSQL/MySQL | Lokale app, geen server nodig, simpel |
| PDF export via `window.print()` | Geen extra dependencies nodig |
| Inter font via CSS @import | `next/font/google` conflicteerde met autoprefixer setup |
| `autoprefixer` als dependency (niet devDependency) | Vereist door Tailwind in deze Next.js setup |
| Zakelijke kosten: merged view | Combineert handmatige entries met Financiën-uitgaven om dubbeltelling te vermijden |
| BTW kwartaaldata: berekend in route | Route groepeert facturen per kwartaal in DB-query; component berekent totalen zelf |
