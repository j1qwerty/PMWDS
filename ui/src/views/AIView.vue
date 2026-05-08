<template>
  <div class="ph">
    <div class="ph-t">
      <h2>AI Assistant & Analytics</h2>
      <p>Powered by GPT-4o · ML.NET Delay Prediction · Smart Task Allocation</p>
    </div>
    <div class="ph-a">
      <button class="btn btn-ai btn-s" @click="trainModel">Retrain Models</button>
      <button class="btn btn-gold btn-s" @click="go('reports')">AI Report</button>
    </div>
  </div>

  <div class="g2">
    <!-- AI CHAT -->
    <div class="card">
      <div class="ch">
        <h3>AI Chat Assistant</h3>
        <span class="bdg b-ok">● Online · GPT-4o</span>
      </div>
      <div class="cb">
        <div class="chat">
          <div v-for="(m, i) in chatMsgs" :key="i" class="msg" :class="m.role">
            <div class="mb">{{ m.text }}</div>
            <div class="mt">{{ m.time }}</div>
          </div>
          <div v-if="ai.typing" class="msg ai">
            <div class="mb" style="color:var(--mx)">Thinking<span class="dots">...</span></div>
          </div>
        </div>
        <div class="cir">
          <div class="ciw"><span>💬</span><input v-model="ai.input" placeholder="Ask about projects, risks, workload..." @keyup.enter="sendChat"></div>
          <button class="btn btn-ai" @click="sendChat">Send</button>
        </div>
        <div class="chips">
          <span class="chip" @click="quickChat('Which tasks are at highest risk of delay?')">Delay Risks</span>
          <span class="chip" @click="quickChat('Who is overloaded this week?')">Overload</span>
          <span class="chip" @click="quickChat('Summarize project health')">Health</span>
          <span class="chip" @click="quickChat('Recommend task assignments')">Assign</span>
        </div>
      </div>
    </div>

    <!-- AI SCORES -->
    <div style="display:flex;flex-direction:column;gap:16px">
      <div class="card">
        <div class="ch">
          <h3>AI Model Performance</h3>
          <span class="bdg b-ai">v2.4.1</span>
        </div>
        <div class="cb">
          <div class="ring-wrap">
            <div v-for="r in aiMetrics" :key="r.label" class="ring-item">
              <div class="ring" :style="{ background: r.val >= 80 ? 'var(--ok)' : r.val >= 60 ? 'var(--warn)' : 'var(--err)' }">{{ r.val }}%</div>
              <div class="ring-lbl">{{ r.label }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="ch">
          <h3>Live AI Insights</h3>
          <button class="btn btn-s btn-ai" @click="refreshInsights">↻ Refresh</button>
        </div>
        <div class="cb" style="padding:10px">
          <div v-for="ins in aiInsights" :key="ins.id" style="padding:10px;border-radius:10px;margin-bottom:8px;border-left:3px solid" :style="{ borderColor: ins.sev === 'High' ? 'var(--err)' : ins.sev === 'Medium' ? 'var(--warn)' : 'var(--ok)', background: ins.sev === 'High' ? '#fde8ea' : ins.sev === 'Medium' ? '#fff3cd' : '#d4edda' }">
            <div style="font-weight:700;font-size:13px;margin-bottom:3px">{{ ins.icon }} {{ ins.title }}</div>
            <div style="font-size:12px;color:var(--mx)">{{ ins.msg }}</div>
            <div style="display:flex;justify-content:space-between;margin-top:5px">
              <span class="rb" :class="ins.sev === 'High' ? 'rh' : ins.sev === 'Medium' ? 'rm' : 'rl'" style="font-size:10px">{{ ins.sev }}</span>
              <span style="font-size:11px;color:var(--mx)">{{ ins.time }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- AI PREDICTION TABLE -->
  <div class="card">
    <div class="ch">
      <h3>Delay Prediction — All Active Tasks</h3>
      <span class="bdg b-ai">ML.NET FastTree Model</span>
    </div>
    <div class="tw">
      <table>
        <thead><tr><th>Task</th><th>Project</th><th>Assignee</th><th>Due Date</th><th>Delay Prob.</th><th>Risk</th></tr></thead>
        <tbody>
          <tr v-for="p in aiPredictions" :key="p.id">
            <td><strong>{{ p.task }}</strong></td>
            <td><span class="bdg b-p" style="font-size:10px">{{ p.proj }}</span></td>
            <td><div style="display:flex;align-items:center;gap:5px"><div class="av">{{ p.assignee[0] }}</div><span>{{ p.assignee }}</span></div></td>
            <td style="font-size:12px">{{ p.due }}</td>
            <td>
              <div class="pw" style="margin-bottom:2px"><div class="pb" :class="p.prob > 70 ? 'r' : p.prob > 40 ? 'y' : 'g'" :style="{ width: p.prob + '%' }"></div></div>
              <strong :style="{ color: p.prob > 70 ? 'var(--err)' : p.prob > 40 ? 'var(--warn)' : 'var(--ok)' }">{{ p.prob }}%</strong>
            </td>
            <td><span class="rb" :class="p.risk === 'Critical' ? 'rc' : p.risk === 'High' ? 'rh' : 'rm'">{{ p.risk }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { useNavigation, useAI } from '@/composables/useAppState'

const { go } = useNavigation()
const { ai, chatMsgs, aiMetrics, aiInsights, aiPredictions, sendChat, quickChat, trainModel, refreshInsights } = useAI()
</script>