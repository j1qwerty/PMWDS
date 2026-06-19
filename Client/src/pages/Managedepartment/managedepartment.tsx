import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { useAuth } from "../../auth";
import { useAppData } from "../../appData";
import type { Department, OrganizationRecord, User } from "../../types";
import { getStatusColor } from "../shared/colors";
import {
  AnimatedBackground,
  GlassCard,
  Avatar,
  useNavHeader,
  usePermission,
  LoadingPage,
  MessageBanner,
  ModalOverlay,
  DeleteConfirmationModal,
  OrgFormModal,
  DeptFormModal,
} from "../shared";

// ─── Org Panel ────────────────────────────────────────────────────
function OrgPanel({
  organizations,
  departments,
  selectedOrgId,
  onSelect,
  isSuperAdmin,
  onRefresh,
}: {
  organizations: OrganizationRecord[];
  departments: Department[];
  selectedOrgId: string | null;
  onSelect: (id: string | null) => void;
  isSuperAdmin: boolean;
  onRefresh: () => Promise<void>;
}) {
  const { auth } = useAuth();
  const [search, setSearch] = useState("");
  const [orgModal, setOrgModal] = useState<{ open: boolean; edit?: OrganizationRecord }>({ open: false });
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; warning: string } | null>(null);

  const filtered = useMemo(
    () => organizations.filter((o) => o.name.toLowerCase().includes(search.toLowerCase())),
    [organizations, search],
  );

  const handleDelete = async () => {
    if (!auth || !deleteTarget) return;
    try {
      await api.deleteOrganization(auth.token, deleteTarget.id);
      if (selectedOrgId === deleteTarget.id) onSelect(null);
      setDeleteTarget(null);
      await onRefresh();
    } catch (e) {
      /* ignore */
    }
  };

  const handleSubmit = async (form: Record<string, unknown>) => {
    if (!auth) return;
    try {
      if (orgModal.edit) await api.updateOrganization(auth.token, orgModal.edit.id, form);
      else await api.createOrganization(auth.token, form);
      setOrgModal({ open: false });
      await onRefresh();
    } catch (e) {
      /* ignore */
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">search</span>
          <input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-8 pr-2 rounded-lg border border-slate-200 text-xs outline-none bg-white focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
          />
        </div>
        {isSuperAdmin && (
          <button
            onClick={() => setOrgModal({ open: true })}
            className="h-9 w-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 transition-colors shrink-0"
            title="New Organization"
          >
            <span className="material-symbols-outlined text-lg">add</span>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-1 pr-1">
        {filtered.map((org) => {
          const deptCount = departments.filter((d) => d.organizationId === org.id).length;
          const isSelected = selectedOrgId === org.id;
          return (
            <div key={org.id} className="group">
              <button
                onClick={() => onSelect(isSelected ? null : org.id)}
                className={`w-full text-left p-2.5 rounded-xl transition-all duration-200 border ${
                  isSelected
                    ? "bg-indigo-50 border-indigo-200 shadow-sm"
                    : "bg-white border-transparent hover:border-slate-200 hover:shadow-sm"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isSelected ? "bg-indigo-100" : "bg-slate-100"
                  }`}>
                    <span className={`material-symbols-outlined text-base ${
                      isSelected ? "text-indigo-600" : "text-slate-400"
                    }`}>corporate_fare</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-slate-800 truncate">{org.name}</div>
                    <div className="text-[10px] text-slate-400">{deptCount} dept{deptCount !== 1 ? "s" : ""}</div>
                  </div>
                  {isSuperAdmin && (
                    <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                      <span
                        onClick={(e) => { e.stopPropagation(); setOrgModal({ open: true, edit: org }); }}
                        className="material-symbols-outlined text-sm text-slate-400 hover:text-indigo-600 cursor-pointer"
                      >edit</span>
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          const linked = departments.filter((d) => d.organizationId === org.id).length;
                          setDeleteTarget({
                            id: org.id,
                            name: org.name,
                            warning: linked > 0 ? `This will also remove ${linked} department(s).` : "",
                          });
                        }}
                        className="material-symbols-outlined text-sm text-slate-400 hover:text-red-500 cursor-pointer"
                      >delete</span>
                    </div>
                  )}
                </div>
              </button>
              {org.director && isSelected && (
                <div className="flex items-center gap-2 mt-1 ml-2.5 px-2.5 py-1.5 rounded-lg bg-indigo-50/50">
                  <Avatar person={org.director} size="xs" />
                  <div className="text-[10px]">
                    <span className="font-medium text-slate-700">{org.director.fullName}</span>
                    <span className="text-slate-400 ml-1">Director</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-8 text-slate-400">
            <span className="material-symbols-outlined text-3xl mb-1 block">search_off</span>
            <p className="text-xs">No organizations</p>
          </div>
        )}
      </div>

      {orgModal.open && (
        <ModalOverlay onClose={() => setOrgModal({ open: false })}>
          <OrgFormModal initialData={orgModal.edit} onSubmit={handleSubmit} onCancel={() => setOrgModal({ open: false })} />
        </ModalOverlay>
      )}
      {deleteTarget && (
        <ModalOverlay onClose={() => setDeleteTarget(null)}>
          <DeleteConfirmationModal name={deleteTarget.name} warning={deleteTarget.warning} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
        </ModalOverlay>
      )}
    </div>
  );
}

// ─── Dept Panel ───────────────────────────────────────────────────
function DeptPanel({
  departments,
  organizations,
  users,
  selectedDeptId,
  onSelect,
  orgFilter,
  canManage,
  onRefresh,
}: {
  departments: Department[];
  organizations: OrganizationRecord[];
  users: User[];
  selectedDeptId: string | null;
  onSelect: (id: string | null) => void;
  orgFilter: string | null;
  canManage: boolean;
  onRefresh: () => Promise<void>;
}) {
  const { auth } = useAuth();
  const [search, setSearch] = useState("");
  const [deptModal, setDeptModal] = useState<{ open: boolean; edit?: Department }>({ open: false });
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const filtered = useMemo(() => {
    let list = departments;
    if (orgFilter) list = list.filter((d) => d.organizationId === orgFilter);
    if (search) {
      const t = search.toLowerCase();
      list = list.filter((d) => d.name.toLowerCase().includes(t) || d.code.toLowerCase().includes(t));
    }
    return list;
  }, [departments, search, orgFilter]);

  const getOrgName = (id?: string | null) => organizations.find((o) => o.id === id)?.name || "";

  const handleDelete = async () => {
    if (!auth || !deleteTarget) return;
    try {
      await api.deleteDepartment(auth.token, deleteTarget.id);
      if (selectedDeptId === deleteTarget.id) onSelect(null);
      setDeleteTarget(null);
      await onRefresh();
    } catch (e) {
      /* ignore */
    }
  };

  const handleSubmit = async (form: Record<string, unknown>) => {
    if (!auth) return;
    try {
      if (deptModal.edit) await api.updateDepartment(auth.token, deptModal.edit.id, form);
      else await api.createDepartment(auth.token, form);
      setDeptModal({ open: false });
      await onRefresh();
    } catch (e) {
      /* ignore */
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">search</span>
          <input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-8 pr-2 rounded-lg border border-slate-200 text-xs outline-none bg-white focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
          />
        </div>
        {canManage && (
          <button
            onClick={() => setDeptModal({ open: true })}
            className="h-9 w-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 transition-colors shrink-0"
            title="New Department"
          >
            <span className="material-symbols-outlined text-lg">add</span>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-1 pr-1">
        {filtered.map((dept) => {
          const memberCount = users.filter(
            (u) => u.departmentId === dept.id || u.departments?.some((d) => d.departmentId === dept.id),
          ).length;
          const isSelected = selectedDeptId === dept.id;
          return (
            <button
              key={dept.id}
              onClick={() => onSelect(isSelected ? null : dept.id)}
              className={`w-full text-left p-2.5 rounded-xl transition-all duration-200 border ${
                isSelected
                  ? "bg-indigo-50 border-indigo-200 shadow-sm"
                  : "bg-white border-transparent hover:border-slate-200 hover:shadow-sm"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  isSelected ? "bg-violet-100" : "bg-slate-100"
                }`}>
                  <span className={`material-symbols-outlined text-base ${
                    isSelected ? "text-violet-600" : "text-slate-400"
                  }`}>group</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-slate-800 truncate">{dept.name}</div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                    <span>{dept.code}</span>
                    <span>·</span>
                    <span>{memberCount} members</span>
                    {dept.organizationId && (
                      <>
                        <span>·</span>
                        <span className="truncate">{getOrgName(dept.organizationId)}</span>
                      </>
                    )}
                  </div>
                </div>
                {canManage && (
                  <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity" style={{ display: isSelected ? 'flex' : undefined }}>
                    <span
                      onClick={(e) => { e.stopPropagation(); setDeptModal({ open: true, edit: dept }); }}
                      className="material-symbols-outlined text-sm text-slate-400 hover:text-indigo-600 cursor-pointer"
                    >edit</span>
                    <span
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: dept.id, name: dept.name }); }}
                      className="material-symbols-outlined text-sm text-slate-400 hover:text-red-500 cursor-pointer"
                    >delete</span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-8 text-slate-400">
            <span className="material-symbols-outlined text-3xl mb-1 block">search_off</span>
            <p className="text-xs">No departments</p>
          </div>
        )}
      </div>

      {deptModal.open && (
        <ModalOverlay onClose={() => setDeptModal({ open: false })}>
          <DeptFormModal
            initialData={deptModal.edit}
            departments={departments}
            organizations={organizations}
            users={users}
            selectedOrgId={deptModal.edit?.organizationId || orgFilter || ""}
            onSubmit={handleSubmit}
            onCancel={() => setDeptModal({ open: false })}
          />
        </ModalOverlay>
      )}
      {deleteTarget && (
        <ModalOverlay onClose={() => setDeleteTarget(null)}>
          <DeleteConfirmationModal name={deleteTarget.name} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
        </ModalOverlay>
      )}
    </div>
  );
}

// ─── Member Panel ─────────────────────────────────────────────────
function MemberPanel({
  department,
  users,
  allUsers,
  onRefresh,
}: {
  department: Department | null;
  users: User[];
  allUsers: User[];
  onRefresh: () => Promise<void>;
}) {
  const { auth } = useAuth();
  const [adding, setAdding] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [message, setMessage] = useState("");

  if (!department) {
    return (
      <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-slate-400">
        <span className="material-symbols-outlined text-5xl mb-3">group</span>
        <p className="text-sm font-medium">Select a department</p>
        <p className="text-xs mt-1">Choose a department from the middle panel</p>
      </div>
    );
  }

  const nonMembers = allUsers.filter(
    (u) =>
      u.isActive !== false &&
      !users.some((m) => m.id === u.id),
  );

  const addSelected = async () => {
    if (!auth || selectedIds.length === 0) return;
    try {
      for (const userId of selectedIds) {
        const user = allUsers.find((u) => u.id === userId);
        const existing = user?.departments?.map((d) => d.departmentId) || [];
        if (user?.departmentId && !existing.includes(user.departmentId)) existing.push(user.departmentId);
        if (!existing.includes(department.id)) existing.push(department.id);
        await api.assignUserDepartments(auth.token, userId, existing, department.id);
      }
      setMessage(`${selectedIds.length} user(s) added`);
      setSelectedIds([]);
      setAdding(false);
      await onRefresh();
    } catch (e) {
      setMessage(`Error: ${e instanceof Error ? e.message : "Failed"}`);
    }
  };

  const removeMember = async (userId: string) => {
    if (!auth) return;
    try {
      const user = allUsers.find((u) => u.id === userId);
      const current = user?.departments?.map((d) => d.departmentId) || [];
      const updated = current.filter((id) => id !== department.id);
      await api.assignUserDepartments(auth.token, userId, updated.length > 0 ? updated : [department.id], updated[0] || null);
      if (updated.length === 0) await api.updateUser(auth.token, userId, { departmentId: null } as any);
      setMessage(`Removed from ${department.name}`);
      await onRefresh();
    } catch (e) {
      setMessage(`Error: ${e instanceof Error ? e.message : "Failed"}`);
    }
  };

  const head = department.departmentHeadUserId
    ? allUsers.find((u) => u.id === department.departmentHeadUserId)
    : undefined;

  return (
    <div className="flex flex-col h-full">
      {message && <div className="mb-3"><MessageBanner message={message} onDismiss={() => setMessage("")} /></div>}

      {/* Dept header */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white mb-4 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold">{department.name}</h2>
            <p className="text-sm text-indigo-100 font-mono">{department.code}</p>
          </div>
          <div className="text-right">
            <span className="text-3xl font-bold">{users.length}</span>
            <p className="text-[10px] text-indigo-200 uppercase tracking-wider font-semibold">Members</p>
          </div>
        </div>
        {head && (
          <div className="flex items-center gap-2 mt-3 bg-white/10 rounded-xl px-3 py-2">
            <Avatar person={head} size="xs" />
            <div className="text-sm">
              <span className="font-semibold">{head.fullName}</span>
              <span className="text-indigo-200 ml-2 text-xs">Head</span>
            </div>
          </div>
        )}
        {department.description && (
          <p className="text-xs text-indigo-100 mt-2 opacity-80">{department.description}</p>
        )}
      </div>

      {/* Members */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Team Members</h3>
        <button
          onClick={() => { setAdding(!adding); setSelectedIds([]); }}
          className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 px-2.5 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
        >
          <span className="material-symbols-outlined text-sm">{adding ? "close" : "person_add"}</span>
          {adding ? "Cancel" : "Add"}
        </button>
      </div>

      {/* Add panel */}
      {adding && (
        <div className="mb-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
          <div className="flex items-center gap-2 mb-2">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">search</span>
              <input
                placeholder="Search users..."
                className="w-full h-8 pl-8 pr-2 rounded-lg border border-slate-200 text-xs outline-none bg-white focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                onChange={(e) => {
                  const t = e.target.value.toLowerCase();
                  setSelectedIds(nonMembers.filter((u) => u.fullName.toLowerCase().includes(t)).slice(0, 5).map((u) => u.id));
                }}
              />
            </div>
            <button
              onClick={addSelected}
              disabled={selectedIds.length === 0}
              className="px-3 h-8 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Add {selectedIds.length > 0 ? `(${selectedIds.length})` : ""}
            </button>
          </div>
          <div className="max-h-32 overflow-y-auto space-y-0.5">
            {nonMembers.slice(0, 30).map((u) => (
              <label key={u.id} className={`flex items-center gap-2 p-1.5 rounded-lg cursor-pointer transition-colors ${
                selectedIds.includes(u.id) ? "bg-indigo-50" : "hover:bg-white"
              }`}>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(u.id)}
                  onChange={() => setSelectedIds((prev) => prev.includes(u.id) ? prev.filter((id) => id !== u.id) : [...prev, u.id])}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <Avatar person={u} size="xs" />
                <span className="flex-1 text-xs text-slate-700 truncate">{u.fullName}</span>
              </label>
            ))}
            {nonMembers.length === 0 && <p className="text-xs text-slate-400 text-center py-3">All users are members</p>}
          </div>
        </div>
      )}

      {/* Member list */}
      <div className="flex-1 overflow-y-auto space-y-1 pr-1">
        {users.map((u) => {
          const isPrimary = u.departments?.find((d) => d.departmentId === department.id)?.isPrimary;
          return (
            <div key={u.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors group border border-transparent hover:border-slate-100">
              <Avatar person={u} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-800 truncate">{u.fullName}</span>
                  {isPrimary && <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full">Primary</span>}
                </div>
                <div className="text-[11px] text-slate-400">{u.jobTitle || u.email}</div>
              </div>
              <button
                onClick={() => removeMember(u.id)}
                className="opacity-0 group-hover:opacity-100 text-xs text-red-500 hover:text-red-700 p-1 rounded-lg hover:bg-red-50 transition-all"
                title="Remove"
              >
                <span className="material-symbols-outlined text-base">remove_circle_outline</span>
              </button>
            </div>
          );
        })}
        {users.length === 0 && (
          <div className="text-center py-8 text-slate-400">
            <span className="material-symbols-outlined text-3xl mb-1 block">group_off</span>
            <p className="text-xs font-medium">No members</p>
            <p className="text-[10px] mt-0.5">Click "Add" to assign users</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────
export function Managedepartment() {
  const perm = usePermission();
  const isSuperAdmin = perm.isSuperAdmin;
  const { data, loading, refresh } = useAppData();
  const { setNavHeader } = useNavHeader();

  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setNavHeader({
      title: "Manage",
      description: "Organizations, departments, and team assignments",
    });
  }, [setNavHeader]);

  // Auto-select first org if none selected
  useEffect(() => {
    if (!selectedOrgId && data.organizations.length > 0 && isSuperAdmin) {
      setSelectedOrgId(data.organizations[0].id);
    }
  }, [data.organizations, selectedOrgId, isSuperAdmin]);

  // Auto-select first dept when org changes
  useEffect(() => {
    if (selectedOrgId) {
      const orgDepts = data.departments.filter((d) => d.organizationId === selectedOrgId);
      if (!selectedDeptId || !orgDepts.some((d) => d.id === selectedDeptId)) {
        setSelectedDeptId(orgDepts[0]?.id || null);
      }
    }
  }, [selectedOrgId, data.departments]);

  const selectedOrg = data.organizations.find((o) => o.id === selectedOrgId) ?? null;
  const selectedDept = data.departments.find((d) => d.id === selectedDeptId) ?? null;

  const orgDepts = useMemo(
    () => (selectedOrgId ? data.departments.filter((d) => d.organizationId === selectedOrgId) : []),
    [data.departments, selectedOrgId],
  );

  const deptMembers = useMemo(
    () => data.users.filter(
      (u) => u.departmentId === selectedDeptId || u.departments?.some((d) => d.departmentId === selectedDeptId),
    ),
    [data.users, selectedDeptId],
  );

  if (loading) return <LoadingPage label="Loading..." />;

  const totalDepts = data.departments.length;
  const totalUsers = data.users.length;
  const totalTasks = data.projects.reduce((sum, p) => sum + (p.totalTasks || 0), 0);
  const unassignedUsers = data.users.filter(
    (u) => u.isActive !== false && !u.departmentId && (!u.departments || u.departments.length === 0),
  ).length;
  const totalProjects = data.projects.length;

  const stats = [
    {
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
        </svg>
      ),
      value: totalDepts,
      label: 'Departments',
      statusKey: 'Total',
    },
    {
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/>
        </svg>
      ),
      value: totalUsers,
      label: 'Total Users',
      statusKey: 'Completed',
    },
    {
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
        </svg>
      ),
      value: unassignedUsers,
      label: 'Unassigned',
      statusKey: 'Pending',
    },
    {
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
        </svg>
      ),
      value: totalTasks,
      label: 'Total Tasks',
      statusKey: 'Planning',
    },
    {
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
        </svg>
      ),
      value: totalProjects,
      label: 'Total Projects',
      statusKey: 'Active',
    },
  ];

  return (
    <div className="relative">
      <AnimatedBackground />

      {message && <div className="relative z-10 mb-4"><MessageBanner message={message} onDismiss={() => setMessage("")} /></div>}

      {/* Stats */}
      <div className="relative z-10 grid grid-cols-5 gap-4 mb-5">
        {stats.map((stat) => {
          const colors = getStatusColor(stat.statusKey);
          return (
            <div key={stat.label} className={`shadow-sm group relative overflow-hidden ${colors.shadowHoverColor} rounded-2xl p-4 hover:shadow-md transition-all duration-300 h-full flex flex-col justify-between border-0 bg-white`}>
              <div className={`absolute bottom-1/2 right-0 w-24 h-24 ${colors.bg} rounded-full blur-lg group-hover:opacity-80 transition-all pointer-events-none opacity-40`} />

              <div className="relative flex items-center gap-3 mb-2">
                <div className={`w-8 h-8 ${colors.badgeBg} rounded-lg flex items-center justify-center ${colors.badgeText} shrink-0`}>
                  {stat.icon}
                </div>
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  {stat.label}
                </span>
              </div>

              <div className="relative mt-2">
                <span className={`text-2xl font-bold text-center tracking-wider ${colors.text}`}>
                  {stat.value.toLocaleString()}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Three-panel layout */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[220px_1fr_1fr] gap-4 min-h-[600px]">
        {/* Left: Organizations */}
        <GlassCard className="p-3.5 bg-white/80 border-slate-100 overflow-hidden flex flex-col">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">Organizations</h3>
          <OrgPanel
            organizations={data.organizations}
            departments={data.departments}
            selectedOrgId={isSuperAdmin ? selectedOrgId : null}
            onSelect={isSuperAdmin ? setSelectedOrgId : () => {}}
            isSuperAdmin={isSuperAdmin}
            onRefresh={refresh}
          />
        </GlassCard>

        {/* Middle: Departments */}
        <GlassCard className="p-3.5 bg-white/80 border-slate-100 overflow-hidden flex flex-col">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">
            {isSuperAdmin && selectedOrg ? `${selectedOrg.name} · ` : ""}Departments
          </h3>
          {isSuperAdmin && !selectedOrgId ? (
            <div className="flex-1 flex items-center justify-center text-slate-400">
              <div className="text-center">
                <span className="material-symbols-outlined text-4xl mb-2 block">arrow_back</span>
                <p className="text-xs">Select an organization</p>
              </div>
            </div>
          ) : (
            <DeptPanel
              departments={data.departments}
              organizations={data.organizations}
              users={data.users}
              selectedDeptId={selectedDeptId}
              onSelect={setSelectedDeptId}
              orgFilter={selectedOrgId}
              canManage={true}
              onRefresh={refresh}
            />
          )}
        </GlassCard>

        {/* Right: Members */}
        <GlassCard className="p-3.5 bg-white/80 border-slate-100 overflow-hidden flex flex-col">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">
            {selectedDept ? `${selectedDept.name} Members` : "Members"}
          </h3>
          {!selectedDeptId ? (
            <div className="flex-1 flex items-center justify-center text-slate-400">
              <div className="text-center">
                <span className="material-symbols-outlined text-4xl mb-2 block">arrow_back</span>
                <p className="text-xs">Select a department</p>
              </div>
            </div>
          ) : (
            <MemberPanel
              department={selectedDept}
              users={deptMembers}
              allUsers={data.users}
              onRefresh={refresh}
            />
          )}
        </GlassCard>
      </div>
    </div>
  );
}
