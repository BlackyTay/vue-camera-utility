export const generateThumbnailFromCanvas = (
  sourceCanvas: HTMLCanvasElement,
  size: { width: number; height: number }
): Promise<string> => {
  const { width, height } = size
  const offscreenCanvas = document.createElement('canvas')
  offscreenCanvas.width = width
  offscreenCanvas.height = height

  const ctx = offscreenCanvas.getContext('2d')
  if (!ctx) return Promise.resolve('')

  ctx.drawImage(sourceCanvas, 0, 0, width, height)

  return Promise.resolve(offscreenCanvas.toDataURL('image/jpeg', 0.75))
}
