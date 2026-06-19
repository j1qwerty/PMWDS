import { useEffect, useState } from "react";
import { api } from "../../api";
import { useAuth } from "../../auth";
import type { Department, OrganizationRecord, SkillRecord, User } from "../../types";
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
import { UserSkillsPanel } from "./UserSkillsPanel"
import { UserEditModal } from "./UserEditModal";
import { UserFormModal } from "../NewProject/components/UserFormModal";

export function UsersPage() {
  const { auth } = useAuth();
  const perm = usePermission();
  const isAdmin = perm.isAdmin;
  const canManageUsers = perm.has(PERMISSION_GROUPS.user.manage);

  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationRecord[]>([]);
  const [skills, setSkills] = useState<SkillRecord[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"directory" | "manage">("directory");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [showCreateUser, setShowCreateUser] = useState(false);

  const { setNavHeader } = useNavHeader();

  useEffect(() => {
    setNavHeader({
      title: "Users",
      description: "People operations, capacity, activation state, and workload shape",
      action: canManageUsers ? {
        label: "New User",
        onClick: () => setShowCreateUser(true),
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
    ])
      .then(([userData, departmentData, orgData, skillData]) => {
        setUsers(userData);
        setDepartments(departmentData);
        setOrganizations(orgData);
        setSkills(skillData);
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
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <StatCard label="Total Users" value={users.length} color="indigo" icon="people" />
        <StatCard label="Departments" value={departments.length} color="violet" icon="business" />
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

        {activeTab === "manage" && canManageUsers && (
          <UserSkillsPanel 
            users={users}
            skills={skills}
            onMessage={setMessage}
            onUpdate={loadData}
          />
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

      {showCreateUser && auth && (
        <UserFormModal
          organizations={organizations}
          defaultOrganizationId={isAdmin ? "" : organizations[0]?.id}
          hideOrganization={!isAdmin}
          onSubmit={async (data) => {
            await api.registerUser(auth.token, data);
            setShowCreateUser(false);
            setMessage("User registered successfully.");
            loadData();
          }}
          onCancel={() => setShowCreateUser(false)}
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


