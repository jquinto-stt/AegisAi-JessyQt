# Web Orders Dashboard Specification

## Purpose

Defines the frontend management interface for kitchen staff and business owners (`packages/apps/web/modules/app/src/compositions/pedidos`).

## Features & Views

### 1. Active Orders Board (Kanban / Columns)
- Displays columns for `Recibidos`, `En preparación`, `Listos`, and `Entregados`.
- Real-time sound notification and visual glow when new orders arrive.
- Single-click action buttons to advance order to the next stage (`Aceptar`, `Marcar Listo`, `Entregar`).
- Detail drawer / modal displaying customer contact info, special notes, and item breakdown.

### 2. Conversation & WhatsApp Controls (`ConversationControlBar`)
- Integrated action buttons to send direct WhatsApp messages or pre-configured message templates.
- Quick status notification resend in case of customer network issues.

### 3. Historical Views & Search
- Full order history list with filters by date range, delivery type, and customer phone.
- CSV/Excel export for accountant or inventory auditing.

### 4. Key Metrics Bar
- Today's completed order count.
- Today's revenue.
- Average preparation time (minutes).
- Top 3 bestselling menu items.
