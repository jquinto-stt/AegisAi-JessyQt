import type { Product, NewProduct } from '../../../api/products';
import type { ProductItem } from '../types';

/**
 * Adapter between the WebiAI Products API model (`Product`) and Necto's richer
 * catalog model (`ProductItem`).
 *
 * The API is the source of truth for the shared fields (id, name, sku→code,
 * price, stock→stockEstimated). Necto-only fields (category, ratings, reviews,
 * modifiers, images) are preserved when merging over an existing item, or
 * filled with sensible defaults for freshly-created products.
 */

const DEFAULT_CATEGORY = 'General';
const DEFAULT_PREP_MINUTES = 10;

/**
 * Map an API Product to a Necto ProductItem. If `existing` is provided (the
 * current catalog item), its Necto-only fields are retained so an API refresh
 * doesn't wipe local presentation data.
 */
export function toProductItem(api: Product, existing?: ProductItem): ProductItem {
  return {
    id: api.id,
    code: api.sku,
    name: api.name,
    price: api.price,
    stockEstimated: api.stock,
    category: existing?.category ?? DEFAULT_CATEGORY,
    isActive: existing?.isActive ?? true,
    isAvailable: existing?.isAvailable ?? api.stock > 0,
    prepTimeMinutes: existing?.prepTimeMinutes ?? DEFAULT_PREP_MINUTES,
    description: existing?.description ?? '',
    imageUrl: existing?.imageUrl,
    demandTag: existing?.demandTag,
    activeOrdersCount: existing?.activeOrdersCount,
    salesCount: existing?.salesCount,
    popularityRank: existing?.popularityRank,
    rating: existing?.rating,
    reviewsCount: existing?.reviewsCount,
    reviews: existing?.reviews,
    modifiers: existing?.modifiers,
  };
}

/** Map a Necto ProductItem (or partial) to the API's NewProduct payload. */
export function toApiProduct(item: {
  name: string;
  code: string;
  price: number;
  stockEstimated: number;
}): NewProduct {
  return {
    name: item.name,
    sku: item.code,
    price: item.price,
    stock: item.stockEstimated,
  };
}
