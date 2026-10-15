import { useState, useEffect } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/hooks/useData';
import { formatDate } from '@/lib/pricing';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Bell, CheckCheck, BellOff, Package, Eye, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';

// خريطة تحويل حالة الطلب لنص عربي مفهوم
const STATUS_LABELS_AR: Record<string, string> = {
  new: 'جديد',
  processing: 'قيد التجهيز',
  confirmed: 'في الطريق',
  delivered: 'تم التوصيل',
  cancelled: 'ملغي',
};

export function NotificationsPage() {
  const { t, lang } = useLanguage();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { notifications, loading: notifLoading, unreadCount, markAsRead, markAllAsRead } = useNotifications(user?.id);
  const [myOrders, setMyOrders] = useState<any[]>([]);

  // جلب طلبات المستخدم الحية لمطابقتها مع الإشعارات
  useEffect(() => {
    if (!user?.id) {
      setMyOrders([]);
      return;
    }
    (async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_id', user.id);

      if (!error && data) {
        setMyOrders(data);
      } else {
        setMyOrders([]);
      }
    })();
  }, [user?.id]);

  if (loading) return null;
  if (!user) return <Navigate to="/login?redirect=/notifications" replace />;

  // تحليل محتوى الإشعار واستخراج تفاصيل الطلب الحية
  const getNotificationDisplay = (notif: any) => {
    const orderIdMatch = notif.message?.match(/Order ID:\s*([a-zA-Z0-9-]+)/i);

    if (orderIdMatch) {
      const partialId = orderIdMatch[1];
      const matchedOrder = myOrders.find((o) => o.id === partialId || o.id?.startsWith(partialId));
      const statusMatch = notif.message.match(/Status:\s*([A-Za-z]+)/i);
      const statusRaw = statusMatch ? statusMatch[1].toLowerCase() : null;
      const statusLabel = statusRaw ? (STATUS_LABELS_AR[statusRaw] || statusMatch![1]) : null;

      if (matchedOrder) {
        const total = Number(matchedOrder.total_amount ?? matchedOrder.subtotal ?? matchedOrder.total ?? 0);
        return {
          title: lang === 'ar' ? 'تحديث حالة طلبك' : 'Your Order Update',
          message: lang === 'ar'
            ? `طلبك رقم ${matchedOrder.order_number} بقيمة ${total.toFixed(2)} ج.م${statusLabel ? ` — الحالة: ${statusLabel}` : ''}`
            : `Order ${matchedOrder.order_number}, ${total.toFixed(2)} EGP${statusLabel ? ` — Status: ${statusLabel}` : ''}`,
          orderId: matchedOrder.id as string,
        };
      }
    }

    return { title: notif.title, message: notif.message, orderId: null as string | null };
  };

  const handleCardClick = (n: any, display: ReturnType<typeof getNotificationDisplay>) => {
    const isReadStatus = n.read ?? (n as any).is_read ?? false;
    if (!isReadStatus) markAsRead(n.id);
    if (display.orderId) {
      navigate(`/orders/${display.orderId}`);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 overflow-x-hidden">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-gray-900">{t('notificationsTitle')}</h1>
          {unreadCount > 0 && (
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">{unreadCount} {t('unread')}</p>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllAsRead} className="self-start sm:self-auto text-xs sm:text-sm">
            <CheckCheck className="w-4 h-4" />
            <span>{t('markAllRead')}</span>
          </Button>
        )}
      </div>

      {notifLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-20 rounded-2xl" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={<BellOff className="w-10 h-10" />}
          title={t('noNotifications')}
          description={t('noNotificationsDesc')}
        />
      ) : (
        <div className="space-y-3">
          {notifications.map(n => {
            const isReadStatus = n.read ?? (n as any).is_read ?? false;
            const display = getNotificationDisplay(n);

            return (
              <div
                key={n.id}
                className={`w-full text-start flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border transition-all shadow-xs ${
                  !isReadStatus
                    ? 'bg-primary-50/50 border-primary-200'
                    : 'bg-white border-gray-100 hover:bg-gray-50/60'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                    display.orderId ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {display.orderId ? <Package className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className={`text-xs sm:text-sm truncate ${!isReadStatus ? 'font-extrabold text-gray-900' : 'font-bold text-gray-800'}`}>
                        {display.title}
                      </p>
                      {!isReadStatus && <span className="w-2.5 h-2.5 rounded-full bg-primary-500 flex-shrink-0 animate-pulse" />}
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600 mt-1 leading-relaxed break-words">
                      {display.message}
                    </p>
                    <p className="text-[10px] sm:text-xs text-gray-400 mt-2">
                      {formatDate(n.created_at, lang)}
                    </p>
                  </div>
                </div>

                {/* زر التفاصيل الحي */}
                {display.orderId && (
                  <div className="flex-shrink-0 self-end sm:self-center">
                    <button
                      onClick={() => handleCardClick(n, display)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                    >
                      <Eye className="w-4 h-4" />
                      <span>{lang === 'ar' ? 'عرض الطلب' : 'View Order'}</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default NotificationsPage;