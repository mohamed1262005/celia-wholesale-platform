import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Package, ArrowRight, Plus, Trash2 } from 'lucide-react';

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
  });

  // قائمة روابط الصور — تدعم أكتر من صورة للمنتج الواحد
  const [imageUrls, setImageUrls] = useState<string[]>(['']);

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
      });

      // لو المنتج عنده image_urls (متعدد) نستخدمها، وإلا نرجع لـ image_url القديمة كصورة وحيدة
      if (Array.isArray(data.image_urls) && data.image_urls.length > 0) {
        setImageUrls(data.image_urls);
      } else if (data.image_url) {
        setImageUrls([data.image_url]);
      } else {
        setImageUrls(['']);
      }
    }
    setLoading(false);
  };

  const handleImageChange = (index: number, value: string) => {
    setImageUrls((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleAddImageField = () => {
    setImageUrls((prev) => [...prev, '']);
  };

  const handleRemoveImageField = (index: number) => {
    setImageUrls((prev) => prev.length > 1 ? prev.filter((_, i) => i !== index) : ['']);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    // تنظيف الروابط الفاضية والاحتفاظ بالروابط الفعلية بس
    const cleanedImages = imageUrls.map(url => url.trim()).filter(Boolean);

    const payload = {
      name_ar: formData.name_ar,
      name_en: formData.name_en || formData.name_ar,
      category_id: formData.category_id || null,
      price: parseFloat(formData.price) || 0,
      stock_quantity: parseInt(formData.stock_quantity) || 0,
      packaging: formData.packaging,
      // نحتفظ بـ image_url (أول صورة) عشان أي كود قديم لسه بيعتمد عليها يفضل شغال
      image_url: cleanedImages[0] || '',
      image_urls: cleanedImages,
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-24 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-pink-50/60 via-purple-50/40 to-white rounded-3xl border border-pink-100/60 p-4 sm:p-6 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 flex items-center gap-2">
            <Package className="w-5 h-5 sm:w-6 sm:h-6 text-primary-500" />
            <span>{isEditing ? (lang === 'ar' ? 'تعديل المنتج' : 'Edit Product') : (lang === 'ar' ? 'إضافة منتج جديد' : 'Add New Product')}</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">أدخل تفاصيل المنتج بدقة لتظهر في المتجر ولدى العملاء</p>
        </div>
        <button
          onClick={() => navigate('/admin/products')}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-xs font-bold text-gray-600 hover:text-primary-600 bg-white hover:bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-200 transition-all cursor-pointer"
        >
          <ArrowRight className="w-4 h-4 rtl:rotate-180" />
          <span>رجوع للمنتجات</span>
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-gray-100 shadow-card p-4 sm:p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
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

        {/* Images (multiple) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-bold text-gray-700">صور المنتج (Image URLs)</label>
            <button
              type="button"
              onClick={handleAddImageField}
              className="inline-flex items-center gap-1 text-xs font-bold text-primary-600 hover:text-primary-700 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              إضافة صورة
            </button>
          </div>

          <div className="space-y-3">
            {imageUrls.map((url, index) => (
              <div key={index} className="flex gap-3">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => handleImageChange(index, e.target.value)}
                  placeholder="https://images.pexels.com/..."
                  className="flex-1 w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium"
                />
                {url && (
                  <div className="w-12 h-12 rounded-2xl overflow-hidden border border-gray-200 flex-shrink-0 bg-gray-50">
                    <img src={url} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => handleRemoveImageField(index)}
                  className="w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-2xl border border-gray-200 text-error-500 hover:bg-error-50 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">الصورة الأولى هي اللي هتظهر كصورة رئيسية للمنتج في المتجر</p>
        </div>

        {/* Submit Button */}
        <div className="pt-4 border-t border-gray-100 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/admin/products')}
            className="w-full sm:w-auto px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl text-xs font-bold transition-all cursor-pointer"
          >
            إلغاء
          </button>
          <Button type="submit" disabled={submitting} className="w-full sm:w-auto px-8 py-3 rounded-2xl font-extrabold shadow-lg shadow-primary-500/25">
            {submitting ? 'جاري الحفظ...' : isEditing ? 'تعديل المنتج' : 'حفظ وإضافة المنتج'}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default AdminProductFormPage;