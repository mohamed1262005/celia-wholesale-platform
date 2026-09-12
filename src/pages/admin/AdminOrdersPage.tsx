import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase';
import { StatusBadge } from '@/components/StatusBadge';
import { formatDate, formatPrice } from '@/lib/pricing';
import { Eye, Search, Phone, MapPin, FileText, ShoppingCart, Clock, CheckCircle, Truck, XCircle } from 'lucide-react';

export function AdminOrdersPage() {
  const { t, lang } = useLanguage();
  const { showToast } = useToast();

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // الفلتر السريع

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items:order_items(*)')
      .order('created_at', { ascending: false });

    if (error) {
      showToast(error.message, 'error');
    } else {
      setOrders(data || []);
    }

    setLoading(false);
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (error) {
      showToast(error.message, 'error');
    } else {
      showToast(
        lang === 'ar' ? 'تم تحديث حالة الطلب بنجاح' : 'Order status updated',
        'success'
      );

      await fetchOrders();

      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({
          ...selectedOrder,
          status: newStatus,
        });
      }
    }
  };

  // فلترة الطلبات حسب البحث وحسب التاب النشط
  const filteredOrders = orders.filter((order) => {
    const search = searchTerm.toLowerCase();
    const matchesSearch =
      order.order_number?.toLowerCase().includes(search) ||
      order.customer_name?.toLowerCase().includes(search) ||
      order.customer_phone?.includes(searchTerm);

    if (activeTab === 'all') return matchesSearch;
    return matchesSearch && order.status === activeTab;
  });

  // حساب أعداد كل حالة للإحصائيات السريعة والتابات
  const counts = {
    all: orders.length,
    new: orders.filter(o => o.status === 'new').length,
    processing: orders.filter(o => o.status === 'processing').length,
    confirmed: orders.filter(o => o.status === 'confirmed').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    cancelled: orders.filter(o => o.status === 'cancelled' || o.status === 'ملغي').length,
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 pb-28 space-y-6">
      {/* 1. Header & Search */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white rounded-2xl border border-gray-100 shadow-xs p-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-primary-500" />
            {lang === 'ar' ? 'إدارة الطلبات' : 'Orders Management'}
          </h1>
          <p className="text-xs text-gray-400 mt-1">متابعة وعرض طلبات العملاء بشكل لحظي</p>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute right-3.5 top-3 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={
              lang === 'ar' ? 'بحث برقم الطلب أو اسم العميل...' : 'Search orders...'
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-10 pl-4 py-2.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
          />
        </div>
      </div>

      {/* 2. Mini KPI Cards (كروت حية وتفاعلية وملونة) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* كارت الطلبات الجديدة */}
        <div 
          onClick={() => setActiveTab('new')}
          className="rounded-2xl border border-blue-200 shadow-xs p-5 flex items-center justify-between bg-gradient-to-br from-blue-50/70 to-white transition-all duration-300 hover:scale-[1.02] hover:shadow-md cursor-pointer"
        >
          <div>
            <p className="text-xs text-gray-500 font-medium">الطلبات الجديدة</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{counts.new}</h3>
            <span className="text-xs text-blue-600 font-semibold mt-1 inline-block">بانتظار المعالجة</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-500 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
            <ShoppingCart className="w-6 h-6" />
          </div>
        </div>

        {/* كارت قيد التجهيز */}
        <div 
          onClick={() => setActiveTab('processing')}
          className="rounded-2xl border border-amber-200 shadow-xs p-5 flex items-center justify-between bg-gradient-to-br from-amber-50/70 to-white transition-all duration-300 hover:scale-[1.02] hover:shadow-md cursor-pointer"
        >
          <div>
            <p className="text-xs text-gray-500 font-medium">قيد التجهيز</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{counts.processing}</h3>
            <span className="text-xs text-amber-600 font-semibold mt-1 inline-block">جاري العمل عليها</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* كارت تم التوصيل */}
        <div 
          onClick={() => setActiveTab('delivered')}
          className="rounded-2xl border border-emerald-200 shadow-xs p-5 flex items-center justify-between bg-gradient-to-br from-emerald-50/70 to-white transition-all duration-300 hover:scale-[1.02] hover:shadow-md cursor-pointer"
        >
          <div>
            <p className="text-xs text-gray-500 font-medium">تم التوصيل</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{counts.delivered}</h3>
            <span className="text-xs text-emerald-600 font-semibold mt-1 inline-block">مكتملة بنجاح</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
            <Truck className="w-6 h-6" />
          </div>
        </div>

        {/* كارت إجمالي الطلبات */}
        <div 
          onClick={() => setActiveTab('all')}
          className="rounded-2xl border border-purple-200 shadow-xs p-5 flex items-center justify-between bg-gradient-to-br from-purple-50/70 to-white transition-all duration-300 hover:scale-[1.02] hover:shadow-md cursor-pointer"
        >
          <div>
            <p className="text-xs text-gray-500 font-medium">إجمالي الطلبات</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{counts.all}</h3>
            <span className="text-xs text-purple-600 font-semibold mt-1 inline-block">جميع الحالات</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-600/20">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 3. Quick Filter Tabs (فلاتر الحالات السريعة) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {[
          { key: 'all', label: 'الكل' },
          { key: 'new', label: 'جديد' },
          { key: 'processing', label: 'قيد التجهيز' },
          { key: 'confirmed', label: 'مؤكد' },
          { key: 'delivered', label: 'تم التوصيل' },
          { key: 'cancelled', label: 'ملغي' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === tab.key
                ? 'bg-primary-500 text-white shadow-md shadow-primary-500/20'
                : 'bg-white text-gray-600 border border-gray-100 hover:bg-gray-50'
            }`}
          >
            <span>{tab.label}</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>
              {counts[tab.key as keyof typeof counts]}
            </span>
          </button>
        ))}
      </div>

      {/* 4. Orders Table */}
      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">{t('loading')}</div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-16 text-gray-400 text-sm">
              <ShoppingCart className="w-12 h-12 text-gray-200 mx-auto mb-2" />
              لا توجد طلبات مطابقة للفلتر الحالي
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-gray-50 text-gray-500 uppercase font-semibold text-[11px]">
                  <tr>
                    <th className="px-6 py-4">{lang === 'ar' ? 'رقم الطلب' : 'Order ID'}</th>
                    <th className="px-6 py-4">{lang === 'ar' ? 'العميل' : 'Customer'}</th>
                    <th className="px-6 py-4">{lang === 'ar' ? 'التاريخ' : 'Date'}</th>
                    <th className="px-6 py-4">{lang === 'ar' ? 'الإجمالي' : 'Total'}</th>
                    <th className="px-6 py-4">{lang === 'ar' ? 'الحالة' : 'Status'}</th>
                    <th className="px-6 py-4 text-center">{lang === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {filteredOrders.map((order) => {
                    const orderTotal = Number(
                      order.total_amount ?? order.subtotal ?? 0
                    );

                    return (
                      <tr
                        key={order.id}
                        className="hover:bg-gray-50/70 transition-colors group"
                      >
                        <td className="px-6 py-4 font-mono font-bold text-primary-600">
                          {order.order_number}
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-bold text-gray-900 text-sm">
                            {order.customer_name || order.phone}
                          </p>
                          <p className="text-xs text-gray-400 font-mono mt-0.5">
                            {order.customer_phone || order.phone}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-gray-500 text-xs">
                          {formatDate(order.created_at, lang)}
                        </td>
                        <td className="px-6 py-4 font-mono font-extrabold text-gray-900 text-sm">
                          {orderTotal.toFixed(2)}{' '}
                          <span className="text-xs font-normal text-gray-500">
                            {t('currency')}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={order.status} />
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="px-3 py-2 bg-primary-50 text-primary-600 rounded-xl hover:bg-primary-500 hover:text-white transition-all inline-flex items-center gap-1.5 font-bold shadow-2xs"
                          >
                            <Eye className="w-4 h-4" />
                            <span>{lang === 'ar' ? 'التفاصيل' : 'View'}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl animate-fade-in">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {selectedOrder.order_number}
                </h2>
                <p className="text-xs text-gray-400">
                  {formatDate(selectedOrder.created_at, lang)}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                {lang === 'ar' ? 'تحديث حالة الطلب:' : 'Update Status:'}
              </label>
              <select
                value={selectedOrder.status}
                onChange={(e) =>
                  updateOrderStatus(selectedOrder.id, e.target.value)
                }
                className="w-full p-3 border border-gray-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-primary-500"
              >
                <option value="new">{lang === 'ar' ? 'جديد' : 'New'}</option>
                <option value="processing">{lang === 'ar' ? 'قيد التجهيز' : 'Processing'}</option>
                <option value="confirmed">{lang === 'ar' ? 'مؤكد' : 'Confirmed'}</option>
                <option value="delivered">{lang === 'ar' ? 'تم التوصيل' : 'Delivered'}</option>
                <option value="cancelled">{lang === 'ar' ? 'ملغي' : 'Cancelled'}</option>
              </select>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-primary-600" />
                  {lang === 'ar' ? 'معلومات العميل' : 'Customer Info'}
                </h3>
                <p className="text-sm font-semibold text-gray-800">
                  {selectedOrder.customer_name}
                </p>
                <p className="text-xs text-gray-500 font-mono">
                  {selectedOrder.customer_phone || selectedOrder.phone}
                </p>
              </div>

              <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-primary-600" />
                  {lang === 'ar' ? 'معلومات التوصيل والعنوان' : 'Shipping Info'}
                </h3>
                <p className="text-sm text-gray-800">
                  {selectedOrder.city} - {selectedOrder.address}
                </p>
                <p className="text-xs text-gray-500">
                  {selectedOrder.shipping_address}
                </p>
              </div>
            </div>

            {selectedOrder.shipping_address &&
              selectedOrder.shipping_address.includes('[ملاحظات:') && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-1">
                  <h3 className="font-bold text-amber-800 text-sm flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-amber-600" />
                    {lang === 'ar'
                      ? 'ملاحظات العميل عند تأكيد الطلب:'
                      : 'Customer Notes:'}
                  </h3>
                  <p className="text-sm text-amber-900">
                    {selectedOrder.shipping_address
                      .split('[ملاحظات:')[1]
                      ?.replace(']', '')
                      .trim()}
                  </p>
                </div>
              )}

            <div className="space-y-3">
              <h3 className="font-bold text-gray-900 text-sm">
                {lang === 'ar' ? 'المنتجات المطلوبة' : 'Order Items'}
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {selectedOrder.order_items?.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-center bg-gray-50 p-3.5 rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      {item.product_image && (
                        <img
                          src={item.product_image}
                          alt=""
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      )}
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {item.product_name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {item.quantity} × {Number(item.unit_price).toFixed(2)}{' '}
                          {t('currency')}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm font-bold text-gray-900 font-mono">
                      {Number(item.total).toFixed(2)} {t('currency')}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4 flex justify-between items-center">
              <div>
                <p className="text-xs text-gray-400">
                  {lang === 'ar' ? 'طريقة الدفع' : 'Payment Method'}
                </p>
                <p className="text-sm font-bold text-gray-800">
                  {selectedOrder.payment_method === 'cod'
                    ? lang === 'ar'
                      ? 'الدفع عند الاستلام'
                      : 'Cash on Delivery'
                    : selectedOrder.payment_method}
                </p>
              </div>
              <div className="text-left">
                <p className="text-xs text-gray-400">
                  {lang === 'ar' ? 'الإجمالي الكلي' : 'Total Amount'}
                </p>
                <p className="text-2xl font-extrabold text-primary-600 font-mono">
                  {Number(selectedOrder.total_amount ?? 0).toFixed(2)}{' '}
                  <span className="text-xs font-normal">{t('currency')}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminOrdersPage;