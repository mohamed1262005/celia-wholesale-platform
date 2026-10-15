import { useEffect, useState } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase';
import { Bell, Send, CheckCircle, Trash2, Layers, ShoppingCart, Eye, User, Calendar } from 'lucide-react';

const STATUS_LABELS_AR: Record<string, string> = {
  new: 'جديد',
  processing: 'قيد التجهيز',
  confirmed: 'مؤكد',
  delivered: 'تم التوصيل',
  cancelled: 'ملغي',
};

export function AdminNotificationsPage() {
  const { showToast } = useToast();

  const [notifications, setNotifications] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const [selectedNotif, setSelectedNotif] = useState<any | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);

    const [notifRes, ordersRes, profilesRes] = await Promise.all([
      supabase.from('notifications').select('*').order('created_at', { ascending: false }),
      supabase.from('orders').select('*'),
      supabase.from('profiles').select('*'),
    ]);

    setNotifications(notifRes.error ? [] : (notifRes.data || []));
    setOrders(ordersRes.error ? [] : (ordersRes.data || []));
    setProfiles(profilesRes.error ? [] : (profilesRes.data || []));

    setLoading(false);
  };

  const getNotificationDisplay = (notif: any) => {
    let matchedOrder = null;
    let matchedProfile = null;

    if (notif.message) {
      matchedOrder = orders.find(o => 
        notif.message.includes(o.id) || 
        notif.message.includes(o.order_number) ||
        (o.id && notif.message.toLowerCase().includes(o.id.toLowerCase()))
      );
    }

    if (!matchedProfile && notif.user_id) {
      matchedProfile = profiles.find(p => p.id === notif.user_id);
    }

    if (matchedOrder && !matchedProfile && matchedOrder.user_id) {
      matchedProfile = profiles.find(p => p.id === matchedOrder.user_id);
    }

    const customerName = matchedProfile?.full_name || matchedProfile?.name || matchedOrder?.customer_name || 'عميل المتجر';
    const customerPhone = matchedProfile?.phone || matchedOrder?.customer_phone || 'غير متوفر';

    const statusMatch = notif.message?.match(/Status:\s*([A-Za-z]+)/i);
    const statusRaw = statusMatch ? statusMatch[1].toLowerCase() : (matchedOrder ? matchedOrder.status : null);
    const statusLabel = statusRaw ? (STATUS_LABELS_AR[statusRaw] || statusRaw) : 'جديد';

    let displayTitle = notif.title || 'إشعار جديد';
    let displayMessage = notif.message;

    // تعريب عناوين النظام الإنجليزية بالكامل
    if (displayTitle.toLowerCase().includes('order status') || displayTitle.toLowerCase().includes('update')) {
      displayTitle = 'تحديث حالة الطلب';
    }

    if (matchedOrder) {
      displayTitle = `طلب رقم #${matchedOrder.order_number || 'عام'}`;
      displayMessage = `حالة الطلب الحالية: ${statusLabel} — تم استلام الطلب من العميل بنجاح.`;
    }

    return {
      title: displayTitle,
      message: displayMessage,
      isOrderRelated: Boolean(matchedOrder),
      orderData: matchedOrder,
      customerName,
      customerPhone,
    };
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // التحقق المباشر من الحقول قبل الإرسال لمنع ظهور خطأ التنبيه الأحمر
    if (!title.trim() || !message.trim()) {
      showToast('يرجى كتابة عنوان ورسالة الإشعار أولاً', 'error');
      return;
    }

    setSending(true);
    const { error } = await supabase.from('notifications').insert([
      { 
        title: title.trim(), 
        message: message.trim(), 
        type: 'customer', 
        user_id: null,
        created_at: new Date() 
      }
    ]);

    if (error) {
      showToast(error.message, 'error');
    } else {
      showToast('تم إرسال الإشعار للعملاء بنجاح', 'success');
      setTitle('');
      setMessage('');
      setShowModal(false);
      fetchAll();
    }
    setSending(false);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const { error } = await supabase.from('notifications').delete().eq('id', id);
    if (error) {
      showToast(error.message, 'error');
    } else {
      showToast('تم حذف الإشعار', 'success');
      setNotifications(notifications.filter(n => n.id !== id));
    }
  };

  const openDetails = (notif: any) => {
    const display = getNotificationDisplay(notif);
    setSelectedNotif({ ...notif, displayData: display });
    setShowDetailModal(true);
  };

  return (
    <div className="w-full px-3 sm:px-8 py-6 sm:py-8 pb-32 space-y-6 max-w-7xl mx-auto" dir="rtl">
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-pink-50/70 via-purple-50/50 to-white rounded-3xl border border-pink-100/80 shadow-sm p-4 sm:p-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 flex items-center gap-2 sm:gap-3">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-2xl bg-primary-500/10 text-primary-600 flex items-center justify-center border border-primary-500/20 flex-shrink-0">
              <Bell className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <span>إدارة الإشعارات</span>
          </h1>
          <p className="text-xs text-gray-600 mt-1">متابعة إشعارات العملاء والطلبات والأنشطة بكل وضوح وحيوية</p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="w-full md:w-auto px-5 py-2.5 bg-gradient-to-r from-primary-500 to-pink-600 hover:from-primary-600 hover:to-pink-700 text-white rounded-2xl text-xs font-bold transition-all shadow-md inline-flex items-center justify-center gap-2 cursor-pointer"
        >
          <Send className="w-4 h-4" />
          <span>إرسال إشعار للعملاء</span>
        </button>
      </div>

      {/* 2. KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-3xl border border-purple-100 shadow-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-500">إجمالي الإشعارات</p>
            <h3 className="text-xl font-extrabold text-gray-900 mt-1">{notifications.length}</h3>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-emerald-100 shadow-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-500">حالة نظام البث</p>
            <h3 className="text-xl font-extrabold text-gray-900 mt-1">نشط ومحدث دائماً</h3>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. List */}
      {loading ? (
        <div className="text-center py-16 text-gray-400 text-xs font-bold">جاري تحميل البيانات...</div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 shadow-card space-y-3">
          <Bell className="w-8 h-8 text-primary-400 mx-auto" />
          <p className="text-xs font-bold text-gray-800">لا توجد إشعارات مسجلة حالياً</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {notifications.map((notif) => {
            const display = getNotificationDisplay(notif);
            return (
              <div
                key={notif.id}
                onClick={() => openDetails(notif)}
                className="group relative bg-white rounded-3xl border border-pink-100/60 shadow-card p-4 flex flex-col justify-between transition-all hover:shadow-lg hover:border-primary-300 cursor-pointer"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-extrabold flex-shrink-0 ${
                        display.isOrderRelated ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-primary-50 text-primary-600 border border-primary-100'
                      }`}>
                        {display.isOrderRelated ? <ShoppingCart className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-600 border border-purple-100 truncate max-w-[160px]">
                        {display.customerName}
                      </span>
                    </div>

                    <button
                      onClick={(e) => handleDelete(notif.id, e)}
                      className="p-1.5 bg-red-50 hover:bg-red-500 text-red-600 hover:text-white rounded-lg transition-all cursor-pointer"
                      title="حذف"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-extrabold text-gray-900 text-xs group-hover:text-primary-600">
                      {display.title}
                    </h3>
                    <p className="text-[11px] text-gray-500 line-clamp-2 break-words">
                      {display.message}
                    </p>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-gray-50 flex items-center justify-between text-[10px] text-gray-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(notif.created_at).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="font-bold text-primary-600 inline-flex items-center gap-1">
                    التفاصيل الكاملة <Eye className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Details Modal */}
      {showDetailModal && selectedNotif && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h2 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary-500" />
                <span>تفاصيل الإشعار والطلب</span>
              </h2>
              <button onClick={() => setShowDetailModal(false)} className="w-7 h-7 rounded-full bg-gray-100 font-bold text-xs cursor-pointer">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-gray-50 p-3 rounded-2xl space-y-1">
                <p className="text-gray-400 text-[10px] font-bold">العنوان:</p>
                <p className="font-extrabold text-gray-900">{selectedNotif.displayData.title}</p>
              </div>

              <div className="bg-gray-50 p-3 rounded-2xl space-y-1">
                <p className="text-gray-400 text-[10px] font-bold">محتوى الإشعار:</p>
                <p className="text-gray-700 whitespace-pre-wrap">{selectedNotif.displayData.message}</p>
              </div>

              <div className="bg-primary-50/50 p-3 rounded-2xl space-y-2 border border-primary-100">
                <h4 className="font-extrabold text-primary-700 flex items-center gap-1.5 text-xs">
                  <User className="w-3.5 h-3.5" />
                  <span>بيانات العميل والطلب الحقيقية:</span>
                </h4>
                <div className="space-y-1 text-[11px] text-gray-700 pt-1">
                  <div><span className="font-bold text-gray-500">اسم العميل:</span> {selectedNotif.displayData.customerName}</div>
                  <div><span className="font-bold text-gray-500">رقم الهاتف:</span> {selectedNotif.displayData.customerPhone}</div>
                  {selectedNotif.displayData.orderData && (
                    <>
                      <div><span className="font-bold text-gray-500">رقم الطلب:</span> #{selectedNotif.displayData.orderData.order_number}</div>
                      <div><span className="font-bold text-gray-500">حالة الطلب:</span> {STATUS_LABELS_AR[selectedNotif.displayData.orderData.status] || selectedNotif.displayData.orderData.status}</div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-gray-100">
              <button onClick={() => setShowDetailModal(false)} className="px-5 py-2 bg-primary-500 text-white rounded-xl text-xs font-bold cursor-pointer">
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-5 space-y-4">
            <h2 className="text-sm font-extrabold text-gray-900">إرسال إشعار جديد للعملاء</h2>
            <form onSubmit={handleSendNotification} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">عنوان الإشعار</label>
                <input
                  type="text"
                  placeholder="مثال: خصم خاص على المنتجات"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-3 border rounded-xl text-xs font-bold bg-gray-50 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">محتوى الرسالة</label>
                <textarea
                  rows={3}
                  placeholder="اكتب نص الإشعار هنا بالتفصيل..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full p-3 border rounded-xl text-xs font-bold bg-gray-50 focus:bg-white resize-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 bg-gray-100 rounded-xl text-xs font-bold cursor-pointer">إلغاء</button>
                <button type="submit" disabled={sending} className="px-5 py-2 bg-primary-500 text-white rounded-xl text-xs font-bold cursor-pointer">إرسال</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminNotificationsPage;