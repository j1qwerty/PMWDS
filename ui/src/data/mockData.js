export const mockAuth = {
  isLoggedIn: false,
  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.demo.token_2025',
  user: {
    fullName: 'Dr. Sarah Johnson',
    ini: 'SJ',
    role: 'Department Head',
    deptId: 'dept-se-001',
    email: 'sarah.johnson@university.edu'
  }
}

export const mockNav = [
  { id: 'dashboard', icon: '📊', label: 'Dashboard' },
  { id: 'projects', icon: '📁', label: 'Projects', badge: 3 },
  { id: 'tasks', icon: '✅', label: 'Tasks', badge: 7 },
  { id: 'team', icon: '👥', label: 'Team Members' },
  { id: 'departments', icon: '🏛️', label: 'Departments' },
  { id: 'notifications', icon: '🔔', label: 'Notifications', badge: 5 },
  { id: 'reports', icon: '📈', label: 'Reports' }
]

export const mockAiNav = [
  { id: 'ai', icon: '🤖', label: 'AI Assistant' }
]

export const mockKpis = [
  { label: 'Total Projects', val: 24, icon: '📁', col: 'bl', up: true, trend: 12, sub: '3 new this month', nav: 'projects' },
  { label: 'Active Projects', val: 18, icon: '🚀', col: 'gr', up: true, trend: 8, sub: '2 ahead of schedule', nav: 'projects' },
  { label: 'Tasks This Sprint', val: 142, icon: '✅', col: 'bl', up: true, trend: 5, sub: '89 completed', nav: 'tasks' },
  { label: 'Overdue Tasks', val: 7, icon: '⚠️', col: 'rd', up: false, trend: 3, sub: 'Requires attention', nav: 'tasks' },
  { label: 'Team Members', val: 38, icon: '👥', col: 'pu', up: true, trend: 2, sub: '4 on leave', nav: 'team' },
  { label: 'Budget Used', val: '67%', icon: '💰', col: 'gd', up: false, trend: 4, sub: '$892K of $1.3M', nav: 'reports' }
]

export const mockHealthBars = [
  { lbl: 'Schedule Adherence', v: 82 },
  { lbl: 'Budget Compliance', v: 67 },
  { lbl: 'Team Velocity', v: 74 },
  { lbl: 'Quality Index', v: 91 },
  { lbl: 'Risk Management', v: 58 }
]

export const mockAtRisk = [
  { id: 1, code: 'PROJ-003', name: 'Cloud Migration Initiative', prog: 31, risk: 87 },
  { id: 2, code: 'PROJ-007', name: 'Mobile App Development', prog: 45, risk: 73 },
  { id: 3, code: 'PROJ-011', name: 'Data Analytics Platform', prog: 22, risk: 68 }
]

export const mockWorkload = [
  { name: 'Ahmad Hassan', role: 'Dev Lead', load: 94, tasks: 12, burnout: 78 },
  { name: 'Sarah Lee', role: 'ML Engineer', load: 72, tasks: 8, burnout: 45 },
  { name: 'John Williams', role: 'Designer', load: 55, tasks: 6, burnout: 30 },
  { name: 'Fatima Al-Zahra', role: 'DevOps', load: 88, tasks: 10, burnout: 62 },
  { name: 'Carlos Marin', role: 'Analyst', load: 41, tasks: 5, burnout: 22 }
]

export const mockProjects = [
  { id: 1, code: 'PROJ-001', name: 'PMWDS Portal Development', dept: 'SE', manager: 'Dr. Sarah Johnson', status: 'Active', prog: 67, health: 82, risk: 28, due: '2025-08-31', budget: 250, actual: 168 },
  { id: 2, code: 'PROJ-002', name: 'AI Research Initiative', dept: 'AI', manager: 'Prof. Ahmed Ali', status: 'Active', prog: 45, health: 71, risk: 42, due: '2025-06-15', budget: 180, actual: 82 },
  { id: 3, code: 'PROJ-003', name: 'Cloud Migration', dept: 'CS', manager: 'Dr. James Liu', status: 'Delayed', prog: 31, health: 44, risk: 87, due: '2025-03-31', budget: 320, actual: 290 },
  { id: 4, code: 'PROJ-004', name: 'Mobile App v2.0', dept: 'SE', manager: 'Dr. Sarah Johnson', status: 'OnHold', prog: 55, health: 61, risk: 55, due: '2025-09-30', budget: 140, actual: 78 },
  { id: 5, code: 'PROJ-005', name: 'Data Analytics Platform', dept: 'AI', manager: 'Prof. Ahmed Ali', status: 'Active', prog: 22, health: 38, risk: 68, due: '2025-04-30', budget: 210, actual: 47 }
]

export const mockKanbanCols = [
  { status: 'Todo', icon: '📋', label: 'To Do' },
  { status: 'InProgress', icon: '🔄', label: 'In Progress' },
  { status: 'InReview', icon: '👁️', label: 'In Review' },
  { status: 'Done', icon: '✅', label: 'Done' }
]

export const mockTasks = [
  { id: 1, title: 'Design System Architecture', status: 'Done', pri: 'High', assignee: 'Ahmad Hassan', prog: 100, due: '2025-02-15', aiRisk: 12, escalated: false, ganttLeft: 0, ganttWidth: 20 },
  { id: 2, title: 'Setup CI/CD Pipeline', status: 'Done', pri: 'Medium', assignee: 'Fatima Al-Zahra', prog: 100, due: '2025-02-20', aiRisk: 18, escalated: false, ganttLeft: 5, ganttWidth: 18 },
  { id: 3, title: 'Develop Auth Module', status: 'InProgress', pri: 'Critical', assignee: 'Ahmad Hassan', prog: 72, due: '2025-03-10', aiRisk: 65, escalated: false, ganttLeft: 15, ganttWidth: 25 },
  { id: 4, title: 'AI Delay Prediction Engine', status: 'InProgress', pri: 'High', assignee: 'Sarah Lee', prog: 48, due: '2025-03-20', aiRisk: 72, escalated: true, ganttLeft: 20, ganttWidth: 30 },
  { id: 5, title: 'Dashboard UI Components', status: 'InProgress', pri: 'Medium', assignee: 'John Williams', prog: 55, due: '2025-03-25', aiRisk: 38, escalated: false, ganttLeft: 22, ganttWidth: 28 },
  { id: 6, title: 'Reports & PDF Export', status: 'InReview', pri: 'High', assignee: 'Carlos Marin', prog: 90, due: '2025-03-15', aiRisk: 22, escalated: false, ganttLeft: 18, ganttWidth: 20 },
  { id: 7, title: 'SignalR Real-time Notifications', status: 'InReview', pri: 'Medium', assignee: 'Fatima Al-Zahra', prog: 88, due: '2025-03-18', aiRisk: 30, escalated: false, ganttLeft: 25, ganttWidth: 18 },
  { id: 8, title: 'Mobile App API Integration', status: 'Todo', pri: 'Low', assignee: null, prog: 0, due: '2025-04-10', aiRisk: 55, escalated: false, ganttLeft: 40, ganttWidth: 25 },
  { id: 9, title: 'Burnout Risk ML Model', status: 'Todo', pri: 'High', assignee: null, prog: 0, due: '2025-04-20', aiRisk: 80, escalated: true, ganttLeft: 42, ganttWidth: 22 },
  { id: 10, title: 'User Acceptance Testing', status: 'Todo', pri: 'Critical', assignee: null, prog: 0, due: '2025-05-01', aiRisk: 45, escalated: false, ganttLeft: 55, ganttWidth: 20 }
]

export const mockTeamMembers = [
  { id: 'u1', name: 'Ahmad Hassan', role: 'Dev Lead', status: 'Busy', tasks: 12, done: 28, perf: 88, load: 94, burnout: 78, skills: ['C#', 'ASP.NET', 'SQL', 'Azure'] },
  { id: 'u2', name: 'Sarah Lee', role: 'ML Engineer', status: 'Available', tasks: 8, done: 21, perf: 91, load: 72, burnout: 45, skills: ['Python', 'ML.NET', 'TensorFlow'] },
  { id: 'u3', name: 'John Williams', role: 'UI Designer', status: 'Available', tasks: 6, done: 18, perf: 76, load: 55, burnout: 30, skills: ['Vue.js', 'CSS', 'Figma', 'UX'] },
  { id: 'u4', name: 'Fatima Al-Zahra', role: 'DevOps Eng.', status: 'Busy', tasks: 10, done: 32, perf: 85, load: 88, burnout: 62, skills: ['Docker', 'Kubernetes', 'CI/CD'] },
  { id: 'u5', name: 'Carlos Marin', role: 'Data Analyst', status: 'Available', tasks: 5, done: 15, perf: 79, load: 41, burnout: 22, skills: ['Power BI', 'SQL', 'Python', 'Tableau'] },
  { id: 'u6', name: 'Layla Nasser', role: 'QA Engineer', status: 'OnLeave', tasks: 3, done: 12, perf: 83, load: 25, burnout: 18, skills: ['Selenium', 'Postman', 'JIRA'] }
]

export const mockNotifications = [
  { id: 1, icon: '🚨', bg: '#fde8ea', title: 'Task Escalated — AI Delay Risk', msg: 'TSK-4: AI Delay Prediction Engine — 72% delay probability detected by ML model', time: '2 min ago', type: 'Escalation', ai: true, read: false },
  { id: 2, icon: '⚠️', bg: '#fff3cd', title: 'Deadline Alert — PROJ-003', msg: 'Cloud Migration is 69 days overdue. Immediate intervention required.', time: '15 min ago', type: 'Deadline', ai: false, read: false },
  { id: 3, icon: '🤖', bg: '#e8d5ff', title: 'AI Insight — Burnout Risk Detected', msg: 'Ahmad Hassan shows 78% burnout risk. Recommend redistributing 2 tasks.', time: '1 hr ago', type: 'AI Insight', ai: true, read: false },
  { id: 4, icon: '✅', bg: '#d4edda', title: 'Task Completed', msg: 'TSK-2: Setup CI/CD Pipeline marked complete by Fatima Al-Zahra', time: '2 hrs ago', type: 'Task', ai: false, read: false },
  { id: 5, icon: '📁', bg: '#d1ecf1', title: 'New Project Assigned', msg: 'You have been assigned as Project Manager for PROJ-005: Data Analytics Platform', time: '3 hrs ago', type: 'Project', ai: false, read: false },
  { id: 6, icon: '💰', bg: '#fff3cd', title: 'Budget Warning — PROJ-003', msg: 'Cloud Migration has consumed 90.6% of planned budget ($290K of $320K)', time: '5 hrs ago', type: 'Budget', ai: true, read: true },
  { id: 7, icon: '🤖', bg: '#e8d5ff', title: 'AI Model Retrained', msg: 'Delay Prediction model retrained with 847 new data points. Accuracy: 87.3%', time: '8 hrs ago', type: 'AI Insight', ai: true, read: true },
  { id: 8, icon: '👥', bg: '#d1ecf1', title: 'New Team Member Added', msg: 'Layla Nasser (QA Engineer) has been added to the Software Engineering team', time: '1 day ago', type: 'Team', ai: false, read: true }
]

export const mockDepartments = [
  { id: 'd1', icon: '💻', name: 'Software Engineering', code: 'SE', health: 79, projects: 8, members: 14, budget: 750, budgetUsed: 68 },
  { id: 'd2', icon: '🤖', name: 'Artificial Intelligence', code: 'AI', health: 65, projects: 6, members: 9, budget: 520, budgetUsed: 82 },
  { id: 'd3', icon: '🔬', name: 'Computer Science', code: 'CS', health: 44, projects: 5, members: 11, budget: 480, budgetUsed: 91 },
  { id: 'd4', icon: '📊', name: 'Data Science', code: 'DS', health: 88, projects: 3, members: 7, budget: 310, budgetUsed: 54 },
  { id: 'd5', icon: '🔒', name: 'Cybersecurity', code: 'CY', health: 92, projects: 2, members: 5, budget: 220, budgetUsed: 42 }
]

export const mockReportTypes = [
  { id: 'project-status', icon: '📋', label: 'Project Status Report' },
  { id: 'task-completion', icon: '✅', label: 'Task Completion Report' },
  { id: 'department-workload', icon: '👥', label: 'Department Workload Report' },
  { id: 'budget-variance', icon: '💰', label: 'Budget Variance Report' },
  { id: 'delay-analysis', icon: '⏱️', label: 'Delay Analysis Report' },
  { id: 'ai-insights', icon: '🤖', label: 'AI Insights Report' }
]

export const mockAiMetrics = [
  { label: 'Task Allocation', val: 87 },
  { label: 'Delay Prediction', val: 83 },
  { label: 'Health Analysis', val: 91 },
  { label: 'Burnout Detection', val: 79 }
]

export const mockAiInsights = [
  { id: 1, icon: '🚨', title: 'Critical Workload Imbalance', msg: 'Ahmad Hassan is at 94% capacity. Recommend immediate reallocation of 2-3 tasks to available team members.', sev: 'High', time: 'Just now' },
  { id: 2, icon: '💰', title: 'PROJ-003 Budget Overrun Predicted', msg: 'Cloud Migration is projected to exceed budget by $45K (14%) based on current spending velocity.', sev: 'High', time: '5 min ago' },
  { id: 3, icon: '📈', title: 'Sprint Velocity Improving', msg: 'Team completed 89 of 142 tasks (63%) with 8 days remaining. Predicted sprint success rate: 78%.', sev: 'Medium', time: '1 hr ago' },
  { id: 4, icon: '✅', title: 'PROJ-001 On Track for Delivery', msg: 'PMWDS Portal is 67% complete with 82% health score. No intervention needed. Keep current pace.', sev: 'Low', time: '2 hrs ago' },
  { id: 5, icon: '⚠️', title: 'Delay Risk Spike Detected — TSK-9', msg: 'Burnout Risk ML Model task has 80% delay probability due to no assignee and approaching deadline (Apr 20).', sev: 'High', time: '3 hrs ago' }
]

export const mockAiPredictions = [
  { id: 1, task: 'AI Delay Prediction Engine', proj: 'PROJ-002', assignee: 'Sarah Lee', due: '2025-03-20', prob: 72, delayDays: 8, risk: 'High', mitigations: ['Reassign 1 subtask', 'Extend deadline by 1 week'] },
  { id: 2, task: 'Burnout Risk ML Model', proj: 'PROJ-002', assignee: 'Unassigned', due: '2025-04-20', prob: 80, delayDays: 14, risk: 'Critical', mitigations: ['Assign immediately', 'Split into 2 sub-tasks'] },
  { id: 3, task: 'Develop Auth Module', proj: 'PROJ-001', assignee: 'Ahmad Hassan', due: '2025-03-10', prob: 65, delayDays: 5, risk: 'High', mitigations: ['Reduce other tasks', 'Add pair programmer'] },
  { id: 4, task: 'Dashboard UI Components', proj: 'PROJ-001', assignee: 'John Williams', due: '2025-03-25', prob: 38, delayDays: 0, risk: 'Medium', mitigations: ['Monitor weekly', 'Review milestone progress'] },
  { id: 5, task: 'Reports & PDF Export', proj: 'PROJ-001', assignee: 'Carlos Marin', due: '2025-03-15', prob: 22, delayDays: 0, risk: 'Low', mitigations: ['On track — no action needed'] }
]

export const mockChatMsgs = [
  { role: 'ai', text: "Hello Dr. Johnson! I'm your PMWDS AI Assistant powered by GPT4o. I can help you analyse project health, predict task delays, recommend assignments, and generate insights. What would you like to know?", time: '09:00 AM' },
  { role: 'u', text: 'Which tasks are at highest risk of delay this week?', time: '09:01 AM' },
  { role: 'ai', text: 'Based on my ML analysis, the top 3 high-risk tasks are:\n\n1. TSK-9: Burnout Risk ML Model (80% delay risk) — unassigned, deadline April 20\n2. TSK-4: AI Delay Prediction Engine (72% delay risk) — Ahmad Hassan at 94% workload\n3. TSK-3: Auth Module Development (65% delay risk) — team lead overloaded\n\nRecommendation: Reassign TSK-9 to Sarah Lee (72% workload, ML expertise match).', time: '09:01 AM' }
]

export const mockGanttMonths = ['Feb 2025', 'Mar 2025', 'Apr 2025', 'May 2025', 'Jun 2025']