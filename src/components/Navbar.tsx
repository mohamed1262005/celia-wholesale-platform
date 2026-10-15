import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useNotifications } from '@/hooks/useData';
import { Logo } from '@/components/Logo';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { ShoppingBag, Bell, User, LogOut, Menu, X, Search, Package, LayoutDashboard, CheckCheck, Check, MessageCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const STATUS_LABELS_AR: Record<string, string> = {
  new: 'طلب جديد',
  processing: 'قيد التجهيز',
  confirmed: 'في الطريق إليك',
  delivered: 'تم التوصيل بنجاح',
  cancelled: 'تم إلغاء الطلب',
};

const WHATSAPP_NUMBER = '201000359525';

export function Navbar() {
  const { t, lang } = useLanguage();
  const { user, profile, isAdmin } = useAuth();
  const { totalItems } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const { notifications, unreadCount, markAsRead } = useNotifications(user?.id);

  useEffect(() => {
    setMobileMenuOpen(false);
    setProfileOpen(false);
    setNotifOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchValue.trim())}`);
      setSearchValue('');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const getNotificationDisplay = (notif: any) => {
    const rawMsg = notif.message || '';
    const statusMatch = rawMsg.match(/Status:\s*([A-Za-z]+)/i);
    const statusRaw = statusMatch ? statusMatch[1].toLowerCase() : '';
    const arabicStatus = STATUS_LABELS_AR[statusRaw] || (lang === 'ar' ? 'تحديث جديد على الطلب' : 'Order Update');

    const orderIdMatch = rawMsg.match(/Order ID:\s*([a-zA-Z0-9-]+)/i);
    const extractedId = orderIdMatch ? orderIdMatch[1] : null;

    if (lang === 'ar') {
      return {
        title: 'تحديث حالة الطلب',
        message: `حالة طلبك الحالية: ${arabicStatus}`,
        orderId: extractedId,
      };
    }

    return {
      title: notif.title || 'Order Update',
      message: rawMsg,
      orderId: extractedId,
    };
  };

  const handleNotificationClick = async (n: any, orderId: string | null) => {
    const isReadStatus = n.read ?? (n as any).is_read ?? false;
    if (!isReadStatus && n.id) {
      markAsRead(n.id);
    }
    setNotifOpen(false);
    
    if (orderId) {
      navigate(`/orders/${orderId}`);
    } else {
      navigate('/notifications');
    }
  };

  const navLinks = [
    { to: '/', label: t('home') },
    { to: '/products', label: t('products') },
    { to: '/categories', label: t('categories') },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm w-full">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">
          
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="flex-shrink-0">
              <Logo />
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className={`px-3 py-2 text-sm font-semibold rounded-lg transition-colors ${
                  location.pathname === link.to
                    ? 'text-primary-600 bg-primary-50'
                    : 'text-gray-600 hover:text-primary-600 hover:bg-gray-50'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <form onSubmit={handleSearch} className="hidden sm:flex flex-1 max-w-xs mx-2">
            <div className="relative w-full">
              <Search className="absolute inset-y-0 start-0 ms-3 my-auto w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchValue}
                onChange={e => setSearchValue(e.target.value)}
                placeholder={t('search')}
                className="w-full ps-9 pe-3 py-1.5 text-xs sm:text-sm rounded-xl bg-gray-50 border border-gray-100 focus:bg-white focus:border-primary-300 focus:ring-2 focus:ring-primary-100 transition-all outline-none"
              />
            </div>
          </form>

          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            
            <LanguageSwitcher />

            {/* زر لوحة التحكم للشاشات الكبيرة فقط */}
            {isAdmin && (
              <Link
                to="/admin"
                className="hidden sm:inline-flex items-center justify-center px-3 py-1.5 text-xs font-semibold rounded-xl bg-primary-600 text-white hover:bg-primary-700 transition-colors whitespace-nowrap shadow-xs cursor-pointer"
                title={t('dashboard')}
              >
                <LayoutDashboard className="w-4 h-4 me-1.5" />
                <span>{t('dashboard')}</span>
              </Link>
            )}

            {/* زر واتساب للشاشات الكبيرة */}
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex p-2 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
              title={lang === 'ar' ? 'تواصل معنا عبر واتساب' : 'Contact us on WhatsApp'}
            >
              <MessageCircle className="w-5 h-5" />
            </a>

            {/* الإشعارات */}
            {user && (
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => setNotifOpen(!notifOpen)}
                  className="relative p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 end-1 w-4 h-4 rounded-full bg-primary-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="fixed inset-x-4 top-20 sm:absolute sm:inset-x-auto sm:end-0 sm:mt-2 w-auto sm:w-96 max-w-lg mx-auto bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-scale-in">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                      <h4 className="font-extrabold text-sm text-gray-900">{t('notifications')}</h4>
                      <Link to="/notifications" className="text-xs text-primary-600 font-bold hover:underline">
                        {t('viewAll')}
                      </Link>
                    </div>
                    <div className="max-h-[70vh] overflow-y-auto p-3 space-y-2.5">
                      {notifications.length === 0 ? (
                        <p className="px-4 py-8 text-center text-sm text-gray-400">{t('noNotifications')}</p>
                      ) : (
                        notifications.slice(0, 5).map(n => {
                          const isReadStatus = n.read ?? (n as any).is_read ?? false;
                          const display = getNotificationDisplay(n);
                          return (
                            <div
                              key={n.id}
                              className={`rounded-2xl border p-4 transition-all shadow-2xs ${
                                !isReadStatus ? 'bg-primary-50/60 border-primary-200' : 'bg-white border-gray-100'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-3 min-w-0">
                                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                                    display.orderId ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-500'
                                  }`}>
                                    {display.orderId ? <Package className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
                                  </div>
                                  <div className="min-w-0 space-y-1">
                                    <p className="text-xs sm:text-sm font-extrabold text-gray-900">{display.title}</p>
                                    <p className="text-xs sm:text-sm text-gray-700 leading-relaxed break-words">{display.message}</p>
                                  </div>
                                </div>
                                <span className="flex items-center text-[10px] font-bold text-gray-400 shrink-0 mt-1">
                                  {isReadStatus ? (
                                    <span className="inline-flex items-center text-emerald-600"><CheckCheck className="w-4 h-4" /></span>
                                  ) : (
                                    <span className="inline-flex items-center text-amber-500"><Check className="w-4 h-4" /></span>
                                  )}
                                </span>
                              </div>
                              <button
                                onClick={() => handleNotificationClick(n, display.orderId)}
                                className="w-full mt-3 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
                              >
                                {lang === 'ar' ? 'عرض تفاصيل الطلب' : 'View Order Details'}
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            <Link
              to="/cart"
              className="relative p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <ShoppingBag className="w-5 h-5" />
              {totalItems > 0 && (
                <span className="absolute top-1 end-1 w-4 h-4 rounded-full bg-secondary-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {totalItems > 9 ? '9+' : totalItems}
                </span>
              )}
            </Link>

            {user ? (
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-1 p-1 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {profile?.full_name?.[0]?.toUpperCase() || 'U'}
                  </div>
                </button>

                {profileOpen && (
                  <div className="absolute end-0 mt-2 w-56 bg-white rounded-2xl shadow-float border border-gray-100 overflow-hidden z-50 animate-slide-down">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-bold text-gray-900 truncate">{profile?.full_name}</p>
                      <p className="text-xs text-gray-400 truncate">{profile?.email}</p>
                    </div>
                    <div className="py-1">
                      <Link to="/profile" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                        <User className="w-4 h-4 text-gray-400" />
                        {t('profile')}
                      </Link>
                      <Link to="/orders" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                        <Package className="w-4 h-4 text-gray-400" />
                        {t('myOrders')}
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-error-600 hover:bg-error-50 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        {t('logout')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-xl bg-primary-600 text-white hover:bg-primary-700 transition-colors whitespace-nowrap cursor-pointer"
              >
                {t('login')}
              </Link>
            )}
          </div>
        </div>

        <div className="sm:hidden pb-3 pt-1">
          <form onSubmit={handleSearch}>
            <div className="relative w-full">
              <Search className="absolute inset-y-0 start-0 ms-3 my-auto w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchValue}
                onChange={e => setSearchValue(e.target.value)}
                placeholder={t('search')}
                className="w-full ps-9 pe-3 py-2 text-xs rounded-xl bg-gray-50 border border-gray-100 focus:bg-white focus:border-primary-300 focus:ring-2 focus:ring-primary-100 transition-all outline-none"
              />
            </div>
          </form>
        </div>
      </div>

      {/* قائمة الموبايل المنسدلة (تحتوي على روابط التنقل، لوحة التحكم للمشرف، وزر واتساب لمنع التكدس) */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full start-0 w-full bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-xl z-50 px-4 py-3 space-y-1.5 animate-slide-down">
          {navLinks.map(link => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-3.5 py-2 text-xs font-bold rounded-xl transition-all ${
                location.pathname === link.to
                  ? 'text-primary-600 bg-primary-50 shadow-xs'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {link.label}
            </Link>
          ))}

          {/* لوحة التحكم داخل القائمة للمشرف */}
          {isAdmin && (
            <Link
              to="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold rounded-xl bg-primary-600 text-white hover:bg-primary-700 transition-all shadow-xs mt-2"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>{t('dashboard')}</span>
            </Link>
          )}

          {/* زر واتساب داخل القائمة لمنع التكدس في الشريط العلوي للموبايل */}
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-all shadow-xs"
          >
            <MessageCircle className="w-4 h-4 text-emerald-600" />
            <span>{lang === 'ar' ? 'تواصل عبر واتساب' : 'WhatsApp Support'}</span>
          </a>
        </div>
      )}
    </header>
  );
}

export default Navbar;