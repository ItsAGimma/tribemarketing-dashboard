"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Eye, EyeOff, Copy, Plus, Trash2, Lock, Shield, KeyRound, ExternalLink, Pencil, Check, Search } from "lucide-react";
import {
  bufferToBase64, base64ToBuffer, randomBuffer,
  deriveKey, generateMasterKey, exportKey, importKey,
  encryptRaw, decryptRaw, generateRecoveryCode,
} from "@/lib/kluis-crypto";
import { logActie } from "@/lib/audit";

type Status = "laden" | "setup" | "vergrendeld" | "herstel" | "ontgrendeld";

interface Instellingen {
  id: number;
  pin_salt: string;
  encrypted_master_key: string;
  master_key_iv: string;
  recovery_salt: string;
  recovery_encrypted_master_key: string;
  recovery_iv: string;
}

interface Entry {
  id: number;
  naam: string;
  url: string | null;
  encrypted_wachtwoord: string;
  wachtwoord_iv: string;
  encrypted_gebruikersnaam: string | null;
  gebruikersnaam_iv: string | null;
  encrypted_notities: string | null;
  notities_iv: string | null;
}

interface Onthuld {
  wachtwoord: string;
  gebruikersnaam: string;
  notities: string;
}

const leegForm = { naam: "", url: "", gebruikersnaam: "", wachtwoord: "", notities: "" };

export default function KluisPage() {
  const [status, setStatus] = useState<Status>("laden");
  const [instellingen, setInstellingen] = useState<Instellingen | null>(null);
  const [masterKey, setMasterKey] = useState<CryptoKey | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [onthuld, setOnthuld] = useState<Record<number, Onthuld>>({});
  const [wachtwoordZichtbaar, setWachtwoordZichtbaar] = useState<Record<number, boolean>>({});

  // Forms
  const [pin, setPin] = useState("");
  const [pinBevestig, setPinBevestig] = useState("");
  const [pinFout, setPinFout] = useState("");
  const [herstelCode, setHerstelCode] = useState("");
  const [nieuwePin, setNieuwePin] = useState("");
  const [nieuwePinBevestig, setNieuwePinBevestig] = useState("");

  // Setup flow
  const [herstelCodeWeergave, setHerstelCodeWeergave] = useState("");
  const [toonHerstelModal, setToonHerstelModal] = useState(false);
  const [herstelCodeGekopieerd, setHerstelCodeGekopieerd] = useState(false);

  const [zoekterm, setZoekterm] = useState("");

  // Entry modal
  const [toonModal, setToonModal] = useState(false);
  const [bewerkId, setBewerkId] = useState<number | null>(null);
  const [form, setForm] = useState(leegForm);
  const [formWachtwoordZichtbaar, setFormWachtwoordZichtbaar] = useState(false);
  const [opslaan, setOpslaan] = useState(false);

  // Auto-lock
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const LOCK_MS = 5 * 60 * 1000;

  const vergrendel = useCallback(() => {
    setMasterKey(null);
    setEntries([]);
    setOnthuld({});
    setWachtwoordZichtbaar({});
    setPin("");
    setStatus("vergrendeld");
  }, []);

  useEffect(() => {
    if (status !== "ontgrendeld") return;
    const reset = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(vergrendel, LOCK_MS);
    };
    reset();
    window.addEventListener("mousemove", reset);
    window.addEventListener("keydown", reset);
    window.addEventListener("click", reset);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      window.removeEventListener("mousemove", reset);
      window.removeEventListener("keydown", reset);
      window.removeEventListener("click", reset);
    };
  }, [status, vergrendel]);

  useEffect(() => { laadInstellingen(); }, []);

  async function laadInstellingen() {
    const res = await fetch("/api/kluis/instellingen");
    const json = await res.json();
    if (json.data) {
      setInstellingen(json.data);
      setStatus("vergrendeld");
    } else {
      setStatus("setup");
    }
  }

  async function laadEntries(key: CryptoKey) {
    const res = await fetch("/api/kluis/wachtwoorden");
    const json = await res.json();
    if (json.success) {
      setEntries(json.data);
      const decrypted: Record<number, Onthuld> = {};
      await Promise.all(json.data.map(async (entry: Entry) => {
        decrypted[entry.id] = await decryptEntry(key, entry);
      }));
      setOnthuld(decrypted);
    }
  }

  // ─── Setup ───────────────────────────────────────────────────────────────
  async function handleSetup(e?: React.FormEvent | React.MouseEvent | React.KeyboardEvent) {
    e?.preventDefault();
    setPinFout("");
    if (pin.length < 6) { setPinFout("Pincode moet minimaal 6 cijfers zijn."); return; }
    if (pin !== pinBevestig) { setPinFout("Pincodes komen niet overeen."); return; }

    const pinSalt = randomBuffer(32);
    const pinKey = await deriveKey(pin, pinSalt);

    const masterRaw = await generateMasterKey();
    const masterKeyBytes = await exportKey(masterRaw);
    const { c: emk, iv: mkiv } = await encryptRaw(pinKey, bufferToBase64(masterKeyBytes));

    const recCode = generateRecoveryCode();
    const recSalt = randomBuffer(32);
    const recKey = await deriveKey(recCode.replace(/-/g, ""), recSalt);
    const { c: remk, iv: riv } = await encryptRaw(recKey, bufferToBase64(masterKeyBytes));

    const res = await fetch("/api/kluis/instellingen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pin_salt: bufferToBase64(pinSalt),
        encrypted_master_key: emk,
        master_key_iv: mkiv,
        recovery_salt: bufferToBase64(recSalt),
        recovery_encrypted_master_key: remk,
        recovery_iv: riv,
      }),
    });
    if (!res.ok) { setPinFout("Er is iets misgegaan. Probeer opnieuw."); return; }

    setHerstelCodeWeergave(recCode);
    setMasterKey(masterRaw);
    setToonHerstelModal(true);
  }

  async function herstelModalBevestigd() {
    setToonHerstelModal(false);
    setPin("");
    setPinBevestig("");
    await laadInstellingen();
    setStatus("ontgrendeld");
    if (masterKey) laadEntries(masterKey);
  }

  // ─── Ontgrendelen ─────────────────────────────────────────────────────────
  async function handleOntgrendel(e?: React.FormEvent | React.MouseEvent | React.KeyboardEvent) {
    e?.preventDefault();
    setPinFout("");
    if (!instellingen) return;
    try {
      const pinKey = await deriveKey(pin, base64ToBuffer(instellingen.pin_salt));
      const masterKeyB64 = await decryptRaw(pinKey, instellingen.encrypted_master_key, instellingen.master_key_iv);
      const mk = await importKey(base64ToBuffer(masterKeyB64));
      setMasterKey(mk);
      setPin("");
      setStatus("ontgrendeld");
      await laadEntries(mk);
    } catch {
      setPinFout("Verkeerde pincode. Probeer opnieuw.");
      setPin("");
    }
  }

  // ─── Herstel ──────────────────────────────────────────────────────────────
  async function handleHerstel(e?: React.FormEvent | React.MouseEvent | React.KeyboardEvent) {
    e?.preventDefault();
    setPinFout("");
    if (!instellingen) return;
    if (nieuwePin.length < 4) { setPinFout("Pincode moet minimaal 4 cijfers zijn."); return; }
    if (nieuwePin !== nieuwePinBevestig) { setPinFout("Pincodes komen niet overeen."); return; }

    try {
      const recKey = await deriveKey(herstelCode.replace(/[-\s]/g, ""), base64ToBuffer(instellingen.recovery_salt));
      const masterKeyB64 = await decryptRaw(recKey, instellingen.recovery_encrypted_master_key, instellingen.recovery_iv);
      const mk = await importKey(base64ToBuffer(masterKeyB64));

      const newSalt = randomBuffer(32);
      const newPinKey = await deriveKey(nieuwePin, newSalt);
      const { c: emk, iv: mkiv } = await encryptRaw(newPinKey, masterKeyB64);

      await fetch("/api/kluis/instellingen", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: instellingen.id, pin_salt: bufferToBase64(newSalt), encrypted_master_key: emk, master_key_iv: mkiv }),
      });

      setMasterKey(mk);
      setHerstelCode("");
      setNieuwePin("");
      setNieuwePinBevestig("");
      setStatus("ontgrendeld");
      await laadInstellingen();
      await laadEntries(mk);
    } catch {
      setPinFout("Ongeldige herstelcode. Controleer de code en probeer opnieuw.");
    }
  }

  // ─── Entry CRUD ───────────────────────────────────────────────────────────
  async function openToevoegen() {
    setBewerkId(null);
    setForm(leegForm);
    setFormWachtwoordZichtbaar(false);
    setToonModal(true);
  }

  async function openBewerken(entry: Entry) {
    if (!masterKey) return;
    const dec = await decryptEntry(masterKey, entry);
    setBewerkId(entry.id);
    setForm({ naam: entry.naam, url: entry.url || "", gebruikersnaam: dec.gebruikersnaam, wachtwoord: dec.wachtwoord, notities: dec.notities });
    setFormWachtwoordZichtbaar(false);
    setToonModal(true);
  }

  async function handleOpslaan(e: React.FormEvent) {
    e.preventDefault();
    if (!masterKey) return;
    setOpslaan(true);
    try {
      const { c: eww, iv: wiv } = await encryptRaw(masterKey, form.wachtwoord);
      const { c: egu, iv: guiv } = await encryptRaw(masterKey, form.gebruikersnaam);
      const { c: eno, iv: noiv } = await encryptRaw(masterKey, form.notities);

      const body = {
        naam: form.naam,
        url: form.url || null,
        encrypted_wachtwoord: eww, wachtwoord_iv: wiv,
        encrypted_gebruikersnaam: egu, gebruikersnaam_iv: guiv,
        encrypted_notities: eno, notities_iv: noiv,
      };

      if (bewerkId) {
        await fetch("/api/kluis/wachtwoorden", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: bewerkId, ...body }) });
        setOnthuld((prev) => { const n = { ...prev }; delete n[bewerkId]; return n; });
        await logActie("bewerkt", "kluis", bewerkId, form.naam);
      } else {
        const res = await fetch("/api/kluis/wachtwoorden", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        const json = await res.json();
        await logActie("aangemaakt", "kluis", json.id ?? "", form.naam);
      }

      setToonModal(false);
      setForm(leegForm);
      await laadEntries(masterKey);
    } finally {
      setOpslaan(false);
    }
  }

  async function handleVerwijder(id: number) {
    if (!confirm("Dit wachtwoord permanent verwijderen?")) return;
    const entry = entries.find((e) => e.id === id);
    await fetch("/api/kluis/wachtwoorden", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    await logActie("verwijderd", "kluis", id, entry?.naam || String(id));
    setEntries((prev) => prev.filter((e) => e.id !== id));
    setOnthuld((prev) => { const n = { ...prev }; delete n[id]; return n; });
  }

  async function decryptEntry(key: CryptoKey, entry: Entry): Promise<Onthuld> {
    const wachtwoord = await decryptRaw(key, entry.encrypted_wachtwoord, entry.wachtwoord_iv);
    const gebruikersnaam = entry.encrypted_gebruikersnaam && entry.gebruikersnaam_iv
      ? await decryptRaw(key, entry.encrypted_gebruikersnaam, entry.gebruikersnaam_iv)
      : "";
    const notities = entry.encrypted_notities && entry.notities_iv
      ? await decryptRaw(key, entry.encrypted_notities, entry.notities_iv)
      : "";
    return { wachtwoord, gebruikersnaam, notities };
  }

  async function kopieerNaarKlembord(text: string) {
    await navigator.clipboard.writeText(text);
  }

  // ─── Render helpers ───────────────────────────────────────────────────────
  const pinInput = (value: string, onChange: (v: string) => void, placeholder: string, autoFocus = false, onKeyDown?: (e: React.KeyboardEvent) => void) => (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      maxLength={6}
      autoFocus={autoFocus}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={false}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
      onKeyDown={onKeyDown}
      className="input text-center text-xl tracking-[0.5em] font-mono"
      style={{ WebkitTextSecurity: "disc" } as React.CSSProperties}
    />
  );

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (status === "laden") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-muted text-sm">Kluis laden...</div>
      </div>
    );
  }

  // ─── Setup ────────────────────────────────────────────────────────────────
  if (status === "setup") {
    return (
      <>
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-50 mb-4">
              <Shield size={32} className="text-brand-600" />
            </div>
            <h1 className="text-2xl font-bold text-[#0f172a]">Kluis instellen</h1>
            <p className="text-sm text-muted mt-1">Kies een pincode om je wachtwoorden te beveiligen.</p>
          </div>

          <div className="card space-y-4">
            <div>
              <label className="label">Pincode</label>
              {pinInput(pin, setPin, "••••••", true)}
            </div>
            <div>
              <label className="label">Pincode bevestigen</label>
              {pinInput(pinBevestig, setPinBevestig, "••••••", false, (e) => { if (e.key === "Enter" && pin && pinBevestig) handleSetup(e as unknown as React.FormEvent); })}
            </div>
            {pinFout && <p className="text-sm text-red-500">{pinFout}</p>}
            <button onClick={handleSetup} className="btn-primary w-full" disabled={!pin || !pinBevestig}>
              Kluis aanmaken
            </button>
          </div>
        </div>
      </div>

      {/* Herstelcode modal */}
      {toonHerstelModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.6)" }} onClick={(e) => e.stopPropagation()}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <KeyRound size={22} className="text-amber-500" />
              <h3 className="font-semibold text-gray-800">Bewaar je herstelcode</h3>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
              <p className="text-xs text-amber-700 font-medium mb-3">
                Als je je pincode vergeet, heb je deze code nodig om de kluis te herstellen. Sla hem op een veilige plek op. De code wordt slechts één keer getoond.
              </p>
              <div className="bg-white rounded-lg border border-amber-200 p-3 text-center">
                <p className="font-mono text-base font-bold tracking-widest text-[#0f172a] select-all">{herstelCodeWeergave}</p>
              </div>
            </div>
            <button
              onClick={async () => {
                await navigator.clipboard.writeText(herstelCodeWeergave);
                setHerstelCodeGekopieerd(true);
              }}
              className="btn-secondary w-full mb-3 flex items-center justify-center gap-2"
            >
              {herstelCodeGekopieerd ? <><Check size={16} /> Gekopieerd!</> : <><Copy size={16} /> Kopieer herstelcode</>}
            </button>
            <button onClick={herstelModalBevestigd} className="btn-primary w-full">
              Ik heb de code opgeslagen — open de kluis
            </button>
          </div>
        </div>
      )}
      </>
    );
  }

  // ─── Vergrendeld ──────────────────────────────────────────────────────────
  if (status === "vergrendeld") {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-100 mb-4">
              <Lock size={32} className="text-gray-400" />
            </div>
            <h1 className="text-2xl font-bold text-[#0f172a]">Kluis vergrendeld</h1>
            <p className="text-sm text-muted mt-1">Voer je pincode in om toegang te krijgen.</p>
          </div>

          <div className="card space-y-4">
            <div>
              <label className="label">Pincode</label>
              {pinInput(pin, setPin, "••••••", true, (e) => { if (e.key === "Enter" && pin) handleOntgrendel(e as unknown as React.FormEvent); })}
            </div>
            {pinFout && <p className="text-sm text-red-500">{pinFout}</p>}
            <button onClick={handleOntgrendel} className="btn-primary w-full" disabled={!pin}>
              Ontgrendelen
            </button>
            <button type="button" onClick={() => { setPinFout(""); setStatus("herstel"); }} className="w-full text-sm text-center text-brand-600 hover:text-brand-700">
              Pincode vergeten?
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Herstel ──────────────────────────────────────────────────────────────
  if (status === "herstel") {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-50 mb-4">
              <KeyRound size={32} className="text-amber-500" />
            </div>
            <h1 className="text-2xl font-bold text-[#0f172a]">Pincode herstellen</h1>
            <p className="text-sm text-muted mt-1">Voer je herstelcode in en stel een nieuwe pincode in.</p>
          </div>

          <div className="card space-y-4">
            <div>
              <label className="label">Herstelcode</label>
              <input
                type="text"
                className="input font-mono tracking-widest uppercase text-center"
                placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
                value={herstelCode}
                onChange={(e) => setHerstelCode(e.target.value)}
                autoFocus
                autoComplete="off"
              />
            </div>
            <div>
              <label className="label">Nieuwe pincode</label>
              {pinInput(nieuwePin, setNieuwePin, "••••••")}
            </div>
            <div>
              <label className="label">Nieuwe pincode bevestigen</label>
              {pinInput(nieuwePinBevestig, setNieuwePinBevestig, "••••••", false, (e) => { if (e.key === "Enter" && herstelCode && nieuwePin && nieuwePinBevestig) handleHerstel(e as unknown as React.FormEvent); })}
            </div>
            {pinFout && <p className="text-sm text-red-500">{pinFout}</p>}
            <button onClick={handleHerstel} className="btn-primary w-full" disabled={!herstelCode || !nieuwePin || !nieuwePinBevestig}>
              Pincode instellen
            </button>
            <button type="button" onClick={() => { setPinFout(""); setStatus("vergrendeld"); }} className="w-full text-sm text-center text-muted hover:text-gray-700">
              ← Terug naar inloggen
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Ontgrendeld ──────────────────────────────────────────────────────────
  return (
    <>
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title mb-0">Kluis</h1>
          <p className="text-xs text-green-600 font-medium flex items-center gap-1 mt-0.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500" /> Ontgrendeld · vergrendelt automatisch na 5 min inactiviteit
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={openToevoegen} className="btn-primary flex items-center gap-1.5">
            <Plus size={16} /> Toevoegen
          </button>
          <button onClick={vergrendel} className="btn-secondary flex items-center gap-1.5">
            <Lock size={15} /> Vergrendelen
          </button>
        </div>
      </div>

      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="text"
          className="input pl-9"
          placeholder="Zoeken op naam..."
          value={zoekterm}
          onChange={(e) => setZoekterm(e.target.value)}
        />
      </div>

      {entries.length === 0 && (
        <div className="card py-16 text-center">
          <Shield size={32} className="mx-auto text-gray-200 mb-3" />
          <p className="text-muted text-sm">Nog geen wachtwoorden opgeslagen.</p>
          <button onClick={openToevoegen} className="btn-primary mt-4 mx-auto">+ Eerste wachtwoord toevoegen</button>
        </div>
      )}

      <div className="space-y-3">
        {entries.filter((e) => e.naam.toLowerCase().includes(zoekterm.toLowerCase())).map((entry) => {
          const dec = onthuld[entry.id];
          const ww = wachtwoordZichtbaar[entry.id];
          return (
            <div key={entry.id} className="card p-0 overflow-hidden">
              <div className="flex items-center gap-4 p-4">
                {/* Favicon placeholder */}
                <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 font-bold text-gray-400 text-sm">
                  {entry.naam.charAt(0).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-[#0f172a] text-sm">{entry.naam}</p>
                    {entry.url && (
                      <a href={entry.url.startsWith("http") ? entry.url : `https://${entry.url}`} target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-brand-500 transition-colors">
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>

                  {dec && (
                    <div className="mt-1 space-y-1">
                      {dec.gebruikersnaam && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted w-24 shrink-0">Gebruikersnaam</span>
                          <span className="text-xs font-mono text-gray-700">{dec.gebruikersnaam}</span>
                          <button onClick={() => kopieerNaarKlembord(dec.gebruikersnaam)} className="text-gray-300 hover:text-brand-500 shrink-0"><Copy size={11} /></button>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted w-24 shrink-0">Wachtwoord</span>
                        <span className="text-xs font-mono text-gray-700">{ww ? dec.wachtwoord : "•".repeat(Math.min(dec.wachtwoord.length, 16))}</span>
                        <button onClick={() => setWachtwoordZichtbaar((p) => ({ ...p, [entry.id]: !ww }))} className="text-gray-300 hover:text-gray-600 shrink-0">
                          {ww ? <EyeOff size={12} /> : <Eye size={12} />}
                        </button>
                        <button onClick={() => kopieerNaarKlembord(dec.wachtwoord)} className="text-gray-300 hover:text-brand-500 shrink-0"><Copy size={11} /></button>
                      </div>
                      {dec.notities && (
                        <div className="flex items-start gap-2">
                          <span className="text-xs text-muted w-24 shrink-0">Notities</span>
                          <span className="text-xs text-gray-600">{dec.notities}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openBewerken(entry)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => handleVerwijder(entry.id)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>

    {/* Add/Edit modal */}
    {toonModal && (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} onClick={() => setToonModal(false)}>
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
          <h3 className="font-semibold text-gray-800 mb-5">{bewerkId ? "Wachtwoord bewerken" : "Nieuw wachtwoord"}</h3>
          <form onSubmit={handleOpslaan} autoComplete="off" className="space-y-4">
            <div>
              <label className="label">Naam <span className="text-red-400">*</span></label>
              <input type="text" className="input" placeholder="bijv. Gmail, Bol.com" value={form.naam} onChange={(e) => setForm((p) => ({ ...p, naam: e.target.value }))} required autoFocus />
            </div>
            <div>
              <label className="label">URL (optioneel)</label>
              <input type="text" className="input" placeholder="https://..." value={form.url} onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))} />
            </div>
            <div>
              <label className="label">Gebruikersnaam / e-mail</label>
              <input type="text" className="input" placeholder="gebruiker@voorbeeld.nl" autoComplete="off" value={form.gebruikersnaam} onChange={(e) => setForm((p) => ({ ...p, gebruikersnaam: e.target.value }))} />
            </div>
            <div>
              <label className="label">Wachtwoord <span className="text-red-400">*</span></label>
              <div className="relative">
                <input
                  type={formWachtwoordZichtbaar ? "text" : "password"}
                  className="input pr-10"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  value={form.wachtwoord}
                  onChange={(e) => setForm((p) => ({ ...p, wachtwoord: e.target.value }))}
                  required
                />
                <button type="button" onClick={() => setFormWachtwoordZichtbaar((p) => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {formWachtwoordZichtbaar ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="label">Notities</label>
              <textarea className="input resize-none" rows={2} placeholder="Optionele notitie..." value={form.notities} onChange={(e) => setForm((p) => ({ ...p, notities: e.target.value }))} />
            </div>
            <div className="flex gap-3 pt-1">
              <button type="submit" className="btn-primary flex-1" disabled={opslaan || !form.naam || !form.wachtwoord}>
                {opslaan ? "Versleutelen..." : bewerkId ? "Opslaan" : "Toevoegen"}
              </button>
              <button type="button" onClick={() => setToonModal(false)} className="btn-secondary flex-1">Annuleren</button>
            </div>
          </form>
        </div>
      </div>
    )}
    </>
  );
}
