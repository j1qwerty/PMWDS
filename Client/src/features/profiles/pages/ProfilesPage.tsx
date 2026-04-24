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
    <div className="page-grid">
      {message ? <Notice>{message}</Notice> : null}
      <Panel title="Profiles" subtitle="User profile detail and enrichment"><div className="split"><div className="list-column">{users.map((user) => <button key={user.id} className={`list-card ${selectedUser?.id === user.id ? "selected-card" : ""}`} onClick={() => setSelectedUser(user)}><strong>{user.fullName}</strong><span>{user.jobTitle || "No job title"}</span><small>{user.email}</small></button>)}</div><div className="detail-card">{selectedUser ? <><div className="section-row"><h4>{selectedUser.fullName}</h4><button className="primary-button" onClick={() => setEditing(true)}>Edit Profile</button></div><p>{profile?.bio || selectedUser.bio || "No profile bio available."}</p><div className="metric-row"><span>Job Title</span><strong>{profile?.jobTitle || selectedUser.jobTitle || "Not set"}</strong></div><div className="metric-row"><span>Address</span><strong>{profile?.address || "Not set"}</strong></div><div className="metric-row"><span>Emergency Contact</span><strong>{profile?.emergencyContact || "Not set"}</strong></div><div className="metric-row"><span>LinkedIn</span><strong>{profile?.linkedInUrl || "Not set"}</strong></div></> : <div className="empty-state"><strong>No user selected</strong><span>Choose a user to view or edit their profile.</span></div>}</div></div></Panel>
      <ProfileFormDialog open={editing} user={selectedUser} profile={profile} onClose={() => setEditing(false)} onSubmit={(payload) => auth && selectedUser && void api.upsertProfile(auth.token, selectedUser.id, payload).then((nextProfile) => { setProfile(nextProfile); setEditing(false); setMessage("Profile saved."); })} />
    </div>
  );
}
