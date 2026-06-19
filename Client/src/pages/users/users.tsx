import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { useAuth } from "../../auth";
import type { Department, OrganizationRecord, SkillRecord, User, WorkloadReport } from "../../types";
import {
  AnimatedBackground,
  DeleteConfirmationModal,
  useNavHeader,
  PageSkeleton,
  PERMISSION_GROUPS,
  usePermission,
  StatCard,
  TabButton,
  MessageBanner,
} from "../shared";
import { UsersTable } from "./UsersTable";
import { WorkloadView } from "./WorkloadView";
import { RegisterUserForm } from "./RegisterUserForm";
import { UserSkillsPanel } from "./UserSkillsPanel"
import { UserEditModal } from "./UserEditModal";

export function UsersPage() {
  const { auth } = useAuth();
  const perm = usePermission();
  const isAdmin = perm.isAdmin;
  const canManageUsers = perm.has(PERMISSION_GROUPS.user.manage);

  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationRecord[]>([]);
  const [skills, setSkills] = useState<SkillRecord[]>([]);
  const [workload, setWorkload] = useState<WorkloadReport | null>(null);
  const [workloadDepartmentId, setWorkloadDepartmentId] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"directory" | "workload" | "manage">("directory");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  const { setNavHeader } = useNavHeader();

  useEffect(() => {
    setNavHeader({
      title: "Users",
      description: "People operations, capacity, activation state, and workload shape",
      action: canManageUsers ? {
        label: "New User",
        onClick: () => {
          setActiveTab("manage");
          setTimeout(() => document.getElementById("register-user-form")?.scrollIntoView({ behavior: "smooth" }), 100);
        },
        icon: "add",
      } : undefined,
    });
  }, [setNavHeader, canManageUsers]);

  const handleToggleUserActive = async (user: User) => {
    if (!auth) return;
    if (user.isActive === false) {
      const updated = await api.reactivateUser(auth.token, user.id);
      setUsers((current) => current.map((item) => item.id === updated.id ? updated : item));
      setMessage("User reactivated.");
      void loadData();
      return;
    }

    setDeletingUser(user);
  };

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
      <div>
        <AnimatedBackground />
        <div className="relative z-10">
          <PageSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div>
      <AnimatedBackground />



      {message && (
        <MessageBanner message={message} onDismiss={() => setMessage("")} />
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
          {canManageUsers && (
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
            showOrganizationFilter={isAdmin}
            canManageUsers={canManageUsers}
            onEditUser={setEditingUser}
            onToggleUserActive={handleToggleUserActive}
            onPictureUploaded={(updated) => {
              setUsers(current => current.map(user => user.id === updated.id ? updated : user));
              setMessage("Profile picture updated.");
            }}
          />
        )}

        {activeTab === "workload" && (
          <>
            <UsersTableFilters
              departments={departments}
              organizations={organizations}
              selectedDepartmentId={workloadDepartmentId}
              showOrganizationFilter={isAdmin}
              onDepartmentChange={async (departmentId) => {
                setWorkloadDepartmentId(departmentId);
                if (auth) {
                  setWorkload(await api.getWorkload(auth.token, departmentId || null));
                }
              }}
            />
            <WorkloadView workload={workload} />
          </>
        )}

{activeTab === "manage" && canManageUsers && (
   <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
    <div id="register-user-form">
    <RegisterUserForm 
      departments={departments}
      organizations={organizations}
      lockedOrganizationId={isAdmin ? undefined : organizations[0]?.id}
      canSelectSuperAdminRole={isAdmin}
      onSubmit={async (form) => {
        if (!auth) return;
        await api.registerUser(auth.token, form);
        setMessage("User registered successfully.");
        loadData();
      }} 
    />
    </div>
    <UserSkillsPanel 
      users={users}
      skills={skills}
      onMessage={setMessage}
      onUpdate={loadData}
    />
  </div>
)}
      </div>

      {editingUser && auth && (
        <UserEditModal
          user={editingUser}
          departments={departments}
          organizations={organizations}
          canSelectSuperAdminRole={isAdmin}
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
          <DeleteConfirmationModal
            name={deletingUser.fullName}
            warning="The user remains in the database and can be audited later."
            onConfirm={async () => {
              await api.deactivateUser(auth.token, deletingUser.id);
              setUsers((current) =>
                current.map((user) =>
                  user.id === deletingUser.id ? { ...user, isActive: false } : user
                )
              );
              setDeletingUser(null);
              setMessage("User deactivated.");
              void loadData();
            }}
            onCancel={() => setDeletingUser(null)}
          />
        </div>
      )}
    </div>
  );
}

function UsersTableFilters({
  departments,
  organizations,
  selectedDepartmentId,
  showOrganizationFilter,
  onDepartmentChange,
}: {
  departments: Department[];
  organizations: OrganizationRecord[];
  selectedDepartmentId: string;
  showOrganizationFilter: boolean;
  onDepartmentChange: (departmentId: string) => void;
}) {
  const [organizationId, setOrganizationId] = useState("");
  const visibleDepartments = useMemo(
    () => organizationId ? departments.filter((department) => department.organizationId === organizationId) : departments,
    [departments, organizationId],
  );

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
      {showOrganizationFilter && (
        <select
          value={organizationId}
          onChange={(event) => {
            setOrganizationId(event.target.value);
            onDepartmentChange("");
          }}
          className="h-10 min-w-[220px] rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
        >
          <option value="">All Organizations</option>
          {organizations.map((organization) => (
            <option key={organization.id} value={organization.id}>{organization.name}</option>
          ))}
        </select>
      )}
      <select
        value={selectedDepartmentId}
        onChange={(event) => onDepartmentChange(event.target.value)}
        className="h-10 min-w-[220px] rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
      >
        <option value="">All Departments</option>
        {visibleDepartments.map((department) => (
          <option key={department.id} value={department.id}>{department.name}</option>
        ))}
      </select>
    </div>
  );
}


