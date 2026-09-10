# Arquitectura de OMS Agnóstico y Canal Principal WhatsApp (StockFlow / NECTO)

Bienvenido a la especificación técnica y de diseño para la evolución del módulo de Pedidos hacia un **Order Management System (OMS) completamente agnóstico y multitienda**, centrado en **WhatsApp Conversational Commerce** como canal de entrada primario.

---

## 📚 Índice de la Documentación

1. **[01. Visión y Desacoplamiento de Dominio](./01-vision-y-desacoplamiento.md)**
   - Diagnóstico de la contaminación de dominio (por qué el sistema se transformó en una tienda de comida).
   - Definición del verdadero OMS agnóstico y separación de capas de responsabilidad.
   - Matriz de arquetipos de negocio (Retail, B2B, Servicios y Gastronomía como plantilla opcional).

2. **[02. Onboarding y Configuración Dinámica Multi-Tienda](./02-onboarding-y-configuracion-multitienda.md)**
   - Análisis del wizard de creación de tienda (`OnboardingPage.tsx`).
   - Motor de vocabulario dinámico (`BusinessSemanticConfig`): cómo la UI adapta sus términos sin duplicar código.
   - Generación automática de roles específicos según la vertical de la tienda.

3. **[03. El Canal Principal: WhatsApp Conversational Commerce](./03-canal-whatsapp-conversacional.md)**
   - Arquitectura end-to-end: Cliente WhatsApp <-> Webhooks <-> Parser IA <-> Bandeja NECTO.
   - Protocolo Human-in-the-Loop (HITL): control manual del chat, ajuste de ítems y cobro.
   - Notificaciones automáticas de trazabilidad hacia el WhatsApp del cliente.

4. **[04. Modelo de Datos Agnóstico y Máquina de Estados](./04-modelo-de-datos-y-maquina-de-estados.md)**
   - Entidades base: `Order`, `OrderLineItem`, `OrderCustomer`, `Payment` y `Fulfillment`.
   - Máquina de estados universal (`draft` -> `received` -> `confirmed` -> `in_preparation` -> `ready_for_dispatch` -> `dispatched` -> `delivered`).
   - Integración idempotente con el inventario Kardex de `ModuloInventario`.

5. **[05. Plan Táctico de Refactor y Migración](./05-plan-de-refactor-y-migracion.md)**
   - Hoja de ruta en 4 fases progresivas sin romper código existente.
   - Aislamiento del KDS como un adaptador condicional para tiendas de comida.
   - Matriz de pruebas y criterios de aceptación (Definition of Done).
