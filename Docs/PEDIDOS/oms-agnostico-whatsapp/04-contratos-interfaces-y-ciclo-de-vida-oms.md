# 04 — Contratos de Datos, Interfaces & Ciclo de Vida OMS

Este documento establece los contratos tipados en TypeScript y la máquina de estados del ciclo de vida de un pedido en **Necto OMS**.

---

## 1. Máquina de Estados del Pedido

El ciclo de vida de una orden es **completamente universal** y aplica con exactitud matemática a ferreterías, zapaterías, farmacias o cualquier comercio:

```
                  ┌──────────────┐
                  │    NUEVO     │ (Ingreso por WhatsApp, Web o POS)
                  └──────┬───────┘
                         │ Operador o Bot valida datos
                         ▼
                  ┌──────────────┐
                  │  CONFIRMADO  │ (Stock validado / pago acordado)
                  └──────┬───────┘
                         │ Pasa a preparación operativa
                         ▼
                  ┌──────────────┐
                  │EN ALISTAMIENTO│ (Picking de bodega, empaque)
                  └──────┬───────┘
                         │ Empaque finalizado
                         ▼
                  ┌──────────────┐
                  │    LISTO     │ (Listo para entrega en mostrador o despacho)
                  └──────┬───────┘
                         │ Entrega efectiva al cliente / mensajero
                         ▼
                  ┌──────────────┐
                  │  FINALIZADO  │ (Transacción cerrada)
                  └──────────────┘

  * En cualquier estado previo a FINALIZADO, el pedido puede pasar a CANCELADO.
```

---

## 2. Contratos e Interfaces TypeScript

```typescript
export type OrderStatus =
  | "NUEVO"
  | "CONFIRMADO"
  | "EN_ALISTAMIENTO"
  | "LISTO"
  | "FINALIZADO"
  | "CANCELADO";

export type OrderChannel = "whatsapp" | "web" | "pos";

export type FulfillmentType = "pickup" | "delivery" | "on_site";

export type PaymentStatus = "pending" | "partial" | "paid" | "refunded";

export interface CustomerInfo {
  id?: string;
  name: string;
  phone?: string;
  email?: string;
  deliveryAddress?: {
    street: string;
    city: string;
    notes?: string;
  };
}

export interface OrderItem {
  id: string;
  productId: string;
  sku?: string;
  name: string;
  variantDescription?: string; // Talla, calibre, color, etc.
  quantity: number;
  unitPrice: number;
  subtotal: number;
  notes?: string;
}

export interface UniversalOrder {
  id: string;
  tenantId: string;
  orderNumber: string; // Ej. #ORD-1042
  channel: OrderChannel;
  status: OrderStatus;
  fulfillmentType: FulfillmentType;
  customer: CustomerInfo;
  items: OrderItem[];
  subtotal: number;
  taxAmount: number;
  deliveryFee: number;
  discountAmount: number;
  total: number;
  currency: string;
  paymentStatus: PaymentStatus;
  estimatedCompletionTime?: string;
  cancellationReason?: string;
  createdAt: string;
  updatedAt: string;
}
```

---

## 3. Matriz de Transiciones Permitidas

| Estado Actual | Transición Válida Hacia | Disparador Habitual |
| :--- | :--- | :--- |
| **NUEVO** | `CONFIRMADO`, `CANCELADO` | Validación de pago o aceptación por operador. |
| **CONFIRMADO** | `EN_ALISTAMIENTO`, `CANCELADO` | Inicio de picking o empaque en bodega. |
| **EN_ALISTAMIENTO** | `LISTO`, `CANCELADO` | Finalización de empaque y rotulación de paquete. |
| **LISTO** | `FINALIZADO`, `CANCELADO` | Entrega en mano o entrega al transportador. |
| **FINALIZADO** | *(Terminal - Sin transiciones)* | Archivo histórico. |
| **CANCELADO** | *(Terminal - Sin transiciones)* | Registro de motivo de cancelación. |

---

## 4. Invariantes del Modelo

1. **Moneda Consistente:** La moneda (`currency`) de la orden siempre coincide con la moneda configurada en la tienda base (Capa 1).
2. **Totales Inmutables tras Finalización:** Una vez que el pedido alcanza el estado `FINALIZADO` o `CANCELADO`, sus líneas de pedido (`items`), valores y subtotales no pueden ser mutados.
3. **Auditoría de Eventos:** Todo cambio de estado genera una traza con sello de tiempo (`timestamp`) y el identificador del operador o bot que ejecutó la acción.
