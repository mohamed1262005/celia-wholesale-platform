import { useEffect, useState, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { formatPrice } from '@/lib/pricing';
import { TrendingUp, Package, DollarSign, ShoppingCart, Calendar } from 'lucide-react';

export function AdminReportsPage() {
  const { t, lang } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('monthly'); // التبديل الأساسي (يومي أو شهري)
  
  // حالات اختيار تاريخ مخصص لكل قسم على حدة
  const [showSalesPicker, setShowSalesPicker] = useState(false);
  const [salesDate, setSalesDate] = useState<string>('');
  const [salesMonth, setSalesMonth] = useState<string>('');

  const [showOrdersPicker, setShowOrdersPicker] = useState(false);
  const [ordersDate, setOrdersDate] = useState<string>('');
  const [ordersMonth, setOrdersMonth] = useState<string>('');

  const salesPickerRef = useRef<HTMLDivElement>(null);
  const ordersPickerRef = useRef<HTMLDivElement>(null);

  const [salesData, setSalesData] = useState<{ label: string; value: number }[]>([]);
  const [ordersData, setOrdersData] = useState<{ label: string; value: number }[]>([]);
  const [topProducts, setTopProducts] = useState<{ name: string; qty: number; revenue: number }[]>([]);
  const [statusBreakdown, setStatusBreakdown] = useState<Record<string, number>>({});
  const [totals, setTotals] = useState({ revenue: 0, orders: 0, products: 0, units: 0 });

  const [rawOrders, setRawOrders] = useState<any[]>([]);
  const [rawItems, setRawItems] = useState<any[]>([]);

  // إغلاق القوائم عند الضغط خارجها
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (salesPickerRef.current && !salesPickerRef.current.contains(event.target as Node)) {
        setShowSalesPicker(false);
      }
      if (ordersPickerRef.current && !ordersPickerRef.current.contains(event.target as Node)) {
        setShowOrdersPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    (async () => {
      const [ordersRes, itemsRes, productsRes] = await Promise.all([
        supabase.from('orders').select('*'),
        supabase.from('order_items').select('*'),
        supabase.from('products').select('id', { count: 'exact', head: true }),
      ]);

      const orders = ordersRes.data || [];
      const items = itemsRes.data || [];
      setRawOrders(orders);
      setRawItems(items);

      // Status breakdown
      const sBreakdown: Record<string, number> = {};
      orders.forEach(o => { 
        const st = o.status || 'new';
        sBreakdown[st] = (sBreakdown[st] || 0) + 1; 
      });
      setStatusBreakdown(sBreakdown);

      // Top products
      const productMap: Record<string, { qty: number; revenue: number }> = {};
      items.forEach(item => {
        const pName = item.product_name || item.name || 'منتج';
        if (!productMap[pName]) productMap[pName] = { qty: 0, revenue: 0 };
        productMap[pName].qty += Number(item.quantity || 0);
        productMap[pName].revenue += Number(item.total ?? item.price ?? 0);
      });
      const top = Object.entries(productMap)
        .sort(([, a], [, b]) => b.qty - a.qty)
        .slice(0, 8)
        .map(([name, data]) => ({ name, qty: data.qty, revenue: data.revenue }));
      setTopProducts(top);

      // Totals
      const totalRev = orders
        .filter(o => o.status !== 'cancelled' && o.status !== 'ملغي')
        .reduce((s, o) => s + Number(o.total_amount ?? o.subtotal ?? o.total ?? 0), 0);

      const totalUnits = items.reduce((s, i) => s + Number(i.quantity || 0), 0);

      setTotals({
        revenue: totalRev,
        orders: orders.length,
        products: productsRes.count || 0,
        units: totalUnits,
      });

      setLoading(false);
    })();
  }, []);

  // تحديث بيانات المبيعات
  useEffect(() => {
    if (rawOrders.length === 0) return;
    const now = new Date();
    const chartSales: { label: string; value: number }[] = [];

    if (salesDate) {
      const targetDate = new Date(salesDate);
      const label = targetDate.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en', { month: 'short', day: 'numeric' });
      const filtered = rawOrders.filter(o => {
        const od = new Date(o.created_at);
        return od.getDate() === targetDate.getDate() && od.getMonth() === targetDate.getMonth() && od.getFullYear() === targetDate.getFullYear() && o.status !== 'cancelled' && o.status !== 'ملغي';
      });
      const val = filtered.reduce((s, o) => s + Number(o.total_amount ?? o.subtotal ?? o.total ?? 0), 0);
      chartSales.push({ label, value: val });
    } else if (salesMonth) {
      const [year, month] = salesMonth.split('-').map(Number);
      const targetDate = new Date(year, month - 1, 1);
      const label = targetDate.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en', { month: 'long', year: 'numeric' });
      const filtered = rawOrders.filter(o => {
        const od = new Date(o.created_at);
        return od.getMonth() === targetDate.getMonth() && od.getFullYear() === targetDate.getFullYear() && o.status !== 'cancelled' && o.status !== 'ملغي';
      });
      const val = filtered.reduce((s, o) => s + Number(o.total_amount ?? o.subtotal ?? o.total ?? 0), 0);
      chartSales.push({ label, value: val });
    } else if (viewMode === 'monthly') {
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const label = d.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en', { month: 'short' });
        const filtered = rawOrders.filter(o => {
          const od = new Date(o.created_at);
          return od.getMonth() === d.getMonth() && od.getFullYear() === d.getFullYear() && o.status !== 'cancelled' && o.status !== 'ملغي';
        });
        const val = filtered.reduce((s, o) => s + Number(o.total_amount ?? o.subtotal ?? o.total ?? 0), 0);
        chartSales.push({ label, value: val });
      }
    } else {
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const label = d.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en', { weekday: 'short', day: 'numeric' });
        const filtered = rawOrders.filter(o => {
          const od = new Date(o.created_at);
          return od.getDate() === d.getDate() && od.getMonth() === d.getMonth() && od.getFullYear() === d.getFullYear() && o.status !== 'cancelled' && o.status !== 'ملغي';
        });
        const val = filtered.reduce((s, o) => s + Number(o.total_amount ?? o.subtotal ?? o.total ?? 0), 0);
        chartSales.push({ label, value: val });
      }
    }
    setSalesData(chartSales);
  }, [viewMode, salesDate, salesMonth, rawOrders, lang]);

  // تحديث بيانات الطلبات
  useEffect(() => {
    if (rawOrders.length === 0) return;
    const now = new Date();
    const chartOrders: { label: string; value: number }[] = [];

    if (ordersDate) {
      const targetDate = new Date(ordersDate);
      const label = targetDate.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en', { month: 'short', day: 'numeric' });
      const filtered = rawOrders.filter(o => {
        const od = new Date(o.created_at);
        return od.getDate() === targetDate.getDate() && od.getMonth() === targetDate.getMonth() && od.getFullYear() === targetDate.getFullYear();
      });
      chartOrders.push({ label, value: filtered.length });
    } else if (ordersMonth) {
      const [year, month] = ordersMonth.split('-').map(Number);
      const targetDate = new Date(year, month - 1, 1);
      const label = targetDate.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en', { month: 'long', year: 'numeric' });
      const filtered = rawOrders.filter(o => {
        const od = new Date(o.created_at);
        return od.getMonth() === targetDate.getMonth() && od.getFullYear() === targetDate.getFullYear();
      });
      chartOrders.push({ label, value: filtered.length });
    } else if (viewMode === 'monthly') {
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const label = d.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en', { month: 'short' });
        const filtered = rawOrders.filter(o => {
          const od = new Date(o.created_at);
          return od.getMonth() === d.getMonth() && od.getFullYear() === d.getFullYear();
        });
        chartOrders.push({ label, value: filtered.length });
      }
    } else {
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const label = d.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en', { weekday: 'short', day: 'numeric' });
        const filtered = rawOrders.filter(o => {
          const od = new Date(o.created_at);
          return od.getDate() === d.getDate() && od.getMonth() === d.getMonth() && od.getFullYear() === d.getFullYear();
        });
        chartOrders.push({ label, value: filtered.length });
      }
    }
    setOrdersData(chartOrders);
  }, [viewMode, ordersDate, ordersMonth, rawOrders, lang]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <svg className="w-8 h-8 animate-spin text-primary-500" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  const maxSales = Math.max(...salesData.map(m => m.value), 1);
  const maxOrders = Math.max(...ordersData.map(m => m.value), 1);
  const maxQty = Math.max(...topProducts.map(p => p.qty), 1);

  const statusLabels: Record<string, string> = {
    new: t('new'), processing: t('processing'), confirmed: t('confirmed'),
    delivered: t('delivered'), cancelled: t('cancelled'),
  };
  const statusColors: Record<string, string> = {
    new: 'bg-blue-500', processing: 'bg-warning-500', confirmed: 'bg-success-500',
    delivered: 'bg-secondary-500', cancelled: 'bg-error-500',
  };
  const totalStatus = Object.values(statusBreakdown).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="space-y-6 pb-28 max-w-7xl mx-auto px-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('reports')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('salesOverview')}</p>
        </div>

        {/* أزرار التبديل العام */}
        <div className="flex items-center bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => { setViewMode('daily'); setSalesDate(''); setSalesMonth(''); setOrdersDate(''); setOrdersMonth(''); }}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${viewMode === 'daily' && !salesDate && !salesMonth ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
          >
            {lang === 'ar' ? 'يومي (آخر 7 أيام)' : 'Daily'}
          </button>
          <button
            onClick={() => { setViewMode('monthly'); setSalesDate(''); setSalesMonth(''); setOrdersDate(''); setOrdersMonth(''); }}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${viewMode === 'monthly' && !salesDate && !salesMonth ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
          >
            {lang === 'ar' ? 'شهري (آخر 6 شهور)' : 'Monthly'}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-amber-200 shadow-xs p-5 flex items-center justify-between bg-gradient-to-br from-amber-50/70 to-white transition-all duration-300 hover:scale-[1.02] hover:shadow-md cursor-pointer">
          <div>
            <p className="text-xs text-gray-500 font-medium">{t('revenue')}</p>
            <h3 className="text-xl font-bold text-gray-900 mt-1 font-mono">{formatPrice(totals.revenue, t('currency'))}</h3>
            <span className="text-xs text-emerald-600 font-semibold mt-1 inline-block">نشط ومحدث</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="rounded-2xl border border-pink-200 shadow-xs p-5 flex items-center justify-between bg-gradient-to-br from-pink-50/70 to-white transition-all duration-300 hover:scale-[1.02] hover:shadow-md cursor-pointer">
          <div>
            <p className="text-xs text-gray-500 font-medium">{t('totalOrders')}</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{totals.orders}</h3>
            <span className="text-xs text-emerald-600 font-semibold mt-1 inline-block">طلبات الجملة</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#FF6FA5] text-white flex items-center justify-center shadow-md shadow-pink-500/20">
            <ShoppingCart className="w-6 h-6" />
          </div>
        </div>

        <div className="rounded-2xl border border-teal-200 shadow-xs p-5 flex items-center justify-between bg-gradient-to-br from-teal-50/70 to-white transition-all duration-300 hover:scale-[1.02] hover:shadow-md cursor-pointer">
          <div>
            <p className="text-xs text-gray-500 font-medium">{t('unitsSold')}</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{totals.units}</h3>
            <span className="text-xs text-emerald-600 font-semibold mt-1 inline-block">إجمالي القطع</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#00C7B7] text-white flex items-center justify-center shadow-md shadow-teal-500/20">
            <Package className="w-6 h-6" />
          </div>
        </div>

        <div className="rounded-2xl border border-purple-200 shadow-xs p-5 flex items-center justify-between bg-gradient-to-br from-purple-50/70 to-white transition-all duration-300 hover:scale-[1.02] hover:shadow-md cursor-pointer">
          <div>
            <p className="text-xs text-gray-500 font-medium">{t('totalProducts')}</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{totals.products}</h3>
            <span className="text-xs text-purple-600 font-semibold mt-1 inline-block">متوفر بالمخزون</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-600/20">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Sales Chart with Custom Date Picker */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6 relative">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900 text-sm">
              {salesDate ? `المبيعات ليوم ${salesDate}` : salesMonth ? `مبيعات شهر ${salesMonth}` : t('salesByMonth')}
            </h2>

            <div className="relative" ref={salesPickerRef}>
              <button
                onClick={() => setShowSalesPicker(!showSalesPicker)}
                className="p-2 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 text-gray-600 flex items-center gap-1.5 transition-all text-xs font-bold"
              >
                <Calendar className="w-4 h-4 text-primary-500" />
                <span>تصفية</span>
              </button>

              {showSalesPicker && (
                <div className="absolute left-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 space-y-3 z-30">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-700">تاريخ المبيعات</span>
                    {(salesDate || salesMonth) && (
                      <button onClick={() => { setSalesDate(''); setSalesMonth(''); setShowSalesPicker(false); }} className="text-[10px] text-red-500 font-bold">إلغاء التصفية</button>
                    )}
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-500 mb-1">يوم محدد:</label>
                    <input type="date" value={salesDate} onChange={(e) => { setSalesDate(e.target.value); setSalesMonth(''); setShowSalesPicker(false); }} className="w-full p-2 border border-gray-200 rounded-xl text-xs" />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-500 mb-1">شهر محدد:</label>
                    <input type="month" value={salesMonth} onChange={(e) => { setSalesMonth(e.target.value); setSalesDate(''); setShowSalesPicker(false); }} className="w-full p-2 border border-gray-200 rounded-xl text-xs" />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-end justify-between gap-2 h-48">
            {salesData.map((m, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex-1 flex items-end">
                  <div
                    className="w-full rounded-t-lg bg-gradient-to-t from-primary-400 to-primary-600 transition-all duration-700 hover:opacity-80 relative group"
                    style={{ height: `${(m.value / maxSales) * 100}%`, minHeight: '4px' }}
                  >
                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-white px-1 shadow rounded">
                      {m.value > 0 ? formatPrice(m.value, t('currency')) : '0'}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] text-gray-500 truncate max-w-[40px]">{m.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Orders Chart with Custom Date Picker */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6 relative">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900 text-sm">
              {ordersDate ? `الطلبات ليوم ${ordersDate}` : ordersMonth ? `طلبات شهر ${ordersMonth}` : t('ordersByMonth')}
            </h2>

            <div className="relative" ref={ordersPickerRef}>
              <button
                onClick={() => setShowOrdersPicker(!showOrdersPicker)}
                className="p-2 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 text-gray-600 flex items-center gap-1.5 transition-all text-xs font-bold"
              >
                <Calendar className="w-4 h-4 text-primary-500" />
                <span>تصفية</span>
              </button>

              {showOrdersPicker && (
                <div className="absolute left-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 space-y-3 z-30">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-700">تاريخ الطلبات</span>
                    {(ordersDate || ordersMonth) && (
                      <button onClick={() => { setOrdersDate(''); setOrdersMonth(''); setShowOrdersPicker(false); }} className="text-[10px] text-red-500 font-bold">إلغاء التصفية</button>
                    )}
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-500 mb-1">يوم محدد:</label>
                    <input type="date" value={ordersDate} onChange={(e) => { setOrdersDate(e.target.value); setOrdersMonth(''); setShowOrdersPicker(false); }} className="w-full p-2 border border-gray-200 rounded-xl text-xs" />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-500 mb-1">شهر محدد:</label>
                    <input type="month" value={ordersMonth} onChange={(e) => { setOrdersMonth(e.target.value); setOrdersDate(''); setShowOrdersPicker(false); }} className="w-full p-2 border border-gray-200 rounded-xl text-xs" />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-end justify-between gap-2 h-48">
            {ordersData.map((m, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex-1 flex items-end">
                  <div
                    className="w-full rounded-t-lg bg-gradient-to-t from-secondary-400 to-secondary-600 transition-all duration-700 hover:opacity-80 relative group"
                    style={{ height: `${(m.value / maxOrders) * 100}%`, minHeight: '4px' }}
                  >
                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity bg-white px-1 shadow rounded">
                      {m.value}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] text-gray-500 truncate max-w-[40px]">{m.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top selling products */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6">
          <h2 className="font-bold text-gray-900 text-sm mb-4">{t('topSellingProducts')}</h2>
          {topProducts.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">{t('noData')}</p>
          ) : (
            <div className="space-y-3">
              {topProducts.map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-lg bg-primary-50 text-primary-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden mt-1">
                      <div className="h-full rounded-full bg-gradient-to-r from-primary-400 to-primary-600 transition-all duration-700" style={{ width: `${(p.qty / maxQty) * 100}%` }} />
                    </div>
                  </div>
                  <div className="text-end flex-shrink-0">
                    <p className="text-sm font-bold text-gray-900">{p.qty}</p>
                    <p className="text-xs text-gray-400">{t('unitsSold')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Status breakdown */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6">
          <h2 className="font-bold text-gray-900 text-sm mb-4">{t('statusBreakdown')}</h2>
          {Object.keys(statusBreakdown).length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">{t('noData')}</p>
          ) : (
            <div className="space-y-4">
              <div className="flex h-4 rounded-full overflow-hidden">
                {Object.entries(statusBreakdown).map(([status, count]) => (
                  <div
                    key={status}
                    className={statusColors[status] || 'bg-gray-400'}
                    style={{ width: `${(count / totalStatus) * 100}%` }}
                    title={`${statusLabels[status] || status}: ${count}`}
                  />
                ))}
              </div>
              <div className="space-y-2">
                {['new', 'processing', 'confirmed', 'delivered', 'cancelled'].map(status => {
                  const count = statusBreakdown[status] || 0;
                  const pct = ((count / totalStatus) * 100).toFixed(1);
                  return (
                    <div key={status} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${statusColors[status] || 'bg-gray-400'}`} />
                        <span className="text-gray-600">{statusLabels[status] || status}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-gray-900">{count}</span>
                        <span className="text-xs text-gray-400 w-12 text-end">{pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminReportsPage;