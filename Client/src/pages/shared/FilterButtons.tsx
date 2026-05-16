import { classNames } from "../../ui";

interface FilterButtonsProps {
  options: string[];
  selected: string;
  onChange: (value: string) => void;
  colorMap: Record<string, { bg: string; text: string; dot: string; activeBg?: string; activeText?: string }>;
  allLabel?: string;
}

export function FilterButtons({
  options,
  selected,
  onChange,
  colorMap,
  allLabel = "All",
}: FilterButtonsProps) {
  const allStyles = { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" };

  return (
    <div className="flex gap-1.5 flex-wrap items-center">
      <button
        onClick={() => onChange("")}
        className={classNames(
          "px-2.5 py-1 text-[11px] font-semibold rounded border transition-all flex items-center gap-1",
          !selected
            ? "bg-slate-200 border-slate-300 text-slate-700"
            : "bg-slate-100 border-transparent text-slate-500 hover:bg-slate-200"
        )}
      >
        <span className={`w-1.5 h-1.5 rounded-sm ${allStyles.dot}`}></span>
        {allLabel}
      </button>
      {options.map((option) => {
        const isActive = selected === option;
        const styles = colorMap[option] || allStyles;
        return (
          <button
            key={option}
            onClick={() => onChange(isActive ? "" : option)}
            className={classNames(
              "px-2.5 py-1 text-[11px] font-semibold rounded border transition-all flex items-center gap-1",
              styles.bg,
              styles.text,
              isActive
                ? "border-slate-400 shadow-sm"
                : "border-transparent hover:bg-slate-200"
            )}
          >
            <span className={`w-1.5 h-1.5 rounded-sm ${styles.dot}`}></span>
            {option}
          </button>
        );
      })}
    </div>
  );
}
