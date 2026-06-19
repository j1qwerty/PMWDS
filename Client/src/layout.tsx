import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "./auth";
import { useAppData } from "./appData";
import { Avatar, NavHeaderProvider, NavHeader, NavActionButton, usePermission, BgRenderer } from "./pages/shared";
import { PERMISSION_GROUPS } from "./permissions";

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
  HiOutlineChevronDoubleLeft,
  HiOutlineChevronDoubleRight,
  HiOutlineMenu,
  HiOutlineX,
} from "react-icons/hi";

import { VscSymbolProperty } from "react-icons/vsc";

import {
  RiBrainLine,
  RiGitBranchLine,
  RiWebhookLine,
  RiDashboard3Line,
  RiGitRepositoryLine,
  RiBugLine,
} from "react-icons/ri";
import { SearchBar } from "./pages/shared/search";
import { ProjectsGroup } from "./pages/shared/ProjectsGroup";


// ─── Helper: classNames ────────────────────────────────────────────
function classNames(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

// Responsive icon sizing using clamp
const iconClass = "h-[clamp(16px,2vw,18px)] w-[clamp(16px,2vw,18px)] shrink-0";

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
  test: <RiBugLine className={iconClass} />,
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
  initialBg: string;
  initialText: string;
  initialActiveBg: string;
  initialActiveText: string;
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
    initialBg: "bg-primary/10",
    initialText: "text-primary",
    initialActiveBg: "bg-primary",
    initialActiveText: "text-white",
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
    initialBg: "bg-secondary/10",
    initialText: "text-secondary",
    initialActiveBg: "bg-secondary",
    initialActiveText: "text-white",
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
    initialBg: "bg-tertiary/10",
    initialText: "text-tertiary",
    initialActiveBg: "bg-tertiary",
    initialActiveText: "text-white",
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
    initialBg: "bg-error/10",
    initialText: "text-error",
    initialActiveBg: "bg-error",
    initialActiveText: "text-white",
  },
  Projects: {
    active: "bg-violet-50 text-violet-600 font-semibold",
    hover: "hover:bg-violet-50/60 hover:text-violet-600",
    bgHover: "hover:bg-violet-50/40",
    borderActive: "border-r-[3px] border-violet-500",
    textActive: "text-violet-600",
    textHover: "hover:text-violet-600",
    textDefault: "text-on-surface-variant",
    iconActive: "text-violet-500",
    iconDefault: "text-outline",
    dot: "bg-violet-500",
    initialBg: "bg-violet-100",
    initialText: "text-violet-700",
    initialActiveBg: "bg-violet-500",
    initialActiveText: "text-white",
  },
};

function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { auth, logout } = useAuth();
  const perm = usePermission();
  const { data } = useAppData();

  const [sidebarCompact, setSidebarCompact] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Track screen size for responsive behavior
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  const unreadCount = useMemo(
    () => data.notifications.filter((notification) => !notification.isRead).length,
    [data.notifications],
  );

  // Responsive breakpoint detection
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);

      // Auto-collapse sidebar on tablet
      if (width >= 768 && width < 1024) {
        setSidebarCompact(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const newUiNavGroups: Array<{
    title: string;
    items: Array<{
      path: string;
      label: string;
      icon: string;
      permissions: string[];
    }>;
  }> = [
      {
        title: "Overview",
        items: [
          // { path: "/projects", label: "Projects", icon: "projects", permissions: [PERMISSION_GROUPS.project.view] },
          { path: "/projectsK", label: "Projects", icon: "projects", permissions: [PERMISSION_GROUPS.project.view] },
          // { path: "/milestonesPage", label: "Milestones", icon: "milestones", permissions: [PERMISSION_GROUPS.milestone.view] },
          // { path: "/tasks", label: "Tasks", icon: "tasks", permissions: [PERMISSION_GROUPS.task.view] },
          { path: "/notificationsPage", label: "Notifications", icon: "inbox", permissions: [PERMISSION_GROUPS.notification.view] },
          { path: "/chat", label: "Chats", icon: "chat", permissions: [] },
        ],
      },
      {
        title: "Team",
        items: [
          { path: "/organizationStructure", label: "Organizations", icon: "organization", permissions: [PERMISSION_GROUPS.organization.view] },
          { path: "/departmentsPage", label: "Departments", icon: "departments", permissions: [PERMISSION_GROUPS.department.view] },
          { path: "/users", label: "Users", icon: "users", permissions: [PERMISSION_GROUPS.user.view] },
          { path: "/profiles", label: "Profiles", icon: "users", permissions: [PERMISSION_GROUPS.user.view] },
          { path: "/skills", label: "Skills", icon: "skill", permissions: [PERMISSION_GROUPS.user.edit] },
        ],
      },
      {
        title: "Tools",
        items: [
          { path: "/reports", label: "Reports", icon: "reports", permissions: [PERMISSION_GROUPS.report.view] },
          { path: "/ai", label: "AI Insights", icon: "ai", permissions: [PERMISSION_GROUPS.ai.view] },
        ],
      },
      {
        title: "System",
        items: [
          { path: "/roles", label: "Roles", icon: "roles", permissions: [PERMISSION_GROUPS.role.view] },
          { path: "/activity-logs", label: "Activity Logs", icon: "activity", permissions: [PERMISSION_GROUPS.activityLog.view] },
          // { path: "/test-page", label: "Test Page", icon: "test", permissions: [] },
          { path: "/settings", label: "Settings", icon: "settings", permissions: [PERMISSION_GROUPS.system.manage] },
        ],
      },
    ];

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  return (
    <NavHeaderProvider>
      <div className="flex min-h-screen bg-background text-on-surface font-sans antialiased">
        {/* Mobile overlay backdrop */}
        {mobileSidebarOpen && (
          <div
            className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm md:hidden transition-opacity duration-300"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <nav
          className={classNames(
            "fixed left-0 top-0 z-50 h-full flex flex-col transition-all duration-300",
            "bg-surface-container-lowest/95 backdrop-blur-3xl shadow-[8px_0_40px_rgba(0,0,0,0.05)]",
            // Mobile: overlay with smooth slide
            "max-md:z-[100]",
            mobileSidebarOpen
              ? "max-md:translate-x-0 max-md:w-[clamp(240px,70vw,280px)]"
              : "max-md:-translate-x-full",
            // Tablet & Desktop: responsive width
            sidebarCompact
              ? "md:w-[clamp(56px,8vw,64px)]"
              : "md:w-[clamp(200px,25vw,240px)]"
          )}
        >
          {/* Logo + Toggle */}
          <div className="flex items-center justify-between px-[clamp(12px,2vw,16px)] pt-[clamp(16px,2.5vw,20px)] pb-[clamp(8px,1.5vw,12px)]">
            {!sidebarCompact && (
              <div className="text-[clamp(18px,2.5vw,22px)] font-black text-primary uppercase tracking-[0.22em] whitespace-nowrap">
                PMWDS
              </div>
            )}

            {/* Hide toggle on mobile (sidebar closes via overlay click) */}
            <button
              onClick={() => setSidebarCompact(!sidebarCompact)}
              className="hidden md:flex items-center justify-center rounded-lg text-outline hover:text-primary hover:bg-primary/5 transition-all duration-200"
              style={{
                height: 'clamp(28px,4vw,32px)',
                width: 'clamp(28px,4vw,32px)'
              }}
            >
              {sidebarCompact ?
                <HiOutlineChevronDoubleRight className="h-[clamp(14px,2vw,18px)] w-[clamp(14px,2vw,18px)]" /> :
                <HiOutlineChevronDoubleLeft className="h-[clamp(14px,2vw,18px)] w-[clamp(14px,2vw,18px)]" />
              }
            </button>

            {/* Mobile close button */}
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="md:hidden flex items-center justify-center rounded-lg text-outline hover:text-primary"
              style={{
                height: 'clamp(28px,4vw,32px)',
                width: 'clamp(28px,4vw,32px)'
              }}
            >
              <HiOutlineX className="h-[clamp(16px,2.5vw,20px)] w-[clamp(16px,2.5vw,20px)]" />
            </button>
          </div>


          {/* Navigation */}
          <div
            className={classNames(
              "sidebar-scrollbar flex-1 overflow-y-auto transition-all duration-300",
              "space-y-[clamp(16px,2.5vw,20px)]",
              sidebarCompact ? "px-[clamp(2px,0.5vw,4px)]" : "px-[clamp(8px,1.5vw,12px)] pr-[clamp(8px,2vw,16px)]"
            )}
          >
            {/* Dashboard — standalone, no group wrapper */}
            {(() => {
              const theme = sectionThemes.Overview;
              const active = isActive("/");
              return (
                <Link
                  to="/"
                  onClick={() => setMobileSidebarOpen(false)}
                  className={classNames(
                    "relative flex items-center rounded-md transition-all duration-200 group",
                    sidebarCompact
                      ? "justify-center px-0 ]"
                      : "gap-[clamp(8px,1.5vw,12px)] px-[clamp(8px,1.5vw,12px)] py-[clamp(4px,0.8vw,7px)]",
                    active
                      ? `${theme.active} ${theme.borderActive}`
                      : `${theme.textDefault} ${theme.hover} border-r-[3px] border-transparent`
                  )}
                  title={sidebarCompact ? "Dashboard" : undefined}
                >
                  <span
                    className={classNames(
                      "transition-all duration-300 shrink-0",
                      active
                        ? `${theme.iconActive} scale-110`
                        : `${theme.iconDefault} group-hover:scale-110`
                    )}
                  >
                    {iconMap.home}
                  </span>
                  {!sidebarCompact && (
                    <span className="text-[clamp(11px,1.5vw,13px)] font-medium tracking-[0.01em]">
                      Dashboard
                    </span>
                  )}
                </Link>
              );
            })()}

            {/* Manage — standalone, after Dashboard */}
            {/* {(() => {
              const theme = sectionThemes.Team;
              const active = isActive("/managedepartment");
              return (
                <Link
                  to="/managedepartment"
                  onClick={() => setMobileSidebarOpen(false)}
                  className={classNames(
                    "relative flex items-center rounded-md transition-all duration-200 group",
                    sidebarCompact
                      ? "justify-center px-0"
                      : "gap-[clamp(8px,1.5vw,12px)] px-[clamp(8px,1.5vw,12px)] py-[clamp(4px,0.8vw,7px)]",
                    active
                      ? `${theme.active} ${theme.borderActive}`
                      : `${theme.textDefault} ${theme.hover} border-r-[3px] border-transparent`
                  )}
                  title={sidebarCompact ? "Manage" : undefined}
                >
                  <span
                    className={classNames(
                      "transition-all duration-300 shrink-0",
                      active
                        ? `${theme.iconActive} scale-110`
                        : `${theme.iconDefault} group-hover:scale-110`
                    )}
                  >
                    {iconMap.departments}
                  </span>
                  {!sidebarCompact && (
                    <span className="text-[clamp(11px,1.5vw,13px)] font-medium tracking-[0.01em]">
                      Manage
                    </span>
                  )}
                </Link>
              );
            })()} */}

            <ProjectsGroup
              theme={sectionThemes.Projects}
              iconClass={iconClass}
              compact={sidebarCompact}
              onRequestExpand={() => setSidebarCompact(false)}
            />

            {newUiNavGroups.map((group) => {
              const theme = sectionThemes[group.title] || sectionThemes.Overview;
              const visibleItems = group.items.filter(
                (item) =>
                  item.permissions.length === 0 || perm.hasAny(...item.permissions)
              );
              if (visibleItems.length === 0) return null;

              return (
                <div key={group.title} className="space-y-[clamp(4px,0.8vw,6px)]">
                  {!sidebarCompact && (
                    <div className={classNames(
                      "px-[clamp(8px,1.5vw,12px)] pb-[clamp(2px,0.5vw,4px)] text-[clamp(9px,1.2vw,10px)] uppercase tracking-[0.18em] font-semibold",
                      theme.textDefault
                    )}>
                      {group.title}
                    </div>
                  )}

                  <div className="space-y-[clamp(1px,0.3vw,2px)]">
                    {visibleItems.map((item) => {
                      const active = isActive(item.path);

                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setMobileSidebarOpen(false)}
                          className={classNames(
                            "relative flex items-center rounded-md transition-all duration-200 group",
                            sidebarCompact
                              ? "justify-center px-0 py-[clamp(7px,1vw,9px)]"
                              : "gap-[clamp(8px,1.5vw,12px)] px-[clamp(8px,1.5vw,12px)] py-[clamp(7px,1vw,9px)]",
                            active
                              ? `${theme.active} ${theme.borderActive}`
                              : `${theme.textDefault} ${theme.hover} border-r-[3px] border-transparent`
                          )}
                          title={sidebarCompact ? item.label : undefined}
                        >
                          <span
                            className={classNames(
                              "transition-all duration-300 shrink-0",
                              active
                                ? `${theme.iconActive} scale-110`
                                : `${theme.iconDefault} group-hover:scale-110`
                            )}
                          >
                            {iconMap[item.icon]}
                          </span>

                          {!sidebarCompact && (
                            <span className="text-[clamp(11px,1.5vw,13px)] font-medium tracking-[0.01em]">
                              {item.label}
                            </span>
                          )}

                          {/* Notification dot for expanded sidebar */}
                          {!sidebarCompact && (item.path === "/notifications" || item.path === "/notificationsPage") &&
                            unreadCount > 0 && (
                              <span className="ml-auto h-[clamp(6px,0.8vw,8px)] w-[clamp(6px,0.8vw,8px)] rounded-full bg-error shadow-[0_0_10px_rgba(186,26,26,0.9)] animate-pulse" />
                            )}

                          {/* Notification dot for compact sidebar */}
                          {sidebarCompact && (item.path === "/notifications" || item.path === "/notificationsPage") &&
                            unreadCount > 0 && (
                              <span className="absolute -top-0.5 -right-0.5 h-[clamp(6px,0.8vw,8px)] w-[clamp(6px,0.8vw,8px)] rounded-full bg-error shadow-[0_0_10px_rgba(186,26,26,0.9)] animate-pulse" />
                            )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>



          {/* Profile & Logout */}
          <div className={classNames(
            "pb-[clamp(4px,1.5vw,6px)] pt-[clamp(4px,1vw,8px)] pr-4",
            sidebarCompact ? "px-[clamp(4px,1vw,8px)]" : "px-[clamp(8px,1.5vw,12px)]"
          )}>
            <button
              onClick={logout}
              className={classNames(
                "w-full rounded-2xl bg-surface-container-low transition-all duration-300 hover:bg-error-container group",
                sidebarCompact
                  ? "mx-[clamp(8px,2vw,12px)] p-[clamp(6px,1vw,8px)] flex justify-center"
                  : "mx-[clamp(8px,2vw,12px)] px-[clamp(8px,2vw,12px)] py-[clamp(8px,1.5vw,12px)]"
              )}
              title={sidebarCompact ? "Log Out" : undefined}
            >
              <div className={`flex items-center ${sidebarCompact ? "" : "gap-[clamp(8px,1.5vw,12px)]"}`}>
                <div className="relative">
                  <Avatar
                    person={{
                      id: auth?.userId,
                      fullName: auth?.fullName || "User",
                      profilePictureUrl: auth?.profilePictureUrl,
                    }}
                    size={sidebarCompact ? "xs" : "sm"}
                    className="ring-2 ring-primary/20 shrink-0"
                  />
                  {/* Logout icon overlay on hover */}
                  <div className="absolute inset-0 flex items-center justify-center bg-error/90 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <svg
                      className="h-[clamp(10px,1.5vw,14px)] w-[clamp(10px,1.5vw,14px)] text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                  </div>
                </div>

                {!sidebarCompact && (
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[clamp(11px,1.5vw,13px)] font-medium text-on-surface group-hover:text-error transition-colors">
                      {auth?.fullName || "Alex Rivera"}
                    </span>
                    <span className="truncate text-[clamp(8px,1vw,9px)] uppercase tracking-[0.18em] text-outline group-hover:text-error/70 transition-colors">
                      {auth?.roles?.join(", ") || "SuperAdmin"}
                    </span>
                  </div>
                )}

                {!sidebarCompact && (
                  <svg
                    className="h-[clamp(14px,2vw,16px)] w-[clamp(14px,2vw,16px)] shrink-0 text-outline group-hover:text-error ml-auto transition-colors"
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
                )}
              </div>
            </button>
          </div>

        </nav>

        {/* Main Content */}
        <div className={classNames(
          "flex min-h-screen flex-1 flex-col transition-all duration-300",
          // Mobile: no margin (sidebar is overlay)
          "ml-0",
          // Tablet & Desktop: responsive margin
          sidebarCompact
            ? "md:ml-[clamp(56px,8vw,64px)]"
            : "md:ml-[clamp(200px,25vw,240px)]"
        )}
          style={{ maxWidth: 'min(100%, 1800px)', marginRight: 'auto' }}
        >
          {/* Topbar */}
          <header
            className="sticky top-0 z-40 bg-surface-container-lowest/90 backdrop-blur-2xl border-b border-surface-variant"
            style={{ height: 'clamp(48px,6vw,56px)' }}
          >
            <div className="flex h-full items-center justify-between" style={{ padding: '0 clamp(8px,3vw,24px)' }}>
              <div className="flex items-center" style={{ gap: 'clamp(8px,1.5vw,12px)' }}>
                {/* Mobile hamburger */}
                <button
                  onClick={() => setMobileSidebarOpen(true)}
                  className="md:hidden flex items-center justify-center rounded-lg text-outline hover:text-primary hover:bg-primary/5 transition-all duration-200"
                  style={{ height: 'clamp(28px,4vw,32px)', width: 'clamp(28px,4vw,32px)' }}
                >
                  <HiOutlineMenu style={{ height: 'clamp(16px,2.5vw,20px)', width: 'clamp(16px,2.5vw,20px)' }} />
                </button>
                <NavHeader />
              </div>

              {/* Right actions */}
              <div className="flex items-center" style={{ gap: 'clamp(8px,1.5vw,16px)' }}>
                <NavActionButton />

                {/* Chat button */}
                <Link
                  to="/chat"
                  className="relative flex items-center justify-center rounded-full text-on-surface-variant transition-all duration-300 hover:bg-primary/10 hover:text-primary hover:scale-110"
                  style={{ height: 'clamp(32px,4.5vw,38px)', width: 'clamp(32px,4.5vw,38px)' }}
                >
                  <HiOutlineChatAlt2 style={{ height: 'clamp(16px,2.5vw,20px)', width: 'clamp(16px,2.5vw,20px)' }} />
                </Link>

                {/* Notifications button */}
                <Link
                  to="/notificationsPage"
                  className="relative flex items-center justify-center rounded-full text-on-surface-variant transition-all duration-300 hover:bg-primary/10 hover:text-primary hover:scale-110"
                  style={{ height: 'clamp(32px,4.5vw,38px)', width: 'clamp(32px,4.5vw,38px)' }}
                >
                  <HiOutlineBell style={{ height: 'clamp(16px,2.5vw,20px)', width: 'clamp(16px,2.5vw,20px)' }} />

                  {unreadCount > 0 && (
                    <span className="absolute rounded-full bg-error shadow-[0_0_10px_rgba(186,26,26,0.9)] animate-pulse"
                      style={{
                        height: 'clamp(6px,1vw,8px)',
                        width: 'clamp(6px,1vw,8px)',
                        top: 'clamp(4px,0.8vw,8px)',
                        right: 'clamp(4px,0.8vw,8px)'
                      }}
                    />
                  )}
                </Link>
              </div>
            </div>
          </header>

          {/* Content */}
          <main
            className="flex flex-1 flex-col relative font-sans w-full "
            style={{
              padding: 'clamp(4px,2vw,16px)',
              gap: 'clamp(4px,2.5vw,16px)',
            }}
          >
       
         
            {children}
          </main>
        </div>
      </div>
    </NavHeaderProvider>
  );
}

export { Layout };
