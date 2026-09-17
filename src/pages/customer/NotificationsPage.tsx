import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/hooks/useData';
import { formatDate } from '@/lib/pricing';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Navigate } from 'react-router-dom';
import { Bell, CheckCheck, BellOff } from 'lucide-react';

export function NotificationsPage() {
  const { t, lang } = useLanguage();
  const { user, loading } = useAuth();
  const { notifications, loading: notifLoading, unreadCount, markAsRead, markAllAsRead } = useNotifications(user?.id);

  if (loading) return null;
  if (!user) return <Navigate to="/login?redirect=/notifications" replace />;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 overflow-x-hidden">
      {/* Header section with responsive layout */}
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
        <div className="space-y-2.5">
          {notifications.map(n => (
            <button
              key={n.id}
              onClick={() => { if (!n.read) markAsRead(n.id); }}
              className={`w-full text-start flex items-start gap-3 p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer ${
                !n.read
                  ? 'bg-primary-50/40 border-primary-100 hover:border-primary-200'
                  : 'bg-white border-gray-100 hover:bg-gray-50'
              }`}
            >
              <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                !n.read ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-400'
              }`}>
                <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-xs sm:text-sm truncate ${!n.read ? 'font-bold text-gray-900' : 'font-semibold text-gray-700'}`}>
                    {n.title}
                  </p>
                  {!n.read && <span className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0" />}
                </div>
                <p className="text-xs sm:text-sm text-gray-500 mt-0.5 break-words line-clamp-2">{n.message}</p>
                <p className="text-[10px] sm:text-xs text-gray-400 mt-1.5">{formatDate(n.created_at, lang)}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default NotificationsPage;