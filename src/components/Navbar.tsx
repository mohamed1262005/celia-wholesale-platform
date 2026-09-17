import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useNotifications } from '@/hooks/useData';
import { Logo } from '@/components/Logo';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { ShoppingBag, Bell, User, LogOut, Menu, X, Search, Package, LayoutDashboard, CheckCheck, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export function Navbar() {
  const { t } = useLanguage();
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

  const navLinks = [
    { to: '/', label: t('home') },
    { to: '/products', label: t('products') },
    { to: '/categories', label: t('categories') },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm w-full">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">
          
          {/* الجانب الأيسر: زر القائمة للموبايل + اللوجو */}
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

          {/* روابط التنقل للشاشات الكبيرة فقط */}
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

          {/* شريط البحث */}
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

          {/* أزرار الإجراءات اليمنى */}
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <LanguageSwitcher />

            {/* زر لوحة التحكم (يظهر للآدمن) */}
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

            {/* الإشعارات */}
            {user && (
              <div className="relative" ref={notifRef}>
                <button
                  onClick={async () => {
                    const nextState = !notifOpen;
                    setNotifOpen(nextState);
                    if (nextState && unreadCount > 0) {
                      await supabase.rpc('mark_user_notifications_as_read', { p_user_id: user.id });
                      notifications.forEach(n => { n.read = true; });
                    }
                  }}
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
                  <div className="absolute end-0 mt-2 w-72 sm:w-80 bg-white rounded-2xl shadow-float border border-gray-100 overflow-hidden animate-slide-down z-50">
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                      <h4 className="font-bold text-sm text-gray-900">{t('notifications')}</h4>
                      <Link to="/notifications" className="text-xs text-primary-600 font-semibold hover:underline">
                        {t('viewAll')}
                      </Link>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <p className="px-4 py-8 text-center text-sm text-gray-400">{t('noNotifications')}</p>
                      ) : (
                        notifications.slice(0, 5).map(n => {
                          const isReadStatus = n.read ?? (n as any).is_read ?? false;
                          return (
                            <button
                              key={n.id}
                              onClick={() => { if (!isReadStatus) markAsRead(n.id); navigate('/notifications'); }}
                              className={`w-full text-start px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors relative ${!isReadStatus ? 'bg-primary-50/30' : ''}`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-semibold text-gray-900 break-words">{n.title}</p>
                                <span className="flex items-center text-[10px] font-bold text-gray-400 shrink-0 mt-0.5">
                                  {isReadStatus ? (
                                    <span className="inline-flex items-center text-emerald-600 gap-0.5"><CheckCheck className="w-3.5 h-3.5" /> مقروء</span>
                                  ) : (
                                    <span className="inline-flex items-center text-amber-500 gap-0.5"><Check className="w-3.5 h-3.5" /> جديد</span>
                                  )}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 mt-1 whitespace-pre-wrap break-words">{n.message}</p>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* السلة */}
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

            {/* البروفايل أو تسجيل الدخول */}
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
                  <div className="absolute end-0 mt-2 w-56 bg-white rounded-2xl shadow-float border border-gray-100 overflow-hidden animate-slide-down z-50">
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

        {/* شريط البحث الصغير للهواتف */}
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

      {/* قائمة الموبايل المنسدلة المرتبة والصغيرة */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full start-0 w-full bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-xl animate-slide-down z-50 px-4 py-3 space-y-1.5">
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

          {/* زر لوحة التحكم للموبايل لو الآدمن مسجل دخول */}
          {isAdmin && (
            <Link
              to="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl bg-primary-600 text-white hover:bg-primary-700 transition-all shadow-xs mt-1"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>{t('dashboard')}</span>
            </Link>
          )}
        </div>
      )}
    </header>
  );
}

export default Navbar;