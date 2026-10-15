import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { Bell, CheckCircle, AlertTriangle, Sparkles, Menu, Trash2, Eye } from 'lucide-react';

export function AdminLayout() {
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [ordersMap, setOrdersMap] = useState<Record<string, { customerName: string; total: number }>>({});
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    fetchInitialData();

    const channel = supabase
      .channel('admin_notifications_fast_sync')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'admin_notifications' },
        (payload) => {
          setNotifications((prev) => [payload.new, ...prev]);
          setUnreadCount((prev) => prev + 1);
          fetchSingleOrderFromNotification(payload.new.message);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchInitialData = async () => {
    const [notifsRes, ordersRes] = await Promise.all([
      supabase.from('admin_notifications').select('*').order('created_at', { ascending: false }).limit(15),
      supabase.from('orders').select('order_number, customer_name, total_amount, phone').limit(50)
    ]);

    if (!notifsRes.error && notifsRes.data) {
      setNotifications(notifsRes.data);
      setUnreadCount(notifsRes.data.filter((n) => !n.is_read).length);
    }

    if (!ordersRes.error && ordersRes.data) {
      const map: Record<string, { customerName: string; total: number }> = {};
      ordersRes.data.forEach((o) => {
        if (o.order_number) {
          map[o.order_number] = {
            customerName: o.customer_name || o.phone || (lang === 'ar' ? 'عميل' : 'Customer'),
            total: Number(o.total_amount ?? 0),
          };
        }
      });
      setOrdersMap(map);
    }
  };

  const fetchSingleOrderFromNotification = async (message: string) => {
    const match = message?.match(/CEL-\d+/i);
    if (!match) return;
    const orderNum = match[0];
    
    if (ordersMap[orderNum]) return;

    const { data } = await supabase
      .from('orders')
      .select('order_number, customer_name, total_amount, phone')
      .eq('order_number', orderNum)
      .single();

    if (data) {
      setOrdersMap((prev) => ({
        ...prev,
        [data.order_number]: {
          customerName: data.customer_name || data.phone || (lang === 'ar' ? 'عميل' : 'Customer'),
          total: Number(data.total_amount ?? 0),
        }
      }));
    }
  };

  const markAsRead = async (id: string) => {
    setNotifications((prev) => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount((prev) => Math.max(0, prev - 1));
    await supabase.from('admin_notifications').update({ is_read: true }).eq('id', id);
  };

  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
    await supabase.from('admin_notifications').update({ is_read: true }).eq('is_read', false);
  };

  const deleteNotification = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const wasUnread = notifications.find((n) => n.id === id && !n.is_read);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (wasUnread) setUnreadCount((prev) => Math.max(0, prev - 1));
    await supabase.from('admin_notifications').delete().eq('id', id);
  };

  const getNotificationDisplay = (notif: any) => {
    const match = notif.message?.match(/CEL-\d+/i);
    const orderNumber = match ? match[0] : null;
    const orderData = orderNumber ? ordersMap[orderNumber] : null;

    if (orderData) {
      return {
        customerName: orderData.customerName,
        details: lang === 'ar' ? `طلب (${orderNumber}) — ${orderData.total.toFixed(2)} ج.م` : `Order (${orderNumber}) — ${orderData.total.toFixed(2)} EGP`,
        orderNumber,
      };
    }

    return {
      customerName: lang === 'ar' ? 'إشعار نظام جديد' : 'System Notification',
      details: notif.message,
      orderNumber,
    };
  };

  const handleNotificationClick = (notif: any, orderNumber: string | null) => {
    if (!notif.is_read) markAsRead(notif.id);
    setShowNotifications(false);
    if (orderNumber) {
      navigate(`/admin/orders?order=${orderNumber}`);
    } else {
      navigate('/admin/orders');
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 via-slate-50/50 to-primary-50/20 overflow-hidden relative">
      <div className="hidden md:block h-full">
        <AdminSidebar />
      </div>

      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <div className="relative w-64 h-full bg-white shadow-2xl z-10 flex flex-col">
            <AdminSidebar onClose={() => setIsMobileSidebarOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-4 sm:px-6 py-3.5 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="md:hidden p-2 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              aria-label="Open Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-primary-500/10 to-secondary-500/10 border border-primary-500/20">
              <Sparkles className="w-4 h-4 text-primary-600" />
              <span className="text-xs font-bold text-primary-700">
                {lang === 'ar' ? 'نظام الإدارة الذكي' : 'AI Management System'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 ms-auto">
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl text-gray-600 transition-all duration-200 flex items-center justify-center border border-gray-200/60 shadow-2xs"
              >
                <Bell className="w-5 h-5 text-gray-700" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-red-500 to-rose-600 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-md">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="fixed sm:absolute left-1/2 sm:left-auto sm:right-0 -translate-x-1/2 sm:translate-x-0 top-20 sm:top-auto sm:mt-3 w-[92vw] sm:w-96 max-w-sm bg-white/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50">
                  <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-gray-50 to-primary-50/30">
                    <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                      <Bell className="w-4 h-4 text-primary-600" />
                      {lang === 'ar' ? 'الإشعارات والتنبيهات' : 'Notifications'}
                    </h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-xs text-primary-600 hover:text-primary-700 hover:underline font-semibold cursor-pointer"
                      >
                        {lang === 'ar' ? 'تحديد الكل كمقروء' : 'Mark all as read'}
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto p-2.5 space-y-2 text-right">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-gray-400 text-sm">
                        {lang === 'ar' ? 'لا توجد إشعارات حالياً' : 'No notifications'}
                      </div>
                    ) : (
                      notifications.map((n) => {
                        const display = getNotificationDisplay(n);
                        return (
                          <div
                            key={n.id}
                            className={`p-3 rounded-xl border transition-all duration-200 shadow-2xs ${
                              !n.is_read 
                                ? 'bg-gradient-to-r from-primary-50/85 to-white border-primary-200 font-medium' 
                                : 'bg-white border-gray-100'
                            }`}
                          >
                            <div className="flex items-start gap-2.5">
                              {n.type === 'low_stock' ? (
                                <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 flex-shrink-0 mt-0.5">
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                </div>
                              ) : (
                                <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 flex-shrink-0 mt-0.5">
                                  <CheckCircle className="w-3.5 h-3.5" />
                                </div>
                              )}
                              
                              <div className="flex-1 min-w-0" dir="rtl">
                                <p className="font-bold text-xs text-gray-900 text-right truncate">
                                  {display.customerName}
                                </p>
                                
                                <p className="text-[11px] text-gray-600 mt-0.5 leading-tight font-mono text-right" dir="ltr">
                                  <span dir="rtl" className="inline-block">{display.details}</span>
                                </p>
                                
                                <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-gray-100">
                                  <span className="text-[9px] text-gray-400 font-mono">
                                    {new Date(n.created_at).toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>

                                  {display.orderNumber && (
                                    <button
                                      onClick={() => handleNotificationClick(n, display.orderNumber)}
                                      className="px-2.5 py-1 bg-primary-500 hover:bg-primary-600 text-white text-[10px] font-bold rounded-md transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                                    >
                                      <Eye className="w-3 h-3" />
                                      <span>{lang === 'ar' ? 'التفاصيل' : 'Details'}</span>
                                    </button>
                                  )}
                                </div>
                              </div>

                              <button
                                onClick={(e) => deleteNotification(e, n.id)}
                                className="p-1 rounded-md text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0 cursor-pointer"
                                title={lang === 'ar' ? 'حذف' : 'Delete'}
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            <LanguageSwitcher />
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;