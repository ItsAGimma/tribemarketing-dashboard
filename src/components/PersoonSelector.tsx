"use client";

const PERSONEN = ["Luciano", "Jolien"] as const;
export type Persoon = (typeof PERSONEN)[number];

interface Props {
  value: Persoon | "";
  onChange: (v: Persoon) => void;
  className?: string;
}

export default function PersoonSelector({ value, onChange, className = "" }: Props) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-muted mb-1.5">
        Toegevoegd door <span className="text-[#E05252]">*</span>
      </label>
      <div className="flex gap-2">
        {PERSONEN.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${
              value === p
                ? "bg-[#004BAD] text-white border-[#004BAD]"
                : "bg-white text-muted border-hairline hover:border-[#004BAD]/40"
            }`}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}
