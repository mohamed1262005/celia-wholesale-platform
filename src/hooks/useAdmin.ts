import { useAdminData } from '@/hooks/useAdminData';
import { supabase } from '@/lib/supabase';
import type { Profile, Order } from '@/types';

export { useAdminData };

export function useAdminOrders() {
  return useAdminData<Order>('orders', `
    *,
    order_items:order_items(*)
  `, 'created_at');
}

export function useAdminProducts() {
  return useAdminData<{
    id: string;
    name_en: string;
    name_ar: string;
    description_en: string | null;
    description_ar: string | null;
    image_url: string | null;
    category_id: string | null;
    packaging: string | null;
    stock_quantity: number;
    reserved_quantity: number;
    status: string;
    sort_order: number;
    created_at: string;
    category?: { id: string; name_en: string; name_ar: string };
    pricing_tiers?: { id: string; min_quantity: number; max_quantity: number | null; unit_price: number }[];
  }>('products', `
    *,
    category:categories(id, name_en, name_ar),
    pricing_tiers:pricing_tiers(*)
  `, 'created_at');
}

export function useAdminCustomers() {
  return useAdminData<Profile>('profiles', '*', 'created_at');
}

// Fetch order stats for a customer
export async function getCustomerStats(customerId: string) {
  const { data } = await supabase
    .from('orders')
    .select('subtotal, status')
    .eq('customer_id', customerId);
  const orders = data || [];
  const totalOrders = orders.length;
  const totalSpent = orders
    .filter(o => o.status !== 'cancelled')
    .reduce((sum, o) => sum + Number(o.subtotal), 0);
  return { totalOrders, totalSpent };
}
