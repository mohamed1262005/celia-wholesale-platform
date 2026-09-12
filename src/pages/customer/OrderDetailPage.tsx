import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { formatDate, formatDateTime } from '@/lib/pricing';
import type { Order, OrderStatus } from '@/types';
import { ArrowLeft, Package, MapPin, User, Phone, Mail, XCircle } from 'lucide-react';

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
      const { data } = await supabase
        .from('orders')
        .select('*, order_items:order_items(*)')
        .eq('id', id)
        .maybeSingle();
      setOrder(data as Order | null);
      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return <div className="max-w-4xl mx-auto px-4 py-16 text-center text-gray-400">{t('loading')}</div>;
  }

  if (!order) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-500 mb-4">{t('noOrders')}</p>
        <Link to="/orders" className="text-primary-600 font-semibold">{t('myOrders')}</Link>
      </div>
    );
  }

  const canCancel = order.status === 'new' && order.customer_id === user?.id;

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

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
      <Link to="/orders" className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-primary-600 mb-4">
        <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
        {t('myOrders')}
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">{order.order_number}</h1>
          <p className="text-sm text-gray-500 mt-1">{formatDate(order.created_at, lang)}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {/* Timeline */}
      {order.status !== 'cancelled' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-5 mb-6">
          <h3 className="font-bold text-sm text-gray-900 mb-4">{t('orderTimeline')}</h3>
          <div className="flex items-center justify-between relative">
            {statusTimeline.map((status, idx) => {
              const isComplete = idx <= currentIdx;
              const isCurrent = idx === currentIdx;
              return (
                <div key={status} className="flex flex-col items-center flex-1 relative">
                  {idx < statusTimeline.length - 1 && (
                    <div className={`absolute top-4 start-1/2 w-full h-0.5 ${idx < currentIdx ? 'bg-success-500' : 'bg-gray-200'}`} />
                  )}
                  <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    isComplete ? 'bg-success-500 text-white' : 'bg-gray-100 text-gray-400'
                  } ${isCurrent ? 'ring-4 ring-success-100' : ''}`}>
                    {isComplete ? '✓' : idx + 1}
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

      <div className="grid md:grid-cols-2 gap-6">
        {/* Items */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <h3 className="font-bold text-sm text-gray-900">{t('items2')}</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {order.order_items?.map(item => (
                <div key={item.id} className="flex items-center gap-4 p-4">
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-gradient-to-br from-primary-50 to-secondary-50 flex-shrink-0">
                    {item.product_image ? (
                      <img src={item.product_image} alt={item.product_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-6 h-6 text-primary-200" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{item.product_name}</p>
                    {item.packaging && <p className="text-xs text-gray-400">{item.packaging}</p>}
                    <p className="text-xs text-gray-500 mt-1">
                      {item.quantity} × {Number(item.unit_price).toFixed(2)} {t('currency')}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-gray-900 whitespace-nowrap">
                    {Number(item.total).toFixed(2)} {t('currency')}
                  </p>
                </div>
              ))}
            </div>
            <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <span className="font-bold text-gray-900">{t('total')}</span>
              <span className="text-xl font-extrabold text-primary-600">{Number(order.subtotal).toFixed(2)} {t('currency')}</span>
            </div>
          </div>
        </div>

        {/* Customer info */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-5">
          <h3 className="font-bold text-sm text-gray-900 mb-3">{t('customerInfo')}</h3>
          <div className="space-y-2.5 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <User className="w-4 h-4 text-gray-400" />
              {order.customer_name}
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Phone className="w-4 h-4 text-gray-400" />
              {order.customer_phone}
            </div>
            {order.customer_email && (
              <div className="flex items-center gap-2 text-gray-600">
                <Mail className="w-4 h-4 text-gray-400" />
                {order.customer_email}
              </div>
            )}
          </div>
        </div>

        {/* Delivery info */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-5">
          <h3 className="font-bold text-sm text-gray-900 mb-3">{t('deliveryInfo')}</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p>{order.city}, {order.area}</p>
                <p className="text-gray-500">{order.address}</p>
              </div>
            </div>
            {order.delivery_notes && (
              <p className="text-xs text-gray-500 pt-2 border-t border-gray-50">{order.delivery_notes}</p>
            )}
            {order.order_notes && (
              <p className="text-xs text-gray-500 pt-2 border-t border-gray-50">{order.order_notes}</p>
            )}
          </div>
        </div>
      </div>

      {/* Cancel button */}
      {canCancel && (
        <div className="mt-6">
          <Button variant="danger" onClick={() => setCancelModal(true)}>
            <XCircle className="w-4 h-4" />
            {t('cancelOrder')}
          </Button>
        </div>
      )}

      {/* Cancel confirmation */}
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
