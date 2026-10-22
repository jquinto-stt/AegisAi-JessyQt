/**
 * Dashboard de Inventario — Vista ejecutiva y operativa unificada.
 *
 * Sigue estrictamente la identidad visual NECTO:
 * - Tipografía: DM Sans (300 Light, 400 Regular, 700 Bold)
 * - Tamaños: 36px, 24px, 16px, 14px, 12px
 * - Paleta:
 *   · #FF3F1A — Naranja NECTO (Acentos, CTAs, alertas)
 *   · #97D6DF — Cyan NECTO (Indicadores, estados en camino)
 *   · #ECECEC — Gris claro (Bordes, tracks)
 *   · #190088 — Azul profundo NECTO (Títulos, métricas clave)
 *   · #212121 — Dark (Texto general)
 *   · #EFE6D3 — Cream / Complementario
 */
import React, { useEffect, useId, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { observer } from "mobx-react-lite";
import {
  ArrowRight,
  Boxes,
  ChevronDown,
  Plus,
  TriangleAlert,
  Truck,
  Wallet,
} from "lucide-react";
import {
  inventarioStore,
  deltaTotal,
  fechaRelativa,
  formatearDelta,
  formatearEntero,
  formatearMoneda,
  stockTotal,
  ETIQUETA_TIPO_MOVIMIENTO,
  type TipoMovimiento,
} from "@/stores";
import { Card } from "@/elements/ui/card";
import { inicialesDe } from "@/utils";
import { OPCIONES_MOVIMIENTO } from "./inventario.ui";
import { VistaAnaliticaCard } from "./VistaAnaliticaCard";
import { BestSellingProductsCard } from "./BestSellingProductsCard";
import { ActiveWorkOrdersCard } from "./ActiveWorkOrdersCard";
import { SalesOrderSummaryCard } from "./SalesOrderSummaryCard";
import "./inventario-dashboard.css";

function plural(n: number, singular: string, pluralForm: string): string {
  return `${formatearEntero(n)} ${n === 1 ? singular : pluralForm}`;
}

/** Menú de los cuatro movimientos con estilo NECTO. */
function MenuMovimiento({ onElegir }: { onElegir: (tipo: TipoMovimiento) => void }) {
  const [abierto, setAbierto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const primerItem = useRef<HTMLButtonElement>(null);
  const idMenu = useId();

  useEffect(() => {
    if (!abierto) return;
    primerItem.current?.focus();
    const fuera = (e: MouseEvent) => {
      if (!raiz.current?.contains(e.target as Node)) setAbierto(false);
    };
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbierto(false);
    };
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", tecla);
    };
  }, [abierto]);

  return (
    <div className="inv-action-menu font-sans" ref={raiz}>
      <button
        type="button"
        className="flex items-center gap-2 rounded-xl border border-[#ECECEC] bg-white px-3.5 py-2 text-[14px] font-bold text-[#212121] shadow-theme-xs transition-colors hover:border-[#97D6DF] dark:border-white/10 dark:bg-white/[0.04] dark:text-white cursor-pointer select-none"
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-controls={abierto ? idMenu : undefined}
        aria-label="Registrar movimiento"
        onClick={() => setAbierto((v) => !v)}
      >
        <span>Registrar movimiento</span>
        <Plus className="h-4 w-4 text-[#FF3F1A]" aria-hidden />
        <ChevronDown className="h-3.5 w-3.5 text-[#212121]/50 dark:text-[#ECECEC]/50" aria-hidden />
      </button>
      {abierto && (
        <div
          className="inv-menu font-sans border-[#ECECEC] dark:border-white/10"
          role="menu"
          id={idMenu}
          aria-label="Tipo de movimiento"
        >
          {OPCIONES_MOVIMIENTO.map((o, i) => (
            <button
              key={o.tipo}
              ref={i === 0 ? primerItem : undefined}
              type="button"
              role="menuitem"
              className="inv-menu__item text-left"
              onClick={() => {
                setAbierto(false);
                onElegir(o.tipo);
              }}
            >
              <strong className="text-[14px] font-bold text-[#190088] dark:text-white">
                {o.etiqueta}
              </strong>
              <span className="text-[12px] font-normal text-[#212121]/70 dark:text-[#ECECEC]/70">
                {o.descripcion}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export const InventarioDashboardPage = observer(function InventarioDashboardPage() {
  const s = inventarioStore;
  const navigate = useNavigate();
  const r = s.resumen;
  const cola = s.colaReorden;

  // Órdenes activas mapeadas para ActiveWorkOrdersCard
  const ordenesActivas = s.ordenes
    .filter((o) => o.estado !== "cancelada" && o.estado !== "recibida")
    .slice(0, 3)
    .map((o) => {
      const completado = o.lineas.reduce((t, l) => t + l.recibida, 0);
      const requerido = o.lineas.reduce((t, l) => t + l.cantidad, 0);
      const costo = o.lineas.reduce((t, l) => t + l.cantidad * l.costoUnitario, 0);
      return {
        id: o.id,
        codigo: o.numero,
        completado,
        requerido: requerido > 0 ? requerido : 1,
        fechaEsperada: o.fechaEsperada ? `${o.fechaEsperada} 2026` : "12 Octubre 2026",
        costo,
      };
    });

  // Top artículos para BestSellingProductsCard
  const topVendidos = s.articulosActivos.slice(0, 4).map((a, idx) => ({
    id: a.id,
    nombre: a.nombre,
    variantes: idx % 2 === 0 ? 6 : undefined,
    categoria: a.categoria,
    stock: stockTotal(a),
    colorEstado:
      idx === 0 || idx === 2 ? "bg-[#FF3F1A]" : idx === 1 ? "bg-[#97D6DF]" : "bg-[#190088]",
  }));

  // Movimientos recientes para la bitácora
  const movimientos = s.movimientosRecientes.slice(0, 5);

  // Métricas calculadas para la tarjeta analítica
  const stocks = s.articulosActivos.map((a) => stockTotal(a));
  const stockMinimo = stocks.length > 0 ? Math.min(...stocks) : 97;
  const stockPromedio =
    stocks.length > 0 ? Math.round(stocks.reduce((acc, a) => acc + a, 0) / stocks.length) : 140;
  const stockMaximo = stocks.length > 0 ? Math.max(...stocks) : 259;

  // 4 KPIs unificados
  const kpis = [
    {
      etiqueta: "Valor del inventario",
      Icono: Wallet,
      valor: formatearMoneda(r.valor),
      nota: `a costo · ${formatearEntero(r.unidades)} unidades`,
      alerta: false,
      onClick: () => navigate("/inventarios/articulos"),
    },
    {
      etiqueta: "Referencias activas",
      Icono: Boxes,
      valor: formatearEntero(r.skus),
      nota: `${plural(r.skus, "artículo registrado", "artículos registrados")}`,
      alerta: false,
      onClick: () => navigate("/inventarios/articulos"),
    },
    {
      etiqueta: "Por reponer",
      Icono: TriangleAlert,
      valor: formatearEntero(cola.length),
      nota: `${plural(r.agotados, "agotado", "agotados")} · ${plural(r.bajos, "bajo mínimo", "bajo mínimo")}`,
      alerta: r.agotados > 0,
      onClick: () => navigate(cola.length > 0 ? "/inventarios/reorden" : "/inventarios/articulos"),
    },
    {
      etiqueta: "En camino",
      Icono: Truck,
      valor: formatearEntero(r.ordenesAbiertas),
      nota: `${formatearMoneda(r.valorEnTransito)} por recibir`,
      alerta: false,
      onClick: () => navigate("/inventarios/ordenes-compra?tab=curso"),
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 font-sans">
      {/* ── Encabezado limpio y ejecutivo ───────────────────────────── */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight text-[#190088] dark:text-white">
            Dashboard de inventario
          </h1>
          <p className="mt-1 text-[14px] font-normal text-[#212121]/70 dark:text-[#ECECEC]/70">
            Control de existencias, rotación de artículos y flujo de órdenes activas
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <MenuMovimiento
            onElegir={(tipo) => navigate(`/inventarios/movimientos?nuevo=${tipo}`)}
          />
          <button
            type="button"
            className="flex items-center gap-2 rounded-xl bg-[#FF3F1A] px-4 py-2.5 text-[14px] font-bold text-white shadow-theme-xs transition-all hover:bg-[#e5351a] cursor-pointer select-none"
            onClick={() => navigate(cola.length > 0 ? "/inventarios/reorden" : "/inventarios/articulos")}
          >
            <span>{cola.length > 0 ? "Preparar reposición" : "Revisar artículos"}</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* ── Fila de KPIs Principales (Diseño Card Unificado) ─────────── */}
      <section
        className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Métricas del inventario"
      >
        {kpis.map((k) => {
          const Icono = k.Icono;
          return (
            <button
              key={k.etiqueta}
              type="button"
              onClick={k.onClick}
              className="group block h-full w-full text-left cursor-pointer transition-transform hover:-translate-y-0.5 focus:outline-none"
            >
              <Card className="h-full border-[#ECECEC] dark:border-white/10 transition-all group-hover:border-[#97D6DF]">
                <div className="flex items-start justify-between">
                  <p className="text-[14px] font-normal text-[#212121]/70 dark:text-[#ECECEC]/70">{k.etiqueta}</p>
                  <span className="text-[#97D6DF] transition-colors group-hover:text-[#190088] dark:group-hover:text-white">
                    <Icono className="h-5 w-5" aria-hidden="true" />
                  </span>
                </div>
                <p className="mt-3 text-[36px] font-bold tracking-tight text-[#190088] dark:text-white leading-10">
                  {k.valor}
                </p>
                <p className="mt-1.5 flex items-center gap-1.5 text-[12px] font-normal text-[#212121]/70 dark:text-[#ECECEC]/70">
                  <span className={k.alerta ? "font-bold text-[#FF3F1A]" : ""}>
                    {k.nota}
                  </span>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    className="h-3 w-3 shrink-0"
                    aria-hidden="true"
                  >
                    {!k.alerta ? (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M17 7H9m8 0v8" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 7l10 10M17 17H9m8 0V9" />
                    )}
                  </svg>
                </p>
              </Card>
            </button>
          );
        })}
      </section>

      {/* ── Vista Analítica (Heatmap Anual y Métricas de Stock) ──────── */}
      <section aria-label="Vista analítica anual de inventario">
        <VistaAnaliticaCard
          stockMinimo={stockMinimo}
          stockPromedio={stockPromedio}
          stockMaximo={stockMaximo}
          onVerDetalle={() => navigate("/inventarios/movimientos")}
        />
      </section>

      {/* ── Rejilla Operativa: Órdenes, Ventas, Top Productos y Feed ── */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* Columna Izquierda (7 columnas): Órdenes activas y Resumen de ventas */}
        <div className="flex flex-col gap-6 lg:col-span-7">
          <ActiveWorkOrdersCard
            ordenes={ordenesActivas.length > 0 ? ordenesActivas : undefined}
            onVerMas={() => navigate("/inventarios/ordenes-compra")}
            onSeleccionar={(id) => navigate(`/inventarios/ordenes-compra?oc=${id}`)}
          />

          <SalesOrderSummaryCard />
        </div>

        {/* Columna Derecha (5 columnas): Más vendidos y Actividad reciente */}
        <div className="flex flex-col gap-6 lg:col-span-5">
          <BestSellingProductsCard
            items={topVendidos.length > 0 ? topVendidos : undefined}
            onVerMas={() => navigate("/inventarios/articulos")}
            onSeleccionar={(id) => navigate(`/inventarios/articulos?articulo=${id}`)}
          />

          {/* Tarjeta limpia de Actividad reciente */}
          <Card className="flex flex-col gap-4 p-5 sm:p-6 font-sans border-[#ECECEC] dark:border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[16px] font-bold tracking-tight text-[#190088] dark:text-white">
                  Actividad reciente
                </h3>
                <p className="mt-0.5 text-[12px] font-normal text-[#212121]/70 dark:text-[#ECECEC]/70">
                  Últimos movimientos de bodega registrados
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate("/inventarios/movimientos")}
                className="group flex items-center gap-1 text-[12px] font-bold tracking-wider text-[#FF3F1A] hover:underline uppercase transition-all cursor-pointer select-none"
              >
                <span>VER TODOS</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>

            {movimientos.length === 0 ? (
              <p className="py-6 text-center text-[12px] font-normal text-[#212121]/60 dark:text-[#ECECEC]/60">
                Todavía no hay movimientos registrados.
              </p>
            ) : (
              <div className="flex flex-col divide-y divide-[#ECECEC] dark:divide-white/10">
                {movimientos.map((m) => {
                  const articulo = s.articulo(m.articuloId);
                  const delta = deltaTotal(m);
                  return (
                    <div
                      key={m.id}
                      onClick={() => navigate(`/inventarios/movimientos?movimiento=${m.id}`)}
                      className="group flex items-center justify-between gap-3 rounded-xl px-1 py-3 transition-colors hover:bg-[#ECECEC]/30 dark:hover:bg-white/[0.04] cursor-pointer"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className="flex size-9 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white shadow-xs"
                          style={{
                            background:
                              m.tipo === "entrada"
                                ? "#97D6DF"
                                : m.tipo === "salida"
                                ? "#190088"
                                : m.tipo === "ajuste"
                                ? "#FF3F1A"
                                : "#212121",
                            color: m.tipo === "entrada" ? "#190088" : "#ffffff",
                          }}
                        >
                          {inicialesDe(m.responsable)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[14px] font-bold text-[#212121] group-hover:text-[#FF3F1A] dark:text-white transition-colors">
                            {articulo?.nombre ?? m.articuloId}
                          </p>
                          <p className="text-[12px] font-normal text-[#212121]/70 dark:text-[#ECECEC]/70">
                            {ETIQUETA_TIPO_MOVIMIENTO[m.tipo]} · {m.responsable} · {fechaRelativa(m.fecha)}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <span
                          className={`text-[14px] font-bold tabular-nums ${
                            delta > 0
                              ? "text-[#190088] dark:text-[#97D6DF]"
                              : delta < 0
                              ? "text-[#FF3F1A]"
                              : "text-[#212121]/70 dark:text-[#ECECEC]/70"
                          }`}
                        >
                          {formatearDelta(delta)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
});
