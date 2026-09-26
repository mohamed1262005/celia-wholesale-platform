import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase';
import { Package, Search, AlertTriangle, CheckCircle, XCircle, Edit, Layers, Save, ScanLine, X, Eye } from 'lucide-react';
import { BarcodeScannerModal } from '@/components/admin/BarcodeScannerModal';

export function AdminInventoryPage() {
  const { t, lang } = useLanguage();
  const { showToast } = useToast();

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // all, in_stock, low_stock, out_of_stock

  // حالة للتعديل السريع للكمية مباشرة من الجدول (الديسكتوب)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempQty, setTempQty] = useState<number>(0);

  // حالة نافذة تفاصيل المنتج (الموبايل)
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [modalTempQty, setModalTempQty] = useState<number>(0);
  const [modalEditing, setModalEditing] = useState(false);

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

      // لو المنتج ده هو نفسه المفتوح جوه نافذة التفاصيل، حدّث بياناته كمان
      if (selectedProduct && selectedProduct.id === id) {
        setSelectedProduct({ ...selectedProduct, stock_quantity: newQty });
        setModalEditing(false);
      }
    }
  };

  const openDetailsModal = (product: any) => {
    setSelectedProduct(product);
    setModalTempQty(Number(product.stock_quantity ?? 0));
    setModalEditing(false);
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

  // دالة موحّدة لحساب حالة المخزون (نص + لون) — تُستخدم في الكروت والجدول والمودال
  const getStockStatus = (qty: number) => {
    if (qty <= 0) {
      return {
        label: lang === 'ar' ? 'نفذت الكمية' : 'Out of Stock',
        badgeClass: 'bg-red-500 text-white',
        borderClass: 'border-red-200',
        ringClass: 'ring-red-400',
        icon: <XCircle className="w-4 h-4" />,
      };
    }
    if (qty <= 5) {
      return {
        label: lang === 'ar' ? 'مخزون منخفض' : 'Low Stock',
        badgeClass: 'bg-amber-500 text-white',
        borderClass: 'border-amber-200',
        ringClass: 'ring-amber-400',
        icon: <AlertTriangle className="w-4 h-4" />,
      };
    }
    return {
      label: lang === 'ar' ? 'متوفر' : 'In Stock',
      badgeClass: 'bg-emerald-500 text-white',
      borderClass: 'border-emerald-200',
      ringClass: 'ring-emerald-400',
      icon: <CheckCircle className="w-4 h-4" />,
    };
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 sm:py-8 pb-28 space-y-6" dir="rtl">
      {/* 1. Header with Gradient Background & Barcode Scanner Button */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-pink-50/60 via-purple-50/40 to-white rounded-3xl border border-pink-100/60 shadow-sm p-4 sm:p-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Layers className="w-5 h-5 sm:w-6 sm:h-6 text-primary-500" />
            {lang === 'ar' ? 'إدارة المخزون' : 'Inventory Management'}
          </h1>
          <p className="text-xs text-gray-500 mt-1">متابعة الأرصدة، الحركات، وتحديث الكميات بشكل لحظي</p>
        </div>

        <button
          onClick={() => setIsScannerOpen(true)}
          className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-bold shadow-sm transition-all cursor-pointer"
        >
          <ScanLine className="w-5 h-5" />
          <span>مسح الباركود الذكي ⚡</span>
        </button>
      </div>

      {/* 2. Mini KPI Cards (حيوية وملونة) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div 
          onClick={() => setActiveTab('all')}
          className="rounded-2xl border border-purple-200 shadow-xs p-3 sm:p-5 flex items-center justify-between bg-gradient-to-br from-purple-50/80 to-white transition-all duration-300 hover:scale-[1.02] hover:shadow-md cursor-pointer"
        >
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs text-gray-500 font-medium truncate">إجمالي المنتجات</p>
            <h3 className="text-lg sm:text-2xl font-bold text-gray-900 mt-1">{totalProducts}</h3>
            <span className="text-[10px] sm:text-xs text-purple-600 font-semibold mt-1 inline-block">كل الأصناف</span>
          </div>
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-600/20 flex-shrink-0">
            <Package className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>
        </div>

        <div 
          onClick={() => setActiveTab('in_stock')}
          className="rounded-2xl border border-emerald-200 shadow-xs p-3 sm:p-5 flex items-center justify-between bg-gradient-to-br from-emerald-50/80 to-white transition-all duration-300 hover:scale-[1.02] hover:shadow-md cursor-pointer"
        >
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs text-gray-500 font-medium truncate">المخزون المتوفر</p>
            <h3 className="text-lg sm:text-2xl font-bold text-gray-900 mt-1">{inStockCount}</h3>
            <span className="text-[10px] sm:text-xs text-emerald-600 font-semibold mt-1 inline-block">أرصدة ممتازة</span>
          </div>
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 flex-shrink-0">
            <CheckCircle className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>
        </div>

        <div 
          onClick={() => setActiveTab('low_stock')}
          className="rounded-2xl border border-amber-200 shadow-xs p-3 sm:p-5 flex items-center justify-between bg-gradient-to-br from-amber-50/80 to-white transition-all duration-300 hover:scale-[1.02] hover:shadow-md cursor-pointer"
        >
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs text-gray-500 font-medium truncate">مخزون منخفض</p>
            <h3 className="text-lg sm:text-2xl font-bold text-gray-900 mt-1">{lowStockCount}</h3>
            <span className="text-[10px] sm:text-xs text-amber-600 font-semibold mt-1 inline-block">تحتاج الانتباه</span>
          </div>
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 flex-shrink-0">
            <AlertTriangle className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>
        </div>

        <div 
          onClick={() => setActiveTab('out_of_stock')}
          className="rounded-2xl border border-red-200 shadow-xs p-3 sm:p-5 flex items-center justify-between bg-gradient-to-br from-red-50/80 to-white transition-all duration-300 hover:scale-[1.02] hover:shadow-md cursor-pointer"
        >
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs text-gray-500 font-medium truncate">نفذت الكمية</p>
            <h3 className="text-lg sm:text-2xl font-bold text-gray-900 mt-1">{outOfStockCount}</h3>
            <span className="text-[10px] sm:text-xs text-red-600 font-semibold mt-1 inline-block">رصيد صفر</span>
          </div>
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-2xl bg-red-500 text-white flex items-center justify-center shadow-md shadow-red-500/20 flex-shrink-0">
            <XCircle className="w-4 h-4 sm:w-6 sm:h-6" />
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
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap flex-shrink-0 cursor-pointer ${
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

      {/* 4. Inventory — كروت على الموبايل، جدول على الشاشات الأكبر */}
      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">{t('loading')}</div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-card">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">لا توجد منتجات مطابقة للبحث أو الفلتر الحالي</p>
        </div>
      ) : (
        <>
          {/* Mobile Cards View — حية وملونة حسب حالة المخزون */}
          <div className="sm:hidden space-y-3">
            {filteredProducts.map((product) => {
              const productName = lang === 'ar' ? (product.name_ar || product.name) : (product.name_en || product.name);
              const stockQty = Number(product.stock_quantity ?? 0);
              const status = getStockStatus(stockQty);

              return (
                <div
                  key={product.id}
                  className={`bg-white rounded-2xl border-2 ${status.borderClass} shadow-card p-4 space-y-3 transition-all duration-200 hover:shadow-lg active:scale-[0.99]`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-14 h-14 rounded-xl bg-gray-50 border border-gray-100 overflow-hidden flex items-center justify-center flex-shrink-0 ring-2 ${status.ringClass} ring-offset-2`}>
                      {product.image_url ? (
                        <img src={product.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Package className="w-6 h-6 text-gray-300" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-gray-900 text-sm line-clamp-1">{productName}</p>
                      <span className={`inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${status.badgeClass}`}>
                        {status.icon}
                        {status.label}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 border-t border-gray-50 pt-3">
                    <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                      <p className="text-[10px] text-gray-400 font-medium">المخزون الحالي</p>
                      <p className="font-mono font-extrabold text-gray-900 text-lg mt-0.5">{stockQty}</p>
                    </div>
                    <div className="bg-primary-50 rounded-xl p-2.5 text-center">
                      <p className="text-[10px] text-primary-500 font-medium">المتاح</p>
                      <p className="font-mono font-extrabold text-primary-600 text-lg mt-0.5">{stockQty}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => openDetailsModal(product)}
                    className="w-full px-3 py-2.5 bg-primary-50 text-primary-600 rounded-xl hover:bg-primary-500 hover:text-white transition-all inline-flex items-center justify-center gap-1.5 font-bold text-xs cursor-pointer"
                  >
                    <Eye className="w-4 h-4" />
                    <span>{lang === 'ar' ? 'التفاصيل' : 'View Details'}</span>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden">
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
                    const status = getStockStatus(stockQty);

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
                          <span className={`px-3 py-1 rounded-lg text-[10px] font-bold shadow-2xs ${status.badgeClass}`}>{status.label}</span>
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
        </>
      )}

      {/* نافذة تفاصيل المنتج — تظهر عند الضغط على "التفاصيل" في كارت الموبايل */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4" onClick={() => setSelectedProduct(null)}>
          <div
            className="bg-white rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto p-5 space-y-5 shadow-2xl animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const productName = lang === 'ar' ? (selectedProduct.name_ar || selectedProduct.name) : (selectedProduct.name_en || selectedProduct.name);
              const currentQty = modalEditing ? modalTempQty : Number(selectedProduct.stock_quantity ?? 0);
              const status = getStockStatus(Number(selectedProduct.stock_quantity ?? 0));

              return (
                <>
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-16 h-16 rounded-2xl bg-gray-50 border border-gray-100 overflow-hidden flex items-center justify-center flex-shrink-0 ring-2 ${status.ringClass} ring-offset-2`}>
                        {selectedProduct.image_url ? (
                          <img src={selectedProduct.image_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-7 h-7 text-gray-300" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h2 className="font-extrabold text-gray-900 text-base line-clamp-2">{productName}</h2>
                        <span className={`inline-flex items-center gap-1 mt-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${status.badgeClass}`}>
                          {status.icon}
                          {status.label}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedProduct(null)}
                      className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 cursor-pointer flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 rounded-2xl p-3 text-center">
                      <p className="text-[11px] text-gray-400 font-medium">{lang === 'ar' ? 'محجوز' : 'Reserved'}</p>
                      <p className="font-mono font-extrabold text-gray-900 text-xl mt-1">0</p>
                    </div>
                    <div className="bg-primary-50 rounded-2xl p-3 text-center">
                      <p className="text-[11px] text-primary-500 font-medium">{lang === 'ar' ? 'المتاح' : 'Available'}</p>
                      <p className="font-mono font-extrabold text-primary-600 text-xl mt-1">{Number(selectedProduct.stock_quantity ?? 0)}</p>
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-4">
                    <label className="block text-xs font-bold text-gray-700 mb-2">
                      {lang === 'ar' ? 'الكمية الحالية بالمخزون' : 'Current Stock Quantity'}
                    </label>
                    {modalEditing ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={currentQty}
                          onChange={(e) => setModalTempQty(Number(e.target.value))}
                          className="flex-1 p-3 border border-primary-500 rounded-xl text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-primary-200"
                          autoFocus
                        />
                        <button
                          onClick={() => handleUpdateStock(selectedProduct.id, modalTempQty)}
                          className="px-4 py-3 bg-emerald-500 text-white rounded-xl text-xs font-bold hover:bg-emerald-600 transition-all inline-flex items-center gap-1.5 shadow-2xs cursor-pointer flex-shrink-0"
                        >
                          <Save className="w-4 h-4" />
                          <span>حفظ</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 p-3 bg-gray-50 rounded-xl font-mono font-extrabold text-gray-900 text-lg">
                          {currentQty}
                        </div>
                        <button
                          onClick={() => { setModalEditing(true); setModalTempQty(Number(selectedProduct.stock_quantity ?? 0)); }}
                          className="px-4 py-3 bg-primary-50 text-primary-600 rounded-xl text-xs font-bold hover:bg-primary-500 hover:text-white transition-all inline-flex items-center gap-1.5 cursor-pointer flex-shrink-0"
                        >
                          <Edit className="w-4 h-4" />
                          <span>تعديل</span>
                        </button>
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* مكون الماسح الضوئي الذكي (Barcode Scanner Modal) */}
      <BarcodeScannerModal 
        isOpen={isScannerOpen} 
        onClose={() => setIsScannerOpen(false)} 
        onSuccess={(msg) => {
          showToast(msg, 'success');
          fetchInventory();
        }} 
      />
    </div>
  );
}

export default AdminInventoryPage;