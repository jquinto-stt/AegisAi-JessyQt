# WhatsApp Orders Flow Specification

## Purpose

Defines customer-facing conversational flows on WhatsApp, including order placement, intent recognition, real-time status inquiry, cancellation rules, and order repetition.

## Business Rules

| # | Rule | Enforcement |
|---|------|-------------|
| OF-01 | Customer is identified by their unique WhatsApp phone number (no account creation required). | MUST |
| OF-02 | Orders follow the strict linear progression: `RECEIVED` → `PREPARING` → `READY` → `DELIVERED`. | MUST |
| OF-03 | Orders can be cancelled by the customer only in `RECEIVED` or `PREPARING` status before reaching `READY`. | MUST |
| OF-04 | Orders attempted outside business opening hours return a polite automated closed message with schedule details. | MUST |
| OF-05 | Each state change triggers an automated push message to the customer's WhatsApp. | MUST |
| OF-06 | Customer requesting *"Repetir mi último pedido"* retrieves their most recent order and asks for 1-click confirmation. | SHOULD |

## Conversational Flows

### 1. Order Placement
1. **User Message**: *"Hola, quiero 1 Pizza Especial y 1 Coca Cola"*
2. **System**: Matches catalog items, returns itemized breakdown and total amount.
3. **User Message**: *"Confirmar pedido"*
4. **System**: Creates order in `RECEIVED` status, confirms estimated preparation time, and notifies web dashboard.

### 2. Status Tracking
1. **User Message**: *"¿Cómo va mi pedido?"*
2. **System**: Searches active orders associated with customer's phone number.
3. **System**: Returns current status badge, time elapsed, and estimated time remaining.

### 3. Order Cancellation
1. **User Message**: *"Quiero cancelar el pedido"*
2. **Validation**: Checks status. If `RECEIVED` or `PREPARING`, updates order to `CANCELLED` and notifies kitchen. If `READY` or `DELIVERED`, explains cancellation is no longer possible.

## Data Model

```typescript
export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  selectedVariant?: string;
  subtotal: number;
}

export interface Order {
  id: string;
  orderNumber: string; // e.g. "#104"
  ownerId: string;
  customerPhone: string;
  customerName: string;
  items: OrderItem[];
  totalAmount: number;
  status: 'RECEIVED' | 'PREPARING' | 'READY' | 'DELIVERED' | 'CANCELLED';
  deliveryType: 'PICKUP' | 'DELIVERY' | 'DINE_IN';
  deliveryAddress?: string;
  notes?: string;
  estimatedMinutes?: number;
  createdAt: string;
  updatedAt: string;
}
```
