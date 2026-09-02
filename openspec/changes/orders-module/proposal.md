# Proposal: Necto Orders Module (Módulo de Pedidos)

## Executive Summary

The **Orders Module (Módulo de Pedidos)** is Necto's core commerce engine. It allows local businesses to receive, manage, and dispatch orders placed by customers over WhatsApp without manual phone calls or third-party commission fees. Business owners configure their catalog, set opening hours and preparation times, and manage orders in real-time from a dedicated web dashboard, while customers receive automated updates and order tracking directly in their WhatsApp chat.

## Scope

### In Scope
- **Product & Catalog Management**: Items, descriptions, pricing, product photos, categories, and item availability toggle.
- **WhatsApp Customer Flow**: Automated order intent detection, catalog queries, instant order confirmation, and conversational status tracking (*"¿Cómo va mi pedido?"*).
- **Web SPA Orders Dashboard (`compositions/pedidos`)**: Real-time Kanban order board (`RECEIVED` → `PREPARING` → `READY` → `DELIVERED`), audio/visual alerts, and conversation control bar.
- **Business Operational Rules**: Opening hours enforcement, estimated preparation times, and cancellation rules.
- **Dedicated Cloud Infrastructure**: SST v3 infrastructure defining `Pedidos@Table` (DynamoDB), Lambda handlers for catalog & order operations, and API routing.
- **Brand Identity & Communication Tone**: Strategic value proposition, tone of voice, and brand messaging standards for Necto Pedidos.

### Out of Scope
- Non-order modules (e.g. Inventarios, Agendamiento, Reservas, Turnos).

## Domain Architecture

```text
                                  ┌────────────────────────┐
                                  │   Customer (WhatsApp)  │
                                  └───────────┬────────────┘
                                              │ Orders & Status Checks
                                              ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        Necto — Pedidos Domain                          │
│                                                                        │
│   ┌──────────────────────────┐         ┌───────────────────────────┐   │
│   │   Web Dashboard (SPA)    │         │     Cloud Backend         │   │
│   │   - Active Orders Board  │ ◄─────► │     - Pedidos@Api         │   │
│   │   - Catalog Manager      │         │     - Pedidos@Table       │   │
│   │   - WhatsApp Widget      │         │       (DynamoDB)          │   │
│   └──────────────────────────┘         └───────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```
