import { useEffect, useState } from "react";
import { api } from "../../../api";
import { useAuth } from "../../../auth";
import { ErrorPanel, LoadingPanel, Notice, Panel } from "../../../ui";
import type { ActivityLogRecord, User } from "../../../types";
import { stringifyJsonMap } from "../../admin/shared/serializers";

export function ActivityLogsPage() {
  const { auth, hasRole } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<ActivityLogRecord[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [form, setForm] = useState({
    activityType: "",
    description: "",
    metadata: "{}",
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = () => {
    if (!auth) {
      return Promise.resolve();
    }

    const logsRequest =
      selectedUserId && hasRole("SuperAdmin", "ProjectManager", "DepartmentHead")
        ? api.getUserActivityLogs(auth.token, selectedUserId)
        : api.getMyActivityLogs(auth.token);

    return Promise.all([
      hasRole("SuperAdmin", "ProjectManager", "DepartmentHead") ? api.getUsers(auth.token) : Promise.resolve([]),
      logsRequest,
    ])
      .then(([userData, logData]) => {
        setUsers(userData as User[]);
        setLogs(logData);
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : "Failed to load activity logs.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    void refresh();
  }, [auth, selectedUserId]);

  if (loading) {
    return <LoadingPanel label="Loading activity logs..." />;
  }

  if (error) {
    return <ErrorPanel message={error} />;
  }

  return (
    <div className="page-grid">
      {message ? <Notice>{message}</Notice> : null}
      <Panel title="Activity Logs" subtitle="Inspect personal and team activity history, then record manual entries when needed">
        {hasRole("SuperAdmin", "ProjectManager", "DepartmentHead") ? (
          <div className="inline-actions wide">
            <select value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)}>
              <option value="">My activity</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.fullName}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div className="list-column">
          {logs.map((log) => (
            <div className="list-card" key={log.id}>
              <strong>{log.activityType}</strong>
              <span>{new Date(log.timestamp).toLocaleString()}</span>
              <small>{log.description}</small>
              <small>{stringifyJsonMap(log.metadata)}</small>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Log Activity" subtitle="Create a manual activity entry for the current signed-in user">
        <div className="form-grid wide">
          <label>
            <span>Activity Type</span>
            <input value={form.activityType} onChange={(event) => setForm({ ...form, activityType: event.target.value })} />
          </label>
          <label>
            <span>Description</span>
            <textarea rows={4} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
          </label>
          <label>
            <span>Metadata JSON</span>
            <textarea rows={6} value={form.metadata} onChange={(event) => setForm({ ...form, metadata: event.target.value })} />
          </label>
        </div>
        <div className="inline-actions">
          <button
            className="primary-button"
            onClick={() => {
              if (!auth) {
                return;
              }

              void api.createActivityLog(auth.token, {
                activityType: form.activityType,
                description: form.description,
                metadata: JSON.parse(form.metadata),
              }).then(() => {
                setForm({ activityType: "", description: "", metadata: "{}" });
                setMessage("Activity logged.");
                void refresh();
              });
            }}
          >
            Save Activity
          </button>
        </div>
      </Panel>
    </div>
  );
}
