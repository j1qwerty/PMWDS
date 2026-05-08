<template>
  <div class="ph">
    <div class="ph-t">
      <h2>Team Members & Workload</h2>
      <p>Manage team availability, skills, and workload distribution</p>
    </div>
    <div class="ph-a">
      <button class="btn btn-p" @click="showUserModal = true">+ Add Member</button>
      <button class="btn btn-ai btn-s" @click="aiBurnout">Burnout Analysis</button>
      <button class="btn btn-gold btn-s" @click="go('reports')">Workload Report</button>
    </div>
  </div>

  <div class="kgrid" style="margin-bottom:18px">
    <div class="kpi bl">
      <div class="kpi-top"><div class="kico bl">👥</div><span class="ktr up">▲ 2%</span></div>
      <div class="kval">{{ teamMembers.length }}</div>
      <div class="klbl">Total Members</div>
    </div>
    <div class="kpi gr">
      <div class="kpi-top"><div class="kico gr">✓</div><span class="ktr up">▲ 5%</span></div>
      <div class="kval">{{ teamMembers.filter(m => m.status === 'Available').length }}</div>
      <div class="klbl">Available Now</div>
    </div>
    <div class="kpi rd">
      <div class="kpi-top"><div class="kico rd">⚠️</div><span class="ktr dn">▼ 1%</span></div>
      <div class="kval">{{ teamMembers.filter(m => m.load > 80).length }}</div>
      <div class="klbl">Overloaded</div>
    </div>
    <div class="kpi or">
      <div class="kpi-top"><div class="kico or">🔥</div><span class="ktr dn">▼ 3%</span></div>
      <div class="kval">{{ teamMembers.filter(m => m.burnout > 60).length }}</div>
      <div class="klbl">Burnout Risk</div>
    </div>
  </div>

  <div class="ga">
    <div v-for="m in teamMembers" :key="m.id" class="ucard">
      <div class="ucav">{{ m.name[0] }}</div>
      <div class="uc-name">{{ m.name }}</div>
      <div class="uc-role">
        <span class="bdg b-p" style="font-size:11px">{{ m.role }}</span>
        <span class="bdg" :class="m.status === 'Available' ? 'bok' : m.status === 'Busy' ? 'b-warn' : 'b-gr'" style="font-size:11px;margin-left:4px">{{ m.status }}</span>
      </div>
      <div class="uc-stats">
        <div class="uc-stat"><div class="uc-sv">{{ m.tasks }}</div><div class="uc-sl">Tasks</div></div>
        <div class="uc-stat"><div class="uc-sv">{{ m.done }}</div><div class="uc-sl">Done/Mo</div></div>
        <div class="uc-stat"><div class="uc-sv" :style="{ color: m.perf >= 80 ? 'var(--ok)' : m.perf >= 60 ? 'var(--warn)' : 'var(--err)' }">{{ m.perf }}</div><div class="uc-sl">Score</div></div>
      </div>
      <div style="margin-bottom:8px">
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px"><span style="font-weight:600">Workload</span><span :style="{ color: m.load > 80 ? 'var(--err)' : m.load > 60 ? 'var(--warn)' : 'var(--ok)', fontWeight: '700' }">{{ m.load }}%</span></div>
        <div class="pw"><div class="pb" :class="m.load > 80 ? 'r' : m.load > 60 ? 'y' : 'g'" :style="{ width: m.load + '%' }"></div></div>
      </div>
      <div style="margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px"><span style="font-weight:600">Burnout Risk</span><span :style="{ color: m.burnout > 60 ? 'var(--err)' : m.burnout > 40 ? 'var(--warn)' : 'var(--ok)', fontWeight: '700' }">{{ m.burnout }}%</span></div>
        <div class="pw"><div class="pb" :class="m.burnout > 60 ? 'r' : m.burnout > 40 ? 'y' : 'g'" :style="{ width: m.burnout + '%' }"></div></div>
      </div>
      <div style="margin-bottom:12px">
        <div style="font-size:11px;font-weight:600;margin-bottom:5px;color:var(--mx)">SKILLS</div>
        <div><span v-for="sk in m.skills" :key="sk" class="skill-chip">{{ sk }}</span></div>
      </div>
      <div style="display:flex;gap:6px">
        <button class="btn btn-s btn-o" style="flex:1" @click="viewMember(m)">View</button>
        <button class="btn btn-s btn-ai" @click="aiAssignTo(m)">Assign</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useNavigation, useTeam } from '@/composables/useAppState'

const { go } = useNavigation()
const { teamMembers, showUserModal, viewMember, aiAssignTo, aiBurnout } = useTeam()
</script>