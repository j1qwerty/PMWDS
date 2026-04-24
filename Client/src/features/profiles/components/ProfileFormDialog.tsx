import { useEffect, useState } from "react";
import { Dialog } from "../../../components/common/Dialog";
import type { User, UserProfileRecord } from "../../../types";

type ProfileFormDialogProps = {
  open: boolean;
  user?: User | null;
  profile?: UserProfileRecord | null;
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => void;
};

export function ProfileFormDialog({ open, user, profile, onClose, onSubmit }: ProfileFormDialogProps) {
  const [form, setForm] = useState({ bio: "", jobTitle: "", dateOfBirth: "", address: "", emergencyContact: "", linkedInUrl: "" });

  useEffect(() => {
    setForm({ bio: profile?.bio ?? "", jobTitle: profile?.jobTitle ?? user?.jobTitle ?? "", dateOfBirth: profile?.dateOfBirth?.slice(0, 10) ?? "", address: profile?.address ?? "", emergencyContact: profile?.emergencyContact ?? "", linkedInUrl: profile?.linkedInUrl ?? "" });
  }, [profile, user, open]);

  return (
    <Dialog title={user ? `Profile · ${user.fullName}` : "Profile"} open={open} onClose={onClose} width="lg">
      <form className="form-grid" onSubmit={(event) => { event.preventDefault(); onSubmit({ ...form, dateOfBirth: form.dateOfBirth || null }); }}>
        <label><span>Job Title</span><input value={form.jobTitle} onChange={(event) => setForm({ ...form, jobTitle: event.target.value })} /></label>
        <label><span>Date Of Birth</span><input type="date" value={form.dateOfBirth} onChange={(event) => setForm({ ...form, dateOfBirth: event.target.value })} /></label>
        <label className="wide"><span>Bio</span><textarea value={form.bio} onChange={(event) => setForm({ ...form, bio: event.target.value })} /></label>
        <label className="wide"><span>Address</span><textarea value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></label>
        <label><span>Emergency Contact</span><input value={form.emergencyContact} onChange={(event) => setForm({ ...form, emergencyContact: event.target.value })} /></label>
        <label><span>LinkedIn URL</span><input value={form.linkedInUrl} onChange={(event) => setForm({ ...form, linkedInUrl: event.target.value })} /></label>
        <div className="wide inline-actions"><button className="ghost-button" type="button" onClick={onClose}>Cancel</button><button className="primary-button" type="submit">Save Profile</button></div>
      </form>
    </Dialog>
  );
}
