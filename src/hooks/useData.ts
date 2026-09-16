import { useState, useEffect, useCallback } from 'react';
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

    if (filters?.sort === 'name') {
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

      if (filters?.categoryId) {
        result = result.filter((p: any) => {
          const cat = p.categories || p.category;
          return (
            p.category_id === filters.categoryId || 
            cat?.id === filters.categoryId || 
            cat?.slug === filters.categoryId
          );
        });
      } else if (filters?.categorySlug) {
        result = result.filter((p: any) => {
          const cat = p.categories || p.category;
          return cat?.slug === filters.categorySlug;
        });
      }

      if (filters?.search) {
        const q = filters.search.toLowerCase();
        result = result.filter(p =>
          (p.name_en || '').toLowerCase().includes(q) ||
          (p.name_ar || '').toLowerCase().includes(q)
        );
      }

      if (filters?.availability === 'available') {
        result = result.filter((p) => getAvailableStock(p) > 0);
      }

      setProducts(result);
    }
    setLoading(false);
  }, [filters?.categoryId, filters?.categorySlug, filters?.search, filters?.availability, filters?.sort]);

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