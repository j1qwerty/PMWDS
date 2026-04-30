import { useEffect, useState } from "react";
import { api } from "../../../api";
import { useAuth } from "../../../auth";
import { ErrorPanel, LoadingPanel, Notice, Panel } from "../../../ui";
import type { User, UserProfileRecord } from "../../../types";
import { ProfileFormDialog } from "../components/ProfileFormDialog";

export function ProfilesPage() {
  const { auth } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfileRecord | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!auth) return;
    api.getUsers(auth.token).then((userData) => { setUsers(userData); setSelectedUser(userData[0] ?? null); setLoading(false); }).catch((cause: unknown) => { setError(cause instanceof Error ? cause.message : "Failed to load profiles."); setLoading(false); });
  }, [auth]);

  useEffect(() => {
    if (!auth || !selectedUser) return;
    api.getProfile(auth.token, selectedUser.id).then(setProfile).catch(() => setProfile(null));
  }, [auth, selectedUser]);

  if (loading) return <LoadingPanel label="Loading profiles..." />;
  if (error) return <ErrorPanel message={error} />;

  return (
    <div className="grid grid-cols-12 gap-4 content-start">
      {message ? <Notice>{message}</Notice> : null}
      <Panel title="Profiles" subtitle="User profile detail and enrichment"><div className="grid gap-5 lg:grid-cols-2"><div className="flex max-h-[420px] flex-col gap-2 overflow-y-auto pr-1">{users.map((user) => <button key={user.id} className={`rounded-md border border-[var(--pmwds-border)] bg-white/[0.035] px-4 py-3 text-left transition hover:border-sky-300/50 hover:bg-white/[0.06] ${selectedUser?.id === user.id ? "selected-card" : ""}`} onClick={() => setSelectedUser(user)}><strong>{user.fullName}</strong><span>{user.jobTitle || "No job title"}</span><small>{user.email}</small></button>)}</div><div className="rounded-lg border border-[var(--pmwds-border)] bg-[var(--pmwds-surface-2)]/86 p-5 shadow-xl shadow-black/15">{selectedUser ? <><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h4>{selectedUser.fullName}</h4><button className="rounded-md border border-sky-300/60 bg-sky-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-50" onClick={() => setEditing(true)}>Edit Profile</button></div><p>{profile?.bio || selectedUser.bio || "No profile bio available."}</p><div className="metric-row"><span>Job Title</span><strong>{profile?.jobTitle || selectedUser.jobTitle || "Not set"}</strong></div><div className="metric-row"><span>Address</span><strong>{profile?.address || "Not set"}</strong></div><div className="metric-row"><span>Emergency Contact</span><strong>{profile?.emergencyContact || "Not set"}</strong></div><div className="metric-row"><span>LinkedIn</span><strong>{profile?.linkedInUrl || "Not set"}</strong></div></> : <div className="rounded-lg border border-dashed border-[var(--pmwds-border)] bg-white/[0.025] p-8 text-center text-slate-400"><strong>No user selected</strong><span>Choose a user to view or edit their profile.</span></div>}</div></div></Panel>
      <ProfileFormDialog open={editing} user={selectedUser} profile={profile} onClose={() => setEditing(false)} onSubmit={(payload) => auth && selectedUser && void api.upsertProfile(auth.token, selectedUser.id, payload).then((nextProfile) => { setProfile(nextProfile); setEditing(false); setMessage("Profile saved."); })} />
    </div>
  );
}
