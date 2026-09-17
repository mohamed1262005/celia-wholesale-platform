import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { CartProvider } from '@/contexts/CartContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { ToastContainer } from '@/components/ui/ToastContainer';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { AdminRoute } from '@/components/admin/AdminRoute';
import { AdminLayout } from '@/components/admin/AdminLayout';

// Customer pages
import { HomePage } from '@/pages/customer/HomePage';
import { ProductsPage } from '@/pages/customer/ProductsPage';
import { ProductDetailPage } from '@/pages/customer/ProductDetailPage';
import { CategoriesPage } from '@/pages/customer/CategoriesPage';
import { CartPage } from '@/pages/customer/CartPage';
import { CheckoutPage } from '@/pages/customer/CheckoutPage';
import { ConfirmationPage } from '@/pages/customer/ConfirmationPage';
import { MyOrdersPage } from '@/pages/customer/MyOrdersPage';
import { OrderDetailPage } from '@/pages/customer/OrderDetailPage';
import { NotificationsPage } from '@/pages/customer/NotificationsPage';
import { ProfilePage } from '@/pages/customer/ProfilePage';
import { LoginPage } from '@/pages/customer/LoginPage';
import { RegisterPage } from '@/pages/customer/RegisterPage';
import { ForgotPasswordPage } from '@/pages/customer/ForgotPasswordPage';

// Admin pages
import { DashboardPage } from '@/pages/admin/DashboardPage';
import { AdminOrdersPage } from '@/pages/admin/AdminOrdersPage';
import { AdminProductsPage } from '@/pages/admin/AdminProductsPage';
import AdminProductFormPage from '@/pages/admin/AdminProductFormPage';
import { AdminCategoriesPage } from '@/pages/admin/AdminCategoriesPage';
import AdminCategoryFormPage from '@/pages/admin/AdminCategoryFormPage';
import { AdminInventoryPage } from '@/pages/admin/AdminInventoryPage';
import { AdminPricingPage } from '@/pages/admin/AdminPricingPage';
import { AdminCustomersPage } from '@/pages/admin/AdminCustomersPage';
import { AdminReportsPage } from '@/pages/admin/AdminReportsPage';
import { AdminNotificationsPage } from '@/pages/admin/AdminNotificationsPage';

function ScrollToTop() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant' // إرجاع الصفحة لأعلى فوراً وبدون تأخير
    });
  }, [pathname, search]);
  return null;
}

// حماية مسارات العملاء: لو مش مسجل هيروح لصفحة الـ login تلقائياً
function ProtectedCustomerRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">جاري التحميل...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      {/* Auth routes (no navbar/footer & accessible to guests) */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      {/* Protected Customer routes (Requires login) */}
      <Route path="/" element={<ProtectedCustomerRoute><HomePage /></ProtectedCustomerRoute>} />
      <Route path="/products" element={<ProtectedCustomerRoute><ProductsPage /></ProtectedCustomerRoute>} />
      <Route path="/products/:id" element={<ProtectedCustomerRoute><ProductDetailPage /></ProtectedCustomerRoute>} />
      <Route path="/categories" element={<ProtectedCustomerRoute><CategoriesPage /></ProtectedCustomerRoute>} />
      <Route path="/cart" element={<ProtectedCustomerRoute><CartPage /></ProtectedCustomerRoute>} />
      <Route path="/checkout" element={<ProtectedCustomerRoute><CheckoutPage /></ProtectedCustomerRoute>} />
      <Route path="/confirmation/:id" element={<ProtectedCustomerRoute><ConfirmationPage /></ProtectedCustomerRoute>} />
      <Route path="/orders" element={<ProtectedCustomerRoute><MyOrdersPage /></ProtectedCustomerRoute>} />
      <Route path="/orders/:id" element={<ProtectedCustomerRoute><OrderDetailPage /></ProtectedCustomerRoute>} />
      <Route path="/notifications" element={<ProtectedCustomerRoute><NotificationsPage /></ProtectedCustomerRoute>} />
      <Route path="/profile" element={<ProtectedCustomerRoute><ProfilePage /></ProtectedCustomerRoute>} />

      {/* Admin routes */}
      <Route path="/admin" element={
        <AdminRoute><AdminLayout /></AdminRoute>
      }>
        <Route index element={<DashboardPage />} />
        <Route path="orders" element={<AdminOrdersPage />} />
        <Route path="products" element={<AdminProductsPage />} />
        <Route path="products/new" element={<AdminProductFormPage />} />
        <Route path="products/:id/edit" element={<AdminProductFormPage />} />
        <Route path="categories" element={<AdminCategoriesPage />} />
        <Route path="categories/new" element={<AdminCategoryFormPage />} />
        <Route path="categories/:id/edit" element={<AdminCategoryFormPage />} />
        <Route path="inventory" element={<AdminInventoryPage />} />
        <Route path="pricing" element={<AdminPricingPage />} />
        <Route path="customers" element={<AdminCustomersPage />} />
        <Route path="reports" element={<AdminReportsPage />} />
        <Route path="notifications" element={<AdminNotificationsPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<ProtectedCustomerRoute><HomePage /></ProtectedCustomerRoute>} />
    </Routes>
  );
}

function App() {
  return (
    <LanguageProvider>
      <ToastProvider>
        <AuthProvider>
          <CartProvider>
            <BrowserRouter>
              <ScrollToTop />
              <AppRoutes />
              <ToastContainer />
            </BrowserRouter>
          </CartProvider>
        </AuthProvider>
      </ToastProvider>
    </LanguageProvider>
  );
}

export default App;