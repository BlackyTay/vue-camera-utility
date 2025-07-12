<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import type { CapturedPhoto } from '@/types'
import GalleryView from './GalleryView.vue'

const showCamera = ref(false)
const showGallery = ref(false)
const videoRef = ref<HTMLVideoElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)

const capturedPhotos = ref<CapturedPhoto[]>([])
const selectedPhotos = ref<Set<number>>(new Set())

let resolveFn: ((value: CapturedPhoto[]) => void) | null = null

const open = async (): Promise<CapturedPhoto[] | null> => {
  showCamera.value = true
  selectedPhotos.value.clear()
  await startCamera()

  return new Promise((resolve) => {
    resolveFn = resolve
  })
}

const closeCamera = (selected: CapturedPhoto[]) => {
  stopCamera()
  showCamera.value = false
  showGallery.value = false
  resolveFn?.(selected)
  resolveFn = null
}

const capture = () => {
  if (!videoRef.value || !canvasRef.value) return
  const ctx = canvasRef.value.getContext('2d')
  canvasRef.value.width = videoRef.value.videoWidth
  canvasRef.value.height = videoRef.value.videoHeight
  ctx?.drawImage(videoRef.value, 0, 0)
  const photo = canvasRef.value.toDataURL('image/png')
  capturedPhotos.value.push({
    src: photo,
    timestamp: new Date().toISOString(),
  })
}

const confirmGallery = (selected: CapturedPhoto[]) => closeCamera(selected)
const cancelGallery = () => closeCamera([])
const getMainRearCameraDeviceId = async () => {
  const devices = await navigator.mediaDevices.enumerateDevices()
  const videoDevices = devices.filter(d => d.kind === 'videoinput')
  // Heuristic: Choose the environment-facing camera with the least index (likely main camera)
  const backCameras = videoDevices.filter(d =>
    /back|rear|environment/i.test(d.label.toLowerCase())
  )
  const priorityKeywords = ['zoom', 'tele', 'macro', 'depth', 'ultrawide']
  const score = (label: string) => {
    let s = 0

    // Lower score is better (camera2 0 = high priority)
    const match = label.match(/camera\d*\s*(\d+)/i)
    if (match) {
      s += parseInt(match[1], 10)
    }

    // Penalize undesired lenses
    if (priorityKeywords.some(kw => label.toLowerCase().includes(kw))) {
      s += 100
    }

    return s
  }

  const sorted = backCameras.sort((a, b) => score(a.label) - score(b.label))
  console.log(sorted)

  return sorted[0]?.deviceId || backCameras[0]?.deviceId || videoDevices[0]?.deviceId || null
}
const preferredDeviceId = ref<string | null>(null)

const startCamera = async () => {
  if (!preferredDeviceId.value) return
  
  const stream = await navigator.mediaDevices
    .getUserMedia({
      video: {
        deviceId: { ideal: preferredDeviceId.value }
      }
    })
  if (videoRef.value) {
    videoRef.value.srcObject = stream
    videoRef.value.play()
  }
}

const stopCamera = () => {
  const stream = videoRef.value?.srcObject as MediaStream
  stream?.getTracks().forEach((track) => track.stop())
}

defineExpose({ open })

const appHeight = ref(`${window.innerHeight}px`)

const updateHeight = () => {
  appHeight.value = `${window.innerHeight}px`
}
onMounted(async () => {
  updateHeight()
  window.addEventListener('resize', updateHeight)
  preferredDeviceId.value = await getMainRearCameraDeviceId()
})

onBeforeUnmount(() => {
  stopCamera()
  window.removeEventListener('resize', updateHeight)
})
</script>
<template>
  <div v-if="showCamera" class="fixed inset-0 z-50 bg-black text-white flex flex-col">
    <!-- Live Camera View -->
    <div class="flex-1 relative">
      <video ref="videoRef" class="w-full h-full object-cover" autoplay playsinline muted></video>
    </div>

    <!-- Capture Button -->
    <div class="flex justify-between items-center px-4 py-4 bg-black bg-opacity-80">
      <!-- Gallery Button -->
      <button v-if="capturedPhotos.length" @click="showGallery = true"
        class="w-16 h-16  border-2 border-white overflow-hidden">
        <img :src="capturedPhotos[capturedPhotos.length - 1].src" class="w-full h-full object-cover"
          alt="Latest thumbnail" />
      </button>

      <!-- Spacer if no gallery -->
      <div v-else class="w-16 h-16"></div>

      <!-- Capture Button -->
      <button @click="capture" class="w-16 h-16 rounded-full bg-white shadow-lg"></button>

      <!-- Spacer for symmetry -->
      <button @click="showCamera = false" class="w-16 h-16">
        <svg class="m-auto w-12 h-12 text-gray-800 dark:text-white" aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
          <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M6 18 17.94 6M18 18 6.06 6" />
        </svg>
      </button>
    </div>

    <!-- Gallery Preview -->
    <GalleryView :photos="capturedPhotos" :show="showGallery" @close="cancelGallery" @confirm="confirmGallery" />

    <!-- Canvas -->
    <canvas ref="canvasRef" class="hidden"></canvas>
  </div>
</template>
