<template>
  <div class="ph">
    <div class="ph-t">
      <h2>Departments</h2>
      <p>Manage university departments and their project portfolios</p>
    </div>
    <div class="ph-a">
      <button class="btn btn-p" @click="showDeptModal = true">+ New Department</button>
    </div>
  </div>

  <div class="ga">
    <div v-for="d in departments" :key="d.id" class="card" style="cursor:pointer;transition:var(--tr)" @click="viewDept(d)">
      <div class="ch">
        <div>
          <h3>{{ d.icon }} {{ d.name }}</h3>
          <span class="bdg b-p" style="margin-top:3px;display:inline-block">{{ d.code }}</span>
        </div>
        <span class="bdg" :class="d.health >= 70 ? 'b-ok' : d.health >= 50 ? 'b-warn' : 'b-err'">Health: {{ d.health }}%</span>
      </div>
      <div class="cb">
        <div style="display:flex;justify-content:around;margin-bottom:14px">
          <div style="text-align:center">
            <div style="font-size:22px;font-weight:800;color:var(--primary)">{{ d.projects }}</div>
            <div style="font-size:11px;color:var(--mx)">Projects</div>
          </div>
          <div style="text-align:center">
            <div style="font-size:22px;font-weight:800;color:var(--ok)">{{ d.members }}</div>
            <div style="font-size:11px;color:var(--mx)">Members</div>
          </div>
          <div style="text-align:center">
            <div style="font-size:22px;font-weight:800;color:var(--gold)">{{ d.budget }}K</div>
            <div style="font-size:11px;color:var(--mx)">Budget ($)</div>
          </div>
        </div>
        <div style="margin-bottom:8px">
          <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px"><span>Budget Used</span><span :style="{ color: d.budgetUsed > 90 ? 'var(--err)' : d.budgetUsed > 70 ? 'var(--warn)' : 'var(--ok)', fontWeight: '700' }">{{ d.budgetUsed }}%</span></div>
          <div class="pw"><div class="pb" :class="d.budgetUsed > 90 ? 'r' : d.budgetUsed > 70 ? 'y' : 'g'" :style="{ width: d.budgetUsed + '%' }"></div></div>
        </div>
        <div style="display:flex;gap:6px">
          <button class="btn btn-s btn-o" style="flex:1">Dashboard</button>
          <button class="btn btn-s btn-gold">✏ Edit</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useDepartments } from '@/composables/useAppState'

const { departments, showDeptModal, viewDept } = useDepartments()
</script>