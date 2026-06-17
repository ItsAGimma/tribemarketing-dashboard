export async function logActie(
  actie: "aangemaakt" | "bewerkt" | "verwijderd",
  tabel: string,
  record_id: string | number,
  omschrijving: string,
  door?: string
) {
  try {
    const res = await fetch("/api/audit-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actie, tabel, record_id, omschrijving, door: door || "onbekend" }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("[audit] fout:", err);
    }
  } catch (e) {
    console.error("[audit] fetch fout:", e);
  }
}
