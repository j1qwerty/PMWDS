import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { api } from "./api";
import { useAuth } from "./auth";
import type { Role } from "./types";

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
} from "react-icons/hi";

import { VscSymbolProperty } from "react-icons/vsc";

import {
  RiBrainLine,
  RiGitBranchLine,
  RiWebhookLine,
  RiDashboard3Line,
  RiGitRepositoryLine,
} from "react-icons/ri";

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

function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { auth, logout, hasRole } = useAuth();

  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!auth) return;

    api
      .getUnreadNotificationCount(auth.token)
      .then((res) => setUnreadCount(res.count))
      .catch(() => setUnreadCount(0));
  }, [auth]);

  const navGroups: Array<{
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
          { path: "/milestones", label: "Milestones", icon: "milestones", roles: [] },
          { path: "/tasks", label: "Tasks", icon: "tasks", roles: [] },
          { path: "/notifications", label: "Notifications", icon: "inbox", roles: [] },
          { path: "/chat", label: "Chats", icon: "chat", roles: [] },
        ],
      },
      {
        title: "Team",
        items: [
          { path: "/organizations", label: "Organizations", icon: "organization", roles: ["SuperAdmin", "ProjectManager", "DepartmentHead"] },
          { path: "/departments", label: "Departments", icon: "departments", roles: ["SuperAdmin", "ProjectManager", "DepartmentHead"] },
          { path: "/users", label: "People", icon: "users", roles: ["SuperAdmin", "ProjectManager", "DepartmentHead", "TeamLead"] },
          { path: "/profiles", label: "Profiles", icon: "users", roles: ["SuperAdmin", "ProjectManager", "DepartmentHead", "TeamLead"] },
          { path: "/roles", label: "Roles", icon: "roles", roles: ["SuperAdmin"] },
          { path: "/skills", label: "Skills", icon: "skill", roles: ["SuperAdmin", "ProjectManager", "DepartmentHead", "TeamLead"] },
        ],
      },
      {
        title: "Tools",
        items: [
          // { path: "/knowledge", label: "Knowledge", icon: "knowledge", roles: [] },
          { path: "/reports", label: "Reports", icon: "reports", roles: ["SuperAdmin", "ProjectManager", "DepartmentHead"] },
          { path: "/ai", label: "AI Insights", icon: "ai", roles: ["SuperAdmin", "ProjectManager", "DepartmentHead"] },
          // { path: "/dashboards", label: "Dashboards", icon: "dashboard", roles: [] },
          // { path: "/integrations", label: "Integrations", icon: "integration", roles: ["SuperAdmin", "ProjectManager", "DepartmentHead"] },
          // { path: "/webhooks", label: "Webhooks", icon: "webhook", roles: ["SuperAdmin", "ProjectManager", "DepartmentHead"] },
        ],
      },
      {
        title: "System",
        items: [
          { path: "/activity-logs", label: "Activity Logs", icon: "activity", roles: [] },
          { path: "/settings", label: "Settings", icon: "settings", roles: [] },
          // { path: "/permissions", label: "Permissions", icon: "permissions", roles: ["SuperAdmin"] },
        ],
      },
    ];

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }

    return location.pathname.startsWith(path);
  };

  const pageTitle =
    navGroups
      .flatMap((g) => g.items)
      .find((item) => isActive(item.path))?.label || "PMWDS";

  const navLinkClass = (path: string) =>
    `
    group relative flex items-center gap-3
    px-3 py-[9px]
    rounded-md
    transition-all duration-300 ease-out
    overflow-hidden
    ${isActive(path)
      ? `
          bg-gradient-to-r from-primary/20 via-primary/10 to-transparent
          text-primary
          shadow-[0_8px_30px_rgba(99,102,241,0.16)]
          border border-primary/10
        `
      : `
          text-on-surface-variant/75
          hover:text-on-surface
          hover:bg-surface-container-high/70
          hover:border hover:border-white/5
        `
    }
  `;

  return (
    <div className="flex min-h-screen bg-surface text-on-surface font-body-md antialiased">
      {/* Sidebar */}
      <nav
        className="
          fixed left-0 top-0 z-50
          h-full w-[240px]
          bg-surface-container-lowest/95
          backdrop-blur-3xl
          shadow-[8px_0_40px_rgba(0,0,0,0.22)]
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
            <img
              alt={auth?.fullName || "User"}
              className="h-9 w-9 rounded-full object-cover ring-2 ring-primary/10"
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
                auth?.fullName || "U"
              )}&background=4648d4&color=fff`}
            />

            <div className="flex min-w-0 flex-col">
              <span className="truncate text-[13px] font-medium text-on-surface">
                {auth?.fullName || "Alex Rivera"}
              </span>

              <span className="truncate text-[9px] uppercase tracking-[0.18em] text-on-surface-variant">
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
          {navGroups.map((group, index) => (
            <div key={group.title} className="space-y-1.5">
              {/* Remove first Overview title */}
              {index !== 0 && (
                <div className="px-3 pb-1 text-[10px] uppercase tracking-[0.18em] text-on-surface-variant/60">
                  {group.title}
                </div>
              )}

              <div className="space-y-[2px]">
                {group.items
                  .filter(
                    (item) =>
                      item.roles.length === 0 || hasRole(...item.roles)
                  )
                  .map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={navLinkClass(item.path)}
                    >
                      {/* Active Glow */}
                      {isActive(item.path) && (
                        <div className="absolute left-0 top-[15%] h-[70%] w-[3px] rounded-r-md bg-primary shadow-[0_0_16px_rgba(99,102,241,0.8)]" />
                      )}

                      <span
                        className={`
                          transition-all duration-300
                          ${isActive(item.path)
                            ? "scale-105 text-primary"
                            : "group-hover:scale-105"
                          }
                        `}
                      >
                        {iconMap[item.icon]}
                      </span>

                      <span className="text-[13px] font-medium tracking-[0.01em]">
                        {item.label}
                      </span>

                      {item.path === "/notifications" &&
                        unreadCount > 0 && (
                          <span className="ml-auto h-2 w-2 rounded-full bg-error shadow-[0_0_12px_rgba(239,68,68,0.7)]" />
                        )}
                    </Link>
                  ))}
              </div>
            </div>
          ))}
        </div>

        {/* Logout */}
        <div className="px-3 pb-3 pt-2">
          <button
            onClick={logout}
            className="
              flex items-center gap-3
              w-full
              rounded-2xl
              px-3 py-2.5
              text-on-surface-variant/70
              transition-all duration-300
              hover:bg-surface-container-high
              hover:text-on-surface
            "
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
          className="
            sticky top-0 z-40
            h-[56px]
            bg-surface/85
            backdrop-blur-2xl
            border-b border-white/[0.04]
          "
        >
          <div className="flex h-full items-center justify-between px-lg">
            {/* Page Title */}
            <div className="text-[24px] font-bold tracking-[-0.03em] text-primary">
              {pageTitle}
            </div>

            {/* Right */}
            <div className="flex items-center gap-md">
              {/* Search */}
              <div className="relative hidden md:block">
                <HiOutlineSearch className="absolute left-4 top-1/2 h-[16px] w-[16px] -translate-y-1/2 text-on-surface-variant/70" />
                <input
                  className="
                    w-[250px]
                    h-[40px]
                    rounded-full
                    bg-surface-container-high/70
                    border border-white/[0.04]
                    pl-11 pr-4
                    text-[13px]
                    text-on-surface
                    placeholder:text-on-surface-variant/70
                    outline-none
                    transition-all duration-300
                    focus:border-primary/20
                    focus:bg-surface-container-high
                    focus:ring-2 focus:ring-primary/10
                  "
                  placeholder="Search..."
                  type="text"
                />
              </div>

              {/* Chat */}
              <Link
                to="/chat"
                className="
                  relative flex h-[38px] w-[38px]
                  items-center justify-center
                  rounded-full
                  text-on-surface-variant
                  transition-all duration-300
                  hover:bg-surface-container-high
                  hover:text-on-surface
                "
              >
                <HiOutlineChatAlt2 className="h-[18px] w-[18px]" />
              </Link>

              {/* Notifications */}
              <Link
                to="/notifications"
                className="relative flex h-[38px] w-[38px] items-center justify-center rounded-full  transition-all duration-300 hover:bg-[#4648d4]/20 hover:text-white"
              >
                {iconMap.inbox}

                {unreadCount > 0 && (
                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-error shadow-[0_0_12px_rgba(239,68,68,0.7)]" />
                )}
              </Link>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex flex-1 flex-col gap-xl p-container-margin">
          {children}
        </main>
      </div>
    </div>
  );
}

export { Layout };