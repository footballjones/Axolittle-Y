import { useEffect, useState } from 'react';

/**
 * Loads an image, removes white/near-white pixels via canvas,
 * and returns a transparent-background data URL.
 */
export function useRemoveWhiteBg(src: string, threshold = 240): string | null {
  const [processedSrc, setProcessedSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!src) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // If pixel is white or near-white, make it transparent
        if (r >= threshold && g >= threshold && b >= threshold) {
          data[i + 3] = 0; // Set alpha to 0
        }
        // Feather edges: partially transparent for near-white pixels
        else if (r >= threshold - 30 && g >= threshold - 30 && b >= threshold - 30) {
          const avg = (r + g + b) / 3;
          const factor = (avg - (threshold - 30)) / 30;
          data[i + 3] = Math.round(data[i + 3] * (1 - factor));
        }
      }

      ctx.putImageData(imageData, 0, 0);
      setProcessedSrc(canvas.toDataURL('image/png'));
    };
    img.src = src;
  }, [src, threshold]);

  return processedSrc;
}
