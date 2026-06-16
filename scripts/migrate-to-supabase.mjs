// Eenmalig: kopieert alle bestaande SQLite-data naar Supabase.
// Draai NA het aanmaken van de tabellen (supabase-schema.sql) met:
//   node scripts/migrate-to-supabase.mjs
//
// Leest credentials uit .env.local.

import Database from "better-sqlite3";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// ── .env.local handmatig inlezen ──────────────────────────
const envPath = path.join(process.cwd(), ".env.local");
const env = {};
for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2];
}

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error("❌ Supabase URL/key ontbreekt in .env.local");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });
const db = new Database(path.join(process.cwd(), "data", "dashboard.db"));

const stripId = (rows) => rows.map(({ id, ...rest }) => rest);

async function migreerSimpel(tabel, transform = (r) => r) {
  let rows;
  try {
    rows = db.prepare(`SELECT * FROM ${tabel}`).all();
  } catch {
    console.log(`⏭️  ${tabel} bestaat niet in SQLite, overslaan`);
    return;
  }
  if (rows.length === 0) {
    console.log(`⏭️  ${tabel}: 0 rijen`);
    return;
  }
  const payload = stripId(rows).map(transform);
  const { error } = await sb.from(tabel).insert(payload);
  if (error) console.error(`❌ ${tabel}:`, error.message);
  else console.log(`✅ ${tabel}: ${payload.length} rijen`);
}

async function main() {
  // Instellingen (upsert op sleutel, geen id)
  const instellingen = db.prepare("SELECT sleutel, waarde, bijgewerkt_op FROM instellingen").all();
  if (instellingen.length) {
    const { error } = await sb.from("instellingen").upsert(instellingen, { onConflict: "sleutel" });
    console.log(error ? `❌ instellingen: ${error.message}` : `✅ instellingen: ${instellingen.length} rijen`);
  } else {
    console.log("⏭️  instellingen: 0 rijen");
  }

  await migreerSimpel("content_kalender");
  await migreerSimpel("zoekwoorden");
  await migreerSimpel("transacties", (r) => ({ ...r, aftrekbaar: !!r.aftrekbaar }));
  await migreerSimpel("zakelijke_kosten");
  await migreerSimpel("facturen");
  await migreerSimpel("onttrekkingen");
  await migreerSimpel("kilometers");

  // Affiliate links + artikelen (FK-relatie behouden via id-mapping)
  const links = db.prepare("SELECT * FROM affiliate_links").all();
  if (links.length) {
    const idMap = {};
    for (const link of links) {
      const { id, ...rest } = link;
      const { data, error } = await sb.from("affiliate_links").insert(rest).select("id").single();
      if (error) { console.error(`❌ affiliate_links:`, error.message); continue; }
      idMap[id] = data.id;
    }
    console.log(`✅ affiliate_links: ${links.length} rijen`);

    const artikelen = db.prepare("SELECT * FROM affiliate_artikelen").all();
    if (artikelen.length) {
      const payload = artikelen.map(({ id, affiliate_link_id, ...rest }) => ({
        ...rest,
        affiliate_link_id: idMap[affiliate_link_id],
      })).filter((a) => a.affiliate_link_id != null);
      const { error } = await sb.from("affiliate_artikelen").insert(payload);
      console.log(error ? `❌ affiliate_artikelen: ${error.message}` : `✅ affiliate_artikelen: ${payload.length} rijen`);
    }
  } else {
    console.log("⏭️  affiliate_links: 0 rijen");
  }

  console.log("\n🎉 Migratie voltooid.");
}

main();
