import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth";
import { PermissionsPage } from "./features/access-control/pages/PermissionsPage";
import { RolesPage } from "./features/access-control/pages/RolesPage";
import { ActivityLogsPage } from "./features/activity-logs/pages/ActivityLogsPage";
import { DashboardsPage } from "./features/dashboards/pages/DashboardsPage";
import { IntegrationsPage } from "./features/integrations/pages/IntegrationsPage";
import { WebhooksPage } from "./features/integrations/pages/WebhooksPage";
import { KnowledgePage } from "./features/knowledge/pages/KnowledgePage";
import { NotificationsPage } from "./features/notifications/pages/NotificationsPage";
import { OrganizationsPage } from "./features/organizations/pages/OrganizationsPage";
import { ProfilesPage } from "./features/profiles/pages/ProfilesPage";
import { ReportsPage } from "./features/reports/pages/ReportsPage";
import { SkillsPage } from "./features/skills/pages/SkillsPage";
import { Layout } from "./layout";
import { MilestonesWorkspacePage } from "./features/work-management/pages/MilestonesWorkspacePage";
import { ProjectsWorkspacePage } from "./features/work-management/pages/ProjectsWorkspacePage";
import { TasksWorkspacePage } from "./features/work-management/pages/TasksWorkspacePage";
import {
  DashboardPage,
  UsersPage,
  DepartmentsPage,
  SettingsPage,
  LoginPage,
  AIPage,
} from "./pages";

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
                <Route path="/projects" element={<ProjectsWorkspacePage />} />
                <Route path="/milestones" element={<MilestonesWorkspacePage />} />
                <Route path="/tasks" element={<TasksWorkspacePage />} />
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
                <Route path="/departments" element={<DepartmentsPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/ai" element={<AIPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
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
