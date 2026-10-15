export type UserRole = 'customer' | 'admin';
export type UserStatus = 'active' | 'suspended';
export type ProductStatus = 'active' | 'inactive';
export type CategoryStatus = 'active' | 'inactive';
export type OrderStatus = 'new' | 'processing' | 'confirmed' | 'delivered' | 'cancelled';
export type PaymentMethod = 'cod' | 'online';
export type Language = 'en' | 'ar';

export interface Profile {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  created_at: string;
}

export interface Category {
  id: string;
  name_en: string;
  name_ar: string;
  slug: string;
  image_url: string | null;
  status: CategoryStatus;
  sort_order: number;
  created_at: string;
  product_count?: number;
}

export interface Product {
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
  status: ProductStatus;
  sort_order: number;
  created_at: string;
  category?: Category | null;
  pricing_tiers?: PricingTier[];
}

export interface PricingTier {
  id: string;
  product_id: string;
  min_quantity: number;
  max_quantity: number | null;
  unit_price: number;
  sort_order: number;
  created_at: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  applicablePrice: number;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  product_image: string | null;
  packaging: string | null;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  subtotal: number;
  total_quantity: number;
  payment_method: PaymentMethod;
  status: OrderStatus;
  city: string | null;
  area: string | null;
  address: string | null;
  delivery_notes: string | null;
  order_notes: string | null;
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
}

export interface AppNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

export interface DeliveryInfo {
  name: string;
  phone: string;
  city: string;
  area: string;
  address: string;
  deliveryNotes?: string;
  orderNotes?: string;
}
