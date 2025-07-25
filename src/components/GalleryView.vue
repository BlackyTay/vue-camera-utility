<script setup lang="ts">
import {ref, watch, computed} from 'vue'
import type {CapturedPhoto, GalleryConfig} from '@/types'

const props = defineProps<{
  photos: CapturedPhoto[]
  show: boolean
  config?: GalleryConfig
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'confirm', selected: CapturedPhoto[]): void
}>()

const selectedPhotos = ref<Set<number>>(new Set())
const showPreview = ref(false)
const previewIndex = ref<number | null>(null)
const longPressTimer = ref<number | null>(null)

// Computed properties
const maxSelected = computed(() => {
  // Return the explicit value if defined
  if (props.config && typeof props.config.maxSelected === 'number') {
    return props.config.maxSelected;
  }
  // Otherwise return a reasonable default
  return Infinity;
})
const maxPhotos = computed(() => {
  // Return the explicit value if defined
  if (props.config && typeof props.config.maxPhotos === 'number') {
    return props.config.maxPhotos;
  }
  // Otherwise use the photos length
  return props.photos.length;
})

const isPreviewEnabled = computed(() => props.config?.preview !== false)
const galleryTitle = computed(() => `Gallery (${selectedPhotos.value.size}/${maxPhotos.value})`)
const previewPhoto = computed(() =>
  previewIndex.value !== null ? props.photos[previewIndex.value] : null
)

const toggleSelection = (index: number) => {
  // If already selected, remove it
  if (selectedPhotos.value.has(index)) {
    selectedPhotos.value.delete(index)
    return
  }
  
  // If we've reached max selected and trying to add a new one, don't allow
  if (selectedPhotos.value.size >= maxSelected.value) {
    return
  }
  
  // Add to selection
  selectedPhotos.value.add(index)
}

const confirm = () => {
  const selected = [...selectedPhotos.value].map((i) => props.photos[i])
  emit('confirm', selected)
}

const cancel = () => {
  selectedPhotos.value.clear()
  emit('close')
}

// Long press handlers
const startLongPress = (index: number) => {
  if (!isPreviewEnabled.value) return
  
  // Clear any existing timer
  if (longPressTimer.value) {
    clearTimeout(longPressTimer.value)
  }
  
  // Set new timer
  longPressTimer.value = window.setTimeout(() => {
    previewIndex.value = index
    showPreview.value = true
    longPressTimer.value = null
  }, 500) // 500ms is standard for long press
}

const cancelLongPress = () => {
  if (longPressTimer.value) {
    clearTimeout(longPressTimer.value)
    longPressTimer.value = null
  }
}

const closePreview = () => {
  showPreview.value = false
  previewIndex.value = null
}

// Reset selection when show state changes
watch(() => props.show, (newVal) => {
  if (!newVal) selectedPhotos.value.clear()
})

// Clean up timer on component unmount
watch(() => props.show, (isVisible) => {
  if (!isVisible && longPressTimer.value) {
    clearTimeout(longPressTimer.value)
    longPressTimer.value = null
  }
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
      <span class="vcu:font-medium vcu:text-lg">{{ galleryTitle }}</span>
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
               @click="toggleSelection(index)"
               @touchstart="startLongPress(index)"
               @touchend="cancelLongPress"
               @touchcancel="cancelLongPress"
               @touchmove="cancelLongPress">
            <input type="checkbox" class="vcu:absolute vcu:top-1 vcu:left-1 vcu:w-5 vcu:h-5 vcu:pointer-events-none"
                   :checked="selectedPhotos.has(index)" readonly tabindex="-1"/>

            <!-- Image -->
            <img :src="photo.src"
                 class="vcu:w-full vcu:h-auto vcu:object-cover vcu:aspect-square vcu:pointer-events-none vcu:select-none"
                 alt="captured photo"
                 draggable="false"
                 aria-role="presentation"
            />

            <!-- Timestamp -->
            <div
                class="vcu:absolute vcu:bottom-0 vcu:left-0 vcu:right-0 vcu:text-[10px] vcu:bg-black/60 vcu:text-white vcu:px-1 vcu:py-0.5">
              {{ new Date(photo.metadata.timestamp).toLocaleString() }}
            </div>

            <!-- Check icon (selected indicator) -->
            <div v-if="selectedPhotos.has(index)"
                 class="vcu:absolute vcu:top-1 vcu:left-1 vcu:w-5 vcu:h-5 vcu:bg-green-500 vcu:rounded-sm vcu:flex vcu:items-center vcu:justify-center">
              <svg class="vcu:w-3 vcu:h-3 vcu:text-white" fill="none" stroke="currentColor" stroke-width="2"
                   viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
            
            <!-- Max selection indicator -->
            <div v-if="selectedPhotos.size >= maxSelected && !selectedPhotos.has(index)"
                 class="vcu:absolute vcu:inset-0 vcu:bg-black vcu:bg-opacity-50 vcu:flex vcu:items-center vcu:justify-center">
              <span class="vcu:text-xs vcu:text-white vcu:text-center vcu:px-1">Max {{ maxSelected }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Photo Preview Modal (shown on long press) -->
    <div v-if="showPreview && previewPhoto" 
         class="vcu:fixed vcu:inset-0 vcu:z-60 vcu:bg-black vcu:flex vcu:items-center vcu:justify-center"
         @click="closePreview">

      <!-- Preview image -->
      <img :src="previewPhoto.src" 
           class="vcu:max-w-full vcu:max-h-[90vh] vcu:object-contain vcu:pointer-events-none vcu:select-none"
           alt="Preview" />
      
      <!-- Metadata display -->
      <div class="vcu:absolute vcu:bottom-0 vcu:left-0 vcu:right-0 vcu:bg-black/60 vcu:text-white vcu:p-4 vcu:pointer-events-none vcu:select-none">
        <p class="vcu:text-sm vcu:mb-1">{{ new Date(previewPhoto.metadata.timestamp).toLocaleString() }}</p>
        
        <p v-if="previewPhoto.metadata.coordinate?.latitude && previewPhoto.metadata.coordinate?.longitude"
           class="vcu:text-sm vcu:mb-1">
          Location: {{ previewPhoto.metadata.coordinate.latitude.toFixed(6) }}, 
          {{ previewPhoto.metadata.coordinate.longitude.toFixed(6) }}
        </p>

        <p v-if="previewPhoto.metadata.barcode" class="vcu:text-sm vcu:mb-1">
          Barcode: {{ previewPhoto.metadata.barcode }}
        </p>

        <p v-if="previewPhoto.metadata.caption" class="vcu:text-sm">
          Caption: {{ previewPhoto.metadata.caption }}
        </p>
      </div>
    </div>
  </div>
</template>