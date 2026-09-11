# 02 — Canal WhatsApp: Conexión de Tienda & Asistente de Pedidos

Este documento detalla el diseño del canal **WhatsApp** en Necto, estructurado bajo el principio de separación de responsabilidades en dos niveles.

---

## 1. Desacoplamiento del Canal en Dos Niveles

Uno de los errores más comunes de diseño es mezclar la conexión técnica del canal telefónico con la lógica de ventas del asistente virtual. En Necto, WhatsApp se divide en dos niveles claramente delimitados:

```
┌────────────────────────────────────────────────────────────────────────┐
│ NIVEL 1: CONEXIÓN TÉCNICA DEL NÚMERO (PROPIEDAD DE LA TIENDA / TENANT) │
│                                                                        │
│ • La línea telefónica le pertenece a la tienda, no a un módulo.        │
│ • Vinculación mediante QR o Meta Cloud API (WABA).                     │
│ • Estado de conexión: Conectado / Desconectado.                        │
│ • Webhook de recepción de mensajes entrantes.                          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼ Entrega mensajes al módulo activo
┌────────────────────────────────────────────────────────────────────────┐
│ NIVEL 2: ASISTENTE COMERCIAL & FLUJO DE VENTAS (MÓDULO DE PEDIDOS)     │
│                                                                        │
│ • Nombre del Asistente (ej. "Asesor Técnico", "Asesora Camila").       │
│ • Tono de Atención (Cálido, Profesional, Técnico, Ágil).               │
│ • Plantilla de Mensaje de Bienvenida comercial.                        │
│ • Flujo de toma de pedidos, cotizaciones y captura de entrega.         │
│ • Inyección de pedidos directo al pipeline Kanban.                     │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Nivel 1: Conexión en la Tienda (Tenant Level)

La tienda administra la línea física o virtual mediante la siguiente estructura de datos:

```typescript
export interface StoreWhatsAppIntegration {
  status: "disconnected" | "connecting" | "connected";
  provider: "meta_cloud_api" | "baileys_qr" | "manual";
  phoneNumber?: string;
  wabaId?: string;
  connectedAt?: string;
  webhookUrl: string;
}

export interface StoreContext {
  storeId: string;
  storeName: string;
  country: string;
  currency: string;
  whatsapp: StoreWhatsAppIntegration;
}
```

La tienda no sabe qué responderá el bot. Su única función es **mantener el túnel de comunicación abierto** y recibir/enviar paquetes de datos crudos.

---

## 3. Nivel 2: Asistente Virtual en el Módulo Pedidos

Cuando el módulo **Pedidos** está activo en la tienda y la conexión de WhatsApp está establecida, el módulo habilita su configuración de experiencia comercial:

```typescript
export interface PedidosBotConfiguration {
  enabled: boolean;
  botName: string;
  tone: "calido" | "profesional" | "tecnico" | "agil";
  greetingTemplate: string;
  orderConfirmationTemplate: string;
  autoDraftOrders: boolean;
  captureAddressAutomatically: boolean;
}
```

### Opciones de Tono Predefinidas:

| Tono | Estilo de Comunicación | Ejemplo de Saludo |
| :--- | :--- | :--- |
| **Cálido** | Cercano, empático y cordial | *"¡Hola! Bienvenido a {storeName}. ¿Qué estilo o producto te gustaría ver hoy?"* |
| **Profesional** | Formal, sobrio y directo | *"Estimado cliente, bienvenido a {storeName}. Indíquenos su requerimiento para asistirle."* |
| **Técnico** | Preciso, basado en especificaciones | *"Bienvenido a {storeName}. Indique referencia, calibre o medidas de los insumos requeridos."* |
| **Ágil** | Rápido, comercial y enfocado a conversión | *"¡Hola! Bienvenido a {storeName}. Escríbenos tu pedido y te confirmamos disponibilidad inmediata."* |

---

## 4. El Patrón Channel Adapter en Pedidos

En el módulo de Pedidos, el canal de WhatsApp se implementa como un **Channel Adapter** agnóstico de industria:

```
        MENSAJE ENTRANTE POR WHATSAPP (Línea de la Tienda)
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                 WHATSAPP ADAPTER (PEDIDOS)                  │
│                                                             │
│ 1. Consulta contexto de tienda: storeName, currency         │
│ 2. Consulta configuración del bot: botName, tone, greeting  │
│ 3. Consulta catálogo disponible para venta                  │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
  Genera respuesta contextual y borrador de orden en el Kanban
```

### Implementación del Procesador:

```typescript
export interface IncomingWhatsAppMessage {
  fromPhone: string;
  customerName: string;
  text: string;
  timestamp: string;
}

export function processWhatsAppOrderMessage(
  message: IncomingWhatsAppMessage,
  store: StoreContext,
  botConfig: PedidosBotConfiguration,
  saleItems: Array<{ id: string; name: string; price: number }>
): { replyText: string; draftOrderCreated?: boolean } {
  const { customerName, text } = message;

  // 1. Detección de saludo inicial
  if (isFirstContact(text)) {
    const replyText = botConfig.greetingTemplate
      .replace("{customerName}", customerName)
      .replace("{storeName}", store.storeName);

    return { replyText };
  }

  // 2. Procesamiento de intención de compra
  const matched = findMatchingItems(text, saleItems);
  if (matched.length > 0) {
    const total = matched.reduce((acc, it) => acc + it.price, 0);
    const summary = matched.map(it => `• 1x ${it.name} - $${it.price.toLocaleString()} ${store.currency}`).join("\n");

    const replyText = 
      `Perfecto ${customerName}, he tomado nota de tu solicitud para ${store.storeName}:\n\n` +
      `${summary}\n\n` +
      `Total estimado: $${total.toLocaleString()} ${store.currency}.\n` +
      `¿Deseas confirmar este pedido con entrega o retiro en tienda?`;

    return { replyText, draftOrderCreated: true };
  }

  // 3. Fallback comercial asistido
  return {
    replyText: `Gracias por comunicarte con ${store.storeName}. En un momento uno de nuestros asesores continuará tu atención.`
  };
}
```

---

## 5. Regla de Oro de Mantenimiento

Bajo ninguna circunstancia el código de recepción de WhatsApp debe contener sentencias como:
- `if (storeType === "restaurant")`
- `if (storeType === "hardware")`

La personalidad, el catálogo y las respuestas se alimentan **exclusivamente de los parámetros de configuración inyectados por el Tenant y el Módulo Pedidos**.
