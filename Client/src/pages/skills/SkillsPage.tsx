import { useEffect, useState } from "react";
import { api } from "../../api";
import { useAuth } from "../../auth";
import type { SkillRecord } from "../../types";
import { 
  AnimatedBackground, 
  GlassCard, 
  GradientButton, 
  PageHeader,
  ModalOverlay,
  DeleteConfirmationModal,
} from "../shared";
import { SkillFormModal } from "./SkillFormModal";

export function SkillsPage() {
  const { auth, hasRole } = useAuth();
  const canManage = hasRole("SuperAdmin", "ProjectManager", "DepartmentHead");
  const canWrite = hasRole("SuperAdmin", "ProjectManager");

  const [skills, setSkills] = useState<SkillRecord[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  const [skillModal, setSkillModal] = useState<{ open: boolean; editSkill?: SkillRecord }>({ open: false });
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; skill: SkillRecord | null }>({ open: false, skill: null });

  const loadData = () => {
    if (!auth) return;
    setLoading(true);
    api.getSkills(auth.token)
      .then(setSkills)
      .catch((cause) => setMessage(cause instanceof Error ? cause.message : "Failed to load skills."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, [auth]);

  // Get unique categories
  const categories = [...new Set(skills.map(s => s.category).filter(Boolean))];

  // Filter skills
  const filteredSkills = skills.filter(skill => {
    const matchesSearch = !searchTerm || 
      skill.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (skill.description && skill.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = !selectedCategory || skill.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Stats
  const totalUsers = skills.reduce((sum, s) => sum + (s.userCount || 0), 0);
  const avgUsersPerSkill = skills.length > 0 ? Math.round(totalUsers / skills.length) : 0;

  const handleSkillSubmit = async (payload: Record<string, unknown>) => {
    if (!auth) return;
    try {
      if (skillModal.editSkill) {
        await api.updateSkill(auth.token, skillModal.editSkill.id, payload);
        setMessage("Skill updated successfully.");
      } else {
        await api.createSkill(auth.token, payload);
        setMessage("Skill created successfully.");
      }
      setSkillModal({ open: false });
      loadData();
    } catch (e) {
      setMessage(`Error: ${e instanceof Error ? e.message : "Save failed"}`);
    }
  };

  const handleDelete = async () => {
    if (!auth || !deleteConfirm.skill) return;
    try {
      await api.deleteSkill(auth.token, deleteConfirm.skill.id);
      setMessage("Skill deleted successfully.");
      setDeleteConfirm({ open: false, skill: null });
      loadData();
    } catch (e) {
      setMessage(`Error: ${e instanceof Error ? e.message : "Deletion failed"}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen p-7 relative font-sans">
        <AnimatedBackground />
        <div className="flex items-center justify-center h-96">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-3 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
            <span className="text-slate-400 text-sm font-medium">Loading skills...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-7 relative font-sans">
      <AnimatedBackground />

      {/* Page Header */}
      <div className="relative z-10">
        <PageHeader
          title="Skills"
          description="Manage skill taxonomy and expertise catalogue"
          action={canWrite ? {
            label: "Create Skill",
            onClick: () => setSkillModal({ open: true }),
            icon: "add",
          } : undefined}
        />
      </div>

      {/* Message */}
      {message && (
        <div className="relative z-10 mb-5 bg-emerald-50 border border-emerald-200 rounded-xl py-3.5 px-5 text-emerald-700 text-sm flex items-center gap-2.5 animate-[slideIn_0.3s_ease]">
          <span className="material-symbols-outlined">check_circle</span>
          {message}
          <button
            className="ml-auto bg-transparent border-none cursor-pointer text-emerald-500 hover:text-emerald-700"
            onClick={() => setMessage("")}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      )}

      {/* Stats Row */}
      <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard label="Total Skills" value={skills.length} color="indigo" icon="school" />
        <StatCard label="Categories" value={categories.length} color="violet" icon="category" />
        <StatCard label="Total Users" value={totalUsers} color="emerald" icon="people" />
        <StatCard label="Avg Users/Skill" value={avgUsersPerSkill} color="amber" icon="trending_up" />
      </div>

      {/* Main Content */}
      <div className="relative z-10">
        <GlassCard className="overflow-hidden">
          {/* Filters Bar */}
          <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg pointer-events-none">
                search
              </span>
              <input
                type="text"
                placeholder="Search skills..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-10 pl-10 pr-10 rounded-xl border border-slate-200 text-[13px] outline-none bg-white placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              )}
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 bg-white outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            {/* Results Count */}
            <span className="text-xs text-slate-400 ml-auto">
              {filteredSkills.length} skill{filteredSkills.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Skills Grid */}
          <div className="p-6">
            {filteredSkills.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-3xl text-slate-400">
                    {searchTerm ? "search_off" : "school"}
                  </span>
                </div>
                <h4 className="text-sm font-semibold text-slate-700 mb-2">
                  {searchTerm ? "No skills found" : "No skills yet"}
                </h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  {searchTerm 
                    ? "Try adjusting your search or filters" 
                    : "Create your first skill to build the expertise catalogue"}
                </p>
                {!searchTerm && canWrite && (
                  <button
                    onClick={() => setSkillModal({ open: true })}
                    className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors inline-flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-lg">add</span>
                    Create Skill
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSkills.map((skill, index) => (
                  <div
                    key={skill.id}
                    className="p-5 rounded-xl border border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm transition-all duration-200"
                    style={{ animation: `slideIn 0.3s ease ${index * 0.05}s both` }}
                  >
                    {/* Skill Icon & Name */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-xl text-indigo-600">school</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-semibold text-sm text-slate-800 truncate">{skill.name}</h4>
                        {skill.category && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-violet-50 text-violet-600 mt-1">
                            {skill.category}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Description */}
                    {skill.description && (
                      <p className="text-xs text-slate-500 mb-3 line-clamp-2 leading-relaxed">
                        {skill.description}
                      </p>
                    )}

                    {/* User Count & Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm text-slate-400">people</span>
                        <span className="text-xs font-medium text-slate-500">
                          {skill.userCount || 0} user{(skill.userCount || 0) !== 1 ? "s" : ""}
                        </span>
                      </div>

                      {canManage && (
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => setSkillModal({ open: true, editSkill: skill })}
                            className="w-8 h-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50 hover:border-slate-300 transition-colors"
                            title="Edit skill"
                          >
                            <span className="material-symbols-outlined text-sm text-slate-500">edit</span>
                          </button>
                          {canWrite && (
                            <button
                              onClick={() => setDeleteConfirm({ open: true, skill })}
                              className="w-8 h-8 rounded-lg border border-red-200 bg-red-50 flex items-center justify-center hover:bg-red-100 hover:border-red-300 transition-colors"
                              title="Delete skill"
                            >
                              <span className="material-symbols-outlined text-sm text-red-500">delete</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Modals */}
      {skillModal.open && (
        <ModalOverlay onClose={() => setSkillModal({ open: false })}>
          <SkillFormModal
            initialData={skillModal.editSkill}
            onSubmit={handleSkillSubmit}
            onCancel={() => setSkillModal({ open: false })}
          />
        </ModalOverlay>
      )}

      {deleteConfirm.open && deleteConfirm.skill && (
        <ModalOverlay onClose={() => setDeleteConfirm({ open: false, skill: null })}>
          <DeleteConfirmationModal
            name={deleteConfirm.skill.name}
            warning={`This skill is used by ${deleteConfirm.skill.userCount || 0} users. Deleting it will remove it from all user profiles.`}
            onConfirm={handleDelete}
            onCancel={() => setDeleteConfirm({ open: false, skill: null })}
          />
        </ModalOverlay>
      )}
    </div>
  );
}

// Helper Components
function StatCard({ label, value, color, icon }: { label: string; value: string | number; color: string; icon: string }) {
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    indigo: { bg: "bg-indigo-50", text: "text-indigo-600", border: "border-indigo-100" },
    violet: { bg: "bg-violet-50", text: "text-violet-600", border: "border-violet-100" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-100" },
    amber: { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-100" },
  };
  const colors = colorMap[color] || colorMap.indigo;

  return (
    <div className={`rounded-xl border p-4 ${colors.border} ${colors.bg}`}>
      <div className="flex items-center gap-3">
        <span className={`material-symbols-outlined text-xl ${colors.text}`}>{icon}</span>
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
          <p className={`text-2xl font-bold ${colors.text}`}>{value}</p>
        </div>
      </div>
    </div>
  );
}