import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { useAuth } from "../../auth";
import type { SkillRecord, User } from "../../types";
import { Avatar, GlassCard, GradientButton, PERMISSION_GROUPS, usePermission } from "../shared";

interface UserSkillsPanelProps {
  users: User[];
  skills: SkillRecord[];
  onMessage: (msg: string) => void;
  onUpdate: () => void;
}

interface SelectedSkill {
  skillId: string;
  proficiencyLevel: number;
  experienceMonths: number;
}

export function UserSkillsPanel({ users, skills, onMessage, onUpdate }: UserSkillsPanelProps) {
  const { auth } = useAuth();
  const perm = usePermission();
  const canToggleActivation = perm.has(PERMISSION_GROUPS.user.manage);
  const [selectedUser, setSelectedUser] = useState(users[0]?.id || "");
  const [selectedSkills, setSelectedSkills] = useState<SelectedSkill[]>([]);
  const [availabilityStatus, setAvailabilityStatus] = useState("");

  const selectedUserData = users.find(u => u.id === selectedUser);
  const existingSkillIds = useMemo(() => {
    return new Set(selectedUserData?.skillDetails?.map((skill) => skill.skillId) ?? []);
  }, [selectedUserData]);

  useEffect(() => {
    if (!selectedUserData) return;
    setSelectedSkills(
      selectedUserData.skillDetails?.map((skill) => ({
        skillId: skill.skillId,
        proficiencyLevel: skill.proficiencyLevel,
        experienceMonths: skill.experienceMonths,
      })) ?? []
    );
    setAvailabilityStatus(selectedUserData.availabilityStatus || "Available");
  }, [selectedUserData]);

  const toggleSkill = (skillId: string) => {
    setSelectedSkills(prev => {
      const exists = prev.find(s => s.skillId === skillId);
      if (exists) {
        return prev.filter(s => s.skillId !== skillId);
      }
      return [...prev, { skillId, proficiencyLevel: 3, experienceMonths: 12 }];
    });
  };

  const updateSkillField = (skillId: string, field: "proficiencyLevel" | "experienceMonths", value: number) => {
    setSelectedSkills(prev =>
      prev.map(s => s.skillId === skillId ? { ...s, [field]: value } : s)
    );
  };

  const handleAddSkills = async () => {
    if (!auth || !selectedUser || selectedSkills.length === 0) return;
    try {
      for (const skill of selectedSkills) {
        await api.addUserSkill(
          auth.token,
          selectedUser,
          skill.skillId,
          skill.proficiencyLevel,
          skill.experienceMonths
        );
      }
      onMessage(`${selectedSkills.length} skill(s) added successfully.`);
      setSelectedSkills([]);
      onUpdate();
    } catch (e) {
      onMessage(`Error: ${e instanceof Error ? e.message : "Failed to add skills"}`);
    }
  };

  const handleDeactivate = async () => {
    if (!auth || !selectedUser) return;
    try {
      const selected = users.find((user) => user.id === selectedUser);
      if (!selected) return;
      if (selected.isActive !== false) {
        await api.deactivateUser(auth.token, selectedUser);
        onMessage("User deactivated.");
      } else {
        await api.reactivateUser(auth.token, selectedUser);
        onMessage("User reactivated.");
      }
      onUpdate();
    } catch (e) {
      onMessage(`Error: ${e instanceof Error ? e.message : "Deactivation failed"}`);
    }
  };

  const handleAvailabilityChange = async (status: string) => {
    if (!auth || !selectedUser) return;
    const user = users.find(u => u.id === selectedUser);
    try {
      await api.updateAvailability(auth.token, selectedUser, status, user?.availabilityPercentage || 100);
      onMessage("Availability updated.");
      onUpdate();
    } catch (e) {
      onMessage(`Error: ${e instanceof Error ? e.message : "Update failed"}`);
    }
  };

  return (
    <GlassCard className="p-6">
      <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
        <span className="material-symbols-outlined text-indigo-500">settings</span>
        User Management
      </h3>

      <div className="space-y-4">
        {/* User Select */}
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Select User</label>
          <select
            value={selectedUser}
            onChange={(e) => { setSelectedUser(e.target.value); }}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-[13px] outline-none bg-white focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
          >
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.fullName}{user.isActive === false ? " (Inactive)" : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Selected User Info */}
        {selectedUserData && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
              <Avatar person={selectedUserData} size="lg" className="rounded-lg" />
              <div>
                <p className="text-sm font-semibold text-slate-700">{selectedUserData.fullName}</p>
                <p className="text-xs text-slate-400">{selectedUserData.email}</p>
                <p className={`mt-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-medium ${selectedUserData.isActive === false ? "bg-slate-100 text-slate-500" : "bg-emerald-50 text-emerald-700"}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${selectedUserData.isActive === false ? "bg-slate-400" : "bg-emerald-500"}`} />
                  {selectedUserData.isActive === false ? "Inactive" : "Active"}
                </p>
              </div>
            </div>
        )}

        {/* Availability */}
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Availability Status</label>
          <select
            value={availabilityStatus}
            onChange={(e) => {
              setAvailabilityStatus(e.target.value);
              if (e.target.value) void handleAvailabilityChange(e.target.value);
            }}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-[13px] outline-none bg-white focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
          >
            <option>Available</option>
            <option>Busy</option>
            <option>Away</option>
            <option>In Meeting</option>
            <option>Deep Work</option>
            <option>Offline</option>
          </select>
        </div>

        {/* Skills Selection */}
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Select Skills</label>
          <div className="flex flex-wrap gap-2 p-3 border border-slate-200 rounded-xl min-h-[44px]">
            {skills.map((skill) => (
              <button
                key={skill.id}
                type="button"
                onClick={() => toggleSkill(skill.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  selectedSkills.find(s => s.skillId === skill.id)
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {skill.name}
                {existingSkillIds.has(skill.id) && (
                  <span className="ml-1 text-[10px] opacity-80">assigned</span>
                )}
                {selectedSkills.find(s => s.skillId === skill.id) && (
                  <span className="material-symbols-outlined text-sm ml-1 align-middle">check</span>
                )}
              </button>
            ))}
            {skills.length === 0 && (
              <p className="text-xs text-slate-400 py-1">No skills available in the catalogue</p>
            )}
          </div>
        </div>

        {/* Per-skill proficiency and experience */}
        {selectedSkills.length > 0 && (
          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Configure Skill Details
            </label>
            {selectedSkills.map((selected) => {
              const skill = skills.find(s => s.id === selected.skillId);
              return skill ? (
                <div key={selected.skillId} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-slate-700">{skill.name}</span>
                    <button
                      type="button"
                      onClick={() => toggleSkill(selected.skillId)}
                      className="text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {/* Proficiency Level */}
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                        Proficiency
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min={1}
                          max={5}
                          value={selected.proficiencyLevel}
                          onChange={(e) => updateSkillField(selected.skillId, "proficiencyLevel", Number(e.target.value))}
                          className="flex-1 h-2 rounded-lg appearance-none bg-slate-200 cursor-pointer accent-indigo-600"
                        />
                        <span className="text-sm font-bold text-indigo-600 w-6 text-center tabular-nums">
                          {selected.proficiencyLevel}
                        </span>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-[8px] text-slate-400">1 Beginner</span>
                        <span className="text-[8px] text-slate-400">5 Expert</span>
                      </div>
                    </div>

                    {/* Experience Months */}
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                        Experience
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min={0}
                          max={600}
                          value={selected.experienceMonths}
                          onChange={(e) => updateSkillField(selected.skillId, "experienceMonths", Number(e.target.value))}
                          className="w-full pl-3 pr-12 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all text-center"
                          placeholder="0"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-slate-400 pointer-events-none">
                          mos
                        </span>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-[8px] text-slate-400">0 months</span>
                        <span className="text-[8px] text-slate-400">600 max</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null;
            })}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <GradientButton variant="ghost" onClick={handleAddSkills} disabled={selectedSkills.length === 0}>
            <span className="material-symbols-outlined text-sm">add</span>
            Save {selectedSkills.length > 0 ? `${selectedSkills.length} Skill(s)` : "Skills"}
          </GradientButton>
          {canToggleActivation && (
            <GradientButton variant={selectedUserData?.isActive === false ? "ghost" : "danger"} onClick={handleDeactivate}>
              <span className="material-symbols-outlined text-sm">{selectedUserData?.isActive === false ? "restart_alt" : "person_off"}</span>
              {selectedUserData?.isActive === false ? "Reactivate User" : "Deactivate User"}
            </GradientButton>
          )}
        </div>
      </div>
    </GlassCard>
  );
}
