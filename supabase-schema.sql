-- ════════════════════════════════════════════════════════════════
-- Tribe Marketing Dashboard — Supabase schema
-- Draai dit één keer in de Supabase SQL Editor (Database → SQL Editor → New query).
-- ════════════════════════════════════════════════════════════════

create table if not exists instellingen (
  sleutel        text primary key,
  waarde         text not null,
  bijgewerkt_op  timestamptz default now()
);

create table if not exists content_kalender (
  id               bigint generated always as identity primary key,
  titel            text not null,
  status           text not null default 'idee',
  publicatiedatum  date,
  categorie        text,
  aangemaakt_op    timestamptz default now(),
  bijgewerkt_op    timestamptz default now()
);

create table if not exists affiliate_links (
  id             bigint generated always as identity primary key,
  naam           text not null,
  url            text not null,
  platform       text,
  categorie      text,
  notities       text,
  aangemaakt_op  timestamptz default now()
);

create table if not exists affiliate_artikelen (
  id                 bigint generated always as identity primary key,
  affiliate_link_id  bigint not null references affiliate_links(id) on delete cascade,
  titel              text not null,
  url                text not null,
  aangemaakt_op      timestamptz default now()
);

create table if not exists zoekwoorden (
  id             bigint generated always as identity primary key,
  zoekwoord      text not null,
  suggesties     text,
  opgeslagen_op  timestamptz default now()
);

create table if not exists transacties (
  id             bigint generated always as identity primary key,
  datum          date not null,
  bedrag         numeric not null,
  type           text not null,
  categorie      text not null,
  omschrijving   text,
  rekening       text,
  aftrekbaar     boolean not null default false,
  aangemaakt_op  timestamptz default now()
);

create table if not exists zakelijke_kosten (
  id             bigint generated always as identity primary key,
  datum          date not null,
  omschrijving   text not null,
  bedrag         numeric not null,
  categorie      text not null,
  bron           text not null default 'handmatig',
  transactie_id  bigint,
  aangemaakt_op  timestamptz default now()
);

create table if not exists facturen (
  id             bigint generated always as identity primary key,
  factuurnummer  text not null,
  klant          text not null,
  datum          date not null,
  vervaldatum    date,
  bedrag         numeric not null,
  btw_tarief     numeric not null default 0,
  btw_bedrag     numeric not null default 0,
  status         text not null default 'verzonden',
  omschrijving   text,
  aangemaakt_op  timestamptz default now()
);

create table if not exists onttrekkingen (
  id             bigint generated always as identity primary key,
  datum          date not null,
  vennoot        text not null,
  bedrag         numeric not null,
  omschrijving   text,
  aangemaakt_op  timestamptz default now()
);

create table if not exists kilometers (
  id             bigint generated always as identity primary key,
  datum          date not null,
  van            text not null,
  naar           text not null,
  km             numeric not null,
  omschrijving   text,
  aangemaakt_op  timestamptz default now()
);

-- ────────────────────────────────────────────────────────────────
-- LOKAAL: RLS uit zodat de anon key direct werkt.
-- ────────────────────────────────────────────────────────────────
alter table instellingen        disable row level security;
alter table content_kalender     disable row level security;
alter table affiliate_links      disable row level security;
alter table affiliate_artikelen  disable row level security;
alter table zoekwoorden          disable row level security;
alter table transacties          disable row level security;
alter table zakelijke_kosten     disable row level security;
alter table facturen             disable row level security;
alter table onttrekkingen        disable row level security;
alter table kilometers           disable row level security;

-- ════════════════════════════════════════════════════════════════
-- BIJ LIVE GAAN — draai dit pas NADAT je de service_role key in
-- .env.local hebt gezet (SUPABASE_SERVICE_ROLE_KEY=...). De server
-- gebruikt die key dan en omzeilt RLS veilig; de anon key in de
-- browser wordt geblokkeerd.
-- ════════════════════════════════════════════════════════════════
-- alter table instellingen        enable row level security;
-- alter table content_kalender     enable row level security;
-- alter table affiliate_links      enable row level security;
-- alter table affiliate_artikelen  enable row level security;
-- alter table zoekwoorden          enable row level security;
-- alter table transacties          enable row level security;
-- alter table zakelijke_kosten     enable row level security;
-- alter table facturen             enable row level security;
-- alter table onttrekkingen        enable row level security;
-- alter table kilometers           enable row level security;
