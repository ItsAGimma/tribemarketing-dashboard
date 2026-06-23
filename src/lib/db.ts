import { getSupabase } from "./supabase";

// Alle functies zijn async — ze praten met Supabase (Postgres).
// Datum-aggregaties die in SQLite met strftime gebeurden, doen we hier in JS.

// ─── Instellingen ──────────────────────────────────────────

export async function getSetting(sleutel: string): Promise<string | null> {
  const sb = getSupabase();
  const { data } = await sb.from("instellingen").select("waarde").eq("sleutel", sleutel).maybeSingle();
  return data?.waarde ?? null;
}

export async function setSetting(sleutel: string, waarde: string): Promise<void> {
  const sb = getSupabase();
  await sb.from("instellingen").upsert(
    { sleutel, waarde, bijgewerkt_op: new Date().toISOString() },
    { onConflict: "sleutel" }
  );
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const sb = getSupabase();
  const { data } = await sb.from("instellingen").select("sleutel, waarde");
  return Object.fromEntries((data ?? []).map((r) => [r.sleutel, r.waarde]));
}

// ─── Content Kalender ──────────────────────────────────────

export async function getContentItems() {
  const sb = getSupabase();
  const { data } = await sb
    .from("content_kalender")
    .select("*")
    .order("publicatiedatum", { ascending: true, nullsFirst: false });
  return data ?? [];
}

export async function createContentItem(data: { titel: string; status: string; publicatiedatum?: string; categorie?: string }) {
  const sb = getSupabase();
  const { data: row } = await sb
    .from("content_kalender")
    .insert({
      titel: data.titel,
      status: data.status,
      publicatiedatum: data.publicatiedatum || null,
      categorie: data.categorie || null,
    })
    .select("id")
    .single();
  return row?.id;
}

export async function updateContentItem(id: number, data: { titel?: string; status?: string; publicatiedatum?: string; categorie?: string }) {
  const sb = getSupabase();
  const patch: Record<string, unknown> = { bijgewerkt_op: new Date().toISOString() };
  if (data.titel !== undefined) patch.titel = data.titel;
  if (data.status !== undefined) patch.status = data.status;
  if (data.publicatiedatum !== undefined) patch.publicatiedatum = data.publicatiedatum;
  if (data.categorie !== undefined) patch.categorie = data.categorie;
  await sb.from("content_kalender").update(patch).eq("id", id);
}

export async function deleteContentItem(id: number) {
  const sb = getSupabase();
  await sb.from("content_kalender").delete().eq("id", id);
}

// ─── Affiliate Links ───────────────────────────────────────

export async function getAffiliateLinks() {
  const sb = getSupabase();
  const { data } = await sb.from("affiliate_links").select("*").order("aangemaakt_op", { ascending: false });
  return data ?? [];
}

function generateToken(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export async function createAffiliateLink(data: { naam: string; url: string; platform?: string; categorie?: string; notities?: string }) {
  const sb = getSupabase();
  const token = generateToken();
  const { data: row } = await sb
    .from("affiliate_links")
    .insert({
      naam: data.naam,
      url: data.url,
      platform: data.platform || null,
      categorie: data.categorie || null,
      notities: data.notities || null,
      token,
    })
    .select("id, token")
    .single();
  return row;
}

export async function logLinkKlik(affiliate_link_id: number, referrer: string | null, apparaat: string) {
  const sb = getSupabase();
  await sb.from("link_kliks").insert({ affiliate_link_id, referrer, apparaat });
}

export async function getLinkByToken(token: string) {
  const sb = getSupabase();
  const { data } = await sb.from("affiliate_links").select("id, url").eq("token", token).maybeSingle();
  return data;
}

export async function getAffiliateLinksMetArtikelen() {
  const sb = getSupabase();
  const { data: links } = await sb.from("affiliate_links").select("*").order("aangemaakt_op", { ascending: false });
  const { data: artikelen } = await sb.from("affiliate_artikelen").select("*").order("aangemaakt_op", { ascending: true });
  const lijst = (links ?? []) as { id: number }[];
  const arts = (artikelen ?? []) as { affiliate_link_id: number }[];
  return lijst.map((l) => ({
    ...l,
    artikelen: arts.filter((a) => a.affiliate_link_id === l.id),
  }));
}

export async function createAffiliateArtikel(data: { affiliate_link_id: number; titel: string; url: string }) {
  const sb = getSupabase();
  const { data: row } = await sb
    .from("affiliate_artikelen")
    .insert({ affiliate_link_id: data.affiliate_link_id, titel: data.titel, url: data.url })
    .select("id")
    .single();
  return row?.id;
}

export async function deleteAffiliateArtikel(id: number) {
  const sb = getSupabase();
  await sb.from("affiliate_artikelen").delete().eq("id", id);
}

export async function deleteAffiliateLink(id: number) {
  const sb = getSupabase();
  await sb.from("affiliate_links").delete().eq("id", id);
}

export async function updateAffiliateLink(id: number, data: { naam: string; url: string; platform?: string; categorie?: string; notities?: string }) {
  const sb = getSupabase();
  await sb.from("affiliate_links").update(data).eq("id", id);
}

// ─── Zoekwoorden ───────────────────────────────────────────

export async function getZoekwoorden() {
  const sb = getSupabase();
  const { data } = await sb.from("zoekwoorden").select("*").order("opgeslagen_op", { ascending: false });
  return data ?? [];
}

export async function saveZoekwoord(zoekwoord: string, suggesties: string[]) {
  const sb = getSupabase();
  const { data: row } = await sb
    .from("zoekwoorden")
    .insert({ zoekwoord, suggesties: JSON.stringify(suggesties) })
    .select("id")
    .single();
  return row?.id;
}

export async function deleteZoekwoord(id: number) {
  const sb = getSupabase();
  await sb.from("zoekwoorden").delete().eq("id", id);
}

// ─── Transacties (Financiën) ───────────────────────────────

export async function getTransacties() {
  const sb = getSupabase();
  const { data } = await sb.from("transacties").select("*").order("datum", { ascending: false });
  return data ?? [];
}

export async function createTransactie(data: { datum: string; bedrag: number; type: string; categorie: string; omschrijving?: string; rekening?: string; aftrekbaar?: boolean }) {
  const sb = getSupabase();
  const { data: row } = await sb
    .from("transacties")
    .insert({
      datum: data.datum,
      bedrag: data.bedrag,
      type: data.type,
      categorie: data.categorie,
      omschrijving: data.omschrijving || null,
      rekening: data.rekening || null,
      aftrekbaar: !!data.aftrekbaar,
    })
    .select("id")
    .single();
  return row?.id;
}

export async function updateTransactie(id: number, data: { datum: string; bedrag: number; type: string; categorie: string; omschrijving?: string; rekening?: string; aftrekbaar?: boolean; platform?: string }) {
  const sb = getSupabase();
  await sb.from("transacties").update({
    datum: data.datum,
    bedrag: data.bedrag,
    type: data.type,
    categorie: data.categorie,
    omschrijving: data.omschrijving || null,
    rekening: data.rekening || null,
    aftrekbaar: !!data.aftrekbaar,
    platform: data.platform || null,
  }).eq("id", id);
}

export async function deleteTransactie(id: number) {
  const sb = getSupabase();
  await sb.from("transacties").delete().eq("id", id);
}

export async function getMaandoverzicht() {
  const sb = getSupabase();
  const { data } = await sb.from("transacties").select("datum, type, bedrag");
  const rows = (data ?? []) as { datum: string; type: string; bedrag: number }[];

  const maanden: Record<string, { maand: string; inkomsten: number; uitgaven: number }> = {};
  for (const row of rows) {
    const maand = (row.datum || "").slice(0, 7); // YYYY-MM
    if (!maand) continue;
    if (!maanden[maand]) maanden[maand] = { maand, inkomsten: 0, uitgaven: 0 };
    if (row.type === "inkomsten") maanden[maand].inkomsten += row.bedrag;
    if (row.type === "uitgaven") maanden[maand].uitgaven += row.bedrag;
  }
  return Object.values(maanden).sort((a, b) => a.maand.localeCompare(b.maand));
}

// ─── Zakelijke Kosten ──────────────────────────────────────

export async function getZakelijkeKosten(jaar?: number) {
  const sb = getSupabase();

  // Handmatige zakelijke kosten
  const { data: handmatigData } = await sb.from("zakelijke_kosten").select("*").order("datum", { ascending: false });
  let handmatig = (handmatigData ?? []) as { datum: string; transactie_id: number | null }[];
  if (jaar) handmatig = handmatig.filter((r) => (r.datum || "").startsWith(String(jaar)));
  handmatig = handmatig.map((r) => ({ ...r, bron: "handmatig" }));

  // Welke transacties zijn al geïmporteerd?
  const excludeIds = handmatig
    .map((r) => r.transactie_id)
    .filter((id): id is number => id != null);

  // Uitgaven vanuit financiën die nog niet geïmporteerd zijn
  const { data: uitgavenData } = await sb
    .from("transacties")
    .select("id, datum, omschrijving, bedrag, categorie")
    .eq("type", "uitgaven")
    .order("datum", { ascending: false });
  let uitgaven = (uitgavenData ?? []) as { id: number; datum: string; omschrijving: string | null; bedrag: number; categorie: string }[];
  if (jaar) uitgaven = uitgaven.filter((r) => (r.datum || "").startsWith(String(jaar)));

  const uitFinancien = uitgaven
    .filter((r) => !excludeIds.includes(r.id))
    .map((r) => ({
      id: r.id,
      datum: r.datum,
      omschrijving: r.omschrijving ?? r.categorie,
      bedrag: r.bedrag,
      categorie: r.categorie,
      bron: "financien",
      transactie_id: r.id,
    }));

  return { handmatig, uitFinancien };
}

export async function createZakelijkeKost(data: { datum: string; omschrijving: string; bedrag: number; categorie: string; transactie_id?: number }) {
  const sb = getSupabase();
  const { data: row } = await sb
    .from("zakelijke_kosten")
    .insert({
      datum: data.datum,
      omschrijving: data.omschrijving,
      bedrag: data.bedrag,
      categorie: data.categorie,
      bron: data.transactie_id ? "financien" : "handmatig",
      transactie_id: data.transactie_id || null,
    })
    .select("id")
    .single();
  return row?.id;
}

export async function deleteZakelijkeKost(id: number) {
  const sb = getSupabase();
  await sb.from("zakelijke_kosten").delete().eq("id", id);
}

// ─── Facturen ──────────────────────────────────────────────

export async function getFacturen() {
  const sb = getSupabase();
  const { data } = await sb.from("facturen").select("*").order("datum", { ascending: false });
  return data ?? [];
}

export async function createFactuur(data: {
  factuurnummer: string; klant: string; datum: string; vervaldatum?: string;
  bedrag: number; btw_tarief: number; btw_bedrag: number; status: string; omschrijving?: string;
}) {
  const sb = getSupabase();
  const { data: row } = await sb
    .from("facturen")
    .insert({
      factuurnummer: data.factuurnummer,
      klant: data.klant,
      datum: data.datum,
      vervaldatum: data.vervaldatum || null,
      bedrag: data.bedrag,
      btw_tarief: data.btw_tarief,
      btw_bedrag: data.btw_bedrag,
      status: data.status,
      omschrijving: data.omschrijving || null,
    })
    .select("id")
    .single();
  return row?.id;
}

export async function updateFactuurStatus(id: number, status: string) {
  const sb = getSupabase();
  await sb.from("facturen").update({ status }).eq("id", id);
}

export async function deleteFactuur(id: number) {
  const sb = getSupabase();
  await sb.from("facturen").delete().eq("id", id);
}

// ─── Onttrekkingen ─────────────────────────────────────────

export async function getOnttrekkingen(jaar?: number) {
  const sb = getSupabase();
  const { data } = await sb.from("onttrekkingen").select("*").order("datum", { ascending: false });
  let items = (data ?? []) as { datum: string }[];
  if (jaar) items = items.filter((r) => (r.datum || "").startsWith(String(jaar)));
  return items;
}

export async function createOnttrekking(data: { datum: string; vennoot: string; bedrag: number; omschrijving?: string }) {
  const sb = getSupabase();
  const { data: row } = await sb
    .from("onttrekkingen")
    .insert({ datum: data.datum, vennoot: data.vennoot, bedrag: data.bedrag, omschrijving: data.omschrijving || null })
    .select("id")
    .single();
  return row?.id;
}

export async function deleteOnttrekking(id: number) {
  const sb = getSupabase();
  await sb.from("onttrekkingen").delete().eq("id", id);
}

// ─── Kilometers ────────────────────────────────────────────

export async function getKilometers(jaar?: number) {
  const sb = getSupabase();
  const { data } = await sb.from("kilometers").select("*").order("datum", { ascending: false });
  let items = (data ?? []) as { datum: string }[];
  if (jaar) items = items.filter((r) => (r.datum || "").startsWith(String(jaar)));
  return items;
}

export async function createKilometerrit(data: { datum: string; van: string; naar: string; km: number; omschrijving?: string }) {
  const sb = getSupabase();
  const { data: row } = await sb
    .from("kilometers")
    .insert({ datum: data.datum, van: data.van, naar: data.naar, km: data.km, omschrijving: data.omschrijving || null })
    .select("id")
    .single();
  return row?.id;
}

export async function deleteKilometerrit(id: number) {
  const sb = getSupabase();
  await sb.from("kilometers").delete().eq("id", id);
}

// ─── Jaaroverzicht ─────────────────────────────────────────

export async function getJaaroverzicht(jaar: number) {
  const sb = getSupabase();
  const j = String(jaar);

  const { data: transData } = await sb.from("transacties").select("datum, type, bedrag, categorie, aftrekbaar");
  const trans = ((transData ?? []) as { datum: string; type: string; bedrag: number; categorie: string; aftrekbaar: boolean }[])
    .filter((r) => (r.datum || "").startsWith(j));

  const inkomsten = trans.filter((r) => r.type === "inkomsten").reduce((s, r) => s + r.bedrag, 0);
  const uitgaven = trans.filter((r) => r.type === "uitgaven").reduce((s, r) => s + r.bedrag, 0);
  const aftrekbareUitgaven = trans.filter((r) => r.type === "uitgaven" && r.aftrekbaar);
  const zakelijkeKosten = aftrekbareUitgaven.reduce((s, r) => s + r.bedrag, 0);

  const { data: kmData } = await sb.from("kilometers").select("datum, km");
  const kmRitten = ((kmData ?? []) as { datum: string; km: number }[])
    .filter((r) => (r.datum || "").startsWith(j))
    .reduce((s, r) => s + r.km, 0);
  const kmAftrekbaar = kmRitten * 0.23;

  const totaalAftrekbaar = zakelijkeKosten + kmAftrekbaar;

  // Per categorie (aftrekbare uitgaven)
  const catMap: Record<string, number> = {};
  for (const r of aftrekbareUitgaven) {
    catMap[r.categorie] = (catMap[r.categorie] || 0) + r.bedrag;
  }
  const perCategorie = Object.entries(catMap)
    .map(([categorie, totaal]) => ({ categorie, totaal }))
    .sort((a, b) => b.totaal - a.totaal);

  const belastbareWinst = Math.max(0, inkomsten - totaalAftrekbaar);

  return {
    jaar,
    inkomsten,
    uitgaven,
    zakelijkeKosten,
    totaalAftrekbaar,
    kmRitten,
    kmAftrekbaar,
    belastbareWinst,
    perCategorie,
  };
}
