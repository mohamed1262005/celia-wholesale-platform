import { QueryClient } from '@tanstack/react-query';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { supabase } from '@/lib/supabase';

const MINUTE = 60 * 1000;

// المفاتيح الوحيدة اللي بتتحفظ على الجهاز (كتالوج عام فقط، مفيش بيانات عملاء)
export const CACHEABLE_KEYS = ['products', 'product', 'categories'];

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * MINUTE,        // البيانات تعتبر "طازة" دقيقتين → مفيش طلب جديد للداتا بيز
      gcTime: 24 * 60 * MINUTE,     // تفضل في الذاكرة/الجهاز 24 ساعة
      retry: 1,
      refetchOnWindowFocus: false,  // بلاش طلبات زيادة لما العميل يرجع للتبويب
    },
  },
});

function getStorage(): Storage | undefined {
  try {
    const s = window.localStorage;
    s.setItem('__celia_test__', '1');
    s.removeItem('__celia_test__');
    // تنظيف الكاش اليدوي القديم
    s.removeItem('celia_products_cache');
    s.removeItem('celia_categories_cache');
    return s;
  } catch {
    return undefined;
  }
}

export const queryPersister = createSyncStoragePersister({
  storage: getStorage(),
  key: 'celia_query_cache',
  throttleTime: 1000,
});

// نادي عليها بعد أي تعديل (إضافة/تعديل/حذف منتج أو تصنيف أو مخزون)
export async function invalidateCatalog() {
  await Promise.all(
    CACHEABLE_KEYS.map((k) => queryClient.invalidateQueries({ queryKey: [k] }))
  );

  const catalogApiUrl = import.meta.env.VITE_CATALOG_API_URL?.replace(/\/$/, '');
  if (!catalogApiUrl) return;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;

    const response = await fetch(`${catalogApiUrl}/invalidation`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ entityType: 'catalog' }),
    });
    if (!response.ok) {
      console.warn('Shared catalog cache invalidation failed:', response.status);
    }
  } catch (error) {
    console.warn('Shared catalog cache invalidation failed:', error);
  }
}