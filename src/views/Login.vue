<template>
  <div class="min-h-screen bg-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full bg-white rounded-xl shadow-xl p-8">
      <div class="text-center mb-8">
        <h2 class="text-3xl font-extrabold text-gray-900">⚡ CodePower 码力加</h2>
        <p class="mt-2 text-sm text-gray-600">集团 GitHub Copilot 额度申领平台</p>
      </div>
      <form class="space-y-6" @submit.prevent="handleLogin">
        <div>
          <label for="username" class="block text-sm font-medium text-gray-700">域账号邮箱</label>
          <input id="username" v-model="form.username" type="text" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500">
        </div>
        <div>
          <label for="password" class="block text-sm font-medium text-gray-700">密码</label>
          <input id="password" v-model="form.password" type="password" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500">
        </div>
        <div v-if="error" class="text-red-600 text-sm text-center">
          {{ error }}
        </div>
        <button type="submit" :disabled="loading" class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50">
          {{ loading ? '登录中...' : '登录' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { post } from '../utils/request'

const router = useRouter()
const form = ref({ username: '', password: '' })
const loading = ref(false)
const error = ref('')

const handleLogin = async () => {
  loading.value = true
  error.value = ''
  try {
    const res = await post('/auth/login', form.value)
    localStorage.setItem('cp_token', res.token)
    localStorage.setItem('cp_user', JSON.stringify(res.user))
    
    if (res.user.role === 'manager') {
      router.push('/admin')
    } else {
      router.push('/apply')
    }
  } catch (err: any) {
    error.value = err.message || '登录失败'
  } finally {
    loading.value = false
  }
}
</script>
