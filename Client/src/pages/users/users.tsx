import { useEffect, useState } from "react";
import { api } from "../../api";
import { useAuth } from "../../auth";
import type { Department, User, WorkloadReport } from "../../types";
import {
  Notice,
  Panel,
  UserTable,
  WorkloadBars,
} from "../../ui";
import { availabilityStatuses } from "../constants";

export function UsersPage() {
  const { auth, hasRole } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [workload, setWorkload] = useState<WorkloadReport | null>(null);
  const [message, setMessage] = useState("");
  const [registerForm, setRegisterForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "Pmwds@123",
    jobTitle: "TeamMember",
    departmentId: "",
    role: "TeamMember",
  });
  const [skillForm, setSkillForm] = useState({ userId: "", skillId: "", proficiencyLevel: 3, experienceMonths: 12 });

  async function loadUsers() {
    if (!auth) return;
    const [userData, departmentData, workloadData] = await Promise.all([
      api.getUsers(auth.token),
      api.getDepartments(auth.token),
      api.getWorkload(auth.token),
    ]);
    setUsers(userData);
    setDepartments(departmentData);
    setWorkload(workloadData);
    if (!skillForm.userId && userData[0]) setSkillForm((current) => ({ ...current, userId: userData[0].id }));
  }

  useEffect(() => {
    void loadUsers().catch((cause) => setMessage(cause instanceof Error ? cause.message : "Failed to load users."));
  }, [auth]);

  return (
    <div className="grid  gap-4 content-start">
      <Panel title="People Operations" subtitle="Capacity, activation state, workload shape, and profile controls">
        <UserTable users={users} />
      </Panel>

      <Panel title="Workload View" subtitle="Availability and burnout exposure">
        <WorkloadBars items={workload?.members ?? []} />
      </Panel>

      {hasRole("SuperAdmin") ? (
        <Panel title="Register User" subtitle="Bootstrap new team members with role hints">
          <form
            className="grid grid-cols-1 gap-4 md:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (!auth) return;
              void api.registerUser(auth.token, registerForm).then(() => loadUsers());
            }}
          >
            <label><span>First Name</span><input value={registerForm.firstName} onChange={(event) => setRegisterForm({ ...registerForm, firstName: event.target.value })} /></label>
            <label><span>Last Name</span><input value={registerForm.lastName} onChange={(event) => setRegisterForm({ ...registerForm, lastName: event.target.value })} /></label>
            <label><span>Email</span><input value={registerForm.email} onChange={(event) => setRegisterForm({ ...registerForm, email: event.target.value })} /></label>
            <label><span>Password</span><input value={registerForm.password} onChange={(event) => setRegisterForm({ ...registerForm, password: event.target.value })} /></label>
            <label><span>Job Title</span><input value={registerForm.jobTitle} onChange={(event) => setRegisterForm({ ...registerForm, jobTitle: event.target.value })} /></label>
            <label>
              <span>Role</span>
              <select value={registerForm.role} onChange={(event) => setRegisterForm({ ...registerForm, role: event.target.value })}>
                <option>SuperAdmin</option><option>ProjectManager</option><option>DepartmentHead</option><option>TeamLead</option><option>TeamMember</option><option>Viewer</option>
              </select>
            </label>
            <label>
              <span>Department</span>
              <select value={registerForm.departmentId} onChange={(event) => setRegisterForm({ ...registerForm, departmentId: event.target.value })}>
                <option value="">None</option>
                {departments.map((department) => (<option key={department.id} value={department.id}>{department.name}</option>))}
              </select>
            </label>
            <button className="rounded-md border border-sky-300/60 bg-sky-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-50" type="submit">Register</button>
          </form>
        </Panel>
      ) : null}

      <Panel title="skills" subtitle="Update readiness, add skills, or deactivate users">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label>
            <span>User</span>
            <select value={skillForm.userId} onChange={(event) => setSkillForm({ ...skillForm, userId: event.target.value })}>
              {users.map((user) => (<option key={user.id} value={user.id}>{user.fullName}</option>))}
            </select>
          </label>
          <label>
            <span>Availability</span>
            <select
              onChange={(event) => {
                const user = users.find((item) => item.id === skillForm.userId);
                if (!auth || !user) return;
                void api.updateAvailability(auth.token, user.id, event.target.value, user.availabilityPercentage).then(() => loadUsers());
              }}
            >
              <option value="">Change status...</option>
              {availabilityStatuses.map((status) => (<option key={status}>{status}</option>))}
            </select>
          </label>
          <label><span>Skill Id</span><input value={skillForm.skillId} onChange={(event) => setSkillForm({ ...skillForm, skillId: event.target.value })} /></label>
          <label><span>Proficiency</span><input type="number" min={1} max={5} value={skillForm.proficiencyLevel} onChange={(event) => setSkillForm({ ...skillForm, proficiencyLevel: Number(event.target.value) })} /></label>
          <label><span>Experience Months</span><input type="number" value={skillForm.experienceMonths} onChange={(event) => setSkillForm({ ...skillForm, experienceMonths: Number(event.target.value) })} /></label>
          <div className="mt-4 flex w-full flex-wrap gap-2">
            <button
              className="rounded-md border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              onClick={async () => {
                if (!auth || !skillForm.userId || !skillForm.skillId) return;
                await api.addUserSkill(auth.token, skillForm.userId, skillForm.skillId, skillForm.proficiencyLevel, skillForm.experienceMonths);
                setMessage("Skill attached to user.");
              }}
            >
              Add Skill
            </button>
            {hasRole("SuperAdmin") ? (
              <button
                className="rounded-md border border-rose-300/40 bg-rose-400/10 px-4 py-2 text-sm font-medium text-rose-200 transition hover:bg-rose-400/20"
                onClick={async () => {
                  if (!auth || !skillForm.userId) return;
                  await api.deactivateUser(auth.token, skillForm.userId);
                  await loadUsers();
                }}
              >
                Deactivate
              </button>
            ) : null}
          </div>
        </div>
      </Panel>

      {message ? <Notice>{message}</Notice> : null}
    </div>
  );
}