"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Layout, BarChart2, DollarSign, FileText, Settings, LogOut, Menu, X, CheckSquare, Globe, Shield, Link2 } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { useState, useEffect } from "react";

const navGroups = [
  {
    label: "Overzicht",
    items: [
      { href: "/", label: "Dashboard", icon: Home },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/content", label: "Content Hub", icon: Layout },
      { href: "/analytics", label: "Analytics", icon: BarChart2 },
    ],
  },
  {
    label: "Financiën",
    items: [
      { href: "/financien", label: "Financiën", icon: DollarSign },
      { href: "/belastingen", label: "Belastingen", icon: FileText },
    ],
  },
  {
    label: "Affiliate",
    items: [
      { href: "/platformen", label: "Affiliate", icon: Link2 },
    ],
  },
  {
    label: "Beheer",
    items: [
      { href: "/taken", label: "Taken", icon: CheckSquare },
      { href: "/kluis", label: "Kluis", icon: Shield },
    ],
  },
];

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [weergavenaam, setWeergavenaam] = useState<string | null>(null);

  useEffect(() => {
    getSupabaseBrowser().auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
      setWeergavenaam(data.user?.user_metadata?.display_name || null);
    });
  }, []);

  async function uitloggen() {
    const sb = getSupabaseBrowser();
    await sb.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const NavLinks = () => (
    <>
      <nav className="flex-1 px-3 py-5 space-y-4">
        {navGroups.map((group, i) => (
          <div key={group.label}>
            <div className="flex items-center gap-2 px-3 mb-1.5">
              <span className="text-[9px] font-semibold uppercase tracking-widest shrink-0" style={{ color: "#3d5478" }}>{group.label}</span>
              <div className="flex-1 h-px" style={{ backgroundColor: "#1e3a5f" }} />
            </div>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
                        isActive ? "bg-[#004BAD] text-white" : "text-[#8FA0BC] hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <Icon size={18} strokeWidth={2} />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-white/5">
        <div className="flex items-center gap-2">
          <Link
            href="/profiel"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 flex-1 min-w-0 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-[#1e3a5f] flex items-center justify-center shrink-0 text-[11px] font-semibold text-[#8FA0BC]">
              {(weergavenaam || email) ? (weergavenaam || email)![0].toUpperCase() : "?"}
            </div>
            <span className="text-[11px] text-[#8FA0BC] truncate">{weergavenaam || email || ""}</span>
          </Link>
          <Link
            href="/instellingen"
            onClick={() => setOpen(false)}
            title="Instellingen"
            className={`p-1.5 rounded-lg transition-colors shrink-0 ${pathname.startsWith("/instellingen") ? "text-white bg-[#004BAD]" : "text-[#8FA0BC] hover:bg-white/5 hover:text-white"}`}
          >
            <Settings size={16} strokeWidth={2} />
          </Link>
          <button
            onClick={uitloggen}
            title="Uitloggen"
            className="p-1.5 rounded-lg text-[#8FA0BC] hover:bg-white/5 hover:text-white transition-colors shrink-0"
          >
            <LogOut size={16} strokeWidth={2} />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 min-h-screen flex-col shrink-0" style={{ backgroundColor: "#0A2342" }}>
        <div className="px-6 py-7 border-b border-white/5">
          <p className="text-white font-semibold text-base tracking-tight">Tribe Marketing</p>
          <p className="text-xs mt-0.5 font-medium" style={{ color: "#8FA0BC" }}>Dashboard</p>
        </div>
        <NavLinks />
      </aside>

      {/* Mobile topbar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 border-b border-white/5" style={{ backgroundColor: "#0A2342" }}>
        <p className="text-white font-semibold text-sm">Tribe Marketing</p>
        <button onClick={() => setOpen(!open)} className="text-[#8FA0BC] hover:text-white p-1">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu overlay */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40 flex" onClick={() => setOpen(false)}>
          <div className="w-64 min-h-full flex flex-col" style={{ backgroundColor: "#0A2342" }} onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
              <p className="text-white font-semibold text-sm">Tribe Marketing</p>
              <button onClick={() => setOpen(false)} className="text-[#8FA0BC]"><X size={20} /></button>
            </div>
            <NavLinks />
          </div>
          <div className="flex-1 bg-black/40" />
        </div>
      )}
    </>
  );
}
