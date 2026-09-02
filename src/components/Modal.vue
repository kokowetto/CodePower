<template>
  <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
    <div class="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden" @click.stop>
      <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h3 class="text-lg font-medium text-gray-900">{{ title }}</h3>
        <button @click="$emit('close')" class="text-gray-400 hover:text-gray-500">
          <span class="text-2xl">&times;</span>
        </button>
      </div>
      <div class="px-6 py-4">
        <slot></slot>
      </div>
      <div v-if="$slots.footer" class="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
        <slot name="footer"></slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  visible: boolean
}>()

defineEmits<{
  (e: 'close'): void
}>()
</script>
