export const departmentColorPalette = [
  { bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-700", dot: "bg-indigo-500", ring: "ring-indigo-200", hover: "hover:bg-indigo-100" },
  { bg: "bg-violet-50", border: "border-violet-200", text: "text-violet-700", dot: "bg-violet-500", ring: "ring-violet-200", hover: "hover:bg-violet-100" },
  { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", dot: "bg-blue-500", ring: "ring-blue-200", hover: "hover:bg-blue-100" },
  { bg: "bg-cyan-50", border: "border-cyan-200", text: "text-cyan-700", dot: "bg-cyan-500", ring: "ring-cyan-200", hover: "hover:bg-cyan-100" },
  { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-500", ring: "ring-emerald-200", hover: "hover:bg-emerald-100" },
  { bg: "bg-teal-50", border: "border-teal-200", text: "text-teal-700", dot: "bg-teal-500", ring: "ring-teal-200", hover: "hover:bg-teal-100" },
  { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", dot: "bg-amber-500", ring: "ring-amber-200", hover: "hover:bg-amber-100" },
  { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-700", dot: "bg-rose-500", ring: "ring-rose-200", hover: "hover:bg-rose-100" },
];

export const statusColorPalette = {
  active: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-500" },
  completed: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", dot: "bg-blue-500" },
  onHold: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", dot: "bg-amber-500" },
  cancelled: { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-700", dot: "bg-rose-500" },
  planning: { bg: "bg-violet-50", border: "border-violet-200", text: "text-violet-700", dot: "bg-violet-500" },
};

export const priorityColorPalette = {
  high: { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-700", dot: "bg-rose-500" },
  medium: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", dot: "bg-amber-500" },
  low: { bg: "bg-slate-50", border: "border-slate-200", text: "text-slate-700", dot: "bg-slate-500" },
  critical: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", dot: "bg-red-500" },
};

export function getDepartmentColor(index: number) {
  return departmentColorPalette[index % departmentColorPalette.length];
}

export function getStatusColor(status: string) {
  return statusColorPalette[status as keyof typeof statusColorPalette] || statusColorPalette.active;
}

export function getPriorityColor(priority: string) {
  return priorityColorPalette[priority as keyof typeof priorityColorPalette] || priorityColorPalette.medium;
}