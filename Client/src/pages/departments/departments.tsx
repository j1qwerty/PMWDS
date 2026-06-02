import { useEffect, useState } from "react";
import { api } from "../../api";
import { useAuth } from "../../auth";
import type { Department, OrganizationRecord, User } from "../../types";
import { PERMISSION_GROUPS, usePermission } from "../shared";
import {
  MetricRow,
  Panel,
  classNames,
  formatPercent,
  listCardClass,
  selectedCardClass,
} from "../../ui";

export function Departments() {
  const { auth } = useAuth();
  const perm = usePermission();
  const canManageDepartments = perm.has(PERMISSION_GROUPS.department.manage);
  const canViewManagementData = perm.hasAny(
    PERMISSION_GROUPS.project.view,
    PERMISSION_GROUPS.department.view,
    PERMISSION_GROUPS.user.view,
  );
  const [departments, setDepartments] = useState<Department[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationRecord[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [editingDepartmentId, setEditingDepartmentId] = useState("");
  const [dashboard, setDashboard] = useState<Record<string, unknown> | null>(null);
  const [form, setForm] = useState({
    name: "",
    code: "",
    description: "",
    organizationId: "",
    parentDepartmentId: "",
    departmentHeadUserId: "",
    maxCapacity: 24,
  });

  async function loadDepartments() {
    if (!auth) return;
    const [data, organizationData, userData] = await Promise.all([
      api.getDepartments(auth.token),
      api.getOrganizations(auth.token),
      perm.hasAny(PERMISSION_GROUPS.user.view, PERMISSION_GROUPS.department.edit) ? api.getUsers(auth.token) : Promise.resolve([]),
    ]);
    setDepartments(data);
    setOrganizations(organizationData);
    setUsers(userData as User[]);
    if (!selectedId && data[0]) setSelectedId(data[0].id);
    if (!form.organizationId && organizationData[0]) {
      setForm((current) => ({ ...current, organizationId: current.organizationId || organizationData[0].id }));
    }
  }

  useEffect(() => {
    void loadDepartments();
  }, [auth]);

  useEffect(() => {
    if (!auth || !selectedId || !canViewManagementData) return;
    api.getDepartmentDashboard(auth.token, selectedId).then(setDashboard);
  }, [auth, selectedId, canViewManagementData]);

  const selectedDepartment = departments.find((department) => department.id === selectedId) ?? null;
  const selectedOrganization = organizations.find((organization) => organization.id === selectedDepartment?.organizationId);
  const departmentsInFormOrganization = departments.filter((department) => department.organizationId === form.organizationId);

  function editDepartment(department: Department) {
    setEditingDepartmentId(department.id);
    setForm({
      name: department.name,
      code: department.code,
      description: department.description ?? "",
      organizationId: department.organizationId ?? "",
      parentDepartmentId: department.parentDepartmentId ?? "",
      departmentHeadUserId: department.departmentHeadUserId ?? "",
      maxCapacity: department.maxCapacity,
    });
  }

  function resetDepartmentForm() {
    setEditingDepartmentId("");
    setForm({
      name: "",
      code: "",
      description: "",
      organizationId: organizations[0]?.id ?? "",
      parentDepartmentId: "",
      departmentHeadUserId: "",
      maxCapacity: 24,
    });
  }

  return (
    <div className="grid  gap-4 content-start bg-amber-300">
      <Panel title="Department Grid" subtitle="Structure, capacity, and delivery ownership">
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="flex max-h-105 flex-col gap-2 overflow-y-auto pr-1">
            {departments.map((department) => (
              <button
                key={department.id}
                className={classNames(listCardClass, selectedId === department.id && selectedCardClass)}
                onClick={() => setSelectedId(department.id)}
              >
                <strong>{department.name}</strong>
                <span>{department.code}</span>
                <small>{organizations.find((org) => org.id === department.organizationId)?.name ?? "No organization"}</small>
                <small>Capacity {formatPercent(department.capacityUtilization)}</small>
              </button>
            ))}
          </div>
          <div className="rounded-lg border border-(--pmwds-border) bg-(--pmwds-surface-2)/86 p-5 shadow-xl shadow-black/15">
            <h4>{dashboard?.["name"] ? String(dashboard["name"]) : "Department view"}</h4>
            <MetricRow label="Organization" value={selectedOrganization?.name ?? "Unassigned"} />
            <MetricRow label="Members" value={String(dashboard?.["teamMembers"] ?? "0")} />
            <MetricRow label="Active Projects" value={String(dashboard?.["activeProjects"] ?? "0")} />
            <MetricRow label="Completed Projects" value={String(dashboard?.["completedProjects"] ?? "0")} />
            <MetricRow label="Average Workload" value={String(Math.round(Number(dashboard?.["averageWorkload"] ?? 0)))} />
          </div>
        </div>
      </Panel>

      {canManageDepartments ? (
        <Panel title="Department Admin" subtitle="Create or remove organizational units">
          <form
            className="grid grid-cols-1 gap-4 md:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (!auth) return;
              const payload = {
                ...form,
                organizationId: form.organizationId || null,
                parentDepartmentId: form.parentDepartmentId || null,
                departmentHeadUserId: form.departmentHeadUserId || null,
              };
              const action = editingDepartmentId
                ? api.updateDepartment(auth.token, editingDepartmentId, payload)
                : api.createDepartment(auth.token, payload);
              void action.then(() => {
                resetDepartmentForm();
                return loadDepartments();
              });
            }}
          >
            <label><span>Name</span><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
            <label><span>Code</span><input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} /></label>
            <label className="md:col-span-2"><span>Description</span><textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
            <label>
              <span>Organization</span>
              <select value={form.organizationId} onChange={(event) => setForm({ ...form, organizationId: event.target.value, parentDepartmentId: "" })}>
                <option value="">Unassigned</option>
                {organizations.map((organization) => (<option key={organization.id} value={organization.id}>{organization.name}</option>))}
              </select>
            </label>
            <label>
              <span>Parent Department</span>
              <select value={form.parentDepartmentId} onChange={(event) => setForm({ ...form, parentDepartmentId: event.target.value })}>
                <option value="">None</option>
                {departmentsInFormOrganization.map((department) => (<option key={department.id} value={department.id}>{department.name}</option>))}
              </select>
            </label>
            <label>
              <span>Department Head</span>
              <select value={form.departmentHeadUserId} onChange={(event) => setForm({ ...form, departmentHeadUserId: event.target.value })}>
                <option value="">Unassigned</option>
                {users.map((user) => (<option key={user.id} value={user.id}>{user.fullName}</option>))}
              </select>
            </label>
            <label><span>Max Capacity</span><input type="number" value={form.maxCapacity} onChange={(event) => setForm({ ...form, maxCapacity: Number(event.target.value) })} /></label>
            <div className="mt-4 flex w-full flex-wrap gap-2">
              <button className="rounded-md border border-sky-300/60 bg-sky-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-50" type="submit">{editingDepartmentId ? "Update Department" : "Create Department"}</button>
              {editingDepartmentId ? (
                <button className="rounded-md border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-50" type="button" onClick={resetDepartmentForm}>
                  Cancel Edit
                </button>
              ) : null}
              {selectedId ? (
                <button
                  className="rounded-md border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  type="button"
                  onClick={() => selectedDepartment && editDepartment(selectedDepartment)}
                >
                  Edit Selected
                </button>
              ) : null}
              {selectedId ? (
                <button
                  className="rounded-md border border-rose-300/40 bg-rose-400/10 px-4 py-2 text-sm font-medium text-rose-200 transition hover:bg-rose-400/20"
                  type="button"
                  onClick={async () => {
                    if (!auth) return;
                    await api.deleteDepartment(auth.token, selectedId);
                    await loadDepartments();
                  }}
                >
                  Delete Selected
                </button>
              ) : null}
            </div>
          </form>
        </Panel>
      ) : null}
    </div>
  );
}
