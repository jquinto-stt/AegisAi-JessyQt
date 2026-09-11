# Necto OMS — Arquitectura de Módulos, Ownership & Canales Habilitadores

> **La Regla de Oro de la Arquitectura:**  
> *"No diseñes los módulos como aplicaciones aisladas ni dupliques capacidades entre ellos. Cada módulo debe tener un dominio funcional claramente delimitado. Cuando un módulo necesite información o una capacidad perteneciente a otro módulo, debe consumirla mediante una integración entre módulos, no replicarla. Las integraciones externas, como WhatsApp Business, deben tratarse como canales o servicios conectables a la tienda y no como una dependencia obligatoria de Pedidos. Al instalar un módulo, mostrar un onboarding contextual para configurar sus dependencias y canales recomendados, permitiendo continuar sin configurarlos."*

---

## 1. El Modelo Conceptual: Tienda, Integraciones & Módulos

```
                       TIENDA / TENANT
                              │
       ┌──────────────────────┼──────────────────────┐
       │                      │                      │
CONFIGURACIÓN BASE      INTEGRACIONES & CANALES    MÓDULOS DE NEGOCIO
• Identidad             • WhatsApp Business         • Pedidos (OMS)
• Horarios y días       • Tienda Web                • Inventarios (Kardex)
• Roles (Dueño, Admin)  • API Pública / Webhooks    • Clientes & CRM
• Estado de la tienda   • Notificaciones Email      • Turnos & Caja
```

---

## 2. Matriz de Ownership: Dominios sin Duplicidad

Para evitar que dos módulos compitan por la misma responsabilidad, se define una tabla estricta de propiedad funcional:

| Capacidad Funcional | Módulo Dueño | ¿Cómo lo usan otros módulos? |
| :--- | :--- | :--- |
| **Crear y recibir pedidos** | **Pedidos** | Canal de entrada genera la orden en Pedidos. |
| **Estados del pedido & Alistamiento** | **Pedidos** | Notifica a Clientes y dispara eventos a Inventario. |
| **Canales de entrada de órdenes** | **Pedidos** | Configura qué canales activos en Tienda alimentan el Kanban. |
| **Precios aplicados al pedido** | **Pedidos** | Toma el precio del catálogo y aplica recargos/descuentos. |
| **Productos e ítems para venta** | **Catálogo** | Pedidos e Inventario consultan la ficha del producto. |
| **Existencias, Entradas y Salidas** | **Inventarios** | Pedidos consulta disponibilidad en tiempo real. |
| **Reserva y Descuento de Stock** | **Inventarios** | Pedidos solicita: *"Reservar 3 unidades"* al confirmar venta. |
| **Bodegas y Ubicaciones físicas** | **Inventarios** | Pedidos muestra la ubicación de picking sugerida. |
| **Ficha de Clientes & Fidelidad** | **Clientes** | Pedidos asocia la orden al historial del cliente. |
| **Conexión oficial de WhatsApp** | **Integraciones / Tienda** | Canal compartido: Pedidos, Soporte, Notificaciones. |

### Ejemplo Práctico: Compra de 3 Unidades
1. **Pedidos** recibe la solicitud: *3 Coca-Colas ($5.000 c/u)*.
2. **Pedidos** consulta a **Inventarios**: *¿Stock disponible de Coca-Cola?* -> Inventarios responde: *20 unidades*.
3. Al pasar el pedido a `CONFIRMADO`:
   - Pedidos emite: *"Reservar 3 unidades de Coca-Cola"*.
   - Inventarios descuenta de disponible: *Nuevo disponible = 17 unidades*.
4. **No hay choque:** Pedidos no administra stock; consume la capacidad de Inventarios.

---

## 3. WhatsApp es un Canal Habilitador, no Pedidos

WhatsApp **no es un módulo** ni es una dependencia obligatoria de Pedidos:
- Un comercio puede operar Pedidos recibiendo órdenes exclusivamente por **Tienda Web**, **POS Mostrador**, **Llamadas telefónicas (Manual)** o **API**.
- WhatsApp es un **servicio conectable a nivel de Tienda**.
- Si la tienda conecta WhatsApp, el módulo de Pedidos puede utilizarlo como canal de venta con asistente virtual; pero mañana el módulo de Clientes puede usarlo para soporte posventa y Notificaciones para alertas operativas.

---

## 4. Onboarding Contextual al Instalar Capacidades

Al agregar un módulo al contenedor, el sistema no bloquea al usuario con prerrequisitos obligatorios. En su lugar, despliega un **onboarding contextual no bloqueante**:

### Al Instalar Pedidos:
```
┌─────────────────────────────────────────────────────────────┐
│             Configura cómo recibirás pedidos                │
│                                                             │
│ Selecciona los canales de entrada para tu operación:        │
│                                                             │
│ [x] WhatsApp Business (Recomendado para chat)               │
│ [ ] Tienda Web (Catálogo online de autoservicio)            │
│ [ ] API (Integración con otros sistemas)                    │
│ [x] Ingreso Manual (Mostrador y pedidos telefónicos)        │
│                                                             │
│   [ Conectar WhatsApp Business ]   [ Continuar sin conectar] │
└─────────────────────────────────────────────────────────────┘
```

### Al Instalar Inventarios:
```
┌─────────────────────────────────────────────────────────────┐
│                 Configura tu inventario                     │
│                                                             │
│ ¿Cómo deseas iniciar la carga de existencias?               │
│                                                             │
│ • [ Importar desde Excel / CSV ]                            │
│ • [ Crear productos manualmente desde cero ]                │
│                                                             │
│ ¿Gestionarás una sola bodega o múltiples ubicaciones?       │
│                                                             │
│   [ Guardar & Comenzar ]         [ Configurar más tarde ]   │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Estado de Salud y Configuración de la Tienda (Readiness)

Una tienda no está simplemente "vacía" o "llena"; tiene un **diagnóstico de preparación operativa (Setup Readiness)**:

```
MI TIENDA: "Ferretería El Albañil"

Configuración Base
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[✓] Datos de la tienda (Bogotá · COP)
[✓] Horarios y días laborales
[✓] Equipo (2 operadores asignados)

Capacidades Activas
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[✓] Pedidos (OMS)
[✓] Inventarios (Stock & Kardex)

Conexiones & Canales
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[✓] Ingreso Manual / Mostrador
[!] WhatsApp Business: Desconectado
    (Aviso: Pedidos está activo, pero WhatsApp aún no recibe chats)
    [ Conectar Canal ]
```

Esto permite al operador entender claramente qué módulos están instalados y qué canales requieren atención, sin forzar pasos invasivos.

---

## 6. Índice de Documentación Detallada

1. **[01. Modelo Conceptual Tenant + Módulos Plug & Play](./01-modelo-conceptual-tenant-modulos.md):**  
   Límites de aislamiento, espacios con 0 módulos y analogía del contenedor.
2. **[02. Canal WhatsApp & Canales Habilitadores](./02-canal-whatsapp-y-adaptador-contextual.md):**  
   Desacoplamiento técnico de WhatsApp en la Tienda vs. canales de entrada en Pedidos.
3. **[03. Ownership Inter-Módulos & Eventos de Dominio](./03-comunicacion-inter-modulos-eventos-y-catalogo.md):**  
   Tabla de responsabilidades, consumo de stock sin duplicación y bus de eventos.
4. **[04. Contratos de Datos, Tipos & Ciclo de Vida OMS](./04-contratos-interfaces-y-ciclo-de-vida-oms.md):**  
   Interfaces TypeScript de órdenes, clientes, estados y transiciones.
5. **[05. Plan de Refactor & Migración](./05-plan-de-refactor-y-migracion.md):**  
   Fases de implementación, erradicación de cocina y auditoría de UI.
