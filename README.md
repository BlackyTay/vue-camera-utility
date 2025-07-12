# Vue Camera Utility

A lightweight Vue 3 component for camera access, photo capture, and image selection. Ideal for web apps needing modern, mobile-first camera features with gallery preview support.

## 🚀 Features

* 📷 **Live camera preview** — Real-time video stream from device camera
* 📸 **Multiple photo capture** — Capture and preview multiple images
* 🎼 **Gallery with selection** — Built-in gallery to select captured photos
* ✅ **Metadata support** — Each photo includes timestamp info
* 📱 **Fullscreen mobile-friendly overlay** — Works across iOS and Android
* 🔄 **Controlled launch** — Camera view is launched via `open()` method
* 🔒 **Secure by design** — HTTPS and permission-aware
* ⚡ **Built with TypeScript** — Full type safety and clean design

## 📦 Installation

```bash
npm install vue-camera-utility
```

## 🛠️ Usage

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
      <div class="text-xs text-gray-500">{{ new Date(photo.timestamp).toLocaleString() }}</div>
    </div>
  </div>
</template>
```

## 🌟 Component Features

### Camera

* Opens in fullscreen overlay
* Automatically starts video stream
* Capture button stores images
* Auto-cleans when closed

### Gallery

* Captured photos stored in memory
* Grid preview of all images
* Timestamp overlay
* Select one or many to return to parent

## 📄 Returned Data

Each photo object returned is shaped like:

```ts
interface CapturedPhoto {
  src: string        // Base64 image
  timestamp: string  // ISO timestamp
}
```

## 🔧 Requirements

* **Vue**: 3.5.17+
* **Node**: 14.18.0+
* **HTTPS**: Secure context required

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
* Respects all permission prompts

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
│   ├── components/CameraView.vue
│   ├── shims-vue.d.ts
│   └── main.ts
├── dist/
├── package.json
├── vite.config.ts
├── tsconfig.json
└── README.md
```

## 🥚 API Reference

### Methods

| Method   | Description                                      |
| -------- | ------------------------------------------------ |
| `open()` | Opens camera overlay and returns selected images |

### Returned Structure

| Property    | Type     | Description                      |
| ----------- | -------- | -------------------------------- |
| `src`       | `string` | Base64 PNG image                 |
| `timestamp` | `string` | ISO string (e.g. 2025-07-10T...) |

## 🤝 Contributing

Pull requests and feature discussions are welcome!

## 📄 License

ISC License

## 🚘 Troubleshooting

* Ensure HTTPS is used
* Check that camera permission is granted
* Look for errors in browser console
* Ensure the camera is not used by other apps

---

Built with ❤️ using Vue 3 + Vite + Tailwind CSS
