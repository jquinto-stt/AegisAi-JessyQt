import { apiFetch } from './client';
import { mockListProducts, mockCreateProduct } from './mockProducts';

export interface Product {
  id: string;
  ownerId: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  createdAt: string;
  updatedAt: string;
}

export interface NewProduct {
  name: string;
  sku: string;
  price: number;
  stock: number;
}

/**
 * Mock mode: active when explicitly enabled (VITE_USE_MOCK=true) OR when no
 * API URL is configured yet (VITE_API_URL empty). This lets the SPA run the
 * full create/list UX locally while the real AWS Lambdas are unavailable.
 */
export const USE_MOCK =
  import.meta.env.VITE_USE_MOCK === 'true' || !import.meta.env.VITE_API_URL;

export async function listProducts(token: string): Promise<Product[]> {
  if (USE_MOCK) {
    return mockListProducts(token);
  }
  const data = await apiFetch<{ products: Product[] }>('/products', { token });
  return data.products;
}

export async function createProduct(
  input: NewProduct,
  token: string,
): Promise<Product> {
  if (USE_MOCK) {
    return mockCreateProduct(input, token);
  }
  const data = await apiFetch<{ product: Product }>('/products', {
    method: 'POST',
    body: input,
    token,
  });
  return data.product;
}
