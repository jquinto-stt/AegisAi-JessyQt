import { observer } from "mobx-react-lite";

import { Card } from "@/elements/ui/card";
import { Badge } from "@/elements/ui/badge";
import { pedidosStore } from "@/stores";
import { puedeVerProgramados } from "@/stores/acceso.utils";
import type { Pedido } from "@/stores";
import { CabeceraWidget, ListaVacia, money } from "./widgets.comunes";
import { esFuturo, esHoy, fechaLegible, horaLegible } from "../inicio.calendario";

// ═══════════════════════════════════════════════════════════════════════════
// RESUMEN DEL DÍA — el panel que responde al calendario
// ═══════════════════════════════════════════════════════════════════════════
//
// Es la otra mitad del calendario: la rejilla elige un día y esto enseña qué
// pasó ese día. Sin esto el calendario sería decorativo —un control que cambia
// un borde y nada más—, que es exactamente lo que este proyecto no acepta.
//
// ── Dos listas, y por qué no son la misma ──────────────────────────────────
//
//   · **Programados PARA ese día**: por `programadoPara`. Responden «¿qué hay
//     agendado?».
//   · **Recibidos ESE día**: por `createdAt`. Responden «¿qué entró?».
//
// Un pedido puede estar legítimamente en las dos: se recibió hoy y se programó
// para hoy. Se pinta UNA vez, en la lista de programados, porque su cita es la
// información más útil de las dos — y por eso la segunda lista excluye por `id`
// los que ya salieron arriba, en vez de dejar la misma fila dos veces.
//
// ── Un día futuro no está vacío, está por venir ────────────────────────────
//
// Con cero filas, «Sin pedidos este día» sobre una fecha que aún no ha llegado
// se lee como un fallo de datos. Se distinguen los dos casos: el día futuro lo
// dice, y el pasado sin pedidos es una buena noticia, no un error.
//
// ═══════════════════════════════════════════════════════════════════════════

/** Una fila del panel: el pedido y de qué lista viene. */
interface FilaDia {
  pedido: Pedido;
  /** "programado" = tiene cita ese día; "recibido" = entró ese día. */
  grupo: "programado" | "recibido";
}

export interface ResumenDiaWidgetProps {
  /** Día del que se informa, "YYYY-MM-DD". */
  ymd: string;
  /** Abre el pedido en el tablero. */
  onVerPedido: (id: string) => void;
}

export const ResumenDiaWidget = observer(({ ymd, onVerPedido }: ResumenDiaWidgetProps) => {
  const programados = puedeVerProgramados() ? pedidosStore.programadosDelDia(ymd) : [];
  const recibidos = pedidosStore.recibidosEnDia(ymd);
  const entregados = pedidosStore.entregadosEnDia(ymd);
  const ingresos = pedidosStore.ingresosEntre(ymd, ymd)[0]?.total ?? 0;

  const idsProgramados = new Set(programados.map((p) => p.id));
  const filas: FilaDia[] = [
    ...programados.map((pedido) => ({ pedido, grupo: "programado" as const })),
    ...recibidos
      .filter((p) => !idsProgramados.has(p.id))
      .map((pedido) => ({ pedido, grupo: "recibido" as const })),
  ];

  const hoy = esHoy(ymd);
  const futuro = esFuturo(ymd);

  return (
    <Card className="flex h-full flex-col">
      <CabeceraWidget
        titulo={fechaLegible(ymd)}
        extra={
          hoy ? (
            <Badge color="primary" size="sm">
              Hoy
            </Badge>
          ) : futuro ? (
            <Badge color="light" size="sm">
              Por venir
            </Badge>
          ) : undefined
        }
      />

      {/* Los cuatro números del día. `entregados` e `ingresos` son 0 en un día
          futuro porque de verdad no ha pasado nada, y eso no es un error. */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Recibidos</p>
          <p className="mt-0.5 text-xl font-semibold tabular-nums text-gray-800 dark:text-white/90">
            {recibidos.length}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Entregados</p>
          <p className="mt-0.5 text-xl font-semibold tabular-nums text-gray-800 dark:text-white/90">
            {entregados}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Programados</p>
          <p className="mt-0.5 text-xl font-semibold tabular-nums text-gray-800 dark:text-white/90">
            {puedeVerProgramados() ? programados.length : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Ingresos</p>
          <p className="mt-0.5 text-xl font-semibold tabular-nums text-gray-800 dark:text-white/90">
            {money(ingresos)}
          </p>
        </div>
      </div>

      <div className="mt-4 flex-1 border-t border-gray-100 pt-3 dark:border-gray-800">
        {filas.length === 0 ? (
          <ListaVacia>
            {futuro ? "Este día todavía no ha llegado." : "Sin pedidos este día."}
          </ListaVacia>
        ) : (
          <div className="max-h-[38vh] space-y-1 overflow-y-auto pr-1">
            {filas.map(({ pedido, grupo }) => (
              <button
                key={`${grupo}-${pedido.id}`}
                type="button"
                onClick={() => onVerPedido(pedido.id)}
                title={`Abrir ${pedido.numero} en el tablero`}
                className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.04]"
              >
                {/* `w-20` y no `w-16`: `es-CO` escribe el meridiano como
                    «04:10 p. m.», y a 4rem el «m.» se cortaba. La hora es el
                    dato por el que se ordena esta lista — truncarla era perder
                    justo lo que se viene a leer. */}
                <span className="w-20 shrink-0 whitespace-nowrap text-xs font-medium tabular-nums text-gray-500 dark:text-gray-400">
                  {horaLegible(grupo === "programado" ? (pedido.programadoPara ?? pedido.createdAt) : pedido.createdAt)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-gray-800 dark:text-white/90">
                    {pedido.numero} · {pedido.cliente}
                  </span>
                  <span className="block truncate text-xs text-gray-400 dark:text-gray-500">
                    {grupo === "programado"
                      ? `Programado · ${pedidosStore.modalidadLabel(pedido.modalidad)}`
                      : pedidosStore.modalidadLabel(pedido.modalidad)}
                  </span>
                </span>
                <Badge color={pedidosStore.estadoBadgeColor(pedido.estado)} size="sm">
                  {pedidosStore.estadoLabel(pedido.estado)}
                </Badge>
              </button>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
});

export default ResumenDiaWidget;
