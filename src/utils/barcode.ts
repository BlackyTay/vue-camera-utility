import 'barcode-detector';
import {ScannerConfig} from "@/types";

/**
 * Creates a CORS-safe canvas from a video element
 */
function createCORSSafeCanvas(video: HTMLVideoElement): HTMLCanvasElement {
    // Create a canvas element
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw the video frame to canvas
    if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    }

    return canvas;
}

/**
 * Continuously scans for barcodes in video stream using the provided configuration
 * @param video - The video element to scan
 * @param config - Scanner configuration including formats and callbacks
 * @returns A function that stops the scanning process when called
 */
export function startBarcodeScanner(
    video: HTMLVideoElement,
    config: ScannerConfig
): () => void {
    const {formats, onResult, onError} = config;

    // Create detector with specified formats
    const detector = new BarcodeDetector({formats});

    let isScanning = true;
    let animationFrameId: number;

    const tick = async () => {
        if (!isScanning) return;

        try {
            if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
                // Use the CORS-safe bitmap creation function instead
                const canvas = await createCORSSafeCanvas(video);

                // Detect barcodes
                const barcodes = await detector.detect(canvas);

                // Release canvas resources
                canvas.remove();

                // If a barcode is found, call onResult
                if (barcodes.length > 0) {
                    onResult(barcodes[0].rawValue);
                }
            }
        } catch (err) {
            console.error('Barcode scan failed', err);

            // Call onError if provided
            if (onError && err instanceof Error) {
                onError(err);
            }
        }

        // Continue scanning on next animation frame if still active
        if (isScanning) {
            animationFrameId = requestAnimationFrame(tick);
        }
    };

    // Start scanning
    animationFrameId = requestAnimationFrame(tick);

    // Return function to stop scanning
    return () => {
        isScanning = false;
        cancelAnimationFrame(animationFrameId);
    };
}

/**
 * Scans for a barcode until one is found or an error occurs
 * @param video - The video element to scan
 * @param formats - Barcode formats to detect (optional)
 * @returns Promise that resolves with barcode value or null
 */
export async function scanBarcodeUntilFound(
    video: HTMLVideoElement,
    formats: BarcodeFormat[] = ['qr_code', 'code_128', 'ean_13', 'data_matrix', 'aztec', 'pdf417'],
): Promise<string | null> {
    return new Promise((resolve, reject) => {
        const stopScanner = startBarcodeScanner(video, {
            formats,
            onResult: (result) => {
                stopScanner(); // Stop scanning when result is found
                resolve(result);
            },
            onError: (error) => {
                stopScanner(); // Stop scanning on error
                reject(error);
            }
        });
    });
}

/**
 * Scans for barcodes with a timeout
 * @param video - The video element to scan
 * @param formats - Barcode formats to detect (optional)
 * @param timeoutMs - Timeout in milliseconds (default: 30000)
 * @returns Promise that resolves with barcode value or null on timeout
 */
export async function scanBarcodeWithTimeout(
    video: HTMLVideoElement,
    formats: BarcodeFormat[] = ['qr_code', 'code_128', 'ean_13', 'data_matrix', 'aztec', 'pdf417'],
    timeoutMs: number = 30000
): Promise<string | null> {
    return new Promise((resolve) => {
        let isResolved = false;

        // Setup timeout
        const timeoutId = setTimeout(() => {
            if (!isResolved) {
                isResolved = true;
                stopScanner();
                resolve(null);
            }
        }, timeoutMs);

        // Start scanner
        const stopScanner = startBarcodeScanner(video, {
            formats,
            onResult: (result) => {
                if (!isResolved) {
                    isResolved = true;
                    clearTimeout(timeoutId);
                    stopScanner();
                    resolve(result);
                }
            },
            onError: (error) => {
                console.error('Scanner error:', error);
                // Continue scanning on error, don't reject
            }
        });
    });
}