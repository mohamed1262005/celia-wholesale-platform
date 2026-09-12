import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Package, ArrowRight, Upload, Sparkles } from 'lucide-react';

export function AdminProductFormPage() {
  const { lang } = useLanguage();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    name_ar: '',
    name_en: '',
    category_id: '',
    price: '',
    stock_quantity: '',
    packaging: '',
    image_url: '',
  });

  useEffect(() => {
    fetchCategories();
    if (isEditing && id) {
      fetchProduct(id);
    }
  }, [id]);

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('*');
    if (data) setCategories(data);
  };

  const fetchProduct = async (productId: string) => {
    setLoading(true);
    const { data, error } = await supabase.from('products').select('*').eq('id', productId).single();
    if (error) {
      showToast(error.message, 'error');
    } else if (data) {
      setFormData({
        name_ar: data.name_ar || data.name || '',
        name_en: data.name_en || '',
        category_id: data.category_id || '',
        price: data.price?.toString() || data.unit_price?.toString() || '',
        stock_quantity: data.stock_quantity?.toString() || data.quantity?.toString() || '',
        packaging: data.packaging || '',
        image_url: data.image_url || '',
      });
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const payload = {
      name_ar: formData.name_ar,
      name_en: formData.name_en || formData.name_ar,
      category_id: formData.category_id || null,
      price: parseFloat(formData.price) || 0,
      stock_quantity: parseInt(formData.stock_quantity) || 0,
      packaging: formData.packaging,
      image_url: formData.image_url,
    };

    let error;
    if (isEditing && id) {
      const res = await supabase.from('products').update(payload).eq('id', id);
      error = res.error;
    } else {
      const res = await supabase.from('products').insert([payload]);
      error = res.error;
    }

    setSubmitting(false);

    if (error) {
      showToast(error.message, 'error');
    } else {
      showToast(
        lang === 'ar'
          ? isEditing ? 'تم تحديث المنتج بنجاح' : 'تم إضافة المنتج بنجاح'
          : isEditing ? 'Product updated successfully' : 'Product added successfully',
        'success'
      );
      navigate('/admin/products');
    }
  };

  if (loading) {
    return <div className="text-center py-20 text-gray-500 font-bold">{lang === 'ar' ? 'جاري تحميل البيانات...' : 'Loading...'}</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 pb-24 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-pink-50/60 via-purple-50/40 to-white rounded-3xl border border-pink-100/60 p-6 shadow-sm">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
            <Package className="w-6 h-6 text-primary-500" />
            <span>{isEditing ? (lang === 'ar' ? 'تعديل المنتج' : 'Edit Product') : (lang === 'ar' ? 'إضافة منتج جديد' : 'Add New Product')}</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">أدخل تفاصيل المنتج بدقة لتظهر في المتجر ولدى العملاء</p>
        </div>
        <button
          onClick={() => navigate('/admin/products')}
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-primary-600 bg-white hover:bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-200 transition-all cursor-pointer"
        >
          <ArrowRight className="w-4 h-4 rtl:rotate-180" />
          <span>رجوع للمنتجات</span>
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-gray-100 shadow-card p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Arabic Name */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2">اسم المنتج بالعربية *</label>
            <input
              type="text"
              required
              value={formData.name_ar}
              onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
              placeholder="مثال: شوكولاتة فاخرة"
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium"
            />
          </div>

          {/* English Name */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2">اسم المنتج بالإنجليزية</label>
            <input
              type="text"
              value={formData.name_en}
              onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
              placeholder="Example: Premium Chocolate"
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2">التصنيف *</label>
            <select
              required
              value={formData.category_id}
              onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium bg-white"
            >
              <option value="">اختر التصنيف</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name_ar || cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Packaging */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2">طريقة التعبئة / الوحدة</label>
            <input
              type="text"
              value={formData.packaging}
              onChange={(e) => setFormData({ ...formData, packaging: e.target.value })}
              placeholder="مثال: كرتونة، باكت، قطعة"
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium"
            />
          </div>

          {/* Price */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2">السعر (جنيه) *</label>
            <input
              type="number"
              step="0.01"
              required
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder="0.00"
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium"
            />
          </div>

          {/* Stock Quantity */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2">كمية المخزون *</label>
            <input
              type="number"
              required
              value={formData.stock_quantity}
              onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
              placeholder="0"
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium"
            />
          </div>
        </div>

        {/* Image URL */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-2">رابط صورة المنتج (Image URL)</label>
          <div className="flex gap-3">
            <input
              type="url"
              value={formData.image_url}
              onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
              placeholder="https://images.pexels.com/..."
              className="flex-1 px-4 py-3 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium"
            />
            {formData.image_url && (
              <div className="w-12 h-12 rounded-2xl overflow-hidden border border-gray-200 flex-shrink-0 bg-gray-50">
                <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/admin/products')}
            className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl text-xs font-bold transition-all cursor-pointer"
          >
            إلغاء
          </button>
          <Button type="submit" disabled={submitting} className="px-8 py-3 rounded-2xl font-extrabold shadow-lg shadow-primary-500/25">
            {submitting ? 'جاري الحفظ...' : isEditing ? 'تعديل المنتج' : 'حفظ وإضافة المنتج'}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default AdminProductFormPage;