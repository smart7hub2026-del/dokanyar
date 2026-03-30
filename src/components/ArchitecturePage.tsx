import { useState } from 'react';
import { useToast } from './Toast';
import { Server, Database, Shield, Zap, Globe, HardDrive, Activity, CheckCircle, AlertTriangle, Info } from 'lucide-react';

type ArchMode = 'separate' | 'schema' | 'row';

const archOptions = [
  {
    id: 'separate' as ArchMode,
    name: 'دیتابیس مجزا',
    desc: 'هر دکان یک دیتابیس کاملاً مجزا دارد',
    icon: '🗄️',
    pros: ['ایزولیشن کامل داده‌ها', 'امنیت بسیار بالا', 'بکاپ مستقل', 'عملکرد بهتر'],
    cons: ['هزینه بیشتر', 'مدیریت پیچیده‌تر', 'مصرف منابع بالاتر'],
    suitable: '۱۰۰+ دکان با داده‌های حساس',
    color: 'emerald',
    recommended: true,
  },
  {
    id: 'schema' as ArchMode,
    name: 'Schema مجزا',
    desc: 'یک دیتابیس با prefix جداول برای هر دکان',
    icon: '📋',
    pros: ['هزینه کمتر', 'مدیریت آسان‌تر', 'پشتیبانی MySQL'],
    cons: ['ایزولیشن ناقص', 'ریسک امنیتی', 'مشکل در مقیاس'],
    suitable: '۵۰-۵۰۰ دکان',
    color: 'blue',
    recommended: false,
  },
  {
    id: 'row' as ArchMode,
    name: 'Row-Level Isolation',
    desc: 'یک دیتابیس با فیلد tenant_id در هر جدول',
    icon: '🏷️',
    pros: ['ساده‌ترین مدیریت', 'کمترین هزینه', 'سریع‌ترین توسعه'],
    cons: ['کمترین امنیت', 'ریسک اشتراک داده', 'پیچیدگی کوئری'],
    suitable: 'نمونه اولیه / MVP',
    color: 'amber',
    recommended: false,
  },
];

const scaleLevels = [
  { users: '۵۰۰', ram: '۱۶ GB', cpu: '۴ هسته', storage: '۵۰۰ GB', arch: 'یک سرور + Object Storage', color: 'emerald' },
  { users: '۲,۰۰۰', ram: '۳۲ GB', cpu: '۸ هسته', storage: '۱ TB', arch: 'Master-Slave + Redis', color: 'blue' },
  { users: '۵,۰۰۰', ram: '۶۴ GB', cpu: '۱۶ هسته', storage: '۲ TB', arch: 'Load Balancing + ۳ Slave', color: 'amber' },
  { users: '۱۰,۰۰۰+', ram: '۱۲۸ GB', cpu: '۳۲ هسته', storage: '۵ TB', arch: 'Sharding + Cluster', color: 'rose' },
];

const securityChecks = [
  { label: 'ایزولیشن Cross-Tenant', status: 'ok', desc: 'هر دکان فقط به داده‌های خود دسترسی دارد' },
  { label: 'Rate Limiting API', status: 'ok', desc: '۶۰ درخواست در دقیقه برای هر کاربر' },
  { label: 'رمزنگاری داده‌های حساس', status: 'ok', desc: 'شماره تلفن و ایمیل رمزنگاری شده' },
  { label: 'HTTPS اجباری', status: 'ok', desc: 'همه ارتباطات با SSL/TLS' },
  { label: 'قفل بعد از ۵ بار اشتباه', status: 'ok', desc: 'جلوگیری از Brute Force' },
  { label: 'Cloudflare DDoS Protection', status: 'warning', desc: 'نیاز به فعال‌سازی دستی' },
  { label: 'لاگ دسترسی‌های مشکوک', status: 'ok', desc: 'تمام تلاش‌های غیرمجاز ثبت می‌شوند' },
  { label: 'Connection Pooling', status: 'warning', desc: 'ProxySQL پیشنهاد می‌شود' },
];

export default function ArchitecturePage() {
  const { success, info } = useToast();
  const [selectedArch, setSelectedArch] = useState<ArchMode>('separate');
  const [activeTab, setActiveTab] = useState<'arch' | 'scale' | 'security' | 'upgrade'>('arch');

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Server size={24} className="text-indigo-400" /> معماری و زیرساخت
        </h1>
        <p className="text-slate-400 text-sm mt-1">تنظیمات معماری دیتابیس، مقیاس‌پذیری و امنیت</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {([['arch', 'معماری دیتابیس', Database], ['scale', 'مقیاس‌پذیری', Activity], ['security', 'امنیت', Shield], ['upgrade', 'ارتقاء سیستم', Zap]] as const).map(([tab, label, Icon]) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === tab ? 'btn-primary text-white' : 'glass text-slate-400 hover:text-white'}`}>
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {/* Architecture Tab */}
      {activeTab === 'arch' && (
        <div className="space-y-5">
          <div className="glass rounded-2xl p-5 border border-indigo-500/20">
            <h2 className="text-white font-semibold mb-1 flex items-center gap-2"><Info size={16} className="text-indigo-400" /> انتخاب نوع معماری Multi-Tenant</h2>
            <p className="text-slate-400 text-sm">این انتخاب تأثیر مستقیم بر امنیت، هزینه و مقیاس‌پذیری سیستم دارد.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {archOptions.map(opt => (
              <button key={opt.id} onClick={() => setSelectedArch(opt.id)}
                className={`text-right glass rounded-2xl p-5 border-2 transition-all ${selectedArch === opt.id ? `border-${opt.color}-500 bg-${opt.color}-500/10` : 'border-white/5 hover:border-white/20'}`}>
                {opt.recommended && (
                  <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full mb-2 inline-block">✅ پیشنهادی</span>
                )}
                <div className="text-3xl mb-2">{opt.icon}</div>
                <h3 className="text-white font-semibold mb-1">{opt.name}</h3>
                <p className="text-slate-400 text-xs mb-3">{opt.desc}</p>
                <div className="space-y-1">
                  {opt.pros.map(p => <p key={p} className="text-emerald-400 text-xs">✓ {p}</p>)}
                  {opt.cons.map(c => <p key={c} className="text-rose-400 text-xs">✗ {c}</p>)}
                </div>
                <div className="mt-3 pt-3 border-t border-white/5 text-slate-500 text-xs">مناسب برای: {opt.suitable}</div>
              </button>
            ))}
          </div>
          <div className="glass rounded-2xl p-5">
            <h3 className="text-white font-semibold mb-3">معماری انتخاب‌شده: {archOptions.find(a => a.id === selectedArch)?.name}</h3>
            <div className="bg-slate-900/50 rounded-xl p-4 text-sm font-mono text-slate-300 space-y-1">
              {selectedArch === 'separate' && <>
                <p className="text-indigo-400">// دیتابیس مجزا برای هر دکان</p>
                <p>central_crm → مدیریت دکان‌ها</p>
                <p>tenant_ahmad → دیتابیس فروشگاه احمد</p>
                <p>tenant_karimi → دیتابیس سوپرمارکت کریمی</p>
                <p>tenant_sehat → دیتابیس دارویی صحت</p>
              </>}
              {selectedArch === 'schema' && <>
                <p className="text-blue-400">// یک دیتابیس با prefix جداول</p>
                <p>crm_db.t1_products → محصولات دکان ۱</p>
                <p>crm_db.t2_products → محصولات دکان ۲</p>
                <p>crm_db.t1_customers → مشتریان دکان ۱</p>
              </>}
              {selectedArch === 'row' && <>
                <p className="text-amber-400">// یک دیتابیس با tenant_id</p>
                <p>SELECT * FROM products WHERE tenant_id = 1;</p>
                <p>SELECT * FROM customers WHERE tenant_id = 2;</p>
                <p className="text-rose-400">// ⚠️ خطر: فراموش کردن tenant_id!</p>
              </>}
            </div>
            <button onClick={() => success('معماری ذخیره شد', `معماری "${archOptions.find(a => a.id === selectedArch)?.name}" انتخاب گردید`)}
              className="btn-primary text-white px-6 py-2.5 rounded-xl text-sm font-medium mt-4">
              تأیید و ذخیره انتخاب
            </button>
          </div>
        </div>
      )}

      {/* Scale Tab */}
      {activeTab === 'scale' && (
        <div className="space-y-5">
          <div className="glass rounded-2xl p-5">
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2"><HardDrive size={18} className="text-indigo-400" /> نیازهای سخت‌افزاری بر اساس تعداد کاربر</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    {['کاربران', 'RAM', 'CPU', 'ذخیره‌سازی', 'معماری'].map(h => (
                      <th key={h} className="text-right text-slate-400 text-xs font-medium px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {scaleLevels.map(lvl => (
                    <tr key={lvl.users} className="table-row-hover">
                      <td className="px-4 py-3"><span className={`badge-${lvl.color} text-xs px-2 py-1 rounded-full`}>{lvl.users}</span></td>
                      <td className="px-4 py-3 text-white text-sm font-medium">{lvl.ram}</td>
                      <td className="px-4 py-3 text-white text-sm">{lvl.cpu}</td>
                      <td className="px-4 py-3 text-white text-sm">{lvl.storage}</td>
                      <td className="px-4 py-3 text-slate-300 text-sm">{lvl.arch}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { title: 'Object Storage', icon: '☁️', desc: 'تصاویر و فایل‌ها روی S3/MinIO ذخیره شوند', status: 'پیشنهاد اکید', color: 'amber' },
              { title: 'Redis Cache', icon: '⚡', desc: 'جلسات کاربری و نتایج کوئری‌های پرتکرار', status: 'ماه دوم', color: 'blue' },
              { title: 'ProxySQL', icon: '🔄', desc: 'مدیریت Connection Pool برای ۱۰,۰۰۰+ کاربر', status: 'ماه چهارم', color: 'purple' },
            ].map(item => (
              <div key={item.title} className="glass rounded-2xl p-4">
                <div className="text-3xl mb-2">{item.icon}</div>
                <h3 className="text-white font-semibold mb-1">{item.title}</h3>
                <p className="text-slate-400 text-xs mb-2">{item.desc}</p>
                <span className={`badge-${item.color} text-xs px-2 py-1 rounded-full`}>{item.status}</span>
              </div>
            ))}
          </div>

          <div className="glass rounded-2xl p-5">
            <h2 className="text-white font-semibold mb-3 flex items-center gap-2"><Globe size={18} className="text-indigo-400" /> نقشه راه مقیاس‌پذیری</h2>
            <div className="space-y-3">
              {[
                { phase: 'قبل از لانچ', items: ['Object Storage برای تصاویر', 'ایندکس‌گذاری دیتابیس', 'Connection Pooling'], color: 'emerald' },
                { phase: 'ماه اول', items: ['Cloudflare CDN', 'Rate Limiting API', 'رمزنگاری داده‌های حساس'], color: 'blue' },
                { phase: 'ماه ۲-۳', items: ['Redis Cache', 'جداول خلاصه گزارش', 'Queue برای ایمیل/SMS'], color: 'amber' },
                { phase: 'ماه ۴+', items: ['Master-Slave Replication', 'Sharding برای ۱۰۰۰+ کاربر', 'Load Balancing'], color: 'purple' },
              ].map(phase => (
                <div key={phase.phase} className={`border border-${phase.color}-500/20 rounded-xl p-4 bg-${phase.color}-500/5`}>
                  <h4 className={`text-${phase.color}-400 font-medium text-sm mb-2`}>{phase.phase}</h4>
                  <div className="flex flex-wrap gap-2">
                    {phase.items.map(item => (
                      <span key={item} className="text-xs glass px-2 py-1 rounded-lg text-slate-300">{item}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="space-y-5">
          <div className="glass rounded-2xl p-5">
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2"><Shield size={18} className="text-emerald-400" /> چک‌لیست امنیتی سیستم</h2>
            <div className="space-y-3">
              {securityChecks.map(check => (
                <div key={check.label} className="flex items-center gap-4 bg-slate-800/30 rounded-xl px-4 py-3">
                  {check.status === 'ok'
                    ? <CheckCircle size={20} className="text-emerald-400 flex-shrink-0" />
                    : <AlertTriangle size={20} className="text-amber-400 flex-shrink-0" />}
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium">{check.label}</p>
                    <p className="text-slate-400 text-xs">{check.desc}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${check.status === 'ok' ? 'badge-green' : 'badge-yellow'}`}>
                    {check.status === 'ok' ? 'فعال' : 'نیاز به اقدام'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass rounded-2xl p-5">
            <h2 className="text-white font-semibold mb-3">قوانین Rate Limiting</h2>
            <div className="space-y-2">
              {[
                { endpoint: 'لاگین', limit: '۵ بار / دقیقه', action: 'قفل ۱۵ دقیقه' },
                { endpoint: 'API عمومی', limit: '۶۰ درخواست / دقیقه', action: 'خطای ۴۲۹' },
                { endpoint: 'جستجو', limit: '۳۰ درخواست / دقیقه', action: 'تأخیر ۲ ثانیه' },
                { endpoint: 'بارگذاری فایل', limit: '۱۰ فایل / ساعت', action: 'مسدود موقت' },
                { endpoint: 'ارسال SMS', limit: '۵۰ پیام / روز', action: 'مسدود روزانه' },
              ].map(r => (
                <div key={r.endpoint} className="flex items-center justify-between bg-slate-800/30 rounded-xl px-4 py-2.5">
                  <span className="text-white text-sm">{r.endpoint}</span>
                  <span className="text-indigo-400 text-sm font-medium">{r.limit}</span>
                  <span className="text-rose-400 text-xs">{r.action}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass rounded-2xl p-5 border border-rose-500/20">
            <h2 className="text-rose-400 font-semibold mb-3 flex items-center gap-2">
              <AlertTriangle size={18} /> Cross-Tenant Security — مهم‌ترین اولویت
            </h2>
            <div className="bg-slate-900/60 rounded-xl p-4 text-sm font-mono space-y-2">
              <p className="text-rose-400">// ❌ اشتباه — بدون بررسی tenant</p>
              <p className="text-slate-400">$products = DB::query("SELECT * FROM products WHERE id = ?", [$id]);</p>
              <p className="text-emerald-400 mt-3">// ✅ درست — همیشه tenant_id چک کنید</p>
              <p className="text-slate-300">$products = DB::query(</p>
              <p className="text-slate-300 mr-4">"SELECT * FROM products WHERE id = ? AND tenant_id = ?",</p>
              <p className="text-slate-300 mr-4">[$id, $current_tenant_id]</p>
              <p className="text-slate-300">);</p>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Tab */}
      {activeTab === 'upgrade' && (
        <div className="space-y-5">
          <div className="glass rounded-2xl p-5">
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2"><Zap size={18} className="text-amber-400" /> سیستم ارتقاء خودکار Tenantها</h2>
            <div className="space-y-4">
              {[
                { step: '۱', title: 'بکاپ قبل از ارتقاء', desc: 'از تمام دیتابیس‌های دکان‌ها به‌صورت خودکار بکاپ گرفته می‌شود', status: 'auto' },
                { step: '۲', title: 'Migration اجرا', desc: 'فایل‌های SQL جدید به‌ترتیب روی هر دیتابیس دکان اجرا می‌شوند', status: 'auto' },
                { step: '۳', title: 'تست یکپارچگی', desc: 'بعد از migration، تست‌های پایه اجرا می‌شوند', status: 'auto' },
                { step: '۴', title: 'Rollback در صورت خطا', desc: 'اگر migration شکست بخورد، دیتابیس به حالت قبل برمی‌گردد', status: 'auto' },
                { step: '۵', title: 'اطلاع‌رسانی', desc: 'نتیجه ارتقاء به ایمیل ابرادمین ارسال می‌شود', status: 'auto' },
              ].map(step => (
                <div key={step.step} className="flex items-start gap-4 bg-slate-800/30 rounded-xl p-4">
                  <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-sm flex-shrink-0">{step.step}</div>
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium">{step.title}</p>
                    <p className="text-slate-400 text-xs mt-0.5">{step.desc}</p>
                  </div>
                  <span className="badge-green text-xs px-2 py-1 rounded-full">خودکار</span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass rounded-2xl p-5">
            <h2 className="text-white font-semibold mb-3">ارتقاء انتخابی</h2>
            <p className="text-slate-400 text-sm mb-4">می‌توانید برخی دکان‌ها را در نسخه جدید و برخی را در نسخه قدیمی نگه دارید:</p>
            <div className="space-y-2">
              {[{ name: 'فروشگاه احمد', version: 'v3.0.0', status: 'جدید' }, { name: 'سوپرمارکت کریمی', version: 'v2.5.0', status: 'قدیمی' }, { name: 'دارویی صحت', version: 'v3.0.0', status: 'جدید' }].map(t => (
                <div key={t.name} className="flex items-center justify-between bg-slate-800/30 rounded-xl px-4 py-2.5">
                  <span className="text-white text-sm">{t.name}</span>
                  <span className="text-slate-400 text-xs font-mono">{t.version}</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${t.status === 'جدید' ? 'badge-emerald' : 'badge-yellow'}`}>{t.status}</span>
                  <button onClick={() => info('ارتقاء', `${t.name} به نسخه جدید ارتقاء یافت`)} className="text-indigo-400 hover:text-indigo-300 text-xs">ارتقاء →</button>
                </div>
              ))}
            </div>
            <button onClick={() => success('ارتقاء همه', 'همه دکان‌ها به نسخه ۳.۰.۰ ارتقاء یافتند')} className="btn-primary text-white px-6 py-2.5 rounded-xl text-sm font-medium mt-4">
              ارتقاء همه دکان‌ها به v3.0.0
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
