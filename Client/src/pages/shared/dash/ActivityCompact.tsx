interface ActivityProps {
  title?: string;
  filterOptions?: string[];
  selectedFilter?: string;
  onFilterChange?: (filter: string) => void;
}

export function ActivityCompact({ 
  title = "Activity",
  filterOptions = ["All Tasks"],
  selectedFilter = "All Tasks",
  onFilterChange
}: ActivityProps) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
        {filterOptions.length > 0 && (
          <select 
            className="text-xs text-slate-500 border border-slate-200 rounded-lg px-2 py-1 bg-white cursor-pointer"
            value={selectedFilter}
            onChange={(e) => onFilterChange?.(e.target.value)}
          >
            {filterOptions.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        )}
      </div>
      
      <div className="h-48 relative">
        <svg width="100%" height="100%" viewBox="0 0 300 150" preserveAspectRatio="none">
          <path 
            d="M0,120 Q30,100 50,110 T100,90 T150,100 T200,60 T250,40 T300,20" 
            fill="none" 
            stroke="#8b5cf6" 
            strokeWidth="2"
          />
          <path 
            d="M0,120 Q30,100 50,110 T100,90 T150,100 T200,60 T250,40 T300,20 L300,150 L0,150 Z" 
            fill="url(#activityGradient)" 
            opacity="0.1"
          />
          <defs>
            <linearGradient id="activityGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#8b5cf6', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: '#8b5cf6', stopOpacity: 0 }} />
            </linearGradient>
          </defs>
        </svg>
      </div>
      
      <div className="flex justify-between text-xs text-slate-400 mt-2">
        <span>Sun</span>
        <span>Mon</span>
        <span>Tue</span>
        <span>Wed</span>
        <span>Thu</span>
        <span>Fri</span>
        <span>Sat</span>
      </div>
    </div>
  );
}