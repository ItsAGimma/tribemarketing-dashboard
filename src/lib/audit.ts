export async function logActie(
  actie: "aangemaakt" | "bewerkt" | "verwijderd",
  tabel: string,
  record_id: string | number,
  omschrijving: string,
  door?: string
) {
  await fetch("/api/audit-log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actie, tabel, record_id, omschrijving, door: door || "onbekend" }),
  }).catch(() => {});
}
