import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./shared/auth";
import { AppShell } from "./shared/AppShell";
import { DashboardPage } from "./pages/dashboard/dashboard";
import { ProjectsPage } from "./pages/projects/projects";
import { MilestonesPage } from "./pages/milestones/milestones";
import { TasksPage } from "./pages/tasks/tasks";
import { SettingsPage } from "./pages/settings/settings";
import { LoginPage } from "./pages/login/login";

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
                <Route path="/settings" element={<SettingsPage />} />
              </Routes>
            </AppShell>
          </PrivateRoute>
        }
      />
    </Routes>
  );
}
