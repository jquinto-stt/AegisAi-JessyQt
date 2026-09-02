# Orders Infrastructure Specification

## Purpose

Defines the serverless cloud infrastructure for the Pedidos domain using AWS CDK, SST v3, and WebiAI SDK (`packages/cloud/core/infra/factories/pedidos.ts`).

## Dedicated DynamoDB Schema (`Pedidos@Table`)

| Key Attribute | Format | Usage |
|---|---|---|
| **Partition Key (PK)** | `USER#{ownerId}` | Tenant & Business Owner isolation |
| **Sort Key (SK)** | `ORDER#{orderId}` or `PRODUCT#{productId}` | Differentiates products from orders |
| **GSI1PK** | `STATUS#{status}` | Query active orders by current phase |
| **GSI1SK** | `CREATED#{isoTimestamp}` | Chronological sorting of incoming orders |

## Lambda Functions & Routing

- `GET /pedidos/orders` — List active orders for the authenticated business.
- `POST /pedidos/orders` — Create new order (from WhatsApp webhook or web checkout).
- `PATCH /pedidos/orders/{id}/status` — Advance order state (`PREPARING`, `READY`, etc.).
- `GET /pedidos/products` — Retrieve product catalog.
- `POST /pedidos/products` — Add or edit catalog item.
- `DELETE /pedidos/products/{id}` — Archive/remove catalog item.
