/**
 * Catalog Domain Contract
 * Pure domain types for products, modifiers, recipe ingredients, and reviews.
 */

export interface ProductReview {
  id: string;
  author: string;
  rating: number;
  date: string;
  comment: string;
  verifiedOrder: boolean;
}

export interface ProductModifierOption {
  id: string;
  name: string;
  priceDelta: number;
  isDefault?: boolean;
}

export interface ProductModifierGroup {
  id: string;
  title: string;
  minSelect: number;
  maxSelect: number;
  options: ProductModifierOption[];
}

export interface RecipeIngredient {
  ingredientId: string;
  ingredientName: string;
  quantityRequired: number; // Consumed quantity per product unit
  unit: string;
}

export interface ProductItem {
  id: string;
  code: string;
  name: string;
  category: string;
  price: number;
  imageUrl?: string;
  isActive: boolean;
  isAvailable: boolean;
  stockEstimated: number;
  prepTimeMinutes: number;
  description: string;
  demandTag?: "Alta demanda" | "Demanda media" | "Sugerencia de promo";
  activeOrdersCount?: number;
  salesCount?: number;
  popularityRank?: number;
  rating?: number;
  reviewsCount?: number;
  reviews?: ProductReview[];
  modifiers?: ProductModifierGroup[];
  recipe?: RecipeIngredient[];
  autoPauseOnStockOut?: boolean;
  costEstimated?: number;
}

export type CatalogItem = ProductItem;
