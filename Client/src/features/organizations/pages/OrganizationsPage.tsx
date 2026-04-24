import { useEffect, useMemo, useState } from "react";
import { api } from "../../../api";
import { useAuth } from "../../../auth";
import { ConfirmDialog } from "../../../components/common/ConfirmDialog";
import { ErrorPanel, LoadingPanel, Notice, Panel } from "../../../ui";
import type { Department, OrganizationRecord } from "../../../types";
import { OrganizationFormDialog } from "../components/OrganizationFormDialog";

export function OrganizationsPage() {
  const { auth } = useAuth();
  const [organizations, setOrganizations] = useState<OrganizationRecord[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [editing, setEditing] = useState<OrganizationRecord | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<OrganizationRecord | null>(null);
  const [departmentId, setDepartmentId] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = () => {
    if (!auth) {
      return Promise.resolve();
    }

    return Promise.all([api.getOrganizations(auth.token), api.getDepartments(auth.token)])
      .then(([orgData, departmentData]) => {
        setOrganizations(orgData);
        setDepartments(departmentData);
        setSelectedId((current) => current || orgData[0]?.id || "");
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : "Failed to load organizations.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    void refresh();
  }, [auth]);

  const selectedOrganization = useMemo(
    () => organizations.find((item) => item.id === selectedId) ?? organizations[0] ?? null,
    [organizations, selectedId],
  );

  const availableDepartments = useMemo(() => {
    const assigned = new Set(selectedOrganization?.departments.map((item) => item.id) ?? []);
    return departments.filter((department) => !assigned.has(department.id));
  }, [departments, selectedOrganization]);

  if (loading) {
    return <LoadingPanel label="Loading organizations..." />;
  }

  if (error) {
    return <ErrorPanel message={error} />;
  }

  return (
    <div className="page-grid">
      {message ? <Notice>{message}</Notice> : null}
      <Panel title="Organizations" subtitle="Create organizations and bind departments to the right parent entity">
        <div className="split">
          <div className="list-column">
            {organizations.map((organization) => (
              <button
                key={organization.id}
                className={`list-card ${selectedOrganization?.id === organization.id ? "selected-card" : ""}`}
                onClick={() => setSelectedId(organization.id)}
              >
                <strong>{organization.name}</strong>
                <span>{organization.departmentCount} departments</span>
                <small>{organization.contactEmail}</small>
              </button>
            ))}
          </div>
          <div className="detail-card">
            {selectedOrganization ? (
              <>
                <div className="section-row">
                  <h4>{selectedOrganization.name}</h4>
                  <div className="inline-actions">
                    <button className="ghost-button" onClick={() => setEditing(selectedOrganization)}>
                      Edit
                    </button>
                    <button className="danger-button" onClick={() => setConfirmDelete(selectedOrganization)}>
                      Delete
                    </button>
                  </div>
                </div>
                <p>{selectedOrganization.address}</p>
                <div className="metric-row"><span>Tax ID</span><strong>{selectedOrganization.taxId}</strong></div>
                <div className="metric-row"><span>Phone</span><strong>{selectedOrganization.contactPhone}</strong></div>
                <div className="metric-row"><span>Founded</span><strong>{new Date(selectedOrganization.foundedDate).toLocaleDateString()}</strong></div>
                <div className="section-row" style={{ marginTop: "1rem" }}>
                  <h4>Departments</h4>
                </div>
                <div className="list-column">
                  {selectedOrganization.departments.map((department) => (
                    <div className="list-card" key={department.id}>
                      <strong>{department.name}</strong>
                      <span>{department.code}</span>
                      <div className="inline-actions">
                        <button
                          className="ghost-button"
                          onClick={() =>
                            auth &&
                            api.removeDepartmentFromOrganization(auth.token, selectedOrganization.id, department.id).then(() => {
                              setMessage("Department removed from organization.");
                              void refresh();
                            })
                          }
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="inline-actions wide" style={{ marginTop: "1rem" }}>
                  <select value={departmentId} onChange={(event) => setDepartmentId(event.target.value)}>
                    <option value="">Assign department</option>
                    {availableDepartments.map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name}
                      </option>
                    ))}
                  </select>
                  <button
                    className="primary-button"
                    disabled={!departmentId}
                    onClick={() =>
                      auth &&
                      departmentId &&
                      api.assignDepartmentToOrganization(auth.token, selectedOrganization.id, departmentId).then(() => {
                        setDepartmentId("");
                        setMessage("Department assigned to organization.");
                        void refresh();
                      })
                    }
                  >
                    Assign
                  </button>
                </div>
              </>
            ) : (
              <div className="empty-state">
                <strong>No organizations</strong>
                <span>Create an organization to begin structuring departments.</span>
              </div>
            )}
          </div>
        </div>
        <div className="inline-actions">
          <button className="primary-button" onClick={() => setEditing({} as OrganizationRecord)}>
            Create Organization
          </button>
        </div>
      </Panel>
      <OrganizationFormDialog
        open={editing !== null}
        organization={editing?.id ? editing : undefined}
        onClose={() => setEditing(null)}
        onSubmit={(payload) => {
          if (!auth) {
            return;
          }

          const action = editing?.id
            ? api.updateOrganization(auth.token, editing.id, payload)
            : api.createOrganization(auth.token, payload);

          void action.then(() => {
            setEditing(null);
            setMessage(editing?.id ? "Organization updated." : "Organization created.");
            void refresh();
          });
        }}
      />
      <ConfirmDialog
        open={confirmDelete !== null}
        title="Delete Organization"
        message={`Delete ${confirmDelete?.name}?`}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() =>
          auth && confirmDelete
            ? api.deleteOrganization(auth.token, confirmDelete.id).then(() => {
                setConfirmDelete(null);
                setMessage("Organization deleted.");
                void refresh();
              })
            : undefined
        }
        confirmLabel="Delete"
      />
    </div>
  );
}
