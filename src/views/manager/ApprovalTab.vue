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
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              <div class="font-medium">{{ app.credits }} credits</div>
              <div class="text-xs text-gray-500">上限: {{ app.user_limit ?? 0 }} / 已用: {{ app.used_credits ?? 0 }}</div>
            </td>
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
              <template v-else-if="app.status === 'approved'">
                <button @click="triggerAppOutlook(app)" class="text-blue-600 hover:text-blue-900 mr-3">唤起Outlook</button>
                <button @click="copyAppMail(app)" class="text-gray-600 hover:text-gray-900">复制草稿</button>
              </template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 审批通过并唤起 Outlook 提示弹窗 -->
    <Modal :visible="showSuccessModal" title="审批通过 - Outlook 邮件拉起" @close="showSuccessModal = false">
      <div class="space-y-4 text-sm text-gray-700">
        <div class="flex items-center text-green-600 font-semibold text-base">
          <span>✓ 该单据已审批通过！系统已尝试触发打开 Outlook。</span>
        </div>
        <p class="text-gray-600 leading-relaxed">
          如果您的浏览器拦截了自动唤起，或系统尚未弹出经典版 Outlook 窗口，可点击下方按钮直接唤起，或一键复制草稿内容手动发送。
        </p>
        <div class="p-3 bg-gray-50 rounded border border-gray-200 space-y-1 text-xs">
          <div><span class="font-medium text-gray-600">收件人：</span>{{ currentMailDetail.to }}</div>
          <div v-if="currentMailDetail.cc"><span class="font-medium text-gray-600">抄送：</span>{{ currentMailDetail.cc }}</div>
          <div><span class="font-medium text-gray-600">主题：</span>{{ currentMailDetail.subject }}</div>
        </div>
      </div>
      <template #footer>
        <div class="flex flex-wrap items-center justify-end gap-2 w-full">
          <button @click="copySuccessMail" class="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm font-medium">
            一键复制草稿内容
          </button>
          <a :href="currentMailDetail.mailtoUrl" @click="showSuccessModal = false" class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium">
            直接在 Outlook 中打开 ↗
          </a>
          <button @click="showSuccessModal = false" class="px-3 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 text-sm">
            关闭
          </button>
        </div>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { get, post } from '../../utils/request'
import { launchOutlookDraft, buildMailContent, MailTemplateData } from '../../utils/outlook'
import { formatEast8DateTime } from '../../utils/date'
import Modal from '../../components/Modal.vue'

const statusOptions = [
  { label: '待审批', value: 'pending' },
  { label: '已通过', value: 'approved' },
  { label: '已拒绝', value: 'rejected' },
  { label: '全部', value: '' }
]

const currentStatus = ref('pending')
const applications = ref<any[]>([])
const cachedTemplate = ref<MailTemplateData | null>(null)

const showSuccessModal = ref(false)
const currentMailDetail = ref({ to: '', cc: '', subject: '', body: '', mailtoUrl: '' })

const fetchApplications = async () => {
  try {
    const url = currentStatus.value ? `/manager/applications?status=${currentStatus.value}` : '/manager/applications'
    applications.value = await get(url)
  } catch (e) {
    console.error(e)
  }
}

const loadTemplate = async () => {
  try {
    cachedTemplate.value = await get('/manager/mail-template')
  } catch (e) {
    console.error('Failed to load mail template:', e)
  }
}

onMounted(() => {
  fetchApplications()
  loadTemplate()
})

const getManagerName = () => {
  const userStr = localStorage.getItem('cp_user')
  return userStr ? JSON.parse(userStr).displayName : '开发经理'
}

const handleReview = async (app: any, action: 'approve' | 'reject') => {
  if (!confirm(`确定要${action === 'approve' ? '同意' : '拒绝'}该申请吗？`)) return

  try {
    const res = await post('/manager/applications/review', { applicationId: app.id, action })
    app.status = action === 'approve' ? 'approved' : 'rejected'

    if (action === 'approve') {
      if (!cachedTemplate.value) {
        await loadTemplate()
      }
      const template = (cachedTemplate.value || await get('/manager/mail-template')) as MailTemplateData
      cachedTemplate.value = template

      const approvedApp = res || app
      const managerName = getManagerName()
      const detail = buildMailContent(template, approvedApp, managerName)

      currentMailDetail.value = detail
      showSuccessModal.value = true

      try {
        launchOutlookDraft(template, approvedApp, managerName)
      } catch (e) {
        console.warn('Auto launch outlook suppressed:', e)
      }
    }
  } catch (err: any) {
    alert(err.message || '操作失败')
  }
}

const triggerAppOutlook = async (app: any) => {
  if (!cachedTemplate.value) {
    await loadTemplate()
  }
  const template = cachedTemplate.value as MailTemplateData | null
  if (!template) return
  const managerName = getManagerName()
  const detail = buildMailContent(template, app, managerName)
  currentMailDetail.value = detail
  showSuccessModal.value = true
  launchOutlookDraft(template, app, managerName)
}

const copyAppMail = async (app: any) => {
  if (!cachedTemplate.value) {
    await loadTemplate()
  }
  const template = cachedTemplate.value as MailTemplateData | null
  if (!template) return
  const managerName = getManagerName()
  const detail = buildMailContent(template, app, managerName)
  const text = `收件人: ${detail.to}\n抄送: ${detail.cc}\n主题: ${detail.subject}\n\n正文:\n${detail.body}`
  navigator.clipboard.writeText(text)
  alert('草稿内容已复制到剪贴板！')
}

const copySuccessMail = () => {
  const d = currentMailDetail.value
  const text = `收件人: ${d.to}\n抄送: ${d.cc}\n主题: ${d.subject}\n\n正文:\n${d.body}`
  navigator.clipboard.writeText(text)
  alert('草稿内容已复制到剪贴板！')
}

const formatDate = (dateStr: string) => {
  return formatEast8DateTime(dateStr)
}
</script>
