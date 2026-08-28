import type { Product, NewProduct } from './products';
import { INITIAL_PRODUCTS } from '../compositions/pedidos/mockData';

/**
 * In-memory + localStorage mock backend for the Products API.
 *
 * Used while the real WebiAI cloud.core Lambdas are unavailable (blocked on
 * iam:CreateRole). Mirrors the real API contract (Product shape), seeds from
 * Necto's INITIAL_PRODUCTS (mapped to the API model), and persists per user
 * via localStorage keyed by the Cognito `sub` claim.
 */

const STORAGE_PREFIX = 'stockflow.mock.products.';
const LATENCY_MS = 200;

function delay<T>(value: T): Promise<T> {
  return new Promise(resolve => setTimeout(() => resolve(value), LATENCY_MS));
}

/**
 * Best-effort decode of the Cognito JWT `sub` claim to scope mock storage per
 * user. Falls back to a shared key when the token can't be parsed (e.g. mock
 * mode without a real session).
 */
function ownerFromToken(token: string): string {
  try {
    const payload = token.split('.')[1];
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return json.sub || json['cognito:username'] || 'demo-user';
  } catch {
    return 'demo-user';
  }
}

function storageKey(ownerId: string): string {
  return `${STORAGE_PREFIX}${ownerId}`;
}

/** Seed the store from Necto's INITIAL_PRODUCTS mapped to the API contract. */
function seed(ownerId: string): Product[] {
  const now = new Date().toISOString();
  return INITIAL_PRODUCTS.map(p => ({
    id: p.id,
    ownerId,
    name: p.name,
    sku: p.code,
    price: p.price,
    stock: p.stockEstimated,
    createdAt: now,
    updatedAt: now,
  }));
}

function read(ownerId: string): Product[] {
  try {
    const raw = localStorage.getItem(storageKey(ownerId));
    if (raw) return JSON.parse(raw) as Product[];
  } catch {
    /* fall through to seed */
  }
  const seeded = seed(ownerId);
  write(ownerId, seeded);
  return seeded;
}

function write(ownerId: string, products: Product[]): void {
  localStorage.setItem(storageKey(ownerId), JSON.stringify(products));
}

function validate(input: NewProduct): string[] {
  const errors: string[] = [];
  if (!input.name?.trim()) errors.push('name is required');
  if (!input.sku?.trim()) errors.push('sku is required');
  if (typeof input.price !== 'number' || Number.isNaN(input.price) || input.price < 0) {
    errors.push('price must be a number >= 0');
  }
  if (!Number.isInteger(input.stock) || input.stock < 0) {
    errors.push('stock must be an integer >= 0');
  }
  return errors;
}

export async function mockListProducts(token: string): Promise<Product[]> {
  const ownerId = ownerFromToken(token);
  const products = read(ownerId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return delay(products);
}

export async function mockCreateProduct(
  input: NewProduct,
  token: string,
): Promise<Product> {
  const ownerId = ownerFromToken(token);

  const errors = validate(input);
  if (errors.length > 0) {
    throw Object.assign(new Error('Validation failed'), { status: 400, details: errors });
  }

  const now = new Date().toISOString();
  const product: Product = {
    id:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `mock-${Date.now()}`,
    ownerId,
    name: input.name.trim(),
    sku: input.sku.trim(),
    price: input.price,
    stock: input.stock,
    createdAt: now,
    updatedAt: now,
  };

  const products = read(ownerId);
  products.push(product);
  write(ownerId, products);

  return delay(product);
}

export async function mockUpdateProduct(
  id: string,
  input: Partial<NewProduct>,
  token: string,
): Promise<Product> {
  const ownerId = ownerFromToken(token);
  const products = read(ownerId);
  const idx = products.findIndex(p => p.id === id);
  if (idx === -1) {
    throw Object.assign(new Error('Product not found'), { status: 404 });
  }

  const updated: Product = {
    ...products[idx],
    ...input,
    updatedAt: new Date().toISOString(),
  };
  products[idx] = updated;
  write(ownerId, products);

  return delay(updated);
}
