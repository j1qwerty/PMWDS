interface PageHeaderProps {
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: string;
  };
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
      <div>
        <span className="text-sm font-semibold text-blue-700 uppercase tracking-wider">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
        </span>
        <h1 className="text-2xl font-extrabold text-slate-900 mt-1 tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-slate-500 mt-1">
            {description}
          </p>
        )}
      </div>
      
      {action && (
        <button
          onClick={action.onClick}
          className="group px-5 py-2 rounded-xl bg-white border border-slate-200/60 text-slate-600 hover:border-blue-300 hover:shadow-md hover:text-blue-600 transition-all duration-200 text-sm font-medium flex items-center gap-2"
        >
          {action.icon ? (
            <span className="material-symbols-outlined text-lg group-hover:rotate-12 transition-transform">
              {action.icon}
            </span>
          ) : (
            <svg className="w-4 h-4 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          )}
          {action.label}
        </button>
      )}
    </div>
  );
}