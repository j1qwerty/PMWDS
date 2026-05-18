import { useEffect, useState } from "react";
import { api } from "../../api";
import { useAuth } from "../../auth";
import type { Department, OrganizationRecord, SkillRecord, User, WorkloadReport } from "../../types";
import { 
  AnimatedBackground, 
  PageHeader,
  PageSkeleton,
} from "../shared";
import { UsersTable } from "./UsersTable";
import { WorkloadView } from "./WorkloadView";
import { RegisterUserForm } from "./RegisterUserForm";
import { UserSkillsPanel } from "./UserSkillsPanel"
import { UserDepartmentManager } from "./UserDepartmentManager";
import { UserEditModal } from "./UserEditModal";

export function UsersPage() {
  const { auth, hasRole } = useAuth();
  const isAdmin = hasRole("SuperAdmin");

  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationRecord[]>([]);
  const [skills, setSkills] = useState<SkillRecord[]>([]);
  const [workload, setWorkload] = useState<WorkloadReport | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"directory" | "workload" | "manage">("directory");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  const loadData = () => {
    if (!auth) return;
    setLoading(true);
    Promise.all([
      api.getUsers(auth.token),
      api.getDepartments(auth.token),
      api.getOrganizations(auth.token),
      api.getSkills(auth.token),
      api.getWorkload(auth.token),
    ])
      .then(([userData, departmentData, orgData, skillData, workloadData]) => {
        setUsers(userData);
        setDepartments(departmentData);
        setOrganizations(orgData);
        setSkills(skillData);
        setWorkload(workloadData);
      })
      .catch((cause) => setMessage(cause instanceof Error ? cause.message : "Failed to load users."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, [auth]);

  if (loading) {
    return (
      <div className="min-h-screen p-7 relative font-sans">
        <AnimatedBackground />
        <div className="relative z-10">
          <PageSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-7 relative font-sans">
      <AnimatedBackground />

      {/* Page Header */}
      <div className="relative z-10">
        <PageHeader
          title="Users"
          description="People operations, capacity, activation state, and workload shape"
        />
      </div>

      {/* Message */}
      {message && (
        <div className="relative z-10 mb-5 bg-emerald-50 border border-emerald-200 rounded-xl py-3.5 px-5 text-emerald-700 text-sm flex items-center gap-2.5 animate-[slideIn_0.3s_ease]">
          <span className="material-symbols-outlined">check_circle</span>
          {message}
          <button
            className="ml-auto bg-transparent border-none cursor-pointer text-emerald-500 hover:text-emerald-700"
            onClick={() => setMessage("")}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      )}

      {/* Stats Row */}
      <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard label="Total Users" value={users.length} color="indigo" icon="people" />
        <StatCard label="Departments" value={departments.length} color="violet" icon="business" />
        <StatCard 
          label="Avg Workload" 
          value={`${Math.round((workload?.members ?? []).reduce((sum, m) => sum + (m.workloadScore || 0), 0) / (workload?.members?.length || 1))}%`}
          color="amber" 
          icon="trending_up" 
        />
        <StatCard 
          label="Active Users" 
          value={users.filter(u => u.isActive !== false).length} 
          color="emerald" 
          icon="check_circle" 
        />
      </div>

      {/* Tab Navigation */}
      <div className="relative z-10 mb-5">
        <div className="flex gap-2 border-b border-slate-200">
          <TabButton
            active={activeTab === "directory"}
            onClick={() => setActiveTab("directory")}
            icon="groups"
            label="Directory"
            count={users.length}
          />
          <TabButton
            active={activeTab === "workload"}
            onClick={() => setActiveTab("workload")}
            icon="monitoring"
            label="Workload"
          />
          {isAdmin && (
            <TabButton
              active={activeTab === "manage"}
              onClick={() => setActiveTab("manage")}
              icon="settings"
              label="Manage"
            />
          )}
        </div>
      </div>

      {/* Tab Content */}
      <div className="relative z-10">
        {activeTab === "directory" && (
          <UsersTable
            users={users}
            departments={departments}
            organizations={organizations}
            token={auth?.token ?? ""}
            canUploadPictures={isAdmin}
            canManageUsers={isAdmin}
            onEditUser={setEditingUser}
            onDeleteUser={setDeletingUser}
            onPictureUploaded={(updated) => {
              setUsers(current => current.map(user => user.id === updated.id ? updated : user));
              setMessage("Profile picture updated.");
            }}
          />
        )}

        {activeTab === "workload" && (
          <WorkloadView workload={workload} />
        )}

{activeTab === "manage" && isAdmin && (
   <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
    <RegisterUserForm 
      departments={departments}
      organizations={organizations}
      onSubmit={async (form) => {
        if (!auth) return;
        await api.registerUser(auth.token, form);
        setMessage("User registered successfully.");
        loadData();
      }} 
    />
    <UserSkillsPanel 
      users={users}
      skills={skills}
      onMessage={setMessage}
      onUpdate={loadData}
    />
    <UserDepartmentManager
      users={users}
      departments={departments}
      organizations={organizations}
      onAssign={async (userId, departmentIds, primaryDepartmentId) => {
        if (!auth) return;
        await api.assignUserDepartments(auth.token, userId, departmentIds, primaryDepartmentId);
        setMessage("Department assignments updated.");
        loadData();
      }}
    />
  </div>
)}
      </div>

      {editingUser && auth && (
        <UserEditModal
          user={editingUser}
          departments={departments}
          organizations={organizations}
          onClose={() => setEditingUser(null)}
          onSubmit={async (payload) => {
            const updated = await api.updateUser(auth.token, editingUser.id, payload);
            setUsers((current) => current.map((user) => user.id === updated.id ? updated : user));
            setEditingUser(null);
            setMessage("User updated successfully.");
            void loadData();
          }}
        />
      )}

      {deletingUser && auth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-800">Deactivate user</h3>
            <p className="mt-2 text-sm text-slate-500">
              Deactivate {deletingUser.fullName}? The user remains in the database and can be audited later.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setDeletingUser(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await api.deactivateUser(auth.token, deletingUser.id);
                  setUsers((current) => current.map((user) => user.id === deletingUser.id ? { ...user, isActive: false } : user));
                  setDeletingUser(null);
                  setMessage("User deactivated.");
                  void loadData();
                }}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Deactivate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper Components
function StatCard({ label, value, color, icon }: { label: string; value: string | number; color: string; icon: string }) {
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    indigo: { bg: "bg-indigo-50", text: "text-indigo-600", border: "border-indigo-100" },
    violet: { bg: "bg-violet-50", text: "text-violet-600", border: "border-violet-100" },
    amber: { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-100" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-100" },
  };
  const colors = colorMap[color] || colorMap.indigo;

  return (
    <div className={`rounded-xl border p-4 ${colors.border} ${colors.bg}`}>
      <div className="flex items-center gap-3">
        <span className={`material-symbols-outlined text-xl ${colors.text}`}>{icon}</span>
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
          <p className={`text-2xl font-bold ${colors.text}`}>{value}</p>
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label, count }: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
  count?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        px-5 py-3 rounded-t-xl text-sm font-medium transition-all duration-200 flex items-center gap-2
        ${active
          ? "bg-white text-indigo-600 border border-slate-200 border-b-white -mb-[1px]"
          : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
        }
      `}
    >
      <span className="material-symbols-outlined text-lg">{icon}</span>
      {label}
      {count !== undefined && (
        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
          active ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-500"
        }`}>
          {count}
        </span>
      )}
    </button>
  );
}
