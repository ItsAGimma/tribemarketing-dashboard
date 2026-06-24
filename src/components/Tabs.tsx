"use client";

import type { LucideIcon } from "lucide-react";

export interface TabItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

export default function Tabs({
  tabs,
  active,
  onChange,
  className = "",
}: {
  tabs: TabItem[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div className={`overflow-x-auto ${className}`}>
    <div
      className="inline-flex gap-1 bg-white p-1 min-w-max"
      style={{ border: "1px solid #EBEBEA", borderRadius: 10, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
              isActive ? "bg-[#004BAD] text-white" : "text-muted hover:text-ink"
            }`}
          >
            <Icon size={16} strokeWidth={2} />
            {tab.label}
          </button>
        );
      })}
    </div>
    </div>
  );
}
