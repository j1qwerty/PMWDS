import { NavLink, useLocation } from "react-router-dom";
import {
  FiActivity,
  FiBell,
  FiBookOpen,
  FiBriefcase,
  FiCheckSquare,
  FiColumns,
  FiCpu,
  FiFlag,
  FiFolder,
  FiGrid,
  FiLayers,
  FiLogOut,
  FiPieChart,
  FiSettings,
  FiShield,
  FiTool,
  FiUser,
  FiUsers,
  FiZap,
} from "react-icons/fi";
import { useAuth } from "./auth";

const nav = [
  { path: "/", label: "Dashboard", icon: FiGrid },
  { path: "/projects", label: "Projects", icon: FiFolder },
  { path: "/kanban", label: "Kanban", icon: FiColumns },
  { path: "/milestones", label: "Milestones", icon: FiFlag },
  { path: "/tasks", label: "Tasks", icon: FiCheckSquare },
  { path: "/organizations", label: "Organizations", icon: FiBriefcase },
  { path: "/departments", label: "Departments", icon: FiLayers },
  { path: "/users", label: "Users", icon: FiUsers },
  { path: "/profile", label: "Profile", icon: FiUser },
  { path: "/notifications", label: "Notifications", icon: FiBell },
  { path: "/activity", label: "Activity", icon: FiActivity },
  { path: "/ai", label: "AI", icon: FiCpu },
  { path: "/reports", label: "Reports", icon: FiPieChart },
  { path: "/roles", label: "Roles", icon: FiShield },
  { path: "/permissions", label: "Permissions", icon: FiShield },
  { path: "/skills", label: "Skills", icon: FiTool },
  { path: "/integrations", label: "Integrations", icon: FiLayers },
  { path: "/webhooks", label: "Webhooks", icon: FiZap },
  { path: "/knowledge", label: "Knowledge", icon: FiBookOpen },
  { path: "/dashboards", label: "Dashboards", icon: FiGrid },
  { path: "/settings", label: "Settings", icon: FiSettings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { auth, logout } = useAuth();
  const location = useLocation();
  const title = nav.find((item) => (item.path === "/" ? location.pathname === "/" : location.pathname.startsWith(item.path)))?.label ?? "PMWDS";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">P</span>
          <div>
            <strong>PMWDS</strong>
            <small>Project control</small>
          </div>
        </div>

        <nav className="side-nav">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.path} to={item.path} end={item.path === "/"} className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
                <Icon />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-user">
          <div className="avatar">{auth?.fullName?.slice(0, 2).toUpperCase() ?? "US"}</div>
          <div>
            <strong>{auth?.fullName}</strong>
            <small>{auth?.roles.join(", ")}</small>
          </div>
        </div>
      </aside>

      <div className="main-frame">
        <header className="topbar">
          <div>
            <span className="eyebrow">New UI</span>
            <h1>{title}</h1>
          </div>
          <button className="icon-text-btn" onClick={logout}>
            <FiLogOut />
            Log out
          </button>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
