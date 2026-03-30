/** آدرس‌های دانلود — فایل‌ها را در public/downloads قرار دهید */
const base = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/');

export const DOWNLOAD_URLS = {
  apk: `${base}downloads/dokanyar.apk`,
  /** نصب‌کننده ویندوز (اختیاری — وقتی ساختید اینجا بگذارید) */
  windowsSetup: `${base}downloads/Dokanyar-Setup.exe`,
  /** نسخهٔ پرتابل ZIP (اختیاری) */
  windowsZip: `${base}downloads/Dokanyar-Win-x64.zip`,
} as const;
