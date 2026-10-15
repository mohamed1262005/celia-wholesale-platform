import type { Product, PricingTier } from '@/types';

export function getPricingForQuantity(product: Product, quantity: number): number {
  const tiers = product.pricing_tiers;
  
  // تعديل تلقائي: لو مفيش شرائح تسعير، رجّع السعر الأساسي للمنتج فوراً بدل 0
  if (!tiers || tiers.length === 0) {
    return Number(product.price || 0);
  }

  const sorted = [...tiers].sort((a, b) => a.min_quantity - b.min_quantity);
  for (const tier of sorted) {
    const max = tier.max_quantity ?? Infinity;
    if (quantity >= tier.min_quantity && quantity <= max) {
      return Number(tier.unit_price);
    }
  }
  // If quantity exceeds all tiers, use the last (cheapest) tier
  const last = sorted[sorted.length - 1];
  if (quantity >= last.min_quantity) return Number(last.unit_price);
  
  // Below min tier — use first tier
  return Number(sorted[0].unit_price);
}

export function getApplicableTier(product: Product, quantity: number): PricingTier | null {
  const tiers = product.pricing_tiers;
  if (!tiers || tiers.length === 0) return null;
  const sorted = [...tiers].sort((a, b) => a.min_quantity - b.min_quantity);
  for (const tier of sorted) {
    const max = tier.max_quantity ?? Infinity;
    if (quantity >= tier.min_quantity && quantity <= max) {
      return tier;
    }
  }
  const last = sorted[sorted.length - 1];
  if (quantity >= last.min_quantity) return last;
  return sorted[0];
}

export function getAvailableStock(product: Product): number {
  return Math.max(0, product.stock_quantity - product.reserved_quantity);
}

export function getStockStatus(product: Product): 'out' | 'low' | 'in' {
  const available = getAvailableStock(product);
  if (available === 0) return 'out';
  if (available <= 10) return 'low';
  return 'in';
}

export function formatPrice(price: number, currency: string = 'SAR'): string {
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
  return `${formatted} ${currency}`;
}

export function formatDate(dateString: string, lang: 'en' | 'ar' = 'en'): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(dateString: string, lang: 'en' | 'ar' = 'en'): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}