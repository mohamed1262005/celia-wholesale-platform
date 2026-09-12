import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase';
import { Bell, Send, CheckCircle, AlertCircle, Trash2, Layers } from 'lucide-react';

export function AdminNotificationsPage() {
  const { t, lang } = useLanguage();
  const { showToast } = useToast();

  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // all, system, customer

  // حالة نموذج إرسال إشعار جديد
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      // لو الجدول مش موجود أو حصل خطأ، نعرض مصفوفة فارغة مؤقتاً
      setNotifications([]);
    } else {
      setNotifications(data || []);
    }
    setLoading(false);
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) {
      showToast(lang === 'ar' ? 'يرجى إدخال عنوان ورسالة الإشعار' : 'Please enter title and message', 'error');
      return;
    }

    setSending(true);
    const { error } = await supabase.from('notifications').insert([
      { title, message, type: 'admin_broadcast', created_at: new Date() }
    ]);

    if (error) {
      showToast(error.message, 'error');
    } else {
      showToast(lang === 'ar' ? 'تم إرسال الإشعار بنجاح' : 'Notification sent successfully', 'success');
      setTitle('');
      setMessage('');
      setShowModal(false);
      fetchNotifications();
    }
    setSending(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('notifications').delete().eq('id', id);
    if (error) {
      showToast(error.message, 'error');
    } else {
      showToast(lang === 'ar' ? 'تم حذف الإشعار' : 'Notification deleted', 'success');
      setNotifications(notifications.filter(n => n.id !== id));
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'system') return n.type === 'system';
    if (activeTab === 'customer') return n.type === 'customer';
    return true;
  });

  const totalCount = notifications.length;

  return (
    <div className="w-full px-8 py-8 pb-32 space-y-6">
      {/* 1. Header with Gradient Background */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-pink-50/70 via-purple-50/50 to-white rounded-3xl border border-pink-100/80 shadow-sm p-8 transition-all duration-300 hover:scale-[1.01]">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary-500/10 text-primary-600 flex items-center justify-center border border-primary-500/20">
              <Bell className="w-7 h-7" />
            </div>
            {lang === 'ar' ? 'إدارة الإشعارات' : 'Notifications Management'}
          </h1>
          <p className="text-sm text-gray-600 mt-2">إرسال التنبيهات، متابعة الإشعارات الفورية للعملاء والنظام بكل حيوية</p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-6 py-3 bg-gradient-to-r from-primary-500 to-pink-600 hover:from-primary-600 hover:to-pink-700 text-white rounded-2xl text-sm font-bold transition-all duration-200 hover:scale-[1.03] active:scale-[0.98] shadow-md shadow-primary-500/25 inline-flex items-center gap-2 cursor-pointer"
        >
          <Send className="w-4 h-4" />
          <span>{lang === 'ar' ? 'إرسال إشعار جديد' : 'Send Notification'}</span>
        </button>
      </div>

      {/* 2. Mini KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-3xl border border-purple-100 shadow-card p-6 flex items-center justify-between transition-all duration-300 hover:scale-[1.02]">
          <div>
            <p className="text-xs font-bold text-gray-500">إجمالي الإشعارات</p>
            <h3 className="text-2xl font-extrabold text-gray-900 mt-1">{totalCount}</h3>
            <span className="text-xs text-purple-600 font-bold mt-1 inline-block">الرسائل المرسلة</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-emerald-100 shadow-card p-6 flex items-center justify-between transition-all duration-300 hover:scale-[1.02]">
          <div>
            <p className="text-xs font-bold text-gray-500">حالة نظام البث</p>
            <h3 className="text-xl font-extrabold text-gray-900 mt-1">نشط وفوري</h3>
            <span className="text-xs text-emerald-600 font-bold mt-1 inline-block">جاهز للإرسال</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 3. Filter Tabs */}
      <div className="flex items-center gap-2 bg-white rounded-3xl border border-gray-100 shadow-card p-4">
        {[
          { key: 'all', label: 'كل الإشعارات' },
          { key: 'system', label: 'النظام' },
          { key: 'customer', label: 'العملاء' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all duration-200 hover:scale-[1.02] cursor-pointer ${
              activeTab === tab.key
                ? 'bg-primary-500 text-white shadow-md shadow-primary-500/20'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 4. Notifications List / Empty State */}
      {loading ? (
        <div className="text-center py-20 text-gray-400 text-sm">{t('loading')}</div>
      ) : filteredNotifications.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-3xl border border-gray-100 shadow-card space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-primary-50 text-primary-500 flex items-center justify-center mx-auto">
            <Bell className="w-8 h-8" />
          </div>
          <div>
            <p className="text-base font-extrabold text-gray-800">لا توجد إشعارات مسجلة بعد</p>
            <p className="text-xs text-gray-400 mt-1">ابدأ بإرسال إشعار جديد لعملائك أو تابعهم بكل سهولة</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-500 text-white rounded-2xl text-xs font-bold shadow-md hover:bg-primary-600 transition-all cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>إرسال أول إشعار</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredNotifications.map((notif) => (
            <div
              key={notif.id}
              className="bg-white rounded-3xl border border-gray-100 shadow-card p-6 flex items-center justify-between transition-all duration-300 hover:scale-[1.01] hover:shadow-lg"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center font-extrabold">
                  <Bell className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-gray-900 text-sm">{notif.title}</h3>
                  <p className="text-xs text-gray-500 mt-1">{notif.message}</p>
                </div>
              </div>
              <button
                onClick={() => handleDelete(notif.id)}
                className="p-3 bg-red-50 hover:bg-red-500 text-red-600 hover:text-white rounded-2xl transition-all cursor-pointer shadow-2xs"
                title="حذف الإشعار"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal إرسال إشعار جديد */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl max-w-lg w-full p-8 space-y-6 animate-scale-in">
            <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
              <Send className="w-5 h-5 text-primary-500" />
              <span>إرسال إشعار جديد</span>
            </h2>

            <form onSubmit={handleSendNotification} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">عنوان الإشعار</label>
                <input
                  type="text"
                  placeholder="مثال: خصم خاص 20% على جميع المنتجات!"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-3.5 bg-white text-gray-900 border border-gray-200 rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">محتوى الرسالة</label>
                <textarea
                  rows={4}
                  placeholder="اكتب تفاصيل الإشعار هنا..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full p-3.5 bg-white text-gray-900 border border-gray-200 rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl text-xs font-bold transition-all cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="px-6 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-2xl text-xs font-bold shadow-md transition-all cursor-pointer inline-flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>{sending ? 'جاري الإرسال...' : 'إرسال الآن'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminNotificationsPage;