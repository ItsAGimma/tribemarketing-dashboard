"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Layout, BarChart2, DollarSign, FileText, Settings, LogOut } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

const navItems = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/content", label: "Content Hub", icon: Layout },
  { href: "/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/financien", label: "Financiën", icon: DollarSign },
  { href: "/belastingen", label: "Belastingen", icon: FileText },
];

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();

  async function uitloggen() {
    const sb = getSupabaseBrowser();
    await sb.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="w-60 min-h-screen flex flex-col shrink-0" style={{ backgroundColor: "#0A2342" }}>
      <div className="px-6 py-7 border-b border-white/5">
        <p className="text-white font-semibold text-base tracking-tight">Tribe Marketing</p>
        <p className="text-xs mt-0.5 font-medium" style={{ color: "#8FA0BC" }}>Dashboard</p>
      </div>

      <nav className="flex-1 px-3 py-5">
        <p className="section-label mb-3 px-3" style={{ color: "#5a6b87" }}>
          Menu
        </p>
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? "bg-[#004BAD] text-white"
                      : "text-[#8FA0BC] hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon size={18} strokeWidth={2} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="px-3 py-4 border-t border-white/5 space-y-1">
        <Link
          href="/instellingen"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 w-full ${
            pathname.startsWith("/instellingen")
              ? "bg-[#004BAD] text-white"
              : "text-[#8FA0BC] hover:bg-white/5 hover:text-white"
          }`}
        >
          <Settings size={18} strokeWidth={2} />
          Instellingen
        </Link>
        <button
          onClick={uitloggen}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 w-full text-[#8FA0BC] hover:bg-white/5 hover:text-white"
        >
          <LogOut size={18} strokeWidth={2} />
          Uitloggen
        </button>
      </div>
    </aside>
  );
}
