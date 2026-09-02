# Product Catalog Specification

## Purpose

Defines product definitions, categorization, pricing structures, variants, and availability management within the Pedidos module.

## Actors

- **Business Owner / Staff**: Creates, edits, reorders, and toggles product availability.
- **Customer**: Queries available products and variants via WhatsApp.

## Business Rules

| # | Rule | Enforcement |
|---|------|-------------|
| CAT-01 | Products require: `id`, `ownerId`, `name`, `price`, `category`, `isActive`. | MUST |
| CAT-02 | Optional product fields: `description`, `imageUrl`, and `variants` array. | SHOULD |
| CAT-03 | Prices must be non-negative numeric values formatted to standard business currency. | MUST |
| CAT-04 | Toggling `isActive = false` hides the product from customer queries without deleting order history. | MUST |
| CAT-05 | Products are grouped into customizable categories (e.g. *Bebidas*, *Principales*, *Postres*). | MUST |
| CAT-06 | Variants allow custom price adjustments (e.g., *Grande* vs *Chica*). | MAY |

## Data Model

```typescript
export interface ProductVariant {
  id: string;
  name: string;
  price: number;
}

export interface Product {
  id: string;
  ownerId: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  imageUrl?: string;
  isActive: boolean;
  variants?: ProductVariant[];
  createdAt: string;
  updatedAt: string;
}
```
