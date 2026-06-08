import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAppData } from "../../appData";
import type { Project } from "../../types";
import { useUserOrganization } from "../shared/useUserOrganization";
import { PERMISSION_GROUPS, usePermission } from "../shared/RoleGate";
import { getStatusColor } from "../shared/colors";
import { projectBelongsToAnyDepartment } from "../shared/projectDepartments";
import {
  HiOutlineFolder,
  HiOutlineClipboardList,
  HiOutlineFlag,
  HiOutlineChevronRight,
} from "react-icons/hi";

export interface ProjectsGroupTheme {
  active: string;
  hover: string;
  bgHover: string;
  borderActive: string;
  textActive: string;
  textHover: string;
  textDefault: string;
  iconActive: string;
  iconDefault: string;
  initialBg: string;
  initialText: string;
  initialActiveBg: string;
  initialActiveText: string;
}

interface ProjectsGroupProps {
  theme: ProjectsGroupTheme;
  iconClass: string;
  compact?: boolean;
  onRequestExpand?: () => void;
}

const STORAGE_KEY = "pmwds.sidebar.expandedProjects";

function loadExpanded(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function saveExpanded(ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    /* ignore */
  }
}

function getInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function ProjectsGroup({
  theme,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  iconClass,
  compact = false,
  onRequestExpand,
}: ProjectsGroupProps) {
  const location = useLocation();
  const { data } = useAppData();
  const perm = usePermission();
  const { userOrganizationId, shouldFilterByOrg } = useUserOrganization(
    data.users,
    data.departments,
  );

  const [expandedIds, setExpandedIds] = useState<string[]>(() => loadExpanded());

  const [sectionCollapsed, setSectionCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem("pmwds.sidebar.collapsedSection") === "true";
    } catch {
      return false;
    }
  });

  const [showAllProjects, setShowAllProjects] = useState(false);

  useEffect(() => {
    saveExpanded(expandedIds);
  }, [expandedIds]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem("pmwds.sidebar.collapsedSection", String(sectionCollapsed));
    } catch {
      /* ignore */
    }
  }, [sectionCollapsed]);

  const visibleProjects = useMemo<Project[]>(() => {
    if (!perm.has(PERMISSION_GROUPS.project.view)) return [];
    let filtered = data.projects;
    if (shouldFilterByOrg && userOrganizationId) {
      const orgDeptIds = data.departments
        .filter((d) => d.organizationId === userOrganizationId)
        .map((d) => d.id);
      filtered = filtered.filter((p) => projectBelongsToAnyDepartment(p, orgDeptIds));
    }
    return filtered;
  }, [data.projects, data.departments, shouldFilterByOrg, userOrganizationId, perm]);

  const DISPLAY_LIMIT = 10;
  const displayedProjects = useMemo(() => {
    if (showAllProjects) return visibleProjects;
    return visibleProjects.slice(0, DISPLAY_LIMIT);
  }, [visibleProjects, showAllProjects]);
  const hasMore = visibleProjects.length > DISPLAY_LIMIT;

  const activeProjectId = useMemo(() => {
    const match = location.pathname.match(/^\/projects\/([^/]+)/);
    return match ? match[1] : "";
  }, [location.pathname]);

  useEffect(() => {
    if (!activeProjectId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setExpandedIds((prev) => (prev.includes(activeProjectId) ? prev : [...prev, activeProjectId]));
  }, [activeProjectId]);

  const isChildActive = useCallback(
    (projectId: string) => location.pathname.startsWith(`/projects/${projectId}/`),
    [location.pathname],
  );

  const isChildExactActive = useCallback(
    (projectId: string, suffix: string) => location.pathname === `/projects/${projectId}${suffix}`,
    [location.pathname],
  );

  const toggle = (projectId: string) => {
    setExpandedIds((prev) =>
      prev.includes(projectId) ? prev.filter((id) => id !== projectId) : [...prev, projectId],
    );
  };

  const handleCompactClick = (projectId: string) => {
    setExpandedIds((prev) =>
      prev.includes(projectId) ? prev : [...prev, projectId],
    );
    onRequestExpand?.();
  };

  if (!visibleProjects.length) return null;

  if (compact) {
    return (
      <div className="flex flex-col items-center gap-1 border-t border-surface-variant/60 pt-2">
        {visibleProjects.map((project) => {
          const active = isChildActive(project.id);
          return (
            <button
              key={project.id}
              type="button"
              onClick={() => handleCompactClick(project.id)}
              title={project.name}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold uppercase transition-all duration-200 hover:scale-110 ${
                active
                  ? `${theme.initialActiveBg} ${theme.initialActiveText} ring-2 ring-violet-300`
                  : `${theme.initialBg} ${theme.initialText}`
              }`}
            >
              {getInitials(project.name)}
            </button>
          );
        })}
      </div>
    ); 
  }

  return (
    <div
      className="border-t border-surface-variant/60"
      style={{ paddingTop: "clamp(4px, 0.6vw, 6px)" }}
    >
      <button
        type="button"
        onClick={() => setSectionCollapsed((p) => !p)}
        className={`w-full flex items-center justify-between px-[clamp(8px,1.5vw,12px)] pb-[clamp(2px,0.5vw,4px)] text-cyan-600 text-[clamp(9px,1.2vw,10px)] uppercase tracking-[0.18em] font-semibold ${theme.textDefault}`}
      >
        <span>Projects</span>
        <HiOutlineChevronRight
          className={`w-3 h-3 shrink-0 transition-transform duration-200 ${sectionCollapsed ? "" : "rotate-90"}`}
        />
      </button>

      {!sectionCollapsed && (
        <div className="space-y-[clamp(1px,0.3vw,2px)]">
        {displayedProjects.map((project) => {
          const expanded = expandedIds.includes(project.id);
          const parentActive = isChildActive(project.id);
          const childTasksActive = isChildExactActive(project.id, "/tasks");
          const childMilestonesActive = isChildExactActive(project.id, "/milestones");
          const status = getStatusColor(project.status);
          return (
            <div key={project.id} className="flex flex-col">
              <button
                type="button"
                onClick={() => toggle(project.id)}
                className={`relative flex items-center gap-[clamp(2px,1.5vw,6px)] px-[clamp(2px,1.5vw,4px)] py-[clamp(7px,1vw,9px)] rounded-md transition-all duration-200 group ${
                  parentActive
                    ? `${theme.active} ${theme.borderActive}`
                    : `${theme.textDefault} ${theme.hover} border-r-[3px] border-transparent`
                }`}
                
                title={project.name}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${status.dot}`}
                  title={project.status}
                />
                {/* <span
                  className={`shrink-0 transition-all duration-300 ${
                    parentActive
                      ? `${theme.iconActive} scale-110`
                      : `${theme.iconDefault} group-hover:scale-110`
                  }`}
                >
                  <HiOutlineFolder className={iconClass} />
                </span> */}
                <span className="text-[clamp(11px,1.5vw,13px)] font-medium tracking-[0.01em] truncate flex-1 text-left">
                  {project.name}
                </span>
                
                <HiOutlineChevronRight
                  className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${
                    expanded ? "rotate-90" : ""
                  } ${parentActive ? theme.iconActive : theme.iconDefault}`}
                />
              </button>

              {expanded && (
                <div className="flex flex-col ml-[clamp(16px,2.5vw,20px)] border-l border-surface-variant/60 pl-1">
                   <Link
                    to={`/projects/${project.id}/milestones`}
                    className={`flex items-center gap-[clamp(6px,1vw,10px)] px-[clamp(8px,1.5vw,12px)] py-[clamp(5px,0.8vw,7px)] rounded-md transition-all duration-200 ${
                      childMilestonesActive
                        ? `${theme.active}`
                        : `${theme.textDefault} ${theme.hover}`
                    }`}
                  >
                    <HiOutlineFlag className="h-[clamp(13px,1.6vw,15px)] w-[clamp(13px,1.6vw,15px)] shrink-0" />
                    <span className="text-[clamp(10px,1.3vw,12px)] font-medium">Milestones</span>
                  </Link>
                  <Link
                    to={`/projects/${project.id}/tasks`}
                    className={`flex items-center gap-[clamp(6px,1vw,10px)] px-[clamp(8px,1.5vw,12px)] py-[clamp(5px,0.8vw,7px)] rounded-md transition-all duration-200 ${
                      childTasksActive
                        ? `${theme.active}`
                        : `${theme.textDefault} ${theme.hover}`
                    }`}
                  >
                    <HiOutlineClipboardList className="h-[clamp(13px,1.6vw,15px)] w-[clamp(13px,1.6vw,15px)] shrink-0" />
                    <span className="text-[clamp(10px,1.3vw,12px)] font-medium">Tasks</span>
                  </Link>
                 
                </div>
              )}
            </div>
          );
        })}

        {hasMore && !showAllProjects && (
          <button
            type="button"
            onClick={() => setShowAllProjects(true)}
            className="w-full flex items-center justify-center gap-1 text-[clamp(10px,1.3vw,11px)] text-cyan-500 hover:text-cyan-400 font-medium py-[clamp(4px,0.5vw,6px)] transition-colors rounded-md hover:bg-white/5"
          >
            <span>+ Show more ({visibleProjects.length - DISPLAY_LIMIT} more)</span>
          </button>
        )}
        {showAllProjects && hasMore && (
          <button
            type="button"
            onClick={() => setShowAllProjects(false)}
            className="w-full flex items-center justify-center gap-1 text-[clamp(10px,1.3vw,11px)] text-cyan-500 hover:text-cyan-400 font-medium py-[clamp(4px,0.5vw,6px)] transition-colors rounded-md hover:bg-white/5"
          >
            <span>- Show less</span>
          </button>
        )}
      </div>
      )}
    </div>
  );
}
