import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { getAvailableStock } from '@/lib/pricing';
import type { Category, Product, Order, AppNotification } from '@/types';

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name_ar', { ascending: true });
    if (error) {
      setError(error.message);
    } else {
      setCategories((data as Category[]) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  return { categories, loading, error, reload: load };
}

export function useAllCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('categories')
      .select('*');
    setCategories((data as Category[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  return { categories, loading, reload: load };
}

export function useProducts(filters?: {
  categoryId?: string;
  categorySlug?: string;
  search?: string;
  availability?: 'all' | 'available';
  sort?: 'newest' | 'price_low' | 'price_high' | 'name';
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // استخراج القيم النصية بشكل آمن لمنع تكرار الـ loops بسبب كائنات الـ filters
  const categoryId = filters?.categoryId;
  const categorySlug = filters?.categorySlug;
  const search = filters?.search;
  const availability = filters?.availability;
  const sort = filters?.sort;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    let query = supabase
      .from('products')
      .select(`
        *,
        categories (*),
        pricing_tiers (*)
      `);

    if (sort === 'name') {
      query = query.order('name_ar', { ascending: true });
    } else {
      query = query.order('id', { ascending: false });
    }

    const { data, error } = await query;

    if (error) {
      setError(error.message);
      setProducts([]);
    } else {
      let result = (data as Product[]) || [];

      if (categoryId) {
        result = result.filter((p: any) => {
          const cat = p.categories || p.category;
          return (
            p.category_id === categoryId || 
            cat?.id === categoryId || 
            cat?.slug === categoryId
          );
        });
      } else if (categorySlug) {
        result = result.filter((p: any) => {
          const cat = p.categories || p.category;
          return cat?.slug === categorySlug;
        });
      }

      if (search) {
        const q = search.toLowerCase();
        result = result.filter(p =>
          (p.name_en || '').toLowerCase().includes(q) ||
          (p.name_ar || '').toLowerCase().includes(q)
        );
      }

      if (availability === 'available') {
        result = result.filter((p) => getAvailableStock(p) > 0);
      }

      setProducts(result);
    }
    setLoading(false);
  }, [categoryId, categorySlug, search, availability, sort]);

  useEffect(() => { load(); }, [load]);
  return { products, loading, error, reload: load };
}

export function useProduct(id: string | undefined) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          categories (*),
          pricing_tiers (*)
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) {
        setError(error.message);
      } else if (data) {
        setProduct(data as Product);
      }
      setLoading(false);
    })();
  }, [id]);

  return { product, loading, error };
}

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
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    setNotifications((data as AppNotification[]) || []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const markAsRead = useCallback(async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!userId) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  }, [userId]);

  const unreadCount = notifications.filter(n => !(n as any).is_read && !(n as any).read).length;

  return { notifications, loading, unreadCount, markAsRead, markAllAsRead, reload: load };
}