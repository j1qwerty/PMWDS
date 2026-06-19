export function MessageBanner({
  message,
  type = "success",
  onDismiss,
}: {
  message: string;
  type?: "success" | "error" | "warning";
  onDismiss: () => void;
}) {
  const styles = {
    success: {
      bg: "bg-emerald-50 border-emerald-200 text-emerald-700",
      icon: "check_circle",
      iconColor: "text-emerald-500",
    },
    error: {
      bg: "bg-red-50 border-red-200 text-red-700",
      icon: "error",
      iconColor: "text-red-500",
    },
    warning: {
      bg: "bg-amber-50 border-amber-200 text-amber-700",
      icon: "warning",
      iconColor: "text-amber-500",
    },
  };

  const s = styles[type];

  return (
    <div className={`relative z-10 mb-5 ${s.bg} rounded-2xl border py-3.5 px-5 text-sm flex items-center gap-2.5 animate-[slideIn_0.3s_ease] shadow-sm`}>
      <span className={`material-symbols-outlined ${s.iconColor}`}>{s.icon}</span>
      {message}
      <button
        className="ml-auto bg-transparent border-none cursor-pointer text-inherit opacity-60 hover:opacity-100 transition-opacity"
        onClick={onDismiss}
      >
        <span className="material-symbols-outlined">close</span>
      </button>
    </div>
  );
}
