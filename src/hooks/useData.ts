import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  useQuery,
  useInfiniteQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { getAvailableStock } from '@/lib/pricing';
import type { Category, Product, Order, AppNotification } from '@/types';

const MINUTE = 60 * 1000;
const PAGE_SIZE = 24;
const EMPTY_CATEGORIES: Category[] = [];
const EMPTY_PRODUCTS: Product[] = [];

type ProductsPage = { rows: Product[]; count: number | null };

const errMsg = (e: unknown): string | null =>
  e ? (e instanceof Error ? e.message : String(e)) : null;

/* ───────────── التصنيفات (كاش 15 دقيقة) ───────────── */

export function useCategories() {
  const q = useQuery({
    queryKey: ['categories'],
    staleTime: 15 * MINUTE,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name_ar', { ascending: true });
      if (error) throw new Error(error.message);
      return (data as Category[]) || [];
    },
  });

  return {
    categories: q.data ?? EMPTY_CATEGORIES,
    loading: q.isLoading,
    error: errMsg(q.error),
    reload: () => q.refetch(),
  };
}

export function useAllCategories() {
  const q = useQuery({
    queryKey: ['categories', 'all'],
    staleTime: 15 * MINUTE,
    queryFn: async () => {
      const { data, error } = await supabase.from('categories').select('*');
      if (error) throw new Error(error.message);
      return (data as Category[]) || [];
    },
  });

  return {
    categories: q.data ?? EMPTY_CATEGORIES,
    loading: q.isLoading,
    reload: () => q.refetch(),
  };
}

/* ───────────── المنتجات (فلترة وترتيب وترقيم على السيرفر + كاش لكل فلتر) ───────────── */

export function useProducts(filters?: {
  categoryId?: string;
  categorySlug?: string;
  search?: string;
  availability?: 'all' | 'available';
  sort?: 'newest' | 'price_low' | 'price_high' | 'name';
  pageSize?: number;
}) {
  const categoryId = filters?.categoryId || null;
  const categorySlug = filters?.categorySlug || null;
  const availability = filters?.availability || 'all';
  const sort = filters?.sort || 'newest';
  const pageSize = filters?.pageSize || PAGE_SIZE;

  // تنظيف كلمة البحث من الرموز اللي بتبوّظ صيغة الفلتر
  const term = (filters?.search || '')
    .replace(/[%,()\\*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const q = useInfiniteQuery({
    queryKey: ['products', { categoryId, categorySlug, term, availability, sort, pageSize }],
    initialPageParam: 0,
    queryFn: async ({ pageParam }): Promise<ProductsPage> => {
      const from = pageParam * pageSize;
      const to = from + pageSize - 1;

      const useSlugJoin = Boolean(categorySlug) && !categoryId;
      const select = useSlugJoin
        ? '*, categories!inner (*), pricing_tiers (*)'
        : '*, categories (*), pricing_tiers (*)';

      let query: any = supabase
        .from('products')
        .select(select, pageParam === 0 ? { count: 'exact' } : undefined);

      if (categoryId) query = query.eq('category_id', categoryId);
      else if (useSlugJoin) query = query.eq('categories.slug', categorySlug);

      if (term) query = query.or(`name_ar.ilike.%${term}%,name_en.ilike.%${term}%`);

      // تقريب على السيرفر، والفلترة الدقيقة (stock - reserved) بتتم تحت
      if (availability === 'available') query = query.gt('stock_quantity', 0);

      if (sort === 'price_low') query = query.order('price', { ascending: true });
      else if (sort === 'price_high') query = query.order('price', { ascending: false });
      else if (sort === 'name') query = query.order('name_ar', { ascending: true });
      else query = query.order('created_at', { ascending: false });

      // ترتيب ثانوي ثابت عشان الصفحات متتكررش ولا تتخطى منتجات
      const { data, error, count } = await query.order('id', { ascending: true }).range(from, to);
      if (error) throw new Error(error.message);

      return { rows: (data as Product[]) || [], count: count ?? null };
    },
    getNextPageParam: (lastPage, allPages) =>
      lastPage.rows.length === pageSize ? allPages.length : undefined,
  });

  const products = useMemo(() => {
    const pages = q.data?.pages;
    if (!pages) return EMPTY_PRODUCTS;
    const seen = new Map<string, Product>();
    for (const page of pages) for (const p of page.rows) seen.set(p.id, p);
    const all = Array.from(seen.values());
    return availability === 'available' ? all.filter((p) => getAvailableStock(p) > 0) : all;
  }, [q.data, availability]);

  return {
    products,
    loading: q.isLoading,
    error: errMsg(q.error),
    reload: () => q.refetch(),
    hasMore: Boolean(q.hasNextPage),
    loadMore: () => q.fetchNextPage(),
    loadingMore: q.isFetchingNextPage,
    total: q.data?.pages[0]?.count ?? null,
  };
}

/* ───────────── منتج واحد (بيظهر فورًا من كاش القوائم) ───────────── */

export function useProduct(id: string | undefined) {
  const queryClient = useQueryClient();

  const q = useQuery({
    queryKey: ['product', id],
    enabled: Boolean(id),
    staleTime: 2 * MINUTE,
    placeholderData: () => {
      if (!id) return undefined;
      const lists = queryClient.getQueriesData<InfiniteData<ProductsPage>>({ queryKey: ['products'] });
      for (const [, data] of lists) {
        const found = data?.pages.flatMap((p) => p.rows).find((p) => p.id === id);
        if (found) return found;
      }
      return undefined;
    },
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          categories (*),
          pricing_tiers (*)
        `)
        .eq('id', id as string)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data as Product | null) ?? null;
    },
  });

  return { product: q.data ?? null, loading: q.isLoading, error: errMsg(q.error) };
}

/* ───────────── بيانات خاصة بالعميل: بدون كاش دائم (زي ما كانت) ───────────── */

export function useOrders(customerId?: string) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!customerId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });
    setOrders((data as Order[]) || []);
    setLoading(false);
  }, [customerId]);

  useEffect(() => { load(); }, [load]);
  return { orders, loading, reload: load };
}

export function useNotifications(userId?: string) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    if (!userId) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setNotifications(data as AppNotification[]);
    } else {
      setNotifications([]);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const markAsRead = useCallback(async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true, read: true } : n));
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!userId) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true, read: true })));
  }, [userId]);

  const unreadCount = useMemo(() => {
    return notifications.filter(n => {
      const isRead = (n as any).is_read ?? (n as any).read ?? false;
      return !isRead;
    }).length;
  }, [notifications]);

  return { notifications, loading, unreadCount, markAsRead, markAllAsRead, reload: load };
}