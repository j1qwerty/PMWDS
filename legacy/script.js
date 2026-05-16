
const { createApp, ref, computed, onMounted, nextTick } = Vue;
createApp({
 setup() {
 // ── AUTH STATE ────────────────────────────────────────────
 const auth = ref({
 isLoggedIn: false,
 token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.demo.token_2025',
 user: {
 fullName: 'Dr. Sarah Johnson',
 ini: 'SJ',
 role: 'Department Head',
 deptId: 'dept-se-001',
 email: 'sarah.johnson@university.edu'
 }
 });
 const loginForm = ref({ email:'', password:'', remember:false });
 const login = ref({ error:'', success:'', loading:false, eErr:false, pErr:false });
 function valEmail() {
 login.value.eErr = !loginForm.value.email.includes('@');
 }
 async function doLogin() {


    login.value.eErr = !loginForm.value.email.includes('@');
 login.value.pErr = !loginForm.value.password;
 if (login.value.eErr || login.value.pErr) return;
 login.value.loading = true;
 login.value.error = '';
 // Simulate POST /api/v1/auth/login
 await new Promise(r => setTimeout(r, 1200));
 login.value.loading = false;
 login.value.success = 'Authenticated successfully! Redirecting...';
 await new Promise(r => setTimeout(r, 700));
 auth.value.isLoggedIn = true;
 initCharts();
 }
 function ssoLogin() {
 login.value.success = 'Redirecting to University SSO...';
 setTimeout(() => { auth.value.isLoggedIn = true; initCharts(); }, 900);
 }
 function logout() {
 auth.value.isLoggedIn = false;
 loginForm.value = { email:'', password:'', remember:false };
 login.value = { error:'', success:'', loading:false, eErr:false, pErr:false };
 }
 // ── NAVIGATION ────────────────────────────────────────────
 const sb = ref({ col: false });
 const pg = ref('dashboard');
 const hdr = ref({ q:'' });
 const nav = [
 { id:'dashboard', icon:'�', label:'Dashboard' },
 { id:'projects', icon:'�', label:'Projects', badge:3 },
 { id:'tasks', icon:'�', label:'Tasks', badge:7 },
 { id:'team', icon:'�', label:'Team Members' },
 { id:'departments', icon:'�', label:'Departments' },
 { id:'notifications',icon:'�', label:'Notifications', badge:5 },
 { id:'reports', icon:'�', label:'Reports' },
 ];
 const aiNav = [
 { id:'ai', icon:'�', label:'AI Assistant' },
 ];
 const pgLabel = computed(() => {
 const all = [...nav, ...aiNav];
 return all.find(n => n.id === pg.value)?.label || 'Dashboard';
 });
 function go(id) { pg.value = id; if (id==='reports') nextTick(initReportChart); }
 const today = new Date().toLocaleDateString('enUS',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
 // ── DASHBOARD DATA ────────────────────────────────────────
 const dash = ref({ health:78, escalated:2 });
 const kpis = [
 { label:'Total Projects', val:24, icon:'�', col:'bl', up:true, trend:12, sub:'3 new this month', nav:'projects' },
 { label:'Active Projects', val:18, icon:'�', col:'gr', up:true, trend:8, sub:'2 ahead of schedule', nav:'projects' },
 { label:'Tasks This Sprint', val:142, icon:'�', col:'bl', up:true, trend:5, sub:'89 completed', nav:'tasks' }, 
 { label:'Overdue Tasks', val:7, icon:'�', col:'rd', up:false, trend:3, sub:'Requires attention', nav:'tasks' },
 { label:'Team Members', val:38, icon:'�', col:'pu', up:true, trend:2, sub:'4 on leave', nav:'team' },
 { label:'Budget Used', val:'67%',icon:'�',col:'gd', up:false, trend:4, sub:'$892K of $1.3M', nav:'reports' },
 ];
 const healthBars = [
 { lbl:'Schedule Adherence', v:82 },
 { lbl:'Budget Compliance', v:67 },
 { lbl:'Team Velocity', v:74 },
 { lbl:'Quality Index', v:91 },
 { lbl:'Risk Management', v:58 },
 ];
 const atRisk = [
 { id:1, code:'PROJ-003', name:'Cloud Migration Initiative', prog:31, risk:87 },
 { id:2, code:'PROJ-007', name:'Mobile App Development', prog:45, risk:73 },
 { id:3, code:'PROJ-011', name:'Data Analytics Platform', prog:22, risk:68 },
 ];
 const workload = [
 { name:'Ahmad Hassan', role:'Dev Lead', load:94, tasks:12, burnout:78 },
 { name:'Sarah Lee', role:'ML Engineer', load:72, tasks:8, burnout:45 },
 { name:'John Williams', role:'Designer', load:55, tasks:6, burnout:30 },
 { name:'Fatima Al-Zahra', role:'DevOps', load:88, tasks:10, burnout:62 },
 { name:'Carlos Marin', role:'Analyst', load:41, tasks:5, burnout:22 },
 ];
 function refreshDash() { dash.value.health = Math.floor(Math.random()*20)+70; }
 function fetchHealth() {}
 function fetchWL() {}
 function escalate(p) { alert(`�Escalating: ${p.name}\nPOST /api/v1/tasks/escalate`); }
 // ── PROJECTS DATA ─────────────────────────────────────────
const projects = ref([
 { id:1, code:'PROJ-001', name:'PMWDS Portal Development', dept:'SE', manager:'Dr. Sarah Johnson', status:'Active', prog:67, health:82, risk:28, due:'2025-08-31', budget:250, actual:168 },
 { id:2, code:'PROJ-002', name:'AI Research Initiative', dept:'AI', manager:'Prof. Ahmed Ali', status:'Active', prog:45, health:71, risk:42, due:'2025-06-15', budget:180, actual:82 },
 { id:3, code:'PROJ-003', name:'Cloud Migration', dept:'CS', manager:'Dr. James Liu', status:'Delayed', prog:31, health:44, risk:87, due:'2025-03-31', budget:320, actual:290 },
 { id:4, code:'PROJ-004', name:'Mobile App v2.0', dept:'SE', manager:'Dr. Sarah Johnson', status:'OnHold', prog:55, health:61, risk:55, due:'2025-09-30', budget:140, actual:78 },
 { id:5, code:'PROJ-005', name:'Data Analytics Platform', dept:'AI', manager:'Prof. Ahmed Ali', status:'Active', prog:22, health:38, risk:68, due:'2025-04-30', budget:210, actual:47 }
]);

 const pf = ref({ q:'', status:'', priority:'', dept:'' });
 const filteredProjs = computed(() =>
 projects.value.filter(p =>
 (!pf.value.q || p.name.toLowerCase().includes(pf.value.q.toLowerCase())) && 
 (!pf.value.status || p.status === pf.value.status) &&
 (!pf.value.dept || p.dept === pf.value.dept)
 )
 );
 function fetchProjects() {}
 function viewProj(p) { alert(` Viewing: ${p.name}\nGET /api/v1/projects/${p.id}`); }
 function editProj(p) { showProjModal.value = true; }
 function aiHealth(p) { alert(`�AI Health Analysis\nGET
/api/v1/projects/${p.id}/ai/health\n\nHealth Score: ${p.health}%\nRisk Score: ${p.risk}%`);
}
 function aiOptimize() { alert('�AI Resource Optimization\nPOST/api/v1/projects/{id}/ai/optimize-resources'); }
 // ── TASKS / KANBAN DATA ───────────────────────────────────
 const tv = ref('kanban');
 const selProj = ref({ id:'proj-001' });
 const kanbanCols = [
 { status:'Todo', icon:'�', label:'To Do' }, 
 { status:'InProgress', icon:'�', label:'In Progress' },
 { status:'InReview', icon:' ', label:'In Review' },
 { status:'Done', icon:'�', label:'Done' },
 ];
 const tasks = ref([
 { id:1, title:'Design System Architecture', status:'Done', pri:'High', assignee:'Ahmad Hassan', prog:100, due:'2025-02-15', aiRisk:12, escalated:false, ganttLeft:0, ganttWidth:20 },
 { id:2, title:'Setup CI/CD Pipeline', status:'Done', pri:'Medium', assignee:'Fatima Al-Zahra', prog:100, due:'2025-02-20', aiRisk:18, escalated:false, ganttLeft:5, ganttWidth:18 },
 { id:3, title:'Develop Auth Module', status:'InProgress', pri:'Critical', assignee:'Ahmad Hassan', prog:72, due:'2025-03-10', aiRisk:65, escalated:false, ganttLeft:15, ganttWidth:25 },
 { id:4, title:'AI Delay Prediction Engine', status:'InProgress', pri:'High', assignee:'Sarah Lee', prog:48, due:'2025-03-20', aiRisk:72, escalated:true, ganttLeft:20, ganttWidth:30 },
 { id:5, title:'Dashboard UI Components', status:'InProgress', pri:'Medium', assignee:'John Williams', prog:55, due:'2025-03-25', aiRisk:38, escalated:false, ganttLeft:22, ganttWidth:28 },
 { id:6, title:'Reports & PDF Export', status:'InReview', pri:'High', assignee:'Carlos Marin', prog:90, due:'2025-03-15', aiRisk:22, escalated:false, ganttLeft:18, ganttWidth:20 },
 { id:7, title:'SignalR Real-time Notifications', status:'InReview', pri:'Medium', assignee:'Fatima Al-Zahra', prog:88, due:'2025-03-18', aiRisk:30, escalated:false, ganttLeft:25, ganttWidth:18 },
 { id:8, title:'Mobile App API Integration', status:'Todo', pri:'Low', assignee:null, prog:0, due:'2025-04-10', aiRisk:55, escalated:false, ganttLeft:40, ganttWidth:25 },
 { id:9, title:'Burnout Risk ML Model', status:'Todo', pri:'High', assignee:null, prog:0, due:'2025-04-20', aiRisk:80, escalated:true, ganttLeft:42, ganttWidth:22 },
 { id:10, title:'User Acceptance Testing', status:'Todo', pri:'Critical', assignee:null, prog:0, due:'2025-05-01', aiRisk:45, escalated:false, ganttLeft:55, ganttWidth:20 }
]);

 const ganttMonths = ['Feb 2025','Mar 2025','Apr 2025','May 2025','Jun 2025'];
 function tasksIn(status) { return tasks.value.filter(t => t.status === status); }
 const showTaskModal = ref(false);
 const showTaskDetail = ref(false);
 const selTask = ref(null);
 const taskProg = ref(0);
 const taskNote = ref('');
 const tForm = ref({ title:'', desc:'', priority:'Medium', hours:'', start:'', due:'',
assignee:'', milestone:'' });
 function openTask(t) {
 selTask.value = t;
 taskProg.value = t.prog;
 taskNote.value = '';
 showTaskDetail.value = true;
 }
 function updateProgress() {
 if (selTask.value) {
 selTask.value.prog = Number(taskProg.value);
 if (taskProg.value >= 100) selTask.value.status = 'Done';
 alert(`�Progress saved!\nPATCH /api/v1/tasks/${selTask.value.id}/progress\n{
progressPercentage: ${taskProg.value}, notes: "${taskNote.value||'Updated'}" }`);
 showTaskDetail.value = false;
 }
 }
 function escalateTask(t) {
 t.escalated = true;
 dash.value.escalated++;
 alert(`�Task escalated!\nPOST /api/v1/tasks/${t.id}/escalate\n→ Notifications sent
to Project Manager & Department Head\n→ SignalR push to all connected clients`);
 }
 function createTask() {
 if (!tForm.value.title) { alert('Task title is required'); return; }
 const newTask = {
 id: tasks.value.length + 1,
 title: tForm.value.title,
 status: 'Todo',
 pri: tForm.value.priority,
 assignee: teamMembers.value.find(m => m.id === tForm.value.assignee)?.name ||
null,
 prog: 0,
 due: tForm.value.due || '2025-06-01',
 aiRisk: Math.floor(Math.random() * 50) + 10,
 escalated: false,
 ganttLeft: 60,
 ganttWidth: 15
 };
 tasks.value.push(newTask);
 showTaskModal.value = false;
 tForm.value = { title:'', desc:'', priority:'Medium', hours:'', start:'', due:'',
assignee:'', milestone:'' };
 alert(`�Task created!\nPOST /api/v1/tasks → 201 Created\nID: TSK-${newTask.id}`);


 }
 function aiAssignAll() {
 tasks.value.filter(t => !t.assignee).forEach(t => {
 const avail = teamMembers.value.filter(m => m.load < 80);
 if (avail.length) {
 t.assignee = avail[Math.floor(Math.random() * avail.length)].name;
 t.status = 'InProgress';
 }
 });
 alert('�AI Auto-Assignment complete!\nGET /api/v1/tasks/{id}/ai/recommendassignee\n→ ML.NET FastTree model scored all candidates\n→ 3 tasks assigned based on availability, skills & burnout score');
 }
 function aiPredictTask(t) {
 alert(`�AI Delay Prediction for TSK-${t.id}\nGET /api/v1/tasks/${t.id}/ai/delayprediction\n\nDelay Probability: ${t.aiRisk}%\nExpected Delay: +${Math.round(t.aiRisk/10)}
    days\nRisk Level: ${t.aiRisk>70?'High':'Medium'}\nModel: ML.NET FastTree Regression`);
 }
 // ── TEAM DATA ─────────────────────────────────────────────
const teamMembers = ref([
 { id:'u1', name:'Ahmad Hassan', role:'Dev Lead', status:'Busy', tasks:12, done:28, perf:88, load:94, burnout:78, skills:['C#','ASP.NET','SQL','Azure'] },
 { id:'u2', name:'Sarah Lee', role:'ML Engineer', status:'Available', tasks:8, done:21, perf:91, load:72, burnout:45, skills:['Python','ML.NET','TensorFlow'] },
 { id:'u3', name:'John Williams', role:'UI Designer', status:'Available', tasks:6, done:18, perf:76, load:55, burnout:30, skills:['Vue.js','CSS','Figma','UX'] },
 { id:'u4', name:'Fatima Al-Zahra', role:'DevOps Eng.', status:'Busy', tasks:10, done:32, perf:85, load:88, burnout:62, skills:['Docker','Kubernetes','CI/CD'] },
 { id:'u5', name:'Carlos Marin', role:'Data Analyst', status:'Available', tasks:5, done:15, perf:79, load:41, burnout:22, skills:['Power BI','SQL','Python','Tableau'] },
 { id:'u6', name:'Layla Nasser', role:'QA Engineer', status:'OnLeave', tasks:3, done:12, perf:83, load:25, burnout:18, skills:['Selenium','Postman','JIRA'] },
]);

 function viewMember(m) { alert(`Viewing profile: ${m.name}\nGET /api/v1/users/${m.id}\n\nWorkload: ${m.load}% | Burnout: ${m.burnout}%\nActive Tasks: ${m.tasks} | Done/Month: ${m.done}`); }
function aiAssignTo(m) { alert(`AI Task Assignment for ${m.name}\nGET /api/v1/users/${m.id}/ai/burnout-risk\n\nBurnout Risk: ${m.burnout}%\nRecommended Max Tasks: ${m.load>80?'No new tasks':m.load>60?'1 task':'Multiple tasks'}`); }
function aiBurnout() { alert(`Burnout Analysis complete!\nGET /api/v1/users/workload?departmentId=...\n\nAhmad Hassan — 78% burnout risk (critical)\nFatima Al-Zahra — 62% burnout risk (high)\nCarlos Marin — 22% burnout risk (low)`); }
function showUserModal() {}
// ── NOTIFICATIONS DATA ────────────────────────────────────
const notifications = ref([
 { id:1, icon:'�', bg:'#fde8ea', title:'Task Escalated — AI Delay Risk', msg:'TSK-4: AI Delay Prediction Engine — 72% delay probability detected by ML model', time:'2 min ago', type:'Escalation', ai:true, read:false },
 { id:2, icon:'�', bg:'#fff3cd', title:'Deadline Alert — PROJ-003', msg:'Cloud Migration is 69 days overdue. Immediate intervention required.', time:'15 min ago', type:'Deadline', ai:false, read:false },
 { id:3, icon:'�', bg:'#e8d5ff', title:'AI Insight — Burnout Risk Detected', msg:'Ahmad Hassan shows 78% burnout risk. Recommend redistributing 2 tasks.', time:'1 hr ago', type:'AI Insight', ai:true, read:false },
 { id:4, icon:'�', bg:'#d4edda', title:'Task Completed', msg:'TSK-2: Setup CI/CD Pipeline marked complete by Fatima Al-Zahra', time:'2 hrs ago', type:'Task', ai:false, read:false },
 { id:5, icon:'�', bg:'#d1ecf1', title:'New Project Assigned', msg:'You have been assigned as Project Manager for PROJ-005: Data Analytics Platform', time:'3 hrs ago', type:'Project', ai:false, read:false },
 { id:6, icon:'�', bg:'#fff3cd', title:'Budget Warning — PROJ-003', msg:'Cloud Migration has consumed 90.6% of planned budget ($290K of $320K)', time:'5 hrs ago', type:'Budget', ai:true, read:true },
 { id:7, icon:'�', bg:'#e8d5ff', title:'AI Model Retrained', msg:'Delay Prediction model retrained with 847 new data points. Accuracy: 87.3%', time:'8 hrs ago', type:'AI Insight', ai:true, read:true },
 { id:8, icon:'�', bg:'#d1ecf1', title:'New Team Member Added', msg:'Layla Nasser (QA Engineer) has been added to the Software Engineering team', time:'1 day ago', type:'Team', ai:false, read:true },
]);
 const notifCount = computed(() => notifications.value.filter(n => !n.read).length);
 function readNotif(n) { n.read = true; }
 function markAllRead() { notifications.value.forEach(n => n.read = true); }
 // ── AI PAGE DATA ──────────────────────────────────────────
 const ai = ref({ input:'', typing:false });
const chatMsgs = ref([
 { role:'ai', text:'Hello Dr. Johnson! I\'m your PMWDS AI Assistant powered by GPT4o. I can help you analyse project health, predict task delays, recommend assignments, and generate insights. What would you like to know?', time:'09:00 AM' },
 { role:'u', text:'Which tasks are at highest risk of delay this week?', time:'09:01 AM' },
 { role:'ai', text:'Based on my ML analysis, the top 3 high-risk tasks are:\n\n1. TSK-9: Burnout Risk ML Model (80% delay risk) — unassigned, deadline April 20\n2. TSK-4: AI Delay Prediction Engine (72% delay risk) — Ahmad Hassan at 94% workload\n3. TSK-3: Auth Module Development (65% delay risk) — team lead overloaded\n\nRecommendation: Reassign TSK-9 to Sarah Lee (72% workload, ML expertise match).', time:'09:01 AM' },
]);
 async function sendChat() {
 if (!ai.value.input.trim()) return;
 const userMsg = ai.value.input.trim();
 chatMsgs.value.push({ role:'u', text:userMsg, time: new
Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) });
 ai.value.input = '';
 ai.value.typing = true;
 await new Promise(r => setTimeout(r, 1400));
 ai.value.typing = false;
 const responses = {
 default: 'Processing your query via POST /api/v1/ai/chat → GPT-4o...\n\nBased on current data: I\'ve analysed all 142 active tasks across 18 projects. Your overall portfolio health is 78%. Key concern: 3 projects are at critical risk. Recommend scheduling a review meeting.',
 overload: 'Workload Analysis:\n\nAhmad Hassan — 94% load (CRITICAL)\nFatima Al-Zahra — 88% load (HIGH)\nCarlos Marin — 41% load (available for reallocation)\n\nAI Recommendation: Move 2 tasks from Ahmad to Carlos to reduce burnout risk from 78% → 45%.',
 health: 'Project Health Summary:\n\nPROJ-001 PMWDS Portal — 82% (Good)\nPROJ-002 AI Research — 71% (Fair)\nPROJ-003 Cloud Migration — 44% (Critical)\nPROJ-005 Data Analytics — 38% (Critical)\n\nOverall Score: 78%. 2 projects need immediate intervention.',
 assign: 'Task Assignment Recommendations:\n\nTSK-8 Mobile API → Carlos Marin (41% load, API skills match: 92%)\nTSK-9 ML Model → Sarah Lee (72% load, ML expertise match: 97%)\nTSK-10 UAT → Layla Nasser (25% load, QA skills match: 95%)\n\nEstimated efficiency gain: +23% after reallocation.',
 burnout: 'Burnout Risk Report:\n\nAhmad Hassan — 78% (Immediate action required)\nFatima Al-Zahra — 62% (Monitor closely)\nSarah Lee — 45% (Acceptable)\nJohn Williams — 30% (Good)\nCarlos Marin — 22% (Excellent)\n\nRecommendation: Reduce Ahmad\'s task load by 3 tasks immediately.'
 };
 const lower = userMsg.toLowerCase();
 const reply = lower.includes('overload') || lower.includes('workload') ?
responses.overload
 : lower.includes('health') ? responses.health
 : lower.includes('assign') ? responses.assign
 : lower.includes('burnout') ? responses.burnout
 : responses.default;
 chatMsgs.value.push({ role:'ai', text:reply, time: new Date().toLocaleTimeString([],
{hour:'2-digit',minute:'2-digit'}) });
 }
 function quickChat(msg) { ai.value.input = msg; sendChat(); }
 function trainModel() { alert('Retraining triggered!\nPOST /api/v1/ai/train\n→ Hangfire background job queued\n→ ML.NET pipeline: data load → feature engineering → FastTree training\n→ Expected completion: ~4 minutes\n→ Next auto-train: Tomorrow 2:00 AM'); }
function refreshInsights() { alert('Refreshing AI Insights...\nGET /api/v1/projects/{id}/ai/insights\n→ NLG engine generating natural language insights\n→ 6 new insights generated'); }
const aiMetrics = [
 { label:'Task Allocation', val:87 },
 { label:'Delay Prediction', val:83 },
 { label:'Health Analysis', val:91 },
 { label:'Burnout Detection', val:79 },
];
 const aiInsights = ref([
 { id:1, icon:'�', title:'Critical Workload Imbalance', msg:'Ahmad Hassan is at 94% capacity. Recommend immediate reallocation of 2-3 tasks to available team members.', sev:'High', time:'Just now' },
 { id:2, icon:' ', title:'PROJ-003 Budget Overrun Predicted', msg:'Cloud Migration is projected to exceed budget by $45K (14%) based on current spending velocity.', sev:'High', time:'5 min ago' },
 { id:3, icon:'�', title:'Sprint Velocity Improving', msg:'Team completed 89 of 142 tasks (63%) with 8 days remaining. Predicted sprint success rate: 78%.', sev:'Medium', time:'1 hr ago' },
 { id:4, icon:'�', title:'PROJ-001 On Track for Delivery', msg:'PMWDS Portal is 67% complete with 82% health score. No intervention needed. Keep current pace.', sev:'Low', time:'2 hrs ago' },
 { id:5, icon:'�', title:'Delay Risk Spike Detected — TSK-9', msg:'Burnout Risk ML Model task has 80% delay probability due to no assignee and approaching deadline (Apr 20).', sev:'High', time:'3 hrs ago' },
]);
 const aiPredictions = [
 { id:1, task:'AI Delay Prediction Engine', proj:'PROJ-002', assignee:'Sarah Lee', due:'2025-03-20', prob:72, delayDays:8, risk:'High', mitigations:['Reassign 1 subtask','Extend deadline by 1 week'] },
 { id:2, task:'Burnout Risk ML Model', proj:'PROJ-002', assignee:'Unassigned', due:'2025-04-20', prob:80, delayDays:14, risk:'Critical', mitigations:['Assign immediately','Split into 2 sub-tasks'] },
 { id:3, task:'Develop Auth Module', proj:'PROJ-001', assignee:'Ahmad Hassan', due:'2025-03-10', prob:65, delayDays:5, risk:'High', mitigations:['Reduce other tasks','Add pair programmer'] },
 { id:4, task:'Dashboard UI Components', proj:'PROJ-001', assignee:'John Williams', due:'2025-03-25', prob:38, delayDays:0, risk:'Medium', mitigations:['Monitor weekly','Review milestone progress'] },
 { id:5, task:'Reports & PDF Export', proj:'PROJ-001', assignee:'Carlos Marin', due:'2025-03-15', prob:22, delayDays:0, risk:'Low', mitigations:['On track — no action needed'] },
];
// ── REPORTS DATA ──────────────────────────────────────────
const rep = ref({ type:'project-status', format:'pdf', dept:'', from:'2025-01-01', to:'2025-12-31', narration:'' });
const reportTypes = [
 { id:'project-status', icon:'�', label:'Project Status Report' },
 { id:'task-completion', icon:'�', label:'Task Completion Report' },
 { id:'department-workload', icon:'�', label:'Department Workload Report' },
 { id:'budget-variance', icon:'�', label:'Budget Variance Report' },
 { id:'delay-analysis', icon:' ', label:'Delay Analysis Report' },
 { id:'ai-insights', icon:'�', label:'AI Insights Report' },
];
 function generateReport() {
 const ep = {
 'project-status': `GET /api/v1/reports/projectstatus/{id}?format=${rep.value.format}`,
 'task-completion': `POST /api/v1/reports/taskcompletion?format=${rep.value.format}`,
 'department-workload': `POST /api/v1/reports/departmentworkload?format=${rep.value.format}`,
 'budget-variance': `GET /api/v1/reports/budgetvariance/{id}?format=${rep.value.format}`,
 'delay-analysis': `POST /api/v1/reports/delayanalysis?format=${rep.value.format}`,
 'ai-insights': `GET /api/v1/reports/aiinsights/{id}?format=${rep.value.format}`,
 };
 alert(`�Generating ${rep.value.format.toUpperCase()}
Report...\n${ep[rep.value.type]}\n→ QuestPDF engine rendering...\n→ File ready for
download: ${rep.value.type}.${rep.value.format} (Est. ~2.4 MB)`);
 }
 function aiNarrate() { rep.value.narration = 'Overall portfolio health is 78% — 2 of 24 projects are at critical risk requiring immediate escalation. Budget variance across all projects is +7.2% over plan, primarily driven by PROJ-003 Cloud Migration (+14%). Team velocity has improved 8% MoM. AI recommends priority reallocation of 3 overloaded team members.'; }
// ── DEPARTMENTS DATA ──────────────────────────────────────
const departments = ref([
 { id:'d1', icon:'�', name:'Software Engineering', code:'SE', health:79, projects:8, members:14, budget:750, budgetUsed:68 },
 { id:'d2', icon:'�', name:'Artificial Intelligence', code:'AI', health:65, projects:6, members:9, budget:520, budgetUsed:82 },
 { id:'d3', icon:' ', name:'Computer Science', code:'CS', health:44, projects:5, members:11, budget:480, budgetUsed:91 },
 { id:'d4', icon:'�', name:'Data Science', code:'DS', health:88, projects:3, members:7, budget:310, budgetUsed:54 },
 { id:'d5', icon:'�', name:'Cybersecurity', code:'CY', health:92, projects:2, members:5, budget:220, budgetUsed:42 },
]);
const showDeptModal = ref(false);
function viewDept(d) { alert(`${d.name} Department Dashboard\nGET /api/v1/departments/${d.id}/dashboard\n\nProjects: ${d.projects} | Members: ${d.members}\nBudget Used: ${d.budgetUsed}% | Health: ${d.health}%`); }
// ── MODALS ────────────────────────────────────────────────
const showProjModal = ref(false);
const pForm = ref({ code:'', name:'', desc:'', cat:'Research', dept:'SE', start:'', end:'', budget:'', manager:'', priority:'High' });
function createProject() {
 if (!pForm.value.name || !pForm.value.code) { alert('Project code and name are required'); return; }
 const np = { id: projects.value.length + 1, code: pForm.value.code, name: pForm.value.name, dept: pForm.value.dept, manager: 'Dr. Sarah Johnson', status: 'Active', prog: 0, health: 100, risk: 5, due: pForm.value.end || '2025-12-31', budget: Number(pForm.value.budget)/1000 || 100, actual: 0 };
 projects.value.unshift(np);
 showProjModal.value = false;
 pForm.value = { code:'', name:'', desc:'', cat:'Research', dept:'SE', start:'', end:'', budget:'', manager:'', priority:'High' };
 alert(`Project created!\nPOST /api/v1/projects → 201 Created\nCode: ${np.code} | AI Health monitoring started in background`);
}
function aiValidate() { alert('AI Validation complete!\nProject code is unique\nTimeline is realistic (234 days)\nBudget seems low for scope — recommend +15%\nDepartment has available capacity'); }
function aiRecommendAssignee() { alert('AI Recommends:\nSarah Lee (ML Engineer)\nMatch Score: 94.2%\nReason: Skill match, 72% workload, 45% burnout risk\n\nAlternative: Carlos Marin (Score: 81.5%)'); }
// ── CHARTS ────────────────────────────────────────────────
let trendChartInst, donutChartInst, budgetChartInst, reportChartInst;
function initCharts() { nextTick(() => { const tc = document.getElementById('trendChart'); if (tc) { if (trendChartInst) trendChartInst.destroy(); trendChartInst = new Chart(tc, { type: 'line', data: { labels: ['Feb 1','Feb 5','Feb 10','Feb 15','Feb 20','Feb 25','Mar 1','Mar 5','Mar 10','Mar 15'], datasets: [{ label:'Completed', data:[8,15,22,31,40,49,57,68,76,89], borderColor:'#28a745', backgroundColor:'rgba(40,167,69,.1)', tension:0.4, fill:true, pointRadius:4 }, { label:'Planned', data:[10,20,30,40,50,60,70,80,90,100], borderColor:'#1B3A6B', borderDash:[6,3], backgroundColor:'transparent', tension:0.4, pointRadius:0 }, { label:'At Risk', data:[2,3,5,4,6,7,5,8,7,9], borderColor:'#dc3545', backgroundColor:'rgba(220,53,69,.08)', tension:0.4, fill:true, pointRadius:3 } ] }, options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{ labels:{ font:{size:11} } } }, scales:{ x:{ grid:{ color:'#f0f0f0' }, ticks:{ font:{size:10} } }, y:{ grid:{ color:'#f0f0f0' }, ticks:{ font:{size:10} }, beginAtZero:true } } } }); } const dc = document.getElementById('donutChart'); if (dc) { if (donutChartInst) donutChartInst.destroy(); donutChartInst = new Chart(dc, { type: 'doughnut', data: { labels:['Healthy','At Risk','Critical'], datasets:[{ data:[14,6,4], backgroundColor:['#28a745','#ffc107','#dc3545'], borderWidth:0, hoverOffset:6 }] }, options:{ responsive:true, maintainAspectRatio:false, cutout:'72%', plugins:{ legend:{ position:'bottom', labels:{ font:{size:11}, padding:10 } } } } }); } const bc = document.getElementById('budgetChart'); if (bc) { if (budgetChartInst) budgetChartInst.destroy(); budgetChartInst = new Chart(bc, { type: 'bar', data: { labels:['PROJ-001','PROJ-002','PROJ-003','PROJ-004','PROJ-005'], datasets:[{ label:'Planned ($K)', data:[250,180,320,140,210], backgroundColor:'rgba(27,58,107,.15)', borderColor:'#1B3A6B', borderWidth:1.5, borderRadius:6 }, { label:'Actual ($K)', data:[168,82,290,78,47], backgroundColor:['rgba(40,167,69,.7)','rgba(40,167,69,.7)','rgba(220,53,69,.7)','rgba(40,167,69,.7)','rgba(40,167,69,.7)'], borderRadius:6 } ] }, options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ labels:{ font:{size:11} } } }, scales:{ x:{ grid:{display:false}, ticks:{font:{size:11}} }, y:{ grid:{ color:'#f0f0f0' }, ticks:{ font:{size:11}, callback: v => '$'+v+'K' } } } } }); } }); }
function initReportChart() { nextTick(() => { const rc = document.getElementById('reportChart'); if (rc) { if (reportChartInst) reportChartInst.destroy(); reportChartInst = new Chart(rc, { type: 'bar', data: { labels:['SE Dept','AI Dept','CS Dept','DS Dept','CY Dept'], datasets:[{ label:'Health Score', data:[79,65,44,88,92], backgroundColor:'rgba(27,58,107,.7)', borderRadius:6 }, { label:'Task Completion', data:[82,71,58,91,95], backgroundColor:'rgba(40,167,69,.6)', borderRadius:6 }, { label:'Budget Used %', data:[68,82,91,54,42], backgroundColor:'rgba(200,169,81,.7)', borderRadius:6 } ] }, options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ labels:{ font:{size:11} } } }, scales:{ x:{ grid:{display:false}, ticks:{font:{size:11}} }, y:{ grid:{ color:'#f0f0f0' }, ticks:{ font:{size:10}, max:100, callback: v => v+'%' } } } } }); } }); }
// ── HELPERS ───────────────────────────────────────────────
function isLate(dateStr) { if (!dateStr) return false; return new Date(dateStr) < new Date(); }
onMounted(() => { });
return { auth, loginForm, login, valEmail, doLogin, ssoLogin, logout, sb, pg, hdr, nav, aiNav, pgLabel, go, today, dash, kpis, healthBars, atRisk, workload, refreshDash, fetchHealth, fetchWL, escalate, projects, pf, filteredProjs, fetchProjects, viewProj, editProj, aiHealth, aiOptimize, showProjModal, pForm, createProject, aiValidate, tv, selProj, tasks, tasksIn, kanbanCols, ganttMonths, showTaskModal, showTaskDetail, selTask, taskProg, taskNote, tForm, openTask, updateProgress, escalateTask, createTask, aiAssignAll, aiPredictTask, aiRecommendAssignee, teamMembers, viewMember, aiAssignTo, aiBurnout, showUserModal, notifications, notifCount, readNotif, markAllRead, ai, chatMsgs, sendChat, quickChat, trainModel, refreshInsights, aiMetrics, aiInsights, aiPredictions, rep, reportTypes, generateReport, aiNarrate, departments, showDeptModal, viewDept, isLate };
},
mounted() { this.$watch('auth.isLoggedIn', (val) => { if (val) this.initCharts(); }); },
methods: { initCharts() { const nextTick = Vue.nextTick; nextTick(() => { this.$options.setup && this.initCharts && this.initCharts?.(); }); } },
watch: { 'auth.isLoggedIn'(val) { if (val) { Vue.nextTick(() => { const initFn = this.$.setupState?.initCharts; if (initFn) initFn(); }); } }, pg(val) { if (val === 'reports') { const initFn = this.$.setupState?.initReportChart; if (initFn) initFn(); } if (val === 'dashboard') { const initFn = this.$.setupState?.initCharts; if (initFn) initFn(); } } }
}).mount('#app');