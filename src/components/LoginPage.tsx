import React, { useState } from 'react';

interface LoginPageProps {
  onLogin: (username: string, password: string) => boolean;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState('');
  const [googleSuccess, setGoogleSuccess] = useState('');

  const handleGoogleSignIn = async () => {
    setGoogleError('');
    setGoogleSuccess('');
    setGoogleLoading(true);
    try {
      // Simulate Google OAuth flow
      await new Promise(r => setTimeout(r, 1000));
      // Simulate success
      setGoogleSuccess('ورود با موفقیت انجام شد. در حال انتقال...');
      // In a real app, this would call an API, handle tokens, and redirect
      // e.g. onLogin('google_user', 'token');
    } catch (err) {
      const errorMessage = 'خطا در ارتباط با سرور گوگل. لطفا دوباره تلاش کنید.';
      setGoogleError(errorMessage);
      console.error('[Sentry Log] Google OAuth Error:', err);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('لطفاً ایمیل و رمز عبور را وارد کنید');
      return;
    }
    setError('');
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    const ok = onLogin(username, password);
    if (!ok) setError('ایمیل یا رمز عبور اشتباه است');
    setLoading(false);
  };

  return (
    <div className="login-ux min-h-[100dvh] w-full flex items-center justify-center bg-[var(--login-bg-page)] p-4 sm:p-6 md:p-8" dir="rtl">
      <div className="w-full max-w-[62.5rem] bg-[var(--login-bg-surface)] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col md:flex-row relative">
        <div className="relative w-full md:w-1/2 min-h-[18.75rem] md:min-h-[37.5rem] bg-gradient-to-br from-[var(--login-brand-start)] via-[var(--login-brand-mid)] to-[var(--login-brand-end)] flex flex-col items-center justify-center p-6 sm:p-8 md:p-12 overflow-hidden text-[var(--login-text-on-brand)] z-0">
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-[-10%] right-[-10%] w-[120%] h-[50%] bg-[#60a5fa] opacity-30 -rotate-12 transform origin-top-right"></div>
            <div className="absolute bottom-[-20%] left-[-20%] w-[150%] h-[60%] bg-[#1d4ed8] opacity-45 rotate-12 transform origin-bottom-left"></div>
            <div className="absolute top-[30%] left-[-10%] w-[80%] h-[40%] bg-[#4f46e5] opacity-20 -rotate-45 transform origin-center"></div>
          </div>
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="w-16 h-16 mb-4 flex items-center justify-center">
              <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-white">
                <path d="M20 20 L40 40 L20 60 Z" fill="currentColor" opacity="0.8"/>
                <path d="M80 20 L60 40 L80 60 Z" fill="currentColor" opacity="0.8"/>
                <path d="M20 80 L40 60 L60 80 Z" fill="currentColor" opacity="0.8"/>
                <path d="M80 80 L60 60 L40 80 Z" fill="currentColor" opacity="0.8"/>
                <circle cx="50" cy="50" r="10" fill="currentColor" />
              </svg>
            </div>
            <h2 className="text-[1.5rem] leading-[1.4] font-[700] tracking-[0.12em] mb-2 uppercase">COMPANY NAME</h2>
            <h3 className="text-[1rem] font-[500] text-[var(--login-text-brand-muted)] mb-6">توسعه یافته توسط تیم DevTeam</h3>
            
            <div className="w-48 h-48 mb-6">
              {/* SVG Illustration of a manager managing a shop */}
              <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-white">
                <rect x="20" y="80" width="160" height="100" rx="4" fill="currentColor" opacity="0.2"/>
                <rect x="40" y="60" width="120" height="20" rx="2" fill="currentColor" opacity="0.4"/>
                <path d="M70 180 L70 100 L130 100 L130 180" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.8"/>
                <circle cx="100" cy="40" r="15" fill="currentColor" opacity="0.9"/>
                <path d="M80 80 Q100 90 120 80 L115 55 L85 55 Z" fill="currentColor" opacity="0.9"/>
                <rect x="30" y="110" width="30" height="30" rx="2" fill="currentColor" opacity="0.6"/>
                <rect x="140" y="110" width="30" height="30" rx="2" fill="currentColor" opacity="0.6"/>
                <rect x="30" y="150" width="30" height="20" rx="2" fill="currentColor" opacity="0.6"/>
                <rect x="140" y="150" width="30" height="20" rx="2" fill="currentColor" opacity="0.6"/>
              </svg>
            </div>

            <p className="text-[0.875rem] leading-[1.75] font-[400] text-[var(--login-text-brand-muted)] mb-10 max-w-[17.5rem]">
              سیستم جامع مدیریت دکان و فروشگاه برای کنترل موجودی، فروش و حسابداری به ساده‌ترین شکل ممکن.
            </p>
          </div>
          <div className="absolute bottom-6 text-[0.75rem] leading-[1.5] font-[400] text-[var(--login-text-brand-muted)]">
            © 2045 Company
          </div>
        </div>
        <div className="hidden md:block absolute top-0 bottom-0 right-1/2 w-8 bg-gradient-to-r from-black/20 to-transparent z-10 pointer-events-none translate-x-full"></div>
        <div className="relative w-full md:w-1/2 bg-[var(--login-bg-surface)] flex flex-col justify-center p-6 sm:p-10 md:p-14 z-20 md:shadow-[-20px_0_30px_-15px_rgba(0,0,0,0.1)]">
          <div className="md:hidden absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-black/10 to-transparent"></div>
          <div className="w-full max-w-[22.5rem] mx-auto">
            <h1 className="text-[2.25rem] sm:text-[2.75rem] leading-[1.2] font-[800] tracking-[0.01em] text-[var(--login-text-primary)] mb-3">ورود</h1>
            <p className="text-[0.875rem] leading-[1.8] font-[400] text-[var(--login-text-secondary)] mb-8">
              لورم ایپسوم متن ساختگی با تولید سادگی نامفهوم از صنعت چاپ، و با استفاده از طراحان گرافیک است.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <input
                  type="text"
                  placeholder="ایمیل"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="login-input w-full rounded-xl px-6 py-4 text-[1rem] leading-[1.5] font-[500] tracking-[0.005em] focus:outline-none focus:ring-2 focus:ring-[var(--login-brand-start)] transition-all border border-slate-200"
                  dir="ltr"
                />
              </div>
              <div>
                <input
                  type="password"
                  placeholder="رمز عبور"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="login-input w-full rounded-xl px-6 py-4 text-[1rem] leading-[1.5] font-[500] tracking-[0.005em] focus:outline-none focus:ring-2 focus:ring-[var(--login-brand-start)] transition-all border border-slate-200"
                  dir="ltr"
                />
              </div>
              <div className="flex items-center justify-between px-2 pt-2 pb-4">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative flex items-center justify-center">
                    <input type="checkbox" className="peer appearance-none w-4 h-4 bg-[var(--login-input-bg)] rounded flex-shrink-0 cursor-pointer checked:bg-[var(--login-accent)] transition-colors" />
                    <svg className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                  <span className="text-[0.875rem] leading-[1.5] font-[500] text-[var(--login-text-primary)]">مرا به خاطر بسپار</span>
                </label>
                <a href="#" className="text-[0.875rem] leading-[1.5] font-[600] text-[var(--login-link)] hover:text-[var(--login-link-hover)] focus-visible:text-[var(--login-link-hover)] transition-colors">فراموشی رمز عبور؟</a>
              </div>
              {error && (
                <div className="text-[var(--login-error)] text-[0.875rem] leading-[1.5] font-[700] px-2 pb-2 text-center">
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={loading || googleLoading}
                className="w-full bg-gradient-to-r from-[var(--login-btn-start)] to-[var(--login-btn-end)] text-[var(--login-btn-text)] text-[1rem] leading-[1.5] font-[700] tracking-[0.01em] py-4 rounded-xl shadow-[0_10px_20px_rgba(30,41,84,0.1)] hover:shadow-[0_15px_25px_rgba(30,41,84,0.2)] hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[var(--login-link)] transition-all duration-300 disabled:opacity-70 flex justify-center items-center h-[3.5rem]"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'ورود'
                )}
              </button>

              <div className="relative flex items-center justify-center my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-300"></div>
                </div>
                <div className="relative bg-[var(--login-bg-surface)] px-4 text-sm text-slate-500 font-medium">
                  یا
                </div>
              </div>

              {googleError && (
                <div className="text-[var(--login-error)] text-[0.875rem] leading-[1.5] font-[700] px-2 pb-2 text-center">
                  {googleError}
                </div>
              )}
              {googleSuccess && (
                <div className="text-emerald-600 text-[0.875rem] leading-[1.5] font-[700] px-2 pb-2 text-center">
                  {googleSuccess}
                </div>
              )}

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading || googleLoading}
                className="w-full bg-white text-black border border-[#4285F4] text-[1rem] leading-[1.5] font-[500] tracking-[0.01em] py-3.5 rounded-xl shadow-sm hover:shadow-md hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-[#4285F4] transition-all duration-300 disabled:opacity-70 flex justify-center items-center h-[3.5rem] gap-3"
              >
                {googleLoading ? (
                  <div className="w-5 h-5 border-2 border-[#4285F4]/30 border-t-[#4285F4] rounded-full animate-spin" />
                ) : (
                  <>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    <span>Sign up with Google</span>
                  </>
                )}
              </button>

              <div className="text-center mt-8 pt-4">
                <p className="text-[0.875rem] leading-[1.7] font-[500] text-[var(--login-text-secondary)]">
                  حساب کاربری ندارید؟ <a href="#" className="text-[var(--login-text-primary)] font-[700] hover:text-[var(--login-link-hover)] focus-visible:text-[var(--login-link-hover)] hover:underline">ثبت‌نام کنید</a>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
