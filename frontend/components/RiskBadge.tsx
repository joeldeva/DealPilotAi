import { AlertTriangle, Shield, ShieldAlert } from "lucide-react";

type RiskBadgeProps = {
  level: "low" | "medium" | "high" | string;
};

export function RiskBadge({ level }: RiskBadgeProps) {
  const normalized = level.toLowerCase();
  const config =
    normalized === "high"
      ? {
          label: "High risk",
          className: "border-red-300/35 bg-red-400/[0.14] text-red-100",
          icon: <ShieldAlert size={15} />,
        }
      : normalized === "medium"
        ? {
            label: "Medium risk",
            className: "border-amber-300/35 bg-amber-300/[0.14] text-amber-100",
            icon: <AlertTriangle size={15} />,
          }
        : {
            label: "Low risk",
            className: "border-emerald-300/35 bg-emerald-300/[0.14] text-emerald-100",
            icon: <Shield size={15} />,
          };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${config.className}`}>
      {config.icon}
      {config.label}
    </span>
  );
}
