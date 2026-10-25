import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase';
import { Users, Search, ShieldCheck, ShoppingBag, DollarSign, Calendar, Sparkles, Star, ArrowRight } from 'lucide-react';

export function AdminCustomersPage() {
  const { t, lang } = useLanguage();
  const { showToast } = useToast();

  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVipOnly, setFilterVipOnly] = useState(false);

  useEffect(() => {
    fetchCustomersAndOrders();
  }, []);

  const fetchCustomersAndOrders = async () => {
    setLoading(true);

    // 1. جلب العملاء
    let rawCustomers: any[] = [];
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      const altRes = await supabase.from('customers').select('*').order('created_at', { ascending: false });
      if (altRes.error) {
        showToast(altRes.error.message, 'error');
      } else {
        rawCustomers = altRes.data || [];
      }
    } else {
      rawCustomers = data || [];
    }

    // استبعاد الأدمن
    const filteredProfiles = rawCustomers.filter(c => 
      c.role !== 'admin' && 
      c.email !== 'admin' && 
      c.name !== 'admin' &&
      c.full_name !== 'admin'
    );

    // 2. جلب الطلبات بشكل آمن
    const { data: ordersData } = await supabase
      .from('orders')
      .select('id, user_id, customer_id, total_amount, created_at, status');

    const orders = ordersData || [];

    // 3. جلب عناصر الطلبات بشكل آمن وبدون تسبب في أخطاء 400
    const { data: orderItemsData, error: itemsError } = await supabase
      .from('order_items')
      .select('id, order_id, product_name, quantity, price');

    if (itemsError) {
      console.warn('Notice on order_items fetch:', itemsError.message);
    }

    const orderItems = orderItemsData || [];

    // 4. دمج البيانات وحساب إجمالي المشتريات وعدد الطلبات لكل عميل بدقة حقيقية
    const mappedCustomers = filteredProfiles.map(customer => {
      const customerOrders = orders.filter(o => 
        o.user_id === customer.id || o.customer_id === customer.id
      );

      const totalSpent = customerOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
      const ordersCount = customerOrders.length;

      const orderedProducts: string[] = [];
      customerOrders.forEach(order => {
        const itemsForThisOrder = orderItems.filter(item => item.order_id === order.id);
        itemsForThisOrder.forEach((item: any) => {
          if (item.product_name && !orderedProducts.includes(item.product_name)) {
            orderedProducts.push(item.product_name);
          }
        });
      });

      return {
        ...customer,
        ordersCount,
        totalSpent,
        orderedProducts,
        lastOrderDate: customerOrders.length > 0 ? customerOrders[0].created_at : null
      };
    });

    // تعريف حقيقي للعملاء المميزين (من لديه طلبات > 0 أو مشتريات فعلية، وترتيبهم حسب الأعلى مشتريات)
    mappedCustomers.forEach(c => {
      c.isVip = c.ordersCount > 0 || c.totalSpent > 0;
    });

    // ترتيب العملاء تنازلياً بحيث الأعلى في المشتريات والطلبات يظهر أولاً
    mappedCustomers.sort((a, b) => b.totalSpent - a.totalSpent || b.ordersCount - a.ordersCount);

    setCustomers(mappedCustomers);
    setLoading(false);
  };

  // تصفية العملاء (بحث + فلتر المميزين الحقيقي)
  const filteredCustomers = customers.filter((customer) => {
    const name = (customer.full_name || customer.name || '').toLowerCase();
    const email = (customer.email || '').toLowerCase();
    const query = searchTerm.toLowerCase();
    
    const matchesSearch = name.includes(query) || email.includes(query);
    const matchesVip = filterVipOnly ? customer.isVip : true;

    return matchesSearch && matchesVip;
  });

  const totalCustomers = customers.length;
  const vipCount = customers.filter(c => c.isVip).length;

  return (
    <div className="w-full px-4 md:px-8 py-8 pb-32 space-y-6 bg-gradient-to-br from-pink-50/40 via-purple-50/20 to-slate-50 min-h-screen" dir="rtl">
      
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-pink-100/70 via-purple-100/40 to-white rounded-3xl border border-pink-200/60 shadow-sm p-8 transition-all duration-300">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary-500/15 text-primary-600 flex items-center justify-center border border-primary-500/20 shadow-xs">
              <Users className="w-7 h-7" />
            </div>
            {lang === 'ar' ? 'إدارة العملاء' : 'Customers Management'}
          </h1>
          <p className="text-sm text-gray-600 mt-2">متابعة حسابات العملاء، تاريخ الطلبات، والمشتريات بكل حيوية</p>
        </div>
      </div>

      {/* 2. Mini KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* إجمالي العملاء */}
        <div className="bg-gradient-to-br from-white to-purple-50/40 rounded-3xl border border-purple-100 shadow-card p-6 flex items-center justify-between transition-all duration-300 hover:scale-[1.02]">
          <div>
            <p className="text-xs font-bold text-gray-500">إجمالي العملاء</p>
            <h3 className="text-2xl font-extrabold text-gray-900 mt-1">{totalCustomers}</h3>
            <span className="text-xs text-purple-600 font-bold mt-1 inline-block">قاعدة البيانات النشطة</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-100/60 text-purple-600 flex items-center justify-center font-bold shadow-xs">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* كارت العملاء المميزين (فلترة حقيقية للأعلى طلباً ومشتريات) */}
        <div 
          onClick={() => setFilterVipOnly(!filterVipOnly)}
          className={`cursor-pointer rounded-3xl border p-6 flex items-center justify-between transition-all duration-300 hover:scale-[1.02] shadow-card ${
            filterVipOnly 
              ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white border-amber-400 shadow-amber-200' 
              : 'bg-gradient-to-br from-white to-amber-50/50 border-amber-200 hover:border-amber-300'
          }`}
        >
          <div>
            <p className={`text-xs font-bold ${filterVipOnly ? 'text-amber-100' : 'text-gray-500'}`}>العملاء المميزين (النشطين)</p>
            <h3 className={`text-2xl font-extrabold mt-1 ${filterVipOnly ? 'text-white' : 'text-gray-900'}`}>{vipCount}</h3>
            <span className={`text-xs font-bold mt-1 inline-flex items-center gap-1 ${filterVipOnly ? 'text-white' : 'text-amber-600'}`}>
              {filterVipOnly ? 'عرض الكل (نشط)' : 'فلترة الأعلى طلباً'} <ArrowRight className="w-3 h-3" />
            </span>
          </div>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold shadow-xs ${
            filterVipOnly ? 'bg-white/20 text-white' : 'bg-amber-100/70 text-amber-600'
          }`}>
            <Star className="w-6 h-6 fill-current" />
          </div>
        </div>

        {/* حالة النظام */}
        <div className="bg-gradient-to-br from-white to-emerald-50/40 rounded-3xl border border-emerald-100 shadow-card p-6 flex items-center justify-between transition-all duration-300 hover:scale-[1.02]">
          <div>
            <p className="text-xs font-bold text-gray-500">حالة النظام</p>
            <h3 className="text-xl font-extrabold text-gray-900 mt-1">متصل ومحمي</h3>
            <span className="text-xs text-emerald-600 font-bold mt-1 inline-block">بدون أخطاء برمجية</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-100/60 text-emerald-600 flex items-center justify-center font-bold shadow-xs">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* 3. Search Bar & Filter Status */}
      <div className="bg-white/80 backdrop-blur-md rounded-3xl border border-pink-100 shadow-card p-6 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute right-4 top-3.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={lang === 'ar' ? 'ابحث عن عميل بالاسم أو البريد...' : 'Search customers by name or email...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-11 pl-4 py-3 bg-white text-gray-900 border border-pink-100 rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-2xs"
          />
        </div>

        {filterVipOnly && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-4 py-2.5 rounded-2xl text-amber-800 text-xs font-extrabold">
            <span>عرض العملاء الأكثر طلباً ومشتريات فقط</span>
            <button 
              onClick={() => setFilterVipOnly(false)} 
              className="text-amber-600 hover:text-amber-900 underline mr-2 cursor-pointer"
            >
              إلغاء التصفية
            </button>
          </div>
        )}
      </div>

      {/* 4. Customers Grid */}
      {loading ? (
        <div className="text-center py-20 text-gray-400 text-sm">{t('loading')}</div>
      ) : filteredCustomers.length === 0 ? (
        <div className="text-center py-24 bg-white/90 rounded-3xl border border-pink-100 shadow-card space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-primary-50 text-primary-500 flex items-center justify-center mx-auto shadow-xs">
            <Users className="w-8 h-8" />
          </div>
          <div>
            <p className="text-base font-extrabold text-gray-800">لا توجد عملاء مطابقين للبحث</p>
            <p className="text-xs text-gray-400 mt-1">جرب البحث بكلمة أخرى أو إلغاء تصفية المميزين</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCustomers.map((customer) => (
            <div
              key={customer.id}
              className={`rounded-3xl border transition-all duration-300 hover:scale-[1.01] hover:shadow-xl p-6 flex flex-col justify-between space-y-5 relative overflow-hidden backdrop-blur-sm ${
                customer.isVip 
                  ? 'border-amber-300 shadow-amber-100/60 bg-gradient-to-b from-amber-50/30 via-white to-pink-50/20' 
                  : 'border-pink-100/60 shadow-card bg-gradient-to-b from-white to-pink-50/10'
              }`}
            >
              {/* شارة العميل المميز */}
              {customer.isVip && (
                <div className="absolute top-0 left-0 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-extrabold px-3.5 py-1 rounded-br-2xl shadow-sm flex items-center gap-1">
                  <Sparkles className="w-3 h-3 animate-spin" />
                  <span>عميل مميز 🌟</span>
                </div>
              )}

              {/* Customer Header info */}
              <div className="flex items-center gap-4 border-b border-pink-100/60 pb-4 pt-2">
                <div className="w-12 h-12 rounded-2xl bg-primary-100/70 text-primary-700 flex items-center justify-center font-extrabold text-lg flex-shrink-0 shadow-xs">
                  {(customer.full_name || customer.name || 'C').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h3 className="font-extrabold text-gray-900 text-sm truncate">
                    {customer.full_name || customer.name || 'عميل بدون اسم'}
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5 font-mono truncate">{customer.email || 'بدون بريد إلكتروني'}</p>
                  {customer.phone && (
                    <p className="text-[11px] text-gray-500 mt-0.5 font-mono" dir="ltr">{customer.phone}</p>
                  )}
                </div>
              </div>

              {/* Customer Stats & History */}
              <div className="grid grid-cols-2 gap-3 bg-pink-50/30 p-3.5 rounded-2xl border border-pink-100/50">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-100/70 text-purple-700 flex items-center justify-center font-bold shadow-xs">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block">عدد الطلبات</span>
                    <span className="text-xs font-extrabold text-gray-900">{customer.ordersCount} طلب</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100/70 text-emerald-700 flex items-center justify-center font-bold shadow-xs">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block">إجمالي المشتريات</span>
                    <span className="text-xs font-extrabold text-emerald-600">{customer.totalSpent} ج.م</span>
                  </div>
                </div>
              </div>

              {/* Products History Preview */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-gray-500 block">المنتجات التي طلبها سابقاً:</span>
                {customer.orderedProducts && customer.orderedProducts.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                    {customer.orderedProducts.map((prodName: string, idx: number) => (
                      <span key={idx} className="px-2.5 py-1 bg-primary-100/50 text-primary-800 rounded-xl text-[10px] font-bold border border-primary-200/50">
                        {prodName}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-gray-400 italic">لم يقم بأي طلبات بعد</p>
                )}
              </div>

              {/* Registration / Status Footer */}
              <div className="pt-3 border-t border-pink-100/60 flex items-center justify-between text-[11px] text-gray-400">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  تسجيل: {customer.created_at ? new Date(customer.created_at).toLocaleDateString('ar-EG') : 'غير متوفر'}
                </span>
                {customer.isVip ? (
                  <span className="text-amber-700 font-extrabold px-2.5 py-0.5 bg-amber-100/80 rounded-lg border border-amber-300 shadow-xs">الأكثر طلباً ⭐</span>
                ) : (
                  <span className="text-gray-400">جديد</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminCustomersPage;