/**
 * Tarjetas del Hub Operativo de `/modulos`.
 *
 * ── Por qué está en un archivo aparte ───────────────────────────────────────
 *
 * `ModulosPage.tsx` ya tenía 297 líneas y esta spec le suma tres bloques con
 * lógica propia (métricas vivas, atajos con compuerta, catálogo de próximos).
 * Se separa para que la página quede como orquestación y esto como presentación,
 * siguiendo el patrón `hola.comunes.tsx` de las configs de módulo.
 *
 * ── La regla que gobierna los atajos ────────────────────────────────────────
 *
 * **Un atajo visible que el rol no puede ejecutar es un control que miente.**
 * Las tres rutas de pedidos piden cosas distintas en `App.tsx`:
 *
 *   `/pedidos/crear`     → `orders.create`
 *   `/pedidos`           → `orders.read`
 *   `/pedidos/analitica` → `orders.read`
 *
 * No todas son la misma capacidad, así que cada atajo se pinta según la suya.
 * El caso no es hipotético: el rol `preparacion` tiene `orders.read` y
 * `preparation.manage` pero **no** `orders.create` — a ese rol, «+ Crear Pedido»
 * le llevaría a `/pedidos/crear` y el `CapabilityGuard` lo expulsaría de la
 * pantalla que acaba de pedir. Se pinta deshabilitado, con el motivo visible
 * (`motivoSinPermiso`), nunca oculto en silencio ni accionable de mentira.
 */

import { observer } from "mobx-react-lite";
import { ArrowRight, Lock } from "lucide-react";
import { Badge } from "@/elements/ui/badge";
import { Button } from "@/elements/ui/button";
import { CartIcon } from "@/icons";
import { puede, motivoSinPermiso } from "@/stores/acceso.utils";
import { CATALOGO_MODULOS, type InfoModuloNegocio } from "@/stores/plataforma.store";
import { money } from "@/pages/pedidos/widgets/widgets.comunes";
import { pedidosStore } from "@/stores";

// ═══════════════════════════════════════════════════════════════════════════
// MÉTRICAS VIVAS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Día de calendario local "YYYY-MM-DD".
 *
 * **No se usa `toISOString().slice(0, 10)`**: en un offset negativo (America/
 * Bogota, UTC−5) el día UTC se adelanta a partir de las 19:00 locales, así que
 * a las 20:00 del día 17 esto devolvería "2026-09-18" y la métrica «de hoy»
 * mostraría el día equivocado cinco horas al día. El propio store documenta
 * este desfase como causa de que `volumenEntre` discrepara de `ingresosEntre`.
 * Se replica su helper en vez de reimplementarlo mal.
 */
const hoyYmd = (): string => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export interface MetricaViva {
  /** Etiqueta visible. */
  label: string;
  /** Valor ya formateado (el formateo no vive en el JSX). */
  valor: string;
  /** Clases de color del valor. */
  tono: string;
}

/**
 * Métricas de hoy leídas del `pedidosStore`.
 *
 * ── Qué mide cada una, y por qué esa y no otra ──────────────────────────────
 *
 * · **Ventas de hoy** = `ingresosEntre(hoy, hoy)[0].total`. Suma `totalPedido`
 *   de los pedidos **entregados** por su `finishedAt`, día local. Es la misma
 *   fuente que usa el gráfico de ingresos de Analítica, así que el número de esta
 *   tarjeta y el de la pantalla de Analítica no pueden discrepar. La spec pedía
 *   `pedidosStore.ventasHoy`; **ese getter no existe** (verificado por grep), y
 *   `entregadosHoy` es un CONTEO, no un monto. Se usa la fuente real.
 *
 * · **Órdenes activas** = `totalEnCurso`. Es la misma cuenta que
 *   `enCurso().length`, pero el getter ya existe — no se recuenta a mano.
 *
 * · **Requieren atención** = `urgentes.length`. Pedidos en curso que superaron su
 *   tiempo objetivo. Es lo más accionable de la tarjeta: los otros dos números
 *   describen, este pide algo.
 *
 * Puro: no muta nada. `observer` lo re-renderiza cuando el store cambia.
 */
export function metricasPedidosHoy(): MetricaViva[] {
  const hoy = hoyYmd();
  const ventasHoy = pedidosStore.ingresosEntre(hoy, hoy)[0]?.total ?? 0;
  const activas = pedidosStore.totalEnCurso;
  const atencion = pedidosStore.urgentes.length;

  return [
    {
      label: "Ventas de hoy",
      valor: money(ventasHoy),
      tono: "text-gray-900 dark:text-white",
    },
    {
      label: "Órdenes activas",
      valor: String(activas),
      tono: "text-gray-900 dark:text-white",
    },
    {
      label: "Requieren atención",
      // Ámbar solo si hay algo que atender. Un cero en rojo grita por un problema
      // que no existe.
      valor: String(atencion),
      tono: atencion > 0 ? "text-warning-600 dark:text-warning-400" : "text-gray-400 dark:text-gray-500",
    },
  ];
}

/** Fila de tres métricas. */
export const MetricasVivas: React.FC<{ metricas: MetricaViva[] }> = ({ metricas }) => (
  <dl className="mt-4 grid grid-cols-3 gap-2">
    {metricas.map((m) => (
      <div
        key={m.label}
        className="rounded-xl border border-gray-100 bg-gray-50/70 px-2.5 py-2 dark:border-gray-800 dark:bg-gray-800/40"
      >
        <dt className="text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
          {m.label}
        </dt>
        <dd className={`mt-0.5 text-sm font-bold tabular-nums sm:text-base ${m.tono}`}>
          {m.valor}
        </dd>
      </div>
    ))}
  </dl>
);

// ═══════════════════════════════════════════════════════════════════════════
// ATAJOS RÁPIDOS
// ═══════════════════════════════════════════════════════════════════════════

export interface Atajo {
  /** Texto visible. */
  label: string;
  /** Ruta destino. */
  to: string;
  /** Capacidad que exige esa ruta en `App.tsx`. */
  capacidad: Parameters<typeof puede>[0];
  /** Emoji del spec, opcional. */
  emoji?: string;
}

/**
 * Los tres atajos de la tarjeta de Pedidos.
 *
 * La `capacidad` de cada uno **no se inventa aquí**: es la que declara el
 * `CapabilityGuard` de su ruta en `App.tsx`. Si esa declaración cambia, este
 * mapa tiene que cambiar con ella — son el mismo hecho en dos sitios, y el
 * desfase se ve como un atajo que expulsa al pulsarlo.
 */
export const ATAJOS_PEDIDOS: Atajo[] = [
  { label: "Crear Pedido", to: "/pedidos/crear", capacidad: "orders.create", emoji: "➕" },
  { label: "Tablero Kanban", to: "/pedidos", capacidad: "orders.read", emoji: "📋" },
  { label: "Analítica", to: "/pedidos/analitica", capacidad: "orders.read", emoji: "📊" },
];

/**
 * Barra de atajos. Cada botón se pinta habilitado o deshabilitado según SU
 * capacidad, con el motivo visible cuando no puede.
 *
 * `Button` no acepta `title` ni `aria-label`, así que el motivo se pinta como
 * texto visible dentro del bloque de la fila y no como tooltip — que además es
 * mejor en móvil, donde no hay hover.
 */
export const AtajosRapidos: React.FC<{ atajos: Atajo[]; onIr: (to: string) => void }> = ({
  atajos,
  onIr,
}) => (
  <div className="mt-5 border-t border-gray-100 pt-4 dark:border-gray-800">
    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
      Acciones rápidas
    </span>
    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
      {atajos.map((a) => {
        const habilitado = puede(a.capacidad);
        return (
          <div
            key={a.to}
            className="flex flex-col gap-1"
            data-atajo={a.to}
            data-atajo-capacidad={a.capacidad}
          >
            {/* 🚨 El `data-atajo` va en este `<div>`, NO en el `<Button>`.
                `Button` no acepta `{...rest}` ni tiene index signature: solo
                `onClick`/`disabled`/`className` llegan al `<button>` real, así
                que un `data-*` puesto ahí **desaparece sin error** — TypeScript
                no lo caza porque los atributos con guion están exentos del
                chequeo de propiedades sobrantes. Es exactamente la familia de
                trampa de `aria-*`/`data-*` anotada en este repo, y un arnés
                anclado al atributo ausente reportaría «el atajo no se pinta».
                Deuda: darle `{...rest}` a `Button`.

                `data-atajo-capacidad` NO es decorativo: es la capacidad que el
                atajo declara, publicada en el DOM para que se pueda MEDIR el
                bundle que de verdad está servido. Antes el arnés la leía de un
                JSON extraído del FUENTE, y con eso un sabotaje que cambiaba la
                capacidad en el código no producía ni un fallo: el check
                comparaba el fuente sano contra el fuente sano. Un control que
                sólo mira el fuente nunca puede ver un defecto del binario. */}
            <Button
              size="sm"
              variant="outline"
              disabled={!habilitado}
              onClick={() => habilitado && onIr(a.to)}
              className="w-full justify-center rounded-full text-xs font-semibold"
            >
              {a.emoji && <span aria-hidden="true">{a.emoji}</span>}
              {a.label}
            </Button>
            {!habilitado && (
              <span className="flex items-center gap-1 px-1 text-[10px] leading-tight text-gray-400 dark:text-gray-500">
                <Lock className="size-3 shrink-0" />
                {motivoSinPermiso(a.capacidad)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// CATÁLOGO DE MÓDULOS PRÓXIMOS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Módulos del catálogo que **esta organización no tiene activos**.
 *
 * Responde «¿qué más se puede contratar?». Se deriva del `CATALOGO_MODULOS`
 * cruzado con la pertenencia de la organización, no de una lista escrita a mano:
 * una lista a mano es como aparecieron tres descripciones distintas del mismo
 * módulo.
 *
 * `disponible` decide el rótulo, y es la única respuesta a «¿se puede usar hoy?»:
 *   · `disponible: true`  → «Disponible para instalar»
 *   · `disponible: false` → «Próximamente»
 *
 * Hoy los dos módulos del catálogo están en `disponible: true`, así que este
 * rótulo no se pinta. El día que se declare uno sin implementarlo, sale
 * «Próximamente» solo — sin tocar nada aquí.
 */
export function modulosProximos(activos: readonly string[]): InfoModuloNegocio[] {
  return Object.values(CATALOGO_MODULOS)
    .filter((m) => !activos.includes(m.id))
    .map((m) => m);
}

export interface TarjetaProximoProps {
  modulo: InfoModuloNegocio;
  onVerEspecificaciones: (modulo: InfoModuloNegocio) => void;
}

export const TarjetaProximo: React.FC<TarjetaProximoProps> = observer(
  ({ modulo, onVerEspecificaciones }) => {
    const disponible = modulo.disponible;
    // Ver las especificaciones es leer el catálogo, pero el único destino real
    // (`/configuracion?tab=modulos`) está guardado por **`team.manage`**.
    //
    // 🚨 NO se usa `puedeVerConfig()` aquí, aunque el nombre lo pida a gritos:
    // esa función comprueba `settings.read`, y en el seed esa capacidad la tiene
    // `supervisor_pedidos` mientras que `team.manage` **solo la tiene
    // `admin_tienda`**. Con `puedeVerConfig()` el botón quedaría habilitado para
    // un rol que la pantalla de destino expulsa — exactamente el defecto
    // transversal de este repo, escondido detrás de un nombre plausible.
    const puedeGestionar = puede("team.manage");

    return (
      <div
        data-modulo-proximo={modulo.id}
        className="flex flex-col justify-between rounded-3xl border border-gray-200 bg-white/70 p-6 dark:border-gray-800 dark:bg-gray-900/50"
      >
        <div>
          <div className="flex items-start justify-between gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500">
              {/* `BoxCube` sería el glifo de inventario, pero no existe en
                  `@/icons`; se usa el genérico del catálogo. No se inventa un
                  SVG suelto aquí: ese es el defecto del glifo duplicado. */}
              <CartIcon className="h-6 w-6" />
            </div>
            <Badge color={disponible ? "info" : "light"} size="sm">
              {disponible ? "Disponible para instalar" : "Próximamente"}
            </Badge>
          </div>

          <h4 className="mt-4 text-lg font-bold text-ink-title dark:text-white">{modulo.nombre}</h4>
          <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
            {modulo.descripcion}
          </p>

          {modulo.destacados.length > 0 && (
            <ul className="mt-3 space-y-1">
              {modulo.destacados.slice(0, 3).map((d) => (
                <li key={d} className="flex items-start gap-1.5 text-[11px] text-gray-500 dark:text-gray-400">
                  <span className="mt-1 size-1 shrink-0 rounded-full bg-gray-300 dark:bg-gray-600" />
                  {d}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div
          className="mt-6 flex flex-col gap-1 border-t border-gray-100 pt-4 dark:border-gray-800"
          data-ver-especificaciones={modulo.id}
        >
          {/* Igual que en los atajos: el ancla va en el contenedor porque
              `Button` no reenvía atributos sueltos al DOM. */}
          <Button
            size="sm"
            variant="outline"
            disabled={!puedeGestionar}
            onClick={() => puedeGestionar && onVerEspecificaciones(modulo)}
            className="w-full rounded-full text-xs font-semibold"
          >
            Ver especificaciones
          </Button>
          {!puedeGestionar && (
            <span className="flex items-center gap-1 px-1 text-[10px] leading-tight text-gray-400 dark:text-gray-500">
              <Lock className="size-3 shrink-0" />
              {motivoSinPermiso("team.manage")}
            </span>
          )}
        </div>
      </div>
    );
  },
);

/** Flecha re-exportada para que la página no dependa de `lucide-react` directo. */
export const IconoEntrar = ArrowRight;
