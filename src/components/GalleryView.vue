<script setup lang="ts">
import {ref, watch} from 'vue'
import type {CapturedPhoto} from '@/types'

const props = defineProps<{
  photos: CapturedPhoto[]
  show: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'confirm', selected: CapturedPhoto[]): void
}>()

const selectedPhotos = ref<Set<number>>(new Set())

const toggleSelection = (index: number) => {
  if (selectedPhotos.value.has(index)) {
    selectedPhotos.value.delete(index)
  } else {
    selectedPhotos.value.add(index)
  }
}

const confirm = () => {
  const selected = [...selectedPhotos.value].map((i) => props.photos[i])
  emit('confirm', selected)
}

const cancel = () => {
  selectedPhotos.value.clear()
  emit('close')
}

watch(() => props.show, (newVal) => {
  if (!newVal) selectedPhotos.value.clear()
})
</script>

<template>
  <div v-if="show" class="vcu:absolute vcu:inset-0 vcu:z-50 vcu:bg-white vcu:text-black vcu:flex vcu:flex-col">
    <!-- Header -->
    <div
        class="vcu:flex vcu:justify-between vcu:items-center vcu:px-4 vcu:py-2 vcu:border-b vcu:bg-gray-100 dark:vcu:bg-gray-800 vcu:text-gray-800 dark:vcu:text-white">
      <!-- Close button -->
      <button @click="cancel" class="vcu:bg-transparent vcu:dark:bg-transparent vcu:border-none">
        <svg class="vcu:m-auto vcu:w-12 vcu:h-12 vcu:text-gray-800 dark:vcu:text-white "
             xmlns="http://www.w3.org/2000/svg" fill="none"
             viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
      <span class="vcu:font-medium vcu:text-lg">Gallery</span>
      <button @click="confirm" class="vcu:bg-transparent vcu:dark:bg-transparent vcu:border-none">
        <svg class="vcu:m-auto vcu:w-12 vcu:h-12 vcu:text-gray-800 dark:vcu:text-white" aria-hidden="true"
             xmlns="http://www.w3.org/2000/svg"
             width="24" height="24" fill="none" viewBox="0 0 24 24">
          <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M5 11.917 9.724 16.5 19 7.5"/>
        </svg>
      </button>
    </div>

    <!-- Grid -->
    <div class="vcu:p-4 vcu:overflow-y-auto">
      <div class="vcu:grid vcu:grid-cols-3 sm:vcu:grid-cols-4 vcu:gap-2">
        <div v-for="(photo, index) in photos" :key="index"
             class="vcu:relative vcu:border vcu:border-gray-300 vcu:rounded vcu:overflow-hidden">
          <div class="vcu:relative vcu:border vcu:border-gray-300 vcu:rounded vcu:overflow-hidden vcu:cursor-pointer"
               @click="toggleSelection(index)">
            <input type="checkbox" class="vcu:absolute vcu:top-1 vcu:left-1 vcu:w-5 vcu:h-5 vcu:pointer-events-none"
                   :checked="selectedPhotos.has(index)" readonly tabindex="-1"/>

            <!-- Image -->
            <img :src="photo.src" class="vcu:w-full vcu:h-auto vcu:object-cover vcu:aspect-square" alt="captured photo"/>

            <!-- Timestamp -->
            <div
                class="vcu:absolute vcu:bottom-0 vcu:left-0 vcu:right-0 vcu:text-[10px] vcu:bg-black/60 vcu:text-white vcu:px-1 vcu:py-0.5">
              {{ new Date(photo.metadata.timestamp).toLocaleString() }}
            </div>

            <!-- Check icon (optional visual indicator) -->
            <div v-if="selectedPhotos.has(index)"
                 class="vcu:absolute vcu:top-1 vcu:left-1 vcu:w-5 vcu:h-5 vcu:bg-green-500 vcu:rounded-sm vcu:flex vcu:items-center vcu:justify-center">
              <svg class="vcu:w-3 vcu:h-3 vcu:text-white" fill="none" stroke="currentColor" stroke-width="2"
                   viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>