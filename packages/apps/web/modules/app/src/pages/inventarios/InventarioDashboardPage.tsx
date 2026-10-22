/**
 * Dashboard de Inventario.
 *
 * Pregunta de la pantalla: «¿qué hay que reponer hoy y qué se interpone?».
 * La composición toma lo que hace legible un tablero de operaciones: una
 * franja de indicadores, dos lecturas del catálogo (salud y valor por
 * ubicación), la cola de reposición como mesa de trabajo y la actividad
 * reciente en el riel. Todo se calcula desde los datos del store; cada cifra
 * que se repite sale de la misma variable.
 */
import React, { useEffect, useId, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { observer } from "mobx-react-lite";
import {
  ArrowRight,
  Boxes,
  ChevronDown,
  ChevronRight,
  Plus,
  TriangleAlert,
  Truck,
  Wallet,
} from "lucide-react";
import {
  inventarioStore,
  deltaTotal,
  estadoStock,
  fechaRelativa,
  formatearDelta,
  formatearEntero,
  formatearMoneda,
  ordenAbierta,
  stockTotal,
  unidadesPendientes,
  valorArticulo,
  ETIQUETA_TIPO_MOVIMIENTO,
  type EstadoStock,
  type ItemReorden,
  type Proveedor,
  type TipoMovimiento,
} from "@/stores";
import { Card } from "@/elements/ui/card";
import { inicialesDe } from "@/utils";
import { OPCIONES_MOVIMIENTO } from "./inventario.ui";
import { VistaAnaliticaCard } from "./VistaAnaliticaCard";
import "./inventario-dashboard.css";

const PERSONA_TONOS = 4;

const ETIQUETA_SALUD: Record<EstadoStock, string> = {
  normal: "En rango",
  bajo: "Bajo mínimo",
  agotado: "Agotado",
  exceso: "En exceso",
};

const COLOR_SALUD: Record<EstadoStock, string> = {
  normal: "var(--d-health-ok)",
  bajo: "var(--d-low)",
  agotado: "var(--d-error)",
  exceso: "var(--d-excess)",
};

type TonoSenal = "danger" | "warning" | "info";

interface SenalInventario {
  id: string;
  tono: TonoSenal;
  titulo: string;
  detalle: string;
  accion: string;
  onClick: () => void;
}

interface PlanProveedor {
  proveedor: Proveedor;
  items: number;
  unidades: number;
  costo: number;
  agotados: number;
}

/** Tono estable por nombre: la misma persona conserva su color entre pantallas. */
function tonoPersona(nombre: string): number {
  let suma = 0;
  for (const c of nombre) suma += c.charCodeAt(0);
  return suma % PERSONA_TONOS;
}

function plural(n: number, singular: string, pluralForm: string): string {
  return `${formatearEntero(n)} ${n === 1 ? singular : pluralForm}`;
}

/** Nombre de proveedor para una fila: quita la forma jurídica y el adjetivo que no distingue. */
function proveedorCorto(nombre: string): string {
  return nombre
    .replace(/\s+S\.A\.S\.$/i, "")
    .replace(/\s+Industrial\s+/i, " ")
    .replace(/\s+Caribe$/i, "");
}

/**
 * La regla de surtido de una fila: existencia, mercancía en camino y punto de
 * reorden sobre una sola escala. Es el elemento que este dashboard tiene y
 * ningún otro: la decisión de pedir se ve, no solo se lee.
 */
function BarraSurtido({ item }: { item: ItemReorden }) {
  const escala = Math.max(item.articulo.stockMaximo, item.stock + item.enTransito, 1);
  const stockPct = Math.min(100, (item.stock / escala) * 100);
  const transitoPct = Math.min(100 - stockPct, (item.enTransito / escala) * 100);
  return (
    <span
      className="inv-meter"
      role="img"
      aria-label={`${item.articulo.nombre}: ${item.stock} en existencia, ${item.enTransito} en camino; punto de reorden ${item.articulo.puntoReorden}; máximo ${item.articulo.stockMaximo}.`}
    >
      <span className="inv-meter__stock" style={{ width: `${stockPct}%` }} />
      {item.enTransito > 0 && (
        <span
          className="inv-meter__transit"
          style={{ left: `${stockPct}%`, width: `${transitoPct}%` }}
        />
      )}
    </span>
  );
}

/** Menú de los cuatro movimientos. Cierra con Escape, clic fuera o al elegir. */
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
    <div className="inv-action-menu" ref={raiz}>
      <button
        type="button"
        className="inv-btn inv-btn--quiet"
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-controls={abierto ? idMenu : undefined}
        aria-label="Registrar movimiento"
        onClick={() => setAbierto((v) => !v)}
      >
        <span className="inv-menu-label-full">Registrar movimiento</span>
        <span className="inv-menu-label-short" aria-hidden>
          Movimiento
        </span>
        <Plus className="inv-menu-icon" aria-hidden />
        <ChevronDown className="inv-chevron h-4 w-4" aria-hidden />
      </button>
      {abierto && (
        <div className="inv-menu" role="menu" id={idMenu} aria-label="Tipo de movimiento">
          {OPCIONES_MOVIMIENTO.map((o, i) => (
            <button
              key={o.tipo}
              ref={i === 0 ? primerItem : undefined}
              type="button"
              role="menuitem"
              className="inv-menu__item"
              onClick={() => {
                setAbierto(false);
                onElegir(o.tipo);
              }}
            >
              <strong>{o.etiqueta}</strong>
              <span>{o.descripcion}</span>
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
  const visibles = cola.slice(0, 6);
  const pedibles = cola.filter((i) => {
    const p = i.articulo.proveedorId ? s.proveedor(i.articulo.proveedorId) : null;
    return Boolean(p?.activo) && i.sugerido > 0;
  });
  const unidadesSugeridas = pedibles.reduce((t, i) => t + i.sugerido, 0);
  const costoReposicion = pedibles.reduce((t, i) => t + i.sugerido * i.articulo.costoUnitario, 0);
  const proveedores = new Set(pedibles.map((i) => i.articulo.proveedorId).filter(Boolean)).size;
  const sinPedido = cola.filter((i) => i.enTransito === 0).length;

  const conteoSalud: Record<EstadoStock, number> = { normal: 0, bajo: 0, agotado: 0, exceso: 0 };
  for (const a of s.articulosActivos) conteoSalud[estadoStock(a)] += 1;
  const sinAlerta = conteoSalud.normal + conteoSalud.exceso;
  const saludPct = r.skus > 0 ? Math.round((sinAlerta / r.skus) * 100) : 0;

  let offsetSalud = 0;
  const saludPartes = (["normal", "bajo", "agotado", "exceso"] as EstadoStock[])
    .map((estado) => {
      const conteo = conteoSalud[estado];
      const pct = r.skus > 0 ? (conteo / r.skus) * 100 : 0;
      const parte = { estado, conteo, pct, offset: offsetSalud };
      offsetSalud += pct;
      return parte;
    })
    .filter((p) => p.conteo > 0);

  // Plan de compra: el mismo agrupamiento que usará la cola de reorden.
  const mapaPlan = new Map<string, PlanProveedor>();
  for (const i of pedibles) {
    const p = i.articulo.proveedorId ? s.proveedor(i.articulo.proveedorId) : null;
    if (!p) continue;
    const fila =
      mapaPlan.get(p.id) ?? { proveedor: p, items: 0, unidades: 0, costo: 0, agotados: 0 };
    fila.items += 1;
    fila.unidades += i.sugerido;
    fila.costo += i.sugerido * i.articulo.costoUnitario;
    if (i.estado === "agotado") fila.agotados += 1;
    mapaPlan.set(p.id, fila);
  }
  const planProveedores = [...mapaPlan.values()].sort((a, b) => b.costo - a.costo);
  const topPlan = planProveedores.slice(0, 3);
  const maxPlan = Math.max(1, ...planProveedores.map((p) => p.costo));
  const costoTop3 = topPlan.reduce((t, p) => t + p.costo, 0);
  const concentracionTop3 =
    costoReposicion > 0 ? Math.round((costoTop3 / costoReposicion) * 100) : 0;

  // Señales: reglas explícitas sobre el estado actual, cada una con su salida.
  const senales: SenalInventario[] = [];
  const agotadosSinPedido = cola.filter((i) => i.estado === "agotado" && i.enTransito === 0);
  if (agotadosSinPedido.length > 0) {
    const primero = agotadosSinPedido[0].articulo.nombre;
    senales.push({
      id: "agotados-sin-pedido",
      tono: "danger",
      titulo:
        agotadosSinPedido.length === 1
          ? "1 agotado sin pedido"
          : `${formatearEntero(agotadosSinPedido.length)} agotados sin pedido`,
      detalle:
        agotadosSinPedido.length === 1
          ? primero
          : `${primero} y ${formatearEntero(agotadosSinPedido.length - 1)} más`,
      accion: "Reponer",
      onClick: () => navigate("/inventarios/reorden"),
    });
  }

  // Llegadas: primero las atrasadas, después las más próximas.
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const llegadas = s.ordenes
    .filter(ordenAbierta)
    .slice()
    .sort((a, b) => (a.fechaEsperada ?? "9999").localeCompare(b.fechaEsperada ?? "9999"))
    .slice(0, 2);

  const atrasadas = s.ordenes.filter(
    (oc) => ordenAbierta(oc) && oc.fechaEsperada !== null && new Date(oc.fechaEsperada) < hoy,
  );
  if (atrasadas.length > 0) {
    const oc = atrasadas[0];
    const pendientes = oc.lineas.reduce((t, l) => t + unidadesPendientes(l), 0);
    senales.push({
      id: "orden-atrasada",
      tono: "warning",
      titulo: atrasadas.length === 1 ? `${oc.numero} atrasada` : `${atrasadas.length} órdenes atrasadas`,
      detalle: `${formatearEntero(pendientes)} u. · ${proveedorCorto(s.nombreProveedor(oc.proveedorId))}`,
      accion: "Ver orden",
      onClick: () => navigate(`/inventarios/ordenes-compra?oc=${oc.id}`),
    });
  }

  const conteosRevision = s.conteos.filter((c) => c.estado === "en_revision");
  if (conteosRevision.length > 0) {
    const c = conteosRevision[0];
    const contadas = c.lineas.filter((l) => l.contado !== null).length;
    senales.push({
      id: "conteo-por-revisar",
      tono: "info",
      titulo:
        conteosRevision.length === 1 ? "Conteo por revisar" : `${conteosRevision.length} conteos por revisar`,
      detalle: `${s.nombreUbicacion(c.ubicacionId)} · ${formatearEntero(contadas)} de ${formatearEntero(c.lineas.length)}`,
      accion: "Revisar",
      onClick: () => navigate(`/inventarios/conteos?conteo=${c.id}`),
    });
  }

  const movimientos = s.movimientosRecientes.slice(0, 5);

  const hallazgo =
    cola.length === 0 ? (
      "Ningún artículo está en su punto de reorden. El catálogo puede esperar."
    ) : sinPedido > 0 ? (
      <>
        <strong>
          {formatearEntero(sinPedido)} de {formatearEntero(cola.length)}
        </strong>{" "}
        artículos por reponer no tienen pedido en camino.{" "}
        {r.agotados > 0 ? (
          <span className="inv-head__finding-strong">
            {plural(r.agotados, "agotado", "agotados")}.
          </span>
        ) : (
          "Ninguno está agotado."
        )}
      </>
    ) : (
      <>
        Todo lo que falta reponer ya tiene un pedido en camino.{" "}
        {r.agotados > 0
          ? `${plural(r.agotados, "artículo agotado", "artículos agotados")} esperando llegada.`
          : "Ninguno está agotado."}
      </>
    );

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
      nota: `${formatearEntero(conteoSalud.normal)} en rango · ${formatearEntero(conteoSalud.exceso)} en exceso`,
      alerta: false,
      onClick: () => navigate("/inventarios/articulos"),
    },
    {
      etiqueta: "Por reponer",
      Icono: TriangleAlert,
      valor: formatearEntero(cola.length),
      nota: `${plural(r.agotados, "agotado", "agotados")} · ${plural(r.bajos, "con existencia baja", "con existencia baja")}`,
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
    <div className="inv-dash">
      <header className="inv-head">
        <div>
          <h1 className="inv-head__title">Inventario</h1>
          <p className="inv-head__finding">{hallazgo}</p>
        </div>
        <div className="inv-actions">
          <MenuMovimiento
            onElegir={(tipo) => navigate(`/inventarios/movimientos?nuevo=${tipo}`)}
          />
          <button
            type="button"
            className="inv-btn inv-btn--primary"
            onClick={() => navigate(cola.length > 0 ? "/inventarios/reorden" : "/inventarios/articulos")}
          >
            {cola.length > 0 ? "Preparar reposición" : "Revisar artículos"}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </header>

      <section className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumen del inventario">
        {kpis.map((k) => {
          const Icono = k.Icono;
          return (
            <button
              key={k.etiqueta}
              type="button"
              onClick={k.onClick}
              className="group block h-full w-full text-left cursor-pointer transition-transform hover:-translate-y-0.5 focus:outline-none"
            >
              <Card className="h-full transition-all group-hover:border-secondary-300 dark:group-hover:border-brand-500">
                <div className="flex items-start justify-between">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{k.etiqueta}</p>
                  <span className="text-gray-300 dark:text-gray-600 transition-colors group-hover:text-gray-500 dark:group-hover:text-gray-400">
                    <Icono className="h-5 w-5" aria-hidden="true" />
                  </span>
                </div>
                <p className="mt-3 text-3xl font-semibold tracking-tight text-gray-800 dark:text-white/90">
                  {k.valor}
                </p>
                <p className="mt-1.5 flex items-center gap-1.5 text-xs font-normal text-gray-500 dark:text-gray-400">
                  <span className={k.alerta ? "font-semibold text-rose-500 dark:text-rose-400" : ""}>
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

      <div className="inv-layout">
        <div className="inv-main">
          <VistaAnaliticaCard
            stockMinimo={
              s.articulosActivos.length > 0
                ? Math.min(...s.articulosActivos.map((a) => stockTotal(a)))
                : 97
            }
            stockPromedio={
              s.articulosActivos.length > 0
                ? Math.round(
                    s.articulosActivos.reduce((acc, a) => acc + stockTotal(a), 0) /
                      s.articulosActivos.length,
                  )
                : 140
            }
            stockMaximo={
              s.articulosActivos.length > 0
                ? Math.max(...s.articulosActivos.map((a) => stockTotal(a)))
                : 259
            }
            onVerDetalle={() => navigate("/inventarios/movimientos")}
          />

          <div className="inv-charts">
            <section className="inv-card inv-health" aria-labelledby="inv-health-title">
              <div className="inv-card__head">
                <div>
                  <h2 className="inv-card__title" id="inv-health-title">
                    Salud del catálogo
                  </h2>
                  <p className="inv-card__sub">
                    {plural(r.skus, "referencia activa", "referencias activas")}
                  </p>
                </div>
              </div>
              {r.skus === 0 ? (
                <div className="inv-empty">Todavía no hay artículos activos.</div>
              ) : (
                <div className="inv-health__body">
                  <div className="inv-donut">
                    <svg
                      viewBox="0 0 120 120"
                      role="img"
                      aria-label={`Salud del catálogo: ${saludPartes
                        .map((p) => `${ETIQUETA_SALUD[p.estado]} ${p.conteo}`)
                        .join("; ")}.`}
                    >
                      <circle
                        cx="60"
                        cy="60"
                        r="50"
                        fill="none"
                        stroke="var(--d-track)"
                        strokeWidth="10"
                      />
                      {saludPartes.map((p) => (
                        <circle
                          key={p.estado}
                          cx="60"
                          cy="60"
                          r="50"
                          fill="none"
                          stroke={COLOR_SALUD[p.estado]}
                          strokeWidth="10"
                          pathLength={100}
                          strokeDasharray={`${p.pct} ${100 - p.pct}`}
                          strokeDashoffset={-p.offset}
                        />
                      ))}
                    </svg>
                    <div className="inv-donut__center">
                      <strong>{saludPct}%</strong>
                      <span>sin alerta</span>
                    </div>
                  </div>
                  <ul className="inv-health__legend">
                    {saludPartes.map((p) => (
                      <li key={p.estado}>
                        <span
                          className="inv-health__dot"
                          style={{ background: COLOR_SALUD[p.estado] }}
                          aria-hidden
                        />
                        <span className="inv-health__label">{ETIQUETA_SALUD[p.estado]}</span>
                        <span className="inv-health__count">{formatearEntero(p.conteo)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            <section className="inv-card inv-plan" aria-labelledby="inv-plan-title">
              <div className="inv-card__head">
                <div>
                  <h2 className="inv-card__title" id="inv-plan-title">
                    Plan de reposición
                  </h2>
                  <p className="inv-card__sub">
                    {plural(planProveedores.length, "proveedor", "proveedores")} ·{" "}
                    {plural(pedibles.length, "artículo", "artículos")}
                  </p>
                </div>
              </div>
              {planProveedores.length === 0 ? (
                <div className="inv-empty">No hay artículos pedibles en este momento.</div>
              ) : (
                <>
                  <ul className="inv-plan__list">
                    {topPlan.map((p) => (
                      <li key={p.proveedor.id}>
                        <div className="inv-plan__line">
                          <span className="inv-plan__name" title={p.proveedor.nombre}>
                            {proveedorCorto(p.proveedor.nombre)}
                          </span>
                          <span className="inv-plan__amount">{formatearMoneda(p.costo)}</span>
                        </div>
                        <div className="inv-plan__meta">
                          {plural(p.items, "artículo", "artículos")} ·{" "}
                          {plural(p.unidades, "unidad", "unidades")} · entrega{" "}
                          {formatearEntero(p.proveedor.plazoEntregaDias)}{" "}
                          {p.proveedor.plazoEntregaDias === 1 ? "día" : "días"}
                        </div>
                        <span className="inv-plan__bar" aria-hidden>
                          <span style={{ width: `${Math.max(4, (p.costo / maxPlan) * 100)}%` }} />
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="inv-plan__note">
                    {planProveedores.length > topPlan.length
                      ? `${formatearEntero(topPlan.length)} de ${formatearEntero(planProveedores.length)} proveedores concentran el ${formatearEntero(concentracionTop3)} % del costo.`
                      : `${formatearEntero(planProveedores.length)} proveedores · ${formatearMoneda(costoReposicion)} en total.`}
                  </p>
                </>
              )}
            </section>
          </div>

          <section className="inv-card inv-queue" aria-labelledby="inv-queue-title">
            <div className="inv-card__head inv-queue__head">
              <div>
                <h2 className="inv-card__title" id="inv-queue-title">
                  Reposición
                </h2>
                <p className="inv-card__sub">
                  {sinPedido > 0
                    ? `${formatearEntero(sinPedido)} sin pedido en camino`
                    : "Todo con pedido en camino"}{" "}
                  · {plural(proveedores, "proveedor", "proveedores")}
                </p>
              </div>
              <button
                type="button"
                className="inv-textlink"
                onClick={() => navigate("/inventarios/reorden")}
              >
                Ver los {formatearEntero(cola.length)}
                <ArrowRight aria-hidden />
              </button>
            </div>

            {cola.length === 0 ? (
              <div className="inv-empty" style={{ margin: "14px 20px 18px" }}>
                No hay artículos por reponer. Cuando uno llegue a su punto de reorden aparecerá aquí.
              </div>
            ) : (
              <>
                <div className="inv-table">
                  <div className="inv-table__head" aria-hidden>
                    <span>Artículo</span>
                    <span>Existencias</span>
                    <span className="is-num">En camino</span>
                    <span className="is-num">Por pedir</span>
                    <span />
                  </div>
                  <ul className="inv-rows" aria-label="Artículos por reponer">
                    {visibles.map((i) => (
                      <li key={i.articulo.id}>
                        <button
                          type="button"
                          className="inv-row"
                          aria-label={`${i.articulo.nombre}, ${s.nombreProveedor(i.articulo.proveedorId)}, ${i.estado === "agotado" ? "agotado" : "bajo mínimo"}; ${i.stock} en existencia, ${i.enTransito} en camino; pedir ${i.sugerido} unidades por ${formatearMoneda(i.sugerido * i.articulo.costoUnitario)}`}
                          onClick={() => navigate(`/inventarios/articulos?articulo=${i.articulo.id}`)}
                        >
                          <span className="inv-row__identity">
                            <span className="inv-row__name">{i.articulo.nombre}</span>
                            <span className="inv-row__meta">
                              <span
                                className={`inv-dot ${i.estado === "agotado" ? "inv-dot--out" : "inv-dot--low"}`}
                                aria-hidden
                              />
                              <span
                                style={{
                                  color:
                                    i.estado === "agotado" ? "var(--d-error)" : "var(--d-low)",
                                }}
                              >
                                {i.estado === "agotado" ? "Agotado" : "Bajo mínimo"}
                              </span>
                              <span className="is-sep" aria-hidden>
                                ·
                              </span>
                              <span>{i.articulo.sku}</span>
                              <span className="is-sep" aria-hidden>
                                ·
                              </span>
                              <span title={s.nombreProveedor(i.articulo.proveedorId)}>
                                {proveedorCorto(s.nombreProveedor(i.articulo.proveedorId))}
                              </span>
                            </span>
                          </span>
                          <span className="inv-row__stock">
                            <BarraSurtido item={i} />
                            <span className="inv-row__stockline">
                              <span>
                                <b>{formatearEntero(i.stock)}</b> /{" "}
                                {formatearEntero(i.articulo.puntoReorden)} mín.
                              </span>
                              {i.enTransito > 0 && (
                                <span className="inv-row__transit-inline">
                                  · {formatearEntero(i.enTransito)} en camino
                                </span>
                              )}
                            </span>
                          </span>
                          <span
                            className={`inv-row__transit${i.enTransito === 0 ? " is-zero" : ""}`}
                          >
                            {i.enTransito > 0 ? formatearEntero(i.enTransito) : "—"}
                          </span>
                          <span className="inv-row__suggest">
                            <span className="inv-row__qty">{formatearEntero(i.sugerido)} u.</span>
                            <span className="inv-row__cost">
                              {formatearMoneda(i.sugerido * i.articulo.costoUnitario)}
                            </span>
                          </span>
                          <span className="inv-row__chev" aria-hidden>
                            <ChevronRight />
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="inv-queue__foot">
                  <p>
                    Total de la cola: {plural(unidadesSugeridas, "unidad sugerida", "unidades sugeridas")} ·{" "}
                    {formatearMoneda(costoReposicion)} estimado
                  </p>
                  <p>
                    {cola.length > visibles.length
                      ? `Quedan ${formatearEntero(cola.length - visibles.length)} en la cola`
                      : "Toda la cola visible"}
                  </p>
                </div>
              </>
            )}
          </section>
        </div>

        <aside className="inv-side" aria-label="Señales, actividad y pendientes">
          <section className="inv-card inv-signals" aria-labelledby="inv-signals-title">
            <div className="inv-card__head">
              <div>
                <h2 className="inv-card__title" id="inv-signals-title">
                  Señales de inventario
                </h2>
                <p className="inv-card__sub">
                  {senales.length === 0
                    ? "Sin pendientes urgentes"
                    : plural(senales.length, "punto de atención", "puntos de atención")}
                </p>
              </div>
            </div>
            {senales.length === 0 ? (
              <div className="inv-empty">No hay señales que requieran acción ahora.</div>
            ) : (
              <ul className="inv-signals__list">
                {senales.map((senal) => (
                  <li className="inv-signal" key={senal.id}>
                    <span
                      className={`inv-signal__dot inv-signal__dot--${senal.tono}`}
                      aria-hidden
                    />
                    <span className="inv-signal__body">
                      <span className="inv-signal__title">{senal.titulo}</span>
                      <span className="inv-signal__detail">{senal.detalle}</span>
                    </span>
                    <button
                      type="button"
                      className="inv-signal__action"
                      onClick={senal.onClick}
                    >
                      {senal.accion}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="inv-card inv-activity" aria-labelledby="inv-activity-title">
            <div className="inv-card__head">
              <div>
                <h2 className="inv-card__title" id="inv-activity-title">
                  Actividad reciente
                </h2>
                <p className="inv-card__sub">Últimos movimientos de bodega</p>
              </div>
              <button
                type="button"
                className="inv-textlink"
                onClick={() => navigate("/inventarios/movimientos")}
              >
                Ver todos
                <ArrowRight aria-hidden />
              </button>
            </div>

            {movimientos.length === 0 ? (
              <div className="inv-empty">Todavía no hay movimientos registrados.</div>
            ) : (
              <ul className="inv-feed">
                {movimientos.map((m) => {
                  const articulo = s.articulo(m.articuloId);
                  const cantidad =
                    m.tipo === "transferencia"
                      ? `${formatearEntero(m.cantidad)} u.`
                      : formatearDelta(deltaTotal(m));
                  const tono = tonoPersona(m.responsable);
                  return (
                    <li key={m.id}>
                      <span className={`inv-avatar inv-avatar--${tono}`} aria-hidden>
                        {inicialesDe(m.responsable)}
                      </span>
                      <span className="inv-feed__body">
                        <span className="inv-feed__line">
                          <span className="inv-feed__type">
                            {ETIQUETA_TIPO_MOVIMIENTO[m.tipo]}
                          </span>
                          <span className="inv-feed__name">
                            {articulo?.nombre ?? "Artículo eliminado"}
                          </span>
                        </span>
                        <span className="inv-feed__meta">
                          {m.responsable} · {fechaRelativa(m.fecha)}
                          {m.tipo === "transferencia" ? " · movimiento interno" : ""}
                        </span>
                      </span>
                      <span
                        className={`inv-feed__delta${m.tipo === "transferencia" ? " is-neutral" : ""}`}
                      >
                        {cantidad}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="inv-card inv-incoming" aria-labelledby="inv-arrivals-title">
            <div className="inv-card__head">
              <div>
                <h2 className="inv-card__title" id="inv-arrivals-title">
                  En camino
                </h2>
                <p className="inv-card__sub">
                  {plural(r.ordenesAbiertas, "orden abierta", "órdenes abiertas")}
                </p>
              </div>
              <button
                type="button"
                className="inv-minilink"
                onClick={() => navigate("/inventarios/ordenes-compra")}
                aria-label={`Ver órdenes de compra; ${formatearMoneda(r.valorEnTransito)} en camino`}
              >
                {formatearMoneda(r.valorEnTransito)}
                <ChevronRight aria-hidden />
              </button>
            </div>
            {llegadas.length === 0 ? (
              <div className="inv-empty">No hay órdenes abiertas con mercancía pendiente.</div>
            ) : (
              <ul className="inv-arrivals">
                {llegadas.map((oc) => {
                  const pedidas = oc.lineas.reduce((t, l) => t + l.cantidad, 0);
                  const recibidas = oc.lineas.reduce((t, l) => t + l.recibida, 0);
                  const pendiente = oc.lineas.reduce(
                    (t, l) => t + unidadesPendientes(l) * l.costoUnitario,
                    0,
                  );
                  const pct = pedidas > 0 ? (recibidas / pedidas) * 100 : 0;
                  const atrasada = oc.fechaEsperada !== null && new Date(oc.fechaEsperada) < hoy;
                  return (
                    <li className="inv-arrival" key={oc.id}>
                      <div className="inv-arrival__top">
                        <span className="inv-arrival__id">{oc.numero}</span>
                        <span className={`inv-arrival__eta${atrasada ? " is-late" : ""}`}>
                          {oc.fechaEsperada === null
                            ? "Sin fecha"
                            : atrasada
                              ? `Atrasada · ${fechaRelativa(oc.fechaEsperada)}`
                              : `Llega ${fechaRelativa(oc.fechaEsperada)}`}
                        </span>
                      </div>
                      <p className="inv-arrival__supplier">
                        {proveedorCorto(s.nombreProveedor(oc.proveedorId))}
                      </p>
                      <span className="inv-progress" aria-hidden>
                        <span style={{ width: `${Math.min(100, pct)}%` }} />
                      </span>
                      <div className="inv-arrival__foot">
                        <span>
                          <b>{formatearEntero(recibidas)}</b> de {formatearEntero(pedidas)} recibidas
                        </span>
                        <b>{formatearMoneda(pendiente)}</b>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
});

export default InventarioDashboardPage;
