import { useState, useEffect, useMemo, useCallback, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useToast } from './Toast';
import { User } from '../App';
import { apiPatchMe } from '../services/api';
import { EyeOff, Eye, UserCircle, ChevronLeft, Printer, WifiOff, MessageSquare, UserCog } from 'lucide-react';
import SecurityPage from './SecurityPage';
import BackupPage from './BackupPage';
import UsersPage from './UsersPage';
import PrintSettingsPage from './PrintSettingsPage';
import OfflinePage from './OfflinePage';
import SupportPage from './SupportPage';
import { useStore } from '../store/useStore';

type SettingsTab = 'general' | 'profile' | 'security' | 'backup' | 'users' | 'print' | 'offline' | 'support';

export default function SettingsPage({
  currentUser,
  authToken,
}: {
  currentUser: User;
  authToken: string | null;
}) {
  const { t } = useApp();
  const { success, error } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showPwd, setShowPwd] = useState(false);
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');

  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const patchCurrentUser = useStore(s => s.patchCurrentUser);
  const [profileName, setProfileName] = useState(currentUser.full_name);
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    setProfileName(currentUser.full_name);
  }, [currentUser]);

  const isSuper = currentUser.role === 'super_admin';
  const shopSettingsTabs = !isSuper;

  const validTabs = useMemo(() => {
    const ids: SettingsTab[] = [
      'general',
      'profile',
      ...(currentUser.role === 'admin' ? (['users'] as const) : []),
      ...(shopSettingsTabs ? (['print', 'offline', 'support'] as const) : (['support'] as const)),
      'security',
      'backup',
    ];
    return new Set(ids);
  }, [currentUser.role, shopSettingsTabs]);

  useEffect(() => {
    const s = searchParams.get('section') as SettingsTab | null;
    if (!s || !validTabs.has(s)) return;
    setActiveTab(s);
  }, [searchParams, validTabs]);

  const goTab = useCallback(
    (id: SettingsTab) => {
      setActiveTab(id);
      if (id === 'general') setSearchParams({});
      else setSearchParams({ section: id });
    },
    [setSearchParams]
  );

  const handleChangePwd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPwd || newPwd.length < 4 || newPwd !== confirmPwd) return;
    success('رمز عبور تغییر کرد', 'رمز عبور با موفقیت بروزرسانی شد');
    setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
  };

  const handleSaveProfile = async () => {
    if (currentUser.role === 'super_admin') return;
    if (!authToken) {
      error(t('error'), t('login'));
      return;
    }
    setSavingProfile(true);
    try {
      const res = await apiPatchMe({ full_name: profileName.trim() }, authToken);
      patchCurrentUser({
        full_name: res.user.full_name,
      } as Parameters<typeof patchCurrentUser>[0]);
      success(t('profile_saved'), '');
    } catch (e) {
      error(t('error'), e instanceof Error ? e.message : String(e));
    } finally {
      setSavingProfile(false);
    }
  };

  const tabs: { id: SettingsTab; label: string; icon?: ReactNode }[] = [
    { id: 'general', label: t('tab_general') },
    { id: 'profile', label: t('profile_tab') },
    ...(currentUser.role === 'admin' ? [{ id: 'users' as const, label: t('shop_users'), icon: <UserCog size={14} /> }] : []),
    ...(shopSettingsTabs
      ? [
          { id: 'print' as const, label: t('print_settings'), icon: <Printer size={14} /> },
          { id: 'offline' as const, label: t('offline_mode'), icon: <WifiOff size={14} /> },
          { id: 'support' as const, label: t('support'), icon: <MessageSquare size={14} /> },
        ]
      : [{ id: 'support' as const, label: t('support'), icon: <MessageSquare size={14} /> }]),
    { id: 'security', label: t('tab_security') },
    { id: 'backup', label: t('tab_backup') },
  ];

  return (
    <div className="space-y-6 fade-in max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white">{t('settings')}</h1>
        <p className="text-slate-400 text-sm mt-1">{t('manage_account_settings')}</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 border-b border-white/10">
        {tabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => goTab(tab.id)}
            className={`px-4 py-2.5 rounded-t-lg text-sm font-medium whitespace-nowrap transition-colors inline-flex items-center gap-1.5 ${
              activeTab === tab.id
                ? 'bg-emerald-500/10 text-emerald-400 border-b-2 border-emerald-500'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="pt-2">
        {activeTab === 'general' && (
          <div className="space-y-6">
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 space-y-4">
              <h2 className="text-white font-semibold">اطلاعات کاربر</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  ['نام کامل', currentUser.full_name],
                  ['نقش', currentUser.role === 'super_admin' ? t('role_super_admin') : currentUser.role === 'admin' ? t('role_admin') : currentUser.role === 'seller' ? t('role_seller') : currentUser.role === 'accountant' ? t('role_accountant') : t('role_stock_keeper')],
                  ['وضعیت', currentUser.status === 'active' ? 'فعال' : 'غیرفعال'],
                ].map(([k, v]) => (
                  <div key={k}>
                    <label className="text-slate-400 text-xs block mb-1">{k}</label>
                    <div className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm">{v}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 space-y-4">
              <h2 className="text-white font-semibold">تغییر رمز عبور</h2>
              <form onSubmit={handleChangePwd} className="space-y-3 max-w-sm">
                {[
                  ['رمز فعلی', currentPwd, setCurrentPwd] as const,
                  ['رمز جدید (حداقل ۴ کاراکتر)', newPwd, setNewPwd] as const,
                  ['تکرار رمز جدید', confirmPwd, setConfirmPwd] as const
                ].map(([label, val, setter]) => (
                  <div key={label}>
                    <label className="text-slate-400 text-xs block mb-1">{label}</label>
                    <div className="relative">
                      <input type={showPwd ? 'text' : 'password'} value={val} onChange={e => setter(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:border-emerald-500" />
                      <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                        {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                ))}
                <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors">تغییر رمز</button>
              </form>
            </div>

            {currentUser.role === 'super_admin' && (
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 space-y-4">
                <h2 className="text-white font-semibold">تنظیمات سیستم</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[['ارز پیش‌فرض', 'AFN'], ['تلفن پشتیبانی', '0795074175'], ['نسخه سیستم', 'v3.0.0']].map(([k, v]) => (
                    <div key={k}>
                      <label className="text-slate-400 text-xs block mb-1">{k}</label>
                      <input defaultValue={v} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-emerald-500" />
                    </div>
                  ))}
                </div>
                <button onClick={() => success('ذخیره شد', 'تنظیمات با موفقیت ذخیره شد')} className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors">ذخیره تنظیمات</button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="space-y-6 max-w-xl">
            {currentUser.role === 'super_admin' ? (
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 text-slate-300 text-sm">
                {t('profile_super_readonly')}
              </div>
            ) : (
              <>
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 space-y-4">
                  <h2 className="text-white font-semibold flex items-center gap-2">
                    <UserCircle size={18} /> {t('profile_tab')}
                  </h2>
                  <p className="text-slate-400 text-xs">{t('profile_prefs_hint')}</p>
                  <div>
                    <label className="text-slate-400 text-xs block mb-1">{t('profile_display_name')}</label>
                    <input
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:border-emerald-500"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={savingProfile}
                    onClick={() => void handleSaveProfile()}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {savingProfile ? t('loading') : t('profile_save')}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('security')}
                  className="w-full sm:w-auto flex items-center gap-2 text-emerald-400 text-sm hover:text-emerald-300"
                >
                  <ChevronLeft size={16} className="rotate-180" />
                  {t('profile_link_security')}
                </button>
              </>
            )}
          </div>
        )}

        {activeTab === 'users' && currentUser.role === 'admin' && (
          <div className="space-y-4">
            <p className="text-slate-400 text-sm max-w-2xl">
              فعال‌سازی نقش‌ها، وضعیت معلق و تنظیم رمز همان API واقعی صفحه «کاربران» است.
            </p>
            <UsersPage embedded />
          </div>
        )}

        {activeTab === 'print' && shopSettingsTabs && <PrintSettingsPage />}
        {activeTab === 'offline' && shopSettingsTabs && <OfflinePage />}
        {activeTab === 'support' && <SupportPage />}

        {activeTab === 'security' && <SecurityPage twoFactorEnabled={currentUser.two_factor_enabled} />}
        {activeTab === 'backup' && <BackupPage />}
      </div>

    </div>
  );
}