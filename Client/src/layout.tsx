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
  HiOutlineInbox,
  HiOutlineChartBar,
  HiOutlineCube,
  HiOutlineFlag,
} from "react-icons/hi";
import {
  VscSymbolProperty,
} from "react-icons/vsc";
import {
  RiBrainLine,
  RiGitBranchLine,
  RiWebhookLine,
  RiDashboard3Line,
  RiGitRepositoryLine,
} from "react-icons/ri";

const iconMap: Record<string, React.ReactNode> = {
  home: <HiOutlineHome className="h-[18px] w-[18px] shrink-0" />,
  projects: <HiOutlineFolder className="h-[18px] w-[18px] shrink-0" />,
  milestones: <HiOutlineFlag className="h-[18px] w-[18px] shrink-0" />,
  tasks: <HiOutlineClipboardList className="h-[18px] w-[18px] shrink-0" />,
  users: <HiOutlineUserGroup className="h-[18px] w-[18px] shrink-0" />,
  departments: <HiOutlineOfficeBuilding className="h-[18px] w-[18px] shrink-0" />,
  organization: <RiGitRepositoryLine className="h-[18px] w-[18px] shrink-0" />,
  dashboard: <RiDashboard3Line className="h-[18px] w-[18px] shrink-0" />,
  integration: <RiGitBranchLine className="h-[18px] w-[18px] shrink-0" />,
  webhook: <RiWebhookLine className="h-[18px] w-[18px] shrink-0" />,
  skill: <HiOutlineAcademicCap className="h-[18px] w-[18px] shrink-0" />,
  knowledge: <HiOutlineBookOpen className="h-[18px] w-[18px] shrink-0" />,
  activity: <HiOutlineClock className="h-[18px] w-[18px] shrink-0" />,
  inbox: <HiOutlineInbox className="h-[18px] w-[18px] shrink-0" />,
  ai: <RiBrainLine className="h-[18px] w-[18px] shrink-0" />,
  reports: <HiOutlineChartBar className="h-[18px] w-[18px] shrink-0" />,
  settings: <HiOutlineCog className="h-[18px] w-[18px] shrink-0" />,
  roles: <VscSymbolProperty className="h-[18px] w-[18px] shrink-0" />,
  permissions: <HiOutlineCube className="h-[18px] w-[18px] shrink-0" />,
};

function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { auth, logout, hasRole } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!auth) return;
    api.getUnreadNotificationCount(auth.token).then((res) => setUnreadCount(res.count));
  }, [auth]);

  const navGroups: Array<{ title: string; items: Array<{ path: string; label: string; icon: string; roles: Role[] }> }> = [
    {
      title: "Overview",
      items: [
        { path: "/", label: "Dashboard", icon: "home", roles: [] },
        { path: "/projects", label: "Projects", icon: "projects", roles: [] },
        { path: "/milestones", label: "Milestones", icon: "milestones", roles: [] },
        { path: "/tasks", label: "Tasks", icon: "tasks", roles: [] },
        { path: "/notifications", label: "Inbox", icon: "inbox", roles: [] },
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

  const pageTitle = navGroups.flatMap((g) => g.items).find((item) => item.path === location.pathname)?.label || "PMWDS";

  const navLinkClass = (path: string) =>
    `flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-300 ${location.pathname === path
      ? "bg-secondary-container/10 text-primary border-r-4 border-primary font-medium"
      : "text-on-surface-variant opacity-70 hover:bg-surface-variant hover:opacity-100"
    }`;

return (
    <div className="flex min-h-screen bg-surface text-on-surface font-body-md antialiased">
      {/* SideNavBar */}
      <nav className="fixed left-0 top-0 h-full w-[240px] bg-surface-container-lowest/95 backdrop-blur-3xl text-primary font-body-md text-body-md font-medium shadow-[4px_0_24px_rgba(0,0,0,0.05)] flex flex-col z-50">
        {/* Logo Section */}
        <div className="px-4 py-3 flex flex-col items-start">
          <div className="font-title-sm text-title-sm font-black text-primary uppercase tracking-widest">PMWDS</div>
        </div>

        {/* User Profile */}
        <div className="px-3 py-2 flex items-center gap-2 border-b border-surface-variant/30">
          <img 
            alt={auth?.fullName || "User"} 
            className="w-[28px] h-[28px] rounded-full object-cover"
            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(auth?.fullName || 'U')}&background=4648d4&color=fff`}
          />
          <div className="flex flex-col overflow-hidden">
            <span className="text-[12px] text-on-surface truncate">{auth?.fullName || "Alex Rivera"}</span>
            <span className="text-[9px] text-on-surface-variant uppercase tracking-wider">
              {auth?.roles?.join(", ") || "SuperAdmin"}
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 mt-2 flex flex-col gap-1 overflow-y-auto sidebar-scrollbar">
          {navGroups.map((group) => (
            <div key={group.title} className="flex flex-col gap-1 mb-3">
              <div className="px-3 py-1 text-[10px] text-on-surface-variant uppercase tracking-widest">{group.title}</div>
              {group.items
                .filter((item) => item.roles.length === 0 || hasRole(...item.roles))
                .map((item) => (
                  <Link key={item.path} to={item.path} className={navLinkClass(item.path)}>
                    {iconMap[item.icon]}
                    <span>{item.label}</span>
                    {item.path === "/notifications" && unreadCount > 0 && (
                      <span className="ml-auto w-2 h-2 rounded-full bg-error" />
                    )}
                  </Link>
                ))}
            </div>
          ))}
        </div>

        {/* Logout */}
        <div className="mt-auto flex flex-col pb-2">
          <button 
            onClick={logout} 
            className="flex items-center gap-2 px-3 py-2 text-on-surface-variant opacity-70 hover:bg-surface-variant transition-all duration-300 rounded-lg w-full"
          >
            <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Log Out</span>
          </button>
        </div>
      </nav>

      {/* Main Content Area - centered with max-width accounting for sidebar */}
      <div className="ml-[240px] flex-1 flex flex-col min-h-screen layout-max-width">
        {/* TopAppBar */}
        <header className="sticky top-0 h-[56px] bg-surface/90 backdrop-blur-2xl text-primary font-semibold shadow-sm z-40 border-b border-surface-variant/30">
          <div className="flex justify-between items-center w-full px-lg h-full">
            {/* Page Title */}
            <div className="font-display text-[24px] font-bold text-primary tracking-tighter">{pageTitle}</div>

            {/* Right Section */}
            <div className="flex items-center gap-md">
              {/* Search */}
              <div className="relative hidden md:block">
                <HiOutlineHome className="absolute left-sm top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-on-surface-variant" />
                <input 
                  className="pl-xl pr-md py-sm rounded-full bg-surface-container-high border-none text-body-md focus:ring-2 focus:ring-primary w-[240px]" 
                  placeholder="Search..." 
                  type="text"
                />
              </div>

              {/* Notifications */}
              <div className="flex items-center gap-sm">
                <Link to="/notifications" className="w-[36px] h-[36px] rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-variant relative">
                  <HiOutlineInbox className="h-[18px] w-[18px]" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-error" />
                  )}
                </Link>
              </div>

              <div className="h-[24px] w-[1px] bg-outline-variant mx-sm"></div>

              {/* New Project Button */}
              <Link to="/projects/new" className="gradient-btn text-on-primary font-label-caps px-md py-sm rounded-full shadow-md flex items-center gap-xs">
                <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Project
              </Link>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-container-margin flex flex-col gap-xl">
          {children}
        </main>
      </div>
    </div>
  );
}

export { Layout };