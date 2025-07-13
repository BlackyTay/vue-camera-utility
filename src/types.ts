export interface PhotoMetadata {
  timestamp: string
  latitude: string
  longitude: string
}

export interface CapturedPhoto {
  src: string        // Full-size base64 image
  thumbnail: string  // Smaller base64 image
  metadata: PhotoMetadata
}
