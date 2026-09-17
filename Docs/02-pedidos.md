# 02 — Módulo Pedidos

> Fuente: `stores/pedidos.store.ts`, `pages/pedidos/*`, `README.md`.
> Marcas: **[CONFIRMADO]** / **[NO EXISTE]** / **[INFERENCIA]** / **[PARCIAL]**.

## Qué problema resuelve
- **[CONFIRMADO]** Gestionar pedidos que llegan por WhatsApp o los crea un operador, desde que entran hasta la entrega, con tablero kanban, historial y métricas.

## Qué significa "un pedido"
- **[CONFIRMADO]** Un **encargo / orden de venta** de un cliente. Es una orden operativa, NO una factura ni documento contable.
```
Pedido {
  id, numero (ej. "P-014"), cliente, telefono,
  modalidad, items[], notas?, estado, origen,
  pagado?, createdAt, estadoDesde, finishedAt?, programadoPara?
}
```

## Entidades
- **[CONFIRMADO]** `Pedido`, `PedidoItem { nombre, cantidad, precio? }`, `CatalogoItem { id, nombre, precio }`, `PlantillasWhatsApp`, `HorarioAtencion`, `PedidosConfig`.

## ¿Catálogo? ¿Cómo se crean los productos?
- **[PARCIAL]** Hay un **catálogo simple OPCIONAL** en la config (`catalogo: CatalogoItem[]`), solo para autocompletar al crear un pedido. Semilla: "Combo clásico", "Bebida 350ml", "Postre del día".
- **[CONFIRMADO]** Los "productos" NO se crean en una pantalla de catálogo; se escriben como **texto libre** en cada ítem (nombre/cantidad/precio). **No hay entidad Producto de primera clase.**

## ¿Precios?
- **[CONFIRMADO]** `PedidoItem.precio` es opcional; `totalPedido(p) = Σ precio×cantidad`. Moneda tratada como COP en el asistente. **[NO EXISTE]** impuestos, descuentos ni pasarela.

## ¿Disponibilidad?
- **[NO EXISTE]** Pedidos no valida stock ni disponibilidad (eso sería Inventario, no implementado).

## ¿Clientes?
- **[PARCIAL]** Cliente embebido (`cliente`, `telefono`). Sin ficha ni historial por cliente.

## ¿Pagos?
- **[PARCIAL]** Solo un flag mock `pagado?: boolean` (para el segmento "pago pendiente"). No hay cobro real.

## ¿Preparación / entrega?
- **[CONFIRMADO]** Sí, como ESTADOS del pipeline y como modalidades (`retiro`, `domicilio`, `en_sitio`). `en_camino` solo aplica a domicilio. Capacidades `preparation.read` / `preparation.manage`.

## Estados de una orden [CONFIRMADO]
```
programado (previo)
   → nuevo → confirmado(opcional) → en_preparacion → listo → en_camino(opcional, solo domicilio) → entregado
cancelado = terminal, alcanzable desde cualquier estado no terminal
```
- `confirmado` y `en_camino` se activan/desactivan desde la configuración del módulo.
- `programado` no cuenta como "en curso" ni entra al historial hasta activarse (pasa a `nuevo`).

## Qué puede hacer una persona desde Pedidos (por capacidad) [CONFIRMADO]
| Acción | Capacidad |
|---|---|
| Ver tablero / inicio / historial | orders.read |
| Crear pedido | orders.create |
| Confirmar | orders.confirm |
| Cancelar | orders.cancel |
| Avanzar estados / preparación | preparation.manage |
| Programar / gestionar programados | scheduled.manage |
| Escribir al cliente por WhatsApp (wa.me) | channels.read |
| Editar plantillas de WhatsApp / config | channels.manage / settings.manage |
| Gestionar equipo | team.manage |
| (reservadas, sin UI) editar/eliminar | orders.edit / orders.delete |

## Acciones del store [CONFIRMADO]
`crearPedido`, `reprogramar`, `activarAhora`, `activarProgramadosVencidos`, `moverEstado`, `avanzar`, `cancelar`, `eliminar`, `updateConfig`.
Getters analíticos: totales por estado, `entregadosHoy`, `volumenPorDia/Hora`, `tiempoPromedioCicloMin`, `urgentes`, etc.

## Qué NO debería hacer Pedidos
- **[INFERENCIA]** No administrar stock/existencias (eso es Inventario), no ser dueño del catálogo maestro de productos, no cobrar pagos, no ser dueño del canal WhatsApp (solo consumirlo). Hoy no hace ninguna de esas cosas, coherente con esa frontera.

## Backend
- **[NO EXISTE]** Pedidos vive solo en el frontend (mock). No hay tabla ni API de pedidos. (El backend real es el de Turnos/Colas.)
