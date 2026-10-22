import { useState } from "react";
import { observer } from "mobx-react-lite";
import { Link, useSearchParams } from "react-router";
import { PageMeta } from "@/shell/meta";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import {
  BuildingOffice2Icon,
  AlertHexaIcon,
  GridIcon,
  DollarLineIcon,
  ShieldCheckIcon,
  PlugInIcon,
} from "@/icons";
import { ConfigHubPagina, VolverAlHub, type TarjetaHub } from "@/pages/config-layout";
import {
  inventarioStore,
  organizacionStore,
  ETIQUETA_TIPO_UBICACION,
  ETIQUETA_UNIDAD,
  formatearEntero,
  formatearMoneda,
  type ConfigInventario,
  type MetodoValoracion,
  type UnidadMedida,
  type TipoUbicacion,
  type TipoMovimiento,
} from "@/stores";
import {
  Aviso,
  Boton,
  Campo,
  CONTROL,
  cx,
  Distintivo,
  Interruptor,
  MensajeError,
  useSalida,
  OPCIONES_MOVIMIENTO,
  OpcionesTarjeta,
  useAviso,
} from "./inventario.ui";

type ClaveSeccion =
  | "almacenes"
  | "reorden"
  | "catalogos"
  | "costeo"
  | "conteos"
  | "ordenes";

interface MetaSeccionInfo {
  label: string;
  hint: string;
  icono: React.FC<React.SVGProps<SVGSVGElement>>;
  badge?: string;
  palabrasClave: string[];
}

const META_SECCIONES: Record<ClaveSeccion, MetaSeccionInfo> = {
  almacenes: {
    label: "Almacenes y ubicaciones",
    hint: "Dónde guardas la mercancía y dónde entra lo que llega de los proveedores.",
    icono: BuildingOffice2Icon,
    palabrasClave: ["bodega", "almacen", "estante", "muelle", "sucursal", "ubicacion", "despacho"],
  },
  reorden: {
    label: "Puntos de reorden y alertas",
    hint: "Punto de reorden y stock máximo para artículos nuevos, días de cobertura y alertas de stock bajo.",
    icono: AlertHexaIcon,
    palabrasClave: ["reorden", "minimo", "maximo", "alerta", "agotado", "whatsapp", "notificacion", "cobertura"],
  },
  catalogos: {
    label: "Categorías y medidas",
    hint: "Las categorías que agrupan tus artículos, la unidad con la que se cuentan y cómo se generan sus códigos.",
    icono: GridIcon,
    palabrasClave: ["categoria", "unidad", "medida", "familias", "piezas", "kilos", "clasificacion"],
  },
  costeo: {
    label: "Valoración y costeo",
    hint: "Con qué moneda y con qué costo se calcula el valor del inventario.",
    icono: DollarLineIcon,
    palabrasClave: ["costo", "valoracion", "promedio", "fifo", "peps", "margen", "precio"],
  },
  conteos: {
    label: "Movimientos y toma de inventario",
    hint: "Los motivos que se ofrecen al registrar entradas, salidas y ajustes, y las reglas de la toma de inventario.",
    icono: ShieldCheckIcon,
    palabrasClave: ["motivo", "movimiento", "entrada", "salida", "conteo", "ajuste", "merma", "ciego", "auditoria", "tolerancia", "diferencia", "referencia"],
  },
  ordenes: {
    label: "Órdenes de compra",
    hint: "Numeración, cómo se calcula cuánto pedir, cuánto se acepta al recibir y notas por defecto.",
    icono: PlugInIcon,
    palabrasClave: ["orden", "compra", "proveedor", "prefijo", "oc", "pedido", "abastecimiento"],
  },
};

/** Los ajustes que hay dentro de cada sección, con el nombre que llevan en ella. */
const AJUSTES_SECCION: Record<ClaveSeccion, string[]> = {
  almacenes: ["Ubicación de recepción", "Ubicaciones"],
  reorden: ["Punto de reorden", "Stock máximo", "Días de cobertura", "Alertas de stock bajo"],
  catalogos: ["Código automático", "Unidad de medida", "Categorías"],
  costeo: ["Moneda", "Valor del inventario", "Método de valoración"],
  conteos: ["Motivos de movimiento", "Referencia en salidas", "Conteo a ciegas", "Revisión ante diferencias"],
  ordenes: ["Prefijo de órdenes", "Descontar en tránsito", "Múltiplo de pedido", "Tolerancia al recibir", "Notas por defecto"],
};

const ORDEN_SECCIONES: ClaveSeccion[] = [
  "almacenes",
  "reorden",
  "catalogos",
  "costeo",
  "conteos",
  "ordenes",
];

const UNIDADES_MEDIDA: { id: UnidadMedida; label: string }[] = [
  { id: "unidad", label: "Unidades (ud)" },
  { id: "kg", label: "Kilogramos (kg)" },
  { id: "litro", label: "Litros (L)" },
  { id: "paquete", label: "Paquetes (paq)" },
  { id: "rollo", label: "Rollos (rol)" },
  { id: "caja", label: "Cajas (cj)" },
  { id: "resma", label: "Resmas (res)" },
];

export const InventarioConfigPage = observer(() => {
  const [params, setParams] = useSearchParams();
  const seccion = params.get("seccion") as ClaveSeccion | null;

  // Borrador de configuración sincronizado con el store
  const [draft, setDraft] = useState<ConfigInventario>(() => ({ ...inventarioStore.config }));
  const { aviso, mostrar } = useAviso();
  // Cambios sin guardar (ubicaciones y categorías se guardan al instante y no cuentan).
  // Va antes del retorno del menú de tarjetas: un hook no puede quedar detrás de un `return`.
  const sinListasArriba = (c: ConfigInventario) => JSON.stringify({ ...c, categorias: null });
  const barraGuardado = useSalida(sinListasArriba(draft) !== sinListasArriba(inventarioStore.config), 200);
  const [mensajeError, setMensajeError] = useState<string | null>(null);

  // Estados locales para sub-secciones
  const [nuevaCat, setNuevaCat] = useState("");
  const [editandoCat, setEditandoCat] = useState<{ actual: string; nuevo: string } | null>(null);
  const [nuevoAlmacenNombre, setNuevoAlmacenNombre] = useState("");
  const [nuevoAlmacenTipo, setNuevoAlmacenTipo] = useState<TipoUbicacion>("bodega");
  const [editandoUbicacion, setEditandoUbicacion] = useState<{ id: string; nombre: string; tipo: TipoUbicacion } | null>(null);
  const [nuevoMotivo, setNuevoMotivo] = useState<Record<TipoMovimiento, string>>({ entrada: "", salida: "", transferencia: "", ajuste: "" });

  const entrarASeccion = (key: ClaveSeccion) => {
    setParams({ seccion: key });
    setMensajeError(null);
  };

  const volverAlHub = () => {
    setParams({});
    setMensajeError(null);
  };

  const guardarCambios = () => {
    setMensajeError(null);
    // `categorias` se edita al instante en el store: se guarda la versión
    // vigente, no la que tenía el borrador al abrir la página.
    const res = inventarioStore.guardarConfig({ ...draft, categorias: inventarioStore.config.categorias });
    if (!res.ok) {
      setMensajeError(res.error);
      return;
    }
    setDraft({ ...inventarioStore.config });
    mostrar("Cambios guardados");
  };

  const restablecerBorrador = () => {
    setDraft({ ...inventarioStore.config });
    setMensajeError(null);
  };

  // Cómo está configurada hoy cada sección: se lee del store, no del borrador.
  const cfg = inventarioStore.config;
  const ubicacionesActivas = inventarioStore.ubicacionesActivas.length;
  const estadoSeccion: Record<ClaveSeccion, string> = {
    almacenes: `Recibe en ${inventarioStore.nombreUbicacion(cfg.ubicacionRecepcionId)} · ${ubicacionesActivas} ${ubicacionesActivas === 1 ? "ubicación activa" : "ubicaciones activas"}`,
    reorden: `Reorden en ${cfg.puntoReordenPorDefecto} · máximo ${cfg.stockMaximoPorDefecto}`,
    catalogos: `${cfg.categorias.length} categorías · artículos nuevos en ${ETIQUETA_UNIDAD[cfg.unidadPorDefecto].toLowerCase()}`,
    costeo: cfg.metodoValoracion === "fifo" ? "Usa PEPS/FIFO" : "Usa promedio ponderado",
    conteos: `${Object.values(cfg.motivos).reduce((t, l) => t + l.length, 0)} motivos · conteo a ciegas ${cfg.conteoCiego ? "activado" : "apagado"}`,
    ordenes: `Numeración ${cfg.prefijoOrdenCompra}-0001`,
  };

  const tarjetasHub: TarjetaHub[] = ORDEN_SECCIONES.map((k) => ({
    key: k,
    label: META_SECCIONES[k].label,
    hint: META_SECCIONES[k].hint,
    icono: META_SECCIONES[k].icono,
    badge: META_SECCIONES[k].badge,
    ajustes: AJUSTES_SECCION[k],
    estado: estadoSeccion[k],
    palabrasClave: META_SECCIONES[k].palabrasClave,
  }));

  if (!seccion || !META_SECCIONES[seccion]) {
    return (
      <>
        <PageMeta
          title="Configuración · Inventario"
          description="Ajustes y parámetros operativos del módulo de inventarios"
        />
        <ConfigHubPagina
          titulo="Configuración de Inventario"
          descripcion="Elige una sección para ajustar dónde se guarda la mercancía, cuándo reponer, cómo se cuenta y cómo se compra."
          tarjetas={tarjetasHub}
          onEntrar={(k) => entrarASeccion(k as ClaveSeccion)}
        />
      </>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // VISTA DE DETALLE DE CADA SECCIÓN SELECCIONADA
  // ═════════════════════════════════════════════════════════════════════════
  const s = inventarioStore;
  const cambiar = <K extends keyof ConfigInventario>(k: K, v: ConfigInventario[K]) =>
    setDraft((p) => ({ ...p, [k]: v }));

  // Ubicaciones y categorías se guardan al instante en el store; el borrador
  // solo lleva los demás ajustes. Por eso se comparan y se guardan sin ellas.

  const articulosPorCategoria = new Map<string, number>();
  for (const a of s.articulosActivos) articulosPorCategoria.set(a.categoria, (articulosPorCategoria.get(a.categoria) ?? 0) + 1);
  const stockPorUbicacion = new Map(s.stockPorUbicacion.map((x) => [x.ubicacion.id, x]));
  const siguienteOrden = `${draft.prefijoOrdenCompra || "OC"}-${String(s.ordenes.length + 1).padStart(4, "0")}`;

  const agregarUbicacion = () => {
    const res = s.agregarUbicacion({ nombre: nuevoAlmacenNombre, tipo: nuevoAlmacenTipo });
    if (!res.ok) return setMensajeError(res.error);
    setNuevoAlmacenNombre("");
    setMensajeError(null);
    mostrar(`${res.valor.nombre} agregada`);
  };
  const agregarCategoria = () => {
    const res = s.agregarCategoria(nuevaCat);
    if (!res.ok) return setMensajeError(res.error);
    setNuevaCat("");
    setMensajeError(null);
    mostrar("Categoría agregada");
  };

  return (
    <div className="font-sans text-theme-sm text-ink-body dark:text-gray-300">
      <PageMeta
        title={`Configuración · ${META_SECCIONES[seccion]?.label ?? "Inventario"}`}
        description="Ajuste de parámetros del módulo de inventario"
      />

      <VolverAlHub onVolver={volverAlHub} etiqueta="Configuración de Inventario" />

      <header className="mt-3">
        <h1 className="text-theme-2xl font-bold tracking-tight text-ink-title dark:text-white">{META_SECCIONES[seccion].label}</h1>
        <p className="mt-1 max-w-3xl text-gray-600 dark:text-gray-400">{META_SECCIONES[seccion].hint}</p>
      </header>

      <div className="mt-6 space-y-6 pb-6">
        <MensajeError>{mensajeError}</MensajeError>

        {/* ── ALMACENES Y UBICACIONES ─────────────────────────────────────── */}
        {seccion === "almacenes" && (
          <>
            <Grupo titulo="Recepción de mercancía" descripcion="Dónde entra lo que llega de las órdenes de compra si nadie elige otra ubicación.">
              <Fila etiqueta="Ubicación de recepción" ayuda="Las órdenes nuevas y las llegadas usan esta ubicación por defecto.">
                <select
                  className={cx(CONTROL, "sm:w-64")}
                  value={draft.ubicacionRecepcionId}
                  onChange={(e) => cambiar("ubicacionRecepcionId", e.target.value)}
                  aria-label="Ubicación de recepción"
                >
                  {s.ubicacionesActivas.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nombre}
                    </option>
                  ))}
                </select>
              </Fila>
            </Grupo>

            <Grupo
              titulo="Ubicaciones"
              descripcion="Bodegas, estantes y puntos donde guardas mercancía."
              alInstante
            >
              <ul>
                {s.ubicaciones.map((u) => {
                  const st = stockPorUbicacion.get(u.id);
                  const esRecepcion = u.id === cfg.ubicacionRecepcionId;
                  const conStock = (st?.unidades ?? 0) > 0;
                  const bloqueo = u.activa && esRecepcion
                    ? "Es la ubicación de recepción: elige otra arriba antes de desactivarla."
                    : u.activa && conStock
                      ? "Tiene existencias: transfiérelas antes de desactivarla."
                      : null;
                  return (
                    <li key={u.id} className="flex items-center justify-between gap-4 border-t border-gray-100 py-3 first:border-t-0 dark:border-white/5">
                      {editandoUbicacion?.id === u.id ? (
                        <form
                          className="grid w-full gap-2 sm:grid-cols-[minmax(0,1fr)_170px_auto_auto] sm:items-center"
                          onSubmit={(e) => {
                            e.preventDefault();
                            const res = s.actualizarUbicacion(u.id, { nombre: editandoUbicacion.nombre, tipo: editandoUbicacion.tipo });
                            if (!res.ok) return setMensajeError(res.error);
                            setEditandoUbicacion(null);
                            setMensajeError(null);
                            mostrar("Ubicación actualizada");
                          }}
                        >
                          <input
                            className={CONTROL}
                            value={editandoUbicacion.nombre}
                            onChange={(e) => setEditandoUbicacion({ ...editandoUbicacion, nombre: e.target.value })}
                            aria-label="Nombre de la ubicación"
                            autoFocus
                          />
                          <select
                            className={CONTROL}
                            value={editandoUbicacion.tipo}
                            onChange={(e) => setEditandoUbicacion({ ...editandoUbicacion, tipo: e.target.value as TipoUbicacion })}
                            aria-label="Tipo de ubicación"
                          >
                            {(Object.keys(ETIQUETA_TIPO_UBICACION) as TipoUbicacion[]).map((t) => (
                              <option key={t} value={t}>
                                {ETIQUETA_TIPO_UBICACION[t]}
                              </option>
                            ))}
                          </select>
                          <Boton type="submit" variante="principal">Guardar</Boton>
                          <Boton variante="texto" onClick={() => setEditandoUbicacion(null)}>
                            Cancelar
                          </Boton>
                        </form>
                      ) : (
                      <>
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-2">
                          <span className={cx("font-bold", u.activa ? "text-ink-body dark:text-white" : "text-gray-500")}>{u.nombre}</span>
                          {esRecepcion && <Distintivo tono="info">Recibe mercancía</Distintivo>}
                          {!u.activa && <Distintivo tono="neutro">Desactivada</Distintivo>}
                        </p>
                        <p className="text-theme-xs text-gray-600 dark:text-gray-400">
                          {ETIQUETA_TIPO_UBICACION[u.tipo]}
                          {st && st.skus > 0
                            ? ` · ${formatearEntero(st.skus)} ${st.skus === 1 ? "artículo" : "artículos"} · ${formatearMoneda(st.valor)}`
                            : " · sin existencias"}
                        </p>
                      </div>
                      <span className="flex shrink-0 items-center gap-2">
                      <span className="flex items-center gap-3" title={bloqueo ?? undefined}>
                        {bloqueo && (
                          <span className="hidden text-right text-theme-xs text-gray-500 sm:block">
                            {esRecepcion ? "Es la de recepción" : "Tiene existencias"}
                          </span>
                        )}
                        <Interruptor
                          activo={u.activa}
                          disabled={Boolean(bloqueo)}
                          etiqueta={`${u.activa ? "Desactivar" : "Activar"} ${u.nombre}`}
                          onCambio={() => {
                            const res = s.alternarUbicacionActiva(u.id);
                            if (!res.ok) setMensajeError(res.error);
                            else mostrar(`${u.nombre} ${u.activa ? "activada" : "desactivada"}`);
                          }}
                        />
                      </span>
                      <Boton
                        variante="texto"
                        className="-mr-2"
                        aria-label={`Editar ${u.nombre}`}
                        onClick={() => setEditandoUbicacion({ id: u.id, nombre: u.nombre, tipo: u.tipo })}
                      >
                        <Pencil className="h-4 w-4" aria-hidden />
                        <span className="hidden sm:inline">Editar</span>
                      </Boton>
                      </span>
                      </>
                      )}
                    </li>
                  );
                })}
              </ul>
              <form
                className="mt-4 grid gap-3 border-t border-gray-100 pt-4 sm:grid-cols-[minmax(0,1fr)_180px_auto] sm:items-end dark:border-white/5"
                onSubmit={(e) => {
                  e.preventDefault();
                  agregarUbicacion();
                }}
              >
                <Campo etiqueta="Nueva ubicación">
                  <input className={CONTROL} value={nuevoAlmacenNombre} onChange={(e) => setNuevoAlmacenNombre(e.target.value)} placeholder="Ej. Estante B-3" />
                </Campo>
                <Campo etiqueta="Tipo">
                  <select className={CONTROL} value={nuevoAlmacenTipo} onChange={(e) => setNuevoAlmacenTipo(e.target.value as TipoUbicacion)}>
                    {(Object.keys(ETIQUETA_TIPO_UBICACION) as TipoUbicacion[]).map((t) => (
                      <option key={t} value={t}>
                        {ETIQUETA_TIPO_UBICACION[t]}
                      </option>
                    ))}
                  </select>
                </Campo>
                <Boton type="submit" icono={<Plus className="h-4 w-4" />} className="h-10" disabled={!nuevoAlmacenNombre.trim()}>
                  Agregar
                </Boton>
              </form>
            </Grupo>
          </>
        )}

        {/* ── PUNTOS DE REORDEN Y ALERTAS ─────────────────────────────────── */}
        {seccion === "reorden" && (
          <>
            <Grupo titulo="Valores para artículos nuevos" descripcion="Se proponen al crear un artículo; cada artículo puede tener los suyos.">
              <Fila etiqueta="Punto de reorden" ayuda="Cuando la existencia llega a este número, el artículo entra en la cola de reorden.">
                <CampoNumero valor={draft.puntoReordenPorDefecto} min={0} sufijo="uds" onCambio={(n) => cambiar("puntoReordenPorDefecto", n)} etiqueta="Punto de reorden" />
              </Fila>
              <Fila
                etiqueta="Stock máximo"
                ayuda="Hasta dónde se repone. La cantidad sugerida completa hasta este número."
                error={draft.stockMaximoPorDefecto <= draft.puntoReordenPorDefecto ? "Debe ser mayor que el punto de reorden." : null}
              >
                <CampoNumero valor={draft.stockMaximoPorDefecto} min={1} sufijo="uds" onCambio={(n) => cambiar("stockMaximoPorDefecto", n)} etiqueta="Stock máximo" />
              </Fila>
              <Fila etiqueta="Días de cobertura" ayuda="La cantidad sugerida alcanza para este número de días, según lo que salió en los últimos 30. Si el stock máximo es mayor, manda el máximo.">
                <CampoNumero valor={draft.diasCobertura} min={1} sufijo="días" onCambio={(n) => cambiar("diasCobertura", n)} etiqueta="Días de cobertura" />
              </Fila>
            </Grupo>

            <Grupo titulo="Avisos de stock bajo" descripcion="Cómo enterarse cuando algo se está acabando, además de la cola de reorden.">
              <Fila etiqueta="Aviso en pantalla" ayuda="Los artículos agotados o bajo su mínimo aparecen en la campana de notificaciones." enLinea>
                <Interruptor activo={draft.alertaStockBajo} onCambio={(v) => cambiar("alertaStockBajo", v)} etiqueta="Aviso en pantalla" />
              </Fila>
              <Fila etiqueta="Aviso por WhatsApp" ayuda="Un mensaje al encargado de compras cuando algo se agota. Necesita una plantilla aprobada por WhatsApp y el envío desde el servidor; mientras tanto el aviso llega a la campana." proximamente enLinea>
                <Interruptor activo={draft.alertaWhatsapp} onCambio={(v) => cambiar("alertaWhatsapp", v)} etiqueta="Aviso por WhatsApp" />
              </Fila>
              {draft.alertaWhatsapp && (
                <Fila etiqueta="Número que recibe el aviso" ayuda="Con indicativo de país.">
                  <input className={cx(CONTROL, "sm:w-64")} value={draft.whatsappDestino} onChange={(e) => cambiar("whatsappDestino", e.target.value)} placeholder="+57 300 123 4567" aria-label="Número que recibe el aviso" />
                </Fila>
              )}
              <Fila etiqueta="Resumen diario" ayuda="Desde esta hora aparece en la campana un resumen del día: agotados, bajos, órdenes en camino y movimientos de ayer." enLinea>
                <Interruptor activo={draft.resumenDiario} onCambio={(v) => cambiar("resumenDiario", v)} etiqueta="Resumen diario" />
              </Fila>
              {draft.resumenDiario && (
                <Fila etiqueta="Hora del resumen">
                  <input type="time" className={cx(CONTROL, "sm:w-40")} value={draft.horaResumen} onChange={(e) => cambiar("horaResumen", e.target.value)} aria-label="Hora del resumen" />
                </Fila>
              )}
            </Grupo>
          </>
        )}

        {/* ── CATEGORÍAS Y MEDIDAS ────────────────────────────────────────── */}
        {seccion === "catalogos" && (
          <>
            <Grupo titulo="Código de artículo (SKU)" descripcion="Cómo se identifica cada artículo nuevo.">
              <Fila
                etiqueta="Generar el código automáticamente"
                ayuda={<>Si se deja vacío al crear un artículo, se usa el prefijo de su categoría y el siguiente número (por ejemplo, <strong className="font-bold text-ink-body dark:text-white">{s.siguienteSku(cfg.categorias[0] ?? "")}</strong>).</>}
                enLinea
              >
                <Interruptor activo={draft.skuAutomatico} onCambio={(v) => cambiar("skuAutomatico", v)} etiqueta="Generar el código automáticamente" />
              </Fila>
            </Grupo>

            <Grupo titulo="Unidad de medida" descripcion="La que se propone al crear un artículo.">
              <Fila etiqueta="Unidad para artículos nuevos">
                <select className={cx(CONTROL, "sm:w-64")} value={draft.unidadPorDefecto} onChange={(e) => cambiar("unidadPorDefecto", e.target.value as UnidadMedida)} aria-label="Unidad para artículos nuevos">
                  {UNIDADES_MEDIDA.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </Fila>
            </Grupo>

            <Grupo titulo="Categorías" descripcion="Agrupan los artículos para filtrar el catálogo y ver el valor por grupo." alInstante>
              <ul>
                {cfg.categorias.map((cat) => {
                  const n = articulosPorCategoria.get(cat) ?? 0;
                  const editando = editandoCat?.actual === cat;
                  return (
                    <li key={cat} className="flex items-center justify-between gap-3 border-t border-gray-100 py-2.5 first:border-t-0 dark:border-white/5">
                      {editando ? (
                        <form
                          className="flex flex-1 flex-wrap items-center gap-2"
                          onSubmit={(e) => {
                            e.preventDefault();
                            const res = s.renombrarCategoria(cat, editandoCat.nuevo);
                            if (!res.ok) return setMensajeError(res.error);
                            setEditandoCat(null);
                            setMensajeError(null);
                            mostrar("Categoría renombrada");
                          }}
                        >
                          <input
                            className={cx(CONTROL, "sm:w-72")}
                            value={editandoCat.nuevo}
                            onChange={(e) => setEditandoCat({ actual: cat, nuevo: e.target.value })}
                            aria-label={`Nuevo nombre de ${cat}`}
                            autoFocus
                          />
                          <Boton type="submit" variante="principal">Guardar</Boton>
                          <Boton variante="texto" onClick={() => setEditandoCat(null)}>
                            Cancelar
                          </Boton>
                        </form>
                      ) : (
                        <>
                          <div className="min-w-0">
                            <p className="font-bold text-ink-body dark:text-white">{cat}</p>
                            <p className="text-theme-xs text-gray-600 dark:text-gray-400">
                              {n === 0 ? "Sin artículos" : `${formatearEntero(n)} ${n === 1 ? "artículo" : "artículos"}`}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <Boton variante="texto" onClick={() => setEditandoCat({ actual: cat, nuevo: cat })} aria-label={`Renombrar ${cat}`}>
                              <Pencil className="h-4 w-4" aria-hidden />
                              <span className="hidden sm:inline">Renombrar</span>
                            </Boton>
                            <span title={n > 0 ? "Tiene artículos: muévelos a otra categoría antes de eliminarla." : undefined}>
                              <Boton
                                variante="texto"
                                disabled={n > 0}
                                aria-label={`Eliminar ${cat}`}
                                onClick={() => {
                                  const res = s.eliminarCategoria(cat);
                                  if (!res.ok) return setMensajeError(res.error);
                                  mostrar(`${cat} eliminada`);
                                }}
                              >
                                <Trash2 className="h-4 w-4" aria-hidden />
                              </Boton>
                            </span>
                          </div>
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
              <form
                className="mt-4 flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-end dark:border-white/5"
                onSubmit={(e) => {
                  e.preventDefault();
                  agregarCategoria();
                }}
              >
                <Campo etiqueta="Nueva categoría" className="sm:w-80">
                  <input className={CONTROL} value={nuevaCat} onChange={(e) => setNuevaCat(e.target.value)} placeholder="Ej. Bebidas" />
                </Campo>
                <Boton type="submit" icono={<Plus className="h-4 w-4" />} className="h-10" disabled={!nuevaCat.trim()}>
                  Agregar
                </Boton>
              </form>
            </Grupo>
          </>
        )}

        {/* ── VALORACIÓN Y COSTEO ─────────────────────────────────────────── */}
        {seccion === "costeo" && (
          <>
          <Grupo titulo="Cómo se calcula hoy" descripcion="El valor del inventario que ves en el dashboard y en el catálogo.">
            <Fila etiqueta="Moneda" ayuda={<>Se cambia en <Link to="/configuracion?tab=general" className="font-bold text-ink-title hover:underline dark:text-white">Ajustes generales</Link>, porque vale para toda la organización.</>}>
              <span className="font-bold tabular-nums text-ink-body dark:text-white">{organizacionStore.organizacion?.moneda ?? "COP"}</span>
            </Fila>
            <Fila etiqueta="Costo de cada artículo" ayuda="Se recalcula con cada entrada que trae costo, según el método de abajo. Si lo cambias a mano en la ficha del artículo, todo su stock pasa a valer ese costo.">
              <span className="text-gray-600 dark:text-gray-400">{draft.metodoValoracion === "fifo" ? "PEPS / FIFO" : "Promedio ponderado"}</span>
            </Fila>
            <Fila etiqueta="Valor del inventario hoy" ayuda="Existencias de cada artículo por su costo unitario.">
              <span className="text-theme-md font-bold tabular-nums text-ink-title dark:text-white">{formatearMoneda(s.resumen.valor)}</span>
            </Fila>
          </Grupo>
          <Grupo
            titulo="Método de valoración"
            descripcion="Qué costo toma el inventario cuando una misma mercancía se compró a precios distintos. Se aplica a cada entrada que trae su costo (como la recepción de una orden)."
          >
            <OpcionesTarjeta<MetodoValoracion>
              valor={draft.metodoValoracion}
              onCambio={(v) => cambiar("metodoValoracion", v)}
              opciones={[
                { valor: "promedio", etiqueta: "Costo promedio ponderado", descripcion: "Cada compra nueva se promedia con lo que ya hay. Es el más estable y el más común." },
                { valor: "fifo", etiqueta: "PEPS / FIFO", descripcion: "Lo primero que entra es lo primero que sale. Útil con productos perecederos o con vencimiento." },
              ]}
            />
          </Grupo>
          </>
        )}

        {/* ── TOMA DE INVENTARIO Y SALIDAS ────────────────────────────────── */}
        {seccion === "conteos" && (
          <>
            <Grupo
              titulo="Motivos de movimiento"
              descripcion="Las opciones rápidas que se ofrecen al registrar un movimiento. Siempre se puede escribir otro motivo a mano."
            >
              <div className="grid gap-5 lg:grid-cols-2">
                {OPCIONES_MOVIMIENTO.map((o) => {
                  const lista = draft.motivos[o.tipo];
                  const agregar = () => {
                    const m = nuevoMotivo[o.tipo].trim();
                    if (!m) return;
                    if (lista.some((x) => x.toLowerCase() === m.toLowerCase())) return setMensajeError(`«${m}» ya está en ${o.etiqueta.toLowerCase()}s.`);
                    cambiar("motivos", { ...draft.motivos, [o.tipo]: [...lista, m] });
                    setNuevoMotivo((n) => ({ ...n, [o.tipo]: "" }));
                    setMensajeError(null);
                  };
                  return (
                    <div key={o.tipo} className="rounded-xl border border-gray-100 p-4 dark:border-white/5">
                      <p className="font-bold text-ink-body dark:text-white">{o.etiqueta}s</p>
                      <ul className="mt-2 flex flex-wrap gap-2" aria-label={`Motivos de ${o.etiqueta.toLowerCase()}`}>
                        {lista.map((m) => (
                          <li key={m} className="inline-flex items-center gap-1 rounded-full border border-gray-200 py-1 pl-3 pr-1 text-theme-xs text-ink-body dark:border-white/10 dark:text-gray-200">
                            {m}
                            <button
                              type="button"
                              disabled={lista.length === 1}
                              title={lista.length === 1 ? "Debe quedar al menos un motivo" : undefined}
                              aria-label={`Quitar ${m}`}
                              onClick={() => cambiar("motivos", { ...draft.motivos, [o.tipo]: lista.filter((x) => x !== m) })}
                              className="rounded-full p-1 text-gray-500 hover:bg-gray-100 hover:text-ink-body focus-visible:outline-2 focus-visible:outline-brand-500 disabled:opacity-30 dark:hover:bg-white/10"
                            >
                              <X className="h-3 w-3" aria-hidden />
                            </button>
                          </li>
                        ))}
                      </ul>
                      <form
                        className="mt-3 flex gap-2"
                        onSubmit={(e) => {
                          e.preventDefault();
                          agregar();
                        }}
                      >
                        <input
                          className={CONTROL}
                          value={nuevoMotivo[o.tipo]}
                          onChange={(e) => setNuevoMotivo((n) => ({ ...n, [o.tipo]: e.target.value }))}
                          placeholder="Nuevo motivo"
                          aria-label={`Nuevo motivo de ${o.etiqueta.toLowerCase()}`}
                        />
                        <Boton type="submit" disabled={!nuevoMotivo[o.tipo].trim()} className="h-10">
                          Agregar
                        </Boton>
                      </form>
                    </div>
                  );
                })}
              </div>
            </Grupo>
            <Grupo titulo="Salidas de mercancía" descripcion="Reglas al registrar una salida en Entradas y salidas.">
              <Fila etiqueta="Documento de referencia obligatorio" ayuda="Pide el número de pedido o remisión en cada salida." enLinea>
                <Interruptor activo={draft.referenciaObligatoriaSalidas} onCambio={(v) => cambiar("referenciaObligatoriaSalidas", v)} etiqueta="Documento de referencia obligatorio" />
              </Fila>
            </Grupo>
            <Grupo titulo="Toma de inventario" descripcion="Cómo se cuenta y quién aprueba las diferencias.">
              <Fila etiqueta="Conteo a ciegas" ayuda="Quien cuenta no ve la cantidad esperada, así no la copia. Aparece al enviar a revisión." enLinea>
                <Interruptor activo={draft.conteoCiego} onCambio={(v) => cambiar("conteoCiego", v)} etiqueta="Conteo a ciegas" />
              </Fila>
              <Fila etiqueta="Revisión antes de aplicar" ayuda="Una toma con diferencias pasa por revisión antes de convertirse en ajustes." enLinea>
                <Interruptor activo={draft.requiereRevisionConteos} onCambio={(v) => cambiar("requiereRevisionConteos", v)} etiqueta="Revisión antes de aplicar" />
              </Fila>
              <Fila etiqueta="Resaltar diferencias desde" ayuda="Una línea se resalta si lo contado se aleja de lo esperado más que este porcentaje.">
                <CampoNumero valor={draft.umbralDiferenciaPct} min={0} max={100} sufijo="%" onCambio={(n) => cambiar("umbralDiferenciaPct", n)} etiqueta="Resaltar diferencias desde" />
              </Fila>
            </Grupo>
          </>
        )}

        {/* ── ÓRDENES DE COMPRA ───────────────────────────────────────────── */}
        {seccion === "ordenes" && (
          <>
            <Grupo titulo="Numeración" descripcion="Cómo se llaman las órdenes de compra nuevas.">
              <Fila etiqueta="Prefijo" ayuda={<>De 1 a 5 letras. La próxima orden será <strong className="font-bold text-ink-body dark:text-white">{siguienteOrden}</strong>.</>}>
                <input
                  className={cx(CONTROL, "uppercase sm:w-32")}
                  value={draft.prefijoOrdenCompra}
                  maxLength={5}
                  onChange={(e) => cambiar("prefijoOrdenCompra", e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))}
                  aria-label="Prefijo de órdenes de compra"
                />
              </Fila>
            </Grupo>
            <Grupo titulo="Cantidades sugeridas" descripcion="Cómo calcula la cola de reorden cuánto pedir.">
              <Fila etiqueta="Descontar lo que ya viene en camino" ayuda="Resta lo pedido en órdenes abiertas para no pedir dos veces." enLinea>
                <Interruptor activo={draft.descontarEnTransito} onCambio={(v) => cambiar("descontarEnTransito", v)} etiqueta="Descontar lo que ya viene en camino" />
              </Fila>
              <Fila etiqueta="Redondear a múltiplos de" ayuda="Útil si el proveedor vende por cajas o paquetes. 1 = sin redondeo.">
                <CampoNumero valor={draft.multiploPedido} min={1} sufijo="uds" onCambio={(n) => cambiar("multiploPedido", n)} etiqueta="Redondear a múltiplos de" />
              </Fila>
            </Grupo>
            <Grupo titulo="Recepción" descripcion="Qué se acepta cuando llega la mercancía.">
              <Fila
                etiqueta="Aceptar de más hasta"
                ayuda={draft.toleranciaRecepcionPct === 0 ? "No se puede recibir más de lo pedido." : `En una línea de 100 unidades se aceptan hasta ${100 + Math.floor(draft.toleranciaRecepcionPct)}.`}
              >
                <CampoNumero valor={draft.toleranciaRecepcionPct} min={0} max={100} sufijo="%" onCambio={(n) => cambiar("toleranciaRecepcionPct", n)} etiqueta="Aceptar de más hasta" />
              </Fila>
            </Grupo>

            <Grupo titulo="Notas por defecto" descripcion="Se copian en cada orden nueva; se pueden editar en cada una.">
              <textarea
                rows={3}
                className={cx(CONTROL, "h-auto py-2.5")}
                value={draft.notasOrdenPorDefecto}
                onChange={(e) => cambiar("notasOrdenPorDefecto", e.target.value)}
                placeholder="Horario de recepción, instrucciones de facturación…"
                aria-label="Notas por defecto"
              />
            </Grupo>
          </>
        )}
      </div>

      {/* Barra de guardado: solo existe cuando hay algo que guardar; sube desde el borde inferior. */}
      {barraGuardado.montado && (
        <div className={cx(barraGuardado.saliendo ? "animate-salida-aviso" : "animate-entrada-aviso", "sticky bottom-0 z-10 -mx-4 flex flex-col gap-3 border-t border-gray-200 bg-white px-4 py-3 sm:-mx-6 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:border-white/10 dark:bg-gray-900")}>
          <p className="font-bold text-ink-body dark:text-white">Tienes cambios sin guardar</p>
          <div className="flex gap-2">
            <Boton variante="texto" onClick={restablecerBorrador}>
              Descartar
            </Boton>
            <Boton variante="principal" onClick={guardarCambios}>
              Guardar cambios
            </Boton>
          </div>
        </div>
      )}

      <Aviso texto={aviso} />
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// PIEZAS DE LA PÁGINA
// ═══════════════════════════════════════════════════════════════════════════

/** Etiqueta para lo que se guarda pero todavía no cambia nada en el sistema. */
function Proximamente() {
  return <Distintivo tono="neutro">Próximamente</Distintivo>;
}

/** Un grupo de ajustes: título, para qué sirve y sus filas. */
function Grupo({
  titulo,
  descripcion,
  alInstante = false,
  proximamente,
  children,
}: {
  titulo: string;
  descripcion: string;
  /** Los cambios de este grupo se guardan solos, sin el botón de guardar. */
  alInstante?: boolean;
  /** Si el grupo entero aún no tiene efecto, la explicación. */
  proximamente?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 dark:border-white/10 dark:bg-white/[0.02]">
      <header className="mb-4">
        <h2 className="flex flex-wrap items-center gap-2 text-theme-md font-bold text-ink-title dark:text-white">
          {titulo}
          {proximamente && <Proximamente />}
        </h2>
        <p className="mt-0.5 text-gray-600 dark:text-gray-400">{descripcion}</p>
        {alInstante && <p className="mt-1 text-theme-xs text-gray-500">Los cambios de esta lista se guardan al instante.</p>}
        {proximamente && <p className="mt-2 rounded-xl bg-gray-50 px-3.5 py-2.5 text-theme-xs text-gray-700 dark:bg-white/[0.03] dark:text-gray-300">{proximamente}</p>}
      </header>
      {children}
    </section>
  );
}

/** Etiqueta y ayuda a la izquierda, control a la derecha; apiladas en móvil. */
function Fila({
  etiqueta,
  ayuda,
  error,
  proximamente = false,
  enLinea = false,
  children,
}: {
  etiqueta: string;
  ayuda?: React.ReactNode;
  error?: string | null;
  proximamente?: boolean;
  /** El control es pequeño (un interruptor): va al lado de la etiqueta también en móvil. */
  enLinea?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cx(enLinea ? "flex flex-row items-start justify-between gap-4 sm:items-center sm:gap-6" : "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-6", "border-t border-gray-100 py-3.5 first:border-t-0 first:pt-0 last:pb-0 dark:border-white/5")}>
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 font-bold text-ink-body dark:text-white">
          {etiqueta}
          {proximamente && <Proximamente />}
        </p>
        {ayuda && <p className="mt-0.5 max-w-xl text-theme-xs text-gray-600 dark:text-gray-400">{ayuda}</p>}
        {error && <p className="mt-1 text-theme-xs font-bold text-error-700 dark:text-error-400">{error}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

/** Número entero con su unidad pegada («10 uds», «30 días», «10 %»). */
function CampoNumero({
  valor,
  onCambio,
  sufijo,
  min = 0,
  max,
  etiqueta,
}: {
  valor: number;
  onCambio: (n: number) => void;
  sufijo: string;
  min?: number;
  max?: number;
  etiqueta: string;
}) {
  return (
    <span className="flex h-10 w-40 items-center overflow-hidden rounded-[10px] border border-gray-200 bg-white focus-within:border-ink-title focus-within:ring-2 focus-within:ring-ink-title/10 dark:border-white/15 dark:bg-gray-900">
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step={1}
        value={String(valor)}
        aria-label={etiqueta}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10);
          const limpio = Number.isFinite(n) ? n : min;
          onCambio(Math.min(max ?? Infinity, Math.max(min, limpio)));
        }}
        className="h-full w-full min-w-0 bg-transparent px-3 text-right text-theme-sm tabular-nums text-ink-body focus:outline-none dark:text-white"
      />
      <span className="shrink-0 border-l border-gray-200 bg-gray-50 px-3 py-2.5 text-theme-xs text-gray-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-gray-400">
        {sufijo}
      </span>
    </span>
  );
}

export default InventarioConfigPage;
