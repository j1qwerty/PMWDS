import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { api } from "./api";
import { useAuth } from "./auth";
import type { Role } from "./types";

function NavIcon({ type }: { type: string }) {
  const iconMap: Record<string, string> = {
    home: "grid_view",
    projects: "folder_open",
    milestones: "flag",
    tasks: "task_alt",
    inbox: "inbox",
    organizations: "corporate_fare",
    departments: "hub",
    users: "group",
    profiles: "account_circle",
    roles: "admin_panel_settings",
    skills: "psychology",
    knowledge: "auto_stories",
    ai: "insights",
    reports: "assessment",
    activity: "history",
    settings: "settings",
  };

  return (
    <span className="material-symbols-outlined">{iconMap[type] || "circle"}</span>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { auth, logout, hasRole } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!auth) return;
    api.getUnreadNotificationCount(auth.token).then((res) => setUnreadCount(res.count));
  }, [auth]);

  const navItems: Array<{ path: string; label: string; icon: string; roles: Role[] }> = [
    { path: "/", label: "Dashboard", icon: "home", roles: [] },
    { path: "/projects", label: "Projects", icon: "projects", roles: [] },
    { path: "/milestones", label: "Milestones", icon: "milestones", roles: [] },
    { path: "/tasks", label: "Tasks", icon: "tasks", roles: [] },
    { path: "/notifications", label: "Inbox", icon: "inbox", roles: [] },
    { path: "/organizations", label: "Organizations", icon: "organizations", roles: ["SuperAdmin", "ProjectManager", "DepartmentHead"] },
    { path: "/departments", label: "Departments", icon: "departments", roles: ["SuperAdmin", "ProjectManager", "DepartmentHead"] },
    { path: "/users", label: "Users", icon: "users", roles: ["SuperAdmin", "ProjectManager", "DepartmentHead", "TeamLead"] },
    { path: "/profiles", label: "Profiles", icon: "profiles", roles: ["SuperAdmin", "ProjectManager", "DepartmentHead", "TeamLead"] },
    { path: "/roles", label: "Roles and permissions", icon: "roles", roles: ["SuperAdmin"] },
    { path: "/skills", label: "Skills", icon: "skills", roles: ["SuperAdmin", "ProjectManager", "DepartmentHead", "TeamLead"] },
    { path: "/knowledge", label: "Knowledge", icon: "knowledge", roles: [] },
    { path: "/ai", label: "AI Insights", icon: "ai", roles: ["SuperAdmin", "ProjectManager", "DepartmentHead"] },
    { path: "/reports", label: "Reports", icon: "reports", roles: ["SuperAdmin", "ProjectManager", "DepartmentHead"] },
    { path: "/activity-logs", label: "Activity Logs", icon: "activity", roles: [] },
    { path: "/settings", label: "Settings", icon: "settings", roles: [] },
  ];

  const visibleNavItems = navItems.filter((item) => item.roles.length === 0 || hasRole(...item.roles));
  const pageTitle = navItems.find((item) => item.path === location.pathname)?.label || "PMWDS";

  const navLinkClass = (path: string) =>
    `flex items-center gap-md px-4 py-3 rounded-lg transition-all duration-300 ${
      location.pathname === path
        ? "bg-secondary-container/10 text-primary border-r-4 border-primary font-medium"
        : "text-on-surface-variant opacity-70 hover:bg-surface-variant hover:opacity-100"
    }`;

  return (
    <div className="flex min-h-screen bg-surface text-on-surface font-body-md antialiased overflow-x-hidden">
      {/* SideNavBar */}
      <nav className="fixed left-0 top-0 h-full w-[240px] bg-surface-container-lowest/95 backdrop-blur-3xl text-primary font-body-md text-body-md font-medium shadow-[4px_0_24px_rgba(0,0,0,0.05)] flex flex-col py-md z-50">
        {/* Logo Section */}
        <div className="px-lg py-md flex flex-col items-start gap-sm">
          <div className="font-title-sm text-title-sm font-black text-primary uppercase tracking-widest mb-md">PMWDS</div>
        </div>

        {/* User Profile */}
        <div className="px-4 py-md flex items-center gap-sm border-b border-surface-variant/30 mb-sm">
          <img 
            alt={auth?.fullName || "User"} 
            className="w-[36px] h-[36px] rounded-full object-cover"
            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(auth?.fullName || 'U')}&background=4648d4&color=fff`}
          />
          <div className="flex flex-col overflow-hidden">
            <span className="text-[13px] text-on-surface truncate">{auth?.fullName || "Alex Rivera"}</span>
            <span className="text-[10px] text-on-surface-variant uppercase tracking-wider">
              {auth?.roles?.join(", ") || "SuperAdmin"}
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 mt-lg flex flex-col gap-xs overflow-y-auto sidebar-scrollbar">
          {/* Navigation Group */}
          <div className="flex flex-col gap-xs mb-md">
            <div className="px-4 py-2 text-label-caps text-on-surface-variant uppercase tracking-widest">Navigation</div>
            {visibleNavItems.slice(0, 5).map((item) => (
              <Link key={item.path} to={item.path} className={navLinkClass(item.path)}>
                <NavIcon type={item.icon} />
                <span>{item.label}</span>
                {item.path === "/notifications" && unreadCount > 0 && (
                  <span className="ml-auto w-2 h-2 rounded-full bg-error" />
                )}
              </Link>
            ))}
          </div>

          {/* People Group */}
          <div className="flex flex-col gap-xs mb-md">
            <div className="px-4 py-2 text-label-caps text-on-surface-variant uppercase tracking-widest">People</div>
            {visibleNavItems.slice(5, 11).map((item) => (
              <Link key={item.path} to={item.path} className={navLinkClass(item.path)}>
                <NavIcon type={item.icon} />
                <span>{item.label}</span>
              </Link>
            ))}
          </div>

          {/* Resources Group */}
          <div className="flex flex-col gap-xs mb-md">
            <div className="px-4 py-2 text-label-caps text-on-surface-variant uppercase tracking-widest">Resources</div>
            {visibleNavItems.slice(11, 15).map((item) => (
              <Link key={item.path} to={item.path} className={navLinkClass(item.path)}>
                <NavIcon type={item.icon} />
                <span>{item.label}</span>
              </Link>
            ))}
          </div>

          {/* System Group */}
          <div className="flex flex-col gap-xs mb-md">
            <div className="px-4 py-2 text-label-caps text-on-surface-variant uppercase tracking-widest">System</div>
            {visibleNavItems.slice(15).map((item) => (
              <Link key={item.path} to={item.path} className={navLinkClass(item.path)}>
                <NavIcon type={item.icon} />
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Logout */}
        <div className="mt-auto flex flex-col gap-xs pb-lg">
          <button 
            onClick={logout} 
            className="flex items-center gap-md px-4 py-3 text-on-surface-variant opacity-70 hover:bg-surface-variant transition-all duration-300 rounded-lg w-full"
          >
            <span className="material-symbols-outlined">logout</span>
            <span>Log Out</span>
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="ml-[240px] flex flex-col min-h-screen">
        {/* TopAppBar */}
        <header className="sticky top-0 h-[56px] bg-surface/90 backdrop-blur-2xl text-primary font-semibold shadow-sm z-40 border-b border-surface-variant/30">
          <div className="flex justify-between items-center w-full px-lg h-full">
            {/* Page Title */}
            <div className="font-display text-[24px] font-bold text-primary tracking-tighter">{pageTitle}</div>

            {/* Right Section */}
            <div className="flex items-center gap-md">
              {/* Search */}
              <div className="relative hidden md:block">
                <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
                <input 
                  className="pl-xl pr-md py-sm rounded-full bg-surface-container-high border-none text-body-md focus:ring-2 focus:ring-primary w-[240px]" 
                  placeholder="Search..." 
                  type="text"
                />
              </div>

              {/* Notifications */}
              <div className="flex items-center gap-sm">
                <Link to="/notifications" className="w-[36px] h-[36px] rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-variant relative">
                  <span className="material-symbols-outlined">notifications</span>
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-error" />
                  )}
                </Link>
              </div>

              <div className="h-[24px] w-[1px] bg-outline-variant mx-sm"></div>

              {/* New Project Button */}
              <Link to="/projects/new" className="gradient-btn text-on-primary font-label-caps px-md py-sm rounded-full shadow-md flex items-center gap-xs">
                <span className="material-symbols-outlined text-[18px]">add</span>
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