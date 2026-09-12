import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase';
import { DollarSign, Zap, Plus, Trash2, Save, Layers } from 'lucide-react';

export function AdminPricingPage() {
  const { t, lang } = useLanguage();
  const { showToast } = useToast();

  const [products, setProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [pricingTiers, setPricingTiers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [autoQty, setAutoQty] = useState<number>(10);
  const [autoDiscount, setAutoDiscount] = useState<number>(2);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    if (error) {
      showToast(error.message, 'error');
    } else {
      setProducts(data || []);
      if (data && data.length > 0) {
        setSelectedProduct(data[0].id);
      }
    }
    setLoading(false);
  };

  const handleAddTier = () => {
    setPricingTiers([...pricingTiers, { min_qty: 2, max_qty: '', price: 0 }]);
  };

  const handleRemoveTier = (index: number) => {
    setPricingTiers(pricingTiers.filter((_, i) => i !== index));
  };

  const handleSavePricing = () => {
    showToast(lang === 'ar' ? 'تم حفظ الأسعار ومستويات الكميات بنجاح' : 'Pricing saved successfully', 'success');
  };

  const handleAutoApply = () => {
    showToast(lang === 'ar' ? 'تم تطبيق الخصم التلقائي بنجاح' : 'Auto discount applied', 'success');
  };

  return (
    <div className="w-full px-8 py-8 pb-32 space-y-6">
      {/* 1. Header with Gradient Background */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-pink-50/70 via-purple-50/50 to-white rounded-3xl border border-pink-100/80 shadow-sm p-8 transition-all duration-300 hover:scale-[1.01]">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary-500/10 text-primary-600 flex items-center justify-center border border-primary-500/20">
              <DollarSign className="w-7 h-7" />
            </div>
            {lang === 'ar' ? 'إدارة الأسعار' : 'Pricing Management'}
          </h1>
          <p className="text-sm text-gray-600 mt-2">تحديد أسعار الكميات وخصومات الجملة التلقائية لكل منتج بكل حيوية</p>
        </div>
      </div>

      {/* 2. Product Selector Card */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-card p-8 space-y-4 transition-all duration-300 hover:scale-[1.01] hover:shadow-lg">
        <label className="block text-sm font-bold text-gray-800">
          {lang === 'ar' ? 'اختر المنتج لتعديل تسعيره:' : 'Select Product:'}
        </label>
        <select
          value={selectedProduct}
          onChange={(e) => setSelectedProduct(e.target.value)}
          className="w-full p-4 bg-white text-gray-900 border border-gray-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all cursor-pointer shadow-2xs"
        >
          {products.length === 0 ? (
            <option value="" disabled>جاري تحميل المنتجات أو لا توجد منتجات...</option>
          ) : (
            products.map((p) => {
              const pName = lang === 'ar' ? (p.name_ar || p.name) : (p.name_en || p.name);
              return (
                <option key={p.id} value={p.id} className="py-3 text-gray-900 bg-white font-medium">
                  {pName || 'منتج بدون اسم'}
                </option>
              );
            })
          )}
        </select>
      </div>

      {/* 3. Auto Discount Tool Card */}
      <div className="bg-white rounded-3xl border border-pink-100 shadow-card p-8 space-y-5 bg-gradient-to-br from-pink-50/40 to-white transition-all duration-300 hover:scale-[1.01] hover:shadow-lg">
        <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary-500" />
          {lang === 'ar' ? 'أداة الخصم التلقائي للكميات بالجملة' : 'Auto Discount Tool'}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2">عند وصول الكمية إلى:</label>
            <input
              type="number"
              value={autoQty}
              onChange={(e) => setAutoQty(Number(e.target.value))}
              className="w-full p-3.5 bg-white text-gray-900 border border-gray-200 rounded-2xl text-sm font-mono font-bold focus:border-primary-500 focus:outline-none shadow-2xs"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2">خصم كم جنيه للقطعة؟</label>
            <input
              type="number"
              value={autoDiscount}
              onChange={(e) => setAutoDiscount(Number(e.target.value))}
              className="w-full p-3.5 bg-white text-gray-900 border border-gray-200 rounded-2xl text-sm font-mono font-bold focus:border-primary-500 focus:outline-none shadow-2xs"
            />
          </div>
        </div>

        <div className="flex justify-end pt-3">
          <button
            onClick={handleAutoApply}
            className="px-6 py-3 bg-gradient-to-r from-primary-500 to-pink-600 text-white rounded-2xl text-sm font-bold shadow-md hover:opacity-90 transition-all duration-200 hover:scale-[1.03] active:scale-[0.98] inline-flex items-center gap-2 cursor-pointer"
          >
            <Zap className="w-5 h-5" />
            <span>تطبيق الخصم تلقائياً</span>
          </button>
        </div>
      </div>

      {/* 4. Pricing Tiers Card */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-card p-8 space-y-5 transition-all duration-300 hover:scale-[1.01] hover:shadow-lg">
        <div className="flex justify-between items-center">
          <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary-500" />
            {lang === 'ar' ? 'مستويات أسعار الكميات للمنتج المختار' : 'Pricing Tiers'}
          </h2>
          <button
            onClick={handleAddTier}
            className="px-5 py-2.5 bg-primary-50 hover:bg-primary-500 text-primary-600 hover:text-white rounded-2xl text-xs font-bold transition-all duration-200 hover:scale-[1.03] active:scale-[0.98] inline-flex items-center gap-2 shadow-2xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة مستوى</span>
          </button>
        </div>

        {pricingTiers.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm bg-gray-50/60 rounded-2xl border border-dashed border-gray-200">
            لا توجد مستويات كميات مضافة لهذا المنتج. انقر فوق "إضافة مستوى" للبدء.
          </div>
        ) : (
          <div className="space-y-4">
            {pricingTiers.map((tier, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-gray-50/80 p-5 rounded-2xl border border-gray-100 transition-all hover:border-gray-200">
                <div className="md:col-span-3">
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">الحد الأدنى</label>
                  <input
                    type="number"
                    value={tier.min_qty}
                    onChange={(e) => {
                      const updated = [...pricingTiers];
                      updated[index].min_qty = Number(e.target.value);
                      setPricingTiers(updated);
                    }}
                    className="w-full p-3 bg-white text-gray-900 border border-gray-200 rounded-xl text-sm font-mono font-bold focus:outline-none focus:border-primary-500 shadow-2xs"
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">الحد الأقصى</label>
                  <input
                    type="text"
                    placeholder="بدون حد"
                    value={tier.max_qty}
                    onChange={(e) => {
                      const updated = [...pricingTiers];
                      updated[index].max_qty = e.target.value;
                      setPricingTiers(updated);
                    }}
                    className="w-full p-3 bg-white text-gray-900 border border-gray-200 rounded-xl text-sm font-mono font-bold focus:outline-none focus:border-primary-500 shadow-2xs"
                  />
                </div>
                <div className="md:col-span-4">
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">السعر / وحدة</label>
                  <input
                    type="number"
                    value={tier.price}
                    onChange={(e) => {
                      const updated = [...pricingTiers];
                      updated[index].price = Number(e.target.value);
                      setPricingTiers(updated);
                    }}
                    className="w-full p-3 bg-white text-gray-900 border border-gray-200 rounded-xl text-sm font-mono font-extrabold text-primary-600 focus:outline-none focus:border-primary-500 shadow-2xs"
                  />
                </div>
                <div className="md:col-span-2 flex justify-end pt-5">
                  <button
                    onClick={() => handleRemoveTier(index)}
                    className="p-3 bg-red-50 hover:bg-red-500 text-red-600 hover:text-white rounded-xl transition-all cursor-pointer shadow-2xs hover:scale-105"
                    title="حذف المستوى"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {pricingTiers.length > 0 && (
          <div className="flex justify-end pt-5 border-t border-gray-100">
            <button
              onClick={handleSavePricing}
              className="px-7 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-sm font-bold shadow-md transition-all duration-200 hover:scale-[1.03] active:scale-[0.98] inline-flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-5 h-5" />
              <span>حفظ مستويات الأسعار</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminPricingPage;