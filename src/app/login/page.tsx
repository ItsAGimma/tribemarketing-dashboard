"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [wachtwoord, setWachtwoord] = useState("");
  const [fout, setFout] = useState("");
  const [laden, setLaden] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setFout("");
    setLaden(true);

    const sb = getSupabaseBrowser();
    const { error } = await sb.auth.signInWithPassword({ email, password: wachtwoord });

    if (error) {
      setFout("Ongeldig e-mailadres of wachtwoord.");
      setLaden(false);
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#F5F4F0" }}>
      <div className="card w-full max-w-sm">
        <div className="mb-8">
          <p className="text-base font-semibold text-ink">Tribe Marketing</p>
          <p className="text-sm text-muted mt-0.5">Log in op je dashboard</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">E-mailadres</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm rounded-lg border border-hairline bg-white text-ink focus:outline-none focus:ring-2 focus:ring-[#004BAD]/30"
              placeholder="jij@example.com"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">Wachtwoord</label>
            <input
              type="password"
              value={wachtwoord}
              onChange={(e) => setWachtwoord(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm rounded-lg border border-hairline bg-white text-ink focus:outline-none focus:ring-2 focus:ring-[#004BAD]/30"
              placeholder="••••••••"
            />
          </div>

          {fout && <p className="text-xs text-[#E05252]">{fout}</p>}

          <button
            type="submit"
            disabled={laden}
            className="btn-primary w-full py-2.5 text-sm font-medium disabled:opacity-60"
          >
            {laden ? "Inloggen..." : "Inloggen"}
          </button>
        </form>
      </div>
    </div>
  );
}
