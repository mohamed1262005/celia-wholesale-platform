import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { StatusBadge } from '@/components/StatusBadge';
import { formatDate, formatPrice } from '@/lib/pricing';
import type { Order } from '@/types';
import { ShoppingCart, Users, DollarSign, Package, ArrowRight, TrendingUp, Calendar } from 'lucide-react';
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

// ألوان الحالات — مطابقة لألوان الهوية
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
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalCustomers: 0,
    totalSales: 0,
    totalProducts: 0,
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [dailySales, setDailySales] = useState<DailySales[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [ordersRes, customersRes, productsRes] = await Promise.all([
        supabase.from('orders').select('*'),
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

      const { data: recent } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      setRecentOrders((recent as Order[]) || []);

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
    })();
  }, [lang]);

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
    <div className="space-y-4 sm:space-y-6 pb-28 max-w-7xl mx-auto px-3 sm:px-6">
      {/* 1. رأس لوحة التحكم */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Celia Premium Sweets</h1>
          <p className="text-xs text-gray-500 mt-1">{t('adminDashboard')}</p>
        </div>
        <div className="flex items-center gap-3 bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-100">
          <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center text-sm flex-shrink-0">
            {profile?.full_name?.[0] || 'ط'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">{profile?.full_name || 'طارق'}</p>
            <p className="text-xs text-gray-400">مدير النظام</p>
          </div>
        </div>
      </div>

      {/* 2. الكروت الأربعة الرئيسية (KPIs) - ألوان مخصصة ومطابقة للصورة مع تفاعل حي */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* كارت إجمالي الطلبات */}
        <div className="rounded-2xl border border-pink-200 shadow-xs p-3 sm:p-5 flex items-center justify-between bg-gradient-to-br from-pink-50/70 to-white transition-all duration-300 hover:scale-[1.02] hover:shadow-md cursor-pointer">
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs text-gray-500 font-medium truncate">{t('totalOrders')}</p>
            <h3 className="text-lg sm:text-2xl font-bold text-gray-900 mt-1">{stats.totalOrders}</h3>
            <span className="text-[10px] sm:text-xs text-emerald-600 font-semibold mt-1 inline-block">25% عن الشهر الماضي</span>
          </div>
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-2xl bg-[#FF6FA5] text-white flex items-center justify-center shadow-md shadow-pink-500/20 flex-shrink-0">
            <ShoppingCart className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>
        </div>

        {/* كارت إجمالي العملاء */}
        <div className="rounded-2xl border border-teal-200 shadow-xs p-3 sm:p-5 flex items-center justify-between bg-gradient-to-br from-teal-50/70 to-white transition-all duration-300 hover:scale-[1.02] hover:shadow-md cursor-pointer">
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs text-gray-500 font-medium truncate">{t('totalCustomers')}</p>
            <h3 className="text-lg sm:text-2xl font-bold text-gray-900 mt-1">{stats.totalCustomers}</h3>
            <span className="text-[10px] sm:text-xs text-emerald-600 font-semibold mt-1 inline-block">18% عن الشهر الماضي</span>
          </div>
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-2xl bg-[#00C7B7] text-white flex items-center justify-center shadow-md shadow-teal-500/20 flex-shrink-0">
            <Users className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>
        </div>

        {/* كارت إجمالي المبيعات */}
        <div className="rounded-2xl border border-amber-200 shadow-xs p-3 sm:p-5 flex items-center justify-between bg-gradient-to-br from-amber-50/70 to-white transition-all duration-300 hover:scale-[1.02] hover:shadow-md cursor-pointer">
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs text-gray-500 font-medium truncate">{t('totalSales')}</p>
            <h3 className="text-sm sm:text-xl font-bold text-gray-900 mt-1 font-mono truncate">{formatPrice(stats.totalSales, t('currency'))}</h3>
            <span className="text-[10px] sm:text-xs text-emerald-600 font-semibold mt-1 inline-block">30% عن الشهر الماضي</span>
          </div>
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 flex-shrink-0">
            <DollarSign className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>
        </div>

        {/* كارت إجمالي المنتجات */}
        <div className="rounded-2xl border border-purple-200 shadow-xs p-3 sm:p-5 flex items-center justify-between bg-gradient-to-br from-purple-50/70 to-white transition-all duration-300 hover:scale-[1.02] hover:shadow-md cursor-pointer">
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs text-gray-500 font-medium truncate">{t('totalProducts')}</p>
            <h3 className="text-lg sm:text-2xl font-bold text-gray-900 mt-1">{stats.totalProducts}</h3>
            <span className="text-[10px] sm:text-xs text-purple-600 font-semibold mt-1 inline-block">متوفر متاح</span>
          </div>
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-600/20 flex-shrink-0">
            <Package className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>
        </div>
      </div>

      {/* 3. صف الرسوم البيانية: خط المبيعات + دائرة توزيع الحالات */}
      <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
        {/* خط بياني حقيقي لمبيعات آخر 7 أيام */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-xs p-4 sm:p-6">
          <h2 className="font-bold text-gray-900 text-sm flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-primary-500 flex-shrink-0" />
            <span>{lang === 'ar' ? 'مبيعات خلال آخر أيام' : 'Sales — last 7 days'}</span>
          </h2>
          <div className="h-56 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailySales} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} width={36} />
                <Tooltip
                  formatter={(value: number) => formatPrice(value, t('currency'))}
                  contentStyle={{ borderRadius: 12, border: '1px solid #F1F5F9', fontSize: 12 }}
                />
                <Line type="monotone" dataKey="total" stroke="#00C7B7" strokeWidth={3} dot={{ r: 4, fill: '#00C7B7' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* دائرة (Donut) توزيع الطلبات حسب الحالة */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-4 sm:p-6">
          <h2 className="font-bold text-gray-900 text-sm mb-4">{t('orderStatusDistribution')}</h2>

          <div className="relative h-40 sm:h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="status" innerRadius={50} outerRadius={70} paddingAngle={2} stroke="none">
                  {pieData.map(entry => (
                    <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || '#0cb669'} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-bold text-gray-900">{stats.totalOrders}</span>
              <span className="text-xs text-gray-400 font-medium">{lang === 'ar' ? 'إجمالي الطلبات' : 'Total'}</span>
            </div>
          </div>

          <div className="space-y-2.5 mt-4">
            {STATUS_ORDER.map(status => {
              const count = statusCounts[status] || 0;
              const pct = Math.round((count / totalForChart) * 100);
              return (
                <div key={status} className="flex items-center justify-between text-xs gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: STATUS_COLORS[status] }} />
                    <span className="text-gray-600 font-medium truncate">{t(status as any)}</span>
                  </div>
                  <span className="text-gray-900 font-mono font-bold flex-shrink-0">
                    {count} ({pct}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. أحدث الطلبات + أفضل المنتجات مبيعاً */}
      <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
        {/* جدول أحدث الطلبات */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-xs p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4 gap-2">
            <h2 className="font-bold text-gray-900 text-sm">{t('recentOrders')}</h2>
            <Link to="/admin/orders" className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1 flex-shrink-0 whitespace-nowrap">
              {t('viewAll')} <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">{t('noOrders')}</p>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
              <table className="w-full text-right text-xs min-w-[600px] sm:min-w-0">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 font-semibold">
                    <th className="pb-3 px-3">رقم الطلب</th>
                    <th className="pb-3 px-3">اسم العميل</th>
                    <th className="pb-3 px-3">التاريخ</th>
                    <th className="pb-3 px-3">المبلغ</th>
                    <th className="pb-3 px-3">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-xs">
                  {recentOrders.map(order => (
                    <tr key={order.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-3.5 px-3 text-gray-900 font-mono font-bold">
                        <Link to={`/admin/orders/${order.id}`} className="hover:text-primary-600">
                          {order.order_number}
                        </Link>
                      </td>
                      <td className="py-3.5 px-3 text-gray-700 font-medium">{order.customer_name}</td>
                      <td className="py-3.5 px-3 text-gray-400">{formatDate(order.created_at, lang)}</td>
                      <td className="py-3.5 px-3 text-gray-900 font-mono font-bold">
                        {formatPrice(Number(order.total_amount ?? order.subtotal ?? order.total ?? 0), t('currency'))}
                      </td>
                      <td className="py-3.5 px-3">
                        <StatusBadge status={order.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* أفضل المنتجات مبيعاً */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-4 sm:p-6">
          <h2 className="font-bold text-gray-900 text-sm mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary-500 flex-shrink-0" />
            <span>{t('topProducts')}</span>
          </h2>
          {topProducts.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">{t('noData')}</p>
          ) : (
            <div className="space-y-3">
              {topProducts.map((product, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                  <span className="text-xs text-gray-300 w-4 font-bold flex-shrink-0">{idx + 1}</span>
                  <div className="w-10 h-10 rounded-lg bg-gray-50 overflow-hidden flex-shrink-0 border border-gray-200 flex items-center justify-center">
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-4 h-4 text-gray-300" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-gray-900 truncate font-semibold">{product.name}</p>
                  </div>
                  <span className="text-xs text-primary-600 font-mono whitespace-nowrap font-bold flex-shrink-0">
                    {product.qty} {t('units')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;