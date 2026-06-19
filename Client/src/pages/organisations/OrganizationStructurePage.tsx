import { useEffect, useState } from "react";
import { api } from "../../api";
import { useAppData } from "../../appData";
import { useAuth } from "../../auth";
import type { Department, OrganizationRecord, User } from "../../types";
import { AnimatedBackground } from "../shared/AnimatedBackground";
import { OrganizationList } from "./OrganizationList";
import { OrganizationDetail } from "./OrganizationDetail";
import { ModalOverlay } from "../shared/ModalOverlay";
import { DeleteConfirmationModal } from "../shared/DeleteConfirmationModal";
import { OrgFormModal } from "../shared/OrgFormModal";
import { DeptFormModal } from "../shared/DeptFormModal";
import { GlassCard } from "../shared/GlassCard";
import { LoadingPage, PERMISSION_GROUPS, usePermission, useNavHeader, MessageBanner } from "../shared";

export function OrganizationStructurePage() {
  const { auth } = useAuth();
  const { data, loading: appDataLoading, refresh: refreshAppData } = useAppData();
  const perm = usePermission();
  const canCreateOrganization = perm.hasAny(PERMISSION_GROUPS.system.manage, PERMISSION_GROUPS.organization.create);
  const canManageOrganization = perm.hasAny(
    PERMISSION_GROUPS.organization.create,
    PERMISSION_GROUPS.organization.edit,
    PERMISSION_GROUPS.organization.delete,
  );
  const canManageDepartments = perm.has(PERMISSION_GROUPS.department.manage);
  const canCreateDepartments = perm.has(PERMISSION_GROUPS.department.create);

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
    setOrganizations(data.organizations);
    setDepartments(data.departments);
    setUsers(canManageDepartments ? data.users : []);
    if (!selectedOrgId && data.organizations.length) setSelectedOrgId(data.organizations[0].id);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [auth, data, canManageDepartments]);

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
      await refreshAppData();
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
      await refreshAppData();
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
      await refreshAppData();
      setMessage(deptModal.editDept ? "Department updated." : "Department created.");
    } catch (e) {
      setMessage(`Error: ${e instanceof Error ? e.message : "Save failed"}`);
    }
  };

  const { setNavHeader } = useNavHeader();

  useEffect(() => {
    setNavHeader({
      title: "structure",
      description: "Manage organizations and their departments",
      action: canCreateOrganization ? {
        label: "New Organization",
        onClick: () => setOrgModal({ open: true }),
        icon: "add_business",
      } : undefined,
    });
  }, [setNavHeader, canCreateOrganization]);

  if (loading || appDataLoading) return <LoadingPage label="Loading organizations..." />;

  return (
    <div>
      <AnimatedBackground />

      {message && (
        <MessageBanner message={message} onDismiss={() => setMessage("")} />
      )}

      {/* Main Layout */}
      <div className={`${canCreateOrganization ? "grid grid-cols-[320px_1fr]" : "grid grid-cols-1"} gap-6 relative z-10`}>
        {canCreateOrganization && (
          <OrganizationList
            organizations={organizations}
            selectedOrgId={selectedOrgId}
            onSelect={setSelectedOrgId}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
          />
        )}

        <div className="flex flex-col gap-5">
          {selectedOrg ? (
            <OrganizationDetail
              organization={selectedOrg}
              departments={orgDepartments}
              users={users}
              isAdmin={canManageOrganization}
              canDeleteOrg={perm.has(PERMISSION_GROUPS.organization.delete)}
              canManageDepartments={canManageDepartments}
              canCreateDepartments={canCreateDepartments}
              canEditDepartment={() => perm.has(PERMISSION_GROUPS.department.edit)}
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
              <p className="text-sm text-slate-400 ">
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
