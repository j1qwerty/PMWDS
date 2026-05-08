<template>
  <div class="ph">
    <div class="ph-t">
      <h2>Task Management</h2>
      <p>PROJ-001: AI Research Initiative · Sprint 3</p>
    </div>
    <div class="ph-a">
      <button class="btn btn-p" @click="createTask">+ New Task</button>
      <button class="btn btn-ai btn-s" @click="aiAssignAll">AI AutoAssign</button>
      <button class="btn btn-gold btn-s" @click="go('reports')">Export</button>
    </div>
  </div>

  <div class="alog" style="margin-bottom:14px">
    <div class="alt"><span class="adot"></span>Tasks API</div>
    <pre><span class="m">GET</span> <span class="u">/api/v1/tasks/byproject/{{ selProj.id }}</span> → <span class="k">[].status</span>→<span class="v">Kanban col</span>
<span class="m">PATCH</span> <span class="u">/api/v1/tasks/{taskId}/progress</span> → <span class="k">progressPercentage</span>,<span class="k">notes</span>
<span class="m">POST</span> <span class="u">/api/v1/tasks/{taskId}/escalate</span> → escalation trigger</pre>
  </div>

  <div class="tbr">
    <button class="tab" :class="{ act: tv === 'kanban' }" @click="tv = 'kanban'">Kanban</button>
    <button class="tab" :class="{ act: tv === 'list' }" @click="tv = 'list'">List</button>
    <button class="tab" :class="{ act: tv === 'gantt' }" @click="tv = 'gantt'">Gantt</button>
  </div>

  <!-- KANBAN -->
  <div v-if="tv === 'kanban'" class="kb">
    <div v-for="col in kanbanCols" :key="col.status" class="kc">
      <div class="kch">
        <div class="kct">{{ col.icon }} {{ col.label }}</div>
        <span class="kcn">{{ tasksIn(col.status).length }}</span>
      </div>
      <div v-for="t in tasksIn(col.status)" :key="t.id" class="tc" :class="t.pri.toLowerCase()" @click="openTask(t)">
        <div class="tch">
          <span class="tct">{{ t.title }}</span>
          <span class="bdg" :class="t.pri === 'Critical' ? 'b-err' : t.pri === 'High' ? 'b-warn' : t.pri === 'Medium' ? 'b-p' : 'b-ok'" style="font-size:10px">{{ t.pri }}</span>
        </div>
        <div class="pw"><div class="pb b" :style="{ width: t.prog + '%' }"></div></div>
        <div class="tcm">
          <div class="tca"><div class="av">{{ (t.assignee || '?')[0] }}</div><span>{{ t.assignee || 'Unassigned' }}</span></div>
          <span class="tcd" :class="{ late: isLate(t.due) }">{{ t.due }}</span>
        </div>
        <div style="margin-top:7px;display:flex;gap:5px;flex-wrap:wrap">
          <span class="rb" :class="t.aiRisk > 70 ? 'rc' : t.aiRisk > 60 ? 'rh' : t.aiRisk > 40 ? 'rm' : 'rl'" style="font-size:10px">{{ t.aiRisk }}%</span>
          <span v-if="t.escalated" class="bdg b-err" style="font-size:10px">Escalated</span>
        </div>
      </div>
    </div>
  </div>

  <!-- LIST VIEW -->
  <div v-if="tv === 'list'" class="card">
    <div class="tw">
      <table>
        <thead><tr><th>ID</th><th>Title</th><th>Status</th><th>Priority</th><th>Assignee</th><th>Progress</th><th>AI Risk</th><th>Due</th><th>Actions</th></tr></thead>
        <tbody>
          <tr v-for="t in tasks" :key="t.id">
            <td><span class="bdg b-p" style="font-size:10px">TSK-{{ t.id }}</span></td>
            <td><strong>{{ t.title }}</strong><span v-if="t.escalated" class="bdg b-err" style="font-size:10px;margin-left:5px">🚨</span></td>
            <td><span class="bdg" :class="t.status === 'Done' ? 'b-ok' : t.status === 'InProgress' ? 'b-p' : t.status === 'InReview' ? 'b-warn' : 'b-gr'">{{ t.status }}</span></td>
            <td><span class="bdg" :class="t.pri === 'Critical' ? 'b-err' : t.pri === 'High' ? 'b-warn' : t.pri === 'Medium' ? 'b-p' : 'b-ok'">{{ t.pri }}</span></td>
            <td><div style="display:flex;align-items:center;gap:5px"><div class="av">{{ (t.assignee || '?')[0] }}</div><span style="font-size:12px">{{ t.assignee || 'Unassigned' }}</span></div></td>
            <td style="min-width:100px"><div class="pw"><div class="pb b" :style="{ width: t.prog + '%' }"></div></div><small>{{ t.prog }}%</small></td>
            <td><span class="rb" :class="t.aiRisk > 70 ? 'rh' : t.aiRisk > 40 ? 'rm' : 'rl'">{{ t.aiRisk }}%</span></td>
            <td style="font-size:12px" :style="{ color: isLate(t.due) ? 'var(--err)' : 'var(--tx)' }">{{ t.due }}</td>
            <td><div style="display:flex;gap:4px"><button class="btn btn-s btn-o" @click="openTask(t)">👁️</button><button class="btn btn-s btn-err" @click="escalateTask(t)">🚨</button></div></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- GANTT VIEW -->
  <div v-if="tv === 'gantt'" class="card">
    <div class="ch">
      <h3>Gantt Chart — Sprint 3</h3>
      <span class="bdg b-inf">Feb 1 → Mar 31, 2025</span>
    </div>
    <div class="cb">
      <div class="gantt">
        <div class="gt">
          <div style="display:flex;padding:0 0 8px 200px;gap:0;border-bottom:2px solid var(--bdr);margin-bottom:6px">
            <div v-for="m in ganttMonths" :key="m" style="flex:1;text-align:center;font-size:12px;font-weight:700;color:var(--primary)">{{ m }}</div>
          </div>
          <div v-for="t in tasks" :key="t.id" class="gr2">
            <div class="gl2"><span class="bdg b-p" style="font-size:10px;margin-right:4px">TSK-{{ t.id }}</span>{{ t.title }}</div>
            <div class="gbar-wrap">
              <div class="gbar" :style="{ left: t.ganttLeft + '%', width: t.ganttWidth + '%', background: t.pri === 'Critical' ? 'var(--err)' : t.pri === 'High' ? 'var(--warn)' : t.pri === 'Medium' ? 'var(--primary)' : 'var(--ok)' }">{{ t.prog }}%</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- NEW TASK MODAL -->
  <div v-if="showTaskModal" class="ov" @click.self="showTaskModal = false">
    <div class="modal">
      <div class="mh">
        <h3>Create New Task</h3>
        <button class="mx-btn" @click="showTaskModal = false">✕</button>
      </div>
      <div class="mb2">
        <div class="fr">
          <div class="fc2 ff"><label>Task Title *</label><input v-model="tForm.title" placeholder="e.g. Design database schema"></div>
          <div class="fc2 ff"><label>Description</label><textarea v-model="tForm.desc" placeholder="Task details..."></textarea></div>
          <div class="fc2"><label>Priority *</label><select v-model="tForm.priority"><option>Critical</option><option>High</option><option selected>Medium</option><option>Low</option></select></div>
          <div class="fc2"><label>Estimated Hours</label><input type="number" v-model="tForm.hours" placeholder="e.g. 8"></div>
          <div class="fc2"><label>Start Date</label><input type="date" v-model="tForm.start"></div>
          <div class="fc2"><label>Due Date *</label><input type="date" v-model="tForm.due"></div>
          <div class="fc2"><label>Assignee</label><select v-model="tForm.assignee"><option value="">-- AI Auto-Assign --</option><option v-for="m in teamMembers" :key="m.id" :value="m.id">{{ m.name }} ({{ m.load }}% load)</option></select></div>
        </div>
      </div>
      <div class="mf">
        <button class="btn btn-gh" @click="showTaskModal = false">Cancel</button>
        <button class="btn btn-ai" @click="aiRecommendAssignee">AI Recommend</button>
        <button class="btn btn-p" @click="createTask">Create Task</button>
      </div>
    </div>
  </div>

  <!-- TASK DETAIL MODAL -->
  <div v-if="showTaskDetail && selTask" class="ov" @click.self="showTaskDetail = false">
    <div class="modal" style="max-width:640px">
      <div class="mh">
        <h3>TSK-{{ selTask.id }} · {{ selTask.title }}</h3>
        <button class="mx-btn" @click="showTaskDetail = false">✕</button>
      </div>
      <div class="mb2">
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">
          <span class="bdg" :class="selTask.status === 'Done' ? 'b-ok' : selTask.status === 'InProgress' ? 'b-p' : 'b-gr'">{{ selTask.status }}</span>
          <span class="bdg" :class="selTask.pri === 'Critical' ? 'b-err' : selTask.pri === 'High' ? 'b-warn' : 'b-p'">{{ selTask.pri }}</span>
          <span v-if="selTask.escalated" class="bdg b-err">Escalated</span>
          <span class="bdg b-ai">Risk: {{ selTask.aiRisk }}%</span>
        </div>
        <div style="margin-bottom:16px">
          <label style="font-weight:600;font-size:13px;display:block;margin-bottom:6px">Progress: {{ taskProg }}%</label>
          <input type="range" v-model="taskProg" min="0" max="100" style="width:100%;accent-color:var(--primary)">
          <div class="pw" style="margin-top:6px"><div class="pb b" :style="{ width: taskProg + '%' }"></div></div>
        </div>
        <div class="fc2" style="margin-bottom:14px">
          <label>Progress Notes</label>
          <textarea v-model="taskNote" placeholder="Describe what was completed..."></textarea>
        </div>
        <div class="alert a-warn" style="margin-bottom:14px">
          <strong>AI Delay Prediction:</strong> {{ selTask.aiRisk }}% delay probability
        </div>
      </div>
      <div class="mf">
        <button class="btn btn-gh" @click="showTaskDetail = false">Close</button>
        <button class="btn btn-err btn-s" @click="escalateTask(selTask)">Escalate</button>
        <button class="btn btn-p" @click="updateProgress">Save Progress</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useNavigation, useTasks, useTeam, useHelpers } from '@/composables/useAppState'

const { go } = useNavigation()
const { 
  tv, selProj, tasks, kanbanCols, ganttMonths, tasksIn, isLate,
  showTaskModal, showTaskDetail, selTask, taskProg, taskNote, tForm,
  openTask, updateProgress, escalateTask, createTask, aiAssignAll, aiRecommendAssignee
} = useTasks()
const { teamMembers } = useTeam()
const helpers = useHelpers()
</script>