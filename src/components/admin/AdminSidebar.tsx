import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Logo } from '@/components/Logo';
import { supabase } from '@/lib/supabase';
import {
  LayoutDashboard, Package, FolderTree, Boxes, Tag, Users,
  BarChart3, Bell, ShoppingCart, LogOut, Layers, X
} from 'lucide-react';

interface AdminSidebarProps {
  onClose?: () => void;
}

export function AdminSidebar({ onClose }: AdminSidebarProps) {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

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

  return (
    <div className="flex flex-col h-full w-64 bg-white border-e border-gray-100 shadow-lg md:shadow-none">
      <div className="px-5 py-5 border-b border-gray-100 flex items-center justify-between">
        <div>
          <Logo size="md" />
          <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-50 text-primary-600 text-xs font-semibold">
            <Layers className="w-3 h-3" />
            {t('dashboard')}
          </div>
        </div>
        {/* زر إغلاق يظهر على الموبايل فقط لو فيه دالة onClose */}
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {links.map(link => {
          const active = isActive(link.to);
          return (
            <Link
              key={link.to}
              to={link.to}
              onClick={onClose}
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
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          {t('logout')}
        </button>
      </div>
    </div>
  );
}

export default AdminSidebar;