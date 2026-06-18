"use client";

import { useEffect, useState } from "react";
import { User, Lock, Shield, Eye, EyeOff, CheckCircle } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

type Sectie = "wachtwoord" | "kluis" | null;

export default function ProfielPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [actief, setActief] = useState<Sectie>(null);

  // Weergavenaam
  const [weergavenaam, setWeergavenaam] = useState("");
  const [weergavenaamInput, setWeergavenaamInput] = useState("");
  const [naamLaden, setNaamLaden] = useState(false);
  const [naamSucces, setNaamSucces] = useState(false);
  const [naamFout, setNaamFout] = useState("");

  // Wachtwoord wijzigen
  const [huidigWw, setHuidigWw] = useState("");
  const [nieuwWw, setNieuwWw] = useState("");
  const [bevestigWw, setBevestigWw] = useState("");
  const [wwZichtbaar, setWwZichtbaar] = useState(false);
  const [wwFout, setWwFout] = useState("");
  const [wwSucces, setWwSucces] = useState(false);
  const [wwLaden, setWwLaden] = useState(false);

  // Kluis PIN resetten
  const [nieuwePin, setNieuwePin] = useState("");
  const [nieuwePinBevestig, setNieuwePinBevestig] = useState("");
  const [pinFout, setPinFout] = useState("");
  const [pinSucces, setPinSucces] = useState(false);
  const [pinLaden, setPinLaden] = useState(false);

  useEffect(() => {
    const sb = getSupabaseBrowser();
    sb.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
      const naam = data.user?.user_metadata?.display_name ?? "";
      setWeergavenaam(naam);
      setWeergavenaamInput(naam);
    });
  }, []);

  async function handleWeergavenaamOpslaan(e: React.FormEvent) {
    e.preventDefault();
    setNaamFout("");
    setNaamSucces(false);
    setNaamLaden(true);
    try {
      const sb = getSupabaseBrowser();
      const { error } = await sb.auth.updateUser({ data: { display_name: weergavenaamInput.trim() } });
      if (error) { setNaamFout(error.message); return; }
      setWeergavenaam(weergavenaamInput.trim());
      setNaamSucces(true);
      setTimeout(() => setNaamSucces(false), 2500);
    } finally {
      setNaamLaden(false);
    }
  }

  async function handleWachtwoordWijzigen(e: React.FormEvent) {
    e.preventDefault();
    setWwFout("");
    setWwSucces(false);
    if (nieuwWw.length < 8) { setWwFout("Nieuw wachtwoord moet minimaal 8 tekens zijn."); return; }
    if (nieuwWw !== bevestigWw) { setWwFout("Wachtwoorden komen niet overeen."); return; }

    setWwLaden(true);
    try {
      const sb = getSupabaseBrowser();
      // Verifieer huidig wachtwoord door opnieuw in te loggen
      const { error: signInError } = await sb.auth.signInWithPassword({ email: email!, password: huidigWw });
      if (signInError) { setWwFout("Huidig wachtwoord is onjuist."); return; }

      const { error } = await sb.auth.updateUser({ password: nieuwWw });
      if (error) { setWwFout(error.message); return; }

      setWwSucces(true);
      setHuidigWw("");
      setNieuwWw("");
      setBevestigWw("");
      setTimeout(() => { setWwSucces(false); setActief(null); }, 2500);
    } finally {
      setWwLaden(false);
    }
  }

  async function handlePinResetten(e: React.FormEvent) {
    e.preventDefault();
    setPinFout("");
    setPinSucces(false);
    if (nieuwePin.length < 6) { setPinFout("Pincode moet minimaal 6 cijfers zijn."); return; }
    if (nieuwePin !== nieuwePinBevestig) { setPinFout("Pincodes komen niet overeen."); return; }

    setPinLaden(true);
    try {
      const res = await fetch("/api/kluis/instellingen", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: nieuwePin }),
      });
      const json = await res.json();
      if (!res.ok) { setPinFout(json.error || "Er is iets misgegaan."); return; }

      setPinSucces(true);
      setNieuwePin("");
      setNieuwePinBevestig("");
      setTimeout(() => { setPinSucces(false); setActief(null); }, 2500);
    } finally {
      setPinLaden(false);
    }
  }

  const pinInput = (value: string, onChange: (v: string) => void, placeholder: string, autoFocus = false) => (
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
      className="input text-center text-xl tracking-[0.5em] font-mono"
      style={{ WebkitTextSecurity: "disc" } as React.CSSProperties}
    />
  );

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="page-title mb-0">Profiel</h1>
        <p className="text-sm text-muted mt-1">Beheer je accountinstellingen.</p>
      </div>

      {/* Accountgegevens */}
      <div className="card space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
          <div className="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center shrink-0">
            <User size={18} className="text-brand-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#0f172a]">Account</p>
            <p className="text-xs text-muted">{email ?? "Laden..."}</p>
          </div>
        </div>

        {/* Weergavenaam */}
        <form onSubmit={handleWeergavenaamOpslaan} className="flex items-end gap-3">
          <div className="flex-1">
            <label className="label">Weergavenaam</label>
            <input
              type="text"
              className="input"
              placeholder="bijv. Luciano"
              value={weergavenaamInput}
              onChange={(e) => setWeergavenaamInput(e.target.value)}
              maxLength={40}
            />
          </div>
          <button
            type="submit"
            className="btn-primary shrink-0"
            disabled={naamLaden || weergavenaamInput.trim() === weergavenaam}
          >
            {naamLaden ? "Opslaan..." : "Opslaan"}
          </button>
        </form>
        {naamFout && <p className="text-sm text-red-500 -mt-2">{naamFout}</p>}
        {naamSucces && (
          <div className="flex items-center gap-2 text-green-600 text-sm -mt-2">
            <CheckCircle size={15} /> Naam opgeslagen.
          </div>
        )}

        <div className="border-t border-gray-100" />

        {/* Wachtwoord wijzigen */}
        <div>
          <button
            onClick={() => setActief(actief === "wachtwoord" ? null : "wachtwoord")}
            className="flex items-center justify-between w-full group"
          >
            <div className="flex items-center gap-3">
              <Lock size={16} className="text-gray-400" />
              <span className="text-sm font-medium text-[#0f172a]">Wachtwoord wijzigen</span>
            </div>
            <span className="text-xs text-brand-600 group-hover:text-brand-700">
              {actief === "wachtwoord" ? "Annuleren" : "Wijzigen"}
            </span>
          </button>

          {actief === "wachtwoord" && (
            <form onSubmit={handleWachtwoordWijzigen} autoComplete="off" className="mt-4 space-y-3">
              <div>
                <label className="label">Huidig wachtwoord</label>
                <input
                  type="password"
                  className="input"
                  autoComplete="current-password"
                  value={huidigWw}
                  onChange={(e) => setHuidigWw(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="label">Nieuw wachtwoord</label>
                <div className="relative">
                  <input
                    type={wwZichtbaar ? "text" : "password"}
                    className="input pr-10"
                    autoComplete="new-password"
                    placeholder="Minimaal 8 tekens"
                    value={nieuwWw}
                    onChange={(e) => setNieuwWw(e.target.value)}
                    required
                  />
                  <button type="button" onClick={() => setWwZichtbaar((p) => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {wwZichtbaar ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="label">Nieuw wachtwoord bevestigen</label>
                <input
                  type="password"
                  className="input"
                  autoComplete="new-password"
                  value={bevestigWw}
                  onChange={(e) => setBevestigWw(e.target.value)}
                  required
                />
              </div>
              {wwFout && <p className="text-sm text-red-500">{wwFout}</p>}
              {wwSucces && (
                <div className="flex items-center gap-2 text-green-600 text-sm">
                  <CheckCircle size={15} /> Wachtwoord gewijzigd.
                </div>
              )}
              <button type="submit" className="btn-primary" disabled={wwLaden || !huidigWw || !nieuwWw || !bevestigWw}>
                {wwLaden ? "Opslaan..." : "Wachtwoord opslaan"}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Kluis PIN resetten */}
      <div className="card space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
          <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
            <Shield size={18} className="text-amber-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#0f172a]">Kluis beveiliging</p>
            <p className="text-xs text-muted">Pincode voor de wachtwoordkluis.</p>
          </div>
        </div>

        <div>
          <button
            onClick={() => setActief(actief === "kluis" ? null : "kluis")}
            className="flex items-center justify-between w-full group"
          >
            <div className="flex items-center gap-3">
              <Lock size={16} className="text-gray-400" />
              <span className="text-sm font-medium text-[#0f172a]">Pincode resetten</span>
            </div>
            <span className="text-xs text-brand-600 group-hover:text-brand-700">
              {actief === "kluis" ? "Annuleren" : "Resetten"}
            </span>
          </button>

          {actief === "kluis" && (
            <form onSubmit={handlePinResetten} autoComplete="off" className="mt-4 space-y-3">
              <div>
                <label className="label">Nieuwe pincode</label>
                {pinInput(nieuwePin, setNieuwePin, "••••••", true)}
              </div>
              <div>
                <label className="label">Pincode bevestigen</label>
                {pinInput(nieuwePinBevestig, setNieuwePinBevestig, "••••••")}
              </div>
              {pinFout && <p className="text-sm text-red-500">{pinFout}</p>}
              {pinSucces && (
                <div className="flex items-center gap-2 text-green-600 text-sm">
                  <CheckCircle size={15} /> Pincode gewijzigd.
                </div>
              )}
              <button type="submit" className="btn-primary" disabled={pinLaden || !nieuwePin || !nieuwePinBevestig}>
                {pinLaden ? "Opslaan..." : "Pincode opslaan"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
