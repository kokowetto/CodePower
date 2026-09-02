<template>
  <div>
    <div class="mb-4">
      <nav class="flex space-x-4">
        <button v-for="opt in statusOptions" :key="opt.value" @click="currentStatus = opt.value; fetchApplications()"
          :class="[currentStatus === opt.value ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700', 'px-3 py-2 font-medium text-sm rounded-md']">
          {{ opt.label }}
        </button>
      </nav>
    </div>

    <div class="overflow-x-auto border border-gray-200 rounded-lg">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">申请人</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">项目名称</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">额度</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">用途理由</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">申请时间</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-if="applications.length === 0">
            <td colspan="7" class="px-6 py-4 text-center text-sm text-gray-500">暂无数据</td>
          </tr>
          <tr v-for="app in applications" :key="app.id" class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              <div>{{ app.applicant_name || app.applicantName }}</div>
              <div class="text-xs text-gray-500">{{ app.applicant_email || app.applicantEmail }}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ app.project_name || app.projectName }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ app.credits }}</td>
            <td class="px-6 py-4 text-sm text-gray-900 max-w-xs truncate" :title="app.final_reason || app.finalReason">{{ app.final_reason || app.finalReason }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ formatDate(app.created_at || app.createdAt) }}</td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span v-if="app.status === 'pending'" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">待审批</span>
              <span v-else-if="app.status === 'approved'" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">已通过</span>
              <span v-else-if="app.status === 'rejected'" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">已拒绝</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
              <template v-if="app.status === 'pending'">
                <button @click="handleReview(app, 'approve')" class="text-green-600 hover:text-green-900 mr-3">同意</button>
                <button @click="handleReview(app, 'reject')" class="text-red-600 hover:text-red-900">拒绝</button>
              </template>
              <template v-else-if="app.status === 'approved' && outLookData[app.id]">
                 <button @click="copyOutlookManual(outLookData[app.id])" class="text-blue-600 hover:text-blue-900">复制邮件内容</button>
              </template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { get, post } from '../../utils/request'
import { launchOutlookDraft } from '../../utils/outlook'

const statusOptions = [
  { label: '待审批', value: 'pending' },
  { label: '已通过', value: 'approved' },
  { label: '已拒绝', value: 'rejected' },
  { label: '全部', value: '' }
]

const currentStatus = ref('pending')
const applications = ref<any[]>([])
const outLookData = ref<Record<string, {subject: string, body: string}>>({})

const fetchApplications = async () => {
  try {
    const url = currentStatus.value ? `/manager/applications?status=${currentStatus.value}` : '/manager/applications'
    applications.value = await get(url)
  } catch (e) {
    console.error(e)
  }
}

onMounted(() => {
  fetchApplications()
})

const handleReview = async (app: any, action: 'approve' | 'reject') => {
  if (!confirm(`确定要${action === 'approve' ? '同意' : '拒绝'}该申请吗？`)) return

  try {
    const res = await post('/manager/applications/review', { applicationId: app.id, action })
    app.status = action === 'approve' ? 'approved' : 'rejected'

    if (action === 'approve') {
      const template = await get('/manager/mail-template')
      const userStr = localStorage.getItem('cp_user')
      const managerName = userStr ? JSON.parse(userStr).displayName : '开发经理'
      const approvedApp = res || app

      // 变量替换映射（用于备用复制功能）
      const applyTime = new Date(approvedApp.created_at || approvedApp.createdAt || '').toLocaleString('zh-CN', { hour12: false })
      const varMap: Record<string, string> = {
        '${applicantName}': approvedApp.applicant_name || approvedApp.applicantName || '',
        '${applicantEmail}': approvedApp.applicant_email || approvedApp.applicantEmail || '',
        '${projectName}': approvedApp.project_name || approvedApp.projectName || '',
        '${credits}': String(approvedApp.credits || ''),
        '${finalReason}': approvedApp.final_reason || approvedApp.finalReason || '',
        '${applyTime}': applyTime,
        '${managerName}': managerName,
      }
      const replaceVars = (tpl: string) =>
        Object.entries(varMap).reduce((s, [k, v]) => s.replaceAll(k, v), tpl)

      const finalSubject = replaceVars(template.subject || '')
      const finalBody = replaceVars(template.body_template || '')

      // 存入替换后内容，供手动复制兜底使用
      outLookData.value[app.id] = { subject: finalSubject, body: finalBody }

      try {
        launchOutlookDraft(template, approvedApp, managerName)
        alert('审批通过！已尝试唤起 Outlook。若邮件未弹出，可点击"复制邮件内容"手动发送。')
      } catch (e) {
        alert('审批已通过，但唤起 Outlook 失败。请点击"复制邮件内容"手动发送邮件。')
      }
    }
  } catch (err: any) {
    alert(err.message || '操作失败')
  }
}

const copyOutlookManual = (data: {subject: string, body: string}) => {
  navigator.clipboard.writeText(`主题: ${data.subject}\n\n正文:\n${data.body}`)
  alert('已复制到剪贴板')
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleString('zh-CN', { hour12: false })
}
</script>
