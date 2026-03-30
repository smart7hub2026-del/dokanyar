/** فشرده‌سازی تصویر برای آپلود در حافظهٔ مرورگر (حداکثر بعد و کیفیت JPEG) */
export async function compressImageToDataUrl(
  file: File,
  opts?: { maxEdge?: number; maxBytes?: number; minFileSizeToCompress?: number; force?: boolean }
): Promise<string> {
  const maxEdge = opts?.maxEdge ?? 1280;
  const maxBytes = opts?.maxBytes ?? 950_000;
  const minCompress = opts?.minFileSizeToCompress ?? 400_000;
  const force = opts?.force ?? false;

  const readRaw = () =>
    new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(new Error('خواندن فایل ناموفق'));
      r.readAsDataURL(file);
    });

  if (!file.type.startsWith('image/') || (!force && file.size < minCompress)) {
    return readRaw();
  }

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) {
    return readRaw();
  }

  let w = bitmap.width;
  let h = bitmap.height;
  const scale = Math.min(1, maxEdge / Math.max(w, h));
  w = Math.max(1, Math.floor(w * scale));
  h = Math.max(1, Math.floor(h * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    return readRaw();
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  const scaledW = w;
  const scaledH = h;

  let quality = maxBytes <= 150_000 ? 0.55 : 0.85;
  let dataUrl = canvas.toDataURL('image/jpeg', quality);
  const approxBinaryCap = maxBytes * 1.37;
  while (dataUrl.length > approxBinaryCap && quality > 0.28) {
    quality -= maxBytes <= 150_000 ? 0.06 : 0.07;
    dataUrl = canvas.toDataURL('image/jpeg', quality);
  }
  if (dataUrl.length > approxBinaryCap && maxBytes <= 150_000) {
    let s = 0.92;
    while (dataUrl.length > approxBinaryCap && s > 0.45) {
      s -= 0.08;
      const nw = Math.max(1, Math.floor(scaledW * s));
      const nh = Math.max(1, Math.floor(scaledH * s));
      canvas.width = nw;
      canvas.height = nh;
      ctx.drawImage(bitmap, 0, 0, nw, nh);
      quality = 0.45;
      dataUrl = canvas.toDataURL('image/jpeg', quality);
    }
  }

  bitmap.close();
  return dataUrl;
}
