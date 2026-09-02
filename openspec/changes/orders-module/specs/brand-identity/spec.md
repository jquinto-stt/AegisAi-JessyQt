# Brand Identity Specification — Necto Pedidos

## Purpose

Establishes the strategic positioning, value proposition, tone of voice, and visual communication principles for Necto's Orders module.

## Strategic Identity

### Purpose & Mission
- **Purpose**: Free local businesses from manual order taking, missed phone calls, and high commission platform fees by transforming WhatsApp into their direct, automated sales channel.
- **Mission**: Provide a fast, accessible, zero-friction ordering experience where customers order in seconds via WhatsApp and merchants control operations effortlessly from a web panel.

### Value Proposition
> *"Turn your WhatsApp into an automated sales and order machine with zero friction for your customers and total operational control for you."*

## Target Audiences

- **Gastronomy & Food Businesses**: Pizzerias, burger joints, dark kitchens, cafes, bakeries.
- **Local Retail & Neighborhood Shops**: Convenience stores, beverage distributors, specialized boutiques.
- **Direct-to-Consumer Producers**: Artisan foods, meal-prep services, craft goods.

## Tone of Voice Guidelines

| Principle | Guideline | Example |
|---|---|---|
| **Fast & Clear** | Short, direct messages with actionable steps. | *"Tu pedido #104 está en preparación. Tiempo estimado: 20 min."* |
| **Warm & Natural** | Friendly, conversational tone that sounds like a real shop assistant. | *"¡Hola! Acá tenés nuestras pizzas del día. ¿Cuál te gustaría pedir?"* |
| **Reliable & Precise** | Clear order summaries, itemized costs, and explicit status notifications. | *"Resumen: 1x Burger Doble ($5.500) + 1x Papas ($2.000). Total: $7.500."* |
| **No Jargon** | Never expose backend or machine learning terminology. | Say *"Buscando en el menú"* instead of *"Procesando query de catálogo"*. |

## Visual Identity & Design Language

- Utilizes the **Elements** design system (`packages/apps/web/modules/app/src/elements`).
- **Color Coding for Order Lifecycle**:
  - 🔵 **Primary Blue (`RECEIVED`)**: Incoming orders requiring review.
  - 🟡 **Amber / Warning (`PREPARING`)**: Orders currently being cooked or packed.
  - 🟢 **Success Green (`READY`)**: Finished orders awaiting pickup or courier departure.
  - ⚪ **Muted Neutral (`DELIVERED`)**: Completed historical orders.
  - 🔴 **Destructive Red (`CANCELLED`)**: Voided orders.
