<template>
  <div class="ph">
    <div class="ph-t">
      <h2>Research Projects & Courses</h2>
      <p>Manage all departmental projects and research initiatives</p>
    </div>
    <div class="ph-a">
      <button class="btn btn-p" @click="createProject">+ New Project</button>
      <button class="btn btn-ai btn-s" @click="aiOptimize">AI Optimize</button>
      <button class="btn btn-gold btn-s">Export</button>
    </div>
  </div>

  <div class="alog" style="margin-bottom:16px">
    <div class="alt"><span class="adot"></span>Projects API</div>
    <pre><span class="m">GET</span> <span class="u">/api/v1/projects?departmentId={{ auth.user.deptId }}&status={{ pf.status||'all' }}</span>
→ <span class="k">[].name</span>→<span class="v">Name col</span> | <span class="k">[].status</span>→<span class="v">badge color</span></pre>
  </div>

  <div class="fb">
    <div class="si"><span>🔍</span><input v-model="pf.q" placeholder="Search projects..."></div>
    <select class="fsel" v-model="pf.status">
      <option value="">All Status</option>
      <option value="InProgress">Active</option>
      <option value="Delayed">Delayed</option>
      <option value="OnHold">On Hold</option>
    </select>
    <select class="fsel" v-model="pf.priority">
      <option value="">All Priority</option>
      <option value="Critical">Critical</option>
      <option value="High">High</option>
    </select>
    <select class="fsel" v-model="pf.dept">
      <option value="">All Departments</option>
      <option value="SE">Software Eng.</option>
      <option value="AI">AI</option>
    </select>
  </div>

  <div class="card">
    <div class="tw">
      <table>
        <thead><tr><th>Code</th><th>Project / Course</th><th>Dept</th><th>Status</th><th>Progress</th><th>Health</th><th>Risk</th><th>Due Date</th><th>Actions</th></tr></thead>
        <tbody>
          <tr v-for="p in filteredProjs" :key="p.id">
            <td><span class="bdg b-p">{{ p.code }}</span></td>
            <td><strong>{{ p.name }}</strong><div style="font-size:11px;color:var(--mx)">PM: {{ p.manager }}</div></td>
            <td><span class="bdg b-inf">{{ p.dept }}</span></td>
            <td><span class="bdg" :class="p.status === 'Active' ? 'bok' : p.status === 'Delayed' ? 'b-err' : 'b-gr'">{{ p.status }}</span></td>
            <td style="min-width:110px">
              <div class="pw"><div class="pb" :class="p.prog >= 70 ? 'g' : p.prog >= 40 ? 'y' : 'r'" :style="{ width: p.prog + '%' }"></div></div>
              <small>{{ p.prog }}%</small>
            </td>
            <td><strong style="font-size:12px">{{ p.health }}</strong></td>
            <td><span class="rb" :class="p.risk > 70 ? 'rh' : p.risk > 40 ? 'rm' : 'rl'">{{ p.risk }}%</span></td>
            <td style="font-size:12px">{{ p.due }}</td>
            <td>
              <div style="display:flex;gap:4px">
                <button class="btn btn-s btn-o" @click="viewProj(p)">👁️</button>
                <button class="btn btn-s btn-gold" @click="editProj(p)">✏️</button>
                <button class="btn btn-s btn-ai" @click="aiHealth(p)">🤖</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- NEW PROJECT MODAL -->
  <div v-if="showProjModal" class="ov" @click.self="showProjModal = false">
    <div class="modal">
      <div class="mh">
        <h3>Create New Project</h3>
        <button class="mx-btn" @click="showProjModal = false">✕</button>
      </div>
      <div class="mb2">
        <div class="fr">
          <div class="fc2"><label>Project Code *</label><input v-model="pForm.code" placeholder="PROJ-002"></div>
          <div class="fc2"><label>Priority *</label><select v-model="pForm.priority"><option>Critical</option><option>High</option><option>Medium</option><option>Low</option></select></div>
          <div class="fc2 ff"><label>Project Name *</label><input v-model="pForm.name" placeholder="Project name"></div>
          <div class="fc2"><label>Category</label><select v-model="pForm.cat"><option>Research</option><option>Software Development</option></select></div>
          <div class="fc2"><label>Department</label><select v-model="pForm.dept"><option value="SE">Software Engineering</option><option value="AI">AI</option></select></div>
          <div class="fc2"><label>Start Date</label><input type="date" v-model="pForm.start"></div>
          <div class="fc2"><label>End Date</label><input type="date" v-model="pForm.end"></div>
          <div class="fc2"><label>Budget ($)</label><input type="number" v-model="pForm.budget"></div>
        </div>
      </div>
      <div class="mf">
        <button class="btn btn-gh" @click="showProjModal = false">Cancel</button>
        <button class="btn btn-ai" @click="aiValidate">AI Validate</button>
        <button class="btn btn-p" @click="createProject">Create Project</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useAuth, useProjects } from '@/composables/useAppState'

const { auth } = useAuth()
const { projects, pf, filteredProjs, showProjModal, pForm, createProject, viewProj, editProj, aiHealth, aiOptimize, aiValidate } = useProjects()
</script>