import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useOrders } from '@/hooks/useData';
import { StatusBadge } from '@/components/StatusBadge';
import { formatDate } from '@/lib/pricing';
import { EmptyState } from '@/components/ui/EmptyState';
import { Package, ChevronRight } from 'lucide-react';
import { Navigate } from 'react-router-dom';

export function MyOrdersPage() {
  const { t, lang } = useLanguage();
  const { user, loading } = useAuth();
  const { orders, loading: ordersLoading } = useOrders(user?.id);

  if (loading) return null;
  if (!user) return <Navigate to="/login?redirect=/orders" replace />;

  if (orders.length === 0 && !ordersLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <h1 className="text-2xl lg:text-3xl font-extrabold text-gray-900 mb-6">{t('myOrdersTitle')}</h1>
        <EmptyState
          icon={<Package className="w-10 h-10" />}
          title={t('noOrders')}
          description={t('noOrdersDesc')}
          actionLabel={t('continueShopping')}
          actionTo="/products"
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
      <h1 className="text-2xl lg:text-3xl font-extrabold text-gray-900 mb-6">{t('myOrdersTitle')}</h1>

      {ordersLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-24 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => {
            // التعامل الآمن مع إجمالي السعر بغض النظر عن اسم الحقل في الداتا بيس
            const orderTotal = Number(order.total_amount ?? order.subtotal ?? order.total ?? 0);
            const itemsCount = order.total_quantity ?? order.order_items?.length ?? 1;

            return (
              <Link
                key={order.id}
                to={`/orders/${order.id}`}
                className="block bg-white rounded-2xl border border-gray-100 shadow-card hover:shadow-card-hover transition-all p-4 group"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-sm text-gray-900">{order.order_number}</p>
                      <StatusBadge status={order.status} />
                    </div>
                    <p className="text-xs text-gray-500">{formatDate(order.created_at, lang)}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {itemsCount} {t('items')}
                    </p>
                  </div>
                  <div className="text-end flex-shrink-0">
                    <p className="text-lg font-extrabold text-primary-600">
                      {orderTotal.toFixed(2)} <span className="text-xs font-bold">{t('currency')}</span>
                    </p>
                    <ChevronRight className="w-4 h-4 text-gray-400 ms-auto mt-1 group-hover:text-primary-600 rtl:rotate-180 transition-colors" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default MyOrdersPage;