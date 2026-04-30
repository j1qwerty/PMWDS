import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { api } from "./api";
import { useAuth } from "./auth";
import type { Role } from "./types";

function NavIcon({ type }: { type: string }) {
  const icons: Record<string, string> = {
    home: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
    projects: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01",
    tasks: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 012 2h2a2 2 0 012 2M9 14h.01M15 14h.01M9 10h.01M15 10h.01",
    users: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
    departments: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
    organization: "M4 21V7l8-4 8 4v14M9 21v-6h6v6M4 10h16",
    dashboard: "M4 5h7v7H4V5zm9 0h7v4h-7V5zM4 14h4v5H4v-5zm6 0h10v5H10v-5z",
    integration: "M8 12h8M12 8v8M5 5l4 4M15 15l4 4M19 5l-4 4M9 15l-4 4",
    webhook: "M12 5c-3.866 0-7 3.134-7 7m14 0c0 3.866-3.134 7-7 7m0-14v14m-5.657-9.657L12 12l5.657-2.657",
    skill: "M12 3l7 4v10l-7 4-7-4V7l7-4zm0 4v10m-4-8l8 4m-8 0l8-4",
    knowledge: "M5 4h11a2 2 0 012 2v12a2 2 0 01-2 2H5V4zm0 0v16m4-12h5m-5 4h7m-7 4h4",
    activity: "M5 12h3l2-5 4 10 2-5h3",
    inbox: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.659 6 9 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9",
    ai: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.543-.214-.877-.597-1.124l-.547-.547a3.374 3.374 0 01-.516-1.778m-3.485 3.116l-.543-.547a3 3 0 012.828-2.828",
    reports: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    settings: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.165z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
  };

  return (
    <svg className="h-[18px] w-[18px] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d={icons[type] || icons.home} />
    </svg>
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
    { path: "/projects", label: "Projects", icon: "projects", roles: ["SuperAdmin", "ProjectManager", "DepartmentHead", "TeamLead", "TeamMember", "Viewer"] },
    { path: "/milestones", label: "Milestones", icon: "projects", roles: ["SuperAdmin", "ProjectManager", "DepartmentHead", "TeamLead", "TeamMember", "Viewer"] },
    { path: "/tasks", label: "Tasks", icon: "tasks", roles: [] },
    { path: "/roles", label: "Roles", icon: "users", roles: ["SuperAdmin"] },
    { path: "/permissions", label: "Permissions", icon: "settings", roles: ["SuperAdmin"] },
    { path: "/profiles", label: "Profiles", icon: "users", roles: ["SuperAdmin", "ProjectManager", "DepartmentHead", "TeamLead"] },
    { path: "/organizations", label: "Organizations", icon: "organization", roles: ["SuperAdmin", "ProjectManager", "DepartmentHead"] },
    { path: "/dashboards", label: "Dashboards", icon: "dashboard", roles: [] },
    { path: "/integrations", label: "Integrations", icon: "integration", roles: ["SuperAdmin", "ProjectManager", "DepartmentHead"] },
    { path: "/webhooks", label: "Webhooks", icon: "webhook", roles: ["SuperAdmin", "ProjectManager", "DepartmentHead"] },
    { path: "/skills", label: "Skills", icon: "skill", roles: ["SuperAdmin", "ProjectManager", "DepartmentHead", "TeamLead"] },
    { path: "/knowledge", label: "Knowledge", icon: "knowledge", roles: [] },
    { path: "/activity-logs", label: "Activity Logs", icon: "activity", roles: [] },
    { path: "/users", label: "People", icon: "users", roles: ["SuperAdmin", "ProjectManager", "DepartmentHead", "TeamLead"] },
    { path: "/departments", label: "Departments", icon: "departments", roles: ["SuperAdmin", "ProjectManager", "DepartmentHead"] },
    { path: "/notifications", label: "Inbox", icon: "inbox", roles: [] },
    { path: "/ai", label: "AI Insights", icon: "ai", roles: ["SuperAdmin", "ProjectManager", "DepartmentHead"] },
    { path: "/reports", label: "Reports", icon: "reports", roles: ["SuperAdmin", "ProjectManager", "DepartmentHead"] },
    { path: "/settings", label: "Settings", icon: "settings", roles: [] },
  ];

  const visibleNavItems = navItems.filter((item) => item.roles.length === 0 || hasRole(...item.roles));
  const pageTitle = navItems.find((item) => item.path === location.pathname)?.label || "PMWDS";
  const initials = (auth?.fullName || "U")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const navLinkClass = (path: string) =>
    `relative mb-1 flex items-center gap-3 rounded-md px-3 py-2 text-sm transition ${
      location.pathname === path
        ? "bg-sky-400/12 text-sky-200 ring-1 ring-sky-300/20"
        : "text-slate-300 hover:bg-white/[0.06] hover:text-white"
    }`;

  return (
    <div className="flex min-h-screen w-full bg-[var(--pmwds-bg)] text-[var(--pmwds-text)]">
      <aside className="fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-[var(--pmwds-border)] bg-[#0a0f18]/95 shadow-2xl shadow-black/20 backdrop-blur">
        <div className="border-b border-[var(--pmwds-border)] px-5 py-4">
          <h1 className="flex items-center gap-2 text-sm font-semibold tracking-[0.18em] text-white uppercase">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--pmwds-accent)] shadow-[0_0_18px_rgba(56,189,248,0.75)]" />
            PMWDS
          </h1>
        </div>
        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
          <div>
            <div className="mb-2 px-3 text-[0.64rem] font-semibold tracking-[0.2em] text-slate-500 uppercase">Navigation</div>
            {visibleNavItems.slice(0, 5).map((item) => (
              <Link key={item.path} to={item.path} className={navLinkClass(item.path)}>
                <NavIcon type={item.icon} />
                {item.label}
              </Link>
            ))}
          </div>
          <div>
            <div className="mb-2 px-3 text-[0.64rem] font-semibold tracking-[0.2em] text-slate-500 uppercase">System</div>
            {visibleNavItems.slice(5).map((item) => (
              <Link key={item.path} to={item.path} className={navLinkClass(item.path)}>
                <NavIcon type={item.icon} />
                {item.label}
                {item.path === "/notifications" && unreadCount > 0 ? <span className="absolute right-3 top-2.5 h-2 w-2 rounded-full bg-rose-400" /> : null}
              </Link>
            ))}
          </div>
        </nav>
        <div className="border-t border-[var(--pmwds-border)] p-3">
          <div className="flex items-center gap-3 rounded-md bg-white/[0.04] p-2 ring-1 ring-white/[0.05]">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-sky-300 text-xs font-bold text-slate-950">{initials}</div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-white">{auth?.fullName}</div>
              <div className="truncate text-xs text-slate-400">{auth?.roles.join(", ")}</div>
            </div>
            <button className="rounded-md border border-transparent p-2 text-slate-400 transition hover:border-white/10 hover:bg-white/5 hover:text-white" onClick={logout} title="Logout">
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>
      <main className="ml-60 flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[var(--pmwds-border)] bg-[#0a0f18]/80 px-6 backdrop-blur">
          <span className="text-sm font-medium text-white">{pageTitle}</span>
          <Link to="/notifications" className="relative rounded-md border border-white/10 p-2 text-slate-300 transition hover:bg-white/5 hover:text-white" title="Notifications">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.659 6 9 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {unreadCount > 0 ? <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-400" /> : null}
          </Link>
        </header>
        <div className="flex-1 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.08),transparent_28rem),linear-gradient(180deg,#080b12_0%,#070a0f_100%)] p-6">
          {children}
        </div>
      </main>
    </div>
  );
}

export { Layout };
