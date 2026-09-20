import { observer } from "mobx-react-lite";
import { useNavigate } from "react-router";

import { Card } from "@/elements/ui/card";
import { Badge } from "@/elements/ui/badge";
import { Button } from "@/elements/ui/button";
import { pedidosStore } from "@/stores";
import { puede, motivoSinPermiso, capacidadParaAvanzar } from "@/stores/acceso.utils";
import type { Pedido } from "@/stores/pedidos.store";
import { CabeceraWidget, ListaVacia, relativo, money } from "./widgets.comunes";

// ═══════════════════════════════════════════════════════════════════════════
// COLA DE PREPARACIÓN — pedidos que hay que preparar, con su tiempo encima
// ═══════════════════════════════════════════════════════════════════════════
//
// Responde a la pregunta de quien está en la mesa: «¿qué preparo ahora?». Por eso
// el pedido va primero y el orden es por ANTIGÜEDAD EN EL ESTADO —no por hora de
// creación—: el que lleva más tiempo esperando es el que hay que atender, y con
// el pipeline avanzando solo lo que importa es cuánto lleva *ahí*.
//
// ── El botón de avance no dibuja una flecha adivinada ─────────────────────
//
// El paso siguiente sale de `pedidosStore.siguienteEstado(p)`, que es el dueño
// del pipeline (y conoce las columnas personalizadas y las modalidades: un
// pedido de retiro no tiene `en_camino`). La tarjeta NO decide a dónde va el
// pedido; solo lo ofrece.
//
// ── Doble compuerta, y las dos se dicen ───────────────────────────────────
//
// Hay DOS razones distintas por las que este botón puede estar apagado, y no
// son la misma cosa:
//
//   1. La sesión no tiene la capacidad que exige el destino
//      (`capacidadParaAvanzar`), p. ej. `preparation.manage` para pasar a
//      `en_preparacion`.
//   2. El pedido ya no puede avanzar (`siguienteEstado` devuelve `null`).
//
// Se distinguen en el texto porque el usuario merece saber si le falta un
// permiso o si el pedido ya está terminado. Un «no puedes» indistinto manda a
// pedir permisos que no arreglan nada.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Pedidos en la cola de preparación, decidido por el ESTADO.
 *
 * `en_preparacion` es la cola viva: lo que está sobre la mesa. Se incluye
 * `confirmado` solo si la organización usa ese paso (`usarConfirmado`), y no se
 * incluye `nuevo` porque un pedido sin confirmar todavía no es trabajo de
 * cocina — ofrecerlo aquí sería pedir que se prepare algo que el negocio aún no
 * ha aceptado.
 */
function colaDePreparacion(): Pedido[] {
  return pedidosStore
    .pedidos.filter((p) => p.estado === "en_preparacion")
    .sort((a, b) => a.estadoDesde.localeCompare(b.estadoDesde));
}

/**
 * Tiempo medio en preparación de lo que hay ahora en la cola.
 *
 * Es un promedio de los pedidos EN COLA, no histórico: responde a «¿cuánto está
 * tardando esto hoy?» con los datos que existen. Sin backend y sin registro de
 * transiciones por pedido, un histórico de verdad no se puede calcular, y
 * inventarlo sería el defecto que `SinDatos` existe para evitar. Se declara
 * `null` sin pedidos para no dividir por cero.
 */
function minutosMediosEnCola(cola: Pedido[]): number | null {
  if (cola.length === 0) return null;
  const total = cola.reduce((acc, p) => acc + pedidosStore.minutosEnEstado(p), 0);
  return Math.round(total / cola.length);
}

// ── Tarjeta de pedido ──────────────────────────────────────────────────────

const TarjetaPrep = observer(({ pedido, indice }: { pedido: Pedido; indice: number }) => {
  const destino = pedidosStore.siguienteEstado(pedido);
  const capacidad = capacidadParaAvanzar(destino);
  const puedeAvanzar = destino !== null && capacidad !== null && puede(capacidad);
  const minutos = pedidosStore.minutosEnEstado(pedido);
  const items = pedido.items.reduce((acc, i) => acc + i.cantidad, 0);

  // El umbral de «está tardando» es de presentación, no de negocio: colorea sin
  // bloquear nada. Se dice el número siempre, para que el color sea un realce y
  // no la única forma de enterarse.
  const tardando = minutos >= 20;

  return (
    <div
      style={{ animationDelay: `${indice * 40}ms` }}
      className="animate-aparecer rounded-xl border border-gray-200/70 p-4 dark:border-white/5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-800 dark:text-white/90">
            {pedido.cliente}
          </p>
          <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
            {pedido.numero} · {pedidosStore.modalidadLabel(pedido.modalidad)}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p
            className={
              "text-lg font-semibold tabular-nums " +
              (tardando
                ? "text-error-600 dark:text-error-400"
                : "text-gray-800 dark:text-white/90")
            }
          >
            {relativo(minutos)}
          </p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500">en preparación</p>
        </div>
      </div>

      {/* Los ítems son lo que se va a preparar: sin ellos la tarjeta no sirve
          para trabajar, solo para mirar. */}
      <ul className="mt-3 space-y-0.5">
        {pedido.items.slice(0, 4).map((it, i) => (
          <li key={i} className="flex justify-between gap-2 text-xs text-gray-600 dark:text-gray-300">
            <span className="truncate">
              <span className="font-medium tabular-nums">{it.cantidad}×</span> {it.nombre}
            </span>
          </li>
        ))}
        {pedido.items.length > 4 && (
          <li className="text-xs text-gray-400 dark:text-gray-500">
            +{pedido.items.length - 4} más
          </li>
        )}
      </ul>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {items} {items === 1 ? "ítem" : "ítems"}
          {pedidosStore.totalPedido(pedido) > 0 && ` · ${money(pedidosStore.totalPedido(pedido))}`}
        </span>

        {destino === null ? (
          <Badge color="light" size="sm">
            Sin paso siguiente
          </Badge>
        ) : (
          <span title={puedeAvanzar ? undefined : motivoSinPermiso(capacidad!)}>
            <Button
              size="sm"
              disabled={!puedeAvanzar}
              onClick={() => pedidosStore.moverEstado(pedido.id, destino)}
            >
              Marcar {pedidosStore.estadoLabel(destino).toLowerCase()}
            </Button>
          </span>
        )}
      </div>
    </div>
  );
});

// ── Widget ─────────────────────────────────────────────────────────────────

export const PrepQueueWidget = observer(({ columnas = 2 }: { columnas?: 1 | 2 }) => {
  const navigate = useNavigate();
  const cola = colaDePreparacion();
  const media = minutosMediosEnCola(cola);

  return (
    <Card className="p-5">
      <CabeceraWidget
        titulo="En cola de preparación"
        extra={
          cola.length > 0 ? (
            <Badge color="warning" size="sm">
              {cola.length}
            </Badge>
          ) : undefined
        }
        accion="Ver tablero"
        onAccion={() => navigate("/pedidos")}
      />

      {cola.length === 0 ? (
        <ListaVacia>La cola está limpia: no hay nada en preparación.</ListaVacia>
      ) : (
        <>
          <div className="mb-3 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <span>
              Tiempo medio en cola:{" "}
              <span className="font-medium tabular-nums text-gray-700 dark:text-gray-200">
                {media === null ? "—" : relativo(media)}
              </span>
            </span>
          </div>
          <div className={"grid gap-3 " + (columnas === 2 ? "sm:grid-cols-2" : "")}>
            {cola.map((p, i) => (
              <TarjetaPrep key={p.id} pedido={p} indice={i} />
            ))}
          </div>
        </>
      )}
    </Card>
  );
});

export default PrepQueueWidget;
