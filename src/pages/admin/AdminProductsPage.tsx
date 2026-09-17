import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase';
import { formatPrice } from '@/lib/pricing';
import { Plus, Search, QrCode, Edit, Trash2, Package, AlertTriangle, CheckCircle, XCircle, X, Upload } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { BarcodeScannerModal } from '@/components/admin/BarcodeScannerModal';

export function AdminProductsPage() {
  const { t, lang } = useLanguage();
  const { showToast } = useToast();

  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // حالات الـ Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // حقول النموذج (تمت إضافة description هنا)
  const [formData, setFormData] = useState({
    name_ar: '',
    category_id: '',
    price: '',
    stock_quantity: '',
    packaging: '',
    description: '',
  });

  // قائمة روابط صور المنتج — تدعم أكتر من صورة للمنتج الواحد
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [productsRes, categoriesRes] = await Promise.all([
      supabase.from('products').select('*').order('created_at', { ascending: false }),
      supabase.from('categories').select('*'),
    ]);

    if (productsRes.error) {
      showToast(productsRes.error.message, 'error');
    } else {
      setProducts(productsRes.data || []);
    }

    if (categoriesRes.data) {
      setCategories(categoriesRes.data);
    }

    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(lang === 'ar' ? 'هل أنت متأكد من حذف هذا المنتج؟' : 'Are you sure you want to delete this product?')) {
      return;
    }

    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      showToast(error.message, 'error');
    } else {
      showToast(lang === 'ar' ? 'تم حذف المنتج بنجاح' : 'Product deleted successfully', 'success');
      setProducts(products.filter(p => p.id !== id));
    }
  };

  // دالة رفع الصورة المباشرة لـ Supabase Storage — بتضيف الصورة الجديدة لقائمة الصور بدل ما تستبدلها
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `products/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('products') 
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('products')
        .getPublicUrl(filePath);

      setImageUrls(prev => [...prev, publicUrl]);
      showToast(lang === 'ar' ? 'تم رفع الصورة بنجاح' : 'Image uploaded successfully', 'success');
    } catch (error: any) {
      showToast(error.message || 'فشل رفع الصورة', 'error');
    } finally {
      setUploadingImage(false);
      // نصفّر قيمة الـ input عشان يسمح برفع نفس الملف تاني لو حبّ المستخدم
      e.target.value = '';
    }
  };

  const handleRemoveImage = (index: number) => {
    setImageUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleOpenAddModal = (product: any = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name_ar: product.name_ar || product.name || '',
        category_id: product.category_id || categories[0]?.id || '',
        price: product.price?.toString() || '',
        stock_quantity: product.stock_quantity?.toString() || '',
        packaging: product.packaging || '',
        description: product.description || '',
      });

      // لو المنتج عنده image_urls (متعدد) نستخدمها، وإلا نرجع لـ image_url القديمة كصورة وحيدة
      if (Array.isArray(product.image_urls) && product.image_urls.length > 0) {
        setImageUrls(product.image_urls);
      } else if (product.image_url) {
        setImageUrls([product.image_url]);
      } else {
        setImageUrls([]);
      }
    } else {
      setEditingProduct(null);
      setFormData({
        name_ar: '',
        category_id: categories[0]?.id || '',
        price: '',
        stock_quantity: '',
        packaging: '',
        description: '',
      });
      setImageUrls([]);
    }
    setIsAddModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const payload = {
      name_ar: formData.name_ar,
      name_en: formData.name_ar, 
      category_id: formData.category_id || null,
      price: parseFloat(formData.price) || 0,
      stock_quantity: parseInt(formData.stock_quantity) || 0,
      packaging: formData.packaging,
      // نحتفظ بـ image_url (أول صورة) عشان أي كود قديم لسه بيعتمد عليها يفضل شغال
      image_url: imageUrls[0] || '',
      image_urls: imageUrls,
      description: formData.description, // إرسال الوصف لقاعدة البيانات
    };

    let error;
    if (editingProduct) {
      const res = await supabase.from('products').update(payload).eq('id', editingProduct.id);
      error = res.error;
    } else {
      const res = await supabase.from('products').insert([payload]);
      error = res.error;
    }

    setSubmitting(false);

    if (error) {
      showToast(error.message, 'error');
    } else {
      showToast(lang === 'ar' ? (editingProduct ? 'تم تحديث المنتج بنجاح' : 'تم إضافة المنتج بنجاح') : 'Saved successfully', 'success');
      setIsAddModalOpen(false);
      fetchData();
    }
  };

  const filteredProducts = products.filter(product => {
    const pName = (lang === 'ar' ? product.name_ar : product.name_en) || product.name || '';
    const matchesSearch = pName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const totalProducts = products.length;
  const inStock = products.filter(p => Number(p.stock_quantity ?? 0) > 5).length;
  const lowStock = products.filter(p => {
    const q = Number(p.stock_quantity ?? 0);
    return q > 0 && q <= 5;
  }).length;
  const outOfStock = products.filter(p => Number(p.stock_quantity ?? 0) <= 0).length;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 pb-28 space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-pink-50/60 via-purple-50/40 to-white rounded-3xl border border-pink-100/60 shadow-sm p-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="w-6 h-6 text-primary-500" />
            {lang === 'ar' ? 'إدارة المنتجات' : 'Products Management'}
          </h1>
          <p className="text-xs text-gray-500 mt-1">إضافة، تعديل، ومتابعة مخزون المنتجات والجملة بكل ديناميكية</p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => setIsScanModalOpen(true)}
            className="px-4 py-2.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-2 shadow-2xs cursor-pointer"
          >
            <QrCode className="w-4 h-4 text-primary-500" />
            <span>{lang === 'ar' ? 'مسح الباركود' : 'Scan Barcode'}</span>
          </button>

          <button
            onClick={() => handleOpenAddModal()}
            className="px-5 py-2.5 bg-gradient-to-r from-primary-500 to-pink-600 hover:from-primary-600 hover:to-pink-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-primary-500/25 inline-flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{lang === 'ar' ? 'إضافة منتج' : 'Add Product'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-purple-200 shadow-xs p-5 flex items-center justify-between bg-gradient-to-br from-purple-50/80 to-white">
          <div>
            <p className="text-xs text-gray-500 font-medium">إجمالي المنتجات</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{totalProducts}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md"><Package className="w-6 h-6" /></div>
        </div>
        <div className="rounded-2xl border border-emerald-200 shadow-xs p-5 flex items-center justify-between bg-gradient-to-br from-emerald-50/80 to-white">
          <div>
            <p className="text-xs text-gray-500 font-medium">المخزون المتوفر</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{inStock}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md"><CheckCircle className="w-6 h-6" /></div>
        </div>
        <div className="rounded-2xl border border-amber-200 shadow-xs p-5 flex items-center justify-between bg-gradient-to-br from-amber-50/80 to-white">
          <div>
            <p className="text-xs text-gray-500 font-medium">مخزون منخفض</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{lowStock}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md"><AlertTriangle className="w-6 h-6" /></div>
        </div>
        <div className="rounded-2xl border border-red-200 shadow-xs p-5 flex items-center justify-between bg-gradient-to-br from-red-50/80 to-white">
          <div>
            <p className="text-xs text-gray-500 font-medium">نفذت الكمية</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{outOfStock}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-red-500 text-white flex items-center justify-center shadow-md"><XCircle className="w-6 h-6" /></div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white rounded-2xl border border-gray-100 p-4 shadow-2xs">
        <div className="relative w-full md:w-80">
          <Search className="absolute right-3.5 top-3 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={lang === 'ar' ? 'ابحث عن منتج...' : 'Search products...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-10 pl-4 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${selectedCategory === 'all' ? 'bg-primary-500 text-white shadow-md' : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'}`}
          >
            الكل
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${selectedCategory === cat.id ? 'bg-primary-500 text-white shadow-md' : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'}`}
            >
              {cat.name_ar || cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">{t('loading')}</div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-card">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">{lang === 'ar' ? 'لا توجد منتجات مطابقة للبحث' : 'No products found'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredProducts.map((product) => {
            const productName = lang === 'ar' ? (product.name_ar || product.name) : (product.name_en || product.name);
            const stockQty = Number(product.stock_quantity ?? 0);
            const productPrice = Number(product.price ?? 0);

            let stockBadge = <span className="bg-emerald-500 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold">متوفر ({stockQty})</span>;
            if (stockQty <= 0) {
              stockBadge = <span className="bg-red-500 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold">نفذت الكمية</span>;
            } else if (stockQty <= 5) {
              stockBadge = <span className="bg-amber-500 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold">منخفض ({stockQty})</span>;
            }

            return (
              <div key={product.id} className="bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden flex flex-col justify-between group">
                <div>
                  <div className="relative h-44 bg-gradient-to-b from-gray-50 to-gray-100/50 overflow-hidden border-b border-gray-100 flex items-center justify-center">
                    {product.image_url ? (
                      <img src={product.image_url} alt={productName} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <Package className="w-12 h-12 text-gray-300" />
                    )}
                    <div className="absolute top-3 right-3">{stockBadge}</div>
                    {Array.isArray(product.image_urls) && product.image_urls.length > 1 && (
                      <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {product.image_urls.length} صور
                      </div>
                    )}
                  </div>
                  <div className="p-4 space-y-2">
                    <h3 className="font-bold text-gray-900 text-sm line-clamp-1">{productName}</h3>
                    {product.description && (
                      <p className="text-xs text-gray-500 line-clamp-2">{product.description}</p>
                    )}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-gray-400">السعر:</span>
                      <span className="font-mono font-extrabold text-primary-600 text-sm">
                        {formatPrice(productPrice, t('currency'))}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 pt-0 grid grid-cols-2 gap-2 border-t border-gray-50 mt-2">
                  <button
                    onClick={() => handleOpenAddModal(product)}
                    className="py-2.5 bg-primary-50 hover:bg-primary-500 text-primary-600 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>تعديل</span>
                  </button>
                  <button
                    onClick={() => handleDelete(product.id)}
                    className="py-2.5 bg-red-50 hover:bg-red-500 text-red-600 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>حذف</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= MODAL: إضافة وتعديل منتج ================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <h2 className="text-lg font-bold text-gray-900">
                {editingProduct ? 'تعديل المنتج' : 'إضافة منتج جديد'}
              </h2>
              <button onClick={() => setIsAddModalOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 cursor-pointer">
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">اسم المنتج بالعربية *</label>
                <input
                  type="text"
                  required
                  value={formData.name_ar}
                  onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-primary-500 font-medium"
                  placeholder="مثال: شيبسي روتانا"
                />
              </div>

              {/* حقل الوصف والمواصفات الجديد */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">وصف المنتج / المواصفات</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-primary-500 font-medium"
                  placeholder="اكتب مواصفات وتفاصيل المنتج هنا..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">التصنيف *</label>
                  <select
                    required
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs bg-white focus:ring-2 focus:ring-primary-500 font-medium"
                  >
                    <option value="">اختر التصنيف</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name_ar || cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">طريقة التعبئة / الوحدة</label>
                  <input
                    type="text"
                    value={formData.packaging}
                    onChange={(e) => setFormData({ ...formData, packaging: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs font-medium"
                    placeholder="كرتونة / باكت / قطعة"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">السعر (جنيه) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs font-medium font-mono"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">كمية المخزون *</label>
                  <input
                    type="number"
                    required
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs font-medium font-mono"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* صور المنتج — بقت تدعم رفع أكتر من صورة */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-gray-700">صور المنتج ({imageUrls.length})</label>
                  {imageUrls.length > 0 && (
                    <span className="text-[10px] text-gray-400">الصورة الأولى هي الرئيسية</span>
                  )}
                </div>

                {/* معاينة الصور المرفوعة مع إمكانية الحذف */}
                {imageUrls.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {imageUrls.map((url, index) => (
                      <div key={index} className="relative w-16 h-16 rounded-2xl border border-gray-200 overflow-hidden flex-shrink-0 bg-gray-100 group/img">
                        <img src={url} alt={`Product ${index + 1}`} className="w-full h-full object-cover" />
                        {index === 0 && (
                          <span className="absolute top-0.5 start-0.5 bg-primary-600 text-white text-[8px] font-bold px-1 rounded">رئيسية</span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(index)}
                          className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-200 hover:border-primary-500 rounded-2xl cursor-pointer bg-gray-50 transition-all">
                  <Upload className="w-5 h-5 text-gray-400 mb-1" />
                  <span className="text-[11px] text-gray-500 font-bold">
                    {uploadingImage ? 'جاري الرفع...' : 'اضغط لإضافة صورة من جهازك'}
                  </span>
                  <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploadingImage} className="hidden" />
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <Button type="submit" disabled={submitting || uploadingImage} className="px-6 py-2.5 rounded-xl text-xs font-bold shadow-md cursor-pointer">
                  {submitting ? 'جاري الحفظ...' : 'حفظ المنتج'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: مسح الباركود الذكي ================= */}
      <BarcodeScannerModal 
        isOpen={isScanModalOpen} 
        onClose={() => setIsScanModalOpen(false)} 
        onSuccess={(msg) => {
          showToast(msg, 'success');
          fetchData(); // تحديث القائمة فوراً
        }} 
      />
    </div>
  );
}

export default AdminProductsPage;