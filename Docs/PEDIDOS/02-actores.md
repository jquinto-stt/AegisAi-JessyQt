# 02. Actores del Sistema en el Módulo Pedidos

Este documento detalla todos los actores humanos, agentes inteligentes y componentes del sistema identificados formalmente en el código de **StockFlow (Módulo Pedidos)**.

---

## 2.1 Matriz de Actores Identificados

| Actor | Tipo | Rol Principal | Interfaz / Punto de Entrada |
|---|---|---|---|
| **Cliente** | Humano (Externo) | Generador de demanda | WhatsApp, Portal Web, Mostrador |
| **Asistente IA (Necto Bot)** | Agente de Software | Recepción autónoma y parsing NLP | Webhook WhatsApp / Engine conversacional |
| **Operador de Caja / Mostrador** | Humano (Interno) | Validación de pagos y despacho inicial | Tablero Kanban y Conversaciones (`ConversacionesView`) |
| **Cocinero Jefe / Personal KDS** | Humano (Interno) | Elaboración y empaque de comandas | Pantalla KDS (`PreparacionTiemposView`) |
| **Repartidor / Despacho** | Humano (Interno) | Entrega final al cliente | Tablero Kanban (`PedidosEnVivoView`) / Drawer |
| **Supervisor / Administrador** | Humano (Interno) | Gestión operativa, auditoría y configuración | Módulo Completo (Operación, Menú, Configuración) |
| **Motor Kardex ERP (`inventoryService`)** | Componente de Sistema | Sincronización transaccional de stock | Servicio singleton `inventoryService.ts` |

---

## 2.2 Especificación Detallada por Actor

### 1. Cliente
* **Nombre**: Cliente Final.
* **Rol**: Consumidor final de los productos gastronómicos o comerciales.
* **Responsabilidades**:
  * Enviar intenciones de pedido o consultas de catálogo.
  * Proveer datos de entrega (dirección, notas de acceso, teléfono de contacto).
  * Remitir comprobantes de pago o transferencias bancarias digitales (Nequi, Bancolombia, etc.).
  * Consultar el estado de su orden en preparación o reportar anomalías.
* **Acciones que puede realizar**:
  * Enviar mensajes de texto e imágenes (comprobantes de pago) al WhatsApp del negocio.
  * Confirmar borradores de pedido estructurados generados por la IA.
  * Solicitar explícitamente atención humana (*"quiero hablar con una persona"*).
  * Consultar tiempos de demora y alérgenos en el menú.
* **Información que puede consultar o modificar**:
  * Consulta: Platos disponibles, precios vigentes, tiempo estimado de entrega y estado de su comanda.
  * Modificación: Sus propios datos de entrega y las preferencias/modificadores de su comanda antes de la confirmación.

---

### 2. Asistente IA (Necto IA Bot)
* **Nombre**: Asistente Conversacional Inteligente (Necto Bot).
* **Rol**: Agente automatizado de primera línea para atención al cliente vía WhatsApp.
* **Responsabilidades**:
  * Mantener el estado `IA_ATENDIENDO` en hilos de chat entrantes.
  * Interpretar lenguaje natural, identificando platos, cantidades, variantes culinarias y direcciones.
  * Armar comandas en borrador (`DraftOrder`) con subtotales y cálculo de tarifas de envío.
  * Proveer respuestas inmediatas a preguntas frecuentes (horarios, alérgenos, tiempos de horno).
  * Escalar de manera segura al operador humano (`REQUIERE_INTERVENCION`) cuando se detecta baja confianza, pedidos corporativos o comprobantes de transferencia.
  * Transmitir notificaciones automáticas de cambio de estado de comanda (*"¡Tu comanda #1024 ya ingresó al horno!"*).
* **Acciones en el código**:
  * Ejecución de heurísticas conversacionales multi-turno (`simulateCustomerMessage`, `simulateAIReply`).
  * Emisión de eventos auditables en `handoffHistory` con autor `"Asistente IA"`.
  * Asignación de metadata de confianza (`aiConfidence`: *Alta*, *Media*, *Baja*).

---

### 3. Operador de Caja / Mostrador
* **Nombre**: Operador de Punto de Venta / Mostrador (`currentOperatorName`).
* **Rol**: Responsable de la recepción presencial, validación financiera y confirmación de pedidos.
* **Responsabilidades**:
  * Verificar en cuenta bancaria que los comprobantes remitidos por WhatsApp coincidan en monto y referencia.
  * Confirmar pedidos entrantes (`confirmOrder`) o aprobar la interpretación de la IA (`approveAIOrder`).
  * Tomar el control manual de conversaciones en WhatsApp (`takeControl`), respondiendo en nombre del negocio y silenciando temporalmente al bot (`HUMANO_ATENDIENDO`).
  * Devolver el control a la IA (`releaseToAI`) una vez resuelta la duda o validado el pago.
  * Ingresar órdenes presenciales de forma rápida (`createManualOrder`).
  * Imprimir comandas en formato ticket térmico de 58mm u 80mm para el personal de cocina.
* **Información que consulta o modifica**:
  * Consulta: Bandeja de entrada de WhatsApp, comprobantes adjuntos, pedidos en estado `NUEVO`.
  * Modifica: Transiciona pedidos a `CONFIRMADO`, crea nuevas órdenes y edita ítems/precios de comandas no horneadas.

---

### 4. Cocinero Jefe / Personal de Cocina (KDS)
* **Nombre**: Cocinero / Maestro Pastelero / Operador KDS.
* **Rol**: Responsable de la elaboración física de los pedidos y control de tiempos en cocina.
* **Responsabilidades**:
  * Monitorear la pantalla de producción (`PreparacionTiemposView`) en terminales de cocina.
  * Ordenar la cocción en base al número de turno (`turnNumber`) y la urgencia semafórica (`A_TIEMPO`, `PROXIMO`, `RETRASADO`).
  * Marcar comandas en elaboración activa (`sendToKitchen`, estado `EN_PREPARACION`).
  * Empacar los productos y notificar que el pedido está terminado (`markOrderReady`, estado `LISTO`), disparando sonido de éxito en mostrador.
  * Gestionar estaciones de trabajo: *Horno*, *Armado*, *Empaque*.
* **Información que consulta o modifica**:
  * Consulta: Detalle de ítems, notas de comanda (ej. *"sin cebolla"*, *"bien doradas"*), minutos transcurridos y recetas de insumos.
  * Modifica: Transiciones de comanda de `CONFIRMADO` a `EN_PREPARACION` y a `LISTO`.

---

### 5. Repartidor / Personal de Despacho
* **Nombre**: Repartidor / Domiciliario / Mostrador de Entrega.
* **Rol**: Custodio del despacho y entrega final.
* **Responsabilidades**:
  * Retirar las comandas en estado `LISTO` del mostrador de despacho.
  * Verificar dirección y teléfono del cliente.
  * Marcar el pedido como completado (`deliverOrder`, estado `FINALIZADO`), cerrando el ciclo operativo.
* **Información que consulta o modifica**:
  * Consulta: Dirección de entrega, datos del cliente, tickets y estado del paquete.
  * Modifica: Transiciona el pedido a `FINALIZADO`.

---

### 6. Supervisor / Administrador del Sistema
* **Nombre**: Administrador del Negocio / Dueño de Franquicia.
* **Rol**: Máxima autoridad operativa, técnica y analítica del módulo.
* **Responsabilidades**:
  * Manejo de excepciones operativas: rechazar pedidos (`rejectOrder`) o cancelarlos con justificación obligatoria (`cancelOrder`), lo que genera una `Incidencia` de severidad alta.
  * Supervisar el ritmo del negocio (`storePace`: *rápida*, *habitual*, *demorada*) aplicando buffers dinámicos de preparación a cocina.
  * Administrar el catálogo de platos: precios, descripciones, disponibilidad (`isAvailable`) e insumos asociados (escandallo).
  * Controlar materias primas en `InsumosStockView`, registrando compras, mermas de cocina o ajustes de auditoría.
  * Definir turnos de trabajo (`switchShift`) y dotación de personal (`updateStaffStatus`).
  * Configurar automatizaciones (auto-confirmación, alertas de demoras y avisos de quiebre de stock).
  * Evaluar KPIs: ingresos del día, tasa de cancelación, tiempo promedio de preparación y adopción del canal IA.
* **Información que consulta o modifica**:
  * Acceso irrestricto de lectura y escritura a todas las secciones del módulo.

---

### 7. Motor Kardex ERP (`inventoryService`)
* **Nombre**: Servicio Transaccional de Inventario StockFlow.
* **Rol**: Actor de software interno para salvaguarda de stock y contabilidad de existencias.
* **Responsabilidades**:
  * Escuchar las transiciones a producción (`EN_PREPARACION` o `LISTO`).
  * Ejecutar el método `inventoryService.consumeSaleOrder(...)` de forma idempotente (`isStockConsumed`).
  * Generar un movimiento de auditoría de tipo `SALIDA` en el Kardex principal por cada ítem vendido.
  * Disparar alarmas de quiebre de stock si el saldo cae por debajo de la reserva mínima (`stockMinimo`).
