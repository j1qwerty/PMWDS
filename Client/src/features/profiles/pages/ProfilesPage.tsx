import { useEffect, useState } from "react";
import { api } from "../../../api";
import { useAuth } from "../../../auth";
import { ProfileFormDialog } from "../components/ProfileFormDialog";
import type { User, UserProfileRecord } from "../../../types";
import { classNames, detailCardClass, EmptyState, ErrorPanel, listCardClass, listColumnClass, LoadingPanel, MetricRow, Notice, Panel, primaryButtonClass, selectedCardClass } from "../../../ui";

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
    api.getUsers(auth.token)
      .then((userData) => {
        setUsers(userData);
        setSelectedUser(userData[0] ?? null);
        setLoading(false);
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : "Failed to load profiles.");
        setLoading(false);
      });
  }, [auth]);

  useEffect(() => {
    if (!auth || !selectedUser) return;
    api.getProfile(auth.token, selectedUser.id).then(setProfile).catch(() => setProfile(null));
  }, [auth, selectedUser]);

  if (loading) return <LoadingPanel label="Loading profiles..." />;
  if (error) return <ErrorPanel message={error} />;

  return (
    <div className="grid  gap-4 content-start">
      {message ? <Notice>{message}</Notice> : null}
      <Panel title="Profiles" subtitle="User profile detail and enrichment">
        <div className="grid gap-5 lg:grid-cols-2">
          <div className={listColumnClass}>
            {users.map((user) => (
              <button key={user.id} className={classNames(listCardClass, selectedUser?.id === user.id && selectedCardClass)} onClick={() => setSelectedUser(user)}>
                <strong>{user.fullName}</strong>
                <span>{user.jobTitle || "No job title"}</span>
                <small>{user.email}</small>
              </button>
            ))}
          </div>
          <div className={detailCardClass}>
            {selectedUser ? (
              <>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h4>{selectedUser.fullName}</h4>
                  <button className={primaryButtonClass} onClick={() => setEditing(true)}>Edit Profile</button>
                </div>
                <p className="mb-4 text-sm leading-6 text-slate-300">{profile?.bio || selectedUser.bio || "No profile bio available."}</p>
                <MetricRow label="Job Title" value={profile?.jobTitle || selectedUser.jobTitle || "Not set"} />
                <MetricRow label="Address" value={profile?.address || "Not set"} />
                <MetricRow label="Emergency Contact" value={profile?.emergencyContact || "Not set"} />
                <MetricRow label="LinkedIn" value={profile?.linkedInUrl || "Not set"} />
              </>
            ) : (
              <EmptyState title="No user selected" description="Choose a user to view or edit their profile." />
            )}
          </div>
        </div>
      </Panel>
      <ProfileFormDialog open={editing} user={selectedUser} profile={profile} onClose={() => setEditing(false)} onSubmit={(payload) => auth && selectedUser && void api.upsertProfile(auth.token, selectedUser.id, payload).then((nextProfile) => { setProfile(nextProfile); setEditing(false); setMessage("Profile saved."); })} />
    </div>
  );
}
