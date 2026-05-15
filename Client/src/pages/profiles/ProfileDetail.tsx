import type { User, UserProfileRecord } from "../../types";
import { GlassCard, GradientButton } from "../shared";

interface ProfileDetailProps {
  user: User;
  profile: UserProfileRecord | null;
  canEdit: boolean;
  onEdit: () => void;
}

export function ProfileDetail({ user, profile, canEdit, onEdit }: ProfileDetailProps) {
  const bio = profile?.bio || user.bio;
  const jobTitle = profile?.jobTitle || user.jobTitle;
  const dateOfBirth = profile?.dateOfBirth;
  const address = profile?.address;
  const emergencyContact = profile?.emergencyContact;
  const linkedInUrl = profile?.linkedInUrl;

  return (
    <div className="flex flex-col gap-5">
      {/* Profile Header Card */}
      <GlassCard className="p-8">
        <div className="flex flex-col sm:flex-row items-start gap-6">
          {/* Avatar */}
          <div className="relative">
            <img
              className="size-20 rounded-2xl ring-4 ring-white shadow-lg"
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName)}&background=4f46e5&color=fff&size=80`}
              alt={user.fullName}
            />
            {user.isActive !== false && (
              <span className="absolute -bottom-1 -right-1 size-5 rounded-full bg-emerald-500 border-2 border-white" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{user.fullName}</h2>
                {jobTitle && (
                  <p className="text-sm text-indigo-600 font-medium mt-1">{jobTitle}</p>
                )}
                <div className="flex items-center gap-3 mt-2 text-sm text-slate-500">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">mail</span>
                    {user.email}
                  </span>
                </div>
              </div>

              {canEdit && (
                <GradientButton onClick={onEdit}>
                  <span className="material-symbols-outlined text-base">edit</span>
                  Edit Profile
                </GradientButton>
              )}
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Bio Card */}
      <GlassCard className="p-6">
        <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-indigo-500">description</span>
          About
        </h3>
        <p className="text-sm text-slate-600 leading-relaxed">
          {bio || "No bio available."}
        </p>
      </GlassCard>

      {/* Details Grid */}
      <GlassCard className="p-6">
        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-indigo-500">info</span>
          Personal Details
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <DetailItem
            icon="work"
            label="Job Title"
            value={jobTitle || "Not set"}
          />
          <DetailItem
            icon="cake"
            label="Date of Birth"
            value={dateOfBirth ? new Date(dateOfBirth).toLocaleDateString() : "Not set"}
          />
          <DetailItem
            icon="location_on"
            label="Address"
            value={address || "Not set"}
            fullWidth
          />
          <DetailItem
            icon="emergency"
            label="Emergency Contact"
            value={emergencyContact || "Not set"}
          />
          <DetailItem
            icon="link"
            label="LinkedIn"
            value={linkedInUrl || "Not set"}
            isLink={!!linkedInUrl}
          />
        </div>
      </GlassCard>

      {/* Account Info Card */}
      <GlassCard className="p-6">
        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-indigo-500">shield_person</span>
          Account Information
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <DetailItem
            icon="badge"
            label="User ID"
            value={user.id}
          />
          <DetailItem
            icon="verified_user"
            label="Status"
            value={user.isActive !== false ? "Active" : "Inactive"}
            statusColor={user.isActive !== false ? "emerald" : "red"}
          />
          <DetailItem
            icon="groups"
            label="Roles"
            value={user.roles?.join(", ") || "No roles assigned"}
            fullWidth
          />
        </div>
      </GlassCard>
    </div>
  );
}

function DetailItem({ 
  icon, 
  label, 
  value, 
  isLink = false, 
  statusColor,
  fullWidth = false 
}: { 
  icon: string; 
  label: string; 
  value: string; 
  isLink?: boolean;
  statusColor?: string;
  fullWidth?: boolean;
}) {
  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl bg-slate-50 ${fullWidth ? 'col-span-full' : ''}`}>
      <span className="material-symbols-outlined text-slate-400 text-lg shrink-0 mt-0.5">{icon}</span>
      <div className="min-w-0">
        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">{label}</div>
        <div className="text-sm font-medium text-slate-700 break-words">
          {isLink ? (
            <a 
              href={value} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-indigo-600 hover:text-indigo-700 hover:underline flex items-center gap-1"
            >
              {value}
              <span className="material-symbols-outlined text-sm">open_in_new</span>
            </a>
          ) : statusColor ? (
            <span className={`inline-flex items-center gap-1.5 ${statusColor === 'emerald' ? 'text-emerald-600' : 'text-red-500'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${statusColor === 'emerald' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
              {value}
            </span>
          ) : (
            value
          )}
        </div>
      </div>
    </div>
  );
}