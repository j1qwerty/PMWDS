import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth";
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
  NotificationsPage,
  AIPage,
  ReportsPage,
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
