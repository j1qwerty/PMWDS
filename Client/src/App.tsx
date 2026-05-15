import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth";
import { Layout } from "./layout";

// Overview
import { DashboardPage } from "./pages/dashboard/dashboard";
import { ProjectsPage } from "./pages/projects/projects";
import { MilestonesPage } from "./pages/milestones/MilestonesPage";
import { TasksPage } from "./pages/tasks/tasks";
import { NotificationsPage } from "./pages/notifications/notifications";

// Team
import { OrganizationStructurePage } from "./pages/oraganisations/OrganizationStructurePage";
import { DepartmentsPage } from "./pages/departments/DepartmentsPage";
import { UsersPage } from "./pages/users/users";
import { ProfilesPage } from "./pages/profiles/ProfilesPage";
import { SkillsPage } from "./pages/skills/SkillsPage";

// Tools
import { AIPage as CoreAIPage } from "./pages/ai/ai";
import { ReportsPage as CoreReportsPage } from "./pages/reports/reports";

// System
import { RolesPage } from "./pages/roles/RolesPage";
import { ActivityLogsPage } from ".//pages/activity/ActivityLogsPage";
import { SettingsPage } from "./pages/settings/settings";

// Old UI
import { LoginPage } from "./pages/login/login";
import { MilestonesWorkspacePage } from "./features/work-management/pages/MilestonesWorkspacePage";
import { ProjectsWorkspacePage } from "./features/work-management/pages/ProjectsWorkspacePage";
import { TasksWorkspacePage } from "./features/work-management/pages/TasksWorkspacePage";
import { AIPage } from "./features/ai/pages/AIPage";
import { ReportsPage } from "./features/reports/pages/ReportsPage";
import { DashboardsPage } from "./features/dashboards/pages/DashboardsPage";
import { IntegrationsPage } from "./features/integrations/pages/IntegrationsPage";
import { WebhooksPage } from "./features/integrations/pages/WebhooksPage";
import { KnowledgePage } from "./features/knowledge/pages/KnowledgePage";
import { OrganizationsPage } from "./features/organizations/pages/OrganizationsPage";
import { Departments } from "./pages/departments/departments";
import { PermissionsPage } from "./features/access-control/pages/PermissionsPage";

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { auth } = useAuth();
  return auth ? <>{children}</> : <Navigate to="/login" />;
}

function AppRoutes() {
  const { auth } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={auth ? <Navigate to="/" /> : <LoginPage />} />
      <Route
        path="/*"
        element={
          <PrivateRoute>
            <Layout>
              <Routes>
                {/* Overview */}
                <Route path="/" element={<DashboardPage />} />
                <Route path="/projects" element={<ProjectsPage />} />
                <Route path="/milestonesPage" element={<MilestonesPage />} />
                <Route path="/tasks" element={<TasksPage />} />
                <Route path="/notificationsPage" element={<NotificationsPage />} />

                {/* Team */}
                <Route path="/organizationStructure" element={<OrganizationStructurePage />} />
                <Route path="/departmentsPage" element={<DepartmentsPage />} />
                <Route path="/users" element={<UsersPage />} />
                <Route path="/profiles" element={<ProfilesPage />} />
                <Route path="/skills" element={<SkillsPage />} />

                {/* Tools */}
                <Route path="/ai" element={<CoreAIPage />} />
                <Route path="/reports" element={<CoreReportsPage />} />

                {/* System */}
                <Route path="/roles" element={<RolesPage />} />
                <Route path="/activity-logs" element={<ActivityLogsPage />} />
                <Route path="/settings" element={<SettingsPage />} />

                {/* Old UI */}
                <Route path="/milestones" element={<MilestonesWorkspacePage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/organizations" element={<OrganizationsPage />} />
                <Route path="/departments" element={<Departments />} />
                <Route path="/old/projects" element={<ProjectsWorkspacePage />} />
                <Route path="/old/tasks" element={<TasksWorkspacePage />} />
                <Route path="/old/ai" element={<AIPage />} />
                <Route path="/old/reports" element={<ReportsPage />} />
                <Route path="/dashboards" element={<DashboardsPage />} />
                <Route path="/integrations" element={<IntegrationsPage />} />
                <Route path="/webhooks" element={<WebhooksPage />} />
                <Route path="/knowledge" element={<KnowledgePage />} />
                <Route path="/permissions" element={<PermissionsPage />} />
              </Routes>
            </Layout>
          </PrivateRoute>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
