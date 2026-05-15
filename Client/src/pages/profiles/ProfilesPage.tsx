import { useEffect, useState } from "react";
import { api } from "../../api";
import { useAuth } from "../../auth";
import type { User, UserProfileRecord } from "../../types";
import { 
  AnimatedBackground, 
  GlassCard, 
  GradientButton, 
  PageHeader,
  ModalOverlay,
} from "../shared";
import { ProfileList } from "./ProfileList";
import { ProfileDetail } from "./ProfileDetail";
import { ProfileFormModal } from "./ProfileFormModal";

export function ProfilesPage() {
  const { auth, hasRole } = useAuth();
  const canEdit = hasRole("SuperAdmin", "ProjectManager", "DepartmentHead");

  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfileRecord | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [profileModal, setProfileModal] = useState(false);

  useEffect(() => {
    if (!auth) return;
    setLoading(true);
    api.getUsers(auth.token)
      .then((userData) => {
        setUsers(userData);
        if (!selectedUser && userData.length > 0) {
          setSelectedUser(userData[0]);
        }
      })
      .catch((cause) => setMessage(cause instanceof Error ? cause.message : "Failed to load profiles."))
      .finally(() => setLoading(false));
  }, [auth]);

  useEffect(() => {
    if (!auth || !selectedUser) {
      setProfile(null);
      return;
    }
    api.getProfile(auth.token, selectedUser.id)
      .then(setProfile)
      .catch(() => setProfile(null));
  }, [auth, selectedUser]);

  const handleProfileSubmit = async (payload: Record<string, unknown>) => {
    if (!auth || !selectedUser) return;
    try {
      const updatedProfile = await api.upsertProfile(auth.token, selectedUser.id, payload);
      setProfile(updatedProfile);
      setProfileModal(false);
      setMessage("Profile saved successfully.");
    } catch (e) {
      setMessage(`Error: ${e instanceof Error ? e.message : "Save failed"}`);
    }
  };

  // Filter users
  const filteredUsers = users.filter(user => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      user.fullName.toLowerCase().includes(search) ||
      (user.email && user.email.toLowerCase().includes(search)) ||
      (user.jobTitle && user.jobTitle.toLowerCase().includes(search))
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen p-7 relative font-sans">
        <AnimatedBackground />
        <div className="flex items-center justify-center h-96">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-3 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
            <span className="text-slate-400 text-sm font-medium">Loading profiles...</span>
          </div>
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
          title="Profiles"
          description="View and manage user profiles and details"
          action={canEdit && selectedUser ? {
            label: "Edit Profile",
            onClick: () => setProfileModal(true),
            icon: "edit",
          } : undefined}
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

      {/* Main Layout */}
      <div className="relative z-10 grid grid-cols-[320px_1fr] gap-6">
        {/* Left Panel: Profile List */}
        <ProfileList
          users={filteredUsers}
          selectedUserId={selectedUser?.id || ""}
          onSelect={setSelectedUser}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
        />

        {/* Right Panel: Profile Detail */}
        {selectedUser ? (
          <ProfileDetail
            user={selectedUser}
            profile={profile}
            canEdit={canEdit}
            onEdit={() => setProfileModal(true)}
          />
        ) : (
          <GlassCard className="p-16 text-center flex flex-col items-center justify-center flex-1 min-h-96">
            <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-4xl text-slate-400">person</span>
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">Select a Profile</h3>
            <p className="text-sm text-slate-400 max-w-xs">
              Choose a user from the left panel to view their profile details
            </p>
          </GlassCard>
        )}
      </div>

      {/* Profile Form Modal */}
      {profileModal && selectedUser && (
        <ModalOverlay onClose={() => setProfileModal(false)}>
          <ProfileFormModal
            user={selectedUser}
            profile={profile}
            onSubmit={handleProfileSubmit}
            onCancel={() => setProfileModal(false)}
          />
        </ModalOverlay>
      )}
    </div>
  );
}