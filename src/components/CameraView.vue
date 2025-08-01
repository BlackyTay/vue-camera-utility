<script setup lang="ts">
import {computed, onBeforeUnmount, onMounted, ref, watch} from 'vue'
import type {CameraMode, CameraViewConfig, CapturedPhoto, PhotoMetadata} from '@/types'
import {getGeolocation} from '@/utils/geolocation'
import GalleryView from './GalleryView.vue';
import {scanBarcodeUntilFound} from '@/utils/barcode';
import Base from "@/components/Base.vue";
import {processImageInPlace} from "@/utils/image";

const props = defineProps<{
  config?: CameraViewConfig
}>()

/**
 * Emitted when the camera is fully initialized and ready to use
 * @event camera-ready
 * @param {boolean} status - true when the camera is ready
 */
const emit = defineEmits<{
  'camera-ready': [status: boolean]
}>()

const defaultConfig: CameraViewConfig = {
  cameraConfig: {
    cameraMode: 'multiple-photos',
    cameraFacingMode: 'all',
  },
  imageConfig: {
    imageType: 'image/jpeg',
    imageQuality: 0.80,
  },
  extra: {
    geolocation: {
      enableHighAccuracy: true,
      timeout: 3000,
      maximumAge: 30000,
    },
    gallery: {
      maxPhotos: 10,
      maxSelected: 5,
      preview: true,
    },
  }
}

const mergedConfig = computed(() => ({
  ...defaultConfig,
  ...props.config,
}))

const cameraMode = ref<CameraMode | null>(null);
const showCamera = ref(false)
const showGallery = ref(false)
const showGalleryButton = ref(false)
const showControls = ref(false)
const videoRef = ref<HTMLVideoElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)

const capturedPhotos = ref<CapturedPhoto[]>([])
const selectedPhotos = ref<Set<number>>(new Set())

const videoDevices = ref<MediaDeviceInfo[]>([])
const availableCameras = ref<{
  index: number,
  device: MediaDeviceInfo,
  facingMode?: string,
  isMainCamera?: boolean,
  capabilities?: any,
  resolution?: number
}[]>([])
const currentCameraIndex = ref(0)

const cameraReady = ref(false)

// Captions
const showCaptionModal = ref(false)
const currentCaptionPhoto = ref<CapturedPhoto | null>(null)
const captionInput = ref('')

let resolveFn: ((value: CapturedPhoto[]) => void) | null = null

const open = async (): Promise<CapturedPhoto[] | void> => {
  cameraMode.value = mergedConfig.value.cameraConfig.cameraMode
  try {
    if (mergedConfig.value.extra.geolocation) {
      await getGeolocation(mergedConfig.value.extra.geolocation)
    }

    selectedPhotos.value.clear()

    await startCamera(availableCameras.value.length > 0 ? availableCameras.value[currentCameraIndex.value].device.deviceId : undefined)

    if (cameraMode.value === 'barcode') {
      try {
        const barcode = await scanBarcodeWhenReady(5000)
        await capture(barcode ?? undefined)
      } catch (error) {
        console.log('Barcode scan failed', error)
        alert(typeof error === 'string' ? error :
            (error instanceof Error ? error.message : 'Barcode scan failed with unexpected error.'))
        closeCamera([])
      }
    }

    return new Promise((resolve) => {
      resolveFn = resolve
    })
  } catch (error) {
    alert(typeof error === 'string' ? error :
        (error instanceof Error ? error.message : 'Camera open failed with unexpected error.'))
  }
}

const closeCamera = (selected: CapturedPhoto[]) => {
  stopCamera()
  showCamera.value = false
  showGallery.value = false
  resolveFn?.(selected)
  resolveFn = null
}

const scanBarcode = async () => {
  // More detailed validation of video element
  if (!videoRef.value) {
    throw new Error("Camera not accessible: Video element not found");
  }

  if (videoRef.value.readyState < 2) {
    throw new Error("Camera not ready: Video is still loading");
  }

  if (videoRef.value.videoWidth === 0 || videoRef.value.videoHeight === 0) {
    throw new Error("Camera not accessible: Video dimensions not available");
  }

  try {
    const formats: BarcodeFormat[] | undefined =
        mergedConfig.value.extra.scanner?.formats || undefined;

    const result = await scanBarcodeUntilFound(
        videoRef.value,
        formats
    );

    if (!result) {
      const error = new Error("Barcode detection timed out");
      if (mergedConfig.value.extra.scanner?.onError) {
        mergedConfig.value.extra.scanner.onError(error);
      }
    }

    if (mergedConfig.value.extra.scanner?.onResult) {
      mergedConfig.value.extra.scanner.onResult(result);
    }

    return result;
  } catch (error) {
    if (mergedConfig.value.extra.scanner?.onError && error instanceof Error) {
      mergedConfig.value.extra.scanner.onError(error);
    }
    throw error;
  }
};


/**
 * Waits for the video element to be ready before scanning for barcodes
 * @param maxWaitTime Maximum time to wait in milliseconds
 * @param checkInterval Interval between checks in milliseconds
 */
const scanBarcodeWhenReady = async (maxWaitTime = 10000, checkInterval = 100): Promise<string | undefined> => {
  return new Promise((resolve) => {
    // Track total time waited
    let timeWaited = 0;

    // Create an interval to check if video is ready
    const checkVideoReady = setInterval(async () => {
      // Check if we've exceeded max wait time
      if (timeWaited >= maxWaitTime) {
        clearInterval(checkVideoReady);
        throw new Error('[Scanner] Timed out waiting for video to be ready');
      }

      // Check if video is available and has dimensions
      if (videoRef.value &&
          videoRef.value.readyState >= 2 &&
          videoRef.value.videoWidth > 0 &&
          videoRef.value.videoHeight > 0) {

        emit('camera-ready', true);
        console.log('[Scanner] Video is ready');
        clearInterval(checkVideoReady);

        try {
          // Video is ready, attempt to scan barcode
          const result = await scanBarcode();

          if (!result) {
            console.warn('Barcode detection timed out');
            resolve(undefined);
            return;
          }

          resolve(result);
        } catch (error) {
          console.error('Barcode scan failed:', error);
          alert(error instanceof Error ? error.message : 'Barcode scan failed');
        }
      } else {
        // Increment time waited
        timeWaited += checkInterval;
      }
    }, checkInterval);
  });
};

const takePhoto = async (barcode?: string) => {
  if (!videoRef.value || !canvasRef.value) throw new Error("Camera not accessible: Video or canvas element not found");

  const ctx = canvasRef.value.getContext('2d')
  if (!ctx) throw new Error("Camera not accessible: Canvas context not found");

  canvasRef.value.width = videoRef.value.videoWidth
  canvasRef.value.height = videoRef.value.videoHeight
  ctx.drawImage(videoRef.value, 0, 0)

  let latitude: number | undefined = undefined
  let longitude: number | undefined = undefined
  if (mergedConfig.value.extra.geolocation) {
    try {
      const position = await getGeolocation(mergedConfig.value.extra.geolocation)
      latitude = position.coords.latitude
      longitude = position.coords.longitude
    } catch (e) {
      console.warn('Geolocation failed', e)
      alert(e instanceof Error ? 'Geolocation failed' + e.message : 'Geolocation failed')
      closeCamera([]);
    }
  }
  const metadata: PhotoMetadata = {
    timestamp: new Date().toISOString(),
    coordinate: {
      latitude,
      longitude,
    },
  }
  if (barcode) {
    metadata.barcode = barcode;
  }

  if (mergedConfig.value.imageConfig) {
    try {
      await processImageInPlace(canvasRef.value, ctx, mergedConfig.value.imageConfig, metadata);
    } catch (error) {
      console.error('Error processing image:', error);
    }
  }

  const imageType = mergedConfig.value.imageConfig?.imageType ?? 'image/jpeg'
  const imageQuality = imageType === 'image/jpeg' ? mergedConfig.value.imageConfig?.imageQuality : undefined
  const base64 = canvasRef.value.toDataURL(imageType, imageQuality)

  const capturedPhoto: CapturedPhoto = {
    src: base64,
    metadata
  }

  return capturedPhoto
}

const capture = async (barcode?: string) => {
  console.log('[capture] barcode', barcode)
  const capturedPhoto = await takePhoto(barcode ?? undefined)

  // Check if caption is enabled in config
  if (mergedConfig.value.extra.caption) {
    // Store the photo reference and show caption modal
    currentCaptionPhoto.value = capturedPhoto
    captionInput.value = '' // Reset input
    showCaptionModal.value = true
  } else {
    // No caption config, proceed as normal
    finalizeCapture(capturedPhoto)
  }
}

const finalizeCapture = (photo: CapturedPhoto) => {
  if (mergedConfig.value.cameraConfig.cameraMode === 'single-photo'
      || mergedConfig.value.cameraConfig.cameraMode === 'barcode') {
    closeCamera([photo])
  }
  capturedPhotos.value.push(photo)
}

const confirmGallery = (selected: CapturedPhoto[]) => closeCamera(selected)
const cancelGallery = () => showGallery.value = false

const loadVideoDevices = async () => {
  try {
    // Get list of available video devices
    const devices = await navigator.mediaDevices.enumerateDevices();
    videoDevices.value = devices.filter(device => device.kind === 'videoinput');

    // Process and categorize all cameras
    const camerasList: Array<{
      index: number,
      device: MediaDeviceInfo,
      facingMode?: string,
      isMainCamera?: boolean,
      capabilities?: any,
      resolution?: number
    }> = [];

    for (let i = 0; i < videoDevices.value.length; i++) {
      const device = videoDevices.value[i];
      let facingMode: string | undefined;
      let isMainCamera = false;
      let capabilities: any = null;
      let resolution = 0;

      const labelLower = device.label.toLowerCase();

      // Try to get camera capabilities if supported
      if ('getCapabilities' in device) {
        try {
          capabilities = (device as MediaDeviceInfo & {
            getCapabilities(): MediaTrackCapabilities
          }).getCapabilities();

          // Determine facingMode from capabilities
          if (capabilities && capabilities.facingMode) {
            if (capabilities.facingMode.includes('user')) {
              facingMode = 'user';
            } else if (capabilities.facingMode.includes('environment')) {
              facingMode = 'environment';

              // Check if it's likely the main camera based on label
              isMainCamera = labelLower.includes('main') ||
                  labelLower.includes('wide') ||
                  labelLower.includes('0') ||
                  (!labelLower.includes('ultra') &&
                      !labelLower.includes('tele') &&
                      !labelLower.includes('zoom'));
            }
          }

          // Get max resolution if available
          resolution = capabilities?.width?.max || 0;
        } catch (capabilitiesError) {
          console.warn('Error getting capabilities:', capabilitiesError);
          alert(capabilitiesError instanceof Error ? capabilitiesError.message : 'Error getting capabilities.')
        }
      }

      // Fallback to label detection if facingMode not detected by capabilities
      if (!facingMode) {
        if (labelLower.includes('front') || labelLower.includes('user') || labelLower.includes('selfie')) {
          facingMode = 'user';
        } else if (labelLower.includes('back') || labelLower.includes('rear') || labelLower.includes('environment')) {
          facingMode = 'environment';
          isMainCamera = labelLower.includes('main') || labelLower.includes('wide') ||
              labelLower.includes('0') ||
              (!labelLower.includes('ultra') && !labelLower.includes('tele') && !labelLower.includes('zoom'));
        }
      }

      camerasList.push({
        index: i,
        device,
        facingMode,
        isMainCamera,
        capabilities,
        resolution
      });
    }

    // Filter cameras based on the cameraFacingMode config
    const filteredCameras = mergedConfig.value.cameraConfig.cameraFacingMode === 'all'
        ? camerasList
        : camerasList.filter(cam => cam.facingMode === mergedConfig.value.cameraConfig.cameraFacingMode);

    console.log('Available cameras:', filteredCameras)
    console.log('preferredFacing :', mergedConfig.value.cameraConfig.preferredFacing)
    console.log('cameraFacingMode :', mergedConfig.value.cameraConfig.cameraFacingMode)
    // Sort cameras based on preferredFacing if specified
    if (mergedConfig.value.cameraConfig.preferredFacing) {
      filteredCameras.sort((a, b) => {
        // First prioritize cameras matching the preferred facing
        if (a.facingMode === mergedConfig.value.cameraConfig.preferredFacing && b.facingMode !== mergedConfig.value.cameraConfig.preferredFacing) return -1;
        if (a.facingMode !== mergedConfig.value.cameraConfig.preferredFacing && b.facingMode === mergedConfig.value.cameraConfig.preferredFacing) return 1;

        // For environment cameras, prioritize main cameras
        if (a.facingMode === 'environment' && b.facingMode === 'environment') {
          if (a.isMainCamera && !b.isMainCamera) return -1;
          if (!a.isMainCamera && b.isMainCamera) return 1;

          // Then prioritize by resolution
          return (b.resolution || 0) - (a.resolution || 0);
        }

        return 0;
      });
    } else {
      // Default sorting: prioritize environment cameras, then main cameras, then resolution
      filteredCameras.sort((a, b) => {
        // Prioritize environment cameras
        if (a.facingMode === 'environment' && b.facingMode !== 'environment') return -1;
        if (a.facingMode !== 'environment' && b.facingMode === 'environment') return 1;

        // For environment cameras, prioritize main cameras
        if (a.facingMode === 'environment' && b.facingMode === 'environment') {
          if (a.isMainCamera && !b.isMainCamera) return -1;
          if (!a.isMainCamera && b.isMainCamera) return 1;
        }

        // Then sort by resolution
        return (b.resolution || 0) - (a.resolution || 0);
      });
    }

    availableCameras.value = filteredCameras;
    console.log('Available cameras:', availableCameras.value);

    showControls.value = mergedConfig.value.cameraConfig.cameraMode !== 'barcode'
    showGalleryButton.value = mergedConfig.value.cameraConfig.cameraMode === 'multiple-photos'
  } catch (error) {
    console.error('Error loading video devices:', error);
    alert(error instanceof Error ? error.message : 'Error loading video devices.');
    videoDevices.value = [];
    availableCameras.value = [];
  }
};

const switchCamera = async () => {
  if (availableCameras.value.length <= 1) return
  console.log("currentCameraIndex.value :", currentCameraIndex.value)
  // Stop current camera
  stopCamera()

  // Move to next camera
  currentCameraIndex.value = (currentCameraIndex.value + 1) % availableCameras.value.length
  const nextDeviceId = availableCameras.value[currentCameraIndex.value].device.deviceId

  console.log('Switching to camera:', nextDeviceId)

  await startCamera(nextDeviceId)
}

const startCamera = async (deviceId?: string) => {
  try {
    console.log('Starting camera:', deviceId)
    if (cameraReady.value) {
      await initCamera(deviceId)

      // Add this: Wait for video to be fully initialized
      if (videoRef.value) {
        // Create a promise that resolves when the video is ready
        await new Promise<void>((resolve) => {
          const checkVideoReady = () => {
            if (videoRef.value &&
                videoRef.value.readyState >= 2 &&
                videoRef.value.videoWidth > 0 &&
                videoRef.value.videoHeight > 0) {
              resolve();
            } else {
              requestAnimationFrame(checkVideoReady);
            }
          };
          checkVideoReady();
        });
        console.log('Video is ready');
        emit('camera-ready', true);
      }
    } else {
      showCamera.value = false
      // First, request basic camera access with minimal constraints
      const initialConstraints: MediaStreamConstraints = {
        video: true,
        audio: false
      };
      const initialStream = await navigator.mediaDevices.getUserMedia(initialConstraints);
      if (videoRef.value) {
        videoRef.value.srcObject = initialStream;
        await videoRef.value.play();
      }

      setTimeout(async () => {
        initialStream.getTracks().forEach((track) => track.stop())

        await loadVideoDevices();

        await startCamera(deviceId);
      }, 500)

      cameraReady.value = true;
    }
  } catch (err) {
    console.error('Camera access failed:', err);
    showCamera.value = false;
    alert(err instanceof Error ? err.message : "Camera access failed");
  }
};

const initCamera = async (deviceId?: string) => {
  // To utilize sorting algorithm from loadVideoDevices() when device id is not provided
  // Need to provide the device id for camera switching
  if (!deviceId) {
    deviceId = availableCameras.value.length > 0 ? availableCameras.value[0].device.deviceId : undefined;
  }

  const specificConstraints: MediaStreamConstraints = {
    video: {
      deviceId: deviceId ? {exact: deviceId} : undefined,
      // Use config resolution if provided, otherwise default to 4K
      width: mergedConfig.value.cameraConfig.resolution?.width
          ? {ideal: mergedConfig.value.cameraConfig.resolution.width}
          : {ideal: 4096},
      height: mergedConfig.value.cameraConfig.resolution?.height
          ? {ideal: mergedConfig.value.cameraConfig.resolution.height}
          : {ideal: 2160},
      aspectRatio: mergedConfig.value.cameraConfig.resolution?.aspectRatio
          ? {ideal: mergedConfig.value.cameraConfig.resolution.aspectRatio}
          : undefined,
    }
  };

  // Also respect frameRate settings if provided
  if (mergedConfig.value.cameraConfig.frameRate) {
    (specificConstraints.video as MediaTrackConstraints).frameRate = {
      ideal: mergedConfig.value.cameraConfig.frameRate.ideal,
      min: mergedConfig.value.cameraConfig.frameRate.min,
      max: mergedConfig.value.cameraConfig.frameRate.max,
    };
  }

  showCamera.value = true

  const stream = await navigator.mediaDevices.getUserMedia(specificConstraints);
  if (videoRef.value) {
    videoRef.value.srcObject = stream;
    videoRef.value.play();
  } else {
    console.error('Video element not found');
  }
}

const stopCamera = () => {
  const stream = videoRef.value?.srcObject as MediaStream
  stream?.getTracks().forEach((track) => track.stop())
}

// Caption
const saveCaption = () => {
  if (currentCaptionPhoto.value) {
    // Add caption to photo metadata
    currentCaptionPhoto.value.metadata.caption = captionInput.value.trim()

    // Finalize capture with caption
    finalizeCapture(currentCaptionPhoto.value)

    // Reset and hide modal
    currentCaptionPhoto.value = null
    showCaptionModal.value = false
  }
}

const skipCaption = () => {
  if (currentCaptionPhoto.value) {
    finalizeCapture(currentCaptionPhoto.value)
    currentCaptionPhoto.value = null
    showCaptionModal.value = false
  }
}

defineExpose({open})

const appHeight = ref(`${window.innerHeight}px`)

const updateHeight = () => {
  appHeight.value = `${window.innerHeight}px`
}
onMounted(async () => {
  updateHeight()
  window.addEventListener('resize', updateHeight)

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

  if (isIOS) {
    // For iOS devices, add these meta tags dynamically
    const metaTag = document.createElement('meta');
    metaTag.name = 'apple-mobile-web-app-capable';
    metaTag.content = 'yes';
    document.head.appendChild(metaTag);

    // Force hardware acceleration on iOS
    if (videoRef.value) {
      videoRef.value.style.transform = 'translateZ(0)';
    }
  }

  // Set initial viewport meta
  setViewportMetaForCamera(showCamera.value);
})

onBeforeUnmount(() => {
  stopCamera()
  window.removeEventListener('resize', updateHeight)
})

// In CameraView.vue, update the watcher to correctly access nested properties
watch(
    () => props.config,
    async (newConfig, oldConfig) => {
      // Check if camera-related config has changed
      const newCameraConfig = newConfig?.cameraConfig;
      const oldCameraConfig = oldConfig?.cameraConfig;

      const hasCameraConfigChanged =
          newCameraConfig?.cameraFacingMode !== oldCameraConfig?.cameraFacingMode ||
          newCameraConfig?.preferredFacing !== oldCameraConfig?.preferredFacing ||
          newCameraConfig?.cameraMode !== oldCameraConfig?.cameraMode;

      if (hasCameraConfigChanged) {
        console.log('Camera configuration changed, reloading devices');

        // If camera is currently active, we need to stop it first
        if (showCamera.value) {
          stopCamera();
        }

        // Reset camera index to ensure we start with the most appropriate camera
        currentCameraIndex.value = 0;

        // Reload video devices with new configuration
        await loadVideoDevices();

        // If camera was active, restart it with the new configuration
        if (showCamera.value) {
          const deviceId = availableCameras.value.length > 0
              ? availableCameras.value[currentCameraIndex.value].device.deviceId
              : undefined;
          await startCamera(deviceId);
        }
      }
    },
    {
      deep: true,
      immediate: false
    }
);

watch(showCamera, (isVisible) => {
  if (isVisible) {
    // Camera became visible
    setViewportMetaForCamera(true);
    resetZoomLevel();

    // Add event listeners to prevent zoom
    document.addEventListener('touchstart', preventZoomGesture, {passive: false});
    document.addEventListener('touchmove', preventZoomGesture, {passive: false});
    document.addEventListener('gesturestart', (e) => e.preventDefault(), {passive: false});
    document.addEventListener('gesturechange', (e) => e.preventDefault(), {passive: false});
    document.addEventListener('gestureend', (e) => e.preventDefault(), {passive: false});

    // For iOS 15+ double-tap prevention
    (document.documentElement.style as any)['-webkit-touch-callout'] = 'none';
    (document.documentElement.style as any)['-webkit-user-select'] = 'none';
  } else {
    // Camera was hidden
    setViewportMetaForCamera(false);

    // Remove the event listeners
    document.removeEventListener('touchstart', preventZoomGesture);
    document.removeEventListener('touchmove', preventZoomGesture);
    document.removeEventListener('gesturestart', (e) => e.preventDefault());
    document.removeEventListener('gesturechange', (e) => e.preventDefault());
    document.removeEventListener('gestureend', (e) => e.preventDefault());

    // Restore normal touch behavior
    (document.documentElement.style as any)['-webkit-touch-callout'] = '';
    (document.documentElement.style as any)['-webkit-user-select'] = '';
  }
});
// Add these variables to track touch events
let lastTouchDistance = 0;

// Prevent pinch zoom on the camera view
function preventZoomGesture(event: TouchEvent) {
  // Only prevent if the camera is active
  if (!showCamera.value) return;

  // For pinch gestures (2 fingers)
  if (event.touches.length >= 2) {
    event.preventDefault();
  }
}

// Reset zoom level if it has changed
function resetZoomLevel() {
  // This forces a visual refresh that can help reset zoom
  document.body.style.minHeight = '101vh';
  setTimeout(() => {
    document.body.style.minHeight = '';
  }, 30);
}

// Add these functions to your script setup
function setViewportMetaForCamera(enable: boolean) {
  console.log('setViewportMetaForCamera :', enable)
  // Find existing viewport meta tag or create a new one
  let viewportMeta = document.querySelector('meta[name="viewport"]');
  if (!viewportMeta) {
    viewportMeta = document.createElement('meta');
    viewportMeta.setAttribute('name', 'viewport');
    document.head.appendChild(viewportMeta);
  }

  if (enable) {
    // When camera is active: Prevent zoom, set initial scale
    viewportMeta.setAttribute('content',
        'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
  } else {
    // When camera is inactive: Restore normal behavior
    viewportMeta.setAttribute('content',
        'width=device-width, initial-scale=1.0');
  }
}
</script>
<template>
  <Base>
    <div v-if="showCamera"
         class="vcu:fixed vcu:inset-0 vcu:z-50 vcu:bg-black  vcu:dark:bg-black vcu:text-white vcu:dark:text-white vcu:flex vcu:flex-col vcu:overflow-hidden vcu:touch-manipulation vcu:select-none"
         style="padding-bottom: env(safe-area-inset-bottom);">
      <!-- Close button -->
      <button @click="showCamera = false"
              class="vcu:absolute vcu:top-4 vcu:right-4 vcu:z-50 vcu:bg-transparent vcu:dark:bg-transparent vcu:border-none vcu:text-white vcu:dark:text-white">
        <svg
            class="vcu:m-auto vcu:w-12 vcu:h-12 vcu:text-white vcu:dark:text-white vcu:drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]"
            xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <path d="M6 18L18 6M6 6l12 12" stroke="white" stroke-width="2" stroke-linecap="round"
                stroke-linejoin="round"/>
        </svg>
      </button>

      <!-- Live Camera View -->
      <div class="flex-1 relative">
        <video ref="videoRef" class="vcu:w-full vcu:h-full vcu:object-cover"
               autoplay playsinline muted
               @contextmenu.prevent
        ></video>
      </div>

      <!-- Floating Control Bar -->
      <div v-if="showControls"
           class="vcu:fixed vcu:bottom-0 vcu:left-0 vcu:right-0 vcu:z-50 vcu:flex vcu:justify-between vcu:items-center vcu:px-4 vcu:py-4 vcu:bg-black vcu:bg-opacity-80">
        <!-- Gallery Button -->
        <button v-if="capturedPhotos.length > 0 && showGalleryButton" @click="showGallery = true"
                class="vcu:w-16 vcu:h-16 vcu:border-2 vcu:border-white vcu:dark:border-white vcu:overflow-hidden vcu:bg-transparent vcu:dark:bg-transparent vcu:text-white vcu:dark:text-white">
          <img :src="capturedPhotos[capturedPhotos.length - 1].src"
               class="vcu:w-full vcu:h-full vcu:object-cover vcu:pointer-events-none vcu:select-none"
               alt="Thumbnail"
               draggable="false"
               aria-role="presentation"
          />
        </button>
        <div v-else class="vcu:w-16 vcu:h-16"></div>

        <!-- Capture Button -->
        <button @click="() => capture()"
                class="vcu:w-16 vcu:h-16 vcu:rounded-full vcu:bg-white vcu:dark:white vcu:shadow-lg vcu:border-none vcu:text-white vcu:dark:text-white"></button>

        <!-- Switch Camera Button -->
        <button v-if="availableCameras.length > 1" @click="switchCamera"
                class="vcu:w-16 vcu:h-16 vcu:flex vcu:items-center vcu:justify-center vcu:bg-transparent vcu:dark:bg-transparent vcu:border-none vcu:text-white vcu:dark:text-white">
          <svg class="vcu:m-auto vcu:w-12 vcu:h-12 vcu:text-white vcu:dark:text-white" aria-hidden="true"
               xmlns="http://www.w3.org/2000/svg"
               width="24"
               height="24" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M17.651 7.65a7.131 7.131 0 0 0-12.68 3.15M18.001 4v4h-4m-7.652 8.35a7.13 7.13 0 0 0 12.68-3.15M6 20v-4h4"/>
          </svg>
        </button>
        <div v-else class="vcu:w-16 vcu:h-16"></div>

      </div>

      <!-- Gallery Preview -->
      <GalleryView
          :photos="capturedPhotos"
          :show="showGallery"
          :config="props.config?.extra.gallery"
          @close="cancelGallery"
          @confirm="confirmGallery"/>

      <!-- Caption Modal -->
      <div v-if="showCaptionModal && currentCaptionPhoto"
           class="vcu:fixed vcu:inset-0 vcu:z-[60] vcu:bg-black vcu:bg-opacity-80 vcu:flex vcu:items-center vcu:justify-center vcu:p-4">
        <div class="vcu:bg-gray-800 vcu:rounded-lg vcu:max-w-md vcu:w-full vcu:p-4 vcu:shadow-lg">
          <h3 class="vcu:text-xl vcu:text-white vcu:mb-4">Add Caption</h3>

          <!-- Image preview -->
          <div class="vcu:mb-4 vcu:rounded vcu:overflow-hidden">
            <img :src="currentCaptionPhoto.src" class="vcu:w-full vcu:h-auto vcu:object-contain vcu:max-h-48 vcu:pointer-events-none vcu:select-none"
                 alt="Preview"
                 draggable="false"
                 aria-role="presentation"/>
          </div>

          <!-- Caption input -->
          <div class="vcu:mb-4">
            <input
                v-model="captionInput"
                type="text"
                class="vcu:w-full vcu:p-2 vcu:bg-gray-700 vcu:text-white vcu:rounded vcu:border vcu:border-gray-600 vcu:focus:outline-none vcu:focus:border-blue-500"
                :placeholder="mergedConfig.extra.caption?.placeholder || 'Add a caption...'"
                :maxlength="mergedConfig.extra.caption?.maxLength || 100"
                @keyup.enter="saveCaption"
            />
            <div class="vcu:text-xs vcu:text-gray-400 vcu:mt-1" v-if="mergedConfig.extra.caption?.maxLength">
              {{ captionInput.length }}/{{ mergedConfig.extra.caption.maxLength }}
            </div>
          </div>

          <!-- Buttons -->
          <div class="vcu:flex vcu:justify-end vcu:space-x-2">
            <button
                v-if="mergedConfig.extra.caption?.optional"
                @click="skipCaption"
                class="vcu:px-4 vcu:py-2 vcu:bg-gray-600 vcu:text-white vcu:rounded vcu:hover:bg-gray-700">
              Skip
            </button>
            <button
                @click="saveCaption"
                :disabled="!captionInput.trim()"
                class="vcu:px-4 vcu:py-2 vcu:text-white vcu:rounded"
                :class="captionInput.trim()
                ? 'vcu:bg-blue-600 vcu:hover:bg-blue-700'
                : 'vcu:bg-gray-400 vcu:cursor-not-allowed'">
              Save
            </button>
          </div>
        </div>
      </div>

      <!-- Canvas -->
      <canvas ref="canvasRef" class="vcu:hidden"></canvas>
    </div>
  </Base>
</template>