import type { Category, Product } from '@/types';

const catalogApiUrl = import.meta.env.VITE_CATALOG_API_URL?.replace(/\/$/, '');

export interface CatalogProductsResult {
  rows: Product[];
  count: number | null;
}

export interface CatalogProductsQuery {
  categoryId: string | null;
  categorySlug: string | null;
  search: string;
  availability: 'all' | 'available';
  sort: 'newest' | 'price_low' | 'price_high' | 'name';
  page: number;
  pageSize: number;
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${catalogApiUrl}${path}`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Catalog API request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export async function getCatalogCategories(): Promise<Category[] | undefined> {
  if (!catalogApiUrl) return undefined;
  return getJson<Category[]>('/categories');
}

export async function getCatalogProducts(
  query: CatalogProductsQuery,
): Promise<CatalogProductsResult | undefined> {
  if (!catalogApiUrl) return undefined;

  const params = new URLSearchParams({
    page: String(query.page + 1),
    pageSize: String(query.pageSize),
    availability: query.availability,
    sort: query.sort,
  });
  if (query.categoryId) params.set('categoryId', query.categoryId);
  if (query.categorySlug) params.set('categorySlug', query.categorySlug);
  if (query.search) params.set('search', query.search);

  return getJson<CatalogProductsResult>(`/products?${params.toString()}`);
}

export async function getCatalogProduct(id: string): Promise<Product | null | undefined> {
  if (!catalogApiUrl) return undefined;
  const response = await fetch(`${catalogApiUrl}/products/${encodeURIComponent(id)}`, {
    headers: { Accept: 'application/json' },
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Catalog API request failed (${response.status})`);
  }
  return response.json() as Promise<Product>;
}
