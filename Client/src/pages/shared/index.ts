export { AnimatedBackground } from "./AnimatedBackground";
export { Avatar, AvatarStack, getAvatarUrl } from "./Avatar";
export { GlassCard } from "./GlassCard";
export { GradientButton } from "./GradientButton";
export { InfoTile } from "./InfoTile";
export { ModalOverlay } from "./ModalOverlay";
export { DeleteConfirmationModal } from "./DeleteConfirmationModal";
export { BgControls, BgRenderer, type BgConfig, type BgPreset, DEFAULT_CONFIG } from "./bg/index";
export { InputF } from "./InputF";
export { SelectF } from "./SelectF";
export { OrgFormModal } from "./OrgFormModal";
export { DeptFormModal } from "./DeptFormModal";
export { NavHeaderProvider, useNavHeader } from "./NavHeaderContext";
export { NavHeader, NavActionButton } from "./nav-header";
export { RoleGate, Permission, PERMISSION_GROUPS, usePermission } from "./RoleGate";
export { getProjectDepartmentIds, projectBelongsToDepartment, projectBelongsToAnyDepartment, getProjectDepartments } from "./projectDepartments";
export { LoadingPage, PageSkeleton, Skeleton } from "./Skeleton";
export { NotificationList } from "./NotificationList";
export { MilestonesTab } from "./MilestonesTab";
export { WorkloadBars } from "./WorkloadBars";
export { TaskList } from "./TaskList";
export { SimpleProjectList } from "./SimpleProjectList";
export { useToast } from "./Toast";
export { StatusButtons, StatusBadge } from "./StatusBadge";
export { PriorityButtons, PriorityBadge } from "./PriorityBadge";
export { FilterButtons } from "./FilterButtons";
export { OrganizationDepartmentFilter } from "./OrganizationDepartmentFilter";
export { ScopedUserSelect } from "./ScopedUserSelect";
export { Can, CanAny, CanAll, RoutePermissionGuard } from "./PermissionControls";
export { NoAccessPage } from "./NoAccessPage";
export { resolveFlag, useResolvedFlag } from "./permissionProps";
export { OverallProgressRing } from "./OverallProgressRing";
export {
  departmentColorPalette,
  statusColorPalette,
  priorityColorPalette,
  getDepartmentColor,
  getStatusColor,
  getPriorityColor
} from "./colors";
