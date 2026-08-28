import { apiFetch } from './client';
import {
  mockListProducts,
  mockCreateProduct,
  mockUpdateProduct,
} from './mockProducts';

/**
 * Product — matches the WebiAI cloud.core Products API contract
 * (Products@Table item shape: pk=ownerId, sk=productId).
 */
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
 * API URL is configured yet (VITE_API_URL empty). Lets the Necto catalog run
 * the full list/create/update UX locally while the AWS Lambdas are
 * unavailable (blocked on iam:CreateRole).
 */
export const USE_MOCK =
  import.meta.env.VITE_USE_MOCK === 'true' || !import.meta.env.VITE_API_URL;

export async function listProducts(token: string): Promise<Product[]> {
  if (USE_MOCK) return mockListProducts(token);
  const data = await apiFetch<{ products: Product[] }>('/products', { token });
  return data.products;
}

export async function createProduct(
  input: NewProduct,
  token: string,
): Promise<Product> {
  if (USE_MOCK) return mockCreateProduct(input, token);
  const data = await apiFetch<{ product: Product }>('/products', {
    method: 'POST',
    body: input,
    token,
  });
  return data.product;
}

export async function updateProduct(
  id: string,
  input: Partial<NewProduct>,
  token: string,
): Promise<Product> {
  if (USE_MOCK) return mockUpdateProduct(id, input, token);
  const data = await apiFetch<{ product: Product }>(`/products/${id}`, {
    method: 'PUT',
    body: input,
    token,
  });
  return data.product;
}
