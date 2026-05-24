import { useEffect, useState } from "react";
import { FiSave, FiUser } from "react-icons/fi";
import { api } from "../../shared/api";
import { useAuth } from "../../shared/auth";
import { PageTitle } from "../../shared/components";
import type { User, UserProfile } from "../../shared/types";

export function ProfilePage() {
  const { auth } = useAuth();
  const [me, setMe] = useState<User | null>(null);
  const [profile, setProfile] = useState<Partial<UserProfile>>({});
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!auth) return;
    if (auth.token === "demo-token") {
      setMe({ id: auth.userId, fullName: auth.fullName, email: auth.email, roles: auth.roles, jobTitle: "Director" });
      setProfile({ userId: auth.userId, bio: "Demo workspace owner", jobTitle: "Director" });
      return;
    }
    Promise.all([api.getMe(auth.token), api.getProfile(auth.token, auth.userId).catch(() => null)]).then(([user, userProfile]) => {
      setMe(user);
      setProfile(userProfile ?? { userId: auth.userId });
    });
  }, [auth]);

  const save = async () => {
    if (!auth) return;
    if (auth.token !== "demo-token") await api.upsertProfile(auth.token, auth.userId, profile);
    setMessage("Profile saved.");
  };

  return (
    <>
      <PageTitle eyebrow="Account" title="Profile" description="Update personal profile data through the Profiles API." />
      {message ? <p className="message-line">{message}</p> : null}
      <section className="resource-layout">
        <div className="settings-card">
          <h3><FiUser /> {me?.fullName ?? auth?.fullName}</h3>
          <div className="setting-row"><div><strong>Email</strong><p>{me?.email ?? auth?.email}</p></div></div>
          <div className="setting-row"><div><strong>Roles</strong><p>{me?.roles?.join(", ") ?? auth?.roles.join(", ")}</p></div></div>
          <div className="setting-row"><div><strong>Availability</strong><p>{me?.availabilityStatus ?? "Available"}</p></div></div>
        </div>
        <aside className="resource-editor">
          <h3>Edit profile</h3>
          <Field label="Job title" value={profile.jobTitle} onChange={(jobTitle) => setProfile((current) => ({ ...current, jobTitle }))} />
          <Field label="Bio" textarea value={profile.bio} onChange={(bio) => setProfile((current) => ({ ...current, bio }))} />
          <Field label="Address" value={profile.address} onChange={(address) => setProfile((current) => ({ ...current, address }))} />
          <Field label="Emergency contact" value={profile.emergencyContact} onChange={(emergencyContact) => setProfile((current) => ({ ...current, emergencyContact }))} />
          <Field label="LinkedIn URL" value={profile.linkedInUrl} onChange={(linkedInUrl) => setProfile((current) => ({ ...current, linkedInUrl }))} />
          <button className="save-btn" onClick={() => void save()}><FiSave /> Save profile</button>
        </aside>
      </section>
    </>
  );
}

function Field({ label, value, onChange, textarea }: { label: string; value: unknown; onChange: (value: string) => void; textarea?: boolean }) {
  return (
    <label className="resource-field">
      <span>{label}</span>
      {textarea ? <textarea value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} /> : <input value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} />}
    </label>
  );
}
