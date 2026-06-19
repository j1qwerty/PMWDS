import { useEffect, useState, useMemo } from "react";
import { api } from "../../api";
import { useAuth } from "../../auth";
import { useAppData } from "../../appData";
import {
  AnimatedBackground,
  GlassCard,
  ModalOverlay,
  DeleteConfirmationModal,
  OrgFormModal,
  DeptFormModal,
  useNavHeader,
  usePermission,
  Avatar,
  LoadingPage,
  InputF,
} from "../shared";
import type { Department, OrganizationRecord, User } from "../../types";

type TabKey = "organizations" | "departments" | "users";

const TABS: { key: TabKey; label: string; icon: string; superAdminOnly?: boolean }[] = [
  { key: "organizations", label: "Organizations", icon: "corporate_fare", superAdminOnly: true },
  { key: "departments", label: "Departments", icon: "groups" },
  { key: "users", label: "Users", icon: "person" },
];

// ─── User edit modal ──────────────────────────────────────────────
function UserEditModal({
  user,
  departments,
  organizations,
  onSubmit,
  onCancel,
}: {
  user: User;
  departments: Department[];
  organizations: OrganizationRecord[];
  onSubmit: (data: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const [selectedDeptIds, setSelectedDeptIds] = useState<string[]>(
    user.departments?.map((d) => d.departmentId) || (user.departmentId ? [user.departmentId] : []),
  );
  const [primaryDeptId, setPrimaryDeptId] = useState<string>(
    user.departments?.find((d) => d.isPrimary)?.departmentId || user.departmentId || "",
  );

  const orgOptions = useMemo(
    () => organizations.map((o) => ({ value: o.id, label: o.name })),
    [organizations],
  );
  const [selectedOrgId, setSelectedOrgId] = useState(user.organizationId || orgOptions[0]?.value || "");

  const deptOptions = useMemo(
    () =>
      departments
        .filter((d) => !selectedOrgId || d.organizationId === selectedOrgId)
        .map((d) => ({ value: d.id, label: d.name })),
    [departments, selectedOrgId],
  );

  const handleSubmit = () => {
    onSubmit({
      organizationId: selectedOrgId || null,
      departmentIds: selectedDeptIds,
      primaryDepartmentId: primaryDeptId || null,
      departments: selectedDeptIds.map((deptId) => ({
        departmentId: deptId,
        isPrimary: deptId === primaryDeptId,
      })),
    });
  };

  return (
    <div className="bg-white rounded-2xl p-8 w-[520px] max-w-[95vw] shadow-xl border border-slate-200">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
          <span className="material-symbols-outlined text-indigo-600 text-2xl">edit</span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Edit User Assignment</h2>
          <p className="text-sm text-slate-500">{user.fullName}</p>
        </div>
      </div>

      <div className="flex flex-col gap-5">
        <div>
          <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Organization</label>
          <select
            value={selectedOrgId}
            onChange={(e) => {
              setSelectedOrgId(e.target.value);
              setSelectedDeptIds([]);
              setPrimaryDeptId("");
            }}
            className="w-full p-2.5 rounded-lg border border-slate-200 text-[13px] outline-none bg-white focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
          >
            <option value="">No organization</option>
            {orgOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Departments</label>
          <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
            {deptOptions.length === 0 ? (
              <div className="p-4 text-center text-sm text-slate-400">No departments available</div>
            ) : (
              deptOptions.map((dept) => {
                const isSelected = selectedDeptIds.includes(dept.value);
                const isPrimary = primaryDeptId === dept.value;
                return (
                  <label
                    key={dept.value}
                    className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${
                      isSelected ? "bg-indigo-50" : "hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {
                        const next = isSelected
                          ? selectedDeptIds.filter((id) => id !== dept.value)
                          : [...selectedDeptIds, dept.value];
                        setSelectedDeptIds(next);
                        if (isPrimary && !next.includes(dept.value)) {
                          setPrimaryDeptId(next[0] || "");
                        }
                      }}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="flex-1 text-sm font-medium text-slate-700">{dept.label}</span>
                    {isSelected && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setPrimaryDeptId(dept.value);
                        }}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full transition-colors ${
                          isPrimary
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-100 text-slate-500 hover:bg-indigo-100 hover:text-indigo-600"
                        }`}
                      >
                        {isPrimary ? "Primary" : "Set Primary"}
                      </button>
                    )}
                  </label>
                );
              })
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-2 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 font-medium text-sm hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-5 py-2.5 rounded-xl border-none bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 shadow-sm transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Organizations ───────────────────────────────────────────
function OrganizationsTab({
  organizations,
  departments,
  isSuperAdmin,
  onRefresh,
}: {
  organizations: OrganizationRecord[];
  departments: Department[];
  isSuperAdmin: boolean;
  onRefresh: () => Promise<void>;
}) {
  const { auth } = useAuth();
  const [search, setSearch] = useState("");
  const [orgModal, setOrgModal] = useState<{ open: boolean; edit?: OrganizationRecord }>({ open: false });
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string; name: string; warning: string }>({
    open: false, id: "", name: "", warning: "",
  });
  const [message, setMessage] = useState("");

  const filtered = useMemo(
    () => organizations.filter((o) => o.name.toLowerCase().includes(search.toLowerCase())),
    [organizations, search],
  );

  const handleDelete = async () => {
    if (!auth) return;
    try {
      await api.deleteOrganization(auth.token, deleteConfirm.id);
      setMessage("Organization deleted successfully.");
      setDeleteConfirm({ open: false, id: "", name: "", warning: "" });
      await onRefresh();
    } catch (e) {
      setMessage(`Error: ${e instanceof Error ? e.message : "Deletion failed"}`);
    }
  };

  const handleSubmit = async (form: Record<string, unknown>) => {
    if (!auth) return;
    try {
      if (orgModal.edit) {
        await api.updateOrganization(auth.token, orgModal.edit.id, form);
      } else {
        await api.createOrganization(auth.token, form);
      }
      setOrgModal({ open: false });
      setMessage(orgModal.edit ? "Organization updated." : "Organization created.");
      await onRefresh();
    } catch (e) {
      setMessage(`Error: ${e instanceof Error ? e.message : "Save failed"}`);
    }
  };

  return (
    <div className="space-y-5">
      {message && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl py-3 px-4 text-emerald-700 text-sm flex items-center gap-2 animate-[slideIn_0.3s_ease]">
          <span className="material-symbols-outlined text-base">check_circle</span>
          {message}
          <button className="ml-auto bg-transparent border-none cursor-pointer text-emerald-500 hover:text-emerald-700" onClick={() => setMessage("")}>
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg pointer-events-none">search</span>
          <input
            placeholder="Search organizations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-3.5 rounded-xl border border-slate-200 text-sm outline-none bg-white/70 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
          />
        </div>
        {isSuperAdmin && (
          <button
            onClick={() => setOrgModal({ open: true })}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 shadow-sm transition-colors"
          >
            <span className="material-symbols-outlined text-base">add</span>
            New Organization
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((org) => {
          const orgDeptCount = departments.filter((d) => d.organizationId === org.id).length;
          return (
            <GlassCard key={org.id} className="p-5 hover:shadow-md transition-all duration-200 group">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-indigo-600 text-xl">corporate_fare</span>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-slate-800 text-sm truncate">{org.name}</h3>
                  {org.taxId && <p className="text-xs text-slate-400">ID: {org.taxId}</p>}
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">layers</span>
                  {orgDeptCount} dept{orgDeptCount !== 1 ? "s" : ""}
                </span>
                {org.contactEmail && (
                  <span className="flex items-center gap-1 truncate">
                    <span className="material-symbols-outlined text-sm">mail</span>
                    {org.contactEmail}
                  </span>
                )}
              </div>

              {org.director && (
                <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-slate-50 mb-3">
                  <Avatar person={org.director} size="xs" />
                  <div className="text-xs">
                    <div className="font-semibold text-slate-700">{org.director.fullName}</div>
                    <div className="text-slate-400 truncate">{org.director.email}</div>
                  </div>
                </div>
              )}

              {isSuperAdmin && (
                <div className="flex gap-2 pt-3 border-t border-slate-100 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setOrgModal({ open: true, edit: org })}
                    className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 px-2.5 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">edit</span> Edit
                  </button>
                  <button
                    onClick={() => {
                      const linked = departments.filter((d) => d.organizationId === org.id).length;
                      setDeleteConfirm({
                        open: true,
                        id: org.id,
                        name: org.name,
                        warning: linked > 0
                          ? `This organization has ${linked} department(s). Deleting it will remove all associated departments.`
                          : "",
                      });
                    }}
                    className="flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-700 px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span> Delete
                  </button>
                </div>
              )}
            </GlassCard>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-16 text-slate-400">
            <span className="material-symbols-outlined text-5xl mb-3 block">search_off</span>
            <p className="text-sm">No organizations found</p>
          </div>
        )}
      </div>

      {orgModal.open && (
        <ModalOverlay onClose={() => setOrgModal({ open: false })}>
          <OrgFormModal
            initialData={orgModal.edit}
            onSubmit={handleSubmit}
            onCancel={() => setOrgModal({ open: false })}
          />
        </ModalOverlay>
      )}

      {deleteConfirm.open && (
        <ModalOverlay onClose={() => setDeleteConfirm({ open: false, id: "", name: "", warning: "" })}>
          <DeleteConfirmationModal
            name={deleteConfirm.name}
            warning={deleteConfirm.warning}
            onConfirm={handleDelete}
            onCancel={() => setDeleteConfirm({ open: false, id: "", name: "", warning: "" })}
          />
        </ModalOverlay>
      )}
    </div>
  );
}

// ─── Tab: Departments ─────────────────────────────────────────────
function DepartmentsTab({
  departments,
  organizations,
  users,
  onRefresh,
}: {
  departments: Department[];
  organizations: OrganizationRecord[];
  users: User[];
  onRefresh: () => Promise<void>;
}) {
  const { auth } = useAuth();
  const perm = usePermission();
  const [search, setSearch] = useState("");
  const [orgFilter, setOrgFilter] = useState("");
  const [deptModal, setDeptModal] = useState<{ open: boolean; edit?: Department }>({ open: false });
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string; name: string }>({
    open: false, id: "", name: "",
  });
  const [message, setMessage] = useState("");

  const canManage = perm.hasAny(
    "DEPARTMENT_MANAGE", "DEPARTMENT_CREATE", "DEPARTMENT_EDIT", "DEPARTMENT_DELETE",
  );

  const filtered = useMemo(() => {
    let list = departments;
    if (search) {
      const term = search.toLowerCase();
      list = list.filter((d) => d.name.toLowerCase().includes(term) || d.code.toLowerCase().includes(term));
    }
    if (orgFilter) {
      list = list.filter((d) => d.organizationId === orgFilter);
    }
    return list;
  }, [departments, search, orgFilter]);

  const getOrgName = (orgId?: string | null) =>
    organizations.find((o) => o.id === orgId)?.name || "N/A";

  const getDeptHead = (userId?: string | null) =>
    userId ? users.find((u) => u.id === userId) : undefined;

  const handleDelete = async () => {
    if (!auth) return;
    try {
      await api.deleteDepartment(auth.token, deleteConfirm.id);
      setMessage("Department deleted successfully.");
      setDeleteConfirm({ open: false, id: "", name: "" });
      await onRefresh();
    } catch (e) {
      setMessage(`Error: ${e instanceof Error ? e.message : "Deletion failed"}`);
    }
  };

  const handleSubmit = async (form: Record<string, unknown>) => {
    if (!auth) return;
    try {
      if (deptModal.edit) {
        await api.updateDepartment(auth.token, deptModal.edit.id, form);
      } else {
        await api.createDepartment(auth.token, form);
      }
      setDeptModal({ open: false });
      setMessage(deptModal.edit ? "Department updated." : "Department created.");
      await onRefresh();
    } catch (e) {
      setMessage(`Error: ${e instanceof Error ? e.message : "Save failed"}`);
    }
  };

  return (
    <div className="space-y-5">
      {message && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl py-3 px-4 text-emerald-700 text-sm flex items-center gap-2 animate-[slideIn_0.3s_ease]">
          <span className="material-symbols-outlined text-base">check_circle</span>
          {message}
          <button className="ml-auto bg-transparent border-none cursor-pointer text-emerald-500 hover:text-emerald-700" onClick={() => setMessage("")}>
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg pointer-events-none">search</span>
          <input
            placeholder="Search departments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-3.5 rounded-xl border border-slate-200 text-sm outline-none bg-white/70 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
          />
        </div>
        <select
          value={orgFilter}
          onChange={(e) => setOrgFilter(e.target.value)}
          className="h-10 px-3.5 rounded-xl border border-slate-200 text-sm outline-none bg-white/70 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
        >
          <option value="">All Organizations</option>
          {organizations.map((o) => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>
        {canManage && (
          <button
            onClick={() => setDeptModal({ open: true })}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 shadow-sm transition-colors"
          >
            <span className="material-symbols-outlined text-base">add</span>
            New Department
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((dept) => {
          const head = getDeptHead(dept.departmentHeadUserId);
          const memberCount = users.filter(
            (u) => u.departmentId === dept.id || u.departments?.some((d) => d.departmentId === dept.id),
          ).length;

          return (
            <GlassCard key={dept.id} className="p-5 hover:shadow-md transition-all duration-200 group">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-violet-600 text-xl">group</span>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-slate-800 text-sm truncate">{dept.name}</h3>
                  <p className="text-[11px] text-slate-400 font-mono">{dept.code}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-3">
                <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg">
                  <span className="material-symbols-outlined text-sm">business</span>
                  {getOrgName(dept.organizationId)}
                </span>
                <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg">
                  <span className="material-symbols-outlined text-sm">people</span>
                  {memberCount} members
                </span>
                <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg">
                  <span className="material-symbols-outlined text-sm">dashboard</span>
                  {dept.maxCapacity} capacity
                </span>
              </div>

              {dept.description && (
                <p className="text-xs text-slate-400 mb-3 line-clamp-2">{dept.description}</p>
              )}

              {head && (
                <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-slate-50 mb-3">
                  <Avatar person={head} size="xs" />
                  <div className="text-xs">
                    <div className="font-semibold text-slate-700">{head.fullName}</div>
                    <div className="text-slate-400">Department Head</div>
                  </div>
                </div>
              )}

              {canManage && (
                <div className="flex gap-2 pt-3 border-t border-slate-100 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setDeptModal({ open: true, edit: dept })}
                    className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 px-2.5 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">edit</span> Edit
                  </button>
                  <button
                    onClick={() => setDeleteConfirm({ open: true, id: dept.id, name: dept.name })}
                    className="flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-700 px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span> Delete
                  </button>
                </div>
              )}
            </GlassCard>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-16 text-slate-400">
            <span className="material-symbols-outlined text-5xl mb-3 block">search_off</span>
            <p className="text-sm">No departments found</p>
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

      {deleteConfirm.open && (
        <ModalOverlay onClose={() => setDeleteConfirm({ open: false, id: "", name: "" })}>
          <DeleteConfirmationModal
            name={deleteConfirm.name}
            onConfirm={handleDelete}
            onCancel={() => setDeleteConfirm({ open: false, id: "", name: "" })}
          />
        </ModalOverlay>
      )}
    </div>
  );
}

// ─── Tab: Users ───────────────────────────────────────────────────
function UsersTab({
  users,
  departments,
  organizations,
  onRefresh,
}: {
  users: User[];
  departments: Department[];
  organizations: OrganizationRecord[];
  onRefresh: () => Promise<void>;
}) {
  const { auth } = useAuth();
  const perm = usePermission();
  const [search, setSearch] = useState("");
  const [orgFilter, setOrgFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [editUser, setEditUser] = useState<User | null>(null);
  const [message, setMessage] = useState("");

  const canEdit = perm.hasAny("USER_MANAGE", "USER_EDIT", "USER_DEPARTMENT_MANAGE");

  const orgDepts = useMemo(
    () => (orgFilter ? departments.filter((d) => d.organizationId === orgFilter) : departments),
    [departments, orgFilter],
  );

  const filtered = useMemo(() => {
    let list = users;
    if (search) {
      const term = search.toLowerCase();
      list = list.filter(
        (u) =>
          u.fullName.toLowerCase().includes(term) ||
          u.email.toLowerCase().includes(term) ||
          (u.jobTitle ?? "").toLowerCase().includes(term),
      );
    }
    if (orgFilter) {
      list = list.filter(
        (u) =>
          u.organizationId === orgFilter ||
          u.departments?.some((d) => d.organizationId === orgFilter),
      );
    }
    if (deptFilter) {
      list = list.filter(
        (u) =>
          u.departmentId === deptFilter ||
          u.departments?.some((d) => d.departmentId === deptFilter),
      );
    }
    return list;
  }, [users, search, orgFilter, deptFilter]);

  const getDeptNames = (user: User): string[] => {
    const names: string[] = [];
    if (user.departments) {
      for (const d of user.departments) {
        const dept = departments.find((dep) => dep.id === d.departmentId);
        if (dept) names.push(dept.name);
      }
    } else if (user.departmentId) {
      const dept = departments.find((d) => d.id === user.departmentId);
      if (dept) names.push(dept.name);
    }
    return names;
  };

  const handleUserUpdate = async (data: Record<string, unknown>) => {
    if (!auth || !editUser) return;
    try {
      const { organizationId, departmentIds, primaryDepartmentId, departments: depts } = data as any;
      await api.updateUser(auth.token, editUser.id, { organizationId });
      if (departmentIds?.length) {
        await api.assignUserDepartments(auth.token, editUser.id, departmentIds, primaryDepartmentId || null);
      }
      setEditUser(null);
      setMessage(`${editUser.fullName} updated successfully.`);
      await onRefresh();
    } catch (e) {
      setMessage(`Error: ${e instanceof Error ? e.message : "Update failed"}`);
    }
  };

  return (
    <div className="space-y-5">
      {message && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl py-3 px-4 text-emerald-700 text-sm flex items-center gap-2 animate-[slideIn_0.3s_ease]">
          <span className="material-symbols-outlined text-base">check_circle</span>
          {message}
          <button className="ml-auto bg-transparent border-none cursor-pointer text-emerald-500 hover:text-emerald-700" onClick={() => setMessage("")}>
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg pointer-events-none">search</span>
          <input
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-3.5 rounded-xl border border-slate-200 text-sm outline-none bg-white/70 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
          />
        </div>
        <select
          value={orgFilter}
          onChange={(e) => {
            setOrgFilter(e.target.value);
            setDeptFilter("");
          }}
          className="h-10 px-3.5 rounded-xl border border-slate-200 text-sm outline-none bg-white/70 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
        >
          <option value="">All Organizations</option>
          {organizations.map((o) => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>
        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="h-10 px-3.5 rounded-xl border border-slate-200 text-sm outline-none bg-white/70 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
        >
          <option value="">All Departments</option>
          {orgDepts.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>

      <GlassCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left py-3.5 px-4 text-xs font-bold uppercase tracking-wider text-slate-500">User</th>
                <th className="text-left py-3.5 px-4 text-xs font-bold uppercase tracking-wider text-slate-500">Email</th>
                <th className="text-left py-3.5 px-4 text-xs font-bold uppercase tracking-wider text-slate-500">Role</th>
                <th className="text-left py-3.5 px-4 text-xs font-bold uppercase tracking-wider text-slate-500">Departments</th>
                <th className="text-left py-3.5 px-4 text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                {canEdit && <th className="text-right py-3.5 px-4 text-xs font-bold uppercase tracking-wider text-slate-500">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <Avatar person={user} size="sm" />
                      <div>
                        <div className="font-semibold text-slate-800">{user.fullName}</div>
                        {user.jobTitle && <div className="text-xs text-slate-400">{user.jobTitle}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-500 text-xs">{user.email}</td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map((role) => (
                        <span
                          key={role}
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600"
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      {getDeptNames(user).map((name) => (
                        <span
                          key={name}
                          className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-violet-50 text-violet-600"
                        >
                          {name}
                        </span>
                      ))}
                      {getDeptNames(user).length === 0 && (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        user.isActive
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {user.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  {canEdit && (
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setEditUser(user)}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
                      >
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">edit</span>
                          Assign
                        </span>
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <span className="material-symbols-outlined text-5xl mb-3 block">search_off</span>
            <p className="text-sm">No users found</p>
          </div>
        )}
      </GlassCard>

      {editUser && (
        <ModalOverlay onClose={() => setEditUser(null)}>
          <UserEditModal
            user={editUser}
            departments={departments}
            organizations={organizations}
            onSubmit={handleUserUpdate}
            onCancel={() => setEditUser(null)}
          />
        </ModalOverlay>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────
export function Managedepartment() {
  const perm = usePermission();
  const isSuperAdmin = perm.isSuperAdmin;
  const { data, loading, refresh } = useAppData();
  const { setNavHeader } = useNavHeader();

  const [activeTab, setActiveTab] = useState<TabKey>(
    isSuperAdmin ? "organizations" : "departments",
  );

  const visibleTabs = useMemo(
    () => TABS.filter((t) => !t.superAdminOnly || isSuperAdmin),
    [isSuperAdmin],
  );

  // If the user can't see the current tab, switch to the first visible one
  useEffect(() => {
    const tabKeys = visibleTabs.map((t) => t.key);
    if (!tabKeys.includes(activeTab)) {
      setActiveTab(tabKeys[0] || "departments");
    }
  }, [visibleTabs, activeTab]);

  useEffect(() => {
    setNavHeader({
      title: "manage",
      description: "Manage organizations, departments, and users",
    });
  }, [setNavHeader]);

  if (loading) return <LoadingPage label="Loading data..." />;

  const tabData = TABS.find((t) => t.key === activeTab);

  return (
    <div className="relative">
      <AnimatedBackground />

      {/* Tab bar */}
      <div className="relative z-10 mb-6">
        <div className="flex items-center gap-1 bg-white/60 backdrop-blur-xl border border-slate-200/60 rounded-2xl p-1.5 shadow-sm overflow-x-auto">
          {visibleTabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                }`}
              >
                <span className="material-symbols-outlined text-lg">{tab.icon}</span>
                {tab.label}
                {tab.superAdminOnly && isSuperAdmin && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    isActive ? "bg-white/20 text-white" : "bg-amber-100 text-amber-600"
                  }`}>
                    Admin
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="relative z-10">
        {activeTab === "organizations" && (
          <OrganizationsTab
            organizations={data.organizations}
            departments={data.departments}
            isSuperAdmin={isSuperAdmin}
            onRefresh={refresh}
          />
        )}
        {activeTab === "departments" && (
          <DepartmentsTab
            departments={data.departments}
            organizations={data.organizations}
            users={data.users}
            onRefresh={refresh}
          />
        )}
        {activeTab === "users" && (
          <UsersTab
            users={data.users}
            departments={data.departments}
            organizations={data.organizations}
            onRefresh={refresh}
          />
        )}
      </div>
    </div>
  );
}
