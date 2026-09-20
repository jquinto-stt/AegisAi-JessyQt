import { observer } from "mobx-react-lite";
import { useState } from "react";
import { useNavigate } from "react-router";

import { Card } from "@/elements/ui/card";
import { Badge } from "@/elements/ui/badge";
import { Button } from "@/elements/ui/button";
import { AlertIcon } from "@/icons";
import { pedidosStore } from "@/stores";
import { puede, motivoSinPermiso } from "@/stores/acceso.utils";
import type { Pedido } from "@/stores/pedidos.store";
import { moverPedidoA } from "@/pages/pedidos/pedidos.notificaciones";
import { ModalNovedadEntrega } from "@/pages/pedidos/ModalNovedadEntrega";
import { CabeceraWidget, ListaVacia, relativo, money } from "./widgets.comunes";

// ═══════════════════════════════════════════════════════════════════════════
// HOJA DE RUTA — pedidos listos y en camino, con su entrega
// ═══════════════════════════════════════════════════════════════════════════
//
// La vista de quien reparte. Dos columnas de estado, una por momento del viaje:
//
//   `listo`      → preparado, todavía en el local. Hay que recogerlo.
//   `en_camino`  → ya salió. Hay que entregarlo.
//
// ── Por qué la dirección se pinta con sus huecos ──────────────────────────
//
// `direccionEntrega` es OPCIONAL en el modelo (`Pedido.direccionEntrega?`): un
// pedido de retiro o de sitio no tiene ninguna, y un pedido a domicilio creado a
// medias puede tenerla incompleta. La dirección se compone de sus campos
// presentes y, si falta el principal, la tarjeta lo DICE en vez de pintar una
// línea vacía. Una dirección en blanco en una hoja de ruta es peor que un
// «sin dirección»: el repartidor no sabe si falta el dato o si no hay que ir.
//
// ── Sobre «Marcar como Entregado» ─────────────────────────────────────────
//
// La transición la valida el store (`moverEstado` comprueba `transicionValida`),
// y la CAPACIDAD la comprueba la vista con `puede("preparation.manage")`. Hacen
// falta las dos: el store protege la coherencia del pipeline y la vista protege
// la autorización. El store no mira permisos —es la capa de datos, no la de
// acceso—, así que una vista que se fiara de él sería un bypass.
//
// El AVISO al cliente lo añade el puente `pedidos.notificaciones` a través de
// `moverPedidoA`. Antes esta vista llamaba `pedidosStore.moverEstado` directo y
// se saltaba la notificación que el Tablero sí enviaba: la misma acción tenía
// dos comportamientos según desde dónde se pulsara.
//
// ── Sobre «Novedad» ───────────────────────────────────────────────────────
//
// El repartidor que no puede entregar tiene que poder decirlo AHÍ, con el
// cliente delante, sin buscar el pedido en el Tablero. El botón abre
// `ModalNovedadEntrega`, que recoge el motivo y decide el desenlace: cancelar
// (terminal) o reintentar (vuelve a la hoja de ruta como `listo`).
//
// Es deliberadamente un botón de TEXTO con icono y no un icono suelto: la
// tarjeta ya tiene tres acciones y un icono sin etiqueta obligaría a adivinar.
// Va en variante `outline` teñida de rojo en vez de `destructive` porque abrir
// un formulario no es destruir nada — el rojo sólido se reserva al botón que
// de verdad cancela, dentro del modal.
// ═══════════════════════════════════════════════════════════════════════════

/** Pedidos que están en la calle o a punto de salir, el más antiguo primero. */
function ruta(): { listos: Pedido[]; enCamino: Pedido[] } {
  const porAntiguedad = (a: Pedido, b: Pedido) => a.estadoDesde.localeCompare(b.estadoDesde);
  return {
    listos: pedidosStore.pedidos.filter((p) => p.estado === "listo").sort(porAntiguedad),
    enCamino: pedidosStore.pedidos.filter((p) => p.estado === "en_camino").sort(porAntiguedad),
  };
}

/** Dirección legible, o `null` si no hay ninguna para pintar. */
function direccionDe(p: Pedido): string | null {
  const d = p.direccionEntrega;
  if (!d) return null;
  const partes = [d.calle, d.barrio, d.referencia].filter((x) => x && x.trim());
  return partes.length > 0 ? partes.join(" · ") : null;
}

// ── Fila de entrega ────────────────────────────────────────────────────────

const FilaEntrega = observer(({ pedido, accion }: { pedido: Pedido; accion: "salir" | "entregar" }) => {
  const navigate = useNavigate();
  const [novedadAbierta, setNovedadAbierta] = useState(false);
  const dir = direccionDe(pedido);
  const destino = accion === "salir" ? "en_camino" : "entregado";
  // Una sola capacidad gobierna las dos transiciones de esta vista
  // (`CAPACIDAD_POR_DESTINO`): quien puede cerrar una entrega puede iniciarla.
  const puedeAvanzar = puede("preparation.manage");
  const minutos = pedidosStore.minutosEnEstado(pedido);

  // ── Quién puede reportar una novedad ────────────────────────────────────
  //
  // NO toda fila de esta vista. La columna «Listos para salir» mezcla pedidos a
  // domicilio (a los que les falta salir) con pedidos `en_sitio`/`retiro` que
  // se sirven en el local: esos NO tienen entrega que fallar. Un repartidor no
  // puede «no entregar» un plato que se come en la mesa, y ofrecerle el botón
  // le invita a cancelar una venta por un motivo que no existe.
  //
  // La condición es HABER SALIDO (`en_camino`) o ESTAR POR SALIR A DOMICILIO
  // (`listo` + modalidad `domicilio`). Es la misma partición que decide la
  // etiqueta de la acción principal, leída de `modalidadDe()` y no del texto de
  // la fila.
  const admiteNovedad =
    pedido.estado === "en_camino" ||
    (pedido.estado === "listo" && pedido.modalidad === "domicilio");

  // `moverPedidoA` y NO `pedidosStore.moverEstado`: el primero es el envoltorio
  // del puente de notificaciones, que además publica la plantilla del estado
  // nuevo en el hilo del cliente. Estaba llamándose `moverEstado` directo, así
  // que «Marcar entregado» desde el Inicio no avisaba a nadie mientras el mismo
  // botón en el Tablero sí — la misma acción con dos comportamientos.
  const avanzar = () => moverPedidoA(pedido.id, destino);

  return (
    <>
      <div className="flex items-start gap-3 rounded-xl border border-gray-200/70 p-3 dark:border-white/5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-gray-800 dark:text-white/90">
              {pedido.cliente}
            </p>
            <Badge color={pedidosStore.estadoBadgeColor(pedido.estado)} size="sm">
              {pedidosStore.estadoLabel(pedido.estado)}
            </Badge>
          </div>
          <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
            {pedido.numero} · {pedidosStore.modalidadLabel(pedido.modalidad)} · {relativo(minutos)}
          </p>
          {/* La ausencia se declara. Un hueco no dice nada. */}
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
            {dir ?? <span className="text-gray-400 dark:text-gray-500">Sin dirección de entrega</span>}
          </p>
          <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
            {pedido.telefono}
            {pedido.repartidor ? ` · ${pedido.repartidor}` : ""}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span title={puedeAvanzar ? undefined : motivoSinPermiso("preparation.manage")}>
            <Button
              size="sm"
              variant={accion === "entregar" ? "primary" : "outline"}
              disabled={!puedeAvanzar}
              onClick={avanzar}
            >
              {accion === "salir" ? "Marcar en camino" : "Marcar entregado"}
            </Button>
          </span>

          {/* Reportar la novedad no avanza el pipeline: lo interrumpe. La
              transición la decide el modal (cancelar o reintentar), así que aquí
              solo se abre. Compuerta propia y NO la de `avanzar`: cancelar exige
              `orders.cancel`, que el rol de preparación no tiene, y ese permiso
              se comprueba donde se ejerce — dentro del modal, sobre el botón
              que de verdad cancela.

              Solo se ofrece si el pedido ADMITE una entrega fallida
              (`admiteNovedad`): un pedido `en_sitio` servido en el local no
              tiene entrega que fallar, y el botón ahí sería una invitación a
              cancelar una venta por un motivo inexistente. */}
          {admiteNovedad && (
            <span title={puedeAvanzar ? undefined : motivoSinPermiso("preparation.manage")}>
              <Button
                size="sm"
                variant="outline"
                disabled={!puedeAvanzar}
                onClick={() => setNovedadAbierta(true)}
                className="text-error-600 ring-error-200 hover:bg-error-50 dark:text-error-400 dark:ring-error-500/30 dark:hover:bg-error-500/10"
              >
                <AlertIcon className="mr-1.5 h-3.5 w-3.5" />
                Novedad
              </Button>
            </span>
          )}

          <button
            type="button"
            onClick={() => navigate(`/pedidos?detalle=${pedido.id}`)}
            className="text-[11px] font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            Ver pedido
          </button>
        </div>
      </div>

      {/* El modal solo se monta cuando hace falta: `Modal` aplica
          `overflow:hidden` al `<body>` en cuanto está abierto, así que dejar
          veinte modales cerrados en el árbol sería dejar veinte efectos. */}
      {novedadAbierta && (
        <ModalNovedadEntrega pedido={pedido} onClose={() => setNovedadAbierta(false)} />
      )}
    </>
  );
});

// ── Recaudo ────────────────────────────────────────────────────────────────

/**
 * Recaudo del día: lo ENTREGADO hoy, sumado por `totalPedido`.
 *
 * Se cuenta lo entregado, no lo pedido: es el dinero que de verdad entró, y es
 * la cifra que cuadra con la caja de un repartidor al volver. Los pedidos sin
 * cerrar no son recaudo, son expectativa.
 */
function recaudoDeHoy(): { total: number; pedidos: number } {
  const hoy = new Date().toISOString().slice(0, 10);
  const entregados = pedidosStore.pedidos.filter(
    (p) => p.estado === "entregado" && (p.finishedAt ?? "").slice(0, 10) === hoy,
  );
  return {
    total: entregados.reduce((acc, p) => acc + pedidosStore.totalPedido(p), 0),
    pedidos: entregados.length,
  };
}

// ── Widget ─────────────────────────────────────────────────────────────────

export const LogisticsDeliveryWidget = observer(() => {
  const { listos, enCamino } = ruta();
  const recaudo = recaudoDeHoy();
  const sinRuta = listos.length === 0 && enCamino.length === 0;

  return (
    <div className="space-y-5">
      {/* Recaudo del día: el número que cierra la jornada del repartidor. */}
      <Card>
        <CabeceraWidget titulo="Recaudo del día" />
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <p className="text-3xl font-semibold tracking-tight text-gray-800 dark:text-white/90">
            {money(recaudo.total)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {recaudo.pedidos === 0
              ? "sin entregas cerradas hoy"
              : `${recaudo.pedidos} ${recaudo.pedidos === 1 ? "entrega cerrada" : "entregas cerradas"}`}
          </p>
        </div>
      </Card>

      {sinRuta ? (
        <Card className="p-5">
          <CabeceraWidget titulo="Hoja de ruta" />
          <ListaVacia>No hay pedidos listos ni en camino.</ListaVacia>
        </Card>
      ) : (
        <>
          <Card className="p-5">
            <CabeceraWidget
              titulo="Listos para salir"
              extra={
                listos.length > 0 ? (
                  <Badge color="success" size="sm">
                    {listos.length}
                  </Badge>
                ) : undefined
              }
            />
            {listos.length === 0 ? (
              <ListaVacia>Nada preparado esperando reparto.</ListaVacia>
            ) : (
              <div className="space-y-2">
                {listos.map((p) => (
                  <FilaEntrega key={p.id} pedido={p} accion={p.modalidad === "domicilio" ? "salir" : "entregar"} />
                ))}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <CabeceraWidget
              titulo="En camino"
              extra={
                enCamino.length > 0 ? (
                  <Badge color="primary" size="sm">
                    {enCamino.length}
                  </Badge>
                ) : undefined
              }
            />
            {enCamino.length === 0 ? (
              <ListaVacia>Ningún reparto en la calle.</ListaVacia>
            ) : (
              <div className="space-y-2">
                {enCamino.map((p) => (
                  <FilaEntrega key={p.id} pedido={p} accion="entregar" />
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
});

export default LogisticsDeliveryWidget;
