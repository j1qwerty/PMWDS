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
  const [skillSearch, setSkillSearch] = useState("");

  const selectedUserData = useMemo(() => users.find((u) => u.id === selectedUser), [users, selectedUser]);
  const existingSkillIds = useMemo(
    () => new Set(selectedUserData?.skillDetails?.map((s) => s.skillId) ?? []),
    [selectedUserData]
  );

  const filteredSkills = useMemo(
    () => skills.filter((s) => s.name.toLowerCase().includes(skillSearch.toLowerCase())),
    [skills, skillSearch]
  );

  // Sync local state when the selected user changes
  useEffect(() => {
    if (!selectedUserData) return;
    setSelectedSkills(
      selectedUserData.skillDetails?.map((s) => ({
        skillId: s.skillId,
        proficiencyLevel: s.proficiencyLevel,
        experienceMonths: s.experienceMonths,
      })) ?? []
    );
    setAvailabilityStatus(selectedUserData.availabilityStatus || "Available");
  }, [selectedUserData]);

  const toggleSkill = (skillId: string) => {
    setSelectedSkills((prev) => {
      const exists = prev.find((s) => s.skillId === skillId);
      return exists
        ? prev.filter((s) => s.skillId !== skillId)
        : [...prev, { skillId, proficiencyLevel: 3, experienceMonths: 12 }];
    });
  };

  const updateSkillField = (skillId: string, field: "proficiencyLevel" | "experienceMonths", value: number) => {
    setSelectedSkills((prev) =>
      prev.map((s) => (s.skillId === skillId ? { ...s, [field]: value } : s))
    );
  };

  const handleAddSkills = async () => {
    if (!auth || !selectedUser || selectedSkills.length === 0) return;
    try {
      for (const skill of selectedSkills) {
        await api.addUserSkill(auth.token, selectedUser, skill.skillId, skill.proficiencyLevel, skill.experienceMonths);
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
    const target = users.find((u) => u.id === selectedUser);
    if (!target) return;
    try {
      if (target.isActive !== false) {
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
    const user = users.find((u) => u.id === selectedUser);
    try {
      await api.updateAvailability(auth.token, selectedUser, status, user?.availabilityPercentage || 100);
      onMessage("Availability updated.");
      onUpdate();
    } catch (e) {
      onMessage(`Error: ${e instanceof Error ? e.message : "Update failed"}`);
    }
  };

  const clearAllSkills = () => setSelectedSkills([]);

  return (
    <GlassCard className="p-4 md:p-6">
      <h3 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2">
        <span className="material-symbols-outlined text-indigo-500">settings</span>
        User Management
      </h3>

      {/* Responsive grid: single column on mobile, two columns on md+ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
        {/* ======================= LEFT COLUMN ======================= */}
        <div className="space-y-5">
          {/* User Selector */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
              Select User
            </label>
            <div className="relative">
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-[13px] outline-none bg-white focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all appearance-none"
              >
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.fullName}{user.isActive === false ? " (Inactive)" : ""}
                  </option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-lg">
                expand_more
              </span>
            </div>
          </div>

          {/* User Info Card */}
          {selectedUserData && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-br from-slate-50 to-white border border-slate-100">
              <Avatar person={selectedUserData} size="lg" className="rounded-lg shadow-sm" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-700 truncate">{selectedUserData.fullName}</p>
                <p className="text-xs text-slate-400 truncate">{selectedUserData.email}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-medium ${selectedUserData.isActive === false
                        ? "bg-slate-100 text-slate-500"
                        : "bg-emerald-50 text-emerald-700"
                      }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${selectedUserData.isActive === false ? "bg-slate-400" : "bg-emerald-500"
                        }`}
                    />
                    {selectedUserData.isActive === false ? "Inactive" : "Active"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Availability */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
              Availability Status
            </label>
            <div className="relative">
              <select
                value={availabilityStatus}
                onChange={(e) => {
                  setAvailabilityStatus(e.target.value);
                  if (e.target.value) void handleAvailabilityChange(e.target.value);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-[13px] outline-none bg-white focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all appearance-none"
              >
                <option>Available</option>
                <option>Busy</option>
                <option>Away</option>
                <option>In Meeting</option>
                <option>Deep Work</option>
                <option>Offline</option>
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-lg">
                expand_more
              </span>
            </div>
          </div>

          {/* Skill Catalogue (search + chips) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Skill Catalogue
              </label>
              {selectedSkills.length > 0 && (
                <span className="text-[10px] font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                  {selectedSkills.length} selected
                </span>
              )}
            </div>

            <div className="relative mb-3">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base">
                search
              </span>
              <input
                type="text"
                value={skillSearch}
                onChange={(e) => setSkillSearch(e.target.value)}
                placeholder="Search skills..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs outline-none bg-white focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
              />
            </div>

            <div className="flex flex-wrap gap-2 p-3 border border-slate-200 rounded-xl min-h-[50px] max-h-44 overflow-y-auto bg-white">
              {filteredSkills.length > 0 ? (
                filteredSkills.map((skill) => {
                  const isSelected = selectedSkills.some((s) => s.skillId === skill.id);
                  const isExisting = existingSkillIds.has(skill.id);
                  return (
                    <button
                      key={skill.id}
                      type="button"
                      onClick={() => toggleSkill(skill.id)}
                      className={`group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${isSelected
                          ? "bg-indigo-600 text-white shadow-sm hover:bg-indigo-700"
                          : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                        }`}
                    >
                      <span>{skill.name}</span>
                      {isExisting && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/20 text-white/90 ml-0.5">
                          assigned
                        </span>
                      )}
                      {isSelected && (
                        <span className="material-symbols-outlined text-sm">check</span>
                      )}
                    </button>
                  );
                })
              ) : (
                <p className="text-xs text-slate-400 py-2 w-full text-center">
                  {skillSearch ? "No matching skills found." : "No skills available in the catalogue"}
                </p>
              )}
            </div>
          </div>

          {/* Deactivate / Reactivate */}
          {canToggleActivation && (
            <GradientButton
              variant={selectedUserData?.isActive === false ? "ghost" : "danger"}
              onClick={handleDeactivate}
              className="w-full"
            >
              <span className="material-symbols-outlined text-sm">
                {selectedUserData?.isActive === false ? "restart_alt" : "person_off"}
              </span>
              {selectedUserData?.isActive === false ? "Reactivate User" : "Deactivate User"}
            </GradientButton>
          )}
        </div>

       {/* ======================= RIGHT COLUMN ======================= */}
<div className="space-y-5">
  {/* Header and Clear all */}
  <div className="flex items-center justify-between">
    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
      Skill Configuration
    </label>
    {selectedSkills.length > 0 && (
      <button
        onClick={clearAllSkills}
        className="text-[10px] font-medium text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1"
      >
        <span className="material-symbols-outlined text-sm">delete</span>
        Clear all
      </button>
    )}
  </div>

  {/* Selected Skill Cards */}
  {selectedSkills.length > 0 ? (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1">
      {selectedSkills.map((selected) => {
        const skill = skills.find((s) => s.id === selected.skillId);
        if (!skill) return null;
        return (
          <div
            key={selected.skillId}
            className="p-3 rounded-2xl bg-white border border-slate-200 shadow-sm transition-all hover:shadow-md"
          >
            {/* Skill Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500 flex-shrink-0">
                  <span className="material-symbols-outlined text-xs">bolt</span>
                </span>
                <span className="text-xs font-semibold text-slate-700 truncate">{skill.name}</span>
              </div>
              <button
                type="button"
                onClick={() => toggleSkill(selected.skillId)}
                className="text-slate-400 hover:text-red-500 transition-colors p-1 flex-shrink-0"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            {/* Proficiency */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[9px] font-bold text-slate-400 uppercase">Proficiency</label>
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full">
                  {selected.proficiencyLevel}/5
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={5}
                value={selected.proficiencyLevel}
                onChange={(e) =>
                  updateSkillField(selected.skillId, "proficiencyLevel", Number(e.target.value))
                }
                className="w-full h-1.5 rounded-lg appearance-none bg-slate-100 cursor-pointer accent-indigo-600"
              />
              <div className="flex justify-between mt-1">
                <span className="text-[8px] text-slate-300">Beginner</span>
                <span className="text-[8px] text-slate-300">Expert</span>
              </div>
            </div>

            {/* Experience */}
            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1.5">
                Experience (mos)
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    updateSkillField(
                      selected.skillId,
                      "experienceMonths",
                      Math.max(0, selected.experienceMonths - 1)
                    )
                  }
                  className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  <span className="material-symbols-outlined text-xs">remove</span>
                </button>
                <input
                  type="number"
                  min={0}
                  max={600}
                  value={selected.experienceMonths}
                  onChange={(e) => {
                    const val = e.target.value === "" ? 0 : Number(e.target.value);
                    updateSkillField(selected.skillId, "experienceMonths", val);
                  }}
                  className="flex-1 px-2 py-1.5 rounded-lg border border-slate-200 text-center text-xs font-medium text-slate-700 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
                />
                <button
                  type="button"
                  onClick={() =>
                    updateSkillField(
                      selected.skillId,
                      "experienceMonths",
                      Math.min(600, selected.experienceMonths + 1)
                    )
                  }
                  className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  <span className="material-symbols-outlined text-xs">add</span>
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  ) : (
    <div className="flex flex-col items-center justify-center py-12 text-slate-300 border border-dashed border-slate-200 rounded-2xl">
      <span className="material-symbols-outlined text-4xl mb-2">extension</span>
      <p className="text-xs">Select skills from the catalogue</p>
    </div>
  )}

  {/* Save Button */}
  <GradientButton
    variant="ghost"
    onClick={handleAddSkills}
    disabled={selectedSkills.length === 0}
    className="w-full"
  >
    <span className="material-symbols-outlined text-sm">save</span>
    Save {selectedSkills.length > 0 ? `${selectedSkills.length} Skill(s)` : "Skills"}
  </GradientButton>
</div>
      </div>
    </GlassCard>
  );
}