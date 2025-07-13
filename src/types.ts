export interface PhotoMetadata {
  timestamp: string
  latitude: string
  longitude: string
  barcode?: string        // Barcode value
}

export interface CapturedPhoto {
  src: string             // Full-size base64 image
  thumbnail: string       // Smaller base64 image
  metadata: PhotoMetadata,
}

export interface CameraConfig {
  cameraMode: CameraMode
  imageType?: 'image/png' | 'image/jpeg'
  imageQuality?: number // 0.0 to 1.0 (only applies for JPEG)
  enableGeolocation?: boolean
  geolocationOptions?: PositionOptions
  generateThumbnail?: boolean
  thumbnailSize?: { width: number; height: number }
}

export type CameraMode = 'single-photo' | 'multiple-photos' | 'barcode' 
