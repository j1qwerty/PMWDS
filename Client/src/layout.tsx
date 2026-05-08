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
          // { path: "/settings", label: "Settings", icon: "settings", roles: [] },
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

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800 font-sans antialiased">
      {/* Sidebar */}
      <nav
        className="
          fixed left-0 top-0 z-50
          h-full w-[240px]
          bg-white/95
          backdrop-blur-3xl
          shadow-[8px_0_40px_rgba(0,0,0,0.22)]
          flex flex-col
        "
      >
        {/* Logo */}
        <div className="px-5 pt-5 pb-3">
          <div className="text-[22px] font-black text-blue-600 uppercase tracking-[0.22em]">
            PMWDS
          </div>
        </div>

        {/* User */}
        <div className="mx-3 mb-4 rounded-2xl bg-slate-100 px-3 py-3">
          <div className="flex items-center gap-3">
            <img
              alt={auth?.fullName || "User"}
              className="h-9 w-9 rounded-full object-cover ring-2 ring-blue-200"
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
                auth?.fullName || "U"
              )}&background=4648d4&color=fff`}
            />

            <div className="flex min-w-0 flex-col">
              <span className="truncate text-[13px] font-medium text-slate-700">
                {auth?.fullName || "Alex Rivera"}
              </span>

              <span className="truncate text-[9px] uppercase tracking-[0.18em] text-slate-400">
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
                        <div className="px-3 pb-1 text-[10px] uppercase tracking-[0.18em] text-slate-400/60">
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
                              className={`relative flex items-center gap-3 px-3 py-[9px] rounded-md transition-all duration-200 ${
                                isActive(item.path)
                                  ? "bg-blue-100 text-blue-700 font-semibold border-r-[3px] border-blue-600"
                                  : "text-slate-600 hover:bg-blue-50 hover:text-blue-600 border-r-[3px] border-transparent"
                              }`}
                            >
                              <span
                                className={`transition-transform duration-300 ${
                                  isActive(item.path)
                                    ? "scale-105 text-blue-700"
                                    : "group-hover:scale-105 text-slate-500"
                                }`}
                              >
                                {iconMap[item.icon]}
                              </span>

                              <span className="text-[13px] font-medium tracking-[0.01em]">
                                {item.label}
                              </span>

                      {item.path === "/notifications" &&
                        unreadCount > 0 && (
                          <span className="ml-auto h-2 w-2 rounded-full bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.9)]" />
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
            className="flex items-center gap-3 w-full rounded-xl px-3 py-2.5 text-slate-500 transition-all duration-300 hover:bg-red-50 hover:text-red-600"
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
          className="sticky top-0 z-40 h-[56px] bg-white/90 backdrop-blur-2xl border-b border-slate-200"
        >
          <div className="flex h-full items-center justify-between px-6">
            {/* Page Title */}
            <div className="text-[24px] font-bold tracking-[-0.03em] text-blue-600">
              {pageTitle}
            </div>

            {/* Right */}
            <div className="flex items-center gap-4">
              {/* Search */}
              <div className="relative hidden md:block">
                <HiOutlineSearch className="absolute left-4 top-1/2 h-[16px] w-[16px] -translate-y-1/2 text-slate-400" />
                <input
                  className="
                    w-[250px]
                    h-[40px]
                    rounded-full
                    bg-slate-100
                    border border-slate-200
                    pl-11 pr-4
                    text-[13px]
                    text-slate-700
                    placeholder:text-slate-400
                    outline-none
                    transition-all duration-300
                    focus:border-blue-300
                    focus:bg-white
                    focus:ring-2 focus:ring-blue-100
                  "
                  placeholder="Search..."
                  type="text"
                />
              </div>

              {/* Chat */}
              <Link
                to="/chat"
                className="relative flex h-[38px] w-[38px] items-center justify-center rounded-full text-slate-500 transition-all duration-300 hover:bg-blue-50 hover:text-blue-600"
              >
                <HiOutlineChatAlt2 className="h-[18px] w-[18px]" />
              </Link>

              {/* Notifications */}
              <Link
                to="/notifications"
                className="relative flex h-[38px] w-[38px] items-center justify-center rounded-full transition-all duration-300 hover:bg-blue-50 hover:text-blue-600"
              >
                {iconMap.inbox}

                {unreadCount > 0 && (
                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.9)]" />
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