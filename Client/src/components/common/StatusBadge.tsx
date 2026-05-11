type StatusBadgeProps = {
  label: string;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
};

const toneMap = {
  neutral: "bg-slate-100 text-slate-600",
  success: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-700",
  danger: "bg-red-100 text-red-700",
  info: "bg-blue-100 text-blue-700",
};

export function StatusBadge({ label, tone = "neutral" }: StatusBadgeProps) {
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${toneMap[tone]}`}>{label}</span>;
}