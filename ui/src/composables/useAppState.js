import { ref, computed } from 'vue'
import {
  mockAuth,
  mockNav,
  mockAiNav,
  mockKpis,
  mockHealthBars,
  mockAtRisk,
  mockWorkload,
  mockProjects,
  mockKanbanCols,
  mockTasks,
  mockTeamMembers,
  mockNotifications,
  mockDepartments,
  mockReportTypes,
  mockAiMetrics,
  mockAiInsights,
  mockAiPredictions,
  mockChatMsgs,
  mockGanttMonths
} from '@/data/mockData'

const _auth = ref({ ...mockAuth })
const _loginForm = ref({ email: '', password: '', remember: false })
const _login = ref({ error: '', success: '', loading: false, eErr: false, pErr: false })

const pg = ref('dashboard')
const sb = ref({ col: false })
const hdr = ref({ q: '' })

const dash = ref({ health: 78, escalated: 2 })
const projects = ref([...mockProjects])
const tasks = ref([...mockTasks])
const teamMembers = ref([...mockTeamMembers])
const notifications = ref([...mockNotifications])
const departments = ref([...mockDepartments])

const pf = ref({ q: '', status: '', priority: '', dept: '' })
const tv = ref('kanban')
const selProj = ref({ id: 'proj-001' })

const showProjModal = ref(false)
const showTaskModal = ref(false)
const showTaskDetail = ref(false)
const showUserModal = ref(false)
const showDeptModal = ref(false)
const selTask = ref(null)
const taskProg = ref(0)
const taskNote = ref('')

const pForm = ref({ code: '', name: '', desc: '', cat: 'Research', dept: 'SE', start: '', end: '', budget: '', manager: '', priority: 'High' })
const tForm = ref({ title: '', desc: '', priority: 'Medium', hours: '', start: '', due: '', assignee: '', milestone: '' })

const rep = ref({ type: 'project-status', format: 'pdf', dept: '', from: '2025-01-01', to: '2025-12-31', narration: '' })
const reportTypes = ref([...mockReportTypes])

const ai = ref({ input: '', typing: false })
const chatMsgs = ref([...mockChatMsgs])

export function useAuth() {
  const valEmail = () => { _login.value.eErr = !_loginForm.value.email.includes('@') }

  const doLogin = async () => {
    _login.value.eErr = !_loginForm.value.email.includes('@')
    _login.value.pErr = !_loginForm.value.password
    if (_login.value.eErr || _login.value.pErr) return
    _login.value.loading = true
    _login.value.error = ''
    await new Promise(r => setTimeout(r, 1200))
    _login.value.loading = false
    _login.value.success = 'Authenticated successfully! Redirecting...'
    await new Promise(r => setTimeout(r, 700))
    _auth.value.isLoggedIn = true
  }

  const ssoLogin = () => {
    _login.value.success = 'Redirecting to University SSO...'
    setTimeout(() => { _auth.value.isLoggedIn = true }, 900)
  }

  const logout = () => {
    _auth.value.isLoggedIn = false
    _loginForm.value = { email: '', password: '', remember: false }
    _login.value = { error: '', success: '', loading: false, eErr: false, pErr: false }
  }

  return { auth: _auth, loginForm: _loginForm, login: _login, valEmail, doLogin, ssoLogin, logout }
}

export function useNavigation() {
  const nav = mockNav
  const aiNav = mockAiNav
  const pgLabel = computed(() => {
    const all = [...nav, ...aiNav]
    return all.find(n => n.id === pg.value)?.label || 'Dashboard'
  })
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  const go = (id) => { pg.value = id }

  return { pg, sb, hdr, nav, aiNav, pgLabel, today, go }
}

export function useDashboard() {
  const kpis = mockKpis
  const healthBars = mockHealthBars
  const atRisk = mockAtRisk
  const workload = mockWorkload

  const refreshDash = () => { dash.value.health = Math.floor(Math.random() * 20) + 70 }
  const fetchHealth = () => {}
  const fetchWL = () => {}
  const escalate = (p) => alert(`🚨Escalating: ${p.name}\nPOST /api/v1/tasks/escalate`)

  return { dash, kpis, healthBars, atRisk, workload, refreshDash, fetchHealth, fetchWL, escalate }
}

export function useProjects() {
  const filteredProjs = computed(() =>
    projects.value.filter(p =>
      (!pf.value.q || p.name.toLowerCase().includes(pf.value.q.toLowerCase())) &&
      (!pf.value.status || p.status === pf.value.status) &&
      (!pf.value.dept || p.dept === pf.value.dept)
    )
  )

  const fetchProjects = () => {}
  const viewProj = (p) => alert(`Viewing: ${p.name}\nGET /api/v1/projects/${p.id}`)
  const editProj = (p) => { showProjModal.value = true }
  const aiHealth = (p) => alert(`🤖AI Health Analysis\nGET /api/v1/projects/${p.id}/ai/health\n\nHealth Score: ${p.health}%\nRisk Score: ${p.risk}%`)
  const aiOptimize = () => alert('🤖AI Resource Optimization\nPOST /api/v1/projects/{id}/ai/optimize-resources')
  const createProject = () => {
    if (!pForm.value.name || !pForm.value.code) { alert('Project code and name are required'); return }
    const np = {
      id: projects.value.length + 1,
      code: pForm.value.code,
      name: pForm.value.name,
      dept: pForm.value.dept,
      manager: 'Dr. Sarah Johnson',
      status: 'Active',
      prog: 0,
      health: 100,
      risk: 5,
      due: pForm.value.end || '2025-12-31',
      budget: Number(pForm.value.budget) / 1000 || 100,
      actual: 0
    }
    projects.value.unshift(np)
    showProjModal.value = false
    pForm.value = { code: '', name: '', desc: '', cat: 'Research', dept: 'SE', start: '', end: '', budget: '', manager: '', priority: 'High' }
    alert(`Project created!\nPOST /api/v1/projects → 201 Created`)
  }
  const aiValidate = () => alert('AI Validation complete!\nProject code is unique\nTimeline is realistic\nBudget seems reasonable')

  return { projects, pf, filteredProjs, fetchProjects, viewProj, editProj, aiHealth, aiOptimize, showProjModal, pForm, createProject, aiValidate }
}

export function useTasks() {
  const kanbanCols = mockKanbanCols
  const ganttMonths = mockGanttMonths
  const isLate = (dateStr) => !dateStr ? false : new Date(dateStr) < new Date()

  const tasksIn = (status) => tasks.value.filter(t => t.status === status)

  const openTask = (t) => {
    selTask.value = t
    taskProg.value = t.prog
    taskNote.value = ''
    showTaskDetail.value = true
  }

  const updateProgress = () => {
    if (selTask.value) {
      selTask.value.prog = Number(taskProg.value)
      if (taskProg.value >= 100) selTask.value.status = 'Done'
      alert(`✅Progress saved!\nPATCH /api/v1/tasks/${selTask.value.id}/progress`)
      showTaskDetail.value = false
    }
  }

  const escalateTask = (t) => {
    t.escalated = true
    dash.value.escalated++
    alert(`🚨Task escalated!\nPOST /api/v1/tasks/${t.id}/escalate`)
  }

  const createTask = () => {
    if (!tForm.value.title) { alert('Task title is required'); return }
    const newTask = {
      id: tasks.value.length + 1,
      title: tForm.value.title,
      status: 'Todo',
      pri: tForm.value.priority,
      assignee: teamMembers.value.find(m => m.id === tForm.value.assignee)?.name || null,
      prog: 0,
      due: tForm.value.due || '2025-06-01',
      aiRisk: Math.floor(Math.random() * 50) + 10,
      escalated: false,
      ganttLeft: 60,
      ganttWidth: 15
    }
    tasks.value.push(newTask)
    showTaskModal.value = false
    tForm.value = { title: '', desc: '', priority: 'Medium', hours: '', start: '', due: '', assignee: '', milestone: '' }
    alert(`✅Task created!\nPOST /api/v1/tasks → 201 Created`)
  }

  const aiAssignAll = () => {
    tasks.value.filter(t => !t.assignee).forEach(t => {
      const avail = teamMembers.value.filter(m => m.load < 80)
      if (avail.length) {
        t.assignee = avail[Math.floor(Math.random() * avail.length)].name
        t.status = 'InProgress'
      }
    })
    alert('🤖AI Auto-Assignment complete!')
  }

  const aiPredictTask = (t) => alert(`🤖AI Delay Prediction for TSK-${t.id}\nDelay Probability: ${t.aiRisk}%\nExpected Delay: +${Math.round(t.aiRisk / 10)} days`)
  const aiRecommendAssignee = () => alert('🤖AI Recommends:\nSarah Lee (ML Engineer)\nMatch Score: 94.2%')

  return {
    tv, selProj, tasks, kanbanCols, ganttMonths, tasksIn, isLate,
    showTaskModal, showTaskDetail, selTask, taskProg, taskNote, tForm,
    openTask, updateProgress, escalateTask, createTask, aiAssignAll, aiPredictTask, aiRecommendAssignee
  }
}

export function useTeam() {
  const viewMember = (m) => alert(`Viewing profile: ${m.name}\nGET /api/v1/users/${m.id}`)
  const aiAssignTo = (m) => alert(`🤖AI Task Assignment for ${m.name}\nBurnout Risk: ${m.burnout}%`)
  const aiBurnout = () => alert('🤖Burnout Analysis complete!\n\nAhmad Hassan — 78% burnout risk (critical)\nFatima Al-Zahra — 62% burnout risk (high)\nCarlos Marin — 22% burnout risk (low)')

  return { teamMembers, showUserModal, viewMember, aiAssignTo, aiBurnout }
}

export function useNotifications() {
  const notifCount = computed(() => notifications.value.filter(n => !n.read).length)
  const readNotif = (n) => { n.read = true }
  const markAllRead = () => { notifications.value.forEach(n => n.read = true) }

  return { notifications, notifCount, readNotif, markAllRead }
}

export function useAI() {
  const aiMetrics = mockAiMetrics
  const aiInsights = ref([...mockAiInsights])
  const aiPredictions = mockAiPredictions

  const sendChat = async () => {
    if (!ai.value.input.trim()) return
    const userMsg = ai.value.input.trim()
    chatMsgs.value.push({ role: 'u', text: userMsg, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) })
    ai.value.input = ''
    ai.value.typing = true
    await new Promise(r => setTimeout(r, 1400))
    ai.value.typing = false

    const responses = {
      default: 'Processing your query via POST /api/v1/ai/chat → GPT-4o...\n\nBased on current data: I\'ve analysed all 142 active tasks across 18 projects. Your overall portfolio health is 78%. Key concern: 3 projects are at critical risk.',
      overload: 'Workload Analysis:\n\nAhmad Hassan — 94% load (CRITICAL)\nFatima Al-Zahra — 88% load (HIGH)\n\nAI Recommendation: Move 2 tasks from Ahmad to Carlos to reduce burnout risk.',
      health: 'Project Health Summary:\n\nPROJ-001 PMWDS Portal — 82% (Good)\nPROJ-003 Cloud Migration — 44% (Critical)\n\nOverall Score: 78%.',
      assign: 'Task Assignment Recommendations:\n\nTSK-8 Mobile API → Carlos Marin (41% load)\nTSK-9 ML Model → Sarah Lee (72% load, ML expertise match: 97%)',
      burnout: 'Burnout Risk Report:\n\nAhmad Hassan — 78% (Immediate action required)\nFatima Al-Zahra — 62% (Monitor closely)'
    }

    const lower = userMsg.toLowerCase()
    const reply = lower.includes('overload') || lower.includes('workload') ? responses.overload
      : lower.includes('health') ? responses.health
        : lower.includes('assign') ? responses.assign
          : lower.includes('burnout') ? responses.burnout
            : responses.default

    chatMsgs.value.push({ role: 'ai', text: reply, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) })
  }

  const quickChat = (msg) => { ai.value.input = msg; sendChat() }
  const trainModel = () => alert('🤖Retraining triggered!\nPOST /api/v1/ai/train')
  const refreshInsights = () => alert('🤖Refreshing AI Insights...')

  return { ai, chatMsgs, aiMetrics, aiInsights, aiPredictions, sendChat, quickChat, trainModel, refreshInsights }
}

export function useReports() {
  const generateReport = () => {
    const ep = {
      'project-status': `GET /api/v1/reports/projectstatus?format=${rep.value.format}`,
      'task-completion': `POST /api/v1/reports/taskcompletion?format=${rep.value.format}`,
      'budget-variance': `GET /api/v1/reports/budgetvariance?format=${rep.value.format}`,
      'delay-analysis': `POST /api/v1/reports/delayanalysis?format=${rep.value.format}`,
      'ai-insights': `GET /api/v1/reports/aiinsights?format=${rep.value.format}`
    }
    alert(`📊Generating ${rep.value.format.toUpperCase()} Report...\n${ep[rep.value.type]}`)
  }

  const aiNarrate = () => {
    rep.value.narration = 'Overall portfolio health is 78% — 2 of 24 projects are at critical risk requiring immediate escalation. Budget variance across all projects is +7.2% over plan, primarily driven by PROJ-003 Cloud Migration (+14%).'
  }

  return { rep, reportTypes, generateReport, aiNarrate }
}

export function useDepartments() {
  const viewDept = (d) => alert(`${d.name} Department Dashboard\nGET /api/v1/departments/${d.id}/dashboard\n\nProjects: ${d.projects} | Members: ${d.members}\nBudget Used: ${d.budgetUsed}% | Health: ${d.health}%`)

  return { departments, showDeptModal, viewDept }
}

export function useHelpers() {
  const isLate = (dateStr) => !dateStr ? false : new Date(dateStr) < new Date()
  return { isLate }
}