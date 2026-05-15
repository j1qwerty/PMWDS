import type { AuthState } from "../../auth";
import { GlassCard, GradientButton } from "../shared";

interface ProfileSettingsProps {
  auth: AuthState | null;
  onSave: () => void;
  onLogout: () => void;
}

export function ProfileSettings({ auth, onSave, onLogout }: ProfileSettingsProps) {
  return (
    <div className="flex flex-col gap-5">
      <GlassCard className="p-6">
        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-indigo-500">person</span>
          Profile Information
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Email</label>
            <input
              value={auth?.email ?? ""}
              disabled
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50 text-slate-500 outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Full Name</label>
            <input
              value={auth?.fullName ?? ""}
              disabled
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50 text-slate-500 outline-none"
            />
          </div>
        </div>
      </GlassCard>

      <GlassCard className="p-6">
        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-indigo-500">shield</span>
          Account Information
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">User ID</label>
            <input
              value={auth?.userId ?? ""}
              disabled
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50 text-slate-500 font-mono outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Roles</label>
            <input
              value={auth?.roles?.join(", ") ?? ""}
              disabled
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50 text-slate-500 outline-none"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t border-slate-100">
          <GradientButton onClick={onSave}>
            <span className="material-symbols-outlined text-sm">save</span>
            Save Settings
          </GradientButton>
          <GradientButton variant="danger" onClick={onLogout}>
            <span className="material-symbols-outlined text-sm">logout</span>
            Logout
          </GradientButton>
        </div>
      </GlassCard>
    </div>
  );
}
