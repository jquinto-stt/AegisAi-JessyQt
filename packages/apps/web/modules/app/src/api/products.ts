import { apiFetch } from './client';

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

export async function listProducts(token: string): Promise<Product[]> {
  const data = await apiFetch<{ products: Product[] }>('/products', { token });
  return data.products;
}

export async function createProduct(
  input: NewProduct,
  token: string,
): Promise<Product> {
  const data = await apiFetch<{ product: Product }>('/products', {
    method: 'POST',
    body: input,
    token,
  });
  return data.product;
}
