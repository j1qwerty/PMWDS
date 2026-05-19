import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { api } from "./api";
import { useAuth } from "./auth";
import type { Role } from "./types";
import { Avatar } from "./pages/shared";

import {
  HiOutlineHome,
  HiOutlineFolder,
  HiOutlineClipboardList,
  HiOutlineUserGroup,
  HiOutlineOfficeBuilding,
  HiOutlineCog,
  HiOutlineAcademicCap,
  HiOutlineBookOpen,
  HiOutlineClock,
  HiOutlineChartBar,
  HiOutlineCube,
  HiOutlineFlag,
  HiOutlineChatAlt2,
  HiOutlineSearch,
  HiOutlineBell,
  HiChat,
} from "react-icons/hi";

import { VscSymbolProperty } from "react-icons/vsc";

import {
  RiBrainLine,
  RiGitBranchLine,
  RiWebhookLine,
  RiDashboard3Line,
  RiGitRepositoryLine,
} from "react-icons/ri";

// ─── Helper: classNames ────────────────────────────────────────────
function classNames(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

const iconClass = "h-[18px] w-[18px] shrink-0";

const iconMap: Record<string, React.ReactNode> = {
  home: <HiOutlineHome className={iconClass} />,
  projects: <HiOutlineFolder className={iconClass} />,
  milestones: <HiOutlineFlag className={iconClass} />,
  tasks: <HiOutlineClipboardList className={iconClass} />,
  users: <HiOutlineUserGroup className={iconClass} />,
  departments: <HiOutlineOfficeBuilding className={iconClass} />,
  organization: <RiGitRepositoryLine className={iconClass} />,
  dashboard: <RiDashboard3Line className={iconClass} />,
  integration: <RiGitBranchLine className={iconClass} />,
  webhook: <RiWebhookLine className={iconClass} />,
  skill: <HiOutlineAcademicCap className={iconClass} />,
  knowledge: <HiOutlineBookOpen className={iconClass} />,
  activity: <HiOutlineClock className={iconClass} />,
  inbox: <HiOutlineBell className={iconClass} />,
  chat: <HiOutlineChatAlt2 className={iconClass} />,
  search: <HiOutlineSearch className={iconClass} />,
  ai: <RiBrainLine className={iconClass} />,
  reports: <HiOutlineChartBar className={iconClass} />,
  settings: <HiOutlineCog className={iconClass} />,
  roles: <VscSymbolProperty className={iconClass} />,
  permissions: <HiOutlineCube className={iconClass} />,
};

// Section color themes matching status button intensity pattern
const sectionThemes: Record<string, {
  active: string;
  hover: string;
  bgHover: string;
  borderActive: string;
  textActive: string;
  textHover: string;
  textDefault: string;
  iconActive: string;
  iconDefault: string;
  dot: string;
}> = {
  Overview: {
    active: "bg-primary/10 text-primary font-semibold",
    hover: "hover:bg-primary/5 hover:text-primary",
    bgHover: "hover:bg-primary/5",
    borderActive: "border-r-[3px] border-primary",
    textActive: "text-primary",
    textHover: "hover:text-primary",
    textDefault: "text-on-surface-variant",
    iconActive: "text-primary",
    iconDefault: "text-outline",
    dot: "bg-primary",
  },
  Team: {
    active: "bg-secondary/10 text-secondary font-semibold",
    hover: "hover:bg-secondary/5 hover:text-secondary",
    bgHover: "hover:bg-secondary/5",
    borderActive: "border-r-[3px] border-secondary",
    textActive: "text-secondary",
    textHover: "hover:text-secondary",
    textDefault: "text-on-surface-variant",
    iconActive: "text-secondary",
    iconDefault: "text-outline",
    dot: "bg-secondary",
  },
  Tools: {
    active: "bg-green-50 text-green-500 font-semibold",
    hover: "hover:bg-green-50 hover:text-green-500",
    bgHover: "hover:bg-green-50",
    borderActive: "border-r-[3px] border-tertiary",
    textActive: "text-green-500",
    textHover: "hover:text-tertiary",
    textDefault: "text-on-surface-variant",
    iconActive: "text-tertiary",
    iconDefault: "text-outline",
    dot: "bg-tertiary",
  },
  System: {
    active: "bg-error/10 text-error font-semibold",
    hover: "hover:bg-error/5 hover:text-error",
    bgHover: "hover:bg-error/5",
    borderActive: "border-r-[3px] border-error",
    textActive: "text-error",
    textHover: "hover:text-error",
    textDefault: "text-on-surface-variant",
    iconActive: "text-error",
    iconDefault: "text-outline",
    dot: "bg-error",
  },
};

function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { auth, logout, hasRole } = useAuth();

  const [unreadCount, setUnreadCount] = useState(0);
  const [oldUiExpanded, setOldUiExpanded] = useState(false);

  useEffect(() => {
    if (!auth) return;

    api
      .getUnreadNotificationCount(auth.token)
      .then((res) => setUnreadCount(res.count))
      .catch(() => setUnreadCount(0));
  }, [auth]);

  const newUiNavGroups: Array<{
    title: string;
    items: Array<{
      path: string;
      label: string;
      icon: string;
      roles: Role[];
    }>;
  }> = [
      {
        title: "Overview",
        items: [
          { path: "/", label: "Dashboard", icon: "home", roles: [] },
          { path: "/projects", label: "Projects", icon: "projects", roles: [] },
          { path: "/milestonesPage", label: "Milestones", icon: "milestones", roles: [] },
          { path: "/tasks", label: "Tasks", icon: "tasks", roles: [] },
          { path: "/notificationsPage", label: "Notifications", icon: "inbox", roles: [] },
          { path: "/chat", label: "Chats", icon: "chat", roles: [] },
        ],
      },
      {
        title: "Team",
        items: [
          { path: "/organizationStructure", label: "Organizations", icon: "organization", roles: ["SuperAdmin", "ProjectManager", "DepartmentHead"] },
          { path: "/departmentsPage", label: "Departments", icon: "departments", roles: ["SuperAdmin", "ProjectManager", "DepartmentHead"] },
          { path: "/users", label: "People", icon: "users", roles: ["SuperAdmin", "ProjectManager", "DepartmentHead", "TeamLead"] },
          { path: "/profiles", label: "Profiles", icon: "users", roles: [] },
          { path: "/skills", label: "Skills", icon: "skill", roles: ["SuperAdmin", "ProjectManager", "DepartmentHead", "TeamLead"] },
        ],
      },
      {
        title: "Tools",
        items: [
          { path: "/reports", label: "Reports", icon: "reports", roles: ["SuperAdmin", "ProjectManager", "DepartmentHead"] },
          { path: "/ai", label: "AI Insights", icon: "ai", roles: ["SuperAdmin", "ProjectManager", "DepartmentHead"] },
        ],
      },
      {
        title: "System",
        items: [
          { path: "/roles", label: "Roles", icon: "roles", roles: ["SuperAdmin"] },
          { path: "/activity-logs", label: "Activity Logs", icon: "activity", roles: ["SuperAdmin"] },
          { path: "/settings", label: "Settings", icon: "settings", roles: ["SuperAdmin"] },
        ],
      },
    ];


  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  const allItems = [...newUiNavGroups.flatMap((g) => g.items)];
  const pageTitle =
    allItems.find((item) => isActive(item.path))?.label || "PMWDS";

  return (
    <div className="flex min-h-screen bg-background text-on-surface font-sans antialiased">
      {/* Sidebar */}
      <nav
        className="
          fixed left-0 top-0 z-50
          h-full w-[240px]
          bg-surface-container-lowest/95
          backdrop-blur-3xl
          shadow-[8px_0_40px_rgba(0,0,0,0.05)]
          flex flex-col
        "
      >
        {/* Logo */}
        <div className="px-5 pt-5 pb-3">
          <div className="text-[22px] font-black text-primary uppercase tracking-[0.22em]">
            PMWDS
          </div>
        </div>

        {/* User */}
        <div className="mx-3 mb-4 rounded-2xl bg-surface-container-low px-3 py-3">
          <div className="flex items-center gap-3">
            <Avatar
              person={{
                id: auth?.userId,
                fullName: auth?.fullName || "User",
                profilePictureUrl: auth?.profilePictureUrl,
              }}
              size="sm"
              className="ring-2 ring-primary/20"
            />

            <div className="flex min-w-0 flex-col">
              <span className="truncate text-[13px] font-medium text-on-surface">
                {auth?.fullName || "Alex Rivera"}
              </span>

              <span className="truncate text-[9px] uppercase tracking-[0.18em] text-outline">
                {auth?.roles?.join(", ") || "SuperAdmin"}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div
          className="
            sidebar-scrollbar
            flex-1 overflow-y-auto
            px-3 pr-4
            space-y-5
          "
        >
          {newUiNavGroups.map((group, index) => {
            const theme = sectionThemes[group.title] || sectionThemes.Overview;

            return (
              <div key={group.title} className="space-y-1.5">
                {/* Show section title for all groups except first (Overview) */}
                {index !== 0 && (
                  <div className={`px-3 pb-1 text-[10px] uppercase tracking-[0.18em] font-semibold ${theme.textDefault}`}>
                    {group.title}
                  </div>
                )}

                <div className="space-y-[2px]">
                  {group.items
                    .filter(
                      (item) =>
                        item.roles.length === 0 || hasRole(...item.roles)
                    )
                    .map((item) => {
                      const active = isActive(item.path);

                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          className={classNames(
                            "relative flex items-center gap-3 px-3 py-[9px] rounded-md transition-all duration-200",
                            active
                              ? `${theme.active} ${theme.borderActive}`
                              : `${theme.textDefault} ${theme.hover} border-r-[3px] border-transparent`,
                            "group"
                          )}
                        >
                          <span
                            className={classNames(
                              "transition-all duration-300",
                              active
                                ? `${theme.iconActive} scale-110`
                                : `${theme.iconDefault} group-hover:scale-110`
                            )}
                          >
                            {iconMap[item.icon]}
                          </span>

                          <span className="text-[13px] font-medium tracking-[0.01em]">
                            {item.label}
                          </span>

                          {(item.path === "/notifications" || item.path === "/notificationsPage") &&
                            unreadCount > 0 && (
                              <span className="ml-auto h-2 w-2 rounded-full bg-error shadow-[0_0_10px_rgba(186,26,26,0.9)] animate-pulse" />
                            )}
                        </Link>
                      );
                    })}
                </div>
              </div>
            );
          })}

         
        </div>

        {/* Logout */}
        <div className="px-3 pb-3 pt-2">
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full rounded-xl px-3 py-2.5 text-on-surface-variant transition-all duration-300 hover:bg-error-container hover:text-error"
          >
            <svg
              className="h-[18px] w-[18px]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>

            <span className="text-[13px]">Log Out</span>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="ml-[240px] flex min-h-screen flex-1 flex-col layout-max-width">
        {/* Topbar */}
        <header
          className="sticky top-0 z-40 h-[56px] bg-surface-container-lowest/90 backdrop-blur-2xl border-b border-surface-variant"
        >
          <div className="flex h-full items-center justify-between px-6">
            {/* Page Title */}
            <div className="text-h2 font-bold tracking-[-0.03em] text-primary">
              {pageTitle}
            </div>

            {/* Right */}
            <div className="flex items-center gap-4">
              {/* Search */}
              <div className="relative hidden md:block">
                <span className="material-symbols-outlined absolute left-4 top-2 text-outline text-[20px] pointer-events-none">
                  search
                </span>
                <input
                  className="
                    w-[250px]
                    h-[40px]
                    rounded-full
                    bg-surface-container-low
                    border border-surface-variant
                    pl-11 pr-4
                    text-[13px]
                    text-on-surface
                    placeholder:text-outline
                    outline-none
                    transition-all duration-300
                    focus:border-primary
                    focus:bg-surface-container-lowest
                    focus:ring-2 focus:ring-primary/10
                  "
                  placeholder="Search..."
                  type="text"
                />
              </div>

              {/* Chat */}
              <Link
                to="/chat"
                className="relative flex h-[38px] w-[38px] items-center justify-center rounded-full text-on-surface-variant transition-all duration-300 hover:bg-primary/10 hover:text-primary hover:scale-110"
              >
                {/* <span className="material-symbols-outlined text-[20px]">chat</span> */}
                <HiOutlineChatAlt2></HiOutlineChatAlt2>
              </Link>

              {/* Notifications */}
              <Link
                to="/notifications"
                className="relative flex h-[38px] w-[38px] items-center justify-center rounded-full text-on-surface-variant transition-all duration-300 hover:bg-primary/10 hover:text-primary hover:scale-110"
              >
                {/* <span className="material-symbols-outlined text-[20px]">inbox</span> */}
                <HiOutlineBell></HiOutlineBell>

                {unreadCount > 0 && (
                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-error shadow-[0_0_10px_rgba(186,26,26,0.9)] animate-pulse" />
                )}
              </Link>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex flex-1 flex-col gap-xl p-container-margin px-4">
          {children}
        </main>
      </div>
    </div>
  );
}

export { Layout };
