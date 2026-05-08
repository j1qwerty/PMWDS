<template>
  <div id="app">
    <!-- LOGIN PAGE -->
    <div v-if="!auth.isLoggedIn" class="lp">
      <div class="lc">
        <div class="ll">
          <div class="ico">🎓</div>
          <h1>PMWDS 2.0 University Portal</h1>
          <p>AI-Powered Project Monitoring & Work Distribution System</p>
        </div>
        <div v-if="login.error" class="alert a-err">{{ login.error }}</div>
        <div v-if="login.success" class="alert a-ok">{{ login.success }}</div>
        
        <div class="fg">
          <label>University Email</label>
          <input class="fc" :class="{ err: login.eErr }" type="email" v-model="loginForm.email" placeholder="you@university.edu" @blur="valEmail">
          <small v-if="login.eErr" style="color:var(--err);font-size:11px">Enter a valid email</small>
        </div>
        <div class="fg">
          <label>Password</label>
          <input class="fc" :class="{ err: login.pErr }" type="password" v-model="loginForm.password" placeholder="••••••••" @keyup.enter="doLogin">
          <small v-if="login.pErr" style="color:var(--err);font-size:11px">Password required</small>
        </div>
        <div class="rem">
          <input type="checkbox" v-model="loginForm.remember" id="rem">
          <label for="rem">Remember me for 8 hours</label>
        </div>
        <button class="btn btn-p" @click="doLogin" :disabled="login.loading">
          <span v-if="login.loading">⏳</span>{{ login.loading ? 'Authenticating...' : 'Sign In' }}
        </button>
        <div class="div">or continue with</div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-o" style="flex:1;font-size:12px" @click="ssoLogin">University SSO</button>
          <button class="btn btn-gh" style="flex:1;font-size:12px">LDAP Login</button>
        </div>
      </div>
    </div>

    <!-- APP SHELL -->
    <div v-else class="app">
      <!-- SIDEBAR -->
      <nav class="sb" :class="{ col: sb.col }">
        <div class="sb-brand">
          <div class="sb-ico">🎓</div>
          <div class="sb-txt">
            <h2>PMWDS 2.0</h2>
            <p>University Edition</p>
          </div>
        </div>
        <div class="sb-nav">
          <div class="sb-sec">Main Menu</div>
          <div v-for="item in nav" :key="item.id" class="ni" :class="{ act: pg === item.id }" @click="go(item.id)">
            <span class="n-ico">{{ item.icon }}</span>
            <span class="n-lbl">{{ item.label }}</span>
            <span v-if="item.badge" class="nb">{{ item.badge }}</span>
          </div>
          <div class="sb-sec" style="margin-top:8px">AI Tools</div>
          <div v-for="item in aiNav" :key="item.id" class="ni" :class="{ act: pg === item.id }" @click="go(item.id)">
            <span class="n-ico">{{ item.icon }}</span>
            <span class="n-lbl">{{ item.label }}</span>
          </div>
        </div>
        <div class="sb-foot">
          <div class="ni" @click="logout"><span class="n-ico">🚪</span><span class="n-lbl">Logout</span></div>
        </div>
      </nav>

      <!-- MAIN -->
      <div class="main">
        <!-- HEADER -->
        <header class="hdr">
          <button class="h-tog" @click="sb.col = !sb.col">☰</button>
          <div class="h-br">
            <span>University</span>
            <span style="color:var(--bdr)">›</span>
            <span class="cur">{{ pgLabel }}</span>
          </div>
          <div class="h-sp"></div>
          <div class="h-srch"><span>🔍</span><input v-model="hdr.q" placeholder="Search projects, tasks..."></div>
          <div class="h-acts">
            <button class="ib" @click="go('notifications')" title="Notifications">
              <span class="bdg" v-if="notifCount > 0">{{ notifCount }}</span>
            </button>
            <button class="ib" @click="go('ai')" title="AI Assistant">🤖</button>
            <button class="ib" title="Settings">⚙️</button>
            <div class="um">
              <div class="uav">{{ auth.user.ini }}</div>
              <div class="ui">
                <h4>{{ auth.user.fullName }}</h4>
                <p>{{ auth.user.role }}</p>
              </div>
            </div>
          </div>
        </header>

        <!-- PAGE CONTENT -->
        <div class="pg">
          <DashboardView v-if="pg === 'dashboard'" />
          <ProjectsView v-else-if="pg === 'projects'" />
          <TasksView v-else-if="pg === 'tasks'" />
          <TeamView v-else-if="pg === 'team'" />
          <NotificationsView v-else-if="pg === 'notifications'" />
          <AIView v-else-if="pg === 'ai'" />
          <ReportsView v-else-if="pg === 'reports'" />
          <DepartmentsView v-else-if="pg === 'departments'" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, nextTick } from 'vue'
import {
  useAuth,
  useNavigation,
  useNotifications
} from '@/composables/useAppState'
import DashboardView from '@/views/DashboardView.vue'
import ProjectsView from '@/views/ProjectsView.vue'
import TasksView from '@/views/TasksView.vue'
import TeamView from '@/views/TeamView.vue'
import NotificationsView from '@/views/NotificationsView.vue'
import AIView from '@/views/AIView.vue'
import ReportsView from '@/views/ReportsView.vue'
import DepartmentsView from '@/views/DepartmentsView.vue'

const auth = useAuth().auth
const loginForm = useAuth().loginForm
const login = useAuth().login
const { pg, sb, hdr, nav, aiNav, pgLabel, go } = useNavigation()
const { notifCount } = useNotifications()
const { valEmail, doLogin, ssoLogin, logout } = useAuth()

onMounted(() => {
  if (auth.value.isLoggedIn) {
    nextTick(() => {
      // init charts if needed
    })
  }
})
</script>

<style>
@import './assets/styles/variables.css';
@import './assets/styles/components.css';
@import './assets/styles/layout.css';
@import './assets/styles/cards.css';
@import './assets/styles/modals.css';
</style>