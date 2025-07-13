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

const videoDevices = ref<MediaDeviceInfo[]>([])
const preferredDeviceId = ref<string | null>(null)
const currentCameraIndex = ref(0)

let resolveFn: ((value: CapturedPhoto[]) => void) | null = null

const open = async (): Promise<CapturedPhoto[] | null> => {
  showCamera.value = true
  selectedPhotos.value.clear()

  // Find index of preferred device in list
  if (preferredDeviceId.value && videoDevices.value.length) {
    const foundIndex = videoDevices.value.findIndex(
      d => d.deviceId === preferredDeviceId.value
    )
    if (foundIndex !== -1) {
      currentCameraIndex.value = foundIndex
    }
  }

  await startCamera(preferredDeviceId.value)

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

const generateThumbnail = (src: string): Promise<string> => {
  const img = new Image()
  img.src = src

  const thumbCanvas = document.createElement('canvas')
  const maxSize = 160

  return new Promise<string>((resolve) => {
    img.onload = () => {
      const scale = maxSize / img.width
      const width = maxSize
      const height = img.height * scale

      thumbCanvas.width = width
      thumbCanvas.height = height

      const ctx = thumbCanvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)

      resolve(thumbCanvas.toDataURL('image/jpeg', 0.7)) // smaller size
    }
  })
}


const capture = async () => {
  if (!videoRef.value || !canvasRef.value) return
  const ctx = canvasRef.value.getContext('2d')
  if (!ctx) return
  canvasRef.value.width = videoRef.value.videoWidth
  canvasRef.value.height = videoRef.value.videoHeight
  ctx?.drawImage(videoRef.value, 0, 0)

  const photo = canvasRef.value!.toDataURL('image/jpeg', 0.8)
  const thumb = await generateThumbnail(photo)

  capturedPhotos.value.push({
    src: photo,
    thumbnail: thumb,
    timestamp: new Date().toISOString()
  })

}

const confirmGallery = (selected: CapturedPhoto[]) => closeCamera(selected)
const cancelGallery = () => closeCamera([])

const loadVideoDevices = async () => {
  const devices = await navigator.mediaDevices.enumerateDevices()
  videoDevices.value = devices.filter(d => d.kind === 'videoinput')
}
const switchCamera = async () => {
  if (videoDevices.value.length <= 1) return

  // Stop current camera
  stopCamera()

  // Move to next camera
  currentCameraIndex.value = (currentCameraIndex.value + 1) % videoDevices.value.length
  const nextDeviceId = videoDevices.value[currentCameraIndex.value].deviceId

  await startCamera(nextDeviceId)
}

const getMainRearCameraDeviceId = async () => {
  // Heuristic: Choose the environment-facing camera with the least index (likely main camera)
  const backCameras = videoDevices.value.filter(d =>
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

  return sorted[0]?.deviceId || backCameras[0]?.deviceId || videoDevices.value[0]?.deviceId || null
}

const startCamera = async (deviceId: string | null) => {
  const constraints: MediaStreamConstraints = {
    video: {
      deviceId: deviceId ? { exact: deviceId } : undefined,
      width: { ideal: 4096 },   // try 4K width
      height: { ideal: 2160 },  // try 4K height
    }
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints)
    if (videoRef.value) {
      videoRef.value.srcObject = stream
      videoRef.value.play()
    }
  } catch (err) {
    console.error('Camera access failed:', err)
    showCamera.value = false
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
  await loadVideoDevices()
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
  <div v-if="showCamera" class="fixed inset-0 z-50 bg-black text-white flex flex-col"
    style="padding-bottom: env(safe-area-inset-bottom);">
    <!-- Close button -->
    <button @click="showCamera = false" class="absolute top-4 right-4 z-50  rounded-full backdrop-blur-sm">
      <svg class="m-auto w-12 h-12 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
        stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>

    <!-- Live Camera View -->
    <div class="flex-1 relative">
      <video ref="videoRef" class="w-full h-full object-cover" autoplay playsinline muted></video>
    </div>

    <!-- Floating Control Bar -->
    <div class="fixed bottom-0 left-0 right-0 z-50 flex justify-between items-center px-4 py-4 bg-black bg-opacity-80">
      <!-- Gallery Button -->
      <button v-if="capturedPhotos.length" @click="showGallery = true"
        class="w-16 h-16 border-2 border-white overflow-hidden">
        <img :src="capturedPhotos[capturedPhotos.length - 1].thumbnail" class="w-full h-full object-cover"
          alt="Thumbnail" />
      </button>
      <div v-else class="w-16 h-16"></div>

      <!-- Capture Button -->
      <button @click="capture" class="w-16 h-16 rounded-full bg-white shadow-lg"></button>

      <!-- Switch Camera Button -->
      <button @click="switchCamera" class="w-16 h-16 flex items-center justify-center">
        <svg class="m-auto w-12 h-12 text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24"
          height="24" fill="none" viewBox="0 0 24 24">
          <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M17.651 7.65a7.131 7.131 0 0 0-12.68 3.15M18.001 4v4h-4m-7.652 8.35a7.13 7.13 0 0 0 12.68-3.15M6 20v-4h4" />
        </svg>

      </button>

    </div>


    <!-- Gallery Preview -->
    <GalleryView :photos="capturedPhotos" :show="showGallery" @close="cancelGallery" @confirm="confirmGallery" />

    <!-- Canvas -->
    <canvas ref="canvasRef" class="hidden"></canvas>
  </div>
</template>
