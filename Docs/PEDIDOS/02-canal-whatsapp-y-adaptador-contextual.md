# 02 — Canal WhatsApp & Adaptador Contextual

Este documento detalla el diseño del canal **WhatsApp** en Necto OMS y cómo opera el patrón **Channel Adapter** para erradicar las bifurcaciones de industria (`if / else`).

---

## 1. El Error del Acoplamiento por Industria

En arquitecturas monolíticas o mal diseñadas, el bot de WhatsApp suele contener código de este estilo:

```typescript
// ❌ ANTI-PATRÓN: Acopla industrias dentro del canal
if (businessType === "restaurant") {
  greeting = "¡Hola! Bienvenido a nuestra hamburguesería. ¿Quieres papas o gaseosa?";
  suggestedItems = ["Combo Doble", "Papas Rústicas"];
} else if (businessType === "hardware_store") {
  greeting = "¡Hola mi niño! Bienvenido a la ferretería. ¿Qué tornillo buscas?";
  suggestedItems = ["Taladro 650W", "Tornillos Drywall"];
} else if (businessType === "shoes") {
  greeting = "¡Hola! Bienvenido a la tienda de calzado...";
  suggestedItems = ["Zapatos Oxford", "Mocasines"];
}
```

### ¿Por qué este anti-patrón fracasa?
1. **Rompe el principio Abierto/Cerrado (OCP):** Cada vez que se crea un negocio de un rubro nuevo (joyería, farmacia, autopartes), hay que entrar a editar el código fuente del bot.
2. **Convierte a Pedidos en una mole rígida:** La lógica del bot se llena de excepciones y supuestos que no aplican a todos los negocios de un mismo rubro.
3. **No respeta la identidad de cada marca:** Asume que todas las ferreterías hablan igual o que todos los restaurantes venden hamburguesas.

---

## 2. El Patrón Channel Adapter

En Necto OMS, el canal WhatsApp es un **adaptador de entrada (Inbound Channel Adapter)** agnóstico que consulta el **Tenant Context**:

```
      MENSAJE ENTRANTE DEL CLIENTE POR WHATSAPP
                        │
                        ▼
       ┌─────────────────────────────────┐
       │   WHATSAPP ADAPTER (Agnóstico)  │
       │                                 │
       │  1. ¿Qué tenantId usa la línea? │
       │  2. Obtener TenantContext       │
       └────────────────┬────────────────┘
                        │
                        ▼
         ┌──────────────────────────────┐
         │        TENANT CONTEXT        │
         ├──────────────────────────────┤
         │ • storeName: "Zapatería Real"│
         │ • botName: "Asesora Camila"  │
         │ • greeting: "Bienvenido..."  │
         │ • tone: "elegante"           │
         │ • catalog: [ Zapatos, Botas ]│
         └──────────────┬───────────────┘
                        │
                        ▼
     RESPUESTA GENERADA CON LA IDENTIDAD DEL TENANT
```

---

## 3. Implementación del Adaptador

El código del adaptador de WhatsApp no conoce conceptos como "platos", "tornos" o "recetas". Solo conoce **catálogo, saludo e identidad**:

```typescript
export function handleIncomingWhatsAppMessage(
  message: IncomingMessage,
  tenant: TenantContext
): BotResponse {
  const { customerName, text } = message;
  const { storeName, customerExperience, catalog } = tenant;

  // 1. Mensaje de bienvenida contextual
  if (isGreeting(text)) {
    const greeting = customerExperience.greetingTemplate
      ? customerExperience.greetingTemplate
          .replace("{customerName}", customerName)
          .replace("{storeName}", storeName)
      : `¡Hola ${customerName}! Bienvenido a ${storeName}. ¿En qué podemos ayudarte hoy?`;

    return { text: greeting };
  }

  // 2. Solicitud de catálogo o compra
  if (isOrderOrInquiryRequest(text)) {
    // Busca coincidencias en el catálogo del tenant o toma los productos más destacados
    const matchedProducts = findCatalogMatches(text, catalog);
    const selectedItems = matchedProducts.length > 0 
      ? matchedProducts 
      : catalog.slice(0, 2);

    const draft = buildDraftOrder(selectedItems);

    return {
      text: `¡Con gusto, ${customerName}! Te armé el borrador de tu pedido para ${storeName}:\n\n` +
            draft.items.map(i => `• ${i.quantity}× ${i.name} ($${i.unitPrice.toLocaleString()})`).join("\n") +
            `\n\n• **Total:** $${draft.total.toLocaleString()} ${tenant.currency}\n\n` +
            `¿Deseas agregar algún producto adicional o confirmamos tus datos para entrega?`,
      draftOrder: draft,
    };
  }

  // 3. Recepción de comprobante de pago
  if (hasPaymentReceiptAttachment(message)) {
    return {
      text: `¡Excelente! Hemos recibido tu comprobante de pago. Un asesor de ${storeName} está validando la transferencia para pasar tu pedido a preparación y despacho.`,
    };
  }

  return {
    text: `Gracias por contactar a ${storeName}. En breve un asesor continuará con tu solicitud.`,
  };
}
```

---

## 4. Comparativa de Ejecución en Tiempo Real

Sin cambiar una sola línea de código en el adaptador, el comportamiento varía según el Tenant activo:

### Caso A: Zapatería Elegance
- **Tenant:** `{ storeName: "Zapatería Elegance", currency: "COP", catalog: [ "Mocasín Cuero", "Betún" ] }`
- **Respuesta:**  
  *"¡Hola Carlos! Con gusto, te armé el borrador de tu pedido para Zapatería Elegance:*  
  *• 1× Mocasín Cuero Talla 41 ($180.000 COP)*  
  *• 1× Betún Crema ($15.000 COP)*  
  *Total: $195.000 COP. ¿Deseas confirmar tus datos de entrega?"*

### Caso B: Farmacia Central
- **Tenant:** `{ storeName: "Farmacia Central", currency: "COP", catalog: [ "Ibuprofeno 400mg", "Suero Oral" ] }`
- **Respuesta:**  
  *"¡Hola Carlos! Con gusto, te armé el borrador de tu pedido para Farmacia Central:*  
  *• 2× Ibuprofeno 400mg Caja ($16.000 COP)*  
  *• 1× Suero Oral Manzana ($8.500 COP)*  
  *Total: $24.500 COP. ¿Deseas confirmar tus datos de entrega?"*

---

## 5. Ventajas de esta Arquitectura

1. **Escalabilidad Infinita:** Si el cliente mañana crea una tienda de antigüedades, una librería o una ferretería industrial, el sistema funciona de inmediato cargando su catálogo y nombre en el Tenant.
2. **Mantenibilidad Cero en Código Core:** Los equipos de producto configuran la personalidad y el catálogo desde la interfaz de la tienda, sin requerir despliegues de código.
3. **Desacoplamiento Absoluto:** El motor OMS procesa pedidos y transiciones de estado exactamente igual para cualquier industria.
