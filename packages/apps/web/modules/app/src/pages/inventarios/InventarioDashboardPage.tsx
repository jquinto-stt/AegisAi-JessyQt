/**
 * Dashboard de Inventario — la pantalla responde «¿qué necesita atención hoy?».
 *
 * Todo lo que se pinta sale del store: nada de cifras de muestra. Usa el
 * lenguaje visual del módulo (`inventario.ui.tsx`), así que la identidad NECTO
 * (DM Sans, escala 36/24/16/14/12, paleta oficial) llega por los tokens.
 */
import React from "react";
import { useNavigate } from "react-router";
import { observer } from "mobx-react-lite";
import { ArrowRight, ChevronRight } from "lucide-react";
import {
  inventarioStore,
  deltaTotal,
  fechaRelativa,
  formatearDelta,
  formatearEntero,
  formatearMoneda,
  ordenAbierta,
  ETIQUETA_TIPO_MOVIMIENTO,
  type TipoMovimiento,
} from "@/stores";
import { inicialesDe } from "@/utils";
import { Boton, cx, EnlaceTexto, MenuBoton, OPCIONES_MOVIMIENTO, PaginaInventario, Tarjeta, Vacio } from "./inventario.ui";
import { ActividadBodegaCard } from "./ActividadBodegaCard";
import { OrdenesEnCursoCard, type OrdenEnCurso } from "./OrdenesEnCursoCard";
import { ValorPorCategoriaCard } from "./ValorPorCategoriaCard";
import { PrioridadReposicionCard } from "./PrioridadReposicionCard";

function plural(n: number, singular: string, pluralForm: string): string {
  return `${formatearEntero(n)} ${n === 1 ? singular : pluralForm}`;
}

/** Avatar del responsable teñido por tipo de movimiento: el color dice qué pasó, las iniciales quién. */
const AVATAR: Record<TipoMovimiento, string> = {
  entrada: "bg-accent-50 text-secondary-700 dark:bg-accent-300/15 dark:text-accent-200",
  salida: "bg-gray-100 text-ink-title dark:bg-white/[0.08] dark:text-white",
  ajuste: "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-400",
  transferencia: "bg-cream text-ink-body dark:bg-cream/15 dark:text-cream",
};

interface Indicador {
  etiqueta: string;
  valor: string;
  nota: string;
  principal?: boolean;
  alerta?: boolean;
  destino: string;
}

/** Franja de indicadores del módulo, con cada cifra como acceso a su pantalla. */
function FranjaNavegable({ items, onIr }: { items: Indicador[]; onIr: (ruta: string) => void }) {
  return (
    <section
      aria-label="Indicadores del inventario"
      className="grid grid-cols-2 overflow-hidden rounded-2xl border border-gray-200 bg-white xl:grid-cols-4 dark:border-white/10 dark:bg-white/[0.02]"
    >
      {items.map((k, i) => (
        <button
          key={k.etiqueta}
          type="button"
          onClick={() => onIr(k.destino)}
          className={cx(
            "group flex min-w-0 flex-col items-start border-gray-200 px-4 py-4 sm:px-5 text-left transition-colors hover:bg-gray-50 focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-500 dark:border-white/10 dark:hover:bg-white/[0.03]",
            // Móvil y tablet: la cifra principal y la última ocupan su fila; las dos del medio van lado a lado.
            (k.principal || i === items.length - 1) && "col-span-2 xl:col-span-1",
            i >= 1 && "border-t xl:border-t-0",
            i === 2 && "border-l",
            i >= 1 && "xl:border-l",
          )}
        >
          <span className="flex w-full items-center justify-between gap-2 text-theme-xs text-gray-600 dark:text-gray-400">
            {k.etiqueta}
            <ChevronRight className="h-4 w-4 text-gray-400 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </span>
          <span
            className={cx(
              "mt-1 tabular-nums tracking-tight",
              k.principal ? "text-title-md font-bold" : "text-theme-2xl font-bold",
              k.alerta ? "text-brand-700 dark:text-brand-400" : "text-ink-title dark:text-white",
            )}
          >
            {k.valor}
          </span>
          <span className={cx("mt-1 text-theme-xs", k.alerta ? "font-bold text-brand-700 dark:text-brand-400" : "text-gray-600 dark:text-gray-400")}>
            {k.nota}
          </span>
        </button>
      ))}
    </section>
  );
}

export const InventarioDashboardPage = observer(function InventarioDashboardPage() {
  const s = inventarioStore;
  const navigate = useNavigate();
  const r = s.resumen;
  const cola = s.colaReorden;
  const hoy = new Date();
  const inicioDeHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());

  const abiertas = s.ordenes
    .filter(ordenAbierta)
    .sort((a, b) => (a.fechaEsperada ?? "9999").localeCompare(b.fechaEsperada ?? "9999"));
  const ordenesEnCurso: OrdenEnCurso[] = abiertas.slice(0, 3).map((o) => {
    const pedidas = o.lineas.reduce((t, l) => t + l.cantidad, 0);
    const recibidas = o.lineas.reduce((t, l) => t + l.recibida, 0);
    return {
      id: o.id,
      numero: o.numero,
      proveedor: s.nombreProveedor(o.proveedorId),
      estado: o.estado,
      recibidas,
      pedidas,
      valorPendiente: o.lineas.reduce((t, l) => t + (l.cantidad - l.recibida) * l.costoUnitario, 0),
      fechaEsperada: o.fechaEsperada,
      atrasada: o.fechaEsperada !== null && new Date(o.fechaEsperada) < inicioDeHoy,
    };
  });

  const movimientos = s.movimientosRecientes.slice(0, 5);

  const kpis: Indicador[] = [
    {
      etiqueta: "Valor del inventario",
      valor: formatearMoneda(r.valor),
      nota: `A costo · ${plural(r.unidades, "unidad", "unidades")}`,
      principal: true,
      destino: "/inventarios/articulos",
    },
    {
      etiqueta: "Por reponer",
      valor: formatearEntero(cola.length),
      nota: `${plural(r.agotados, "agotado", "agotados")} · ${formatearEntero(r.bajos)} bajo mínimo`,
      alerta: r.agotados > 0,
      destino: cola.length > 0 ? "/inventarios/reorden" : "/inventarios/articulos",
    },
    {
      etiqueta: "En camino",
      valor: formatearEntero(r.ordenesAbiertas),
      nota: `${formatearMoneda(r.valorEnTransito)} por recibir`,
      destino: "/inventarios/ordenes-compra?tab=curso",
    },
    {
      etiqueta: "Artículos activos",
      valor: formatearEntero(r.skus),
      nota: r.conteosAbiertos > 0 ? `${plural(r.conteosAbiertos, "toma de inventario abierta", "tomas de inventario abiertas")}` : "Sin tomas de inventario abiertas",
      destino: r.conteosAbiertos > 0 ? "/inventarios/conteos" : "/inventarios/articulos",
    },
  ];

  const resumen =
    cola.length === 0 ? (
      "Todo el catálogo está sobre su punto de reorden."
    ) : (
      <>
        <strong className="text-ink-title dark:text-white">{plural(cola.length, "artículo necesita", "artículos necesitan")} reposición</strong>
        {r.agotados > 0 && ` · ${plural(r.agotados, "agotado", "agotados")}`}
        {r.ordenesAbiertas > 0 && ` · ${plural(r.ordenesAbiertas, "orden", "órdenes")} en camino`}
      </>
    );

  return (
    <PaginaInventario
      titulo="Dashboard de inventario"
      resumen={resumen}
      acciones={
        <>
          <MenuBoton
            etiqueta="Registrar movimiento"
            variante="secundario"
            opciones={OPCIONES_MOVIMIENTO.map((o) => ({
              etiqueta: o.etiqueta,
              descripcion: o.descripcion,
              onSelect: () => navigate(`/inventarios/movimientos?nuevo=${o.tipo}`),
            }))}
          />
          <Boton
            variante="principal"
            onClick={() => navigate(cola.length > 0 ? "/inventarios/reorden" : "/inventarios/articulos")}
          >
            {cola.length > 0 ? "Preparar reposición" : "Revisar artículos"}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Boton>
        </>
      }
    >
      <FranjaNavegable items={kpis} onIr={navigate} />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-7">
          <PrioridadReposicionCard
            items={cola.slice(0, 4)}
            total={cola.length}
            onVerCola={() => navigate("/inventarios/reorden")}
            onSeleccionar={(id) => navigate(`/inventarios/articulos?articulo=${id}`)}
          />
          <ActividadBodegaCard
            movimientos={s.movimientos}
            hoy={hoy}
            onVerMovimientos={() => navigate("/inventarios/movimientos")}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-6 lg:col-span-5">
          <OrdenesEnCursoCard
            ordenes={ordenesEnCurso}
            total={abiertas.length}
            onVerTodas={() => navigate("/inventarios/ordenes-compra?tab=curso")}
            onSeleccionar={(id) => navigate(`/inventarios/ordenes-compra?oc=${id}`)}
          />

          <Tarjeta
            titulo="Actividad reciente"
            accion={<EnlaceTexto onClick={() => navigate("/inventarios/movimientos")}>Ver todos</EnlaceTexto>}
          >
            {movimientos.length === 0 ? (
              <Vacio>Todavía no hay movimientos registrados.</Vacio>
            ) : (
              <ul className="-my-1">
                {movimientos.map((m) => {
                  const delta = deltaTotal(m);
                  return (
                    <li key={m.id} className="border-t border-gray-100 first:border-t-0 dark:border-white/5">
                      <button
                        type="button"
                        onClick={() => navigate(`/inventarios/movimientos?movimiento=${m.id}`)}
                        className="group -mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-brand-500 dark:hover:bg-white/[0.03]"
                      >
                        <span
                          className={cx("flex size-8 shrink-0 items-center justify-center rounded-full text-theme-xs font-bold", AVATAR[m.tipo])}
                          aria-hidden
                        >
                          {inicialesDe(m.responsable)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="line-clamp-2 font-bold text-ink-body group-hover:underline sm:line-clamp-1 dark:text-white">
                            {s.articulo(m.articuloId)?.nombre ?? m.articuloId}
                          </span>
                          <span className="block truncate text-theme-xs text-gray-600 dark:text-gray-400">
                            {ETIQUETA_TIPO_MOVIMIENTO[m.tipo]} · {m.responsable} · {fechaRelativa(m.fecha, hoy)}
                          </span>
                        </span>
                        {m.tipo === "transferencia" ? (
                          <span className="shrink-0 text-right text-theme-xs tabular-nums text-gray-600 dark:text-gray-400">
                            {formatearEntero(m.cantidad)} movidas
                          </span>
                        ) : (
                          <span
                            className={cx(
                              "shrink-0 font-bold tabular-nums",
                              delta > 0 ? "text-ink-title dark:text-accent-300" : "text-ink-body dark:text-white",
                            )}
                          >
                            {formatearDelta(delta)}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Tarjeta>
        </div>
      </div>

      <ValorPorCategoriaCard
        categorias={s.valorPorCategoria.slice(0, 6)}
        valorTotal={r.valor}
        onVerCatalogo={() => navigate("/inventarios/articulos")}
      />
    </PaginaInventario>
  );
});
