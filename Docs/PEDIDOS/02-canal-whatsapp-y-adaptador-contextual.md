# 02 — Canales de Entrada, Integraciones & Onboarding Contextual

Este documento detalla cómo opera el canal **WhatsApp Business** como servicio habilitador de la tienda y cómo se orquesta el **onboarding contextual no bloqueante** al instalar el módulo de Pedidos.

---

## 1. WhatsApp es una Integración de la Tienda, no Pedidos

WhatsApp **no es un módulo de negocio** ni debe considerarse una dependencia obligatoria de Pedidos:

```
                         TIENDA / TENANT
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
     PEDIDOS                INVENTARIO               CLIENTES
  (Capacidad OMS)       (Capacidad Kardex)        (Capacidad CRM)
        │
        │ Consume canales habilitados
        ▼
 ┌──────────────────────────────────────────────────────┐
 │             CANALES DE ENTRADA ACTIVOS               │
 │                                                      │
 │  • WhatsApp Business (Servicio conectado a Tienda)   │
 │  • Tienda Web (Catálogo online)                      │
 │  • Ingreso Manual (POS / Mostrador / Telefónico)     │
 │  • API Pública (Integraciones de terceros)           │
 └──────────────────────────────────────────────────────┘
```

### Por qué WhatsApp no pertenece exclusivamente a Pedidos:
Una línea oficial de WhatsApp conectada al comercio puede ser aprovechada transversalmente por:
- **Pedidos:** Recepción de compras, cotizaciones y envío de recibos de despacho.
- **Clientes / CRM:** Soporte técnico, fidelización y seguimiento postventa.
- **Notificaciones del Sistema:** Alertas al dueño de la tienda por caja cerrada o incidentes.
- **Agentes de Inteligencia Artificial:** Asesoría automatizada de catálogo.

---

## 2. Onboarding Contextual al Instalar Pedidos

Cuando el usuario agrega la capacidad de **Pedidos** desde el catálogo de módulos, la aplicación no lo bloquea exigiendo una cuenta de WhatsApp. En su lugar, despliega un modal de configuración de canales con opción de continuar:

```
┌─────────────────────────────────────────────────────────────┐
│              Activa los canales de tus pedidos              │
│                                                             │
│ El módulo Pedidos puede recibir órdenes desde diferentes    │
│ canales. Configura las vías de entrada para tu operación:   │
│                                                             │
│ [x] WhatsApp Business                                       │
│     Recibe órdenes y atiende clientes por chat automatizado │
│                                                             │
│ [ ] Tienda Web                                              │
│     Publica tu catálogo en línea para autoservicio          │
│                                                             │
│ [ ] API & Webhooks                                          │
│     Recibe pedidos desde aplicaciones externas              │
│                                                             │
│ [x] Ingreso Manual / Mostrador                              │
│     Toma pedidos telefónicos y venta presencial directa     │
│                                                             │
│ ─────────────────────────────────────────────────────────── │
│ [ Conectar WhatsApp Business ]    [ Continuar sin conectar] │
└─────────────────────────────────────────────────────────────┘
```

### Principios del Modal de Activación:
1. **Nunca Obligatorio:** Si el usuario selecciona *"Continuar sin conectar"*, el módulo de Pedidos se instala y queda operativo de inmediato para venta manual/mostrador.
2. **Claridad de Estado (Readiness):** Si WhatsApp no está conectado, el dashboard de Pedidos muestra un aviso informativo discreto:  
   *"Pedidos está instalado. Para recibir órdenes automáticas por chat, conecta tu WhatsApp Business en [Configurar Canales]"*.

---

## 3. Onboarding Contextual para Otros Módulos

El mismo patrón de experiencia se aplica al instalar otras capacidades de la plataforma:

### Al Instalar Inventarios:
- Pregunta: *¿Tienes productos para importar?*
- Opciones: `[ Importar CSV/Excel ]` o `[ Empezar desde cero ]`.
- Pregunta: *¿Gestionarás una sola bodega o múltiples almacenes?*
- Acción: `[ Guardar ]` o `[ Configurar más tarde ]`.

### Al Instalar Clientes:
- Pregunta: *¿Deseas importar tu base de clientes actual?*
- Opciones: `[ Importar contactos ]` o `[ Crear clientes a medida que compren ]`.

---

## 4. Estado de Configuración y Salud de la Tienda (Readiness Health)

La tienda mantiene un registro claro del estado de preparación de sus componentes:

```typescript
export interface StoreReadinessHealth {
  baseSettings: {
    identityCompleted: boolean;
    hoursConfigured: boolean;
    teamMembersCount: number;
  };
  activeModules: Array<{
    key: "pedidos" | "inventarios" | "clientes" | "turnos";
    status: "ready" | "needs_attention";
    attentionMessage?: string;
  }>;
  channels: {
    whatsapp: {
      connected: boolean;
      phoneNumber?: string;
    };
    webStore: {
      enabled: boolean;
      url?: string;
    };
    posManual: {
      enabled: boolean;
    };
  };
}
```

Esto permite al sistema guiar al usuario paso a paso de forma natural, sin interrumpir su flujo de trabajo ni forzar decisiones prematuras.
