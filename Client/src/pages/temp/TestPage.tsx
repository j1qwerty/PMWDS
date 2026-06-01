import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { api } from "../../api";
import { useAuth } from "../../auth";
import { GlassCard, useNavHeader, LoadingPage } from "../shared";
import type { PagesDataResponse } from "../../types";

type EntityKey = keyof Omit<PagesDataResponse, "page" | "userPageSize" | "returnedPageSize" | "generatedAt" | "currentUser">;

interface EntityDisplay {
  label: string;
  name: (item: Record<string, unknown>) => string;
  info: (item: Record<string, unknown>) => string;
  badge?: (item: Record<string, unknown>) => string;
}

const entityConfigs: Record<EntityKey, EntityDisplay> = {
  organizations: { label: "Organizations", name: (i) => i.name as string, info: (i) => i.taxId as string },
  departments: { label: "Departments", name: (i) => i.name as string, info: (i) => i.code as string, badge: (i) => i.organizationName as string },
  projects: { label: "Projects", name: (i) => i.name as string, info: (i) => i.status as string, badge: (i) => `${i.progressPercentage}%` },
  milestones: { label: "Milestones", name: (i) => i.name as string, info: (i) => i.dueDate as string, badge: (i) => i.status as string },
  tasks: { label: "Tasks", name: (i) => i.title as string, info: (i) => i.projectName as string, badge: (i) => i.status as string },
  subtasks: { label: "Subtasks", name: (i) => i.title as string, info: (i) => i.status as string, badge: (i) => `${i.progressPercentage}%` },
  users: { label: "Users", name: (i) => i.fullName as string, info: (i) => i.email as string, badge: (i) => (i.roles as string[])?.join(", ") },
  roles: { label: "Roles", name: (i) => i.name as string, info: (i) => i.description as string, badge: (i) => `Lvl ${i.permissionLevel}` },
  permissions: { label: "Permissions", name: (i) => i.code as string, info: (i) => i.module as string },
  notifications: { label: "Notifications", name: (i) => i.title as string, info: (i) => i.type as string, badge: (i) => i.isRead ? "Read" : "Unread" },
  skills: { label: "Skills", name: (i) => i.name as string, info: (i) => i.category as string },
  reports: { label: "Reports", name: (i) => i.name as string, info: (i) => i.reportType as string },
  integrations: { label: "Integrations", name: (i) => i.name as string, info: (i) => i.integrationType as string, badge: (i) => i.status as string },
  knowledgeArticles: { label: "Knowledge Articles", name: (i) => i.title as string, info: (i) => i.category as string, badge: (i) => `${i.viewCount} views` },
  lessonsLearned: { label: "Lessons Learned", name: (i) => i.title as string, info: (i) => i.category as string, badge: (i) => i.impact as string },
  activityLogs: { label: "Activity Logs", name: (i) => i.description as string, info: (i) => i.userName as string, badge: (i) => i.activityType as string },
  notificationTemplates: { label: "Notification Templates", name: (i) => i.templateType as string, info: (i) => i.subjectTemplate as string },
  alertRules: { label: "Alert Rules", name: (i) => i.name as string, info: (i) => i.conditionType as string, badge: (i) => i.isEnabled ? "Enabled" : "Disabled" },
};

const entityEntries = Object.entries(entityConfigs) as [EntityKey, EntityDisplay][];

export function TestPage() {
  const { auth } = useAuth();
  const { setNavHeader } = useNavHeader();
  const [apiCache, setApiCache] = useState<Record<number, PagesDataResponse>>({});
  const [userPageSize, setUserPageSize] = useState(0);
  const [returnedPageSize, setReturnedPageSize] = useState(0);
  const [currentUserPage, setCurrentUserPage] = useState(1);
  const [entityKey, setEntityKey] = useState<EntityKey>("projects");
  const [loading, setLoading] = useState(true);
  const [bgLoading, setBgLoading] = useState(false);
  const [error, setError] = useState("");
  const sentinelRef = useRef<HTMLDivElement>(null);

  const config = entityConfigs[entityKey];

  useEffect(() => {
    setNavHeader({
      title: "Pages API Test",
      description: "Verifies the unified pages endpoint — doubling, pre-fetch, instant pagination",
    });
  }, [setNavHeader]);

  // Initial fetch — no pageSize sent, server uses role default
  useEffect(() => {
    if (!auth) return;
    setLoading(true);
    api.getPagesData(auth.token)
      .then((res) => {
        setApiCache({ 1: res });
        setUserPageSize(res.userPageSize);
        setReturnedPageSize(res.returnedPageSize);
      })
      .catch(setError)
      .finally(() => setLoading(false));
  }, [auth]);

  const fetchApiPage = useCallback(async (page: number): Promise<PagesDataResponse | null> => {
    if (!auth) return null;
    try {
      return await api.getPagesData(auth.token, page);
    } catch {
      return null;
    }
  }, [auth]);

  // Background pre-fetch: when on the 2nd half of an API page, fetch next
  useEffect(() => {
    if (!auth || userPageSize === 0 || Object.keys(apiCache).length === 0) return;

    const currentApiPage = Math.ceil(currentUserPage / 2);
    const nextApiPage = currentApiPage + 1;

    if (currentUserPage % 2 === 0 && !apiCache[nextApiPage]) {
      setBgLoading(true);
      fetchApiPage(nextApiPage).then((res) => {
        if (res) setApiCache((prev) => ({ ...prev, [nextApiPage]: res }));
      }).finally(() => setBgLoading(false));
    }
  }, [currentUserPage, auth, userPageSize, apiCache, fetchApiPage]);

  const navigateToPage = useCallback((target: number) => {
    if (!auth || userPageSize === 0) return;
    if (target < 1) return;

    // Use the latest cache via a ref to avoid stale closures
    setCurrentUserPage((prev) => {
      const actual = target;
      const apiPage = Math.ceil(actual / 2);

      // Check cache via state updater
      setApiCache((currentCache) => {
        if (!currentCache[apiPage]) {
          setLoading(true);
          fetchApiPage(apiPage).then((res) => {
            if (res) {
              setApiCache((c) => ({ ...c, [apiPage]: res }));
              setCurrentUserPage(actual);
            }
          }).finally(() => setLoading(false));
          return currentCache;
        }
        return currentCache;
      });

      return actual;
    });
  }, [auth, userPageSize, fetchApiPage]);

  const navTo = (page: number) => {
    if (!auth || userPageSize === 0) return;
    if (page < 1) return;

    const apiPage = Math.ceil(page / 2);
    if (apiCache[apiPage]) {
      setCurrentUserPage(page);
    } else {
      setLoading(true);
      fetchApiPage(apiPage).then((res) => {
        if (res) {
          setApiCache((prev) => ({ ...prev, [apiPage]: res }));
          setCurrentUserPage(page);
        }
      }).finally(() => setLoading(false));
    }
  };

  const latestCache = apiCache[Math.ceil(currentUserPage / 2)];

  // Derive totals from the first cached API page (consistent across all pages)
  const totals = useMemo(() => {
    const first = apiCache[1];
    if (!first) return {} as Record<EntityKey, number>;
    const result: Record<string, number> = {};
    for (const [key] of entityEntries) {
      const data = first[key] as { totalCount: number } | undefined;
      result[key] = data?.totalCount ?? 0;
    }
    return result as Record<EntityKey, number>;
  }, [apiCache]);

  const currentApiPage = Math.ceil(currentUserPage / 2);
  const cache = apiCache[currentApiPage];
  const offset = (currentUserPage - 1) % 2;
  const entityData = cache?.[entityKey] as unknown as { items: Record<string, unknown>[]; totalCount: number } | undefined;
  const allItems = entityData?.items ?? [];
  const currentItems = allItems.slice(offset * userPageSize, offset * userPageSize + userPageSize);
  const totalCount = totals[entityKey] ?? 0;
  const totalUserPages = Math.max(1, Math.ceil(totalCount / userPageSize));

  // IntersectionObserver for scroll-based next page
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || userPageSize === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && currentUserPage < totalUserPages) {
          navTo(currentUserPage + 1);
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [currentUserPage, totalUserPages, userPageSize]);

  // Entity summary data
  const entitySummaries = useMemo(() => {
    return entityEntries.map(([key, cfg]) => {
      const first = apiCache[1];
      const data = first?.[key] as { items: unknown[]; totalCount: number } | undefined;
      return {
        key,
        label: cfg.label,
        count: data?.items.length ?? 0,
        total: data?.totalCount ?? 0,
      };
    });
  }, [apiCache]);

  if (loading && Object.keys(apiCache).length === 0) {
    return <LoadingPage label="Loading pages data..." />;
  }

  const firstCache = apiCache[currentApiPage];

  // Page number window: show max 7 page numbers
  const getPageWindow = () => {
    const maxVisible = 7;
    const pages: (number | "...")[] = [];
    if (totalUserPages <= maxVisible) {
      for (let i = 1; i <= totalUserPages; i++) pages.push(i);
    } else {
      pages.push(1);
      let start = Math.max(2, currentUserPage - 2);
      let end = Math.min(totalUserPages - 1, currentUserPage + 2);
      if (currentUserPage <= 3) { start = 2; end = Math.min(5, totalUserPages - 1); }
      if (currentUserPage >= totalUserPages - 2) { start = Math.max(totalUserPages - 4, 2); end = totalUserPages - 1; }
      if (start > 2) pages.push("...");
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < totalUserPages - 1) pages.push("...");
      pages.push(totalUserPages);
    }
    return pages;
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg bg-error/10 border border-error/20 p-4 text-error text-sm">{error}</div>
      )}

      {firstCache && (
        <>
          {/* API Metadata */}
          <GlassCard className="p-6">
            <h3 className="text-sm font-semibold text-on-surface mb-4">API Response Metadata</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <span className="text-xs text-outline">API Page</span>
                <p className="text-lg font-bold text-on-surface">{firstCache.page}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-outline">User Page Size</span>
                <p className="text-lg font-bold text-primary">{userPageSize}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-outline">Returned (doubled)</span>
                <p className="text-lg font-bold text-error">{returnedPageSize}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-outline">Generated At</span>
                <p className="text-sm font-medium text-on-surface">{new Date(firstCache.generatedAt).toLocaleString()}</p>
              </div>
            </div>
            <div className="mt-3 rounded-md bg-primary/5 px-4 py-2 text-xs text-primary border border-primary/10">
              Not sending pageSize — server uses role default (<strong>{userPageSize}</strong>), returns <strong>{returnedPageSize}</strong> (&times;2).
              Each API page covers <strong>2 user-visible pages</strong>. Next page pre-fetched in background.
            </div>
          </GlassCard>

          {/* Current User */}
          <GlassCard className="p-6">
            <h3 className="text-sm font-semibold text-on-surface mb-3">Current User</h3>
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                {firstCache.currentUser.fullName.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-medium text-on-surface">{firstCache.currentUser.fullName}</p>
                <p className="text-xs text-outline">{firstCache.currentUser.email}</p>
                {firstCache.currentUser.roles.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {firstCache.currentUser.roles.map((r) => (
                      <span key={r} className="px-2 py-0.5 rounded-full bg-primary/5 text-primary text-[10px] font-medium">{r}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </GlassCard>

          {/* Entity totals */}
          <GlassCard className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-surface-variant bg-surface-container-low">
                    <th className="text-left px-4 py-3 font-semibold text-outline">Entity</th>
                    <th className="text-right px-4 py-3 font-semibold text-outline">This API Page</th>
                    <th className="text-right px-4 py-3 font-semibold text-outline">Total</th>
                    <th className="text-right px-4 py-3 font-semibold text-outline">User Pages</th>
                  </tr>
                </thead>
                <tbody>
                  {entitySummaries.map((s) => {
                    const userPages = Math.max(1, Math.ceil(s.total / userPageSize));
                    return (
                      <tr
                        key={s.key}
                        onClick={() => { setEntityKey(s.key); setCurrentUserPage(1); }}
                        className={`border-b border-surface-variant/50 transition-colors cursor-pointer ${
                          s.key === entityKey ? "bg-primary/5" : "hover:bg-surface-container-low/50"
                        }`}
                      >
                        <td className="px-4 py-2.5 font-medium text-on-surface">{s.label}</td>
                        <td className="px-4 py-2.5 text-right text-on-surface">{s.count}</td>
                        <td className="px-4 py-2.5 text-right text-on-surface">{s.total}</td>
                        <td className="px-4 py-2.5 text-right text-on-surface">{userPages}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </GlassCard>

          {/* Entity selector */}
          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-xs font-semibold text-outline">Entity:</label>
            <select
              value={entityKey}
              onChange={(e) => { setEntityKey(e.target.value as EntityKey); setCurrentUserPage(1); }}
              className="rounded-md border border-surface-variant bg-surface-container-lowest px-3 py-1.5 text-xs text-on-surface"
            >
              {entityEntries.map(([key, cfg]) => (
                <option key={key} value={key}>{cfg.label}</option>
              ))}
            </select>
            {bgLoading && <span className="text-xs text-outline italic">Pre-fetching next API page…</span>}
          </div>

          {/* Items list */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-on-surface">
                {config.label}
                <span className="ml-2 text-xs font-normal text-outline">
                  Page {currentUserPage} of {totalUserPages} (showing {currentItems.length} of {totalCount})
                </span>
              </h3>
            </div>

            {currentItems.length === 0 ? (
              <p className="text-xs text-outline py-4 text-center">No items for this page.</p>
            ) : (
              <div className="space-y-1">
                {currentItems.map((item, idx) => {
                  const id = (item.id as string) ?? idx;
                  const name = config.name(item);
                  const info = config.info(item);
                  const badge = config.badge?.(item);
                  return (
                    <div key={id} className="flex items-center justify-between rounded-md bg-surface-container-low px-3 py-2 gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-on-surface truncate">{name}</p>
                        <p className="text-xs text-outline truncate">{info}</p>
                      </div>
                      {badge && (
                        <span className="shrink-0 rounded-full bg-primary/5 px-2 py-0.5 text-[10px] font-medium text-primary">
                          {badge}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </GlassCard>

          {/* Pagination */}
          <div className="flex items-center justify-center gap-1 flex-wrap">
            <button
              disabled={currentUserPage <= 1}
              onClick={() => navTo(currentUserPage - 1)}
              className="rounded-md border border-surface-variant px-3 py-1.5 text-xs text-on-surface hover:bg-surface-container-low disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Prev
            </button>

            {getPageWindow().map((p, i) =>
              p === "..." ? (
                <span key={`e${i}`} className="px-1 text-outline text-xs">…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => navTo(p)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    p === currentUserPage
                      ? "bg-primary text-on-primary shadow-sm"
                      : apiCache[Math.ceil(p / 2)]
                        ? "text-on-surface border border-surface-variant hover:bg-surface-container-low"
                        : "text-outline border border-dashed border-surface-variant hover:bg-surface-container-low"
                  }`}
                >
                  {p}
                  {apiCache[Math.ceil(p / 2)] && p !== currentUserPage && (
                    <span className="ml-1 text-[8px] opacity-60">✓</span>
                  )}
                </button>
              )
            )}

            <button
              disabled={currentUserPage >= totalUserPages}
              onClick={() => navTo(currentUserPage + 1)}
              className="rounded-md border border-surface-variant px-3 py-1.5 text-xs text-on-surface hover:bg-surface-container-low disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>

            <span className="text-xs text-outline ml-2">
              {loading ? "Loading…" : bgLoading ? "Pre-fetching…" : ""}
            </span>
          </div>

          {/* Sentinel for infinite scroll */}
          <div ref={sentinelRef} className="h-4" />
        </>
      )}
    </div>
  );
}
