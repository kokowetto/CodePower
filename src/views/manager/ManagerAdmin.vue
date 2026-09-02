<template>
  <div class="min-h-screen bg-gray-100">
    <Navbar />
    <div class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div class="bg-white rounded-xl shadow overflow-hidden">
        <div class="border-b border-gray-200">
          <nav class="-mb-px flex">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              @click="currentTab = tab.id"
              :class="[
                currentTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                'whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm focus:outline-none'
              ]"
            >
              {{ tab.name }}
            </button>
          </nav>
        </div>
        <div class="p-6">
          <component :is="currentComponent" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import Navbar from '../../components/Navbar.vue'
import ApprovalTab from './ApprovalTab.vue'
import UsersTab from './UsersTab.vue'
import DictionariesTab from './DictionariesTab.vue'
import MailTemplateTab from './MailTemplateTab.vue'

const tabs = [
  { id: 'approval', name: '审批中心', component: ApprovalTab },
  { id: 'users', name: '成员账号管理', component: UsersTab },
  { id: 'dictionaries', name: '基础字典维护', component: DictionariesTab },
  { id: 'mail', name: '邮件模板配置', component: MailTemplateTab },
]

const currentTab = ref('approval')

const currentComponent = computed(() => {
  const tab = tabs.find(t => t.id === currentTab.value)
  return tab ? tab.component : null
})
</script>
