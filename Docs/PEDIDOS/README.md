# Necto OMS — Arquitectura de Módulos Universales & Tenant Context

> **Principio Fundamental:**  
> *"No estamos construyendo un sistema de pedidos adaptable con bifurcaciones de industrias (`if / else`). Estamos construyendo un ecosistema de **módulos universales** que pueden acoplarse a cualquier tienda. El módulo de **Pedidos conserva un núcleo OMS universal**, pero consume el **contexto y la identidad de la tienda (Tenant)** para proporcionar una experiencia comercial específica."*

---

## 1. El Modelo Conceptual

```
                  ┌───────────────────────────────┐
                  │        TIENDA / TENANT        │
                  │   "Ferretería El Albañil"     │
                  └──────────────┬────────────────┘
                                 │
            ┌────────────────────┴────────────────────┐
            │                                         │
 ┌──────────▼──────────┐                   ┌──────────▼──────────┐
 │    CONFIGURACIÓN    │                   │   MÓDULOS DE TIENDA  │
 │     DEL TENANT      │                   │    (PLUG & PLAY)    │
 ├─────────────────────┤                   ├─────────────────────┤
 │ • Nombre: Ferretería│                   │ 01. Pedidos (OMS)   │
 │ • Moneda: COP       │                   │ 02. Inventarios     │
 │ • Identidad / Bot   │                   │ 03. Turnos & Caja   │
 │ • Catálogo Maestro  │                   │ 04. Reservas        │
 └──────────┬──────────┘                   └──────────┬──────────┘
            │                                         │
            │          Inyecta Contexto               │
            └────────────────────┬────────────────────┘
                                 │
                       ┌─────────▼─────────┐
                       │   MÓDULO PEDIDOS  │
                       │   (OMS Universal) │
                       └─────────┬─────────┘
                                 │
                ┌────────────────┼────────────────┐
                │                │                │
         ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐
         │  WhatsApp   │  │  Portal Web │  │ Mostrador   │
         │  (Adapter)  │  │  (Checkout) │  │    (POS)    │
         └──────┬──────┘  └─────────────┘  └─────────────┘
                │
                ▼
      Bot con Identidad de la Tienda
      "¡Hola! Bienvenido a Ferretería El Albañil..."
```

---

## 2. Las Dos Claves de la Arquitectura

### Clave 1: Capacidad Universal del Módulo OMS
El módulo de Pedidos **siempre gestiona las mismas primitivas de negocio**, sin importar si vende zapatos, hamburguesas, medicamentos o taladros:
- Órdenes & Líneas de pedido (`Order`, `OrderItem`).
- Clientes & Destinatarios (`Customer`).
- Cantidades, Monedas, Precios & Totales.
- Estados universales de pedido (`NUEVO → CONFIRMADO → EN_PROCESO → LISTO → FINALIZADO`).
- Canales de ingreso (WhatsApp Bot, Web, POS Mostrador).
- Modos de fulfillment (Retiro en tienda, Envío a domicilio).
- Historial de transacciones y eventos.

### Clave 2: Identidad & Configuración del Tenant
La tienda le suministra al módulo su identidad mediante un contrato tipado (`TenantContext`):

```typescript
interface TenantContext {
  tenantId: string;
  storeName: string;
  currency: "COP" | "USD" | "MXN" | "ARS" | string;
  city?: string;
  channels: {
    whatsapp: boolean;
    web: boolean;
    pos: boolean;
  };
  customerExperience: {
    botName?: string;
    greetingTemplate: string; // "¡Hola! Bienvenido a {storeName}..."
    tone: "cálido" | "profesional" | "técnico" | "desenfadado";
    language: "es-CO" | "es-MX" | "es-AR" | "en-US";
  };
  catalog: CatalogProduct[];
}
```

---

## 3. Comportamiento Dinámico según el Tenant

| Tienda (Tenant) | Lo que el Tenant inyecta | Experiencia en Pedidos (OMS) |
| :--- | :--- | :--- |
| **Ferretería El Albañil** | Nombre, catálogo de herramientas, garantía técnica, bot asesor. | El bot saluda como ferretería, cotiza taladros y tornillos, genera la orden para picking en bodega. |
| **Zapatería Elegance** | Nombre, catálogo de calzado (tallas, colores), bot de moda. | El bot pregunta talla de calzado, valida disponibilidad de stock y envía el pedido a empaque. |
| **Farmacia Central** | Nombre, catálogo de fármacos, bot de salud, atención 24/7. | El bot recibe la fórmula o consulta, toma dirección y agenda despacho express. |
| **Hamburguesería X** | Nombre, catálogo de combos y bebidas, bot gastronómico. | El bot toma el combo, pregunta extras/término y manda la orden a preparación. |

> **Regla de Oro:** En ningún caso el código interno del OMS contiene `if (businessType === "restaurant")` o `if (businessType === "shoes")`. El motor de pedidos ejecuta siempre la misma lógica universal; lo que varía es el **contexto que consume**.

---

## 4. Estructura de la Documentación

1. **[01. Modelo Conceptual Tenant + Módulos Plug & Play](./01-modelo-conceptual-tenant-modulos.md):**  
   Ciclo de vida de una tienda, espacio base sin módulos obligados, activación independiente y escenarios de prueba canónicos.
2. **[02. Canal WhatsApp & Adaptador Contextual](./02-canal-whatsapp-y-adaptador-contextual.md):**  
   Arquitectura del Bot de WhatsApp, patrón *Channel Adapter*, eliminación de heurísticas de industria y resolución dinámica del catálogo.
3. **[03. Comunicación Inter-Módulos mediante Contratos y Eventos](./03-comunicacion-inter-modulos-eventos-y-catalogo.md):**  
   Propiedad del catálogo maestro, eventos de dominio (`order.created`, `order.confirmed`, `stock.reserved`), arquitectura hexagonal y desacoplamiento.
4. **[04. Contratos de Datos, Tipos y Ciclo de Vida OMS](./04-contratos-interfaces-y-ciclo-de-vida-oms.md):**  
   Definición técnica formal de interfaces en TypeScript, estados universales de una orden y transiciones permitidas.
