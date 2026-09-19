import { describe, it, expect } from "vitest";
import {
  calculateItemTotal,
  calculateOrderSubtotal,
  calculateOrderTotal,
  type OrderCore,
  type OrderItem,
} from "./pedidos.domain.js";
import {
  BUSINESS_PROFILES,
  hasCapability,
} from "./pedidos.profiles.js";

describe("Domain: Pedidos Core", () => {
  it("calcula el total de un item simple sin modificadores", () => {
    const item: OrderItem = {
      id: "1",
      nameSnapshot: "Remera Oversize",
      unitPrice: 25000,
      quantity: 2,
    };
    expect(calculateItemTotal(item)).toBe(50000);
  });

  it("calcula el total de un item con modificadores (ej. Comida)", () => {
    const item: OrderItem = {
      id: "2",
      nameSnapshot: "Hamburguesa Doble",
      unitPrice: 18000,
      quantity: 2,
      modifiersSnapshot: [
        { name: "Extra Queso Cheddar", priceDelta: 3000 },
        { name: "Sin Cebolla", priceDelta: 0 },
      ],
    };
    // (18000 + 3000 + 0) * 2 = 42000
    expect(calculateItemTotal(item)).toBe(42000);
  });

  it("calcula el subtotal y total con envío de un pedido", () => {
    const order: Pick<OrderCore, "items" | "fulfillment"> = {
      items: [
        { id: "1", nameSnapshot: "Jean Slim Fit", unitPrice: 40000, quantity: 1 },
        { id: "2", nameSnapshot: "Medias Pack x3", unitPrice: 8000, quantity: 2 },
      ],
      fulfillment: {
        type: "shipment",
        status: "dispatched",
        shippingCost: 7500,
      },
    };

    expect(calculateOrderSubtotal(order)).toBe(56000);
    expect(calculateOrderTotal(order)).toBe(63500);
  });

  it("permite representar un pedido de Moda con variantes sin alterar el Core", () => {
    const fashionOrder: OrderCore = {
      id: "ord-f1",
      number: "P-101",
      customer: { name: "Lucía Pérez", phone: "+573001234567" },
      items: [
        {
          id: "it-1",
          nameSnapshot: "Camisa de Lino",
          unitPrice: 35000,
          quantity: 1,
          variantSnapshot: {
            sku: "CAM-LIN-M-AZU",
            label: "M / Azul",
            attributes: { talla: "M", color: "Azul" },
          },
        },
      ],
      payment: { status: "paid", method: "card", amountPaid: 45000 },
      fulfillment: {
        type: "shipment",
        status: "dispatched",
        shippingCost: 10000,
        courier: "Servientrega",
        trackingNumber: "ENV-998877",
      },
      lifecycle: "open",
      origin: "web",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    expect(fashionOrder.items[0].variantSnapshot?.attributes.talla).toBe("M");
    expect(fashionOrder.fulfillment.trackingNumber).toBe("ENV-998877");
    expect(calculateOrderTotal(fashionOrder)).toBe(45000);
  });

  it("permite representar un pedido de Servicios con citas sin alterar el Core", () => {
    const serviceOrder: OrderCore = {
      id: "ord-s1",
      number: "P-201",
      customer: { name: "Mateo Gómez", phone: "+573109876543" },
      items: [
        {
          id: "it-s1",
          nameSnapshot: "Corte y Perfilado de Barba",
          unitPrice: 20000,
          quantity: 1,
          serviceSnapshot: {
            durationMinutes: 45,
            scheduledAt: "2026-09-20T15:00:00.000Z",
            professionalName: "Barbero Carlos",
          },
        },
      ],
      payment: { status: "pending", method: "cash" },
      fulfillment: {
        type: "service",
        status: "in_preparation",
      },
      lifecycle: "open",
      origin: "whatsapp",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    expect(serviceOrder.items[0].serviceSnapshot?.durationMinutes).toBe(45);
    expect(serviceOrder.payment.status).toBe("pending");
  });
});

describe("Domain: Business Profiles & Capabilities", () => {
  it("los presets exponen sus capacidades declarativas correctamente", () => {
    const foodProfile = BUSINESS_PROFILES.food;
    expect(hasCapability(foodProfile.defaultCapabilities, "modifiers")).toBe(true);
    expect(hasCapability(foodProfile.defaultCapabilities, "variants")).toBe(false);

    const fashionProfile = BUSINESS_PROFILES.fashion;
    expect(hasCapability(fashionProfile.defaultCapabilities, "variants")).toBe(true);
    expect(hasCapability(fashionProfile.defaultCapabilities, "modifiers")).toBe(false);
    expect(hasCapability(fashionProfile.defaultCapabilities, "carrier_shipment")).toBe(true);
  });
});
