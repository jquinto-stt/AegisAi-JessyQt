# 01. Propósito y Alcance del Módulo Pedidos

## 1.1 ¿Qué es el Módulo Pedidos?

El módulo **Pedidos** (conocido en la arquitectura interna y especificaciones como `Necto Pedidos` o `compositions/pedidos`) es el motor transaccional y operativo central de **StockFlow**. Su función primordial es centralizar, procesar, sincronizar y despachar los pedidos generados tanto desde canales conversacionales automatizados (**WhatsApp con Inteligencia Artificial**) como desde canales presenciales (mostrador/caja POS), tienda web o telefónicos.

El módulo combina tres facetas esenciales en una sola experiencia reactiva:
1. **Operación en Tiempo Real (Kitchen & Live Dispatch)**: Tablero Kanban operativo, pantalla KDS para cocina, control de pedidos programados y bandeja de mensajería conversacional.
2. **Menú & Escandallos (Menú & Stock)**: Catálogo inteligente con recetas e insumos, pausado automático por agotamiento y deducción de existencias en el inventario ERP maestro.
3. **Gobernanza y Capacidad**: Configuración de turnos, capacidad productiva de cocina, roles/permisos del personal y motor de automatizaciones reactivas.

---

## 1.2 ¿Qué problema resuelve?

En los negocios gastronómicos y de comercio local, la recepción de pedidos suele fragmentarse en múltiples canales no integrados:
* **Pérdida de pedidos en WhatsApp**: Clientes esperando respuesta manual mientras el personal de cocina o caja atiende el mostrador.
* **Desconexión entre ventas e inventario**: Se confirman productos que ya no tienen insumos disponibles en cocina, generando cancelaciones y fricción con el cliente.
* **Falta de visibilidad de tiempos de cocina**: No hay trazabilidad del tiempo que una comanda pasa en horno, preparación o empaque, provocando entregas frías o repartidores esperando innecesariamente.
* **Validación manual propensa a fraude**: Comprobantes de transferencias (Nequi, Bancolombia, etc.) no verificados con rigor contable antes de ingresar la comanda al fuego.
* **Comisiones excesivas de terceros**: Dependencia de plataformas de delivery agregadoras que retienen entre un 20% y 30% del margen del negocio.

El módulo Pedidos resuelve esta problemática ofreciendo un canal directo asistido por IA, integrado al Kardex y conectado directamente con la pantalla del maestro cocinero en tiempo real.

---

## 1.3 Objetivo dentro de StockFlow

El objetivo de Pedidos en el ecosistema StockFlow es:
* **Automatizar la toma de órdenes**: Convertir mensajes no estructurados de WhatsApp en comandas digitales estructuradas (`Pedido`) mediante modelos de lenguaje, minimizando la intervención del operador al 10-15% de casos ambiguos o verificación de pagos.
* **Sincronizar el Kardex Maestro en tiempo real**: Descontar automáticamente el stock de insumos y productos terminados en `ModuloInventario` a través de `inventoryService.consumeSaleOrder` en cuanto una comanda pasa a producción.
* **Garantizar la trazabilidad operativa**: Mantener una bitácora inmutable (`history: OrderEvent[]` y `handoffHistory: ConversationEvent[]`) de cada cambio de estado, quién lo realizó (IA, cocinero, cajero o supervisor) y la justificación o nota asociada.
* **Optimizar la capacidad instalada**: Regular el ritmo del local (`StorePaceMode`: *rápida*, *habitual*, *demorada*) para amortiguar la sobredemanda ajustando dinámicamente los minutos estimados de preparación y la sugerencia de buffer a cocina.

---

## 1.4 ¿Quién utiliza el módulo? (Usuarios destino)

1. **Operador de Mostrador / Cajero**:
   * Recibe clientes presenciales y telefónicos.
   * Valida comprobantes de transferencias bancarias en el chat de WhatsApp.
   * Imprime tickets térmicos de comanda (58mm / 80mm).
2. **Cocinero Jefe / Personal de Producción (KDS)**:
   * Visualiza órdenes en la pantalla de cocina (`PreparacionTiemposView`).
   * Pasa comandas de `CONFIRMADO` a `EN_PREPARACION` y a `LISTO`.
   * Monitorea temporizadores de urgencia (`A_TIEMPO`, `PROXIMO`, `RETRASADO`).
3. **Repartidor / Despachador**:
   * Recibe paquetes en estado `LISTO` y marca la transición a `FINALIZADO` al entregarlo al cliente.
4. **Administrador / Dueño del Negocio**:
   * Administra precios, platos, recetas y disponibilidad en el catálogo.
   * Monitorea métricas operativas (KPIs), ingresos, ticket promedio y reportes de incidencias.
   * Ajusta reglas de automatización, capacidad de turnos y personal activo.
5. **Cliente Final (Indirecto)**:
   * Interactúa mediante WhatsApp con el asistente inteligente de Necto para cotizar, pedir, consultar estado de su orden (*"¿Cómo va mi pedido?"*) o enviar comprobantes de pago.

---

## 1.5 Información que maneja el módulo

* **Datos de la Comanda (`Pedido`)**:
  * Identificador (`id`, ej. `PED-1025`), canal de origen (`whatsapp`, `web`, `presencial`, `telefono`), tipo (`inmediato`, `programado`, `recurrente`).
  * Cliente: nombre, teléfono, dirección de entrega normalizada.
  * Ítems: producto, variante/opción, cantidad, precio unitario, notas culinarias.
  * Finanzas: total, método de pago (`nequi`, `bancolombia`, `efectivo`, `transferencia`, etc.).
  * Tiempos: hora de creación, minutos estimados, minutos transcurridos, nivel de urgencia semafórico (`A_TIEMPO`, `PROXIMO`, `RETRASADO`).
  * Atributos de IA: si se originó en IA (`isAIOrigin`), confianza del modelo (`aiConfidence`: *Alta*, *Media*, *Baja*), mensaje sin procesar (`aiRawMessage`).
  * Trazabilidad: turno de atención (`turnNumber`), historial de eventos con usuario y timestamp.
* **Datos del Hilo Conversacional (`Conversation`)**:
  * Hilo de chat multimensaje (`ChatMessage[]`), estado del control (*Human-in-the-Loop*), motivo de escalado (`HandoffReason`), operador a cargo (`controlledBy`).
  * Borrador de comanda interactiva (`DraftOrder`) previo a confirmación.
  * Comprobantes adjuntos con metadata de validación bancaria.
* **Insumos y Recetas (`StockIngredientItem`, `StockMovement`)**:
  * Inventario de cocina con puntos de reorden y deducción por escandallo.
* **Reglas Operativas y Personal (`AutomationRule`, `ShiftInfo`, `StaffMember`, `Incidencia`)**:
  * Reglas de auto-confirmación, personal en servicio y registro de anomalías.

---

## 1.6 Ciclo de vida general de un pedido

El ciclo de vida del pedido en el código implementado sigue una progresión determinista:

```text
[Cliente solicita pedido vía WhatsApp / Presencial / Web]
               │
               ▼
           [ NUEVO ] ─── (Rechazo por falta de insumos / local cerrado) ──► [ RECHAZADO ]
               │
               ▼ (Confirmación por Operador o Auto-confirmación IA)
         [ CONFIRMADO ] ─── (Cancelación justificada con Incidencia) ───► [ CANCELADO ]
               │
               ▼ (Envío al Horno / KDS de Cocina)
               │ ───► [Consumo automático de Stock en ERP y Kardex]
       [ EN_PREPARACION ]
               │
               ▼ (Comanda finalizada y empaquetada)
           [ LISTO ]
               │
               ▼ (Entrega a domicilio o en mano al cliente)
         [ FINALIZADO ]
```

Cada transición de estado notifica automáticamente al chat de WhatsApp del cliente si la orden se originó por ese canal, manteniendo la omnicanalidad sin esfuerzo del personal.

---

## 1.7 Relación con otros módulos de StockFlow

| Módulo de StockFlow | Tipo de Integración | Mecanismo en el Código |
|---------------------|--------------------|------------------------|
| **`ModuloInventario` (Kardex ERP Maestro)** | Consumo de Stock en tiempo real | Invocación asíncrona a `inventoryService.consumeSaleOrder(...)` al cambiar de estado a producción, registrando salidas con concepto `Venta Automática Pedido #{id}`. |
| **`Products API` (Necto Cloud Catalog)** | Sincronización de Catálogo | Persistencia optimista mediante `apiCreateProduct`, `apiUpdateProduct` y mapeo bidireccional con `productAdapter.ts`. |
| **`AuthContext` (AWS Cognito)** | Autenticación y Autorización | Extracción de tokens JWT para llamadas a endpoints de backend y resolución del nombre de operador (`currentOperatorName`). |
| **`BusinessContext`** | Contexto multi-sucursal / multi-negocio | Lectura de configuraciones de sede, horarios y parámetros de operación. |
| **`SoundEffects` (Web Audio API)** | Alertas sonoras en cocina/mostrador | Disparo de sintetizadores de audio en el navegador para nuevos pedidos, pedidos listos y alertas urgentes. |

---

## 1.8 Procesos de negocio soportados

1. **Toma de pedidos omnicanal**: Recepción desatendida 24/7 con parsing conversacional de lenguaje natural o captura rápida en el punto de venta.
2. **Validación de pagos digitales**: Captura de comprobantes de billeteras electrónicas (Nequi, Daviplata, Bancolombia) con cola de aprobación humana prioritaria.
3. **Gestión de comandas en cocina (KDS)**: Despacho visual organizado por turnos, tiempos y estaciones de trabajo (Horno, Armado, Empaque).
4. **Control estricto de mermas e insumos**: Descuento unitario o fraccional (gramos/kilos) de materias primas por porción vendida.
5. **Prevención de colapso operativo**: Pausa automática de ítems al agotar inventario y ajuste de estimaciones según la carga de personal activo.
