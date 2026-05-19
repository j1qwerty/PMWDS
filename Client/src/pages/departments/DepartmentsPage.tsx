import { useEffect, useState, useMemo } from "react";
import { api } from "../../api";
import { useAuth } from "../../auth";
import type { Department, OrganizationRecord, User } from "../../types";
import {
    AnimatedBackground,
    GlassCard,
    GradientButton,
    PageHeader,
    LoadingPage,
    ModalOverlay,
    DeleteConfirmationModal,
    DeptFormModal,
    useRoleAccess,
} from "../shared";
import { useUserOrganization } from "../shared/useUserOrganization";
import { DepartmentDetailCard } from "./DepartmentDetailCard";
import { DepartmentList } from "./DepartmentList";
import { getDepartmentColor } from "../shared";


export function DepartmentsPage() {
    const { auth } = useAuth();
    const access = useRoleAccess();
    const canManageDepartments = access.canManageDepartments;
    const canDeleteDepartments = access.isAdmin;

    const [departments, setDepartments] = useState<Department[]>([]);
    const [organizations, setOrganizations] = useState<OrganizationRecord[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [selectedOrgId, setSelectedOrgId] = useState("");
    const [selectedDeptId, setSelectedDeptId] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [dashboard, setDashboard] = useState<Record<string, unknown> | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [deptModal, setDeptModal] = useState<{ open: boolean; editDept?: Department }>({ open: false });
    const [deleteConfirm, setDeleteConfirm] = useState<{
        open: boolean;
        id: string;
        name: string;
    }>({ open: false, id: "", name: "" });

    const { isOrgAdmin, userOrganizationId, shouldFilterByOrg } = useUserOrganization(users, departments);

    const loadData = () => {
        if (!auth) return;
        setLoading(true);
        Promise.all([
            api.getDepartments(auth.token),
            api.getOrganizations(auth.token),
            access.canViewManagementData ? api.getUsers(auth.token) : Promise.resolve([]),
        ]).then(([deptData, orgData, userData]) => {
            setDepartments(deptData);
            setOrganizations(orgData);
            setUsers(userData as User[]);

            // Auto-select first department if none selected and departments exist
            if (!selectedDeptId && deptData.length) {
                setSelectedDeptId(deptData[0].id);
            }
        }).finally(() => setLoading(false));
    };

    useEffect(() => { loadData(); }, [auth]);

    useEffect(() => {
        if (shouldFilterByOrg && userOrganizationId && !selectedOrgId) {
            setSelectedOrgId(userOrganizationId);
        }
    }, [shouldFilterByOrg, userOrganizationId]);

    // Load dashboard for selected department
    useEffect(() => {
        if (!auth || !selectedDeptId || !access.canViewManagementData) return;
        api.getDepartmentDashboard(auth.token, selectedDeptId).then(setDashboard).catch(() => setDashboard(null));
    }, [auth, selectedDeptId, access.canViewManagementData]);

    const filteredDepartments = useMemo(() => {
        let filtered = departments;
        if (shouldFilterByOrg && userOrganizationId) {
            filtered = filtered.filter(d => d.organizationId === userOrganizationId);
        }
        if (selectedOrgId) {
            filtered = filtered.filter(d => d.organizationId === selectedOrgId);
        }
        return filtered;
    }, [departments, selectedOrgId, shouldFilterByOrg, userOrganizationId]);

    const selectedDepartment = departments.find((d) => d.id === selectedDeptId) ?? null;
    const selectedOrganization = organizations.find((o) => o.id === selectedOrgId);

    const departmentHead = selectedDepartment?.departmentHeadUserId
        ? users.find((u) => u.id === selectedDepartment.departmentHeadUserId)
        : undefined;

    const parentDepartment = selectedDepartment?.parentDepartmentId
        ? departments.find((d) => d.id === selectedDepartment.parentDepartmentId)
        : undefined;

    const childCount = departments.filter((d) => d.parentDepartmentId === selectedDeptId).length;

    const handleDelete = async () => {
        if (!auth) return;
        try {
            await api.deleteDepartment(auth.token, deleteConfirm.id);
            setMessage("Department deleted successfully.");
            setDeleteConfirm({ open: false, id: "", name: "" });
            if (selectedDeptId === deleteConfirm.id) setSelectedDeptId("");
            loadData();
        } catch (e) {
            setMessage(`Error: ${e instanceof Error ? e.message : "Deletion failed"}`);
        }
    };

    const handleDeptSubmit = async (form: Record<string, unknown>) => {
        if (!auth) return;
        try {
            const payload = { ...form };
            if (deptModal.editDept) {
                await api.updateDepartment(auth.token, deptModal.editDept.id, payload);
            } else {
                const newDept = await api.createDepartment(auth.token, payload);
                setSelectedDeptId((newDept as any).id || selectedDeptId);
            }
            setDeptModal({ open: false });
            loadData();
            setMessage(deptModal.editDept ? "Department updated." : "Department created.");
        } catch (e) {
            setMessage(`Error: ${e instanceof Error ? e.message : "Save failed"}`);
        }
    };

    if (loading) return <LoadingPage label="Loading departments..." />;

    return (
        <div className="min-h-screen p-2 relative font-sans">
            <AnimatedBackground />

            {/* Page Header */}
            <div className="relative z-10">
                <PageHeader
                    title="Departments"
                    description="Manage departments across all organizations"
                    action={canManageDepartments ? {
                        label: "New Department",
                        onClick: () => setDeptModal({ open: true }),
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

            {/* Organization Tabs - only for admin users */}
            {isOrgAdmin && (
            <div className="relative z-10 mb-5">
                <div className="flex gap-2 overflow-x-auto pb-2 items-center">
                    {/* All Tab */}
                    <button
                        onClick={() => {
                            setSelectedOrgId("");
                            setSearchTerm("");
                        }}
                        className={`
        px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 flex items-center gap-2
        ${selectedOrgId === ""
                                ? "bg-emerald-600 text-white shadow-sm shadow-emerald-500/25"
                                : "bg-white text-slate-600 border border-slate-200 hover:border-emerald-200 hover:text-emerald-600"
                            }
      `}
                    >
                        <span className="material-symbols-outlined text-lg">grid_view</span>
                        All Departments
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${selectedOrgId === ""
                                ? "bg-emerald-500 text-emerald-100"
                                : "bg-slate-100 text-slate-400"
                            }`}>
                            {departments.length}
                        </span>
                    </button>

                    {/* Separator */}
                    <div className="w-px h-8 bg-slate-200 self-center mx-1"></div>

                    {/* Organization Tabs */}
                    {organizations.map((org) => {
                        const deptCount = departments.filter((d) => d.organizationId === org.id).length;
                        return (
                            <button
                                key={org.id}
                                onClick={() => {
                                    setSelectedOrgId(org.id);
                                    setSearchTerm("");
                                }}
                                className={`
            px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 flex items-center gap-2
            ${selectedOrgId === org.id
                                        ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/25"
                                        : "bg-white text-slate-600 border border-slate-200 hover:border-indigo-200 hover:text-indigo-600"
                                    }
          `}
                            >
                                <span className="material-symbols-outlined text-lg">business</span>
                                {org.name}
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${selectedOrgId === org.id
                                        ? "bg-indigo-500 text-indigo-100"
                                        : "bg-slate-100 text-slate-400"
                                    }`}>
                                    {deptCount}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
            )}

            {/* Main Layout */}
            <div className="grid grid-cols-[320px_1fr] gap-6 relative z-10">
                {/* Left Panel: Department List */}
                <DepartmentList
                    departments={filteredDepartments}
                    users={users}
                    selectedDeptId={selectedDeptId}
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    onSelectDept={setSelectedDeptId}
                    organizationName={selectedOrgId ? selectedOrganization?.name : "All Departments"}
                />

                {/* Right Panel: Department Detail */}
                <div className="flex flex-col gap-5">
                    {selectedDepartment ? (
                        <>

                            {/* Admin Actions */}
                            {canManageDepartments && (
                                <GlassCard className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="text-sm font-semibold text-slate-700">Department Actions</h4>
                                            <p className="text-xs text-slate-400">Manage this department</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <GradientButton
                                                variant="ghost"
                                                onClick={() => setDeptModal({ open: true, editDept: selectedDepartment })}
                                            >
                                                <span className="material-symbols-outlined text-base">edit</span>
                                                Edit
                                            </GradientButton>
                                            {canDeleteDepartments && (
                                                <GradientButton
                                                    variant="danger"
                                                    onClick={() => setDeleteConfirm({
                                                        open: true,
                                                        id: selectedDepartment.id,
                                                        name: selectedDepartment.name,
                                                    })}
                                                >
                                                    <span className="material-symbols-outlined text-base">delete</span>
                                                    Delete
                                                </GradientButton>
                                            )}
                                        </div>
                                    </div>
                                </GlassCard>
                            )}


                            <DepartmentDetailCard
                                department={selectedDepartment}
                                organization={selectedOrganization}
                                departmentHead={departmentHead}
                                parentDepartment={parentDepartment}
                                childCount={childCount}
                                teamMembers={users.slice(0, 5)}
                                dashboard={dashboard}
                            />


                        </>
                    ) : (
                        <GlassCard className="p-16 text-center flex flex-col items-center justify-center flex-1 min-h-96">
                            <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center mb-6">
                                <span className="material-symbols-outlined text-4xl text-slate-400">groups</span>
                            </div>
                            <h3 className="text-lg font-semibold text-slate-700 mb-2">Select a Department</h3>
                            <p className="text-sm text-slate-400 max-w-xs">
                                Choose a department from the left panel to view its details and metrics
                            </p>
                        </GlassCard>
                    )}
                </div>
            </div>

            {/* Modals */}
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
                <ModalOverlay onClose={() => setDeleteConfirm({ open: false, id: "", name: "" })}>
                    <DeleteConfirmationModal
                        name={deleteConfirm.name}
                        warning="Deleting this department may affect assigned projects and team members."
                        onConfirm={handleDelete}
                        onCancel={() => setDeleteConfirm({ open: false, id: "", name: "" })}
                    />
                </ModalOverlay>
            )}
        </div>
    );
}
