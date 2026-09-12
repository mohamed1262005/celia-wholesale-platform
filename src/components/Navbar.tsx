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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const { notifications, unreadCount, markAsRead } = useNotifications(user?.id);

  useEffect(() => {
    setMobileOpen(false);
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
      setSearchOpen(false);
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
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Logo */}
            <div className="flex-shrink-0">
              <Logo />
            </div>

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-1">
              {navLinks.map(link => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
                    location.pathname === link.to
                      ? 'text-primary-600 bg-primary-50'
                      : 'text-gray-600 hover:text-primary-600 hover:bg-gray-50'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Search bar - desktop */}
            <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-xs">
              <div className="relative w-full">
                <Search className="absolute inset-y-0 start-0 ms-3 my-auto w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchValue}
                  onChange={e => setSearchValue(e.target.value)}
                  placeholder={t('search')}
                  className="w-full ps-9 pe-3 py-2 text-sm rounded-xl bg-gray-50 border border-gray-100 focus:bg-white focus:border-primary-300 focus:ring-2 focus:ring-primary-100 transition-all outline-none"
                />
              </div>
            </form>

            {/* Right actions */}
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Mobile search toggle */}
              <button
                onClick={() => setSearchOpen(!searchOpen)}
                className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <Search className="w-5 h-5" />
              </button>

              <LanguageSwitcher />

              {/* Notifications */}
              {user && (
                <div className="relative" ref={notifRef}>
                  <button
                    onClick={async () => {
                      const nextState = !notifOpen;
                      setNotifOpen(nextState);
                      
                      // تحديث الإشعارات تلقائياً في قاعدة البيانات عند فتح القائمة عبر وظيفة الـ RPC
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
                    <div className="absolute end-0 mt-2 w-80 bg-white rounded-2xl shadow-float border border-gray-100 overflow-hidden animate-slide-down z-50">
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
                            // التحقق مما إذا كان الإشعار قد تم قراءته (يدعم حقل read أو is_read من الداتا بيز)
                            const isReadStatus = n.read ?? (n as any).is_read ?? false;

                            return (
                              <button
                                key={n.id}
                                onClick={() => { if (!isReadStatus) markAsRead(n.id); navigate('/notifications'); }}
                                className={`w-full text-start px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors relative ${!isReadStatus ? 'bg-primary-50/30' : ''}`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <p className="text-sm font-semibold text-gray-900">{n.title}</p>
                                  {/* مؤشر مرئي يوضح للأدمن أو المستخدم ما إذا تم قراءة الإشعار أم لا */}
                                  <span className="flex items-center text-[10px] font-bold text-gray-400 shrink-0 mt-0.5" title={isReadStatus ? 'تمت القراءة' : 'غير مقروء'}>
                                    {isReadStatus ? (
                                      <span className="inline-flex items-center text-emerald-600 gap-0.5">
                                        <CheckCheck className="w-3.5 h-3.5" /> مقروء
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center text-amber-500 gap-0.5">
                                        <Check className="w-3.5 h-3.5" /> جديد
                                      </span>
                                    )}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Admin dashboard link - يظهر للأدمن فقط */}
              {isAdmin && (
                <Link
                  to="/admin"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-xl bg-primary-600 text-white hover:bg-primary-700 transition-colors"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  {t('dashboard')}
                </Link>
              )}

              {/* Cart */}
              <Link
                to="/cart"
                className="relative p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <ShoppingBag className="w-5 h-5" />
                {totalItems > 0 && (
                  <span className="absolute top-1 end-1 w-4 h-4 rounded-full bg-secondary-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {totalItems > 9 ? '9+' : totalItems}
                  </span>
                )}
              </Link>

              {/* Profile / Auth */}
              {user ? (
                <div className="relative" ref={profileRef}>
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    className="flex items-center gap-2 p-1.5 pe-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xs font-bold">
                      {profile?.full_name?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <span className="hidden sm:block text-sm font-medium text-gray-700 max-w-[100px] truncate">
                      {profile?.full_name?.split(' ')[0]}
                    </span>
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
                        {isAdmin && (
                          <Link to="/admin" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-primary-600 font-semibold hover:bg-primary-50 transition-colors">
                            <LayoutDashboard className="w-4 h-4" />
                            {t('dashboard')}
                          </Link>
                        )}
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
                  className="hidden sm:inline-flex items-center px-4 py-2 text-sm font-semibold rounded-xl bg-primary-600 text-white hover:bg-primary-700 transition-colors"
                >
                  {t('login')}
                </Link>
              )}

              {/* Mobile menu toggle */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Mobile search */}
          {searchOpen && (
            <form onSubmit={handleSearch} className="md:hidden pb-3 animate-slide-down">
              <div className="relative">
                <Search className="absolute inset-y-0 start-0 ms-3 my-auto w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchValue}
                  onChange={e => setSearchValue(e.target.value)}
                  placeholder={t('search')}
                  className="w-full ps-9 pe-3 py-2.5 text-sm rounded-xl bg-gray-50 border border-gray-100 focus:bg-white focus:border-primary-300 outline-none"
                  autoFocus
                />
              </div>
            </form>
          )}
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <nav className="lg:hidden border-t border-gray-100 bg-white animate-slide-down">
            <div className="px-4 py-3 space-y-1">
              {navLinks.map(link => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`block px-4 py-2.5 text-sm font-semibold rounded-lg transition-colors ${
                    location.pathname === link.to
                      ? 'text-primary-600 bg-primary-50'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              {user ? (
                <>
                  <Link to="/orders" className="block px-4 py-2.5 text-sm font-semibold rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
                    {t('myOrders')}
                  </Link>
                  <Link to="/profile" className="block px-4 py-2.5 text-sm font-semibold rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
                    {t('profile')}
                  </Link>
                  {isAdmin && (
                    <Link to="/admin" className="block px-4 py-2.5 text-sm font-semibold rounded-lg text-primary-600 bg-primary-50">
                      {t('dashboard')}
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="block w-full text-start px-4 py-2.5 text-sm font-semibold rounded-lg text-error-600 hover:bg-error-50 transition-colors"
                  >
                    {t('logout')}
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  className="block px-4 py-2.5 text-sm font-semibold rounded-lg bg-primary-600 text-white text-center"
                >
                  {t('login')}
                </Link>
              )}
            </div>
          </nav>
        )}
      </header>
    </>
  );
}

export default Navbar;