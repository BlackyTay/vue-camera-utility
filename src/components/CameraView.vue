<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import type { CameraConfig, CapturedPhoto } from '@/types'
import { getGeolocation } from '../utils/geolocation'
import { generateThumbnailFromCanvas } from '../utils/image'
import GalleryView from './GalleryView.vue';

const props = defineProps<{
  config?: CameraConfig
}>()

const defaultConfig: Required<CameraConfig> = {
  imageType: 'image/png',
  imageQuality: 0.80,
  enableGeolocation: true,
  geolocationOptions: {
    enableHighAccuracy: true,
    timeout: 3000,
    maximumAge: 30000,
  },
  generateThumbnail: true,
  thumbnailSize: { width: 160, height: 120 },
}

const mergedConfig = computed(() => ({
  ...defaultConfig,
  ...props.config,
}))

const showCamera = ref(false)
const showGallery = ref(false)
const videoRef = ref<HTMLVideoElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)

const capturedPhotos = ref<CapturedPhoto[]>([])
const selectedPhotos = ref<Set<number>>(new Set())

const videoDevices = ref<MediaDeviceInfo[]>([])
const backCameras = ref<MediaDeviceInfo[]>([])
const preferredDeviceId = ref<string | null>(null)
const currentCameraIndex = ref(0)

let resolveFn: ((value: CapturedPhoto[]) => void) | null = null

const open = async (): Promise<CapturedPhoto[] | null> => {
  try {
    await getGeolocation(mergedConfig.value.geolocationOptions)

    showCamera.value = true
    selectedPhotos.value.clear()

    // Find index of preferred device in list
    if (preferredDeviceId.value && backCameras.value.length) {
      const foundIndex = backCameras.value.findIndex(
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
  } catch (error) {
    if (error instanceof Error) {
      alert(error.message)
    } else {
      alert('Please ensure location service is enabled.')
    }
    return null
  }
}

const closeCamera = (selected: CapturedPhoto[]) => {
  stopCamera()
  showCamera.value = false
  showGallery.value = false
  resolveFn?.(selected)
  resolveFn = null
}

const capture = async () => {
  if (!videoRef.value || !canvasRef.value) return

  const ctx = canvasRef.value.getContext('2d')
  if (!ctx) return

  canvasRef.value.width = videoRef.value.videoWidth
  canvasRef.value.height = videoRef.value.videoHeight
  ctx?.drawImage(videoRef.value, 0, 0)

  const imageType = mergedConfig.value.imageType
  const imageQuality = imageType === 'image/jpeg' ? mergedConfig.value.imageQuality : undefined

  const base64 = canvasRef.value.toDataURL(imageType, imageQuality)

  // Generate thumbnail if enabled
  let thumbnail = base64
  if (mergedConfig.value.generateThumbnail) {
    thumbnail = await generateThumbnailFromCanvas(canvasRef.value, mergedConfig.value.thumbnailSize)
  }


  let latitude = ''
  let longitude = ''
  if (mergedConfig.value.enableGeolocation) {
    try {
      const position = await getGeolocation(mergedConfig.value.geolocationOptions)
      latitude = position.coords.latitude.toString()
      longitude = position.coords.longitude.toString()
    } catch (e) {
      console.warn('Geolocation failed', e)
    }
  }

  capturedPhotos.value.push({
    src: base64,
    thumbnail,
    metadata: {
      timestamp: new Date().toISOString(),
      latitude,
      longitude,
    },
  })
}

const confirmGallery = (selected: CapturedPhoto[]) => closeCamera(selected)
const cancelGallery = () => showGallery.value = false

const loadVideoDevices = async () => {
  const devices = await navigator.mediaDevices.enumerateDevices()
  videoDevices.value = devices.filter(d => d.kind === 'videoinput')
  backCameras.value = videoDevices.value.filter(d =>
    /back|rear|environment/i.test(d.label.toLowerCase())
  )
}
const switchCamera = async () => {
  if (backCameras.value.length <= 1) return

  // Stop current camera
  stopCamera()

  // Move to next camera
  currentCameraIndex.value = (currentCameraIndex.value + 1) % backCameras.value.length
  const nextDeviceId = backCameras.value[currentCameraIndex.value].deviceId

  await startCamera(nextDeviceId)
}

const getMainRearCameraDeviceId = async () => {
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

  const sorted = backCameras.value.sort((a, b) => score(a.label) - score(b.label))

  return sorted[0]?.deviceId || backCameras.value[0]?.deviceId || null
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
    <button @click="showCamera = false" class="absolute top-4 right-4 z-50">
      <svg class="m-auto w-12 h-12 text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]"
        xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <path d="M6 18L18 6M6 6l12 12" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
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
      <button v-if="backCameras.length" @click="switchCamera" class="w-16 h-16 flex items-center justify-center">
        <svg class="m-auto w-12 h-12 text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24"
          height="24" fill="none" viewBox="0 0 24 24">
          <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M17.651 7.65a7.131 7.131 0 0 0-12.68 3.15M18.001 4v4h-4m-7.652 8.35a7.13 7.13 0 0 0 12.68-3.15M6 20v-4h4" />
        </svg>
      </button>
      <div v-else class="w-16 h-16"></div>

    </div>


    <!-- Gallery Preview -->
    <GalleryView :photos="capturedPhotos" :show="showGallery" @close="cancelGallery" @confirm="confirmGallery" />

    <!-- Canvas -->
    <canvas ref="canvasRef" class="hidden"></canvas>
  </div>
</template>
