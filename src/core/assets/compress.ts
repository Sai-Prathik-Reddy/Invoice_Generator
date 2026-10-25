/**
 * Image normalization and compression utility for local-first PDF and canvas rendering.
 * Resizes large images to maxDim (default 1200px) and outputs clean PNG or JPEG Data URLs.
 */
export async function compressAndNormalizeImage(
  file: File | Blob,
  maxDim = 1200
): Promise<string> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    // Non-DOM fallback (e.g. Node.js unit tests)
    const buf = Buffer.from(await file.arrayBuffer());
    const mime = file.type && (file.type.includes('png') || file.type.includes('jpeg')) ? file.type : 'image/png';
    return `data:${mime};base64,${buf.toString('base64')}`;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(typeof reader.result === 'string' ? reader.result : '');
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const isPng = file.type === 'image/png';
        const dataUrl = canvas.toDataURL(isPng ? 'image/png' : 'image/jpeg', 0.92);
        resolve(dataUrl);
      };
      img.onerror = () => {
        resolve(typeof reader.result === 'string' ? reader.result : '');
      };
      img.src = reader.result as string;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}
