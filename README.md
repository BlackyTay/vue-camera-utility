# Vue Camera Utility

[![Version](https://img.shields.io/badge/version-0.0.1-blue.svg)](https://www.npmjs.com/package/vue-camera-utility)
[![License](https://img.shields.io/badge/license-ISC-green.svg)](https://opensource.org/licenses/ISC)

A lightweight Vue 3 component for camera access, photo capture, barcode scanning, and image selection. Ideal for web apps needing modern, mobile-first camera features with geolocation and gallery preview support.

## 🚀 Features

* 📷 **Live camera preview** — Real-time video stream from device camera
* 📸 **Multiple photo capture** — Capture and preview multiple images
* 📊 **Barcode scanning** — QR code, Code 128, and EAN-13 barcode detection
* 📍 **Geolocation support** — Automatically captures location with photos
* 🎼 **Gallery with selection** — Built-in gallery to select captured photos
* 🖼️ **Thumbnail generation** — Automatically creates smaller preview images
* ✅ **Metadata support** — Each photo includes timestamp, location, and barcode info
* 📱 **Fullscreen mobile-friendly overlay** — Works across iOS and Android
* 🔄 **Controlled launch** — Camera view is launched via `open()` method
* 🔒 **Secure by design** — HTTPS and permission-aware
* ⚡ **Built with TypeScript** — Full type safety and clean design

## 📦 Installation

```bash
npm install vue-camera-utility
```

## 🛠️ Usage

### Basic Usage

```vue
<script setup lang="ts">
import { ref } from 'vue'
import CameraView from 'vue-camera-utility'

const camera = ref()
const photos = ref([])

const openCamera = async () => {
  photos.value = await camera.value.open()
}
</script>

<template>
  <button @click="openCamera">Open Camera</button>
  <CameraView ref="camera" />

  <div v-if="photos.length" class="grid grid-cols-2 gap-2 mt-4">
    <div v-for="(photo, i) in photos" :key="i">
      <img :src="photo.src" class="rounded border" />
      <div class="text-xs text-gray-500">{{ new Date(photo.metadata.timestamp).toLocaleString() }}</div>
    </div>
  </div>
</template>
```

### With Configuration Options

```vue
<script setup lang="ts">
import { ref } from 'vue'
import CameraView from 'vue-camera-utility'
import type { CameraConfig } from 'vue-camera-utility'

const camera = ref()
const photos = ref([])

// Optional configuration
const cameraConfig: CameraConfig = {
  cameraMode: 'barcode', // 'single-photo', 'multiple-photos', or 'barcode'
  imageType: 'image/jpeg',
  imageQuality: 0.9,
  enableGeolocation: true,
  geolocationOptions: {
    enableHighAccuracy: true,
    timeout: 5000,
    maximumAge: 0
  },
  generateThumbnail: true,
  thumbnailSize: { width: 200, height: 150 }
}

const openCamera = async () => {
  photos.value = await camera.value.open()
}

const scanBarcode = async () => {
  const result = await camera.value.open()
  if (result && result.length > 0) {
    console.log('Barcode value:', result[0].metadata.barcode)
  }
}
</script>

<template>
  <button @click="openCamera">Take Photos</button>
  <button @click="scanBarcode">Scan Barcode</button>
  <CameraView ref="camera" :config="cameraConfig" />

  <div v-if="photos.length" class="grid grid-cols-2 gap-2 mt-4">
    <div v-for="(photo, i) in photos" :key="i">
      <img :src="photo.thumbnail" class="rounded border" />
      <div class="text-xs text-gray-500">
        {{ new Date(photo.metadata.timestamp).toLocaleString() }}
      </div>
      <div v-if="photo.metadata.barcode" class="text-xs text-blue-500">
        Barcode: {{ photo.metadata.barcode }}
      </div>
    </div>
  </div>
</template>
```

## 🌟 Component Features

### Camera

* Opens in fullscreen overlay
* Automatically starts video stream
* Capture button stores images
* Multiple camera modes (single photo, multiple photos, barcode)
* Automatic camera selection (prefers back camera)
* Auto-cleans when closed

### Barcode Scanner

* Supports QR codes, Code 128, and EAN-13 formats
* Uses native BarcodeDetector API when available
* Falls back to ZXing library for broader compatibility
* Continuous scanning until barcode is found

### Geolocation

* Automatically captures location with each photo
* Configurable accuracy and timeout settings
* Graceful error handling for permission issues

### Gallery

* Captured photos stored in memory
* Grid preview of all images
* Thumbnail generation for faster loading
* Timestamp and location overlay
* Barcode value display (when available)
* Select one or many to return to parent

## 📄 Returned Data

Each photo object returned is shaped like:

```ts
interface CapturedPhoto {
  src: string             // Full-size base64 image
  thumbnail: string       // Smaller base64 image
  metadata: PhotoMetadata
}

interface PhotoMetadata {
  timestamp: string       // ISO timestamp
  latitude: string        // Geolocation latitude
  longitude: string       // Geolocation longitude
  barcode?: string        // Barcode value (if in barcode mode)
}
```

## 🔧 Requirements

* **Vue**: 3.5.17+
* **Node**: 14.18.0+
* **HTTPS**: Secure context required for camera and geolocation
* **Dependencies**: 
  * @zxing/library (^0.21.3) - For barcode scanning in browsers without native support
  * Tailwind CSS (^4.1.11) - For styling components

## ✅ Supported Browsers

| Browser | Version |
| ------- | ------- |
| Chrome  | 53+     |
| Firefox | 49+     |
| Safari  | 11+     |
| Edge    | 79+     |

## 🛡️ Security & Privacy

* No data transmission — runs fully in browser
* Camera stops automatically on close
* Geolocation data is only stored in memory with photos
* Barcode data is only processed locally
* Respects all permission prompts for camera and location
* Can disable geolocation with configuration option

## 🏗️ Development Setup

```bash
# Clone & enter project
git clone <repository-url>
cd vue-camera-utility

# Install deps
npm install

# Build
npm run build

# Type check
npm run type-check
```

### Project Structure

```sh
vue-camera-utility/
├── src/
│   ├── assets/style.css
│   ├── components/
│   │   ├── CameraView.vue
│   │   └── GalleryView.vue
│   ├── utils/
│   │   ├── barcode.ts
│   │   ├── geolocation.ts
│   │   └── image.ts
│   ├── types.ts
│   ├── shims-vue.d.ts
│   └── main.ts
├── dist/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── LICENSE
├── NOTICE
└── README.md
```

## 🥚 API Reference

### Methods

| Method   | Description                                      |
| -------- | ------------------------------------------------ |
| `open()` | Opens camera overlay and returns selected images |

### Props

| Prop     | Type           | Default | Description                    |
| -------- | -------------- | ------- | ------------------------------ |
| `config` | `CameraConfig` | `{}`    | Configuration options (see below) |

### Configuration Options

| Option               | Type                                | Default            | Description                                |
| -------------------- | ----------------------------------- | ------------------ | ------------------------------------------ |
| `cameraMode`         | `'single-photo' \| 'multiple-photos' \| 'barcode'` | `'multiple-photos'` | Camera operation mode |
| `imageType`          | `'image/png' \| 'image/jpeg'`       | `'image/png'`      | Image format for captured photos           |
| `imageQuality`       | `number`                            | `0.80`             | Image quality (0.0-1.0, JPEG only)         |
| `enableGeolocation`  | `boolean`                           | `true`             | Whether to capture location with photos    |
| `geolocationOptions` | `PositionOptions`                   | `{enableHighAccuracy: true, timeout: 3000, maximumAge: 30000}` | Geolocation API options |
| `generateThumbnail`  | `boolean`                           | `true`             | Whether to generate thumbnail images       |
| `thumbnailSize`      | `{width: number, height: number}`   | `{width: 160, height: 120}` | Size of generated thumbnails    |

### Returned Structure

| Property              | Type     | Description                      |
| --------------------- | -------- | -------------------------------- |
| `src`                 | `string` | Base64 image (PNG or JPEG)       |
| `thumbnail`           | `string` | Base64 thumbnail image           |
| `metadata.timestamp`  | `string` | ISO string (e.g. 2025-07-10T...) |
| `metadata.latitude`   | `string` | Geolocation latitude             |
| `metadata.longitude`  | `string` | Geolocation longitude            |
| `metadata.barcode`    | `string` | Barcode value (if detected)      |

## 🤝 Contributing

Pull requests and feature discussions are welcome!

## 📄 License

ISC License

## 🚘 Troubleshooting

### Camera Issues
* Ensure HTTPS is used (required for camera access)
* Check that camera permission is granted
* Look for errors in browser console
* Ensure the camera is not used by other apps

### Barcode Scanning Issues
* Make sure the barcode is well-lit and clearly visible
* Hold the device steady when scanning
* For older browsers without native BarcodeDetector API, ensure @zxing/library is properly loaded
* Try different barcode formats if one isn't recognized

### Geolocation Issues
* Ensure location permission is granted in the browser
* Check that device location services are enabled
* For better accuracy, use outdoors or away from signal interference
* Increase the timeout in geolocationOptions if needed

---

Built with ❤️ using Vue 3 + Vite + Tailwind CSS
