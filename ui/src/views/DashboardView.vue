<template>
  <div class="ph">
    <div class="ph-t">
      <h2>Good Morning, {{ auth.user.fullName.split(' ')[0] }}</h2>
      <p>{{ today }} · AI Health Score: <strong style="color:var(--ok)">{{ dash.health }}%</strong></p>
    </div>
    <div class="ph-a">
      <button class="btn btn-ai btn-s" @click="refreshDash">AI Refresh</button>
      <button class="btn btn-gold btn-s" @click="go('reports')">Reports</button>
      <button class="btn btn-p btn-s" @click="go('projects')">+ New Project</button>
    </div>
  </div>

  <!-- ESCALATION BANNER -->
  <div class="esc-ban" v-if="dash.escalated > 0">
    <strong>{{ dash.escalated }} task(s) escalated</strong> — require immediate attention.
    <button class="btn btn-s btn-err" style="margin-left:auto" @click="go('tasks')">View Tasks</button>
  </div>

  <!-- KPI CARDS -->
  <div class="kgrid">
    <div v-for="k in kpis" :key="k.label" class="kpi" :class="k.col" @click="go(k.nav)">
      <div class="kpi-top">
        <div class="kico" :class="k.col">{{ k.icon }}</div>
        <span class="ktr" :class="k.up ? 'up' : 'dn'">{{ k.up ? '▲' : '▼' }} {{ Math.abs(k.trend) }}%</span>
      </div>
      <div class="kval">{{ k.val }}</div>
      <div class="klbl">{{ k.label }}</div>
      <div class="ksub">{{ k.sub }}</div>
    </div>
  </div>

  <!-- API LOG -->
  <div class="alog" style="margin-bottom:18px">
    <div class="alt"><span class="adot"></span>Dashboard API</div>
    <pre><span class="m">GET</span> <span class="u">/api/v1/projects/dashboard?departmentId={{ auth.user.deptId }}</span>
Authorization: Bearer <span class="v">{{ auth.token.substr(0,24) }}...</span>
→ <span class="k">totalProjects</span>→<span class="v">KPI</span> | <span class="k">activeProjects</span>→<span class="v">KPI</span> | <span class="k">budgetVariance</span>→<span class="v">Budget KPI color</span>
    <span class="k">overallHealthScore</span>→<span class="v">Donut</span> | <span class="k">highRiskProjects[]</span>→<span class="v">At-Risk table</span></pre>
  </div>

  <div class="g2">
    <!-- TREND CHART -->
    <div class="card">
      <div class="ch">
        <h3>Task Completion Trend (30 Days)</h3>
        <span class="bdg bok">● Live</span>
      </div>
      <div class="cb"><canvas id="trendChart" height="190"></canvas></div>
    </div>

    <!-- HEALTH DONUT -->
    <div class="card">
      <div class="ch">
        <h3>Project Health</h3>
        <button class="btn btn-ai btn-s" @click="fetchHealth">Analyse</button>
      </div>
      <div class="cb">
        <div class="dw" style="margin-bottom:16px">
          <canvas id="donutChart" width="130" height="130"></canvas>
          <div class="dc">
            <div class="dv">{{ dash.health }}%</div>
            <div class="dl">Health</div>
          </div>
        </div>
        <div v-for="h in healthBars" :key="h.lbl" class="hi">
          <div class="ht"><span>{{ h.lbl }}</span><span :style="{ color: h.v >= 70 ? 'var(--ok)' : h.v >= 50 ? 'var(--warn)' : 'var(--err)' }">{{ h.v }}%</span></div>
          <div class="pw"><div class="pb" :class="h.v >= 70 ? 'g' : h.v >= 50 ? 'y' : 'r'" :style="{ width: h.v + '%' }"></div></div>
        </div>
      </div>
    </div>
  </div>

  <div class="g2">
    <!-- AT-RISK -->
    <div class="card">
      <div class="ch">
        <h3>At-Risk Projects</h3>
        <span class="bdg berr">{{ atRisk.length }} Critical</span>
      </div>
      <div class="tw">
        <table>
          <thead><tr><th>Code</th><th>Project</th><th>Progress</th><th>Risk</th><th>Action</th></tr></thead>
          <tbody>
            <tr v-for="p in atRisk" :key="p.id">
              <td><span class="bdg b-p">{{ p.code }}</span></td>
              <td><strong>{{ p.name }}</strong></td>
              <td style="min-width:90px">
                <div class="pw"><div class="pb" :class="p.prog >= 70 ? 'g' : p.prog >= 40 ? 'y' : 'r'" :style="{ width: p.prog + '%' }"></div></div>
                <small style="color:var(--mx)">{{ p.prog }}%</small>
              </td>
              <td><span class="rb" :class="p.risk > 80 ? 'rc' : p.risk > 60 ? 'rh' : p.risk > 40 ? 'rm' : 'rl'">{{ p.risk }}%</span></td>
              <td><button class="btn btn-s btn-err" @click="escalate(p)">Escalate</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- WORKLOAD -->
    <div class="card">
      <div class="ch">
        <h3>Team Workload</h3>
        <button class="btn btn-s btn-o" @click="fetchWL">↻</button>
      </div>
      <div class="cb">
        <div v-for="w in workload" :key="w.name" style="margin-bottom:13px">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px">
            <div style="display:flex;align-items:center;gap:7px">
              <div class="av">{{ w.name[0] }}</div>
              <span style="font-weight:600;font-size:13px">{{ w.name }}</span>
              <span class="bdg b-gr" style="font-size:10px">{{ w.role }}</span>
            </div>
            <span :style="{ color: w.load > 80 ? 'var(--err)' : w.load > 60 ? 'var(--warn)' : 'var(--ok)', fontWeight: '700', fontSize: '13px' }">{{ w.load }}%</span>
          </div>
          <div class="pw"><div class="pb" :class="w.load > 80 ? 'r' : w.load > 60 ? 'y' : 'g'" :style="{ width: w.load + '%' }"></div></div>
          <div style="font-size:11px;color:var(--mx);margin-top:2px">{{ w.tasks }} tasks · Burnout: {{ w.burnout }}%</div>
        </div>
      </div>
    </div>
  </div>

  <!-- BUDGET OVERVIEW -->
  <div class="card">
    <div class="ch">
      <h3>Budget Overview</h3>
      <span class="bdg b-gd">FY 2025</span>
    </div>
    <div class="cb"><canvas id="budgetChart" height="120"></canvas></div>
  </div>
</template>

<script setup>
import { onMounted, nextTick } from 'vue'
import { useAuth, useNavigation, useDashboard } from '@/composables/useAppState'

const { auth } = useAuth()
const { today, go } = useNavigation()
const { dash, kpis, healthBars, atRisk, workload, refreshDash, fetchHealth, fetchWL, escalate } = useDashboard()

onMounted(() => {
  // Charts would be initialized here with Chart.js
})
</script>