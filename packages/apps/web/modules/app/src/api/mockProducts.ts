import type { Product, NewProduct } from './products';

/**
 * In-memory + localStorage mock backend for the Products slice.
 *
 * Used while the real AWS Lambdas are unavailable (blocked on iam:CreateRole).
 * Mirrors the real API contract: per-owner isolation, server-generated id and
 * timestamps, basic validation. Data persists across reloads via localStorage,
 * scoped by ownerId so different logged-in users don't share products.
 */

const STORAGE_PREFIX = 'stockflow.mock.products.';
const LATENCY_MS = 250;

function delay<T>(value: T): Promise<T> {
  return new Promise(resolve => setTimeout(() => resolve(value), LATENCY_MS));
}

/**
 * Best-effort decode of the Cognito JWT `sub` claim to scope mock storage
 * per user. Falls back to a shared key if the token can't be parsed.
 */
function ownerFromToken(token: string): string {
  try {
    const payload = token.split('.')[1];
    const json = JSON.parse(
      atob(payload.replace(/-/g, '+').replace(/_/g, '/')),
    );
    return json.sub || json['cognito:username'] || 'anonymous';
  } catch {
    return 'anonymous';
  }
}

function storageKey(ownerId: string): string {
  return `${STORAGE_PREFIX}${ownerId}`;
}

function read(ownerId: string): Product[] {
  try {
    const raw = localStorage.getItem(storageKey(ownerId));
    return raw ? (JSON.parse(raw) as Product[]) : [];
  } catch {
    return [];
  }
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
  const products = read(ownerId).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
  return delay(products);
}

export async function mockCreateProduct(
  input: NewProduct,
  token: string,
): Promise<Product> {
  const ownerId = ownerFromToken(token);

  const errors = validate(input);
  if (errors.length > 0) {
    throw Object.assign(new Error('Validation failed'), {
      status: 400,
      details: errors,
    });
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
