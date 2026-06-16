"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const tabs = [
  { id: "pinterest", label: "Pinterest", icon: "📌" },
  { id: "facebook", label: "Facebook", icon: "👥" },
  { id: "tiktok", label: "TikTok", icon: "🎵" },
];

function GeenCredentialsMelding({ service }: { service: string }) {
  return (
    <div className="card max-w-lg text-center py-10">
      <p className="text-4xl mb-4">🔑</p>
      <h3 className="font-semibold text-gray-900 mb-2">Credentials ontbreken</h3>
      <p className="text-gray-500 text-sm mb-4">
        Stel eerst je {service} credentials in via de instellingenpagina.
      </p>
      <Link href="/instellingen" className="btn-primary inline-block">
        Naar Instellingen
      </Link>
    </div>
  );
}

function AnalyticsInhoud() {
  const searchParams = useSearchParams();
  const [actieveTab, setActieveTab] = useState("pinterest");

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    if (code && state) {
      handleOAuthCallback(code, state);
    }
  }, [searchParams]);

  async function handleOAuthCallback(code: string, service: string) {
    const endpoints: Record<string, string> = {
      pinterest: "/api/analytics/pinterest",
      facebook: "/api/analytics/facebook",
      tiktok: "/api/analytics/tiktok",
    };
    const endpoint = endpoints[service];
    if (!endpoint) return;
    await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        actie: "exchange_code",
        code,
        redirect_uri: window.location.origin + "/analytics?state=" + service,
      }),
    });
    window.history.replaceState({}, "", "/analytics");
    setActieveTab(service);
  }

  return (
    <div>
      <h1 className="page-title">Analytics</h1>

      <div
        className="inline-flex flex-wrap gap-1 bg-white p-1 mb-8"
        style={{ border: "1px solid #EBEBEA", borderRadius: 10, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActieveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
              actieveTab === tab.id
                ? "bg-[#004BAD] text-white"
                : "text-muted hover:text-ink"
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {actieveTab === "pinterest" && <PinterestPanel />}
      {actieveTab === "facebook" && <FacebookPanel />}
      {actieveTab === "tiktok" && <TikTokPanel />}
    </div>
  );
}

function PinterestPanel() {
  const [data, setData] = useState<{ pins: { id: string; titel: string; link: string }[] } | null>(null);
  const [fout, setFout] = useState<string | null>(null);
  const [laden, setLaden] = useState(true);

  useEffect(() => { laad(); }, []);

  async function laad() {
    setLaden(true);
    const res = await fetch("/api/analytics/pinterest");
    const d = await res.json();
    setLaden(false);
    if (d.success) setData(d.data);
    else setFout(d.error);
  }

  async function verbind() {
    const res = await fetch("/api/analytics/pinterest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actie: "oauth_url", redirect_uri: window.location.origin + "/analytics?state=pinterest" }),
    });
    const d = await res.json();
    if (d.success) window.location.href = d.data.url;
    else setFout(d.error);
  }

  if (laden) return <div className="text-gray-400">Laden...</div>;

  if (fout === "niet_verbonden") {
    return (
      <div className="card max-w-lg text-center py-10">
        <p className="text-4xl mb-4">📌</p>
        <h3 className="font-semibold text-gray-900 mb-2">Pinterest nog niet verbonden</h3>
        <p className="text-gray-500 text-sm mb-4">
          Stel je Pinterest credentials in via{" "}
          <Link href="/instellingen" className="text-brand-500 hover:underline">Instellingen</Link>{" "}
          en klik dan op Verbind.
        </p>
        <button onClick={verbind} className="btn-primary">Verbind Pinterest</button>
        {fout && fout !== "niet_verbonden" && <p className="text-red-500 text-sm mt-2">{fout}</p>}
      </div>
    );
  }

  if (fout === "geen_credentials") return <GeenCredentialsMelding service="Pinterest" />;

  return (
    <div className="max-w-3xl">
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="section-title mb-0">Pinterest Pins</h2>
          <button onClick={verbind} className="btn-secondary text-sm">Opnieuw verbinden</button>
        </div>
        {data?.pins.length === 0 && <p className="text-gray-400 text-center py-6">Geen pins gevonden.</p>}
        <div className="divide-y divide-gray-50">
          {data?.pins.map((pin) => (
            <div key={pin.id} className="py-3 first:pt-0 last:pb-0">
              <p className="font-medium text-gray-900 text-sm">{pin.titel}</p>
              {pin.link && (
                <a href={pin.link} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-500 hover:underline">
                  {pin.link}
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FacebookPanel() {
  interface FacebookData {
    metrics: Record<string, number>;
    posts: { bericht: string; datum: string; likes: number; reacties: number; delingen: number }[];
  }
  const [data, setData] = useState<FacebookData | null>(null);
  const [fout, setFout] = useState<string | null>(null);
  const [laden, setLaden] = useState(true);
  const [pageId, setPageId] = useState("");

  useEffect(() => { laad(); }, []);

  async function laad() {
    setLaden(true);
    const res = await fetch("/api/analytics/facebook");
    const d = await res.json();
    setLaden(false);
    if (d.success) setData(d.data);
    else setFout(d.error);
  }

  async function verbind() {
    const res = await fetch("/api/analytics/facebook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actie: "oauth_url", redirect_uri: window.location.origin + "/analytics?state=facebook" }),
    });
    const d = await res.json();
    if (d.success) window.location.href = d.data.url;
    else setFout(d.error);
  }

  async function slaPageOp() {
    await fetch("/api/analytics/facebook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actie: "set_page", page_id: pageId }),
    });
    laad();
  }

  const metricLabels: Record<string, string> = {
    page_impressions: "Vertoningen",
    page_reach: "Bereik",
    page_engaged_users: "Betrokken gebruikers",
    page_post_engagements: "Interacties",
  };

  if (laden) return <div className="text-gray-400">Laden...</div>;

  if (fout === "niet_verbonden") {
    return (
      <div className="card max-w-lg text-center py-10">
        <p className="text-4xl mb-4">👥</p>
        <h3 className="font-semibold text-gray-900 mb-2">Facebook nog niet verbonden</h3>
        <p className="text-gray-500 text-sm mb-4">
          Stel je Facebook App credentials in via{" "}
          <Link href="/instellingen" className="text-brand-500 hover:underline">Instellingen</Link>{" "}
          en klik dan op Verbind.
        </p>
        <button onClick={verbind} className="btn-primary">Verbind Facebook</button>
        {fout && fout !== "niet_verbonden" && <p className="text-red-500 text-sm mt-2">{fout}</p>}
      </div>
    );
  }

  if (fout === "geen_page") {
    return (
      <div className="card max-w-lg">
        <h3 className="font-semibold text-gray-800 mb-2">Facebook Pagina ID instellen</h3>
        <p className="text-xs text-gray-500 mb-3">
          Vind je Page ID via Facebook → Pagina → Over → Pagina-transparantie (onderaan).
        </p>
        <div className="flex gap-3">
          <input
            type="text"
            className="input flex-1"
            placeholder="bijv. 123456789012345"
            value={pageId}
            onChange={(e) => setPageId(e.target.value)}
          />
          <button onClick={slaPageOp} className="btn-primary">Opslaan</button>
        </div>
      </div>
    );
  }

  if (fout === "geen_credentials") return <GeenCredentialsMelding service="Facebook" />;

  return (
    <div className="max-w-4xl space-y-6">
      {data?.metrics && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Object.entries(data.metrics).map(([key, waarde]) => (
            <div key={key} className="card text-center">
              <p className="text-2xl font-bold text-brand-700">{waarde.toLocaleString("nl-NL")}</p>
              <p className="text-xs text-gray-500 mt-1">{metricLabels[key] || key}</p>
              <p className="text-xs text-gray-400">30 dagen</p>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="section-title mb-0">Recente posts</h2>
          <button onClick={verbind} className="btn-secondary text-sm">Opnieuw verbinden</button>
        </div>
        {data?.posts.length === 0 && <p className="text-gray-400 text-center py-6">Geen posts gevonden.</p>}
        <div className="divide-y divide-gray-50">
          {data?.posts.map((post, i) => (
            <div key={i} className="py-4 first:pt-0 last:pb-0">
              <p className="text-sm text-gray-800 mb-2">{post.bericht}</p>
              <div className="flex gap-4 text-xs text-gray-500">
                <span>👍 {post.likes}</span>
                <span>💬 {post.reacties}</span>
                <span>↗️ {post.delingen}</span>
                <span className="ml-auto">
                  {new Date(post.datum).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TikTokPanel() {
  interface TikTokGebruiker { naam: string; volgers: number; volgend: number; likes: number; videos: number; }
  interface TikTokVideo { titel: string; weergaven: number; likes: number; reacties: number; delingen: number; datum: string; }
  const [data, setData] = useState<{ gebruiker: TikTokGebruiker; videos: TikTokVideo[] } | null>(null);
  const [fout, setFout] = useState<string | null>(null);
  const [laden, setLaden] = useState(true);

  useEffect(() => { laad(); }, []);

  async function laad() {
    setLaden(true);
    const res = await fetch("/api/analytics/tiktok");
    const d = await res.json();
    setLaden(false);
    if (d.success) setData(d.data);
    else setFout(d.error);
  }

  async function verbind() {
    const res = await fetch("/api/analytics/tiktok", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actie: "oauth_url", redirect_uri: window.location.origin + "/analytics?state=tiktok" }),
    });
    const d = await res.json();
    if (d.success) window.location.href = d.data.url;
    else setFout(d.error);
  }

  if (laden) return <div className="text-gray-400">Laden...</div>;

  if (fout === "niet_verbonden") {
    return (
      <div className="card max-w-lg text-center py-10">
        <p className="text-4xl mb-4">🎵</p>
        <h3 className="font-semibold text-gray-900 mb-2">TikTok nog niet verbonden</h3>
        <p className="text-gray-500 text-sm mb-4">
          Stel je TikTok credentials in via{" "}
          <Link href="/instellingen" className="text-brand-500 hover:underline">Instellingen</Link>{" "}
          en klik dan op Verbind.
        </p>
        <button onClick={verbind} className="btn-primary">Verbind TikTok</button>
        {fout && fout !== "niet_verbonden" && <p className="text-red-500 text-sm mt-2">{fout}</p>}
      </div>
    );
  }

  if (fout === "geen_credentials") return <GeenCredentialsMelding service="TikTok" />;

  return (
    <div className="max-w-4xl space-y-6">
      {data?.gebruiker && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="card text-center">
            <p className="text-2xl font-bold text-brand-700">{data.gebruiker.volgers.toLocaleString("nl-NL")}</p>
            <p className="text-xs text-gray-500 mt-1">Volgers</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-brand-700">{data.gebruiker.likes.toLocaleString("nl-NL")}</p>
            <p className="text-xs text-gray-500 mt-1">Totale likes</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-brand-700">{data.gebruiker.videos}</p>
            <p className="text-xs text-gray-500 mt-1">Video&apos;s</p>
          </div>
          <div className="card text-center">
            <p className="text-lg font-bold text-gray-700 truncate">{data.gebruiker.naam}</p>
            <p className="text-xs text-gray-500 mt-1">Account</p>
          </div>
        </div>
      )}

      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="section-title mb-0">Recente video&apos;s</h2>
          <button onClick={verbind} className="btn-secondary text-sm">Opnieuw verbinden</button>
        </div>
        {data?.videos.length === 0 && <p className="text-gray-400 text-center py-6">Geen video&apos;s gevonden.</p>}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-gray-100">
                <th className="pb-3 font-semibold text-gray-600">Video</th>
                <th className="pb-3 font-semibold text-gray-600 text-right">👁️</th>
                <th className="pb-3 font-semibold text-gray-600 text-right">❤️</th>
                <th className="pb-3 font-semibold text-gray-600 text-right">💬</th>
                <th className="pb-3 font-semibold text-gray-600 text-right">↗️</th>
                <th className="pb-3 font-semibold text-gray-600 text-right">Datum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data?.videos.map((v, i) => (
                <tr key={i}>
                  <td className="py-3 text-gray-800 max-w-xs truncate">{v.titel}</td>
                  <td className="py-3 text-right font-medium text-brand-700">{v.weergaven.toLocaleString("nl-NL")}</td>
                  <td className="py-3 text-right text-gray-600">{v.likes.toLocaleString("nl-NL")}</td>
                  <td className="py-3 text-right text-gray-600">{v.reacties.toLocaleString("nl-NL")}</td>
                  <td className="py-3 text-right text-gray-600">{v.delingen.toLocaleString("nl-NL")}</td>
                  <td className="py-3 text-right text-gray-400">
                    {new Date(v.datum).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<div className="text-gray-400">Laden...</div>}>
      <AnalyticsInhoud />
    </Suspense>
  );
}
