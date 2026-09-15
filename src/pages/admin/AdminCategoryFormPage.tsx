import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase';
import { slugify } from '@/lib/pricing';
import { Button } from '@/components/ui/Button';
import { FolderTree, ArrowRight } from 'lucide-react';

export function AdminCategoryFormPage() {
  const { lang } = useLanguage();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name_ar: '',
    name_en: '',
    slug: '',
  });

  useEffect(() => {
    if (isEditing && id) {
      fetchCategory(id);
    }
  }, [id]);

  const fetchCategory = async (categoryId: string) => {
    setLoading(true);
    const { data, error } = await supabase.from('categories').select('*').eq('id', categoryId).single();
    if (error) {
      showToast(error.message, 'error');
    } else if (data) {
      setFormData({
        name_ar: data.name_ar || data.name || '',
        name_en: data.name_en || '',
        slug: data.slug || '',
      });
    }
    setLoading(false);
  };

  const handleNameChange = (field: 'name_ar' | 'name_en', value: string) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      const shouldAutoSlug = !prev.slug || prev.slug === slugify(prev.name_en || prev.name_ar);
      if (shouldAutoSlug) {
        next.slug = slugify(next.name_en || next.name_ar);
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const payload = {
      name_ar: formData.name_ar,
      name_en: formData.name_en || formData.name_ar,
      slug: formData.slug || slugify(formData.name_en || formData.name_ar),
    };

    let error;
    if (isEditing && id) {
      const res = await supabase.from('categories').update(payload).eq('id', id);
      error = res.error;
    } else {
      const res = await supabase.from('categories').insert([payload]);
      error = res.error;
    }

    setSubmitting(false);

    if (error) {
      showToast(error.message, 'error');
    } else {
      showToast(
        lang === 'ar'
          ? isEditing ? 'تم تحديث التصنيف بنجاح' : 'تم إضافة التصنيف بنجاح'
          : isEditing ? 'Category updated successfully' : 'Category added successfully',
        'success'
      );
      navigate('/admin/categories');
    }
  };

  if (loading) {
    return <div className="text-center py-20 text-gray-500 font-bold">{lang === 'ar' ? 'جاري تحميل البيانات...' : 'Loading...'}</div>;
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 pb-24 space-y-6">
      <div className="flex items-center justify-between bg-gradient-to-r from-pink-50/60 via-purple-50/40 to-white rounded-3xl border border-pink-100/60 p-6 shadow-sm">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
            <FolderTree className="w-6 h-6 text-primary-500" />
            <span>{isEditing ? (lang === 'ar' ? 'تعديل التصنيف' : 'Edit Category') : (lang === 'ar' ? 'إضافة تصنيف جديد' : 'Add New Category')}</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">أدخل اسم التصنيف بالعربية والإنجليزية ليظهر في المتجر</p>
        </div>
        <button
          onClick={() => navigate('/admin/categories')}
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-primary-600 bg-white hover:bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-200 transition-all cursor-pointer"
        >
          <ArrowRight className="w-4 h-4 rtl:rotate-180" />
          <span>رجوع للتصنيفات</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-gray-100 shadow-card p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2">اسم التصنيف بالعربية *</label>
            <input
              type="text"
              required
              value={formData.name_ar}
              onChange={(e) => handleNameChange('name_ar', e.target.value)}
              placeholder="مثال: حلويات وشوكولاتة"
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2">اسم التصنيف بالإنجليزية</label>
            <input
              type="text"
              value={formData.name_en}
              onChange={(e) => handleNameChange('name_en', e.target.value)}
              placeholder="Example: Sweets & Chocolate"
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-gray-700 mb-2">الرابط المختصر (Slug)</label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: slugify(e.target.value) })}
              placeholder="sweets-chocolate"
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium font-mono"
            />
            <p className="text-xs text-gray-400 mt-1.5">بيتولّد تلقائيًا من الاسم، وتقدر تعدّله يدويًا لو حابب</p>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/admin/categories')}
            className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl text-xs font-bold transition-all cursor-pointer"
          >
            إلغاء
          </button>
          <Button type="submit" disabled={submitting} className="px-8 py-3 rounded-2xl font-extrabold shadow-lg shadow-primary-500/25">
            {submitting ? 'جاري الحفظ...' : isEditing ? 'تعديل التصنيف' : 'حفظ وإضافة التصنيف'}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default AdminCategoryFormPage;