import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { FolderTree, ArrowRight, Upload, X, Image as ImageIcon } from 'lucide-react';

export function AdminCategoryFormPage() {
  const { lang } = useLanguage();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [formData, setFormData] = useState({
    name_ar: '',
    name_en: '',
    image: '',
  });

  useEffect(() => {
    if (isEditing && id) {
      fetchCategory(id);
    }
  }, [id]);

  const fetchCategory = async (categoryId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', categoryId)
      .maybeSingle();

    if (error) {
      showToast(error.message, 'error');
    } else if (data) {
      setFormData({
        name_ar: data.name_ar || data.name || '',
        name_en: data.name_en || '',
        image: data.image || data.image_url || '',
      });
    }
    setLoading(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setUploadingImage(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `categories/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('products')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicURLData } = supabase.storage
        .from('products')
        .getPublicUrl(filePath);

      setFormData((prev) => ({ ...prev, image: publicURLData.publicUrl }));
      showToast(lang === 'ar' ? 'تم رفع الصورة بنجاح' : 'Image uploaded successfully', 'success');
    } catch (error: any) {
      showToast(error.message || 'حدث خطأ أثناء رفع الصورة', 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const payload = {
      name_ar: formData.name_ar,
      name_en: formData.name_en || formData.name_ar,
      image: formData.image,
      image_url: formData.image,
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
          <p className="text-xs text-gray-500 mt-1">أدخل اسم التصنيف وارفع صورته ليظهر في المتجر بشكل احترافي</p>
        </div>
        <button
          type="button"
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
              onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
              placeholder="مثال: حلويات وشوكولاتة"
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2">اسم التصنيف بالإنجليزية</label>
            <input
              type="text"
              value={formData.name_en}
              onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
              placeholder="Example: Sweets & Chocolate"
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-gray-700 mb-2">صورة التصنيف</label>
            <div className="flex items-center gap-4">
              {formData.image ? (
                <div className="relative w-20 h-20 rounded-2xl overflow-hidden border border-gray-200 shadow-sm flex-shrink-0 bg-gray-50">
                  <img src={formData.image} alt="Category Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, image: '' })}
                    className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full hover:bg-red-700 transition-all shadow-md cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-400 flex-shrink-0">
                  <ImageIcon className="w-8 h-8" />
                </div>
              )}

              <div className="flex-1">
                <label className="cursor-pointer inline-flex items-center gap-2 px-5 py-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 rounded-2xl text-xs font-bold transition-all shadow-2xs">
                  <Upload className="w-4 h-4 text-primary-500" />
                  <span>{uploadingImage ? 'جاري رفع الصورة...' : 'اختر صورة التصنيف'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-gray-400 mt-2">يفضل أن تكون الصورة مربعة وبجودة عالية (PNG, JPG)</p>
              </div>
            </div>
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
          <Button type="submit" disabled={submitting || uploadingImage} className="px-8 py-3 rounded-2xl font-extrabold shadow-lg shadow-primary-500/25">
            {submitting ? 'جاري الحفظ...' : isEditing ? 'تعديل التصنيف' : 'حفظ وإضافة التصنيف'}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default AdminCategoryFormPage;