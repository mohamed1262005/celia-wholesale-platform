import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { formatDate } from '@/lib/pricing';
import type { Order, OrderStatus } from '@/types';
import { ArrowLeft, Package, MapPin, User, Phone, Mail, XCircle, Sparkles, Clock, CheckCircle, Truck, Printer, Store, ReceiptText } from 'lucide-react';

export function OrderDetailPage() {
  const { id } = useParams();
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelModal, setCancelModal] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      let data = null;

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      
      if (uuidRegex.test(id)) {
        const res = await supabase
          .from('orders')
          .select('*, order_items:order_items(*)')
          .eq('id', id)
          .maybeSingle();
        data = res.data;
      }

      if (!data) {
        const res = await supabase
          .from('orders')
          .select('*, order_items:order_items(*)')
          .or(`order_number.ilike.%${id}%,id.ilike.%${id}%`)
          .maybeSingle();
        data = res.data;
      }

      setOrder(data as Order | null);
      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return <div className="max-w-4xl mx-auto px-4 py-16 text-center text-gray-400">{t('loading')}</div>;
  }

  if (!order) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center space-y-4">
        <div className="w-16 h-16 bg-primary-50 text-primary-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
          <Package className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-gray-900">الطلب غير موجود أو تم إزالتـه</h2>
        <p className="text-xs text-gray-500">عذراً، لم نتمكن من العثور على تفاصيل هذا الطلب. يمكنك متابعة طلباتك الحالية من صفحة طلباتي.</p>
        <div>
          <Link to="/orders" className="inline-block px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition-all shadow-md">
            {t('myOrders')}
          </Link>
        </div>
      </div>
    );
  }

  const canCancel = order.status === 'new' && order.customer_id === user?.id;
  const orderDetails = order as Order & {
    total_amount?: number;
    phone?: string;
    shipping_address?: string;
  };

  const handleCancel = async () => {
    const { error } = await supabase
      .from('orders')
      .update({ status: 'cancelled' as OrderStatus, updated_at: new Date().toISOString() })
      .eq('id', order.id);
    if (error) {
      showToast(t('error'), 'error');
    } else {
      showToast(t('cancelOrder') + ' — ' + order.order_number, 'success');
      setOrder({ ...order, status: 'cancelled' });
    }
    setCancelModal(false);
  };

  const statusTimeline: OrderStatus[] = ['new', 'processing', 'confirmed', 'delivered'];
  const currentIdx = order.status === 'cancelled' ? -1 : statusTimeline.indexOf(order.status);

  const timelineIcons = [
    Sparkles,
    Clock,
    CheckCircle,
    Truck
  ];

  const calculatedSubtotal = order.order_items?.reduce((sum, item) => {
    const itemTotal = Number(item.total ?? (Number(item.unit_price || 0) * Number(item.quantity || 1))) || 0;
    return sum + itemTotal;
  }, 0) || Number(order.subtotal || 0);
  const invoiceTotal = Number(orderDetails.total_amount ?? calculatedSubtotal);
  const totalItems = order.order_items?.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
    ?? Number(order.total_quantity || 0);
  const invoiceDate = new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(order.created_at));
  const paymentMethodLabel = order.payment_method === 'cod'
    ? lang === 'ar' ? 'الدفع عند الاستلام' : 'Cash on delivery'
    : order.payment_method === 'online'
      ? lang === 'ar' ? 'دفع إلكتروني' : 'Online payment'
      : order.payment_method;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
      <Link to="/orders" className="no-print inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-primary-600 mb-4">
        <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
        {t('myOrders')}
      </Link>

      <div className="no-print flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">{order.order_number}</h1>
          <p className="text-sm text-gray-500 mt-1">{formatDate(order.created_at, lang)}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={order.status} />
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="w-4 h-4" />
            {lang === 'ar' ? 'طباعة / حفظ PDF' : 'Print / Save PDF'}
          </Button>
        </div>
      </div>

      {order.status !== 'cancelled' && (
        <div className="no-print bg-white rounded-2xl border border-gray-100 shadow-card p-5 mb-6">
          <h3 className="font-bold text-sm text-gray-900 mb-4">{t('orderTimeline')}</h3>
          <div className="flex items-center justify-between relative">
            {statusTimeline.map((status, idx) => {
              const isComplete = idx <= currentIdx;
              const isCurrent = idx === currentIdx;
              const StepIcon = timelineIcons[idx];
              return (
                <div key={status} className="flex flex-col items-center flex-1 relative">
                  {idx < statusTimeline.length - 1 && (
                    <div className={`absolute top-4 start-1/2 w-full h-0.5 ${idx < currentIdx ? 'bg-success-500' : 'bg-gray-200'}`} />
                  )}
                  <div className={`relative z-10 w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    isComplete ? 'bg-success-500 text-white shadow-sm shadow-success-500/30' : 'bg-gray-100 text-gray-400'
                  } ${isCurrent ? 'ring-4 ring-success-100 scale-105' : ''}`}>
                    {isComplete ? <StepIcon className="w-4 h-4" /> : idx + 1}
                  </div>
                  <span className={`text-xs mt-2 text-center ${isComplete ? 'font-semibold text-gray-900' : 'text-gray-400'}`}>
                    {t(status)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <section className="invoice-print rounded-2xl bg-white border border-gray-100 shadow-card overflow-hidden">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-7 border-b-2 border-primary-100 bg-gradient-to-l from-primary-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary-500 text-white flex items-center justify-center">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <p className="text-lg font-extrabold text-gray-900">Celia</p>
              <p className="text-xs font-semibold tracking-wide text-primary-600">PREMIUM SWEETS</p>
              <p className="mt-1 text-[11px] text-gray-500" dir="ltr">01000359525 · mangomado011@gmail.com</p>
            </div>
          </div>
          <div className="sm:text-end">
            <h2 className="flex items-center gap-2 text-xl font-extrabold text-gray-900 sm:justify-end">
              <ReceiptText className="w-5 h-5 text-primary-600" />
              {lang === 'ar' ? 'فاتورة طلب' : 'Order invoice'}
            </h2>
            <p className="mt-1 font-mono text-sm font-bold text-primary-700" dir="ltr">{order.order_number}</p>
            <p className="text-xs text-gray-500">{invoiceDate}</p>
          </div>
        </header>

        <div className="grid sm:grid-cols-3 gap-3 p-5 sm:px-7 border-b border-gray-100 bg-white">
          <div className="rounded-xl bg-gray-50 p-3">
            <p className="mb-1 text-[11px] font-bold text-gray-400">{lang === 'ar' ? 'العميل' : 'Customer'}</p>
            <p className="text-sm font-bold text-gray-900">{order.customer_name}</p>
            <p className="text-xs text-gray-600" dir="ltr">{order.customer_phone || orderDetails.phone}</p>
            {order.customer_email && <p className="text-xs text-gray-500 break-all">{order.customer_email}</p>}
          </div>
          <div className="rounded-xl bg-gray-50 p-3">
            <p className="mb-1 text-[11px] font-bold text-gray-400">{lang === 'ar' ? 'عنوان التوصيل' : 'Delivery address'}</p>
            <p className="text-sm font-semibold text-gray-800">{[order.city, order.area].filter(Boolean).join(' - ') || '—'}</p>
            <p className="text-xs text-gray-600">{order.address || orderDetails.shipping_address || '—'}</p>
            {order.delivery_notes && <p className="mt-1 text-xs text-gray-500">{order.delivery_notes}</p>}
          </div>
          <div className="rounded-xl bg-gray-50 p-3">
            <p className="mb-1 text-[11px] font-bold text-gray-400">{lang === 'ar' ? 'الدفع وحالة الطلب' : 'Payment & order status'}</p>
            <p className="text-sm font-semibold text-gray-800">{paymentMethodLabel}</p>
            <div className="mt-1 flex items-center gap-2 text-xs text-gray-600">
              <span>{lang === 'ar' ? 'الحالة:' : 'Status:'}</span>
              <StatusBadge status={order.status} />
            </div>
            {order.order_notes && <p className="mt-1 text-xs text-gray-500">{lang === 'ar' ? 'مرجع الدفع:' : 'Payment reference:'} {order.order_notes}</p>}
          </div>
        </div>

        <div className="p-5 sm:px-7">
          <h3 className="mb-3 text-sm font-extrabold text-gray-900">{lang === 'ar' ? 'تفاصيل المنتجات' : 'Items'}</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-y border-gray-200 bg-gray-50 text-xs text-gray-500">
                  <th className="px-3 py-2 text-start font-bold">{lang === 'ar' ? 'المنتج' : 'Product'}</th>
                  <th className="px-3 py-2 text-center font-bold">{lang === 'ar' ? 'الكمية' : 'Qty'}</th>
                  <th className="px-3 py-2 text-end font-bold">{lang === 'ar' ? 'سعر الوحدة' : 'Unit price'}</th>
                  <th className="px-3 py-2 text-end font-bold">{lang === 'ar' ? 'الإجمالي' : 'Total'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {order.order_items?.map((item) => {
                  const unitPrice = Number(item.unit_price || 0);
                  const quantity = Number(item.quantity || 0);
                  const itemTotal = Number(item.total ?? unitPrice * quantity);
                  return (
                    <tr key={item.id}>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          {item.product_image && <img src={item.product_image} alt="" className="h-10 w-10 rounded-lg object-cover print-invoice-image" />}
                          <div>
                            <p className="font-semibold text-gray-900">{item.product_name}</p>
                            {item.packaging && <p className="text-xs text-gray-500">{item.packaging}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">{quantity}</td>
                      <td className="px-3 py-3 text-end whitespace-nowrap">{unitPrice.toFixed(2)} {t('currency')}</td>
                      <td className="px-3 py-3 text-end font-bold whitespace-nowrap">{itemTotal.toFixed(2)} {t('currency')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-5 flex justify-end">
            <div className="w-full max-w-xs space-y-2">
              <div className="flex justify-between gap-5 text-sm text-gray-600">
                <span>{lang === 'ar' ? 'عدد القطع' : 'Total items'}</span>
                <span>{totalItems}</span>
              </div>
              <div className="flex justify-between gap-5 border-t-2 border-primary-200 pt-3 text-base font-extrabold text-gray-900">
                <span>{lang === 'ar' ? 'الإجمالي المستحق' : 'Amount due'}</span>
                <span className="text-primary-700">{invoiceTotal.toFixed(2)} {t('currency')}</span>
              </div>
            </div>
          </div>
        </div>
        <footer className="border-t border-gray-100 bg-primary-50/60 px-5 py-3 text-center text-xs text-gray-600 sm:px-7">
          {lang === 'ar' ? 'شكرًا لثقتكم في Celia Premium Sweets' : 'Thank you for choosing Celia Premium Sweets'}
        </footer>
      </section>

      <div className="no-print mt-6">
        {canCancel && (
          <Button variant="danger" onClick={() => setCancelModal(true)}>
            <XCircle className="w-4 h-4" />
            {t('cancelOrder')}
          </Button>
        )}
      </div>

      <Modal open={cancelModal} onClose={() => setCancelModal(false)} title={t('cancelOrder')} size="sm">
        <p className="text-sm text-gray-600 mb-5">
          {lang === 'ar' ? 'هل أنت متأكد من إلغاء هذا الطلب؟' : 'Are you sure you want to cancel this order?'}
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => setCancelModal(false)}>{t('cancel2')}</Button>
          <Button variant="danger" onClick={handleCancel}>{t('confirm')}</Button>
        </div>
      </Modal>
    </div>
  );
}

export default OrderDetailPage;