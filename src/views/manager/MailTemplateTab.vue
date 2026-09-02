<template>
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
    <!-- Form -->
    <div class="space-y-4">
      <h3 class="text-lg font-medium text-gray-900">模板配置</h3>
      <div>
        <label class="block text-sm font-medium text-gray-700">收件人 (To)</label>
        <input type="text" v-model="form.recipientEmail" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500">
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700">抄送 (Cc)</label>
        <input type="text" v-model="form.ccEmail" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500">
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700">邮件主题 (Subject)</label>
        <input type="text" v-model="form.subject" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500">
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700">邮件正文 (Body)</label>
        <textarea v-model="form.bodyTemplate" rows="10" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"></textarea>
      </div>
      <div class="flex items-center gap-4">
        <button @click="saveTemplate" :disabled="saving" class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm font-medium disabled:opacity-50">
          {{ saving ? '保存中...' : '保存配置' }}
        </button>
        <span v-if="saveMsg" :class="saveError ? 'text-red-500' : 'text-green-500'" class="text-sm">{{ saveMsg }}</span>
      </div>

      <div class="bg-gray-50 p-4 rounded-md mt-6 border border-gray-200">
        <h4 class="text-sm font-medium text-gray-700 mb-2">可用变量 (点击复制)</h4>
        <div class="flex flex-wrap gap-2">
          <button v-for="v in variables" :key="v.name" @click="copyVar(v.name)" class="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            {{ v.name }} - {{ v.desc }}
          </button>
        </div>
      </div>
    </div>

    <!-- Preview -->
    <div>
      <h3 class="text-lg font-medium text-gray-900 mb-4">实时预览</h3>
      <div class="border border-gray-200 rounded-lg p-6 bg-white shadow-sm space-y-4">
        <div class="border-b pb-4">
          <div class="text-sm"><span class="font-medium text-gray-500 w-12 inline-block">To:</span> {{ form.recipientEmail }}</div>
          <div class="text-sm"><span class="font-medium text-gray-500 w-12 inline-block">Cc:</span> {{ form.ccEmail }}</div>
          <div class="text-sm mt-2"><span class="font-medium text-gray-500 w-12 inline-block">主题:</span> {{ previewSubject }}</div>
        </div>
        <div class="whitespace-pre-wrap text-sm text-gray-800 font-sans" style="min-height: 200px;">
          {{ previewBody }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { get, put } from '../../utils/request'

const form = ref({
  recipientEmail: '',
  ccEmail: '',
  subject: '',
  bodyTemplate: ''
})

const saving = ref(false)
const saveMsg = ref('')
const saveError = ref(false)

const variables = [
  { name: '${applicantName}', desc: '申请人姓名', mock: '张三' },
  { name: '${applicantEmail}', desc: '申请人邮箱', mock: 'zhangsan@corp.com' },
  { name: '${projectName}', desc: '项目名称', mock: 'CodePower' },
  { name: '${credits}', desc: '申请额度', mock: '100' },
  { name: '${finalReason}', desc: '申请理由', mock: '日常开发使用' },
  { name: '${applyTime}', desc: '申请时间', mock: '2023-10-01 12:00:00' },
  { name: '${managerName}', desc: '审批经理', mock: '李经理' },
]

const replaceVars = (text: string) => {
  if (!text) return ''
  let res = text
  variables.forEach(v => {
    res = res.split(v.name).join(v.mock)
  })
  return res
}

const previewSubject = computed(() => replaceVars(form.value.subject))
const previewBody = computed(() => replaceVars(form.value.bodyTemplate))

const fetchData = async () => {
  try {
    const data = await get('/manager/mail-template')
    form.value.recipientEmail = data.recipient_email || data.recipientEmail || ''
    form.value.ccEmail = data.cc_email || data.ccEmail || ''
    form.value.subject = data.subject || ''
    form.value.bodyTemplate = data.body_template || data.bodyTemplate || ''
  } catch (e) {
    console.error(e)
  }
}

onMounted(() => {
  fetchData()
})

const copyVar = (text: string) => {
  navigator.clipboard.writeText(text)
}

const saveTemplate = async () => {
  saving.value = true
  saveMsg.value = ''
  try {
    await put('/manager/mail-template', form.value)
    saveError.value = false
    saveMsg.value = '保存成功'
    setTimeout(() => saveMsg.value = '', 3000)
  } catch (err: any) {
    saveError.value = true
    saveMsg.value = err.message || '保存失败'
  } finally {
    saving.value = false
  }
}
</script>
