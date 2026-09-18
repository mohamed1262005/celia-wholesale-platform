import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { Bell, CheckCircle, AlertTriangle, Sparkles, Menu, X } from 'lucide-react';

export function AdminLayout() {
  const { lang } = useLanguage();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // جلب الإشعارات وتفعيل الاستماع اللحظي Realtime
  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel('admin_notifications_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'admin_notifications' },
        (payload) => {
          setNotifications((prev) => [payload.new, ...prev]);
          setUnreadCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchNotifications = async () => {
    const { data, error } = await supabase
      .from('admin_notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error && data) {
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.is_read).length);
    }
  };

  const markAsRead = async (id: string) => {
    await supabase
      .from('admin_notifications')
      .update({ is_read: true })
      .eq('id', id);

    setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(Math.max(0, unreadCount - 1));
  };

  const markAllAsRead = async () => {
    await supabase
      .from('admin_notifications')
      .update({ is_read: true })
      .eq('is_read', false);

    setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 via-slate-50/50 to-primary-50/20 overflow-hidden relative">
      
      {/* Sidebar للشاشات الكبيرة (لاب وتبرت) */}
      <div className="hidden md:block h-full">
        <AdminSidebar />
      </div>

      {/* Sidebar للموبايل (Drawer منبثق مع خلفية مظلمة) */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* خلفية شفافة تغطي الشاشة عند الفتح */}
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          {/* محتوى السايدبار */}
          <div className="relative w-64 h-full bg-white shadow-2xl z-10 flex flex-col">
            <AdminSidebar onClose={() => setIsMobileSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* حاوية المحتوى الرئيسي */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Header بتأثير زجاجي العصري Glassmorphism */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-4 sm:px-6 py-3.5 flex items-center justify-between shadow-xs">
          
          <div className="flex items-center gap-3">
            {/* زر القائمة للموبايل */}
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="md:hidden p-2 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              aria-label="Open Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* لمسة AI ذكية تعطي الطابع الاحترافي لوحة التحكم */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-primary-500/10 to-secondary-500/10 border border-primary-500/20">
              <Sparkles className="w-4 h-4 text-primary-600 animate-spin-slow" />
              <span className="text-xs font-bold text-primary-700">
                {lang === 'ar' ? 'نظام الإدارة الذكي (AI Powered)' : 'AI Management System'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 ms-auto">
            {/* جرس الإشعارات */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl text-gray-600 transition-all duration-200 flex items-center justify-center border border-gray-200/60 shadow-2xs hover:scale-105"
              >
                <Bell className="w-5 h-5 text-gray-700" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-red-500 to-rose-600 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-md animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* القائمة المنسدلة للإشعارات — تتمركز على الشاشة في الموبايل بدلاً من الطلوع بره الحدود */}
              {showNotifications && (
                <div className="fixed sm:absolute left-1/2 sm:left-auto sm:right-0 -translate-x-1/2 sm:translate-x-0 top-20 sm:top-auto sm:mt-3 w-[92vw] sm:w-96 max-w-sm bg-white/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                  <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-gray-50 to-primary-50/30">
                    <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                      <Bell className="w-4 h-4 text-primary-600" />
                      {lang === 'ar' ? 'الإشعارات والتنبيهات' : 'Notifications'}
                    </h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-xs text-primary-600 hover:text-primary-700 hover:underline font-semibold transition-colors"
                      >
                        {lang === 'ar' ? 'تحديد الكل كمقروء' : 'Mark all as read'}
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-gray-50 text-right">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-gray-400 text-sm">
                        {lang === 'ar' ? 'لا توجد إشعارات حالياً' : 'No notifications'}
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => markAsRead(n.id)}
                          className={`p-4 transition-all duration-200 cursor-pointer hover:bg-primary-50/40 ${
                            !n.is_read ? 'bg-primary-50/60 font-medium' : 'bg-white'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {n.type === 'low_stock' ? (
                              <div className="p-2 rounded-xl bg-amber-50 text-amber-600 flex-shrink-0">
                                <AlertTriangle className="w-4 h-4" />
                              </div>
                            ) : (
                              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 flex-shrink-0">
                                <CheckCircle className="w-4 h-4" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-xs text-gray-900">{n.title}</p>
                              <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{n.message}</p>
                              <span className="text-[10px] text-gray-400 mt-1 block font-mono">
                                {new Date(n.created_at).toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <LanguageSwitcher />
          </div>
        </header>

        {/* مساحة المحتوى الأساسي */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;