import { BrowserMultiFormatReader } from '@zxing/library';

/** خواندن بارکد/QR از فایل تصویر: ZXing سپس BarcodeDetector مرورگر */
export async function decodeBarcodeFromImageFile(file: File): Promise<string | null> {
  const url = URL.createObjectURL(file);
  try {
    const reader = new BrowserMultiFormatReader();
    const result = await reader.decodeFromImageUrl(url);
    const text = result?.getText?.()?.trim();
    if (text) return text;
  } catch {
    /* ادامه به BarcodeDetector */
  }
  try {
    type BarcodeDet = new (opts?: { formats?: string[] }) => { detect: (bmp: ImageBitmap) => Promise<{ rawValue?: string }[]> };
    const BD =
      typeof window !== 'undefined' ? (window as unknown as { BarcodeDetector?: BarcodeDet }).BarcodeDetector : undefined;
    if (BD) {
      const detector = new BD({
        formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'data_matrix', 'pdf417'],
      });
      const bmp = await createImageBitmap(file);
      const codes = await detector.detect(bmp);
      bmp.close?.();
      const raw = codes[0]?.rawValue?.trim();
      if (raw) return raw;
    }
  } catch {
    /* noop */
  } finally {
    URL.revokeObjectURL(url);
  }
  return null;
}
