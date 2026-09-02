<template>
  <div>
    <div class="mb-4 flex justify-between items-center">
      <h3 class="text-lg font-medium text-gray-900">成员账号管理</h3>
      <button @click="showAddModal = true" class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm font-medium">添加成员</button>
    </div>

    <div class="overflow-x-auto border border-gray-200 rounded-lg">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">姓名</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">域账号</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">创建时间</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="user in users" :key="user.id" class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ user.displayName || user.display_name }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ user.username }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ formatDate(user.createdAt || user.created_at) }}</td>
            <td class="px-6 py-4 whitespace-nowrap">
              <label v-if="user.id !== currentUserId" class="inline-flex items-center cursor-pointer">
                <input type="checkbox" :checked="user.isActive || user.is_active === 1" @change="toggleStatus(user)" class="sr-only peer">
                <div class="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
              <span v-else class="text-xs text-gray-400">当前账号</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
              <button @click="resetPassword(user)" class="text-red-600 hover:text-red-900">重置密码</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Add User Modal -->
    <Modal :visible="showAddModal" title="添加成员" @close="closeAddModal">
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700">姓名</label>
          <input type="text" v-model="addForm.displayName" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">域账号邮箱</label>
          <input type="text" v-model="addForm.username" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500">
        </div>
        <div v-if="addError" class="text-red-500 text-sm">{{ addError }}</div>
      </div>
      <template #footer>
        <button @click="closeAddModal" class="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">取消</button>
        <button @click="submitAddUser" :disabled="isAdding" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">确认添加</button>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { get, post } from '../../utils/request'
import Modal from '../../components/Modal.vue'

const users = ref<any[]>([])
const showAddModal = ref(false)
const addForm = ref({ username: '', displayName: '' })
const isAdding = ref(false)
const addError = ref('')

const currentUserId = computed(() => {
  const userStr = localStorage.getItem('cp_user')
  return userStr ? JSON.parse(userStr).id : null
})

const fetchUsers = async () => {
  try {
    users.value = await get('/manager/users')
  } catch (e) {
    console.error(e)
  }
}

onMounted(() => {
  fetchUsers()
})

const toggleStatus = async (user: any) => {
  const newStatus = (user.isActive || user.is_active === 1) ? 0 : 1
  try {
    await post('/manager/users/toggle-status', { userId: user.id, isActive: newStatus })
    user.isActive = newStatus === 1
    user.is_active = newStatus
  } catch (err: any) {
    alert(err.message || '操作失败')
    // Revert check
    fetchUsers()
  }
}

const resetPassword = async (user: any) => {
  if (!confirm(`确定要重置 ${user.displayName || user.username} 的密码吗？`)) return
  try {
    await post('/manager/users/reset-password', { userId: user.id })
    alert('密码已重置为 123456，请通知员工登录后及时修改')
  } catch (err: any) {
    alert(err.message || '重置失败')
  }
}

const closeAddModal = () => {
  showAddModal.value = false
  addForm.value = { username: '', displayName: '' }
  addError.value = ''
}

const submitAddUser = async () => {
  if (!addForm.value.username || !addForm.value.displayName) {
    addError.value = '请填写完整'
    return
  }
  isAdding.value = true
  addError.value = ''
  try {
    await post('/manager/users/create', addForm.value)
    closeAddModal()
    fetchUsers()
  } catch (err: any) {
    addError.value = err.message || '添加失败'
  } finally {
    isAdding.value = false
  }
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleString('zh-CN', { hour12: false })
}
</script>
