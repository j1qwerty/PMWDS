import { GlassCard } from "../shared/GlassCard";
import type { OrganizationRecord } from "../../types";

interface OrganizationListProps {
  organizations: OrganizationRecord[];
  selectedOrgId: string;
  onSelect: (id: string) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
}

export function OrganizationList({ organizations, selectedOrgId, onSelect, searchTerm, onSearchChange }: OrganizationListProps) {
  const filtered = organizations.filter((org) =>
    org.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <GlassCard className="p-4 max-h-[calc(100vh-220px)] flex flex-col">
      <div className="mb-4 relative">
        <span className="material-symbols-outlined absolute left-3 top-2 text-[#767586] text-lg pointer-events-none">
          search
        </span>
        <input
          placeholder="Search organizations..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full h-10 pl-10 pr-3.5 rounded-[10px] border border-[#e0e3e5] text-[13px] outline-none bg-white box-border"
        />
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col gap-2 p-2">
        {filtered.map((org, index) => {
          const isSelected = selectedOrgId === org.id;
          return (
            <div
              key={org.id}
              onClick={() => onSelect(org.id)}
              className={`
                p-3.5 rounded-xl cursor-pointer relative overflow-hidden transition-all duration-300
                animate-slideIn
                ${isSelected 
                  ? "bg-gradient-to-r from-[rgba(70,72,212,0.08)] to-[rgba(129,39,207,0.05)] border border-[rgba(70,72,212,0.3)] scale-[1.02]" 
                  : "bg-white/40 border border-[rgba(224,227,229,0.3)] hover:bg-white/70 hover:border-[rgba(70,72,212,0.2)]"
                }
              `}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              {isSelected && (
                <div className="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-[#4648d4] to-[#8127cf] rounded-l" />
              )}
              <div className="font-bold text-sm text-[#191c1e] mb-2">{org.name}</div>
              <div className="text-[11px] text-[#767586] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[14px]">business</span>
                <span>{org.departmentCount || 0} department{(org.departmentCount || 0) !== 1 ? 's' : ''}</span>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-10 text-[#767586] text-[13px]">
            <span className="material-symbols-outlined text-[40px] mb-2 block">search_off</span>
            No organizations found
          </div>
        )}
      </div>
    </GlassCard>
  );
}