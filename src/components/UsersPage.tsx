import { useState, useEffect, useCallback } from 'react';
import { Search, Edit2, Shield, User, Eye, EyeOff, KeyRound, UserCheck, RefreshCw, Mic, MicOff } from 'lucide-react';
import { useToast } from './Toast';
import { useApp } from '../context/AppContext';
import Modal from './Modal';
import { useStore } from '../store/useStore';
import {
  apiGetShopUsers,
  apiUpdateShopUser,
  apiSetShopUserPassword,
  type ShopUserRow,
} from '../services/api';
import { useVoiceSearch } from '../hooks/useVoiceSearch';

const roleLabels: Record<string, string> = {
  admin: 'مدیر',
  seller: 'فروشنده',
  stock_keeper: 'انباردار',
  accountant: 'حسابدار',
};
const roleColors: Record<string, string> = {
  admin: 'badge-purple',
  seller: 'badge-blue',
  stock_keeper: 'badge-teal',
  accountant: 'text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400',
};
const roleDescriptions: Record<string, string> = {
  admin: 'دسترسی کامل به همه بخش‌ها',
  seller: 'فروش، مشتریان، مشاهده محصولات',
  stock_keeper: 'موجودی، محصولات، تأمین‌کنندگان',
  accountant: 'بدهی‌ها، حسابداری، حقوق، تأمین‌کنندگان',
};

export default function UsersPage({ embedded }: { embedded?: boolean } = {}) {
  const { t, isDark } = useApp();
  const { success, error } = useToast();
  const authToken = useStore(s => s.authToken);
  const [users, setUsers] = useState<ShopUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState('');

  const [search, setSearch] = useState('');
  const { isListening, startListening, stopListening, supported: voiceOk } = useVoiceSearch((text) => {
    setSearch(text);
  });
  const [showEdit, setShowEdit] = useState(false);
  const [editRow, setEditRow] = useState<ShopUserRow | null>(null);
  const [pwdRow, setPwdRow] = useState<ShopUserRow | null>(null);
  const [pwd, setPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  const [form, setForm] = useState({
    full_name: '',
    username: '',
    status: 'active' as 'active' | 'inactive' | 'pending',
  });

  const refresh = useCallback(async () => {
    const tok = authToken || undefined;
    if (!tok) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const r = await apiGetShopUsers(tok);
      setUsers(r.users || []);
      setLoadErr('');
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : 'خطا در بارگذاری');
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered = users.filter(
    u =>
      u.full_name.includes(search) ||
      u.username.includes(search) ||
      (roleLabels[u.role] || '').includes(search)
  );

  const openEdit = (u: ShopUserRow) => {
    setEditRow(u);
    setForm({
      full_name: u.full_name,
      username: u.username,
      status: u.status,
    });
    setShowEdit(true);
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRow || !authToken) return;
    try {
      await apiUpdateShopUser(
        editRow.id,
        { full_name: form.full_name.trim(), username: form.username.trim(), status: form.status },
        authToken
      );
      success('ذخیره شد', 'کاربر بروزرسانی شد');
      setShowEdit(false);
      await refresh();
    } catch (err) {
      error('خطا', err instanceof Error ? err.message : 'ذخیره ناموفق');
    }
  };

  const textColor = isDark ? 'text-white' : 'text-slate-800';
  const subText = isDark ? 'text-slate-400' : 'text-slate-500';
  const cardMobile = isDark ? 'bg-slate-800/70 border-white/10' : 'bg-slate-50 border-slate-200 shadow-sm';

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwdRow || !authToken || pwd.length < 4) {
      error('رمز', 'حداقل ۴ کاراکتر');
      return;
    }
    try {
      await apiSetShopUserPassword(pwdRow.id, pwd, authToken);
      success('رمز تنظیم شد', 'کاربر فعال و می‌تواند وارد شود');
      setPwdRow(null);
      setPwd('');
      await refresh();
    } catch (err) {
      error('خطا', err instanceof Error ? err.message : 'ناموفق');
    }
  };

  return (
    <div className="space-y-6 fade-in">
      <div className={`flex flex-wrap items-center gap-3 ${embedded ? 'justify-end' : 'justify-between'}`}>
        {!embedded && (
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <UserCheck size={24} /> {t('shop_users')}
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {t('users_page_hint')}
            </p>
            {loadErr && <p className="text-rose-400 text-xs mt-1">{loadErr}</p>}
          </div>
        )}
        {embedded && loadErr ? <p className="text-rose-400 text-sm flex-1 min-w-[200px]">{loadErr}</p> : null}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void refresh()}
            className="glass text-slate-300 hover:text-white px-4 py-2 rounded-xl text-sm flex items-center gap-2"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> بروزرسانی
          </button>
        </div>
      </div>

      <div className="glass rounded-2xl p-5">
        <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
          <Shield size={16} className="text-indigo-400" /> نقش‌های دکان
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(roleLabels).map(([role, label]) => (
            <div
              key={role}
              className={`rounded-xl p-3 border ${
                role === 'admin'
                  ? 'bg-purple-500/10 border-purple-500/20'
                  : role === 'seller'
                    ? 'bg-blue-500/10 border-blue-500/20'
                    : role === 'accountant'
                      ? 'bg-cyan-500/10 border-cyan-500/20'
                      : 'bg-teal-500/10 border-teal-500/20'
              }`}
            >
              <p className="text-white text-sm font-semibold">{label}</p>
              <p className="text-slate-400 text-xs mt-1">{roleDescriptions[role]}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'کل', value: users.length, color: 'text-white' },
          { label: 'فعال', value: users.filter(u => u.status === 'active').length, color: 'text-emerald-400' },
          { label: 'معلق', value: users.filter(u => u.status === 'pending').length, color: 'text-amber-400' },
          { label: 'غیرفعال', value: users.filter(u => u.status === 'inactive').length, color: 'text-rose-400' },
          { label: 'مدیر', value: users.filter(u => u.role === 'admin').length, color: 'text-purple-400' },
        ].map(s => (
          <div key={s.label} className="glass rounded-xl p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-slate-400 text-xs mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="relative max-w-sm">
        <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="جستجو..."
          className={`w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 pr-10 text-white placeholder-slate-500 text-sm focus:border-indigo-500 ${voiceOk ? 'pl-11' : ''}`}
        />
        {voiceOk && (
          <button type="button" onClick={isListening ? stopListening : startListening} className={`absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all ${isListening ? 'bg-rose-500/20 text-rose-400 animate-pulse' : 'text-slate-400 hover:text-emerald-400'}`} title="جستجوی صوتی">
            {isListening ? <MicOff size={16} /> : <Mic size={16} />}
          </button>
        )}
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800/50 border-b border-white/10">
                {['کاربر', 'نام کاربری', 'نقش', 'وضعیت', 'عملیات'].map(h => (
                  <th key={h} className="text-right text-slate-400 font-medium py-3 px-4 whitespace-nowrap text-xs">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    در حال بارگذاری...
                  </td>
                </tr>
              )}
              {!loading &&
                filtered.map(u => (
                  <tr key={u.id} className="table-row-hover">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500/40 to-purple-500/40 flex items-center justify-center text-white text-xs font-bold">
                          {u.full_name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-white text-xs font-medium">{u.full_name}</p>
                          <p className="text-slate-500 text-xs">#{u.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-mono text-xs">{u.username}</td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 w-fit ${roleColors[u.role] || 'badge-blue'}`}>
                        <Shield size={10} /> {roleLabels[u.role] || u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          u.status === 'active'
                            ? 'badge-green'
                            : u.status === 'pending'
                              ? 'badge-yellow'
                              : 'badge-red'
                        }`}
                      >
                        {u.status === 'active' ? 'فعال' : u.status === 'pending' ? 'معلق' : 'غیرفعال'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-1 flex-wrap">
                        <button
                          type="button"
                          onClick={() => openEdit(u)}
                          className="p-1.5 rounded-lg glass text-slate-400 hover:text-blue-400"
                          title="ویرایش"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPwdRow(u);
                            setPwd('');
                          }}
                          className="p-1.5 rounded-lg glass text-slate-400 hover:text-amber-400 flex items-center gap-1 text-[10px] px-2"
                          title="تنظیم رمز نقش"
                        >
                          <KeyRound size={13} />
                          رمز
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div className="md:hidden p-3 space-y-3">
          {loading && (
            <p className={`text-center py-8 text-sm ${subText}`}>در حال بارگذاری...</p>
          )}
          {!loading &&
            filtered.map(u => (
              <div key={u.id} className={`rounded-2xl p-4 border ${cardMobile}`}>
                <div className="flex gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500/40 to-purple-500/40 flex items-center justify-center text-white text-base font-bold shrink-0">
                    {u.full_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-[15px] ${textColor}`}>{u.full_name}</p>
                    <p className={`text-xs font-mono mt-0.5 ${subText}`}>{u.username}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full flex items-center gap-1 w-fit ${roleColors[u.role] || 'badge-blue'}`}>
                        <Shield size={10} /> {roleLabels[u.role] || u.role}
                      </span>
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full ${
                          u.status === 'active'
                            ? 'badge-green'
                            : u.status === 'pending'
                              ? 'badge-yellow'
                              : 'badge-red'
                        }`}
                      >
                        {u.status === 'active' ? 'فعال' : u.status === 'pending' ? 'معلق' : 'غیرفعال'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-3 justify-end">
                  <button
                    type="button"
                    onClick={() => openEdit(u)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 ${isDark ? 'glass text-slate-300' : 'bg-white border border-slate-200 text-slate-700'}`}
                  >
                    <Edit2 size={16} /> ویرایش
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPwdRow(u);
                      setPwd('');
                    }}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 ${isDark ? 'glass text-amber-300' : 'bg-amber-50 border border-amber-200 text-amber-900'}`}
                  >
                    <KeyRound size={16} /> رمز
                  </button>
                </div>
              </div>
            ))}
        </div>
      </div>

      <Modal
        open={showEdit}
        onClose={() => setShowEdit(false)}
        title={editRow ? `ویرایش: ${editRow.full_name}` : ''}
        footer={
          <>
            <button type="submit" form="user-edit-form" className="flex-1 btn-primary text-white font-semibold py-2.5 rounded-xl text-sm">
              ذخیره
            </button>
            <button type="button" onClick={() => setShowEdit(false)} className="flex-1 glass text-slate-300 py-2.5 rounded-xl text-sm hover:text-white">
              انصراف
            </button>
          </>
        }
      >
        <form id="user-edit-form" onSubmit={saveEdit} className="space-y-4">
          <div>
            <label className="text-slate-400 text-xs mb-1 block flex items-center gap-1">
              <User size={11} /> نام کامل *
            </label>
            <input
              value={form.full_name}
              onChange={e => setForm({ ...form, full_name: e.target.value })}
              className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500"
              required
            />
          </div>
          <div>
            <label className="text-slate-400 text-xs mb-1 block">نام کاربری *</label>
            <input
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
              className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500"
              required
            />
          </div>
          <div>
            <label className="text-slate-400 text-xs mb-1 block">وضعیت</label>
            <select
              value={form.status}
              onChange={e => setForm({ ...form, status: e.target.value as typeof form.status })}
              className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500"
            >
              <option value="active">فعال</option>
              <option value="inactive">غیرفعال</option>
              <option value="pending">معلق</option>
            </select>
          </div>
        </form>
      </Modal>

      <Modal
        open={pwdRow !== null}
        onClose={() => {
          setPwdRow(null);
          setPwd('');
        }}
        title={pwdRow ? `رمز نقش — ${pwdRow.full_name}` : ''}
        footer={
          <>
            <button type="submit" form="user-pwd-form" className="flex-1 btn-primary text-white font-semibold py-2.5 rounded-xl text-sm">
              ثبت رمز و فعال‌سازی
            </button>
            <button
              type="button"
              onClick={() => {
                setPwdRow(null);
                setPwd('');
              }}
              className="flex-1 glass text-slate-300 py-2.5 rounded-xl text-sm"
            >
              انصراف
            </button>
          </>
        }
      >
        <form id="user-pwd-form" onSubmit={savePassword} className="space-y-4">
          <p className="text-slate-400 text-xs">
            پس از ثبت، این کاربر با نقش <strong className="text-white">{pwdRow && roleLabels[pwdRow.role]}</strong> می‌تواند وارد شود (رمز نقش در صفحهٔ ورود).
          </p>
          <div className="relative">
            <input
              type={showPwd ? 'text' : 'password'}
              value={pwd}
              onChange={e => setPwd(e.target.value)}
              placeholder="حداقل ۴ کاراکتر"
              className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500 pr-10"
              minLength={4}
              required
            />
            <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
