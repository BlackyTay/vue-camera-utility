# Vue Camera Utility

[![Version](https://img.shields.io/badge/version-1.0.1-blue.svg)](https://www.npmjs.com/package/vue-camera-utility)
[![License](https://img.shields.io/badge/license-ISC-green.svg)](https://opensource.org/licenses/ISC)

A lightweight Vue 3 component for camera access, photo capture, barcode scanning, and image selection. Ideal for web
apps needing modern, mobile-first camera features with geolocation and gallery preview support.

## 🚀 Features

* 📷 **Live camera preview** — Real-time video stream from device camera
* 📸 **Multiple photo capture** — Capture and preview multiple images
* 📊 **Barcode scanning** — QR code, Code 128, EAN-13, Data Matrix, Aztec, and PDF417 barcode detection
* 📍 **Geolocation support** — Automatically captures location with photos
* 🎼 **Gallery with selection** — Built-in gallery to select captured photos
* ✅ **Metadata support** — Each photo includes timestamp, location, and barcode info
* 📝 **Caption support** — Add text captions to captured photos
* 🔄 **Image transformations** — Resize, crop, rotate, and flip images
* 💧 **Watermark capabilities** — Add text watermarks to images with customizable styling
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
  import {ref} from 'vue'
  import {CameraView} from 'vue-camera-utility'

  const camera = ref()
  const photos = ref([])

  const openCamera = async () => {
    photos.value = await camera.value.open()
  }
</script>

<template>
  <button @click="openCamera">Open Camera</button>
  <CameraView ref="camera"/>

  <div v-if="photos.length" class="grid grid-cols-2 gap-2 mt-4">
    <div v-for="(photo, i) in photos" :key="i">
      <img :src="photo.src" class="rounded border"/>
      <div class="text-xs text-gray-500">
        {{ new Date(photo.metadata.timestamp).toLocaleString() }}
      </div>
      <div v-if="photo.metadata.coordinate" class="text-xs text-gray-500">
        Location: {{ photo.metadata.coordinate.latitude }}, {{ photo.metadata.coordinate.longitude }}
      </div>
    </div>
  </div>
</template>
```

### With Configuration Options

```vue

<script setup lang="ts">
  import {ref} from 'vue'
  import CameraView from 'vue-camera-utility'
  import type {CameraViewConfig} from 'vue-camera-utility'

  const camera = ref()
  const photos = ref([])

  // Optional configuration
  const cameraConfig: CameraViewConfig = {
    cameraConfig: {
      cameraMode: 'barcode', // 'single-photo', 'multiple-photos', or 'barcode'
      cameraFacingMode: 'environment', // Prefer back camera
    },
    imageConfig: {
      imageType: 'image/jpeg',
      imageQuality: 0.9,
      // Add image transformations if needed
      transform: {
        resize: {
          width: {value: 800, unit: 'px'},
          height: {value: 600, unit: 'px'},
          maintainAspectRatio: true
        }
      }
    },
    extra: {
      // Enable geolocation
      geolocation: {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      },
      // Gallery options
      gallery: {
        maxPhotos: 10,
        maxSelected: 5,
        preview: true
      },
      // Caption options
      caption: {
        placeholder: 'Add a caption...',
        maxLength: 100,
        optional: true
      }
    }
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
  <CameraView ref="camera" :config="cameraConfig"/>

  <div v-if="photos.length" class="grid grid-cols-2 gap-2 mt-4">
    <div v-for="(photo, i) in photos" :key="i">
      <img :src="photo.src" class="rounded border"/>
      <div class="text-xs text-gray-500">
        {{ new Date(photo.metadata.timestamp).toLocaleString() }}
      </div>
      <div v-if="photo.metadata.coordinate" class="text-xs text-gray-500">
        Location: {{ photo.metadata.coordinate.latitude }}, {{ photo.metadata.coordinate.longitude }}
      </div>
      <div v-if="photo.metadata.barcode" class="text-xs text-blue-500">
        Barcode: {{ photo.metadata.barcode }}
      </div>
      <div v-if="photo.metadata.caption" class="text-xs text-green-500">
        Caption: {{ photo.metadata.caption }}
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

* Supports all barcode formats supported by https://github.com/Sec-ant/barcode-detector
* Uses BarcodeDetector API (via barcode-detector polyfill)
* Continuous scanning until barcode is found

### Geolocation

* Automatically captures location with each photo
* Configurable accuracy and timeout settings
* Graceful error handling for permission issues

### Gallery

* Captured photos stored in memory
* Grid preview of all images
* Timestamp and location overlay
* Barcode value display (when available)
* Select one or many to return to parent

## 📄 Returned Data

Each photo object returned is shaped like:

```ts
interface CapturedPhoto {
    src: string             // Full-size base64 image
    metadata: PhotoMetadata
}

interface PhotoMetadata {
    timestamp: string       // ISO timestamp
    coordinate?: {
        latitude?: number     // Geolocation latitude
        longitude?: number    // Geolocation longitude
    }
    barcode?: string        // Barcode value (if in barcode mode)
    caption?: string        // User-provided caption (if caption enabled)
}
```

## 🔧 Requirements

* **Vue**: 3.5.17+
* **Node**: 14.18.0+
* **HTTPS**: Secure context required for camera and geolocation
* **Dependencies**:
    * barcode-detector (^3.0.5) - For barcode scanning
    * @vue/compiler-sfc (^3.5.17) - Vue SFC compiler
    * Tailwind CSS (^4.1.11) - For styling components

## ✅ Supported Browsers

| Browser | Version |
|---------|---------|
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

# Install dependencies
npm install

# Development build with watch mode
npm run watch

# Development build
npm run build:dev

# Production build
npm run build:prod

# Default build (production)
npm run build
```

### Project Structure

```sh
vue-camera-utility/
├── src/
│   ├── components/
│   │   ├── Base.vue
│   │   ├── CameraView.vue
│   │   └── GalleryView.vue
│   ├── utils/
│   │   ├── barcode.ts
│   │   ├── geolocation.ts
│   │   └── image.ts
│   ├── types.ts
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
|----------|--------------------------------------------------|
| `open()` | Opens camera overlay and returns selected images |

### Props

| Prop     | Type           | Default | Description                       |
|----------|----------------|---------|-----------------------------------|
| `config` | `CameraConfig` | `{}`    | Configuration options (see below) |

### Configuration Options

The component accepts a comprehensive configuration object with the following structure:

```ts
interface CameraViewConfig {
    cameraConfig: CameraConfig
    imageConfig?: ImageConfig
    extra: ExtraConfig
}
```

#### Camera Configuration

| Option             | Type                                                      | Default             | Description                              |
|--------------------|-----------------------------------------------------------|---------------------|------------------------------------------|
| `cameraMode`       | `'single-photo' \| 'multiple-photos' \| 'barcode'`        | `'multiple-photos'` | Camera operation mode                    |
| `cameraFacingMode` | `'all' \| 'user' \| 'environment'`                        | `'all'`             | Which camera to use (front/back/both)    |
| `preferredFacing`  | `'user' \| 'environment'`                                 | -                   | Preferred camera when multiple available |
| `resolution`       | `{width?: number, height?: number, aspectRatio?: number}` | -                   | Requested camera resolution              |
| `frameRate`        | `{ideal?: number, min?: number, max?: number}`            | -                   | Requested camera frame rate              |

#### Image Configuration

| Option         | Type                          | Default        | Description                                        |
|----------------|-------------------------------|----------------|----------------------------------------------------|
| `imageType`    | `'image/png' \| 'image/jpeg'` | `'image/jpeg'` | Image format for captured photos                   |
| `imageQuality` | `number`                      | `0.80`         | Image quality (0.0-1.0, JPEG only)                 |
| `outputSize`   | `Object`                      | -              | Control output image dimensions                    |
| `transform`    | `ImageTransform`              | -              | Apply transformations (resize, crop, rotate, flip) |
| `watermark`    | `WatermarkConfig`             | -              | Add text watermark to images                       |

#### Extra Configuration

| Option        | Type                                                                 | Default                                                        | Description             |
|---------------|----------------------------------------------------------------------|----------------------------------------------------------------|-------------------------|
| `geolocation` | `PositionOptions`                                                    | `{enableHighAccuracy: true, timeout: 3000, maximumAge: 30000}` | Geolocation API options |
| `gallery`     | `{maxPhotos?: number, maxSelected?: number, preview?: boolean}`      | `{maxPhotos: 10, maxSelected: 5, preview: true}`               | Gallery options         |
| `scanner`     | `{formats: BarcodeFormat[], onResult: Function, onError?: Function}` | -                                                              | Barcode scanner options |
| `caption`     | `{placeholder?: string, maxLength?: number, optional?: boolean}`     | -                                                              | Caption input options   |

### Returned Structure

Each photo object returned is shaped like:

```ts
interface CapturedPhoto {
    src: string             // Full-size base64 image
    metadata: PhotoMetadata
}

interface PhotoMetadata {
    timestamp: string       // ISO timestamp
    coordinate?: {
        latitude?: number
        longitude?: number
    }
    barcode?: string        // Barcode value (if in barcode mode)
    caption?: string        // User-provided caption (if caption enabled)
}
```

| Property                        | Type     | Description                          |
|---------------------------------|----------|--------------------------------------|
| `src`                           | `string` | Base64 image (PNG or JPEG)           |
| `metadata.timestamp`            | `string` | ISO string (e.g. 2025-07-10T...)     |
| `metadata.coordinate.latitude`  | `number` | Geolocation latitude (if available)  |
| `metadata.coordinate.longitude` | `number` | Geolocation longitude (if available) |
| `metadata.barcode`              | `string` | Barcode value (if detected)          |
| `metadata.caption`              | `string` | User-provided caption (if enabled)   |

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
* The barcode-detector polyfill is used for cross-browser compatibility
* Try different barcode formats if one isn't recognized

### Geolocation Issues

* Ensure location permission is granted in the browser
* Check that device location services are enabled
* For better accuracy, use outdoors or away from signal interference
* Increase the timeout in geolocationOptions if needed

---

Built with ❤️ using Vue 3 + Vite + Tailwind CSS
