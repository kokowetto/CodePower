<template>
  <div>
    <div class="mb-4">
      <nav class="flex space-x-4">
        <button v-for="t in types" :key="t.value" @click="currentType = t.value; fetchData()"
          :class="[currentType === t.value ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700', 'px-3 py-2 font-medium text-sm rounded-md']">
          {{ t.label }}
        </button>
      </nav>
    </div>

    <div class="mb-4">
      <button @click="showAddModal = true" class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm font-medium">
        新增{{ currentTypeLabel }}
      </button>
    </div>

    <div class="overflow-x-auto border border-gray-200 rounded-lg">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{{ currentType === 'credit-options' ? '数值' : '名称' }}</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">排序</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-if="list.length === 0">
            <td colspan="4" class="px-6 py-4 text-center text-sm text-gray-500">暂无数据</td>
          </tr>
          <tr v-for="(item, index) in list" :key="item.id" class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ getItemDisplay(item) }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 flex items-center gap-2">
              <button @click="moveUp(index)" :disabled="index === 0" class="text-gray-400 hover:text-blue-600 disabled:opacity-30">↑</button>
              <button @click="moveDown(index)" :disabled="index === list.length - 1" class="text-gray-400 hover:text-blue-600 disabled:opacity-30">↓</button>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <label class="inline-flex items-center cursor-pointer">
                <input type="checkbox" :checked="item.isActive || item.is_active === 1" @change="toggleStatus(item)" class="sr-only peer">
                <div class="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
              <button @click="handleDelete(item)" class="text-red-600 hover:text-red-900">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Add Modal -->
    <Modal :visible="showAddModal" :title="`新增${currentTypeLabel}`" @close="closeAddModal">
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700">{{ currentType === 'credit-options' ? '额度 (整数)' : '名称' }}</label>
          <input :type="currentType === 'credit-options' ? 'number' : 'text'" v-model="addValue" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500">
        </div>
        <div v-if="addError" class="text-red-500 text-sm">{{ addError }}</div>
      </div>
      <template #footer>
        <button @click="closeAddModal" class="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">取消</button>
        <button @click="submitAdd" :disabled="isAdding" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">确认新增</button>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { get, post, patch, del } from '../../utils/request'
import Modal from '../../components/Modal.vue'

const types = [
  { label: '项目维护', value: 'projects' },
  { label: '额度维护', value: 'credit-options' },
  { label: '用途理由维护', value: 'reasons' }
]

const currentType = ref('projects')
const list = ref<any[]>([])

const showAddModal = ref(false)
const addValue = ref<any>('')
const isAdding = ref(false)
const addError = ref('')

const currentTypeLabel = computed(() => types.find(t => t.value === currentType.value)?.label.replace('维护', ''))

const fetchData = async () => {
  try {
    list.value = await get(`/manager/dictionaries/${currentType.value}`)
    list.value.sort((a, b) => (a.sortOrder || a.sort_order || 0) - (b.sortOrder || b.sort_order || 0))
  } catch (e) {
    console.error(e)
  }
}

onMounted(() => {
  fetchData()
})

const toggleStatus = async (item: any) => {
  const newStatus = (item.isActive || item.is_active === 1) ? 0 : 1
  try {
    await patch(`/manager/dictionaries/${currentType.value}/${item.id}`, { isActive: newStatus })
    item.isActive = newStatus === 1
    item.is_active = newStatus
  } catch (err: any) {
    alert('操作失败: ' + err.message)
    fetchData()
  }
}

const moveUp = async (index: number) => {
  if (index === 0) return
  await swapOrder(index, index - 1)
}

const moveDown = async (index: number) => {
  if (index === list.value.length - 1) return
  await swapOrder(index, index + 1)
}

const swapOrder = async (idx1: number, idx2: number) => {
  const item1 = list.value[idx1]
  const item2 = list.value[idx2]
  
  const order1 = item1.sortOrder || item1.sort_order || idx1
  const order2 = item2.sortOrder || item2.sort_order || idx2

  try {
    await patch(`/manager/dictionaries/${currentType.value}/${item1.id}`, { sortOrder: order2 })
    await patch(`/manager/dictionaries/${currentType.value}/${item2.id}`, { sortOrder: order1 })
    fetchData()
  } catch (err: any) {
    alert('排序更新失败')
  }
}

const closeAddModal = () => {
  showAddModal.value = false
  addValue.value = ''
  addError.value = ''
}

const submitAdd = async () => {
  if (!addValue.value) {
    addError.value = '不能为空'
    return
  }
  
  let payload: any = {}
  if (currentType.value === 'credit-options') {
    const val = parseInt(addValue.value)
    if (isNaN(val) || val <= 0) {
      addError.value = '必须为正整数'
      return
    }
    payload.amount = val
  } else {
    payload.name = addValue.value
  }

  isAdding.value = true
  addError.value = ''
  try {
    await post(`/manager/dictionaries/${currentType.value}`, payload)
    closeAddModal()
    fetchData()
  } catch (err: any) {
    addError.value = err.message || '添加失败'
  } finally {
    isAdding.value = false
  }
}

const getItemDisplay = (item: any) => {
  return item.name || item.amount || item.reason_text || item.reasonText || ''
}

const handleDelete = async (item: any) => {
  const display = getItemDisplay(item)
  if (!confirm(`确定要删除“${display}”吗？删除后不可恢复。`)) return

  try {
    await del(`/manager/dictionaries/${currentType.value}/${item.id}`)
    fetchData()
  } catch (err: any) {
    alert('删除失败: ' + err.message)
  }
}
</script>
