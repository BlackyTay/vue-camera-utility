import {ImageConfig, MetadataType, PhotoMetadata, WatermarkConfig, WatermarkValue} from "@/types";

/**
 * Processes an image directly on the given canvas
 * @param canvas Canvas element
 * @param ctx Canvas 2D context
 * @param imgConfig Image configuration
 * @param metadata
 */
export const processImageInPlace = async (
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    imgConfig: ImageConfig,
    metadata?: PhotoMetadata
): Promise<void> => {
  let imageData: ImageData;
  let processedImageData: ImageData;

  // Apply beforeProcess hook if provided
  if (imgConfig.beforeProcess) {
    try {
      // Get ImageData from the canvas
      imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // Apply the hook
      processedImageData = await imgConfig.beforeProcess(imageData);

      // Put processed data back to canvas
      ctx.putImageData(processedImageData, 0, 0);
    } catch (error) {
      console.error('Error in beforeProcess hook:', error);
    }
  }

  // Get original dimensions
  const srcWidth = canvas.width;
  const srcHeight = canvas.height;

  // Calculate output size based on config
  let outputWidth = srcWidth;
  let outputHeight = srcHeight;

  if (imgConfig.outputSize) {
    const { width, height, maxWidth, maxHeight, maintainAspectRatio = true, scaleMode = 'contain' } = imgConfig.outputSize;

    // Apply exact dimensions if specified
    if (width !== undefined || height !== undefined) {
      outputWidth = width !== undefined ? width : srcWidth;
      outputHeight = height !== undefined ? height : srcHeight;

      // Adjust to maintain aspect ratio if needed
      if (maintainAspectRatio && width !== undefined && height !== undefined) {
        const srcAspectRatio = srcWidth / srcHeight;
        const targetAspectRatio = width / height;

        if (scaleMode === 'cover') {
          // Cover: ensure the image covers the entire area (may crop)
          if (srcAspectRatio > targetAspectRatio) {
            outputWidth = Math.round(outputHeight * srcAspectRatio);
          } else {
            outputHeight = Math.round(outputWidth / srcAspectRatio);
          }
        } else if (scaleMode === 'contain') {
          // Contain: ensure the entire image is visible (may have blank space)
          if (srcAspectRatio > targetAspectRatio) {
            outputHeight = Math.round(outputWidth / srcAspectRatio);
          } else {
            outputWidth = Math.round(outputHeight * srcAspectRatio);
          }
        }
        // 'stretch' mode uses the exact dimensions
      }
    }

    // Apply max dimensions if specified
    if (maxWidth !== undefined && outputWidth > maxWidth) {
      outputWidth = maxWidth;
      if (maintainAspectRatio) {
        outputHeight = Math.round(outputWidth * (srcHeight / srcWidth));
      }
    }

    if (maxHeight !== undefined && outputHeight > maxHeight) {
      outputHeight = maxHeight;
      if (maintainAspectRatio) {
        outputWidth = Math.round(outputHeight * (srcWidth / srcHeight));
      }
    }
  }

  // Need to resize the canvas? Store the original image first
  if (outputWidth !== srcWidth || outputHeight !== srcHeight || imgConfig.transform) {
    // Create a temporary canvas to hold the original image
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = srcWidth;
    tempCanvas.height = srcHeight;
    const tempCtx = tempCanvas.getContext('2d');

    if (!tempCtx) throw new Error("Could not get temporary canvas context");

    // Copy the current canvas content to the temp canvas
    tempCtx.drawImage(canvas, 0, 0);

    // Resize the main canvas
    canvas.width = outputWidth;
    canvas.height = outputHeight;

    // Clear the main canvas
    ctx.clearRect(0, 0, outputWidth, outputHeight);

    // Variables for source drawing coordinates (used for transforms)
    let drawX = 0;
    let drawY = 0;
    let drawWidth = srcWidth;
    let drawHeight = srcHeight;

    // Apply transformations if specified
    if (imgConfig.transform) {
      const { crop, rotate, flip, resize } = imgConfig.transform;

      // Apply crop if specified
      if (crop) {
        drawX = crop.x;
        drawY = crop.y;
        drawWidth = crop.width;
        drawHeight = crop.height;
      }

      // Apply resize if specified (affects the source drawing region)
      if (resize) {
        // This is a pre-scaling before the main scaling
        const { width, height, maintainAspectRatio = true } = resize;

        if (width) {
          const widthValue = convertElementSizeToPixels(width, outputWidth);
          const scaleFactor = widthValue / drawWidth;
          drawWidth = widthValue;

          if (maintainAspectRatio) {
            drawHeight = drawHeight * scaleFactor;
          }
        }

        if (height) {
          const heightValue = convertElementSizeToPixels(height, outputHeight);
          const scaleFactor = heightValue / drawHeight;
          drawHeight = heightValue;

          if (maintainAspectRatio) {
            drawWidth = drawWidth * scaleFactor;
          }
        }
      }

      // Apply rotation if specified
      if (rotate !== undefined && rotate !== 0) {
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((rotate * Math.PI) / 180);
        ctx.translate(-canvas.width / 2, -canvas.height / 2);
      }

      // Apply flip if specified
      if (flip) {
        ctx.save();

        if (flip === 'horizontal' || flip === 'both') {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }

        if (flip === 'vertical' || flip === 'both') {
          ctx.translate(0, canvas.height);
          ctx.scale(1, -1);
        }
      }
    }

    // Draw the image from temp canvas with all transformations
    ctx.drawImage(
        tempCanvas,
        drawX, drawY, drawWidth, drawHeight,  // Source rectangle
        0, 0, outputWidth, outputHeight       // Destination rectangle
    );

    // Restore context if transformations were applied
    if (imgConfig.transform?.rotate || imgConfig.transform?.flip) {
      ctx.restore();
    }
  }

  // Apply watermark if specified
  if (imgConfig.watermark) {
    await applyWatermark(ctx, canvas.width, canvas.height, imgConfig.watermark, metadata);
  }

  // Apply the afterProcess hook if provided
  if (imgConfig.afterProcess) {
    try {
      // Get ImageData from the canvas
      imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // Apply the hook
      processedImageData = await imgConfig.afterProcess(imageData);

      // Put processed data back to canvas
      ctx.putImageData(processedImageData, 0, 0);
    } catch (error) {
      console.error('Error in afterProcess hook:', error);
    }
  }
};

/**
 * Applies a watermark to the image
 * @param ctx Canvas context
 * @param canvasWidth Width of the canvas
 * @param canvasHeight Height of the canvas
 * @param watermarkConfig Watermark configuration
 * @param metadata Photo metadata to inject into watermark
 */
const applyWatermark = async (
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    watermarkConfig: WatermarkConfig,
    metadata?: PhotoMetadata
): Promise<void> => {
  // Get watermark text content
  const text = await injectMetadataInfo(
      await getWatermarkText(watermarkConfig.value),
      metadata
  );

  if (!text.length) return;

  // Save context state
  ctx.save();

  // Calculate font size
  const { textStyle } = watermarkConfig;
  const fontSize = convertElementSizeToPixels(textStyle.size, canvasHeight);

  if (textStyle.letterSpacing) {
    ctx.letterSpacing = `${convertElementSizeToPixels(textStyle.letterSpacing, canvasWidth)}px`;
  }

  const shouldWrapText = textStyle.textWrap !== false; // Default to true if not specified

  ctx.font = `${textStyle.fontStyle || 'normal'} ${textStyle.fontWeight || 'normal'} ${fontSize}px ${textStyle.fontFamily || 'Arial, sans-serif'}`;

  // Set textBaseline for consistent text positioning
  ctx.textBaseline = 'top';

  // Get text metrics for more accurate height calculation
  const textMetrics = ctx.measureText('ÁjgpqÇy|');

  // Calculate font metrics - use different approaches based on browser support
  const ascent = textMetrics.fontBoundingBoxAscent !== undefined
      ? textMetrics.fontBoundingBoxAscent
      : textMetrics.actualBoundingBoxAscent || fontSize * 0.8;

  const descent = textMetrics.fontBoundingBoxDescent !== undefined
      ? textMetrics.fontBoundingBoxDescent
      : textMetrics.actualBoundingBoxDescent || fontSize * 0.2;

  // Calculate single line height based on font metrics
  let lineHeight = ascent + descent;

  // Get padding values
  const padding = {
    top: watermarkConfig.padding?.top ? convertElementSizeToPixels(watermarkConfig.padding.top, canvasHeight) : 0,
    right: watermarkConfig.padding?.right ? convertElementSizeToPixels(watermarkConfig.padding.right, canvasWidth) : 0,
    bottom: watermarkConfig.padding?.bottom ? convertElementSizeToPixels(watermarkConfig.padding.bottom, canvasHeight) : 0,
    left: watermarkConfig.padding?.left ? convertElementSizeToPixels(watermarkConfig.padding.left, canvasWidth) : 0
  };

  // Get margin values
  const margin = {
    top: watermarkConfig.margin?.top ? convertElementSizeToPixels(watermarkConfig.margin.top, canvasHeight) : 0,
    right: watermarkConfig.margin?.right ? convertElementSizeToPixels(watermarkConfig.margin.right, canvasWidth) : 0,
    bottom: watermarkConfig.margin?.bottom ? convertElementSizeToPixels(watermarkConfig.margin.bottom, canvasHeight) : 0,
    left: watermarkConfig.margin?.left ? convertElementSizeToPixels(watermarkConfig.margin.left, canvasWidth) : 0
  };

  // Calculate text content area height (space needed for all lines)
  const contentHeight = text.length * lineHeight;

  // Calculate watermark width
  const watermarkWidth = watermarkConfig.width
      ? convertElementSizeToPixels(watermarkConfig.width, canvasWidth)
      : canvasWidth - margin.left - margin.right;

  // Handle explicit height specification if provided
  let watermarkHeight: number;
  if (watermarkConfig.height) {
    // Use the explicitly defined height
    watermarkHeight = convertElementSizeToPixels(watermarkConfig.height, canvasHeight);

    // Adjust line spacing to fit content within the specified height if needed
    if (text.length > 1) {
      // Calculate available space for text after padding
      const availableHeight = watermarkHeight - padding.top - padding.bottom;
      // Adjust line height to fit all lines within the available height
      lineHeight = availableHeight / text.length;
    }
  } else {
    // Calculate based on content
    watermarkHeight = contentHeight + padding.top + padding.bottom;
  }

  // Calculate watermark position
  let x: number;
  switch (watermarkConfig.horizontalAlign) {
    case 'left':
      x = margin.left;
      break;
    case 'center':
      x = (canvasWidth - watermarkWidth) / 2;
      break;
    case 'right':
      x = canvasWidth - watermarkWidth - margin.right;
      break;
    default:
      x = margin.left;
  }

  let y: number;
  switch (watermarkConfig.verticalAlign) {
    case 'top':
      y = margin.top;
      break;
    case 'center':
      y = (canvasHeight - watermarkHeight) / 2;
      break;
    case 'bottom':
      y = canvasHeight - watermarkHeight - margin.bottom;
      break;
    default:
      y = canvasHeight - watermarkHeight - margin.bottom;
  }

  // Apply opacity if specified
  if (watermarkConfig.opacity !== undefined) {
    ctx.globalAlpha = watermarkConfig.opacity;
  }

  // Draw watermark background
  if (watermarkConfig.backgroundColor) {
    ctx.fillStyle = watermarkConfig.backgroundColor;
    ctx.fillRect(x, y, watermarkWidth, watermarkHeight);
  }

  // Set text fill style
  ctx.fillStyle = textStyle.color;

  // Calculate starting Y position for text - ensure consistent baseline alignment
  let textY = y + padding.top;

  // Draw each line of text with precise positioning
  text.forEach((line, index) => {
    const textX = x + padding.left;
    // Use positioning based on index
    const lineY = textY + (index > 0 ? lineHeight * index : 0);

    if (!shouldWrapText) {
      // Don't wrap text - just truncate with ellipsis if it exceeds the width
      const availableWidth = watermarkWidth - padding.left - padding.right;
      const ellipsis = '...';
      const ellipsisWidth = ctx.measureText(ellipsis).width;

      if (ctx.measureText(line).width > availableWidth) {
        // Text is too long, need to truncate
        let truncatedText = line;
        let textWidth = ctx.measureText(truncatedText).width;

        // Truncate until it fits with ellipsis
        while (textWidth + ellipsisWidth > availableWidth && truncatedText.length > 0) {
          truncatedText = truncatedText.slice(0, -1);
          textWidth = ctx.measureText(truncatedText).width;
        }

        ctx.fillText(
            truncatedText + ellipsis,
            textX,
            lineY,
            availableWidth
        );
      } else {
        // Text fits, draw normally
        ctx.fillText(
            line,
            textX,
            lineY,
            availableWidth
        );
      }
    } else {
      // Normal drawing with wrapping
      ctx.fillText(
          line,
          textX,
          lineY,
          watermarkWidth - padding.left - padding.right
      );
    }
  });

  // Restore context
  ctx.restore();
};

/**
 * Gets watermark text from various possible value types
 * @param value Watermark value configuration
 * @returns Array of text lines
 */
const getWatermarkText = async (value?: WatermarkValue): Promise<string[]> => {
  if (!value) return [];

  if (typeof value === 'string') {
    return [value];
  }

  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'object') {
    if (value.type === 'function') {
      const result = await value.getter();
      return typeof result === 'string' ? [result] : [];
    }

    if (value.type === 'arrayFunction') {
      const result = await value.getter();
      return Array.isArray(result) ? result : [];
    }
  }

  return [];
};

/**
 * Converts ElementSize to pixels based on reference dimension
 * @param size Element size with unit and value
 * @param referenceDimension Reference dimension for relative units
 * @returns Size in pixels
 */
const convertElementSizeToPixels = (size: { unit: string; value: number }, referenceDimension: number): number => {
  switch (size.unit) {
    case 'px':
      return size.value;
    case '%':
      return (size.value / 100) * referenceDimension;
    case 'em':
      return size.value * 16; // Assuming 1em = 16px
    case 'rem':
      return size.value * 16; // Assuming 1rem = 16px
    case 'vh':
      return (size.value / 100) * window.innerHeight;
    case 'vw':
      return (size.value / 100) * window.innerWidth;
    default:
      return size.value;
  }
};

/**
 * Injects actual metadata values into watermark text strings
 * @param textArray Array of text strings that may contain metadata placeholders
 * @param metadata Photo metadata to inject
 * @returns Text array with metadata placeholders replaced with actual values, filtering out lines with undefined values
 */
export const injectMetadataInfo = async (
  textArray: string[], 
  metadata?: PhotoMetadata
): Promise<string[]> => {
  if (!metadata) return textArray;
  
  // Process and filter each line of text
  return textArray
    .map(text => {
      // Define pattern to match {{metadataType}} placeholders
      const metadataPattern = /\{\{([a-zA-Z0-9_-]+)(?::([^}]+))?\}\}/g;
      let hasUndefinedValue = false;
      
      // Replace all matches in the text
      const processedText = text.replace(metadataPattern, (match, type: string, format?: string) => {
        let result = '';
        
        // Handle different metadata types
        switch (type as MetadataType) {
          case 'timestamp':
            if (!metadata.timestamp) {
              hasUndefinedValue = true;
              return '';
            }
            
            // Format the timestamp based on optional format parameter
            try {
              const date = new Date(metadata.timestamp);
              if (format) {
                result = formatDate(date, format);
              } else {
                result = date.toLocaleString();
              }
            } catch (e) {
              console.warn('Error formatting timestamp:', e);
              result = metadata.timestamp;
            }
            break;
            
          case 'coordinate':
            if (!metadata.coordinate?.latitude || !metadata.coordinate?.longitude) {
              hasUndefinedValue = true;
              return '';
            }
            
            // Format coordinates based on optional format parameter
            const lat = metadata.coordinate.latitude;
            const lng = metadata.coordinate.longitude;
            
            if (format === 'dms') {
              // Degrees, minutes, seconds format
              result = `${convertToDMS(lat, 'lat')}, ${convertToDMS(lng, 'lng')}`;
            } else if (format?.includes('precision')) {
              // Custom precision format
              const precision = parseInt(format.split(':')[1]) || 6;
              result = `${lat.toFixed(precision)}, ${lng.toFixed(precision)}`;
            } else {
              // Default decimal format
              result = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
            }
            break;
            
          case 'barcode':
            if (!metadata.barcode) {
              hasUndefinedValue = true;
              return '';
            }
            result = metadata.barcode;
            break;
            
          case 'caption':
            if (!metadata.caption) {
              hasUndefinedValue = true;
              return '';
            }
            result = metadata.caption;
            break;
            
          default:
            // Try to access the property using bracket notation for custom metadata
            const customValue = (metadata as any)[type];
            if (customValue === undefined) {
              hasUndefinedValue = true;
              return '';
            }
            result = String(customValue);
        }
        
        return result;
      });
      
      // Return the processed text along with a flag indicating if it has undefined values
      return { text: processedText, hasUndefinedValue };
    })
    // Filter out lines that have undefined values
    .filter(item => !item.hasUndefinedValue)
    // Extract just the text from the processed items
    .map(item => item.text);
};

/**
 * Formats a date according to the specified format string
 * @param date The date to format
 * @param format Format string (e.g., 'YYYY-MM-DD', 'DD/MM/YYYY HH:mm:ss')
 * @returns Formatted date string
 */
const formatDate = (date: Date, format: string): string => {
  const tokens: Record<string, () => string> = {
    'YYYY': () => date.getFullYear().toString(),
    'YY': () => date.getFullYear().toString().slice(-2),
    'MM': () => (date.getMonth() + 1).toString().padStart(2, '0'),
    'M': () => (date.getMonth() + 1).toString(),
    'DD': () => date.getDate().toString().padStart(2, '0'),
    'D': () => date.getDate().toString(),
    'HH': () => date.getHours().toString().padStart(2, '0'),
    'H': () => date.getHours().toString(),
    'hh': () => (date.getHours() % 12 || 12).toString().padStart(2, '0'),
    'h': () => (date.getHours() % 12 || 12).toString(),
    'mm': () => date.getMinutes().toString().padStart(2, '0'),
    'm': () => date.getMinutes().toString(),
    'ss': () => date.getSeconds().toString().padStart(2, '0'),
    's': () => date.getSeconds().toString(),
    'A': () => date.getHours() < 12 ? 'AM' : 'PM',
    'a': () => date.getHours() < 12 ? 'am' : 'pm',
  };

  // Replace all tokens with their values
  return Object.entries(tokens).reduce(
      (result, [token, getValue]) => result.replace(new RegExp(token, 'g'), getValue()),
      format
  );
};

/**
 * Converts decimal coordinates to degrees, minutes, seconds format
 * @param coord The decimal coordinate
 * @param type 'lat' for latitude, 'lng' for longitude
 * @returns Formatted DMS string
 */
const convertToDMS = (coord: number, type: 'lat' | 'lng'): string => {
  const absolute = Math.abs(coord);
  const degrees = Math.floor(absolute);
  const minutesNotTruncated = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesNotTruncated);
  const seconds = Math.floor((minutesNotTruncated - minutes) * 60);

  const direction = type === 'lat'
      ? (coord >= 0 ? 'N' : 'S')
      : (coord >= 0 ? 'E' : 'W');

  return `${degrees}° ${minutes}' ${seconds}" ${direction}`;
};