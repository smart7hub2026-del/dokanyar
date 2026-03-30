import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Tag, Check, Loader2 } from 'lucide-react';
import type { BusinessTypeRow } from '../services/api';
import { apiGetMasterBusinessTypes, apiPutMasterBusinessTypes } from '../services/api';
import { useStore } from '../store/useStore';
import { useToast } from './Toast';
import { useApp } from '../context/AppContext';
import FormModal from './ui/FormModal';

const featureOptions = [
  { id: 'expiry', label: 'تاریخ انقضا' },
  { id: 'barcode', label: 'بارکد / بارکدخوان' },
  { id: 'category', label: 'دسته‌بندی' },
  { id: 'bulk_discount', label: 'تخفیف گروهی' },
  { id: 'serial', label: 'سریال‌نامبر' },
  { id: 'warranty', label: 'گارانتی' },
  { id: 'batch', label: 'شماره دسته' },
  { id: 'weight', label: 'وزن‌کشی' },
  { id: 'prescription', label: 'نسخه پزشک' },
  { id: 'size', label: 'سایزبندی' },
  { id: 'color', label: 'رنگ‌بندی' },
  { id: 'wholesale', label: 'فروش عمده' },
  { id: 'table', label: 'مدیریت میز' },
  { id: 'recipe', label: 'دستور پخت' },
  { id: 'karat', label: 'عیار طلا' },
  { id: 'imei', label: 'IMEI' },
  { id: 'brand', label: 'برند' },
];

const nextId = (rows: BusinessTypeRow[]) =>
  rows.length ? Math.max(...rows.map((r) => r.id)) + 1 : 1;

export default function BusinessTypesPage() {
  const { t } = useApp();
  const { success, error } = useToast();
  const token = useStore((s) => s.authToken);
  const [types, setTypes] = useState<BusinessTypeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<BusinessTypeRow | null>(null);
  const [form, setForm] = useState({
    name: '',
    code: '',
    icon: '🏪',
    is_active: true,
    features: [] as string[],
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGetMasterBusinessTypes(token || undefined);
      setTypes(Array.isArray(res.businessTypes) ? res.businessTypes : []);
    } catch (e) {
      error(t('error'), e instanceof Error ? e.message : String(e));
      setTypes([]);
    } finally {
      setLoading(false);
    }
  }, [token, error, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const persist = async (next: BusinessTypeRow[]) => {
    setSaving(true);
    try {
      const res = await apiPutMasterBusinessTypes(next, token || undefined);
      setTypes(res.businessTypes);
      success(t('success'), t('save'));
    } catch (e) {
      error(t('error'), e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const openAdd = () => {
    setEditItem(null);
    setForm({ name: '', code: '', icon: '🏪', is_active: true, features: [] });
    setShowModal(true);
  };

  const openEdit = (bt: BusinessTypeRow) => {
    setEditItem(bt);
    setForm({
      name: bt.name,
      code: bt.code,
      icon: bt.icon,
      is_active: bt.is_active,
      features: bt.features || [],
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let next: BusinessTypeRow[];
    if (editItem) {
      next = types.map((row) =>
        row.id === editItem.id ? { ...row, ...form, features: form.features } : row
      );
    } else {
      next = [...types, { id: nextId(types), ...form, features: form.features }];
    }
    setTypes(next);
    setShowModal(false);
    await persist(next);
  };

  const toggleFeature = (feat: string) => {
    setForm((f) => ({
      ...f,
      features: f.features.includes(feat) ? f.features.filter((x) => x !== feat) : [...f.features, feat],
    }));
  };

  const deleteType = async (id: number) => {
    if (!confirm(t('are_you_sure'))) return;
    const next = types.filter((row) => row.id !== id);
    setTypes(next);
    await persist(next);
  };

  const toggleActive = async (id: number) => {
    const next = types.map((row) => (row.id === id ? { ...row, is_active: !row.is_active } : row));
    setTypes(next);
    await persist(next);
  };

  const icons = ['🏪', '💍', '📱', '👔', '🛒', '💊', '🍽️', '🏠', '🚗', '📚', '🎯', '🌿', '🧴', '🔧', '🎨'];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400 gap-2">
        <Loader2 className="animate-spin" size={22} />
        {t('loading')}
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Tag size={24} /> {t('business_types')}
            {saving && <Loader2 className="animate-spin text-slate-400" size={18} />}
          </h1>
          <p className="text-slate-400 text-sm mt-1">{t('page_business_types_subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          disabled={saving}
          className="btn-primary flex items-center gap-2 text-white px-5 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
        >
          <Plus size={18} /> {t('page_business_types_new')}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-white">{types.length}</p>
          <p className="text-slate-400 text-xs mt-1">{t('total')}</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-emerald-400">{types.filter((t) => t.is_active).length}</p>
          <p className="text-slate-400 text-xs mt-1">{t('active')}</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-slate-400">{types.filter((t) => !t.is_active).length}</p>
          <p className="text-slate-400 text-xs mt-1">{t('inactive')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {types.map((bt) => (
          <div key={bt.id} className={`glass rounded-2xl p-5 card-hover ${!bt.is_active ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between mb-3">
              <div className="text-4xl">{bt.icon}</div>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => openEdit(bt)}
                  className="p-1.5 rounded-lg glass text-slate-400 hover:text-blue-400 transition-colors"
                >
                  <Edit2 size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => void deleteType(bt.id)}
                  className="p-1.5 rounded-lg glass text-slate-400 hover:text-rose-400 transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
            <h3 className="text-white font-semibold mb-1">{bt.name}</h3>
            <p className="text-slate-500 text-xs font-mono mb-3">{bt.code}</p>

            {bt.features && bt.features.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {bt.features.map((f) => {
                  const fo = featureOptions.find((x) => x.id === f);
                  return fo ? (
                    <span
                      key={f}
                      className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                    >
                      {fo.label}
                    </span>
                  ) : null;
                })}
              </div>
            )}

            <button
              type="button"
              onClick={() => void toggleActive(bt.id)}
              disabled={saving}
              className={`w-full text-xs py-1.5 rounded-lg transition-all disabled:opacity-50 ${
                bt.is_active
                  ? 'bg-emerald-500/20 text-emerald-400 hover:bg-red-500/20 hover:text-red-400'
                  : 'bg-slate-700 text-slate-400 hover:bg-emerald-500/20 hover:text-emerald-400'
              }`}
            >
              {bt.is_active ? `✓ ${t('active')}` : `× ${t('inactive')}`}
            </button>
          </div>
        ))}
      </div>

      <FormModal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editItem ? t('page_business_types_edit') : t('page_business_types_new')}
        size="lg"
        footer={
          <div className="flex gap-3">
            <button
              type="submit"
              form="business-type-form"
              disabled={saving}
              className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white btn-primary disabled:opacity-50"
            >
              {t('save_changes')}
            </button>
            <button type="button" onClick={() => setShowModal(false)} className="rounded-xl px-5 py-2.5 text-sm text-slate-300 glass hover:text-white">
              {t('cancel')}
            </button>
          </div>
        }
      >
            <form id="business-type-form" onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">{t('name')} *</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">{t('code')} *</label>
                  <input
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm font-mono focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 text-xs mb-2 block">آیکون</label>
                <div className="flex flex-wrap gap-2">
                  {icons.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setForm({ ...form, icon })}
                      className={`w-10 h-10 text-xl rounded-xl flex items-center justify-center transition-all ${
                        form.icon === icon ? 'bg-indigo-600 ring-2 ring-indigo-400' : 'glass hover:bg-indigo-500/20'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-slate-400 text-xs mb-2 block">ویژگی‌های اختصاصی</label>
                <div className="grid grid-cols-2 gap-2">
                  {featureOptions.map((fo) => (
                    <button
                      key={fo.id}
                      type="button"
                      onClick={() => toggleFeature(fo.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-right transition-all ${
                        form.features.includes(fo.id) ? 'bg-indigo-600 text-white' : 'glass text-slate-400 hover:text-white'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 ${
                          form.features.includes(fo.id) ? 'bg-white' : 'border border-slate-600'
                        }`}
                      >
                        {form.features.includes(fo.id) && <Check size={10} className="text-indigo-600" />}
                      </div>
                      {fo.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-300 text-sm">{t('active')}</span>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, is_active: !form.is_active })}
                  className={`w-12 h-6 rounded-full transition-all relative ${form.is_active ? 'bg-emerald-500' : 'bg-slate-600'}`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${form.is_active ? 'right-1' : 'left-1'}`}
                  />
                </button>
              </div>

            </form>
      </FormModal>
    </div>
  );
}
