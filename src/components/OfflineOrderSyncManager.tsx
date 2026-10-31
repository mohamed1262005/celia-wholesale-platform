import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/contexts/ToastContext';
import { isNetworkFailure, syncPendingOfflineOrders } from '@/lib/offlineOrders';

export function OfflineOrderSyncManager() {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const { showToast } = useToast();

  useEffect(() => {
    if (!user?.id) return;

    const sync = async () => {
      if (!navigator.onLine) return;
      try {
        const synchronized = await syncPendingOfflineOrders(user.id);
        if (synchronized > 0) {
          showToast(
            lang === 'ar'
              ? `تم إرسال ${synchronized} طلب محفوظ بنجاح`
              : `${synchronized} saved order${synchronized === 1 ? '' : 's'} synced successfully`,
            'success',
          );
        }
      } catch (error) {
        if (!isNetworkFailure(error)) {
          showToast(
            error instanceof Error ? error.message : (lang === 'ar' ? 'تعذر مزامنة الطلب' : 'Could not sync the saved order'),
            'error',
          );
        }
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void sync();
    };

    window.addEventListener('online', sync);
    document.addEventListener('visibilitychange', onVisibilityChange);
    void sync();

    return () => {
      window.removeEventListener('online', sync);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [user?.id, lang, showToast]);

  return null;
}
