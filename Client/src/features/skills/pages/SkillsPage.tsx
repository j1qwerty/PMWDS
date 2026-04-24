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
    <div className="page-grid">
      {message ? <Notice>{message}</Notice> : null}
      <Panel title="Skills" subtitle="Maintain reusable skill taxonomy and the expertise catalogue">
        <div className="table-wrap">
          <table className="table">
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
                    <div className="table-sub">{skill.description}</div>
                  </td>
                  <td>{skill.category}</td>
                  <td>{skill.userCount}</td>
                  <td>
                    <div className="inline-actions">
                      <button className="ghost-button" onClick={() => setEditing(skill)}>Edit</button>
                      <button className="danger-button" onClick={() => setDeleting(skill)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="inline-actions">
          <button className="primary-button" onClick={() => setEditing({} as SkillRecord)}>
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
