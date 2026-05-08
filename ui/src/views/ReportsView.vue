<template>
  <div class="ph">
    <div class="ph-t">
      <h2>Reports & Analytics</h2>
      <p>Generate PDF/Excel reports · AI-narrated insights</p>
    </div>
    <div class="ph-a">
      <button class="btn btn-p btn-s" @click="generateReport">Generate Report</button>
      <button class="btn btn-ai btn-s" @click="aiNarrate">AI Narrate</button>
    </div>
  </div>

  <div class="rep-grid">
    <!-- Report Type Selector -->
    <div class="card">
      <div class="ch"><h3>Report Type</h3></div>
      <div class="cb">
        <div class="rep-type">
          <div v-for="r in reportTypes" :key="r.id" class="rep-opt" :class="{ sel: rep.type === r.id }" @click="rep.type = r.id">{{ r.icon }} {{ r.label }}</div>
        </div>
        <div style="margin-top:16px">
          <div class="fc2" style="margin-bottom:10px">
            <label>Format</label>
            <select class="fsel" v-model="rep.format" style="width:100%">
              <option value="pdf">PDF</option>
              <option value="excel">Excel</option>
              <option value="csv">CSV</option>
            </select>
          </div>
          <div class="fc2" style="margin-bottom:10px">
            <label>Department</label>
            <select class="fsel" v-model="rep.dept" style="width:100%">
              <option value="">All Departments</option>
              <option value="SE">Software Engineering</option>
              <option value="AI">AI Research</option>
            </select>
          </div>
          <div class="fr">
            <div class="fc2"><label>From</label><input type="date" v-model="rep.from"></div>
            <div class="fc2"><label>To</label><input type="date" v-model="rep.to"></div>
          </div>
          <button class="btn btn-p" style="width:100%;margin-top:14px" @click="generateReport">Generate {{ rep.format.toUpperCase() }}</button>
          <button class="btn btn-ai" style="width:100%;margin-top:8px" @click="aiNarrate">AI Narrated Report</button>
        </div>
      </div>
    </div>

    <!-- Report Preview -->
    <div class="card">
      <div class="ch">
        <h3>Report Preview — {{ reportTypes.find(r => r.id === rep.type)?.label }}</h3>
        <span class="bdg b-ok">{{ new Date().toLocaleDateString() }}</span>
      </div>
      <div class="cb">
        <div v-if="rep.narration" class="alert a-inf" style="margin-top:14px">
          <strong>AI Narration:</strong> {{ rep.narration }}
        </div>
        <div v-else style="color:var(--mx);text-align:center;padding:40px">
          Select a report type and click "Generate" to preview
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useReports } from '@/composables/useAppState'

const { rep, reportTypes, generateReport, aiNarrate } = useReports()
</script>