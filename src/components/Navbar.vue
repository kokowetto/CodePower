<template>
  <nav class="bg-blue-600 shadow-sm text-white">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between h-16">
        <div class="flex items-center">
          <span class="text-xl font-bold">⚡ CodePower</span>
          <span class="ml-2 text-xs bg-blue-700 px-2 py-0.5 rounded text-blue-100 font-mono">v1.1</span>
        </div>
        <div class="flex items-center">
          <div class="relative">
            <button @click="isDropdownOpen = !isDropdownOpen" class="flex items-center gap-2 focus:outline-none">
              <span>{{ user?.displayName || user?.username }}</span>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
            </button>
            <div v-if="isDropdownOpen" class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 text-gray-700 z-10 border border-gray-200">
              <button @click="openPasswordModal" class="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100">修改密码</button>
              <button @click="logout" class="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 text-red-600">退出登录</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Password Modal -->
    <Modal :visible="isPasswordModalOpen" title="修改密码" @close="closePasswordModal">
      <div class="space-y-4 text-black">
        <div>
          <label class="block text-sm font-medium text-gray-700">旧密码</label>
          <input type="password" v-model="passwordForm.oldPassword" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">新密码</label>
          <input type="password" v-model="passwordForm.newPassword" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500">
        </div>
        <div v-if="pwdError" class="text-red-500 text-sm">{{ pwdError }}</div>
        <div v-if="pwdSuccess" class="text-green-500 text-sm">密码修改成功！</div>
      </div>
      <template #footer>
        <button @click="closePasswordModal" class="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">取消</button>
        <button @click="submitPasswordChange" :disabled="isChanging" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
          {{ isChanging ? '提交中...' : '确认修改' }}
        </button>
      </template>
    </Modal>
  </nav>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { post } from '../utils/request'
import Modal from './Modal.vue'

const router = useRouter()
const user = ref<any>(null)
const isDropdownOpen = ref(false)
const isPasswordModalOpen = ref(false)

const passwordForm = ref({ oldPassword: '', newPassword: '' })
const isChanging = ref(false)
const pwdError = ref('')
const pwdSuccess = ref(false)

onMounted(() => {
  const userStr = localStorage.getItem('cp_user')
  if (userStr) {
    user.value = JSON.parse(userStr)
  }
  document.addEventListener('click', closeDropdown)
})

onUnmounted(() => {
  document.removeEventListener('click', closeDropdown)
})

const closeDropdown = (e: Event) => {
  const target = e.target as HTMLElement
  if (!target.closest('.relative')) {
    isDropdownOpen.value = false
  }
}

const logout = () => {
  localStorage.removeItem('cp_token')
  localStorage.removeItem('cp_user')
  router.push('/login')
}

const openPasswordModal = () => {
  isPasswordModalOpen.value = true
  isDropdownOpen.value = false
  passwordForm.value = { oldPassword: '', newPassword: '' }
  pwdError.value = ''
  pwdSuccess.value = false
}

const closePasswordModal = () => {
  isPasswordModalOpen.value = false
}

const submitPasswordChange = async () => {
  if (!passwordForm.value.oldPassword || !passwordForm.value.newPassword) {
    pwdError.value = '请填写完整'
    return
  }
  isChanging.value = true
  pwdError.value = ''
  try {
    await post('/auth/change-password', passwordForm.value)
    pwdSuccess.value = true
    setTimeout(() => {
      closePasswordModal()
      logout() // Typically re-login after password change
    }, 1500)
  } catch (err: any) {
    pwdError.value = err.message || '修改失败'
  } finally {
    isChanging.value = false
  }
}
</script>
