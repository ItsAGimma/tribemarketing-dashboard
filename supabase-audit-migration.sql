-- Voeg toegevoegd_door toe aan alle relevante tabellen
alter table transacties      add column if not exists toegevoegd_door text;
alter table content_kalender add column if not exists toegevoegd_door text;
alter table affiliate_links  add column if not exists toegevoegd_door text;
alter table facturen         add column if not exists toegevoegd_door text;
alter table zakelijke_kosten add column if not exists toegevoegd_door text;
alter table onttrekkingen    add column if not exists toegevoegd_door text;
alter table kilometers       add column if not exists toegevoegd_door text;
alter table zoekwoorden      add column if not exists toegevoegd_door text;

-- Audit log tabel
create table if not exists audit_log (
  id             bigint generated always as identity primary key,
  actie          text not null,       -- 'aangemaakt', 'bewerkt', 'verwijderd'
  tabel          text not null,
  record_id      text,
  omschrijving   text,
  door           text not null,       -- 'Luciano' of 'Jolien'
  aangemaakt_op  timestamptz default now()
);

alter table audit_log disable row level security;
