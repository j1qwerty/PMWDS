import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./shared/auth";
import { AppShell } from "./shared/AppShell";
import { DashboardPage } from "./pages/dashboard/dashboard";
import { ProjectsPage } from "./pages/projects/projects";
import { MilestonesPage } from "./pages/milestones/milestones";
import { TasksPage } from "./pages/tasks/tasks";
import { SettingsPage } from "./pages/settings/settings";
import { LoginPage } from "./pages/login/login";
import { UsersPage } from "./pages/users/users";
import { ProfilePage } from "./pages/profile/profile";
import { OrganizationsPage } from "./pages/organizations/organizations";
import { DepartmentsPage } from "./pages/departments/departments";
import { NotificationsPage } from "./pages/notifications/notifications";
import { ActivityPage } from "./pages/activity/activity";
import { AIPage } from "./pages/ai/ai";
import { ReportsPage } from "./pages/reports/reports";
import { RolesPage } from "./pages/roles/roles";
import { SkillsPage } from "./pages/skills/skills";
import { IntegrationsPage } from "./pages/integrations/integrations";
import { KnowledgePage } from "./pages/knowledge/knowledge";
import { DashboardsPage } from "./pages/dashboards/dashboards";
import { WebhooksPage } from "./pages/webhooks/webhooks";
import { PermissionsPage } from "./pages/permissions/permissions";

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { auth } = useAuth();
  return auth ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <PrivateRoute>
            <AppShell>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/projects" element={<ProjectsPage />} />
                <Route path="/kanban" element={<ProjectsPage defaultView="kanban" />} />
                <Route path="/milestones" element={<MilestonesPage />} />
                <Route path="/tasks" element={<TasksPage />} />
                <Route path="/organizations" element={<OrganizationsPage />} />
                <Route path="/departments" element={<DepartmentsPage />} />
                <Route path="/users" element={<UsersPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/activity" element={<ActivityPage />} />
                <Route path="/ai" element={<AIPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/roles" element={<RolesPage />} />
                <Route path="/permissions" element={<PermissionsPage />} />
                <Route path="/skills" element={<SkillsPage />} />
                <Route path="/integrations" element={<IntegrationsPage />} />
                <Route path="/webhooks" element={<WebhooksPage />} />
                <Route path="/knowledge" element={<KnowledgePage />} />
                <Route path="/dashboards" element={<DashboardsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Routes>
            </AppShell>
          </PrivateRoute>
        }
      />
    </Routes>
  );
}
