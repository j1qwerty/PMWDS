<template>
  <div class="ph">
    <div class="ph-t">
      <h2>Notifications</h2>
      <p>{{ notifCount }} unread · System alerts, escalations & AI insights</p>
    </div>
    <div class="ph-a">
      <button class="btn btn-o btn-s" @click="markAllRead">Mark All Read</button>
      <button class="btn btn-err btn-s">Clear All</button>
    </div>
  </div>

  <div class="card">
    <div class="ch">
      <h3>All Notifications</h3>
    </div>
    <div class="nl">
      <div v-for="n in notifications" :key="n.id" class="nitem" :class="{ unr: !n.read }" @click="readNotif(n)">
        <div class="nico" :style="{ background: n.bg }">{{ n.icon }}</div>
        <div class="nb2">
          <div class="nt">{{ n.title }}</div>
          <div class="nm">{{ n.msg }}</div>
          <div style="display:flex;align-items:center;gap:8px">
            <span class="ntime">{{ n.time }}</span>
            <span v-if="n.ai" class="bdg b-ai" style="font-size:10px">AI Generated</span>
            <span class="bdg" :class="n.type === 'Escalation' ? 'b-err' : n.type === 'Deadline' ? 'b-warn' : 'b-p'" style="font-size:10px">{{ n.type }}</span>
          </div>
        </div>
        <div v-if="!n.read" class="ndot"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useNotifications } from '@/composables/useAppState'

const { notifications, notifCount, readNotif, markAllRead } = useNotifications()
</script>