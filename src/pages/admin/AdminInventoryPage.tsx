import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase';
import { Package, Search, AlertTriangle, CheckCircle, XCircle, Edit, Layers, Save, ScanLine } from 'lucide-react';
import { BarcodeScannerModal } from '@/components/admin/BarcodeScannerModal';

export function AdminInventoryPage() {
  const { t, lang } = useLanguage();
  const { showToast } = useToast();

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // all, in_stock, low_stock, out_of_stock
  
  // حالة للتعديل السريع للكمية مباشرة من الجدول
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempQty, setTempQty] = useState<number>(0);

  // حالة فتح وغلق ماسح الباركود الذكي
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      showToast(error.message, 'error');
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  };

  const handleUpdateStock = async (id: string, newQty: number) => {
    const { error } = await supabase
      .from('products')
      .update({ 
        stock_quantity: newQty 
      })
      .eq('id', id);

    if (error) {
      showToast(error.message, 'error');
    } else {
      showToast(lang === 'ar' ? 'تم تحديث المخزون بنجاح' : 'Stock updated successfully', 'success');
      setProducts(products.map(p => p.id === id ? { ...p, stock_quantity: newQty } : p));
      setEditingId(null);
    }
  };

  // تصفية المنتجات حسب البحث وحالة التاب
  const filteredProducts = products.filter(product => {
    const pName = (lang === 'ar' ? product.name_ar : product.name_en) || product.name || '';
    const matchesSearch = pName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const qty = Number(product.stock_quantity ?? 0);
    let matchesTab = true;
    if (activeTab === 'in_stock') matchesTab = qty > 5;
    else if (activeTab === 'low_stock') matchesTab = qty > 0 && qty <= 5;
    else if (activeTab === 'out_of_stock') matchesTab = qty <= 0;

    return matchesSearch && matchesTab;
  });

  // حساب الإحصائيات
  const totalProducts = products.length;
  const inStockCount = products.filter(p => Number(p.stock_quantity ?? 0) > 5).length;
  const lowStockCount = products.filter(p => {
    const q = Number(p.stock_quantity ?? 0);
    return q > 0 && q <= 5;
  }).length;
  const outOfStockCount = products.filter(p => Number(p.stock_quantity ?? 0) <= 0).length;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 pb-28 space-y-6" dir="rtl">
      {/* 1. Header with Gradient Background & Barcode Scanner Button */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-pink-50/60 via-purple-50/40 to-white rounded-3xl border border-pink-100/60 shadow-sm p-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Layers className="w-6 h-6 text-primary-500" />
            {lang === 'ar' ? 'إدارة المخزون' : 'Inventory Management'}
          </h1>
          <p className="text-xs text-gray-500 mt-1">متابعة الأرصدة، الحركات، وتحديث الكميات بشكل لحظي</p>
        </div>

        {/* زر مسح الباركود الذكي */}
        <button
          onClick={() => setIsScannerOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-bold shadow-sm transition-all cursor-pointer"
        >
          <ScanLine className="w-5 h-5" />
          <span>مسح الباركود الذكي ⚡</span>
        </button>
      </div>

      {/* 2. Mini KPI Cards (حيوية وملونة) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div 
          onClick={() => setActiveTab('all')}
          className="rounded-2xl border border-purple-200 shadow-xs p-5 flex items-center justify-between bg-gradient-to-br from-purple-50/80 to-white transition-all duration-300 hover:scale-[1.02] hover:shadow-md cursor-pointer"
        >
          <div>
            <p className="text-xs text-gray-500 font-medium">إجمالي المنتجات</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{totalProducts}</h3>
            <span className="text-xs text-purple-600 font-semibold mt-1 inline-block">كل الأصناف</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-600/20">
            <Package className="w-6 h-6" />
          </div>
        </div>

        <div 
          onClick={() => setActiveTab('in_stock')}
          className="rounded-2xl border border-emerald-200 shadow-xs p-5 flex items-center justify-between bg-gradient-to-br from-emerald-50/80 to-white transition-all duration-300 hover:scale-[1.02] hover:shadow-md cursor-pointer"
        >
          <div>
            <p className="text-xs text-gray-500 font-medium">المخزون المتوفر</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{inStockCount}</h3>
            <span className="text-xs text-emerald-600 font-semibold mt-1 inline-block">أرصدة ممتازة</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>

        <div 
          onClick={() => setActiveTab('low_stock')}
          className="rounded-2xl border border-amber-200 shadow-xs p-5 flex items-center justify-between bg-gradient-to-br from-amber-50/80 to-white transition-all duration-300 hover:scale-[1.02] hover:shadow-md cursor-pointer"
        >
          <div>
            <p className="text-xs text-gray-500 font-medium">مخزون منخفض</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{lowStockCount}</h3>
            <span className="text-xs text-amber-600 font-semibold mt-1 inline-block">تحتاج الانتباه</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        <div 
          onClick={() => setActiveTab('out_of_stock')}
          className="rounded-2xl border border-red-200 shadow-xs p-5 flex items-center justify-between bg-gradient-to-br from-red-50/80 to-white transition-all duration-300 hover:scale-[1.02] hover:shadow-md cursor-pointer"
        >
          <div>
            <p className="text-xs text-gray-500 font-medium">نفذت الكمية</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{outOfStockCount}</h3>
            <span className="text-xs text-red-600 font-semibold mt-1 inline-block">رصيد صفر</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-red-500 text-white flex items-center justify-center shadow-md shadow-red-500/20">
            <XCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 3. Search Bar & Filter Tabs */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white rounded-2xl border border-gray-100 p-4 shadow-2xs">
        <div className="relative w-full md:w-80">
          <Search className="absolute right-3.5 top-3 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={lang === 'ar' ? 'ابحث عن منتج بالمخزون...' : 'Search inventory...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-10 pl-4 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {[
            { key: 'all', label: 'الكل' },
            { key: 'in_stock', label: 'متوفر' },
            { key: 'low_stock', label: 'منخفض' },
            { key: 'out_of_stock', label: 'نفذت الكمية' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap cursor-pointer ${
                activeTab === tab.key
                  ? 'bg-primary-500 text-white shadow-md shadow-primary-500/20'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Inventory Table */}
      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">{t('loading')}</div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-card">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">لا توجد منتجات مطابقة للبحث أو الفلتر الحالي</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-gray-50 text-gray-500 uppercase font-semibold text-[11px]">
                <tr>
                  <th className="px-6 py-4">{lang === 'ar' ? 'اسم المنتج' : 'Product Name'}</th>
                  <th className="px-6 py-4">{lang === 'ar' ? 'المخزون الحالي' : 'Current Stock'}</th>
                  <th className="px-6 py-4">{lang === 'ar' ? 'محجوز' : 'Reserved'}</th>
                  <th className="px-6 py-4">{lang === 'ar' ? 'المخزون المتاح' : 'Available'}</th>
                  <th className="px-6 py-4">{lang === 'ar' ? 'حالة المخزون' : 'Status'}</th>
                  <th className="px-6 py-4 text-center">{lang === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {filteredProducts.map((product) => {
                  const productName = lang === 'ar' ? (product.name_ar || product.name) : (product.name_en || product.name);
                  const stockQty = Number(product.stock_quantity ?? 0);
                  const isEditing = editingId === product.id;

                  // حالة المخزون
                  let statusBadge = <span className="bg-emerald-500 text-white px-3 py-1 rounded-lg text-[10px] font-bold shadow-2xs">متوفر</span>;
                  if (stockQty <= 0) {
                    statusBadge = <span className="bg-red-500 text-white px-3 py-1 rounded-lg text-[10px] font-bold shadow-2xs">نفذت الكمية</span>;
                  } else if (stockQty <= 5) {
                    statusBadge = <span className="bg-amber-500 text-white px-3 py-1 rounded-lg text-[10px] font-bold shadow-2xs">مخزون منخفض</span>;
                  }

                  return (
                    <tr key={product.id} className="hover:bg-gray-50/70 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                            {product.image_url ? (
                              <img src={product.image_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Package className="w-5 h-5 text-gray-300" />
                            )}
                          </div>
                          <span className="font-bold text-gray-900 text-sm">{productName}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4 font-mono font-extrabold text-gray-900">
                        {isEditing ? (
                          <input
                            type="number"
                            value={tempQty}
                            onChange={(e) => setTempQty(Number(e.target.value))}
                            className="w-20 p-1.5 border border-primary-500 rounded-lg text-xs font-mono font-bold focus:outline-none"
                            autoFocus
                          />
                        ) : (
                          stockQty
                        )}
                      </td>

                      <td className="px-6 py-4 font-mono text-gray-500">0</td>

                      <td className="px-6 py-4 font-mono font-extrabold text-primary-600">
                        {stockQty}
                      </td>

                      <td className="px-6 py-4">
                        {statusBadge}
                      </td>

                      <td className="px-6 py-4 text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleUpdateStock(product.id, tempQty)}
                              className="px-3 py-1.5 bg-emerald-500 text-white rounded-xl text-xs font-bold hover:bg-emerald-600 transition-all inline-flex items-center gap-1 shadow-2xs cursor-pointer"
                            >
                              <Save className="w-3.5 h-3.5" />
                              <span>حفظ</span>
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-200 transition-all cursor-pointer"
                            >
                              إلغاء
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setEditingId(product.id); setTempQty(stockQty); }}
                            className="px-3 py-2 bg-primary-50 hover:bg-primary-500 text-primary-600 hover:text-white rounded-xl text-xs font-bold transition-all duration-200 inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>تعديل الكمية</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* مكون الماسح الضوئي الذكي (Barcode Scanner Modal) */}
      <BarcodeScannerModal 
        isOpen={isScannerOpen} 
        onClose={() => setIsScannerOpen(false)} 
        onSuccess={(msg) => {
          showToast(msg, 'success');
          fetchInventory(); // تحديث جدول المخزن فوراً بعد إضافة أو بيع أي منتج
        }} 
      />
    </div>
  );
}

export default AdminInventoryPage;