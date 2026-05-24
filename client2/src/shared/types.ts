export type Role =
  | "SuperAdmin"
  | "Director"
  | "ProjectManager"
  | "DepartmentHead"
  | "TeamMember"
  | "Viewer";

export type AuthResponse = {
  token: string;
  expiry: string;
  userId: string;
  fullName: string;
  email: string;
  profilePictureUrl?: string | null;
  roles: Role[];
};

export type AuthState = AuthResponse;

export type UserDepartmentAssignment = {
  departmentId: string;
  departmentName: string;
  departmentCode: string;
  organizationId?: string | null;
  organizationName?: string | null;
  isPrimary: boolean;
};

export type User = {
  id: string;
  fullName: string;
  email: string;
  profilePictureUrl?: string | null;
  jobTitle?: string | null;
  organizationId?: string | null;
  departmentId?: string | null;
  department?: string | null;
  departments?: UserDepartmentAssignment[];
  roles: string[];
  availabilityStatus?: string;
  availabilityPercentage?: number;
  aiWorkloadScore?: number;
  activeTaskCount?: number;
};

export type Organization = {
  id: string;
  name: string;
  contactEmail?: string;
  director?: { id: string; fullName: string; email: string; profilePictureUrl?: string | null } | null;
  departments?: Array<{ id: string; name: string; code: string }>;
  departmentCount?: number;
};

export type Department = {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  organizationId?: string | null;
  maxCapacity?: number;
  capacityUtilization?: number;
};

export type Project = {
  id: string;
  projectCode: string;
  name: string;
  description?: string | null;
  category?: string;
  status: string;
  priority: string;
  plannedStartDate?: string;
  plannedEndDate?: string;
  plannedBudget?: number;
  actualCost?: number;
  progressPercentage: number;
  aiHealthScore?: number;
  aiDelayRiskScore?: number;
  departmentId: string;
  departmentName?: string | null;
  projectManagerId?: string;
  projectManagerName?: string | null;
  totalTasks?: number;
  completedTasks?: number;
  overdueTasks?: number;
  createdDate?: string;
};

export type Milestone = {
  id: string;
  projectId: string;
  name: string;
  description?: string | null;
  order?: number;
  dueDate?: string;
  status: string;
  isCritical?: boolean;
  progressPercentage: number;
};

export type TaskAssignee = {
  userId: string;
  fullName?: string | null;
};

export type TaskComment = {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  isSystemGenerated?: boolean;
  createdDate: string;
};

export type Task = {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  startDate?: string;
  dueDate?: string;
  completedDate?: string | null;
  estimatedHours?: number;
  actualHours?: number;
  progressPercentage: number;
  projectId: string;
  projectName?: string | null;
  milestoneId?: string | null;
  milestoneName?: string | null;
  parentTaskId?: string | null;
  assignedToUserId?: string | null;
  assignedToUserName?: string | null;
  assignees?: TaskAssignee[];
  isEscalated?: boolean;
  escalationLevel?: number;
  aiDelayProbability?: number;
  isOverdue?: boolean;
  createdDate?: string;
  comments?: TaskComment[];
  subTasks?: Task[];
};

export type WorkspaceData = {
  organizations: Organization[];
  departments: Department[];
  projects: Project[];
  milestones: Milestone[];
  tasks: Task[];
  users: User[];
  source: "api" | "demo";
};

export type Filters = {
  organizationId: string;
  departmentId: string;
  projectId: string;
  milestoneId: string;
  taskId: string;
  status: string;
  search: string;
  sortBy: "name" | "progress" | "dueDate" | "status";
};

export type ColorAssignments = Record<string, string>;
