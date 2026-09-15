import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase';
import { Plus, Search, Edit, Trash2, FolderTree, Layers, CheckCircle, Coffee, Cookie, Utensils, Sparkles, Package } from 'lucide-react';

export function AdminCategoriesPage() {
  const { t, lang } = useLanguage();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    const { data: cats, error } = await supabase
      .from('categories')
      .select('*')
      .order('name_ar', { ascending: true });

    if (error) {
      showToast(error.message, 'error');
      setLoading(false);
      return;
    }

    // جلب عدد المنتجات لكل تصنيف
    const categoriesWithCount = await Promise.all(
      (cats || []).map(async (cat) => {
        const { count, error: countErr } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('category_id', cat.id);

        return {
          ...cat,
          product_count: countErr ? 0 : (count || 0),
        };
      })
    );

    setCategories(categoriesWithCount);
    setLoading(false);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();

    const targetCat = categories.find((c) => c.id === id);
    if (targetCat && targetCat.product_count > 0) {
      showToast(
        lang === 'ar'
          ? `لا يمكن حذف هذا التصنيف لأنه مرتبط بـ ${targetCat.product_count} منتج. قم بنقل أو حذف هذه المنتجات أولاً`
          : `Cannot delete: ${targetCat.product_count} product(s) are linked to this category. Move or delete them first`,
        'error'
      );
      return;
    }

    if (!window.confirm(lang === 'ar' ? 'هل أنت متأكد من حذف هذا التصنيف؟' : 'Are you sure you want to delete this category?')) {
      return;
    }

    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) {
      showToast(error.message, 'error');
    } else {
      showToast(lang === 'ar' ? 'تم حذف التصنيف بنجاح' : 'Category deleted successfully', 'success');
      setCategories(categories.filter((c) => c.id !== id));
    }
  };

  const getCategoryIcon = (name: string) => {
    const n = (name || '').toLowerCase();
    if (n.includes('مشروب') || n.includes('drink') || n.includes('عصير')) {
      return <Coffee className="w-6 h-6 text-amber-600" />;
    }
    if (n.includes('شوكولات') || n.includes('حلو') || n.includes('sweet') || n.includes('chocolate')) {
      return <Sparkles className="w-6 h-6 text-pink-600" />;
    }
    if (n.includes('مقرمش') || n.includes('تسالي') || n.includes('snack') || n.includes('chips')) {
      return <Cookie className="w-6 h-6 text-orange-600" />;
    }
    if (n.includes('عامة') || n.includes('general') || n.includes('أخرى')) {
      return <Utensils className="w-6 h-6 text-purple-600" />;
    }
    return <Package className="w-6 h-6 text-primary-600" />;
  };

  const filteredCategories = categories.filter((cat) => {
    const cName = (lang === 'ar' ? cat.name_ar : cat.name_en) || cat.name || '';
    return cName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const totalCategories = categories.length;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 pb-28 space-y-6">
      {/* 1. Header & Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-pink-50/60 via-purple-50/40 to-white rounded-3xl border border-pink-100/60 shadow-sm p-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FolderTree className="w-6 h-6 text-primary-500" />
            {lang === 'ar' ? 'إدارة التصنيفات' : 'Categories Management'}
          </h1>
          <p className="text-xs text-gray-500 mt-1">تنظيم وتصنيف المنتجات وأقسام المتجر بكل احترافية</p>
        </div>

        <Link
          to="/admin/categories/new"
          className="px-5 py-2.5 bg-gradient-to-r from-primary-500 to-pink-600 hover:from-primary-600 hover:to-pink-700 text-white rounded-xl text-xs font-bold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-md shadow-primary-500/25 inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>{lang === 'ar' ? 'إضافة تصنيف' : 'Add Category'}</span>
        </Link>
      </div>

      {/* 2. Mini KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-purple-200 shadow-xs p-5 flex items-center justify-between bg-gradient-to-br from-purple-50/80 to-white transition-all duration-300 hover:scale-[1.02] hover:shadow-md cursor-pointer">
          <div>
            <p className="text-xs text-gray-500 font-medium">إجمالي التصنيفات</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{totalCategories}</h3>
            <span className="text-xs text-purple-600 font-semibold mt-1 inline-block">أقسام المتجر النشطة</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-600/20">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-200 shadow-xs p-5 flex items-center justify-between bg-gradient-to-br from-emerald-50/80 to-white transition-all duration-300 hover:scale-[1.02] hover:shadow-md cursor-pointer">
          <div>
            <p className="text-xs text-gray-500 font-medium">حالة النظام</p>
            <h3 className="text-xl font-bold text-gray-900 mt-1">متصل ومحدث</h3>
            <span className="text-xs text-emerald-600 font-semibold mt-1 inline-block">قاعدة البيانات جاهزة</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 3. Search Bar */}
      <div className="flex items-center bg-white rounded-2xl border border-gray-100 p-4 shadow-2xs">
        <div className="relative w-full md:w-80">
          <Search className="absolute right-3.5 top-3 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={lang === 'ar' ? 'ابحث عن تصنيف...' : 'Search categories...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-10 pl-4 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* 4. Categories Grid */}
      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">{t('loading')}</div>
      ) : filteredCategories.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-card space-y-4">
          <FolderTree className="w-16 h-16 text-gray-300 mx-auto" />
          <div>
            <p className="text-sm font-bold text-gray-700">لا توجد تصنيفات مضافة بعد</p>
            <p className="text-xs text-gray-400 mt-1">ابدأ بإنشاء تصنيف جديد لترتيب منتجاتك بسهولة</p>
          </div>
          <Link
            to="/admin/categories/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-500 text-white rounded-xl text-xs font-bold shadow-md hover:bg-primary-600 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة أول تصنيف</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCategories.map((category) => {
            const catName = lang === 'ar' ? (category.name_ar || category.name) : (category.name_en || category.name);

            return (
              <div
                key={category.id}
                onClick={() => navigate(`/admin/products?category=${category.id}`)}
                className="bg-white rounded-2xl border border-gray-100 shadow-card p-6 flex flex-col justify-between transition-all duration-300 hover:scale-[1.02] hover:shadow-xl group cursor-pointer"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-primary-50 flex items-center justify-center font-bold shadow-inner">
                      {getCategoryIcon(catName)}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-base">{catName}</h3>
                      <div className="mt-1.5">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary-50 text-primary-600">
                          <Package className="w-3.5 h-3.5" />
                          {category.product_count} {lang === 'ar' ? 'منتج' : 'products'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* أزرار الإجراءات */}
                <div className="grid grid-cols-2 gap-2 border-t border-gray-50 pt-4 mt-4">
                  <Link
                    to={`/admin/categories/${category.id}/edit`}
                    onClick={(e) => e.stopPropagation()}
                    className="py-2.5 bg-primary-50 hover:bg-primary-500 text-primary-600 hover:text-white rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>تعديل</span>
                  </Link>
                  <button
                    onClick={(e) => handleDelete(e, category.id)}
                    className="py-2.5 bg-red-50 hover:bg-red-500 text-red-600 hover:text-white rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>حذف</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default AdminCategoriesPage;