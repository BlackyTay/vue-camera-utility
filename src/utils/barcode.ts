import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';

export const barcodeScanWithFallback = async (video: HTMLVideoElement): Promise<string | null> => {
  const codeReader = new BrowserMultiFormatReader();
  try {
    const result = await codeReader.decodeFromVideo(video);
    return result.getText();
  } catch (err) {
    if (err instanceof NotFoundException) return null;
    throw err;
  } finally {
    codeReader.reset();
  }
};

export async function scanBarcodeUntilFound(
  video: HTMLVideoElement,
  useFallback = true
): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const hasNativeDetector = 'BarcodeDetector' in window;

    const tick = async () => {
      try {
        if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
          let value: string | null = null;

          if (hasNativeDetector) {
            // const canvas = document.createElement('canvas');
            // canvas.width = video.videoWidth;
            // canvas.height = video.videoHeight;
            // const ctx = canvas.getContext('2d');
            // if (ctx) {
            //   ctx.drawImage(video, 0, 0);
            //   const bitmap = await createImageBitmap(canvas);
            const bitmap = await createImageBitmap(video);
            const detector = new BarcodeDetector({
              formats: ['qr_code', 'code_128', 'ean_13']
            });
            const barcodes = await detector.detect(bitmap);
            value = barcodes[0]?.rawValue ?? null;
            // }
          } else if (useFallback) {
            value = await barcodeScanWithFallback(video);
          }

          if (value) {
            return resolve(value);
          }
        }
      } catch (err) {
        console.error('Barcode scan failed', err);
        if (!hasNativeDetector && !useFallback) {
          return reject(err);
        }
      }

      requestAnimationFrame(tick);
    };

    tick();
  });
}
