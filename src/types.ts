// ========== Core Camera Types ==========

export const CAMERA_MODES = ['single-photo', 'multiple-photos', 'barcode'] as const
export type CameraMode = typeof CAMERA_MODES[number]

export interface CameraConfig {
    cameraMode: CameraMode
    cameraFacingMode?: 'all' | 'user' | 'environment'
    preferredFacing?: 'user' | 'environment'
    resolution?: {
        width?: number
        height?: number
        aspectRatio?: number
    }
    frameRate?: {
        ideal?: number
        min?: number
        max?: number
    }
}

export interface CameraViewConfig {
    cameraConfig: CameraConfig
    imageConfig?: ImageConfig
    extra: ExtraConfig
}

export interface ExtraConfig {
    geolocation?: PositionOptions
    gallery?: GalleryConfig
    scanner?: ScannerConfig
    caption?: CaptionConfig
}

// ========== Photo & Metadata Types ==========

export interface CapturedPhoto {
    src: string             // Full-size base64 image
    metadata: PhotoMetadata
}

export interface PhotoMetadata {
    timestamp: string
    coordinate?: Coordinate
    barcode?: string        // Barcode value
    caption?: string
}

export interface Coordinate {
    latitude?: number
    longitude?: number
}

// ========== Gallery Types ==========

export interface GalleryConfig {
    maxPhotos?: number
    maxSelected?: number
    preview?: boolean
}

export interface CaptionConfig {
    placeholder: string
    maxLength: number
}

// ========== Barcode Scanner Types ==========

export interface ScannerConfig {
    formats: BarcodeFormat[]
    onResult: (result: string) => void
    onError?: (error: Error) => void
}

// ========== Image Processing Types ==========

export interface ImageConfig {
    // Basic output settings
    imageType?: 'image/png' | 'image/jpeg'
    imageQuality?: number // 0.0 to 1.0 (lower = more compression, higher = better quality, only applies for JPEG)

    // Size controls
    outputSize?: {
        width?: number // px
        height?: number // px
        maintainAspectRatio?: boolean
        maxWidth?: number // px
        maxHeight?: number // px
        scaleMode?: 'cover' | 'contain' | 'stretch'
    }

    // Transformations
    transform?: ImageTransform

    // Overlay options
    watermark?: WatermarkConfig

    // Processing hooks
    beforeProcess?: (imageData: ImageData) => Promise<ImageData> | ImageData
    afterProcess?: (result: string) => Promise<string> | string
}

export interface ImageTransform {
    resize?: {
        width?: ElementSize
        height?: ElementSize
        maintainAspectRatio?: boolean
    }
    crop?: {
        x: number // px
        y: number // px
        width: number // px
        height: number // px
    }
    rotate?: number // degrees
    flip?: 'horizontal' | 'vertical' | 'both'
}

// ========== Watermark Types ==========

export interface WatermarkConfig {
    // Positioning
    horizontalAlign: 'left' | 'center' | 'right'
    verticalAlign: 'top' | 'center' | 'bottom'
    padding: ElementPosition
    margin: ElementPosition

    // Styling
    textStyle: TextStyle
    backgroundColor?: string // CSS color value (hex, rgb, rgba, etc.)
    opacity?: number // 0.0 to 1.0 (0 = transparent, 1 = opaque)

    // Dimensions
    width?: ElementSize
    height?: ElementSize

    // Content
    value?: WatermarkValue
}

export type WatermarkValue =
    | string
    | string[]
    | { type: 'function', getter: () => string | Promise<string> }
    | { type: 'arrayFunction', getter: () => string[] | Promise<string[]> }

export interface TextStyle {
    color: string // CSS color value (hex, rgb, rgba, etc.)
    size: ElementSize
    fontFamily?: string
    fontWeight?: 'normal' | 'bold' | number
    fontStyle?: 'normal' | 'italic'
    letterSpacing?: ElementSize
    lineHeight?: ElementSize | number
    textWrap?: boolean
}

// ========== Common UI Types ==========

export interface ElementPosition {
    top?: ElementSize
    right?: ElementSize
    bottom?: ElementSize
    left?: ElementSize
}

export type CSSUnit = 'px' | 'em' | 'rem' | '%' | 'vh' | 'vw'

export interface ElementSize {
    unit: CSSUnit
    value: number
}
