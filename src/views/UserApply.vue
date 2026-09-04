<template>
  <div class="min-h-screen bg-gray-100">
    <Navbar />
    <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 space-y-6">
      <!-- 申请表单卡片 -->
      <div class="bg-white rounded-xl shadow p-6">
        <h2 class="text-xl font-bold text-gray-900 mb-6">提交额度申请</h2>
        <form @submit.prevent="submitApplication" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700">项目名称</label>
              <select v-model="form.projectId" required class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border">
                <option v-for="opt in dictionaries.projects" :key="opt.id" :value="opt.id">{{ opt.name }}</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">申请额度</label>
              <select v-model="form.creditId" required class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border">
                <option v-for="opt in dictionaries.creditOptions" :key="opt.id" :value="opt.id">{{ opt.amount }} credits</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">当前个人上限 (credits)</label>
              <input type="number" v-model.number="form.userLimit" required min="0" max="50000" placeholder="0 - 50000 整数" class="mt-1 block w-full px-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">已使用量 (credits)</label>
              <input type="number" v-model.number="form.usedCredits" required min="0" max="50000" placeholder="0 - 50000 整数" class="mt-1 block w-full px-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border">
            </div>
            <div class="md:col-span-2">
              <label class="block text-sm font-medium text-gray-700">用途和申请理由</label>
              <select v-model="form.reasonId" required class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border">
                <option v-for="opt in dictionaries.reasons" :key="opt.id" :value="opt.id">{{ opt.reason_text || opt.name }}</option>
              </select>
            </div>
            <div class="md:col-span-2">
              <label class="block text-sm font-medium text-gray-700 flex justify-between">
                补充说明
                <span class="text-gray-500">{{ form.extraNotes.length }}/50</span>
              </label>
              <textarea v-model="form.extraNotes" maxlength="50" rows="2" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm border p-2"></textarea>
            </div>
          </div>
          <div class="flex items-center gap-4">
            <button type="submit" :disabled="submitting" class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50">
              {{ submitting ? '提交中...' : '提交申请' }}
            </button>
            <span v-if="submitSuccess" class="text-green-600 text-sm">申请提交成功！</span>
            <span v-if="submitError" class="text-red-600 text-sm">{{ submitError }}</span>
          </div>
        </form>
      </div>

      <!-- 我的申请记录表格 -->
      <div class="bg-white rounded-xl shadow overflow-hidden">
        <div class="px-6 py-5 border-b border-gray-200">
          <h3 class="text-lg leading-6 font-medium text-gray-900">我的申请记录</h3>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">项目名称</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">申请额度</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">上限 / 已用</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">用途及理由</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">申请时间</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-if="applications.length === 0">
                <td colspan="7" class="px-6 py-4 text-center text-sm text-gray-500">暂无数据</td>
              </tr>
              <tr v-for="app in applications" :key="app.id" class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">#{{ app.id }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ app.project_name || app.projectName }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{{ app.credits }} credits</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{{ (app.user_limit ?? app.userLimit) ?? 0 }} / {{ (app.used_credits ?? app.usedCredits) ?? 0 }}</td>
                <td class="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">{{ app.final_reason || app.finalReason }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ formatDate(app.created_at || app.createdAt) }}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span v-if="app.status === 'pending'" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">待审批</span>
                  <span v-else-if="app.status === 'approved'" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">已通过</span>
                  <span v-else-if="app.status === 'rejected'" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">已拒绝</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Navbar from '../components/Navbar.vue'
import { get, post } from '../utils/request'
import { formatEast8DateTime } from '../utils/date'

const dictionaries = ref({
  projects: [] as any[],
  creditOptions: [] as any[],
  reasons: [] as any[]
})

const form = ref({
  projectId: null,
  creditId: null,
  reasonId: null,
  extraNotes: '',
  userLimit: null as number | null,
  usedCredits: null as number | null
})

const applications = ref<any[]>([])
const submitting = ref(false)
const submitSuccess = ref(false)
const submitError = ref('')

const fetchData = async () => {
  try {
    const dictData = await get('/public/dictionaries')
    dictionaries.value = dictData
    if (dictData.projects?.length > 0) form.value.projectId = dictData.projects[0].id
    if (dictData.creditOptions?.length > 0) form.value.creditId = dictData.creditOptions[0].id
    if (dictData.reasons?.length > 0) form.value.reasonId = dictData.reasons[0].id

    const apps = await get('/applications/my')
    applications.value = apps || []
  } catch (err: any) {
    console.error('Failed to load data', err)
  }
}

onMounted(() => {
  fetchData()
})

const submitApplication = async () => {
  submitting.value = true
  submitSuccess.value = false
  submitError.value = ''
  try {
    await post('/applications/submit', form.value)
    submitSuccess.value = true
    form.value.extraNotes = ''
    form.value.userLimit = null
    form.value.usedCredits = null
    setTimeout(() => submitSuccess.value = false, 3000)
    // Refresh history
    const apps = await get('/applications/my')
    applications.value = apps || []
  } catch (err: any) {
    submitError.value = err.message || '提交失败'
  } finally {
    submitting.value = false
  }
}

const formatDate = (dateStr: string) => {
  return formatEast8DateTime(dateStr)
}
</script>
