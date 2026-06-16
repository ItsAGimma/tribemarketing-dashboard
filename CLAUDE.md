# TravelTribe Dashboard — CLAUDE.md

Persoonlijk marketing- en business dashboard voor de reiswebsite TravelTribe. Draait lokaal op `localhost:3000`.

## Tech Stack

| Laag | Technologie |
|---|---|
| Framework | Next.js 14 met App Router |
| Styling | Tailwind CSS (custom classes in `globals.css`) |
| Database | SQLite via `better-sqlite3` |
| Grafieken | Recharts |
| Taal | TypeScript, alle UI-teksten in het Nederlands |

## Projectstructuur

```
src/
├── app/
│   ├── layout.tsx              # Hoofdlayout met sidebar navigatie
│   ├── page.tsx                # Redirect naar /content
│   ├── globals.css             # Tailwind + custom utility-classes
│   │
│   ├── content/                # Content Hub (tabbladen)
│   │   ├── page.tsx            # Tab-container
│   │   └── components/
│   │       ├── SeoChecker.tsx          # URL-analyse + PageSpeed API
│   │       ├── ZoekwoordenOnderzoek.tsx # Google Autocomplete suggesties
│   │       ├── ContentKalender.tsx     # Artikelen plannen (CRUD)
│   │       └── AffiliateLinkManager.tsx # Links beheren (CRUD)
│   │
│   ├── analytics/              # Analytics sectie
│   │   └── page.tsx            # Pinterest, Search Console, GA4 panels
│   │
│   ├── financien/              # Financiën sectie
│   │   └── page.tsx            # Transacties + Recharts grafiek
│   │
│   ├── instellingen/           # API-keys & credentials
│   │   └── page.tsx
│   │
│   └── api/                    # Route handlers (server-side)
│       ├── seo/route.ts
│       ├── zoekwoorden/route.ts
│       ├── content-kalender/route.ts
│       ├── affiliate-links/route.ts
│       ├── financien/route.ts
│       ├── instellingen/route.ts
│       └── analytics/
│           ├── pinterest/route.ts
│           ├── search-console/route.ts
│           └── ga4/route.ts
│
├── lib/
│   └── db.ts                   # Database helper (schema + alle queries)
│
└── components/
    └── Navigation.tsx          # Sidebar navigatie (client component)
```

## Database (SQLite)

Bestand: `data/dashboard.db` (automatisch aangemaakt bij eerste start).

| Tabel | Doel |
|---|---|
| `instellingen` | Sleutel/waarde store voor alle API keys en tokens |
| `content_kalender` | Artikelen met titel, status, datum, categorie |
| `affiliate_links` | Links met naam, URL, platform, categorie, notities |
| `zoekwoorden` | Opgeslagen zoekwoorden + Google Autocomplete suggesties |
| `transacties` | Inkomsten/uitgaven met datum, bedrag, type, categorie |

## Instellingen die je kunt opslaan (via /instellingen)

| Sleutel | Gebruik |
|---|---|
| `pagespeed_api_key` | Google PageSpeed Insights API (SEO Checker) |
| `pinterest_client_id` | Pinterest OAuth app |
| `pinterest_client_secret` | Pinterest OAuth secret |
| `google_client_id` | Google OAuth (Search Console + GA4) |
| `google_client_secret` | Google OAuth secret |

Tokens worden automatisch opgeslagen na OAuth-flow:
- `pinterest_access_token`
- `gsc_access_token` / `gsc_refresh_token` / `gsc_site_url`
- `ga4_access_token` / `ga4_refresh_token` / `ga4_property_id`

## Navigatiesecties

### 1. Content Hub (`/content`)
- **SEO Checker**: analyseert een URL op title, meta description, H1–H3, woordenaantal, alt-teksten, canonical, Open Graph, HTTPS en laadtijd
- **Zoekwoorden**: haalt Google Autocomplete-suggesties op, groepeert ze, slaat ze op in SQLite
- **Content Kalender**: CRUD voor artikelen met status (idee / in bewerking / gepubliceerd)
- **Affiliate Links**: CRUD voor affiliate links met platform en categorie

### 2. Analytics (`/analytics`)
- **Pinterest**: OAuth v5 → toont pins (uitbreiding met statistieken zodra Pinterest API beschikbaar)
- **Search Console**: OAuth → toont clicks, impressies en positie per pagina (top 25, 3 maanden)
- **GA4**: OAuth → toont paginaweergaven en sessies per pagina (top 25, 3 maanden)
- OAuth-callback wordt afgehandeld via `?state=pinterest|gsc|ga4` query-parameter

### 3. Financiën (`/financien`)
- Inkomsten/uitgaven invoeren met datum, bedrag, type, categorie en omschrijving
- Maandfilter en KPI-kaarten (totaal inkomsten, uitgaven, winst)
- Recharts BarChart: inkomsten vs uitgaven per maand

## Starten

```bash
npm install
npm run dev
# → http://localhost:3000
```

> **Note**: `better-sqlite3` is een native module. Na `npm install` wordt het automatisch gecompileerd. Bij problemen: `npm rebuild better-sqlite3`.

## Foutafhandeling

Als een API key ontbreekt, toont de UI een melding met een link naar `/instellingen`. Alle API-routes retourneren `{ success: false, error: "..." }` bij fouten.
