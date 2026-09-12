import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Logo } from '@/components/Logo';
import { supabase } from '@/lib/supabase';
import {
  LayoutDashboard, Package, FolderTree, Boxes, Tag, Users,
  BarChart3, Bell, ShoppingCart, LogOut, Menu, X, Layers, QrCode
} from 'lucide-react';
import { useState } from 'react';

export function AdminSidebar() {
  const { t, lang } = useLanguage();
  const { profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const links = [
    { to: '/admin', label: t('adminDashboard'), icon: LayoutDashboard },
    { to: '/admin/orders', label: t('manageOrders'), icon: ShoppingCart },
    { to: '/admin/products', label: t('manageProducts'), icon: Package },
    { to: '/admin/categories', label: t('manageCategories'), icon: FolderTree },
    { to: '/admin/inventory', label: t('inventory'), icon: Boxes },
    { to: '/admin/pricing', label: t('managePricing'), icon: Tag },
    { to: '/admin/customers', label: t('manageCustomers'), icon: Users },
    { to: '/admin/reports', label: t('reports'), icon: BarChart3 },
    { to: '/admin/notifications', label: t('notifications'), icon: Bell },
  ];

  const isActive = (to: string) => {
    if (to === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(to);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5 border-b border-gray-100">
        <Logo size="md" />
        <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-50 text-primary-600 text-xs font-semibold">
          <Layers className="w-3 h-3" />
          {t('dashboard')}
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {links.map(link => {
          const active = isActive(link.to);
          return (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                active
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <link.icon className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{link.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-gray-100">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-sm font-bold">
            {profile?.full_name?.[0]?.toUpperCase() || 'A'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">{profile?.full_name || 'Admin'}</p>
            <p className="text-xs text-gray-400 truncate">{profile?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-error-600 hover:bg-error-50 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          {t('logout')}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 start-4 z-30 p-2 rounded-lg bg-white shadow-md border border-gray-100"
      >
        <Menu className="w-5 h-5 text-gray-700" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-gray-900/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-shrink-0 bg-white border-e border-gray-100 h-screen sticky top-0">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar */}
      <aside className={`lg:hidden fixed inset-y-0 start-0 w-64 bg-white shadow-float z-50 transition-transform ${mobileOpen ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full'}`}>
        <button onClick={() => setMobileOpen(false)} className="absolute top-4 end-4 z-10 p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
          <X className="w-5 h-5" />
        </button>
        {sidebarContent}
      </aside>
    </>
  );
}
