import { useEffect, useState } from "react";
import { api } from "../../../api";
import { useAuth } from "../../../auth";
import { ConfirmDialog } from "../../../components/common/ConfirmDialog";
import { ErrorPanel, LoadingPanel, Notice, Panel } from "../../../ui";
import type { SkillRecord } from "../../../types";
import { SkillFormDialog } from "../components/SkillFormDialog";

export function SkillsPage() {
  const { auth } = useAuth();
  const [skills, setSkills] = useState<SkillRecord[]>([]);
  const [editing, setEditing] = useState<SkillRecord | null>(null);
  const [deleting, setDeleting] = useState<SkillRecord | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = () => {
    if (!auth) {
      return Promise.resolve();
    }

    return api.getSkills(auth.token)
      .then(setSkills)
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Failed to load skills."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    void refresh();
  }, [auth]);

  if (loading) {
    return <LoadingPanel label="Loading skills..." />;
  }

  if (error) {
    return <ErrorPanel message={error} />;
  }

  return (
    <div className="grid  gap-4 content-start">
      {message ? <Notice>{message}</Notice> : null}
      <Panel title="Skills" subtitle="Maintain reusable skill taxonomy and the expertise catalogue">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Users</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {skills.map((skill) => (
                <tr key={skill.id}>
                  <td>
                    <strong>{skill.name}</strong>
                    <div className="text-xs text-slate-500">{skill.description}</div>
                  </td>
                  <td>{skill.category}</td>
                  <td>{skill.userCount}</td>
                  <td>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button className="rounded-md border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-50" onClick={() => setEditing(skill)}>Edit</button>
                      <button className="rounded-md border border-rose-300/40 bg-rose-400/10 px-4 py-2 text-sm font-medium text-rose-200 transition hover:bg-rose-400/20" onClick={() => setDeleting(skill)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="rounded-md border border-sky-300/60 bg-sky-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-50" onClick={() => setEditing({} as SkillRecord)}>
            Create Skill
          </button>
        </div>
      </Panel>
      <SkillFormDialog
        open={editing !== null}
        skill={editing?.id ? editing : undefined}
        onClose={() => setEditing(null)}
        onSubmit={(payload) => {
          if (!auth) {
            return;
          }

          const action = editing?.id
            ? api.updateSkill(auth.token, editing.id, payload)
            : api.createSkill(auth.token, payload);

          void action.then(() => {
            setEditing(null);
            setMessage(editing?.id ? "Skill updated." : "Skill created.");
            void refresh();
          });
        }}
      />
      <ConfirmDialog
        open={deleting !== null}
        title="Delete Skill"
        message={`Delete ${deleting?.name}?`}
        onClose={() => setDeleting(null)}
        onConfirm={() =>
          auth && deleting
            ? api.deleteSkill(auth.token, deleting.id).then(() => {
                setDeleting(null);
                setMessage("Skill deleted.");
                void refresh();
              })
            : undefined
        }
        confirmLabel="Delete"
      />
    </div>
  );
}
