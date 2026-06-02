import { useState, useMemo, useRef, useEffect, type JSX } from "react";
import { CustomDropdown } from "../../shared/customDropdown";
import type { OrganizationRecord, Department, Milestone, User } from "../../../types";
import { usePermission } from "../../shared/RoleGate";
import { useUserOrganization } from "../../shared/useUserOrganization";

interface KanbanFiltersProps {
  // Organisation / Department
  organizations: OrganizationRecord[];
  departments: Department[];
  users: User[];
  selectedOrganizationId: string;
  selectedDepartmentId: string;
  onOrganizationChange: (id: string) => void;
  onDepartmentChange: (id: string) => void;

  // Milestone
  milestones: Milestone[];
  selectedMilestoneId: string;
  onMilestoneFilterChange: (id: string) => void;

  // Search
  searchTerm: string;
  onSearchChange: (term: string) => void;

  // Board visibility
  allBoards: { title: string; icon: JSX.Element; headerText: string }[];
  visibleBoards: Record<string, boolean>;
  onToggleBoard: (title: string) => void;
  autoHideSet: Set<string>;

  // UI controls
  showFilters: boolean;
  onToggleFilters: () => void;
  resetMilestoneOnTabSwitch: boolean;
  onResetMilestoneToggle: () => void;
}

export function KanbanFilters({
  organizations,
  departments,
  users,
  selectedOrganizationId,
  selectedDepartmentId,
  onOrganizationChange,
  onDepartmentChange,
  milestones,
  selectedMilestoneId,
  onMilestoneFilterChange,
  searchTerm,
  onSearchChange,
  allBoards,
  visibleBoards,
  onToggleBoard,
  autoHideSet,
  showFilters,
  onToggleFilters,
  resetMilestoneOnTabSwitch,
  onResetMilestoneToggle,
}: KanbanFiltersProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!settingsOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [settingsOpen]);
  
  // Role-based access control
  const perm = usePermission();
  const { userOrganizationId, shouldFilterByOrg } = useUserOrganization(users, departments);

  const effectiveOrganizationId = shouldFilterByOrg 
    ? userOrganizationId ?? selectedOrganizationId 
    : selectedOrganizationId;
  
  const showOrganizationFilter = perm.isSuperAdmin;

  // Filter organizations based on role and search
  const visibleOrganizations = useMemo(() => {
    const scoped = shouldFilterByOrg && userOrganizationId
      ? organizations.filter((org) => org.id === userOrganizationId)
      : organizations;
    const term = search.trim().toLowerCase();
    return term 
      ? scoped.filter((org) => org.name.toLowerCase().includes(term)) 
      : scoped;
  }, [organizations, search, shouldFilterByOrg, userOrganizationId]);

  // Filter departments based on selected organization and role
  const visibleDepartments = useMemo(() => {
    const scoped = departments.filter((dept) => {
      if (effectiveOrganizationId) return dept.organizationId === effectiveOrganizationId;
      if (shouldFilterByOrg && userOrganizationId) return dept.organizationId === userOrganizationId;
      return true;
    });
    const term = search.trim().toLowerCase();
    return term
      ? scoped.filter((dept) =>
          dept.name.toLowerCase().includes(term) ||
          dept.code.toLowerCase().includes(term))
      : scoped;
  }, [departments, effectiveOrganizationId, search, shouldFilterByOrg, userOrganizationId]);

  // Prepare dropdown options with role-based scoping
  const orgOptions = useMemo(
    () => [
      { value: "", label: "All Organizations" },
      ...visibleOrganizations.map((o) => ({ value: o.id, label: o.name })),
    ],
    [visibleOrganizations]
  );

  const deptOptions = useMemo(
    () => [
      { value: "", label: "All Departments" },
      ...visibleDepartments.map((d) => ({ value: d.id, label: d.name })),
    ],
    [visibleDepartments]
  );

  const milestoneOptions = useMemo(
    () => [
      { value: "", label: "All Milestones" },
      ...milestones.map((m) => ({ value: m.id, label: m.name })),
    ],
    [milestones]
  );

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Filter toggle */}
      <button
        onClick={onToggleFilters}
        className={`p-2 rounded-xl transition-all duration-200 ${
          showFilters ? "bg-cyan-50 text-cyan-600" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
        }`}
        title={showFilters ? "Hide filters" : "Show filters"}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
          />
        </svg>
      </button>

      {/* Settings (board visibility) */}
      <div className="relative" ref={settingsRef}>
        <button
          onClick={() => setSettingsOpen(!settingsOpen)}
          className={`p-2 rounded-xl transition-all duration-200 ${
            settingsOpen ? "bg-cyan-50 text-cyan-600" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
          }`}
          title="Board Settings"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </button>

        {settingsOpen && (
          <div className="absolute left-0 top-12 w-64 bg-white rounded-xl shadow-lg border border-slate-100 p-3 z-50">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-2">
              Visible Boards
            </h4>
            <div className="space-y-1">
              {allBoards.map((board) => {
                const autoHidden = autoHideSet.has(board.title);
                const visible = visibleBoards[board.title];
                return (
                  <button
                    key={board.title}
                    onClick={() => onToggleBoard(board.title)}
                    disabled={autoHidden}
                    className={`w-full flex items-center justify-between p-2 rounded-lg transition-all duration-200 ${
                      visible && !autoHidden
                        ? "bg-slate-50 hover:bg-slate-100"
                        : "opacity-50 hover:opacity-75 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={board.headerText}>{board.icon}</span>
                      <span
                        className={`text-xs font-medium ${
                          visible && !autoHidden ? "text-slate-700" : "text-slate-400"
                        }`}
                      >
                        {board.title}
                        {autoHidden && " (auto-hidden)"}
                      </span>
                    </div>
                    <div
                      className={`w-8 h-4 rounded-full transition-colors duration-200 ${
                        autoHidden ? "bg-slate-100" : visible ? "bg-cyan-500" : "bg-slate-200"
                      }`}
                    >
                      <div
                        className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform duration-200 mt-0.5 ${
                          visible && !autoHidden ? "translate-x-4" : "translate-x-0.5"
                        }`}
                      />
                    </div>
                  </button>
                );
              })}
            </div>

            <hr className="my-3 border-slate-100" />

            <div className="px-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600">Reset milestone on tab switch</span>
                <button
                  type="button"
                  onClick={onResetMilestoneToggle}
                  className={`w-8 h-4 rounded-full transition-colors duration-200 ${
                    resetMilestoneOnTabSwitch ? "bg-cyan-500" : "bg-slate-200"
                  }`}
                >
                  <div
                    className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform duration-200 mt-0.5 ${
                      resetMilestoneOnTabSwitch ? "translate-x-4" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filter row (hidden when showFilters is false) */}
      {showFilters && (
        <>
          {/* Organization filter - only shown for admins */}
          {showOrganizationFilter && (
            <CustomDropdown
              value={selectedOrganizationId}
              onChange={(val) => {
                onOrganizationChange(val);
                // Reset department when organization changes
                onDepartmentChange("");
              }}
              options={orgOptions}
              placeholder="All Organizations"
            />
          )}

          {/* Department filter */}
          <CustomDropdown
            value={selectedDepartmentId}
            onChange={onDepartmentChange}
            options={deptOptions}
            placeholder="All Departments"
          />

          {/* Milestone filter */}
          <CustomDropdown
            value={selectedMilestoneId}
            onChange={onMilestoneFilterChange}
            options={milestoneOptions}
            placeholder="All Milestones"
          />

          {/* Search */}
          <div className="relative">
            <svg
              className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl w-48 sm:w-64 focus:outline-none focus:border-cyan-400"
            />
          </div>
        </>
      )}
    </div>
  );
}