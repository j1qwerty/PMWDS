type StatusBadgeProps = {
  label: string;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
};

const toneMap = {
  neutral: "bg-slate-400/10 text-slate-300 ring-slate-300/15",
  success: "bg-emerald-300/10 text-emerald-200 ring-emerald-300/20",
  warning: "bg-amber-300/10 text-amber-200 ring-amber-300/20",
  danger: "bg-rose-300/10 text-rose-200 ring-rose-300/20",
  info: "bg-sky-300/10 text-sky-200 ring-sky-300/20",
};

export function StatusBadge({ label, tone = "neutral" }: StatusBadgeProps) {
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[0.68rem] font-semibold tracking-[0.12em] uppercase ring-1 ${toneMap[tone]}`}>{label}</span>;
}
