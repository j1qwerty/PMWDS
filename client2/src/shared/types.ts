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

export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  isRead: boolean;
  createdDate: string;
};

export type ActivityLog = {
  id: string;
  userId: string;
  projectId?: string | null;
  activityType: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
};

export type RoleRecord = {
  id: string;
  name: string;
  description?: string;
  permissionLevel?: number;
  permissions?: Array<{ id: string; code: string; name: string; module?: string }>;
};

export type SkillRecord = {
  id: string;
  name: string;
  category: string;
  description?: string;
  userCount?: number;
  organizationId?: string | null;
};

export type UserProfile = {
  id: string;
  userId: string;
  bio?: string | null;
  jobTitle?: string | null;
  dateOfBirth?: string | null;
  address?: string | null;
  emergencyContact?: string | null;
  linkedInUrl?: string | null;
};

export type AIProvider = {
  provider: string;
  displayName: string;
  isEnabled: boolean;
  isConfigured: boolean;
  defaultModel: string;
  baseUrl?: string;
};

export type BurnoutRisk = {
  userId: string;
  fullName: string;
  burnoutRisk: number;
  workloadScore: number;
  activeTasks: number;
  riskLevel: string;
  recommendations?: string[];
};

export type Integration = {
  id: string;
  integrationType: string;
  name: string;
  isEnabled: boolean;
  status: string;
  lastSync?: string | null;
};

export type Webhook = {
  id: string;
  integrationId?: string | null;
  eventType: string;
  callbackUrl: string;
  isActive: boolean;
};

export type KnowledgeArticle = {
  id: string;
  projectId?: string | null;
  title: string;
  content: string;
  category: string;
  tags?: string[];
  viewCount?: number;
  relevanceScore?: number;
  createdDate?: string;
};

export type LessonLearned = {
  id: string;
  projectId: string;
  title: string;
  description: string;
  category: string;
  impact: string;
  keywords?: string[];
  recordedDate?: string;
};

export type StoredReport = {
  id: string;
  name: string;
  reportType: string;
  generatedDate: string;
  format: string;
  sizeBytes?: number;
};

export type DashboardRecord = {
  id: string;
  userId: string;
  name: string;
  layoutType: string;
  isDefault: boolean;
  lastAccessed?: string;
  widgets?: Array<{ id: string; title: string; widgetType: string; displayOrder: number }>;
};

export type GenericRecord = Record<string, unknown> & { id?: string };
