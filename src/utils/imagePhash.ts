/**
 * میانگین‌هش ۸×۸ برای مقایسهٔ بصری ساده — محصولاتی که عکس دارند با هم مقایسه می‌شوند.
 * فقط وقتی شبایه از آستانه بالاتر باشد نمایش داده می‌شود (هم‌شکلی تقریبی، نه تصادفی).
 */

function grayscaleBlock(ctx: CanvasRenderingContext2D, w: number, h: number): number[] {
  const { data } = ctx.getImageData(0, 0, w, h);
  const out: number[] = [];
  for (let i = 0; i < data.length; i += 4) {
    out.push(0.299 * data[i]! + 0.587 * data[i + 1]! + 0.114 * data[i + 2]!);
  }
  return out;
}

export function averageHashFromGrayscale(gray: number[]): bigint {
  const mean = gray.reduce((a, b) => a + b, 0) / gray.length;
  let hash = 0n;
  for (let i = 0; i < gray.length; i++) {
    if (gray[i]! >= mean) hash |= 1n << BigInt(i);
  }
  return hash;
}

export function hammingSimilarityPercent(a: bigint, b: bigint): number {
  let x = a ^ b;
  let dist = 0;
  while (x > 0n) {
    dist += Number(x & 1n);
    x >>= 1n;
  }
  const bits = 64;
  return Math.round(((bits - dist) / bits) * 100);
}

export async function hashFromImageSource(src: string): Promise<bigint | null> {
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('load'));
      img.src = src;
    });
    const size = 8;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, size, size);
    const gray = grayscaleBlock(ctx, size, size);
    return averageHashFromGrayscale(gray);
  } catch {
    return null;
  }
}
