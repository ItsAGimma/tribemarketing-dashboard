"use client";

import type { LucideIcon } from "lucide-react";

export default function KpiCard({
  label,
  value,
  accent = "#004BAD",
  valueColor = "#1A1A1A",
  icon: Icon,
  children,
}: {
  label: string;
  value: string;
  accent?: string;
  valueColor?: string;
  icon?: LucideIcon;
  children?: React.ReactNode;
}) {
  return (
    <div className="card card-hover relative overflow-hidden" style={{ paddingTop: 24 }}>
      <div className="absolute top-0 left-0 right-0" style={{ height: 3, backgroundColor: accent }} />
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="card-title mb-2">{label}</p>
          <p className="kpi-value" style={{ color: valueColor }}>{value}</p>
        </div>
        {Icon && (
          <span className="flex items-center justify-center rounded-lg shrink-0" style={{ width: 34, height: 34, backgroundColor: "#e6eefa" }}>
            <Icon size={17} style={{ color: "#004BAD" }} />
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
