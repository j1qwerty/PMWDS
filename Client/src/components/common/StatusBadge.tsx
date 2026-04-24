type StatusBadgeProps = {
  label: string;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
};

const toneMap = {
  neutral: "status-neutral",
  success: "status-success",
  warning: "status-warning",
  danger: "status-danger",
  info: "status-info",
};

export function StatusBadge({ label, tone = "neutral" }: StatusBadgeProps) {
  return <span className={`status-badge ${toneMap[tone]}`}>{label}</span>;
}
