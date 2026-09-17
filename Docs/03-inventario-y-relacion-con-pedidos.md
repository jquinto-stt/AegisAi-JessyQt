# 03 — Inventario y su relación con Pedidos

> Marcas: **[CONFIRMADO]** / **[NO EXISTE]** / **[ROADMAP]** / **[INFERENCIA]**.

---

## PARTE A — Inventario

### Estado: **[NO EXISTE en código] — solo ROADMAP en README**
- Búsqueda de `inventario/inventory/kardex/bodega/existencia/stock/almacén` en `src/` = 0 resultados (salvo un placeholder "sin stock..." en un textarea de cancelación de Pedidos).

### Lo único escrito (README.md, "En Desarrollo / Roadmap")
- Catálogo de productos, ítems e insumos disponibles.
- Control de existencias y **deducción automática de stock por pedido confirmado**.
- Alertas de stock mínimo y reabastecimiento.
- Historial de movimientos y ajustes manuales de inventario.

### Respuestas a las preguntas (todo [NO EXISTE], salvo la intención del README)
| Pregunta | Estado |
|---|---|
| Qué problema resuelve | [INFERENCIA] controlar existencias de lo que se vende |
| Entidades | [NO EXISTE] (roadmap implicaría Producto/Insumo, Existencia, Movimiento, Bodega) |
| Cómo se crean productos | [NO EXISTE] |
| Relación productos↔Pedidos | [ROADMAP] "deducción automática por pedido confirmado" |
| Existencias / entradas / salidas / Kardex / ajustes / bodegas / disponibilidad / movimientos | [NO EXISTE] todos |
| Qué consulta / modifica / no debe hacer | [NO EXISTE] |

### Pregunta clave: ¿Inventario administra los mismos productos que vende Pedidos?
- **[CONFIRMADO hoy]** NO comparten nada, porque Inventario no existe y Pedidos NO tiene entidad Producto (usa texto libre + un catálogo simple opcional de autocompletado).
- **[INFERENCIA / decisión pendiente]** Lo natural: **Inventario es dueño del catálogo maestro de Productos**; Pedidos los referencia y, al confirmar, dispara descuento de stock. Hay que DISEÑARLO; hoy no está en el repo.

---

## PARTE B — Relación Pedidos ↔ Inventario

### Estado actual: **[NO EXISTE]** ninguna relación (Inventario no está construido)
- Único vínculo declarado (sin implementar): README → "deducción automática de stock por pedido confirmado".
- Pedidos hoy NO consulta ni modifica stock en ningún estado.

### Modelo que se plantea (a validar)
Ustedes proponen: `Producto → Pedidos → Inventario`.
**[INFERENCIA]** Más correcto sería que el **Producto sea dueño de Inventario** (catálogo maestro + existencias) y que Pedidos lo **consuma**:
```
Inventario (dueño del Producto y del stock)
        ▲            │
        │ descuenta  │ referencia productos/precios
        │            ▼
      Pedidos (orden de venta)
```

### Qué debería pasar en cada evento (propuesta; hoy NADA de esto ocurre)
| Evento en Pedidos | Participación de Inventario (propuesta) | Hoy |
|---|---|---|
| Se crea el pedido | Ninguna, o "reserva blanda" opcional | [NO EXISTE] |
| Se confirma | **Descontar stock** (según README) o reservar en firme | [NO EXISTE] |
| Se paga | Ninguna (pago ≠ inventario) | [NO EXISTE] |
| Se prepara | Ninguna (o consumo de insumos si hay recetas) | [NO EXISTE] |
| Se entrega | Confirmar salida definitiva | [NO EXISTE] |
| Se cancela | **Devolver/liberar** stock reservado/descontado | [NO EXISTE] |
| Se devuelve | Reingresar stock (entrada por devolución) | [NO EXISTE] |

### Decisión de arquitectura pendiente (importante)
- **[INFERENCIA]** Definir el **acoplamiento**: ¿Pedidos llama a Inventario directamente, o se comunican por **eventos** ("pedido.confirmado" → Inventario descuenta)? El patrón del repo (módulos con dueño claro de sus datos; el asistente consume vía "providers") sugiere **desacoplar por eventos/contratos**, no llamadas directas. A decidir con el equipo.
