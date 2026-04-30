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
      <form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={(event) => { event.preventDefault(); onSubmit({ ...form, dateOfBirth: form.dateOfBirth || null }); }}>
        <label><span>Job Title</span><input value={form.jobTitle} onChange={(event) => setForm({ ...form, jobTitle: event.target.value })} /></label>
        <label><span>Date Of Birth</span><input type="date" value={form.dateOfBirth} onChange={(event) => setForm({ ...form, dateOfBirth: event.target.value })} /></label>
        <label className="md:col-span-2"><span>Bio</span><textarea value={form.bio} onChange={(event) => setForm({ ...form, bio: event.target.value })} /></label>
        <label className="md:col-span-2"><span>Address</span><textarea value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></label>
        <label><span>Emergency Contact</span><input value={form.emergencyContact} onChange={(event) => setForm({ ...form, emergencyContact: event.target.value })} /></label>
        <label><span>LinkedIn URL</span><input value={form.linkedInUrl} onChange={(event) => setForm({ ...form, linkedInUrl: event.target.value })} /></label>
        <div className="md:col-span-2 mt-4 flex flex-wrap gap-2"><button className="rounded-md border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-50" type="button" onClick={onClose}>Cancel</button><button className="rounded-md border border-sky-300/60 bg-sky-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-50" type="submit">Save Profile</button></div>
      </form>
    </Dialog>
  );
}
