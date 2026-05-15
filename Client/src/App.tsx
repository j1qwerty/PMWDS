import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth";
import { RolesPage } from "./features/access-control/pages/RolesPage";
import { ActivityLogsPage } from "./features/activity-logs/pages/ActivityLogsPage";
import { DashboardsPage } from "./features/dashboards/pages/DashboardsPage";
import { IntegrationsPage } from "./features/integrations/pages/IntegrationsPage";
import { WebhooksPage } from "./features/integrations/pages/WebhooksPage";
import { KnowledgePage } from "./features/knowledge/pages/KnowledgePage";
import { OrganizationsPage } from "./features/organizations/pages/OrganizationsPage";
import { ProfilesPage } from "./features/profiles/pages/ProfilesPage";
import { SkillsPage } from "./features/skills/pages/SkillsPage";
import { Layout } from "./layout";
import { MilestonesWorkspacePage } from "./features/work-management/pages/MilestonesWorkspacePage";
import { ProjectsWorkspacePage } from "./features/work-management/pages/ProjectsWorkspacePage";
import { TasksWorkspacePage } from "./features/work-management/pages/TasksWorkspacePage";
import { AIPage } from "./features/ai/pages/AIPage";
import { ReportsPage } from "./features/reports/pages/ReportsPage";
import { SettingsPage } from "./features/system/pages/SettingsPage";
import { DashboardPage } from "./pages/dashboard/dashboard";
import { ProjectsPage } from "./pages/projects/projects";
import { TasksPage } from "./pages/tasks/tasks";
import { UsersPage } from "./pages/users/users";
import { Departments } from "./pages/departments/departments";
import { NotificationsPage } from "./pages/notifications/notifications";
import { AIPage as CoreAIPage } from "./pages/ai/ai";
import { ReportsPage as CoreReportsPage } from "./pages/reports/reports";
import { LoginPage } from "./pages/login/login";
import { OrganizationStructurePage } from "./pages/oraganisations/OrganizationStructurePage";
import { PermissionsPage } from "./features/access-control/pages/PermissionsPage";
import { DepartmentsPage } from "./pages/departments/DepartmentsPage";
import { MilestonesPage } from "./pages/milestones/MilestonesPage";

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
                <Route path="/" element={<DashboardPage />} />
                <Route path="/projects" element={<ProjectsPage />} />
                <Route path="/departmentsPage" element={<DepartmentsPage />} />
                <Route path="/milestonesPage" element={<MilestonesPage />} />

                <Route path="/milestones" element={<MilestonesWorkspacePage />} />
                <Route path="/tasks" element={<TasksPage />} />
                <Route path="/roles" element={<RolesPage />} />
                <Route path="/permissions" element={<PermissionsPage />} />
                <Route path="/profiles" element={<ProfilesPage />} />
                <Route path="/organizations" element={<OrganizationsPage />} />
                <Route path="/dashboards" element={<DashboardsPage />} />
                <Route path="/integrations" element={<IntegrationsPage />} />
                <Route path="/webhooks" element={<WebhooksPage />} />
                <Route path="/skills" element={<SkillsPage />} />
                <Route path="/knowledge" element={<KnowledgePage />} />
                <Route path="/activity-logs" element={<ActivityLogsPage />} />
                <Route path="/users" element={<UsersPage />} />
                <Route path="/departments" element={<Departments />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/ai" element={<CoreAIPage />} />
                <Route path="/reports" element={<CoreReportsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/organizationStructure" element={<OrganizationStructurePage />} />
                <Route path="/old/projects" element={<ProjectsWorkspacePage />} />
                <Route path="/old/tasks" element={<TasksWorkspacePage />} />
                <Route path="/old/ai" element={<AIPage />} />
                <Route path="/old/reports" element={<ReportsPage />} />
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
