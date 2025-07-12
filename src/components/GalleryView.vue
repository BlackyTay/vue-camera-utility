<script setup lang="ts">
import { ref, watch } from 'vue'
import type { CapturedPhoto } from '@/types'

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
    <div v-if="show" class="absolute inset-0 z-50 bg-white text-black flex flex-col">
        <!-- Header -->
        <div class="flex justify-between items-center px-4 py-2 border-b bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-white">
            <button @click="cancel" class="text-2xl text-gray-600"><svg class="w-6 h-6 text-gray-800 dark:text-white"
                    aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none"
                    viewBox="0 0 24 24">
                    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M6 18 17.94 6M18 18 6.06 6" />
                </svg>
            </button>
            <span class="font-medium text-lg">Gallery</span>
            <button @click="confirm" class="text-2xl text-green-600"><svg class="w-6 h-6 text-gray-800 dark:text-white"
                    aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none"
                    viewBox="0 0 24 24">
                    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M5 11.917 9.724 16.5 19 7.5" />
                </svg>
            </button>
        </div>

        <!-- Grid -->
        <div class="p-4 overflow-y-auto">
            <div class="grid grid-cols-3 sm:grid-cols-4 gap-2">
                <div v-for="(photo, index) in photos" :key="index"
                    class="relative border border-gray-300 rounded overflow-hidden">
                    <img :src="photo.src" class="w-full h-auto object-cover" />
                    <input type="checkbox" class="absolute top-1 left-1 w-5 h-5" :checked="selectedPhotos.has(index)"
                        @change="toggleSelection(index)" />
                    <div class="absolute bottom-0 left-0 right-0 text-[10px] bg-black/60 text-white px-1 py-0.5">
                        {{ new Date(photo.timestamp).toLocaleString() }}
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>