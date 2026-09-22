import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase';
import { StatusBadge } from '@/components/StatusBadge';
import { formatDate, formatPrice } from '@/lib/pricing';
import type { Order } from '@/types';
import { ShoppingCart, Users, DollarSign, Package, ArrowRight, TrendingUp, Calendar, Eye, Trash2, Phone, MapPin, FileText } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface TopProduct {
  name: string;
  qty: number;
  image?: string;
}

interface DailySales {
  label: string;
  total: number;
}

const STATUS_COLORS: Record<string, string> = {
  new: '#3B82F6',
  processing: '#F59E0B',
  confirmed: '#10B981',
  delivered: '#00C7B7',
  cancelled: '#F43F5E',
};

const STATUS_ORDER = ['new', 'processing', 'confirmed', 'delivered', 'cancelled'];

export function DashboardPage() {
  const { t, lang } = useLanguage();
  const { profile } = useAuth();
  const { showToast } = useToast();
  
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalCustomers: 0,
    totalSales: 0,
    totalProducts: 0,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [dailySales, setDailySales] = useState<DailySales[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  const fetchDashboardData = async () => {
    const [ordersRes, customersRes, productsRes] = await Promise.all([
      supabase.from('orders').select('*, order_items:order_items(*)').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'customer'),
      supabase.from('products').select('id, name_ar, name_en, image_url'),
    ]);

    const orders = ordersRes.data || [];
    const products = productsRes.data || [];

    const isCancelled = (o: any) => o.status === 'cancelled' || o.status === 'ملغي';
    const orderTotal = (o: any) => Number(o.total_amount ?? o.subtotal ?? o.total ?? 0);

    const totalSales = orders
      .filter(o => !isCancelled(o))
      .reduce((sum, o) => sum + orderTotal(o), 0);

    setStats({
      totalOrders: orders.length,
      totalCustomers: customersRes.count || 0,
      totalSales,
      totalProducts: products.length,
    });

    const sCounts: Record<string, number> = {};
    orders.forEach(o => {
      const statusKey = o.status || 'new';
      sCounts[statusKey] = (sCounts[statusKey] || 0) + 1;
    });
    setStatusCounts(sCounts);

    // بيانات المبيعات لآخر 7 أيام
    const dayFormatter = new Intl.DateTimeFormat(lang === 'ar' ? 'ar' : 'en', { weekday: 'short' });
    const days: DailySales[] = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date();
      dayStart.setHours(0, 0, 0, 0);
      dayStart.setDate(dayStart.getDate() - i);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayStart.getDate() + 1);

      const dayTotal = orders
        .filter(o => !isCancelled(o))
        .filter(o => {
          const created = new Date(o.created_at);
          return created >= dayStart && created < dayEnd;
        })
        .reduce((sum, o) => sum + orderTotal(o), 0);

      days.push({ label: dayFormatter.format(dayStart), total: dayTotal });
    }
    setDailySales(days);

    setRecentOrders(orders.slice(0, 4));

    const { data: items } = await supabase
      .from('order_items')
      .select('product_name, product_id, quantity');

    if (items) {
      const productMap: Record<string, { qty: number; image?: string }> = {};
      items.forEach(item => {
        if (
          item.product_name &&
          item.product_name !== 'null' &&
          item.product_name !== 'undefined' &&
          item.product_name.trim() !== ''
        ) {
          const matchedProduct = products.find(
            p => p.id === item.product_id || p.name_ar === item.product_name || p.name_en === item.product_name
          );
          if (!productMap[item.product_name]) {
            productMap[item.product_name] = {
              qty: 0,
              image: matchedProduct?.image_url || undefined,
            };
          }
          productMap[item.product_name].qty += item.quantity;
        }
      });

      const top = Object.entries(productMap)
        .sort(([, a], [, b]) => b.qty - a.qty)
        .slice(0, 5)
        .map(([name, data]) => ({ name, qty: data.qty, image: data.image }));
      setTopProducts(top);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchDashboardData();
  }, [lang]);

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (error) {
      showToast(error.message, 'error');
    } else {
      showToast(lang === 'ar' ? 'تم تحديث حالة الطلب بنجاح' : 'Order status updated', 'success');
      await fetchDashboardData();
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }
    }
  };

  const deleteOrder = async (orderId: string) => {
    if (!window.confirm(lang === 'ar' ? 'هل أنت متأكد من حذف هذا الطلب نهائياً؟' : 'Delete order?')) return;
    
    await supabase.from('order_items').delete().eq('order_id', orderId);
    const { error } = await supabase.from('orders').delete().eq('id', orderId);

    if (error) {
      showToast(error.message, 'error');
    } else {
      showToast(lang === 'ar' ? 'تم حذف الطلب بنجاح' : 'Order deleted', 'success');
      setSelectedOrder(null);
      await fetchDashboardData();
    }
  };

  const pieData = useMemo(
    () =>
      STATUS_ORDER.map(status => ({ status, value: statusCounts[status] || 0 })).filter(d => d.value > 0),
    [statusCounts]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const totalForChart = Object.values(statusCounts).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="space-y-4 sm:space-y-6 pb-28 max-w-7xl mx-auto px-3 sm:px-6 w-full overflow-x-hidden">
      {/* 1. رأس لوحة التحكم */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">Celia Premium Sweets</h1>
          <p className="text-xs text-gray-500 mt-1">{t('adminDashboard')}</p>
        </div>
        <div className="flex items-center gap-3 bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-100 w-full sm:w-auto">
          <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center text-sm flex-shrink-0">
            {profile?.full_name?.[0] || 'ط'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">{profile?.full_name || 'طارق'}</p>
            <p className="text-xs text-gray-400">مدير النظام</p>
          </div>
        </div>
      </div>

      {/* 2. الكروت الأربعة الرئيسية (KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-2xl border border-pink-200 shadow-xs p-4 sm:p-5 flex items-center justify-between bg-gradient-to-br from-pink-50/70 to-white">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-gray-500 font-medium truncate">{t('totalOrders')}</p>
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mt-1 truncate">{stats.totalOrders}</h3>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-[#FF6FA5] text-white flex items-center justify-center shadow-md shadow-pink-500/20">
            <ShoppingCart className="w-5 h-5" />
          </div>
        </div>

        <div className="rounded-2xl border border-teal-200 shadow-xs p-4 sm:p-5 flex items-center justify-between bg-gradient-to-br from-teal-50/70 to-white">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-gray-500 font-medium truncate">{t('totalCustomers')}</p>
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mt-1 truncate">{stats.totalCustomers}</h3>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-[#00C7B7] text-white flex items-center justify-center shadow-md shadow-teal-500/20">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="rounded-2xl border border-amber-200 shadow-xs p-4 sm:p-5 flex items-center justify-between bg-gradient-to-br from-amber-50/70 to-white">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-gray-500 font-medium truncate">{t('totalSales')}</p>
            <h3 className="text-base sm:text-xl font-bold text-gray-900 mt-1 font-mono truncate">{formatPrice(stats.totalSales, t('currency'))}</h3>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="rounded-2xl border border-purple-200 shadow-xs p-4 sm:p-5 flex items-center justify-between bg-gradient-to-br from-purple-50/70 to-white">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-gray-500 font-medium truncate">{t('totalProducts')}</p>
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mt-1 truncate">{stats.totalProducts}</h3>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-600/20">
            <Package className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. الرسوم البيانية */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-xs p-4 sm:p-6 overflow-hidden">
          <h2 className="font-bold text-gray-900 text-sm flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-primary-500 flex-shrink-0" />
            <span>{lang === 'ar' ? 'مبيعات خلال آخر أيام' : 'Sales — last 7 days'}</span>
          </h2>
          <div className="h-56 sm:h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailySales} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} width={40} />
                <Tooltip formatter={(value: number) => formatPrice(value, t('currency'))} contentStyle={{ borderRadius: 12, border: '1px solid #F1F5F9', fontSize: 12 }} />
                <Line type="monotone" dataKey="total" stroke="#00C7B7" strokeWidth={3} dot={{ r: 4, fill: '#00C7B7' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-4 sm:p-6">
          <h2 className="font-bold text-gray-900 text-sm mb-4 truncate">{t('orderStatusDistribution')}</h2>
          <div className="relative h-40 sm:h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="status" innerRadius={45} outerRadius={65} paddingAngle={2} stroke="none">
                  {pieData.map(entry => (
                    <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || '#0cb669'} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-bold text-gray-900">{stats.totalOrders}</span>
              <span className="text-xs text-gray-400 font-medium">إجمالي</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. كروت أحدث الطلبات + المنتجات */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-xs p-4 sm:p-6 overflow-hidden">
          <div className="flex items-center justify-between mb-4 gap-2">
            <h2 className="font-bold text-gray-900 text-sm">{t('recentOrders')}</h2>
            <Link to="/admin/orders" className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1">
              {t('viewAll')} <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">{t('noOrders')}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {recentOrders.map(order => {
                const orderTotal = Number(order.total_amount ?? order.subtotal ?? order.total ?? 0);
                return (
                  <div key={order.id} className="bg-gray-50/60 hover:bg-gray-50 p-4 rounded-2xl border border-gray-100 shadow-xs transition-all flex flex-col justify-between gap-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-extrabold text-primary-600 text-xs bg-white px-2.5 py-1 rounded-lg border border-gray-100">
                        {order.order_number}
                      </span>
                      <StatusBadge status={order.status} />
                    </div>

                    <div className="space-y-0.5">
                      <p className="font-bold text-gray-900 text-xs truncate">{order.customer_name || 'عميل المتجر'}</p>
                      <p className="text-[11px] text-gray-400">{formatDate(order.created_at, lang)}</p>
                    </div>

                    <div className="flex items-center justify-between border-t border-gray-200/60 pt-2.5">
                      <span className="font-mono font-extrabold text-gray-900 text-xs">
                        {orderTotal.toFixed(2)} <span className="text-[10px] font-normal text-gray-500">{t('currency')}</span>
                      </span>
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="px-3 py-1.5 bg-primary-50 text-primary-600 hover:bg-primary-600 hover:text-white rounded-xl transition-all inline-flex items-center gap-1 font-bold text-xs cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>التفاصيل</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* أفضل المنتجات */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-4 sm:p-6 overflow-hidden">
          <h2 className="font-bold text-gray-900 text-sm mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary-500" />
            <span>{t('topProducts')}</span>
          </h2>
          {topProducts.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">{t('noData')}</p>
          ) : (
            <div className="space-y-3">
              {topProducts.map((product, idx) => (
                <div key={idx} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                  <span className="text-xs text-gray-300 w-4 font-bold text-center">{idx + 1}</span>
                  <div className="w-10 h-10 rounded-lg bg-gray-50 overflow-hidden border border-gray-200 flex items-center justify-center">
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-4 h-4 text-gray-300" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-gray-900 truncate font-semibold">{product.name}</p>
                  </div>
                  <span className="text-xs text-primary-600 font-mono font-bold whitespace-nowrap">{product.qty} {t('units')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* نافذة تفاصيل الطلب المنبثقة (Modal) */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 space-y-6 shadow-2xl animate-fade-in">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">{selectedOrder.order_number}</h2>
                <p className="text-xs text-gray-400">{formatDate(selectedOrder.created_at, lang)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => deleteOrder(selectedOrder.id)}
                  className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-500 hover:text-white rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف الفاتورة</span>
                </button>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">تحديث حالة الطلب:</label>
              <select
                value={selectedOrder.status}
                onChange={(e) => updateOrderStatus(selectedOrder.id, e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-primary-500"
              >
                <option value="new">📦 طلب جديد</option>
                <option value="processing">🔄 جاري تجهيز الطلب</option>
                <option value="confirmed">🚚 الطلب في الطريق</option>
                <option value="delivered">✅ تم التوصيل</option>
                <option value="cancelled">❌ ملغي</option>
              </select>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-primary-600" /> معلومات العميل
                </h3>
                <p className="text-sm font-semibold text-gray-800">{selectedOrder.customer_name}</p>
                <p className="text-xs text-gray-500 font-mono">{selectedOrder.customer_phone || selectedOrder.phone}</p>
              </div>

              <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-primary-600" /> عنوان التوصيل
                </h3>
                <p className="text-sm text-gray-800">{selectedOrder.city} - {selectedOrder.address}</p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-bold text-gray-900 text-sm">المنتجات المطلوبة</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {selectedOrder.order_items?.map((item: any) => (
                  <div key={item.id} className="flex justify-between items-center bg-gray-50 p-3.5 rounded-xl">
                    <div className="flex items-center gap-3">
                      {item.product_image && (
                        <img src={item.product_image} alt="" className="w-12 h-12 rounded-lg object-cover" />
                      )}
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{item.product_name}</p>
                        <p className="text-xs text-gray-400">{item.quantity} × {Number(item.unit_price).toFixed(2)} {t('currency')}</p>
                      </div>
                    </div>
                    <p className="text-sm font-bold text-gray-900 font-mono">{Number(item.total).toFixed(2)} {t('currency')}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4 flex justify-between items-center">
              <div>
                <p className="text-xs text-gray-400">طريقة الدفع</p>
                <p className="text-sm font-bold text-gray-800">
                  {selectedOrder.payment_method === 'cod' ? 'الدفع عند الاستلام' : selectedOrder.payment_method}
                </p>
              </div>
              <div className="text-left">
                <p className="text-xs text-gray-400">الإجمالي الكلي</p>
                <p className="text-2xl font-extrabold text-primary-600 font-mono">
                  {Number(selectedOrder.total_amount ?? selectedOrder.total ?? 0).toFixed(2)} <span className="text-xs font-normal">{t('currency')}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


export default DashboardPage;