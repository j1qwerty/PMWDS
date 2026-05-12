// pages/OrganizationStructurePage.tsx
import { useEffect, useState, useMemo, type FormEvent } from "react";
import { api } from "../../api";
import { useAuth } from "../../auth";
import type { Department, OrganizationRecord, User } from "../../types";
import { formatPercent } from "../../ui";

// ─── Fancy Background Component ────────────────────────────
function AnimatedBackground() {
  return (
    <>
      <div style={{
        position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
        background: "radial-gradient(ellipse at 0% 0%, rgba(70,72,212,0.04) 0%, transparent 50%), radial-gradient(ellipse at 100% 100%, rgba(129,39,207,0.04) 0%, transparent 50%), radial-gradient(ellipse at 50% 0%, rgba(84,92,114,0.02) 0%, transparent 50%)",
        pointerEvents: "none", zIndex: 0
      }} />
      {/* Floating orbs */}
      <div style={{
        position: "fixed", top: "10%", right: "5%", width: "300px", height: "300px",
        borderRadius: "50%", background: "rgba(70,72,212,0.06)", filter: "blur(80px)",
        pointerEvents: "none", zIndex: 0, animation: "float 8s ease-in-out infinite"
      }} />
      <div style={{
        position: "fixed", bottom: "10%", left: "5%", width: "250px", height: "250px",
        borderRadius: "50%", background: "rgba(129,39,207,0.05)", filter: "blur(80px)",
        pointerEvents: "none", zIndex: 0, animation: "float 10s ease-in-out infinite 2s"
      }} />
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-30px) scale(1.05); }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(70,72,212,0.2); }
          50% { box-shadow: 0 0 40px rgba(70,72,212,0.4); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </>
  );
}

// ─── Reusable Components ───────────────────────────────────
function GlassCard({ children, style, ...props }: any) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.75)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: "1px solid rgba(255,255,255,0.6)",
        borderRadius: "20px",
        boxShadow: "0 8px 40px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.02)",
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

function GradientButton({ children, style, variant = "primary", ...props }: any) {
  const variants: Record<string, any> = {
    primary: {
      background: "linear-gradient(135deg, #4648d4 0%, #8127cf 100%)",
      color: "#ffffff",
      boxShadow: "0 4px 15px rgba(70,72,212,0.3)",
    },
    ghost: {
      background: "transparent",
      color: "#4648d4",
      border: "1.5px solid #4648d4",
      boxShadow: "none",
    },
  };
  const v = variants[variant] || variants.primary;

  return (
    <button
      style={{
        padding: "10px 20px",
        fontSize: "13px",
        fontWeight: 600,
        borderRadius: "12px",
        border: "none",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        transition: "all 0.3s",
        ...v,
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-1px)";
        e.currentTarget.style.boxShadow = variant === "primary" 
          ? "0 6px 20px rgba(70,72,212,0.4)" 
          : "0 4px 15px rgba(70,72,212,0.15)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = v.boxShadow;
      }}
      {...props}
    >
      {children}
    </button>
  );
}

// ─── Main Page Component ──────────────────────────────────
export function OrganizationStructurePage() {
  const { auth, hasRole } = useAuth();
  const [organizations, setOrganizations] = useState<OrganizationRecord[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Modal states
  const [orgModal, setOrgModal] = useState<{ open: boolean; editOrg?: OrganizationRecord }>({ open: false });
  const [deptModal, setDeptModal] = useState<{ open: boolean; editDept?: Department }>({ open: false });
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    type: "org" | "dept";
    id: string;
    name: string;
    warning?: string;
  }>({ open: false, type: "org", id: "", name: "" });

  const isAdmin = hasRole("SuperAdmin");

  const loadData = () => {
    if (!auth) return;
    Promise.all([
      api.getOrganizations(auth.token),
      api.getDepartments(auth.token),
      isAdmin ? api.getUsers(auth.token) : Promise.resolve([]),
    ]).then(([orgData, deptData, userData]) => {
      setOrganizations(orgData);
      setDepartments(deptData);
      setUsers(userData as User[]);
      if (!selectedOrgId && orgData.length) setSelectedOrgId(orgData[0].id);
    });
  };

  useEffect(() => { loadData(); }, [auth]);

  // Derived data
  const selectedOrg = organizations.find((o) => o.id === selectedOrgId) ?? null;
  const orgDepartments = departments.filter((d) => d.organizationId === selectedOrgId);
  
  const filteredOrgs = organizations.filter((org) =>
    org.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Delete checks
  const checkBeforeDelete = (type: "org" | "dept", id: string, name: string) => {
    let warning = "";
    if (type === "org") {
      const linked = departments.filter((d) => d.organizationId === id);
      if (linked.length) {
        warning = `⚠️ This organization has ${linked.length} department(s). Deleting it will remove all associated departments and their data permanently.`;
      }
    } else {
      warning = "⚠️ Deleting this department may affect assigned projects and team members.";
    }
    setDeleteConfirm({ open: true, type, id, name, warning });
  };

  const handleDelete = async () => {
    if (!auth) return;
    try {
      if (deleteConfirm.type === "org") {
        await api.deleteOrganization(auth.token, deleteConfirm.id);
        if (selectedOrgId === deleteConfirm.id) setSelectedOrgId("");
      } else {
        await api.deleteDepartment(auth.token, deleteConfirm.id);
      }
      setMessage(`${deleteConfirm.type === "org" ? "Organization" : "Department"} deleted successfully.`);
      setDeleteConfirm({ open: false, type: "org", id: "", name: "" });
      loadData();
    } catch (e) {
      setMessage(`Error: ${e instanceof Error ? e.message : "Deletion failed"}`);
    }
  };

  // Form handlers
  const handleOrgSubmit = async (form: Record<string, unknown>) => {
    if (!auth) return;
    try {
      if (orgModal.editOrg) {
        await api.updateOrganization(auth.token, orgModal.editOrg.id, form);
      } else {
        const newOrg = await api.createOrganization(auth.token, form);
        setSelectedOrgId((newOrg as any).id || selectedOrgId);
      }
      setOrgModal({ open: false });
      loadData();
      setMessage(orgModal.editOrg ? "Organization updated." : "Organization created.");
    } catch (e) {
      setMessage(`Error: ${e instanceof Error ? e.message : "Save failed"}`);
    }
  };

  const handleDeptSubmit = async (form: Record<string, unknown>) => {
    if (!auth) return;
    try {
      const payload = { ...form, organizationId: selectedOrgId };
      if (deptModal.editDept) {
        await api.updateDepartment(auth.token, deptModal.editDept.id, payload);
      } else {
        await api.createDepartment(auth.token, payload);
      }
      setDeptModal({ open: false });
      loadData();
      setMessage(deptModal.editDept ? "Department updated." : "Department created.");
    } catch (e) {
      setMessage(`Error: ${e instanceof Error ? e.message : "Save failed"}`);
    }
  };

  return (
    <div style={{ padding: "28px", minHeight: "100vh", fontFamily: "Inter, sans-serif", position: "relative" }}>
      <AnimatedBackground />

      {/* Header */}
      <div style={{ position: "relative", zIndex: 1, marginBottom: "28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h1 style={{ 
              fontSize: "34px", fontWeight: 800, color: "#191c1e", letterSpacing: "-0.03em", 
              margin: "0 0 6px 0", background: "linear-gradient(135deg, #191c1e 0%, #4648d4 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
            }}>
              Organization Structure
            </h1>
            <p style={{ fontSize: "14px", color: "#767586", margin: 0 }}>
              Manage organizations and their departments with elegance.
            </p>
          </div>
          {isAdmin && (
            <GradientButton onClick={() => setOrgModal({ open: true })}>
              <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>add_business</span>
              New Organization
            </GradientButton>
          )}
        </div>
      </div>

      {/* Message */}
      {message && (
        <div style={{
          position: "relative", zIndex: 1, marginBottom: "20px",
          background: "rgba(16,185,129,0.1)", border: "1px solid #10B981", borderRadius: "12px",
          padding: "14px 20px", color: "#047857", fontSize: "14px",
          display: "flex", alignItems: "center", gap: "10px",
          animation: "slideIn 0.3s ease"
        }}>
          <span className="material-symbols-outlined">check_circle</span>
          {message}
          <button style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#047857" }}
            onClick={() => setMessage("")}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      )}

      {/* Main Layout */}
      <div style={{
        display: "grid", gridTemplateColumns: "320px 1fr", gap: "24px",
        position: "relative", zIndex: 1
      }}>
        {/* Left Panel: Organization List */}
        <GlassCard style={{ padding: "20px", maxHeight: "calc(100vh - 220px)", display: "flex", flexDirection: "column" }}>
          <div style={{ marginBottom: "16px" }}>
            <div style={{ position: "relative" }}>
              <span className="material-symbols-outlined" style={{
                position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)",
                color: "#767586", fontSize: "18px", pointerEvents: "none"
              }}>search</span>
              <input
                placeholder="Search organizations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: "100%", height: "40px", padding: "0 14px 0 38px",
                  borderRadius: "10px", border: "1px solid #e0e3e5",
                  fontSize: "13px", outline: "none", background: "#fff",
                  boxSizing: "border-box"
                }}
              />
            </div>
          </div>
          
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
            {filteredOrgs.map((org, index) => (
              <div
                key={org.id}
                onClick={() => setSelectedOrgId(org.id)}
                style={{
                  padding: "14px 16px",
                  borderRadius: "12px",
                  cursor: "pointer",
                  background: selectedOrgId === org.id 
                    ? "linear-gradient(135deg, rgba(70,72,212,0.08) 0%, rgba(129,39,207,0.05) 100%)" 
                    : "rgba(255,255,255,0.4)",
                  border: selectedOrgId === org.id 
                    ? "1.5px solid rgba(70,72,212,0.3)" 
                    : "1px solid rgba(224,227,229,0.3)",
                  transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                  transform: selectedOrgId === org.id ? "scale(1.02)" : "scale(1)",
                  animation: `slideIn 0.3s ease ${index * 0.05}s both`,
                  position: "relative",
                  overflow: "hidden",
                }}
                onMouseEnter={(e) => {
                  if (selectedOrgId !== org.id) {
                    e.currentTarget.style.background = "rgba(255,255,255,0.7)";
                    e.currentTarget.style.border = "1px solid rgba(70,72,212,0.2)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedOrgId !== org.id) {
                    e.currentTarget.style.background = "rgba(255,255,255,0.4)";
                    e.currentTarget.style.border = "1px solid rgba(224,227,229,0.3)";
                  }
                }}
              >
                {/* Decorative accent */}
                {selectedOrgId === org.id && (
                  <div style={{
                    position: "absolute", left: 0, top: 0, width: "4px", height: "100%",
                    background: "linear-gradient(180deg, #4648d4 0%, #8127cf 100%)",
                    borderRadius: "4px 0 0 4px"
                  }} />
                )}
                <div style={{ fontWeight: 700, fontSize: "14px", color: "#191c1e", marginBottom: "4px" }}>
                  {org.name}
                </div>
                <div style={{ fontSize: "11px", color: "#767586", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>business</span>
                    {org.departmentCount || 0} depts
                  </span>
                  {org.contactEmail && (
                    <span style={{ display: "flex", alignItems: "center", gap: "3px", overflow: "hidden", textOverflow: "ellipsis" }}>
                      <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>mail</span>
                      {org.contactEmail}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {filteredOrgs.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "#767586", fontSize: "13px" }}>
                <span className="material-symbols-outlined" style={{ fontSize: "40px", marginBottom: "8px", display: "block" }}>search_off</span>
                No organizations found
              </div>
            )}
          </div>
        </GlassCard>

        {/* Right Panel: Organization Detail + Departments */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {selectedOrg ? (
            <>
              {/* Organization Detail Card */}
              <GlassCard style={{ padding: "28px", position: "relative", overflow: "hidden" }}>
                {/* Glow effect */}
                <div style={{
                  position: "absolute", top: "-30px", right: "-30px", width: "120px", height: "120px",
                  borderRadius: "50%", background: "linear-gradient(135deg, rgba(70,72,212,0.15), rgba(129,39,207,0.1))",
                  filter: "blur(40px)", pointerEvents: "none"
                }} />
                
                <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                      <div style={{
                        width: "48px", height: "48px", borderRadius: "14px",
                        background: "linear-gradient(135deg, #4648d4, #8127cf)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        boxShadow: "0 4px 15px rgba(70,72,212,0.3)"
                      }}>
                        <span className="material-symbols-outlined" style={{ color: "#fff", fontSize: "24px" }}>business</span>
                      </div>
                      <div>
                        <h2 style={{ fontSize: "24px", fontWeight: 700, color: "#191c1e", margin: 0 }}>{selectedOrg.name}</h2>
                        <span style={{ fontSize: "12px", color: "#767586" }}>
                          {orgDepartments.length} Departments • {selectedOrg.departmentCount || 0} Total
                        </span>
                      </div>
                    </div>
                  </div>
                  {isAdmin && (
                    <div style={{ display: "flex", gap: "8px" }}>
                      <GradientButton variant="ghost" onClick={() => setOrgModal({ open: true, editOrg: selectedOrg })}>
                        <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>edit</span>
                        Edit
                      </GradientButton>
                      <GradientButton 
                        style={{ background: "rgba(186,26,26,0.08)", color: "#ba1a1a", border: "1px solid rgba(186,26,26,0.2)", boxShadow: "none" }}
                        onClick={() => checkBeforeDelete("org", selectedOrg.id, selectedOrg.name)}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>delete</span>
                        Delete
                      </GradientButton>
                    </div>
                  )}
                </div>

                {/* Info Grid */}
                <div style={{
                  display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                  gap: "12px", marginTop: "24px"
                }}>
                  <InfoTile icon="id_card" label="Tax ID" value={selectedOrg.taxId} />
                  <InfoTile icon="call" label="Phone" value={selectedOrg.contactPhone} />
                  <InfoTile icon="mail" label="Email" value={selectedOrg.contactEmail} />
                  <InfoTile icon="calendar_today" label="Founded" value={new Date(selectedOrg.foundedDate).toLocaleDateString()} />
                  <InfoTile icon="location_on" label="Address" value={selectedOrg.address} />
                  <InfoTile icon="groups" label="Departments" value={orgDepartments.length} />
                </div>
              </GlassCard>

              {/* Departments Section */}
              <GlassCard style={{ padding: "24px", flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                  <div>
                    <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#191c1e", margin: 0 }}>Departments</h3>
                    <p style={{ fontSize: "12px", color: "#767586", margin: "4px 0 0 0" }}>
                      {orgDepartments.length} department{orgDepartments.length !== 1 ? "s" : ""} in this organization
                    </p>
                  </div>
                  {isAdmin && (
                    <GradientButton onClick={() => setDeptModal({ open: true })}>
                      <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>add</span>
                      Add Department
                    </GradientButton>
                  )}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "14px" }}>
                  {orgDepartments.map((dept, index) => (
                    <div
                      key={dept.id}
                      style={{
                        padding: "18px",
                        borderRadius: "14px",
                        background: "rgba(255,255,255,0.5)",
                        border: "1px solid rgba(224,227,229,0.4)",
                        transition: "all 0.3s",
                        position: "relative",
                        overflow: "hidden",
                        animation: `slideIn 0.3s ease ${index * 0.08}s both`,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = "0 8px 25px rgba(0,0,0,0.06)";
                        e.currentTarget.style.transform = "translateY(-2px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = "none";
                        e.currentTarget.style.transform = "translateY(0)";
                      }}
                    >
                      {/* Color accent bar */}
                      <div style={{
                        position: "absolute", top: 0, left: 0, width: "4px", height: "100%",
                        background: `hsl(${index * 45 + 260}, 60%, 50%)`, borderRadius: "4px 0 0 4px"
                      }} />
                      
                      <div style={{ paddingLeft: "8px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: "15px", color: "#191c1e", marginBottom: "2px" }}>
                              {dept.name}
                            </div>
                            <div style={{ fontSize: "11px", color: "#767586", fontWeight: 500 }}>
                              {dept.code}
                            </div>
                          </div>
                          {isAdmin && (
                            <div style={{ display: "flex", gap: "4px" }}>
                              <button
                                onClick={() => setDeptModal({ open: true, editDept: { ...dept, organizationId: selectedOrg.id } })}
                                style={{
                                  width: "30px", height: "30px", borderRadius: "8px", border: "1px solid #e0e3e5",
                                  background: "#fff", cursor: "pointer", display: "flex", alignItems: "center",
                                  justifyContent: "center", transition: "all 0.2s"
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = "#f0f0f0"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; }}
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: "14px", color: "#464554" }}>edit</span>
                              </button>
                              <button
                                onClick={() => checkBeforeDelete("dept", dept.id, dept.name)}
                                style={{
                                  width: "30px", height: "30px", borderRadius: "8px", border: "1px solid rgba(186,26,26,0.2)",
                                  background: "rgba(186,26,26,0.05)", cursor: "pointer", display: "flex",
                                  alignItems: "center", justifyContent: "center", transition: "all 0.2s"
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(186,26,26,0.1)"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(186,26,26,0.05)"; }}
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: "14px", color: "#ba1a1a" }}>delete</span>
                              </button>
                            </div>
                          )}
                        </div>
                        
                        {/* Progress bar for capacity */}
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", fontSize: "11px" }}>
                            <span style={{ color: "#767586" }}>Capacity</span>
                            <span style={{ fontWeight: 600, color: "#191c1e" }}>{formatPercent(dept.capacityUtilization)}</span>
                          </div>
                          <div style={{
                            width: "100%", height: "6px", borderRadius: "3px",
                            background: "#e6e8ea", overflow: "hidden"
                          }}>
                            <div style={{
                              height: "100%", borderRadius: "3px",
                              background: "linear-gradient(90deg, #4648d4, #8127cf)",
                              width: `${Math.min((dept.capacityUtilization || 0) * 100, 100)}%`,
                              transition: "width 0.5s ease"
                            }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {orgDepartments.length === 0 && (
                    <div style={{
                      gridColumn: "1 / -1", textAlign: "center", padding: "50px 20px",
                      color: "#767586"
                    }}>
                      <span className="material-symbols-outlined" style={{ fontSize: "48px", marginBottom: "12px", display: "block" }}>folder_open</span>
                      <p style={{ fontSize: "14px", fontWeight: 500, margin: "0 0 4px 0" }}>No departments yet</p>
                      <p style={{ fontSize: "12px", margin: 0 }}>Create your first department for this organization.</p>
                    </div>
                  )}
                </div>
              </GlassCard>
            </>
          ) : (
            <GlassCard style={{
              padding: "60px 40px", textAlign: "center", display: "flex",
              flexDirection: "column", alignItems: "center", justifyContent: "center",
              flex: 1, minHeight: "400px"
            }}>
              <div style={{
                width: "80px", height: "80px", borderRadius: "50%",
                background: "linear-gradient(135deg, rgba(70,72,212,0.1), rgba(129,39,207,0.1))",
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: "20px"
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: "36px", color: "#4648d4" }}>corporate_fare</span>
              </div>
              <h3 style={{ fontSize: "18px", fontWeight: 600, color: "#191c1e", margin: "0 0 6px 0" }}>
                Select an Organization
              </h3>
              <p style={{ fontSize: "13px", color: "#767586", margin: 0, maxWidth: "300px" }}>
                Choose an organization from the left panel to view its details and manage departments.
              </p>
            </GlassCard>
          )}
        </div>
      </div>

      {/* ─── Modals ─────────────────────────────────────── */}
      {orgModal.open && (
        <ModalOverlay onClose={() => setOrgModal({ open: false })}>
          <OrgFormModal
            initialData={orgModal.editOrg}
            onSubmit={handleOrgSubmit}
            onCancel={() => setOrgModal({ open: false })}
          />
        </ModalOverlay>
      )}

      {deptModal.open && (
        <ModalOverlay onClose={() => setDeptModal({ open: false })}>
          <DeptFormModal
            initialData={deptModal.editDept}
            departments={departments}
            organizations={organizations}
            selectedOrgId={selectedOrgId}
            onSubmit={handleDeptSubmit}
            onCancel={() => setDeptModal({ open: false })}
          />
        </ModalOverlay>
      )}

      {deleteConfirm.open && (
        <ModalOverlay onClose={() => setDeleteConfirm({ open: false, type: "org", id: "", name: "" })}>
          <DeleteConfirmationModal
            name={deleteConfirm.name}
            warning={deleteConfirm.warning}
            onConfirm={handleDelete}
            onCancel={() => setDeleteConfirm({ open: false, type: "org", id: "", name: "" })}
          />
        </ModalOverlay>
      )}
    </div>
  );
}

// ─── Info Tile Component ─────────────────────────────────
function InfoTile({ icon, label, value }: { icon: string; label: string; value?: string | number }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.5)", borderRadius: "12px", padding: "14px",
      border: "1px solid rgba(224,227,229,0.3)", display: "flex", gap: "10px",
      alignItems: "center", transition: "all 0.2s"
    }}
    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.8)"; }}
    onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.5)"; }}
    >
      <span className="material-symbols-outlined" style={{ color: "#4648d4", fontSize: "20px", flexShrink: 0 }}>{icon}</span>
      <div>
        <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", color: "#767586", marginBottom: "2px" }}>{label}</div>
        <div style={{ fontSize: "14px", fontWeight: 600, color: "#191c1e" }}>{value || "—"}</div>
      </div>
    </div>
  );
}

// ─── Modal Components ────────────────────────────────────
function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        background: "rgba(0,0,0,0.35)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1000, animation: "fadeIn 0.2s ease"
      }}
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ animation: "slideUp 0.3s ease" }}>
        {children}
      </div>
    </div>
  );
}

function DeleteConfirmationModal({ name, warning, onConfirm, onCancel }: {
  name: string; warning?: string; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div style={{
      background: "white", borderRadius: "20px", padding: "32px", maxWidth: "420px",
      width: "90%", boxShadow: "0 25px 60px rgba(0,0,0,0.2)"
    }}>
      <div style={{
        width: "48px", height: "48px", borderRadius: "50%",
        background: "rgba(186,26,26,0.1)", display: "flex", alignItems: "center",
        justifyContent: "center", marginBottom: "16px"
      }}>
        <span className="material-symbols-outlined" style={{ color: "#ba1a1a", fontSize: "28px" }}>warning</span>
      </div>
      <h3 style={{ margin: "0 0 8px", color: "#191c1e", fontSize: "18px" }}>Confirm Deletion</h3>
      <p style={{ fontSize: "14px", color: "#464554", margin: "0 0 8px" }}>
        Are you sure you want to permanently delete <strong>{name}</strong>?
      </p>
      {warning && (
        <div style={{
          background: "#FEF3C7", border: "1px solid #F59E0B", borderRadius: "10px",
          padding: "12px", fontSize: "12px", color: "#92400E", margin: "12px 0"
        }}>
          {warning}
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
        <button onClick={onCancel} style={{
          padding: "10px 20px", borderRadius: "10px", border: "1px solid #e0e3e5",
          background: "#fff", cursor: "pointer", fontWeight: 600, fontSize: "13px", color: "#464554"
        }}>Cancel</button>
        <button onClick={onConfirm} style={{
          padding: "10px 20px", borderRadius: "10px", border: "none",
          background: "#ba1a1a", color: "#fff", cursor: "pointer", fontWeight: 600, fontSize: "13px"
        }}>Delete Permanently</button>
      </div>
    </div>
  );
}

// ─── Form Modals (simplified inline) ──────────────────────
function OrgFormModal({ initialData, onSubmit, onCancel }: {
  initialData?: OrganizationRecord;
  onSubmit: (d: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    name: initialData?.name || "", taxId: initialData?.taxId || "",
    address: initialData?.address || "", contactEmail: initialData?.contactEmail || "",
    contactPhone: initialData?.contactPhone || "", foundedDate: initialData?.foundedDate?.slice(0,10) || "",
  });
  const handleSubmit = (e: FormEvent) => { e.preventDefault(); onSubmit(form); };
  return (
    <div style={{ background: "white", borderRadius: "20px", padding: "28px", width: "480px", maxWidth: "95vw" }}>
      <h2 style={{ margin: "0 0 20px", fontSize: "20px", fontWeight: 700 }}>{initialData ? "Edit Organization" : "Create Organization"}</h2>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <InputF label="Name" value={form.name} onChange={(v) => setForm({...form, name: v})} required />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
          <InputF label="Tax ID" value={form.taxId} onChange={(v) => setForm({...form, taxId: v})} />
          <InputF label="Phone" value={form.contactPhone} onChange={(v) => setForm({...form, contactPhone: v})} />
        </div>
        <InputF label="Email" type="email" value={form.contactEmail} onChange={(v) => setForm({...form, contactEmail: v})} />
        <InputF label="Address" value={form.address} onChange={(v) => setForm({...form, address: v})} />
        <InputF label="Founded Date" type="date" value={form.foundedDate} onChange={(v) => setForm({...form, foundedDate: v})} />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
          <button type="button" onClick={onCancel} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #e0e3e5", background: "#fff", cursor: "pointer" }}>Cancel</button>
          <button type="submit" style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "linear-gradient(135deg, #4648d4, #8127cf)", color: "#fff", fontWeight: 600, cursor: "pointer" }}>{initialData ? "Update" : "Create"}</button>
        </div>
      </form>
    </div>
  );
}

function DeptFormModal({ initialData, departments, organizations, selectedOrgId, onSubmit, onCancel }: any) {
  const [form, setForm] = useState({
    name: initialData?.name || "", code: initialData?.code || "",
    description: initialData?.description || "", organizationId: initialData?.organizationId || selectedOrgId,
    parentDepartmentId: initialData?.parentDepartmentId || "", maxCapacity: initialData?.maxCapacity || 24,
  });
  const orgDepts = departments.filter((d: Department) => d.organizationId === form.organizationId);
  const handleSubmit = (e: FormEvent) => { e.preventDefault(); onSubmit({...form, parentDepartmentId: form.parentDepartmentId || null}); };
  return (
    <div style={{ background: "white", borderRadius: "20px", padding: "28px", width: "480px", maxWidth: "95vw" }}>
      <h2 style={{ margin: "0 0 20px", fontSize: "20px", fontWeight: 700 }}>{initialData ? "Edit Department" : "Create Department"}</h2>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
          <InputF label="Name" value={form.name} onChange={(v) => setForm({...form, name: v})} required />
          <InputF label="Code" value={form.code} onChange={(v) => setForm({...form, code: v})} required />
        </div>
        <SelectF label="Organization" value={form.organizationId} onChange={(v) => setForm({...form, organizationId: v, parentDepartmentId: ""})} options={organizations.map((o: any) => ({ value: o.id, label: o.name }))} />
        <SelectF label="Parent Department" value={form.parentDepartmentId} onChange={(v) => setForm({...form, parentDepartmentId: v})} options={[{ value: "", label: "None" }, ...orgDepts.map((d: any) => ({ value: d.id, label: d.name }))]} />
        <InputF label="Max Capacity" type="number" value={form.maxCapacity} onChange={(v) => setForm({...form, maxCapacity: Number(v)})} />
        <InputF label="Description" value={form.description} onChange={(v) => setForm({...form, description: v})} />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
          <button type="button" onClick={onCancel} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #e0e3e5", background: "#fff", cursor: "pointer" }}>Cancel</button>
          <button type="submit" style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "linear-gradient(135deg, #4648d4, #8127cf)", color: "#fff", fontWeight: 600, cursor: "pointer" }}>{initialData ? "Update" : "Create"}</button>
        </div>
      </form>
    </div>
  );
}

function InputF({ label, value, onChange, type = "text", required }: any) {
  return (
    <div>
      <label style={{ fontSize: "11px", fontWeight: 700, color: "#191c1e", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "4px" }}>{label}{required && <span style={{ color: "#ba1a1a" }}>*</span>}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required}
        style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #e0e3e5", fontSize: "13px", outline: "none", boxSizing: "border-box", background: "#fafafa" }} />
    </div>
  );
}

function SelectF({ label, value, onChange, options }: any) {
  return (
    <div>
      <label style={{ fontSize: "11px", fontWeight: 700, color: "#191c1e", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "4px" }}>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #e0e3e5", fontSize: "13px", outline: "none", boxSizing: "border-box", background: "#fafafa" }}>
        {options.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}