import { useEffect, useState } from "react";
import { api } from "../../api";
import { useAuth } from "../../auth";
import type { Department, OrganizationRecord, User } from "../../types";
import { AnimatedBackground } from "../shared/AnimatedBackground";
import { GradientButton } from "../shared/GradientButton";
import { OrganizationList } from "./OrganizationList";
import { OrganizationDetail } from "./OrganizationDetail";
import { ModalOverlay } from "../shared/ModalOverlay";
import { DeleteConfirmationModal } from "../shared/DeleteConfirmationModal";
import { OrgFormModal } from "../shared/OrgFormModal";
import { DeptFormModal } from "../shared/DeptFormModal";
import { GlassCard } from "../shared/GlassCard";
import { LoadingPage } from "../shared";

export function OrganizationStructurePage() {
  const { auth, hasRole } = useAuth();
  const isAdmin = hasRole("SuperAdmin");

  const [organizations, setOrganizations] = useState<OrganizationRecord[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  const [orgModal, setOrgModal] = useState<{ open: boolean; editOrg?: OrganizationRecord }>({ open: false });
  const [deptModal, setDeptModal] = useState<{ open: boolean; editDept?: Department }>({ open: false });
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    type: "org" | "dept";
    id: string;
    name: string;
    warning?: string;
  }>({ open: false, type: "org", id: "", name: "" });

  const loadData = () => {
    if (!auth) return;
    setLoading(true);
    Promise.all([
      api.getOrganizations(auth.token),
      api.getDepartments(auth.token),
      isAdmin ? api.getUsers(auth.token) : Promise.resolve([]),
    ]).then(([orgData, deptData, userData]) => {
      setOrganizations(orgData);
      setDepartments(deptData);
      setUsers(userData as User[]);
      if (!selectedOrgId && orgData.length) setSelectedOrgId(orgData[0].id);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, [auth]);

  const selectedOrg = organizations.find((o) => o.id === selectedOrgId) ?? null;
  const orgDepartments = departments.filter((d) => d.organizationId === selectedOrgId);

  const checkBeforeDelete = (type: "org" | "dept", id: string, name: string) => {
    let warning = "";
    if (type === "org") {
      const linked = departments.filter((d) => d.organizationId === id);
      if (linked.length) {
        warning = `This organization has ${linked.length} department(s). Deleting it will remove all associated departments and their data permanently.`;
      }
    } else {
      warning = "Deleting this department may affect assigned projects and team members.";
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
      const payload = { ...form, organizationId: form.organizationId || selectedOrgId };
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

  if (loading) return <LoadingPage label="Loading organizations..." />;

  return (
    <div className="min-h-screen p-7 relative font-sans">
      <AnimatedBackground />

     {/* Header */}
<div className="relative z-10 mb-7">
  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
    <div>
      <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
        {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
      </span>
      <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
        Organization Structure
      </h1>
      <p className="text-sm text-slate-500 mt-1">
        Manage organizations and their departments
      </p>
    </div>
    
    {isAdmin && (
      <div className="flex items-center gap-3">
        
        <GradientButton onClick={() => setOrgModal({ open: true })}>
          <span className="material-symbols-outlined text-lg">add_business</span>
          New Organization
        </GradientButton>
      </div>
    )}
  </div>
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

      {/* Main Layout */}
      <div className="grid grid-cols-[320px_1fr] gap-6 relative z-10">
        <OrganizationList
          organizations={organizations}
          selectedOrgId={selectedOrgId}
          onSelect={setSelectedOrgId}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
        />

        <div className="flex flex-col gap-5">
          {selectedOrg ? (
            <OrganizationDetail
              organization={selectedOrg}
              departments={orgDepartments}
              users={users}
              isAdmin={isAdmin}
              onEditOrg={() => setOrgModal({ open: true, editOrg: selectedOrg })}
              onDeleteOrg={() => checkBeforeDelete("org", selectedOrg.id, selectedOrg.name)}
              onAddDept={() => setDeptModal({ open: true })}
              onEditDept={(dept) => setDeptModal({ open: true, editDept: { ...dept, organizationId: selectedOrg.id } })}
              onDeleteDept={(dept) => checkBeforeDelete("dept", dept.id, dept.name)}
            />
          ) : (
            <GlassCard className="p-16 text-center flex flex-col items-center justify-center flex-1 min-h-96">
              <div className="w-20 h-20 rounded-2xl bg-indigo-50 flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-4xl text-indigo-400">corporate_fare</span>
              </div>
              <h3 className="text-lg font-semibold text-slate-700 mb-2">Select an Organization</h3>
              <p className="text-sm text-slate-400 max-w-xs">
                Choose an organization from the left panel to view its details and manage departments
              </p>
            </GlassCard>
          )}
        </div>
      </div>

      {/* Modals */}
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
            users={users}
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
