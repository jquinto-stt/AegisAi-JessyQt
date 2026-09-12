/**
 * Necto Event Bus Contract
 * Strongly typed events for cross-module decoupled communication.
 */

import type { StorePaceMode } from "../compositions/pedidos/types";
import type { OrderChannel, OrderItem, OrderStatus } from "./order.contract";

export interface NectoEventsMap {
  necto_navigate_pedidos: { section: string };
  necto_open_settings: { tab?: string };
  necto_layout_changed: { layout: string };
  necto_whatsapp_config_changed: { config: unknown };
  necto_preparacion_toggle: { active: boolean };
  necto_store_pace_changed: { mode: StorePaceMode };

  draftOrderConfirmed: {
    conversationId: string;
    items: OrderItem[];
    channel: OrderChannel;
    customerName: string;
    customerPhone?: string;
    notes?: string;
    total?: number;
  };

  orderStateChanged: {
    orderId: string;
    newState: OrderStatus;
    conversationId?: string;
  };
}

export type NectoEventType = keyof NectoEventsMap;

export type NectoEventPayload<T extends NectoEventType> = NectoEventsMap[T];
