import VisualProductSearchPanel from './VisualProductSearchPanel';

export default function ImageSearchPage() {
  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">جستجوی تصویری محصولات</h1>
        <p className="text-slate-400 text-sm mt-1">
          فقط محصولاتی که <strong className="text-slate-300">عکس ثبت‌شده</strong> دارند مقایسه می‌شوند؛ شباهت بر اساس الگوی رنگ و شکل کلی تصویر است.
        </p>
      </div>
      <VisualProductSearchPanel variant="page" />
    </div>
  );
}
