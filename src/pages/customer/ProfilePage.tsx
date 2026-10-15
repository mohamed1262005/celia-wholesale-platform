import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase';
import { User, Package, DollarSign, Camera, Trash2, Save, Edit3, Shield } from 'lucide-react';

export function ProfilePage() {
  const { lang } = useLanguage();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  // حقول البيانات الفعلية للمستخدم الحالي
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('customer');
  const [createdAt, setCreatedAt] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  
  // إحصائيات حقيقية
  const [ordersCount, setOrdersCount] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [activeOrders, setActiveOrders] = useState(0);

  useEffect(() => {
    fetchProfileAndStats();
  }, []);

  const fetchProfileAndStats = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      setEmail(user.email || '');
      
      // جلب البروفيل الحقيقي من جدول profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profile) {
        setName(profile.full_name || '');
        setPhone(profile.phone || '');
        setRole(profile.role || 'customer');
        setCreatedAt(profile.created_at ? new Date(profile.created_at).toLocaleDateString('ar-EG') : '');
      }

      // جلب عدد الطلبات الحقيقي لهذا المستخدم
      const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id);

      if (orders) {
        setOrdersCount(orders.length);
        const active = orders.filter((o: any) => o.status !== 'delivered' && o.status !== 'cancelled').length;
        setActiveOrders(active);
        const spent = orders.reduce((acc: number, o: any) => acc + (Number(o.total_amount) || 0), 0);
        setTotalSpent(spent);
      }
    }
    setLoading(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const localUrl = URL.createObjectURL(file);
    setAvatarUrl(localUrl);
    showToast(lang === 'ar' ? 'تم تحديث صورة البروفايل' : 'Avatar updated', 'success');
  };

  const handleDeleteAvatar = () => {
    setAvatarUrl('');
    showToast(lang === 'ar' ? 'تم حذف صورة البروفايل' : 'Avatar removed', 'success');
  };

  const handleSaveProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: name, phone: phone })
      .eq('id', user.id);

    if (error) {
      showToast(error.message, 'error');
    } else {
      showToast(lang === 'ar' ? 'تم تحديث الملف الشخصي بنجاح' : 'Profile updated successfully', 'success');
      setIsEditing(false);
      fetchProfileAndStats();
    }
  };

  return (
    <div className="w-full px-4 sm:px-8 py-6 sm:py-8 pb-32 space-y-6" dir="rtl">
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-pink-50/70 via-purple-50/50 to-white rounded-3xl border border-pink-100/80 shadow-sm p-6 sm:p-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary-500/10 text-primary-600 flex items-center justify-center border border-primary-500/20">
              <User className="w-7 h-7" />
            </div>
            ملفي الشخصي
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-2">إدارة بيانات حسابك الشخصي، ومتابعة إحصائياتك بكل حيوية</p>
        </div>
      </div>

      {/* 2. Profile Main Card */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-card p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 transition-all duration-300 hover:shadow-xl">
        <div className="flex items-center gap-5 w-full md:w-auto">
          <div className="relative group flex-shrink-0">
            <div className="w-20 h-20 rounded-2xl bg-primary-500 text-white flex items-center justify-center font-extrabold text-2xl overflow-hidden shadow-md border-2 border-white">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                (name ? name.charAt(0) : 'م').toUpperCase()
              )}
            </div>
            <label className="absolute inset-0 bg-black/40 text-white rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <Camera className="w-6 h-6" />
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
          </div>

          <div className="space-y-1.5 min-w-0">
            <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 truncate">{name || 'مستخدم جديد'}</h2>
            <p className="text-xs text-gray-500 font-medium break-all">{email}</p>
            <div className="flex items-center gap-2 flex-wrap pt-1">
              {role === 'admin' ? (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-50 text-purple-600 rounded-xl text-[11px] font-bold">
                  <Shield className="w-3.5 h-3.5" /> مدير النظام (Admin)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-600 rounded-xl text-[11px] font-bold">
                  عميل (Customer)
                </span>
              )}
              {avatarUrl && (
                <button
                  onClick={handleDeleteAvatar}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 hover:bg-red-500 text-red-600 hover:text-white rounded-xl text-[11px] font-bold transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> حذف الصورة
                </button>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsEditing(!isEditing)}
          className="w-full md:w-auto px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl text-xs font-bold transition-all inline-flex items-center justify-center gap-2 cursor-pointer"
        >
          <Edit3 className="w-4 h-4" />
          <span>{isEditing ? 'إلغاء' : 'تعديل البيانات'}</span>
        </button>
      </div>

      {/* 3. Live Animated KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Card 1 */}
        <div className="group relative bg-white rounded-3xl border border-purple-100 shadow-card p-6 flex items-center justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-xl overflow-hidden">
          <div className="absolute top-0 start-0 w-1.5 h-full bg-purple-500 rounded-e-full opacity-70 group-hover:opacity-100 transition-opacity" />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
              <p className="text-xs font-bold text-gray-500">الطلبات</p>
            </div>
            <h3 className="text-2xl font-extrabold text-gray-900 mt-1">{ordersCount}</h3>
            <span className="text-xs text-purple-600 font-bold mt-1 inline-block">إجمالي الطلبات</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold transition-transform group-hover:scale-110 duration-300">
            <Package className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2 */}
        <div className="group relative bg-white rounded-3xl border border-emerald-100 shadow-card p-6 flex items-center justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-xl overflow-hidden">
          <div className="absolute top-0 start-0 w-1.5 h-full bg-emerald-500 rounded-e-full opacity-70 group-hover:opacity-100 transition-opacity" />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-xs font-bold text-gray-500">إجمالي الإنفاق</p>
            </div>
            <h3 className="text-2xl font-extrabold text-gray-900 mt-1">{totalSpent} جنيه</h3>
            <span className="text-xs text-emerald-600 font-bold mt-1 inline-block">حساب موثوق</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold transition-transform group-hover:scale-110 duration-300">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3 */}
        <div className="group relative bg-white rounded-3xl border border-amber-100 shadow-card p-6 flex items-center justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-xl overflow-hidden">
          <div className="absolute top-0 start-0 w-1.5 h-full bg-amber-500 rounded-e-full opacity-70 group-hover:opacity-100 transition-opacity" />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <p className="text-xs font-bold text-gray-500">طلبات نشطة</p>
            </div>
            <h3 className="text-2xl font-extrabold text-gray-900 mt-1">{activeOrders}</h3>
            <span className="text-xs text-amber-600 font-bold mt-1 inline-block">قيد التنفيذ</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold transition-transform group-hover:scale-110 duration-300">
            <Package className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 4. Account Information Form */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-card p-6 sm:p-8 space-y-6 transition-all duration-300 hover:shadow-xl">
        <h3 className="text-base font-extrabold text-gray-900">معلومات الحساب</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-2">الاسم الكامل</label>
            <input
              type="text"
              disabled={!isEditing}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-3.5 bg-gray-50 disabled:bg-gray-50/50 text-gray-900 border border-gray-200 rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-2">رقم الهاتف</label>
            <input
              type="text"
              disabled={!isEditing}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full p-3.5 bg-gray-50 disabled:bg-gray-50/50 text-gray-900 border border-gray-200 rounded-2xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
            />
          </div>
        </div>

        {isEditing && (
          <div className="flex justify-end pt-4 border-t border-gray-100">
            <button
              onClick={handleSaveProfile}
              className="w-full sm:w-auto px-7 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-xs font-bold shadow-md transition-all inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>حفظ التعديلات</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProfilePage;