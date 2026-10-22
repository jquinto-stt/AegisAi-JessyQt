/**
 * Catálogo de artículos.
 *
 * Pregunta de la pantalla: «¿qué tengo, cuánto y qué hay que reponer?». Por eso
 * la columna que manda es Existencias, con el nivel de stock contra su punto de
 * reorden, y la pestaña «Por reponer» va segunda, justo después de Todos.
 */
import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { observer } from "mobx-react-lite";
import { ChevronRight, Download, LayoutGrid, List, Package, Plus } from "lucide-react";
import { construirCsv, descargarCsv, nombreArchivoCsv } from "@/lib/csv";
import {
  inventarioStore,
  deltaTotal,
  estadoStock,
  fechaRelativa,
  formatearDelta,
  formatearEntero,
  formatearMoneda,
  stockTotal,
  valorArticulo,
  ETIQUETA_ESTADO_STOCK,
  ETIQUETA_TIPO_MOVIMIENTO,
  ETIQUETA_UNIDAD,
  type Articulo,
  type DatosArticulo,
  type EstadoStock,
  type UnidadMedida,
} from "@/stores";
import {
  Aviso,
  Boton,
  Buscador,
  Campo,
  CeldaDoble,
  Confirmar,
  CONTROL,
  cx,
  Distintivo,
  Filtro,
  FilaMovil,
  ListaDatos,
  MensajeError,
  NivelStock,
  PaginaInventario,
  PanelLateral,
  Pestanas,
  Subtitulo,
  TABLA,
  useAviso,
  Vacio,
} from "./inventario.ui";
import { FOTOS_PRODUCTO, fotoDeProducto } from "./productos.fotos";
import "./articulos-catalogo.css";

type Pestana = "todos" | "reponer" | "agotado" | "exceso" | "archivados";
type VistaCatalogo = "tarjetas" | "tabla";

const CLAVE_VISTA = "necto.inventario.catalogo.vista";

const UNIDAD_CORTA: Record<UnidadMedida, string> = {
  unidad: "u.",
  caja: "cajas",
  paquete: "paquetes",
  rollo: "rollos",
  litro: "L",
  kg: "kg",
  resma: "resmas",
};

const ETIQUETA_VISTA: Record<EstadoStock, string> = {
  normal: "Disponible",
  bajo: "Bajo mínimo",
  agotado: "Agotado",
  exceso: "Exceso",
};

const TONO_VISTA: Record<EstadoStock, "exito" | "aviso" | "error" | "neutro"> = {
  // Solo lo que pide atención lleva color; "Disponible" y "Exceso" quedan en gris.
  normal: "neutro",
  bajo: "aviso",
  agotado: "error",
  exceso: "neutro",
};

function EstadoProducto({ articulo }: { articulo: Articulo }) {
  if (!articulo.activo) return <Distintivo tono="neutro">Archivado</Distintivo>;
  const estado = estadoStock(articulo);
  return <Distintivo tono={TONO_VISTA[estado]}>{ETIQUETA_VISTA[estado]}</Distintivo>;
}

function MiniaturaProducto({
  articulo,
  pequeña = false,
}: {
  articulo: Articulo;
  pequeña?: boolean;
}) {
  const foto = fotoDeProducto(articulo.id);
  return (
    <span className={cx("cat-thumb", pequeña && "cat-thumb--sm")} aria-hidden>
      {foto ? (
        <img src={foto.src} alt="" loading="lazy" decoding="async" />
      ) : (
        <Package className="cat-thumb__fallback" />
      )}
    </span>
  );
}

function CreditosFotos() {
  const fotos = Object.values(FOTOS_PRODUCTO);
  if (fotos.length === 0) return null;
  return (
    <details className="cat-credits">
      <summary>Fotos de referencia · Wikimedia Commons</summary>
      <ul>
        {fotos.map((foto) => (
          <li key={foto.src}>
            <a href={foto.page} target="_blank" rel="noreferrer">
              {foto.credit}
            </a>
          </li>
        ))}
      </ul>
    </details>
  );
}

/** Texto del estado bajo la cifra; «normal» no dice nada, que es lo normal. */
const TEXTO_ESTADO: Partial<Record<EstadoStock, { texto: string; clase: string }>> = {
  agotado: { texto: "Agotado", clase: "text-error-700 dark:text-error-400" },
  bajo: { texto: "Por reponer", clase: "text-brand-700 dark:text-brand-400" },
  exceso: { texto: "Sobre el máximo", clase: "text-gray-600 dark:text-gray-400" },
};

function EstadoTexto({ estado }: { estado: EstadoStock }) {
  const t = TEXTO_ESTADO[estado];
  return t ? <span className={cx("text-theme-xs", t.clase)}>{t.texto}</span> : null;
}

// ═══════════════════════════════════════════════════════════════════════════
// FORMULARIO
// ═══════════════════════════════════════════════════════════════════════════

/** El formulario guarda texto: un `<input type="number">` vacío no es 0. */
interface Borrador {
  sku: string;
  nombre: string;
  categoria: string;
  unidad: UnidadMedida;
  costoUnitario: string;
  proveedorId: string;
  puntoReorden: string;
  stockMaximo: string;
}

function borradorDe(a: Articulo | null): Borrador {
  const c = inventarioStore.config;
  return {
    sku: a?.sku ?? "",
    nombre: a?.nombre ?? "",
    categoria: a?.categoria ?? c.categorias[0] ?? "",
    unidad: a?.unidad ?? c.unidadPorDefecto,
    costoUnitario: a ? String(a.costoUnitario) : "",
    proveedorId: a?.proveedorId ?? "",
    // Un artículo nuevo arranca con los niveles por defecto de Configuración.
    puntoReorden: String(a?.puntoReorden ?? c.puntoReordenPorDefecto),
    stockMaximo: String(a?.stockMaximo ?? c.stockMaximoPorDefecto),
  };
}

function aDatos(b: Borrador): DatosArticulo | string {
  const num = (v: string, campo: string) => {
    const n = Number(v);
    return v.trim() === "" || !Number.isFinite(n) ? `Indica ${campo}.` : n;
  };
  const costo = num(b.costoUnitario, "el costo unitario");
  if (typeof costo === "string") return costo;
  const punto = num(b.puntoReorden, "el punto de reorden");
  if (typeof punto === "string") return punto;
  const maximo = num(b.stockMaximo, "la existencia máxima");
  if (typeof maximo === "string") return maximo;
  if (!Number.isInteger(punto) || !Number.isInteger(maximo)) return "Los niveles de existencia deben ser enteros.";
  return {
    sku: b.sku,
    nombre: b.nombre,
    categoria: b.categoria,
    unidad: b.unidad,
    costoUnitario: costo,
    proveedorId: b.proveedorId || null,
    puntoReorden: punto,
    stockMaximo: maximo,
  };
}

const PanelFormulario = observer(function PanelFormulario({
  articulo,
  abierto,
  onCerrar,
  onGuardado,
}: {
  articulo: Articulo | null;
  abierto: boolean;
  onCerrar: () => void;
  onGuardado: (a: Articulo, nuevo: boolean) => void;
}) {
  const s = inventarioStore;
  const [b, setB] = useState<Borrador>(() => borradorDe(articulo));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (abierto) {
      setB(borradorDe(articulo));
      setError(null);
    }
  }, [abierto, articulo]);

  const cambiar = <K extends keyof Borrador>(k: K, v: Borrador[K]) => setB((x) => ({ ...x, [k]: v }));

  const guardar = (e?: React.FormEvent) => {
    e?.preventDefault();
    const datos = aDatos(b);
    if (typeof datos === "string") return setError(datos);
    const r = articulo ? s.actualizarArticulo(articulo.id, datos) : s.crearArticulo(datos);
    if (!r.ok) return setError(r.error);
    onGuardado(r.valor, !articulo);
  };

  // Un proveedor inactivo puede seguir asignado; se lista para que el select
  // no muestre un valor vacío al editar.
  const proveedores = s.proveedores.filter((p) => p.activo || p.id === articulo?.proveedorId);
  const punto = Number(b.puntoReorden);
  const maximo = Number(b.stockMaximo);
  const nivelesValidos = b.puntoReorden !== "" && b.stockMaximo !== "" && maximo > punto;

  return (
    <PanelLateral
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={articulo ? "Editar artículo" : "Nuevo artículo"}
      subtitulo={articulo ? articulo.sku : "Empieza con cero existencias; súmalas registrando una entrada."}
      pie={
        <>
          <Boton variante="texto" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton variante="principal" onClick={() => guardar()}>
            {articulo ? "Guardar cambios" : "Crear artículo"}
          </Boton>
        </>
      }
    >
      <form onSubmit={guardar} className="space-y-6">
        <fieldset className="space-y-4">
          <legend className="mb-1 text-theme-md font-bold text-ink-title dark:text-white">Qué es</legend>
          <Campo etiqueta="Nombre">
            <input className={CONTROL} value={b.nombre} onChange={(e) => cambiar("nombre", e.target.value)} placeholder="Papel bond carta 75 g" autoFocus />
          </Campo>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Campo etiqueta="Código" ayuda="El código con el que lo buscas y lo etiquetas.">
              <input className={CONTROL} value={b.sku} onChange={(e) => cambiar("sku", e.target.value)} placeholder="OFI-1007" />
            </Campo>
            <Campo etiqueta="Unidad de medida">
              <select className={CONTROL} value={b.unidad} onChange={(e) => cambiar("unidad", e.target.value as UnidadMedida)}>
                {(Object.keys(ETIQUETA_UNIDAD) as UnidadMedida[]).map((u) => (
                  <option key={u} value={u}>
                    {ETIQUETA_UNIDAD[u]}
                  </option>
                ))}
              </select>
            </Campo>
          </div>
          <Campo etiqueta="Categoría">
            <select className={CONTROL} value={b.categoria} onChange={(e) => cambiar("categoria", e.target.value)}>
              {!s.config.categorias.includes(b.categoria) && b.categoria && <option value={b.categoria}>{b.categoria}</option>}
              {s.config.categorias.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Campo>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="mb-1 text-theme-md font-bold text-ink-title dark:text-white">A quién se le compra</legend>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Campo etiqueta="Proveedor">
              <select className={CONTROL} value={b.proveedorId} onChange={(e) => cambiar("proveedorId", e.target.value)}>
                <option value="">Sin proveedor</option>
                {proveedores.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo etiqueta="Costo por unidad (COP)">
              <input className={CONTROL} type="number" inputMode="numeric" min={0} value={b.costoUnitario} onChange={(e) => cambiar("costoUnitario", e.target.value)} placeholder="0" />
            </Campo>
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="mb-1 text-theme-md font-bold text-ink-title dark:text-white">Cuándo reponer</legend>
          <div className="grid grid-cols-2 gap-4">
            <Campo etiqueta="Punto de reorden">
              <input className={CONTROL} type="number" inputMode="numeric" min={0} step={1} value={b.puntoReorden} onChange={(e) => cambiar("puntoReorden", e.target.value)} />
            </Campo>
            <Campo etiqueta="Existencia máxima">
              <input className={CONTROL} type="number" inputMode="numeric" min={0} step={1} value={b.stockMaximo} onChange={(e) => cambiar("stockMaximo", e.target.value)} />
            </Campo>
          </div>
          {/* La regla dicha con los números del formulario: más clara que dos definiciones. */}
          <p className="rounded-xl bg-gray-50 px-3.5 py-3 text-theme-sm text-gray-700 dark:bg-white/[0.03] dark:text-gray-300">
            {nivelesValidos
              ? `Con ${formatearEntero(punto)} unidades o menos entra en la cola de reorden, y se sugiere pedir hasta llegar a ${formatearEntero(maximo)}.`
              : "La existencia máxima debe ser mayor que el punto de reorden."}
          </p>
        </fieldset>

        <MensajeError>{error}</MensajeError>
        {/* Enter dentro del formulario guarda. */}
        <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
      </form>
    </PanelLateral>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// DETALLE
// ═══════════════════════════════════════════════════════════════════════════

const PanelDetalle = observer(function PanelDetalle({
  articulo,
  onCerrar,
  onEditar,
  onArchivar,
}: {
  articulo: Articulo | null;
  onCerrar: () => void;
  onEditar: () => void;
  onArchivar: () => void;
}) {
  const navigate = useNavigate();
  const s = inventarioStore;
  if (!articulo) return null;
  const a = articulo;
  const total = stockTotal(a);
  const estado = estadoStock(a);
  const unidad = ETIQUETA_UNIDAD[a.unidad].toLowerCase();
  const movimientos = s.movimientosRecientes.filter((m) => m.articuloId === a.id).slice(0, 5);
  // Ubicaciones con stock, más las activas donde estuvo: que se vea dónde NO hay.
  const filas = s.ubicaciones
    .filter((u) => (a.existencias[u.id] ?? 0) > 0 || (u.activa && u.id in a.existencias))
    .map((u) => ({ u, n: a.existencias[u.id] ?? 0 }))
    .sort((x, y) => y.n - x.n);

  return (
    <PanelLateral
      abierto
      onCerrar={onCerrar}
      titulo={a.nombre}
      subtitulo={`${a.sku} · ${a.categoria}${a.activo ? "" : " · Archivado"}`}
      pie={
        <>
          <Boton variante="texto" onClick={onArchivar}>
            {a.activo ? "Archivar" : "Reactivar"}
          </Boton>
          <Boton variante="secundario" onClick={onEditar}>
            Editar
          </Boton>
          {a.activo && (
            <Boton variante="principal" onClick={() => navigate(`/inventarios/movimientos?nuevo=entrada&articulo=${a.id}`)}>
              Registrar movimiento
            </Boton>
          )}
        </>
      }
    >
      <section>
        <p className="text-theme-xs text-gray-600 dark:text-gray-400">Existencias</p>
        <p className="mt-1 flex items-baseline gap-2">
          <span className="text-title-md font-bold leading-tight tabular-nums text-ink-title dark:text-white">{formatearEntero(total)}</span>
          <span className="text-theme-sm text-gray-600 dark:text-gray-400">{unidad}</span>
          <span className="ml-auto">
            <EstadoTexto estado={estado} />
          </span>
        </p>
        <div className="mt-3">
          <NivelStock stock={total} puntoReorden={a.puntoReorden} stockMaximo={a.stockMaximo} estado={estado} ancho="w-full" />
          <div className="mt-2 flex justify-between text-theme-xs text-gray-600 dark:text-gray-400">
            <span>Reponer con {formatearEntero(a.puntoReorden)} o menos</span>
            <span>Máximo {formatearEntero(a.stockMaximo)}</span>
          </div>
        </div>
      </section>

      <ListaDatos
        items={[
          { etiqueta: "Valor en bodega", valor: <span className="tabular-nums">{formatearMoneda(valorArticulo(a))}</span> },
          { etiqueta: "Costo por unidad", valor: <span className="tabular-nums">{formatearMoneda(a.costoUnitario)}</span> },
          { etiqueta: "Proveedor", valor: s.nombreProveedor(a.proveedorId) },
          { etiqueta: "Unidad", valor: ETIQUETA_UNIDAD[a.unidad] },
        ]}
      />

      <section>
        <Subtitulo>Dónde está</Subtitulo>
        {filas.length === 0 ? (
          <Vacio>Sin existencias registradas.</Vacio>
        ) : (
          <ul>
            {filas.map(({ u, n }) => (
              <li key={u.id} className="flex items-center justify-between gap-3 border-t border-gray-100 py-2.5 first:border-t-0 dark:border-white/5">
                <span>{u.nombre}</span>
                <span className={cx("tabular-nums", n === 0 ? "text-gray-500" : "font-bold text-ink-body dark:text-white")}>{formatearEntero(n)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <Subtitulo
          accion={
            movimientos.length > 0 && (
              <button type="button" onClick={() => navigate(`/inventarios/movimientos?articulo=${a.id}`)} className="text-theme-sm font-bold text-ink-title hover:underline dark:text-white">
                Ver todos
              </button>
            )
          }
        >
          Últimos movimientos
        </Subtitulo>
        {movimientos.length === 0 ? (
          <Vacio>Todavía no se ha movido.</Vacio>
        ) : (
          <ul>
            {movimientos.map((m) => (
              <li key={m.id} className="flex items-start justify-between gap-3 border-t border-gray-100 py-2.5 first:border-t-0 dark:border-white/5">
                <div className="min-w-0">
                  <p className="truncate">
                    {ETIQUETA_TIPO_MOVIMIENTO[m.tipo]} · {m.motivo}
                  </p>
                  <p className="mt-0.5 text-theme-xs text-gray-600 dark:text-gray-400">
                    {fechaRelativa(m.fecha)} · {m.responsable}
                    {m.referencia && ` · ${m.referencia}`}
                  </p>
                </div>
                <span className="shrink-0 font-bold tabular-nums text-ink-body dark:text-white">
                  {m.tipo === "transferencia" ? formatearEntero(m.cantidad) : formatearDelta(deltaTotal(m))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </PanelLateral>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// PÁGINA
// ═══════════════════════════════════════════════════════════════════════════

export const ArticulosPage = observer(function ArticulosPage() {
  const s = inventarioStore;
  const [params, setParams] = useSearchParams();
  const { aviso, mostrar } = useAviso();

  const [pestana, setPestana] = useState<Pestana>("todos");
  const [busqueda, setBusqueda] = useState("");
  const [categoria, setCategoria] = useState("");
  const [proveedorId, setProveedorId] = useState("");
  const [ubicacionId, setUbicacionId] = useState("");
  const [vista, setVista] = useState<VistaCatalogo>(() => {
    try {
      return localStorage.getItem(CLAVE_VISTA) === "tabla" ? "tabla" : "tarjetas";
    } catch {
      return "tarjetas";
    }
  });
  const [formulario, setFormulario] = useState<{ abierto: boolean; articulo: Articulo | null }>({ abierto: false, articulo: null });
  const [porArchivar, setPorArchivar] = useState<Articulo | null>(null);

  const cambiarVista = (siguiente: VistaCatalogo) => {
    setVista(siguiente);
    try {
      localStorage.setItem(CLAVE_VISTA, siguiente);
    } catch {
      // Sin localStorage, la vista sigue funcionando en memoria.
    }
  };

  // El detalle abierto vive en la URL (`?articulo=`): así el dashboard y la
  // cola de reorden enlazan directo a un artículo.
  const detalleId = params.get("articulo");
  const detalle = detalleId ? s.articulo(detalleId) ?? null : null;

  const abrirDetalle = (id: string | null) => {
    const p = new URLSearchParams(params);
    if (id) p.set("articulo", id);
    else p.delete("articulo");
    setParams(p, { replace: true });
  };

  // Búsqueda y filtros primero; las pestañas cuentan sobre ese resultado.
  // Sin `useMemo`: los artículos se mutan en sitio y un memo por referencia
  // se quedaría con la lista vieja.
  const q = busqueda.trim().toLowerCase();
  const filtrados = s.articulos.filter((a) => {
    if (categoria && a.categoria !== categoria) return false;
    if (proveedorId && a.proveedorId !== proveedorId) return false;
    if (ubicacionId && !((a.existencias[ubicacionId] ?? 0) > 0)) return false;
    if (q && !a.nombre.toLowerCase().includes(q) && !a.sku.toLowerCase().includes(q)) return false;
    return true;
  });
  const activos = filtrados.filter((a) => a.activo);
  const enPestana: Record<Pestana, Articulo[]> = {
    todos: activos,
    reponer: activos.filter((a) => ["agotado", "bajo"].includes(estadoStock(a))),
    agotado: activos.filter((a) => estadoStock(a) === "agotado"),
    exceso: activos.filter((a) => estadoStock(a) === "exceso"),
    archivados: filtrados.filter((a) => !a.activo),
  };
  const visibles = enPestana[pestana].slice().sort((x, y) => x.nombre.localeCompare(y.nombre));

  const stockDe = (a: Articulo) => (ubicacionId ? a.existencias[ubicacionId] ?? 0 : stockTotal(a));
  const valorVisible = visibles.reduce((t, a) => t + stockDe(a) * a.costoUnitario, 0);

  const exportar = () => {
    const csv = construirCsv(
      ["Código", "Artículo", "Categoría", "Unidad", "Proveedor", "Existencias", "Punto de reorden", "Existencia máxima", "Costo unitario", "Valor", "Estado"],
      visibles.map((a) => [
        a.sku,
        a.nombre,
        a.categoria,
        ETIQUETA_UNIDAD[a.unidad],
        s.nombreProveedor(a.proveedorId),
        stockDe(a),
        a.puntoReorden,
        a.stockMaximo,
        a.costoUnitario,
        stockDe(a) * a.costoUnitario,
        ETIQUETA_ESTADO_STOCK[estadoStock(a)],
      ]),
    );
    descargarCsv(csv, nombreArchivoCsv("catalogo-articulos"));
  };

  const confirmarArchivo = () => {
    const a = porArchivar;
    if (!a) return;
    setPorArchivar(null);
    const r = s.alternarArticuloActivo(a.id);
    if (!r.ok) return mostrar(r.error);
    mostrar(a.activo ? `${a.nombre} reactivado` : `${a.nombre} archivado`);
  };

  const r = s.resumen;
  const hayFiltros = Boolean(busqueda || categoria || proveedorId || ubicacionId);
  const proveedoresFiltro = s.proveedores.slice().sort((a, b) => a.nombre.localeCompare(b.nombre));

  return (
    <PaginaInventario
      titulo="Catálogo de artículos"
      resumen={
        <>
          {formatearEntero(r.skus)} artículos activos por {formatearMoneda(r.valor)}.{" "}
          {r.agotados + r.bajos > 0 && (
            <button type="button" onClick={() => setPestana("reponer")} className="font-bold text-ink-title hover:underline dark:text-white">
              {formatearEntero(r.agotados + r.bajos)} por reponer
            </button>
          )}
        </>
      }
      acciones={
        <>
          <Boton icono={<Download className="h-4 w-4" />} onClick={exportar} disabled={visibles.length === 0}>
            Exportar
          </Boton>
          <Boton variante="principal" className="cat-primary" icono={<Plus className="h-4 w-4" />} onClick={() => setFormulario({ abierto: true, articulo: null })}>
            Nuevo artículo
          </Boton>
        </>
      }
      pestanas={
        <Pestanas<Pestana>
          valor={pestana}
          onCambio={setPestana}
          opciones={[
            { valor: "todos", etiqueta: "Todos", cuenta: enPestana.todos.length },
            { valor: "reponer", etiqueta: "Por reponer", cuenta: enPestana.reponer.length },
            { valor: "agotado", etiqueta: "Agotados", cuenta: enPestana.agotado.length },
            { valor: "exceso", etiqueta: "Sobre el máximo", cuenta: enPestana.exceso.length },
            { valor: "archivados", etiqueta: "Archivados", cuenta: enPestana.archivados.length },
          ]}
        />
      }
    >
      <div className="cat-catalogo">
        <div className="cat-toolbar">
          <div className="cat-search">
            <Buscador valor={busqueda} onCambio={setBusqueda} placeholder="Buscar por nombre o código" />
          </div>
          <div className="cat-filterbar">
            <div className="cat-filters">
              <Filtro
                etiqueta="Categoría"
                valor={categoria}
                onCambio={setCategoria}
                opciones={[{ valor: "", etiqueta: "Todas las categorías" }, ...s.config.categorias.map((c) => ({ valor: c, etiqueta: c }))]}
              />
              <Filtro
                etiqueta="Proveedor"
                valor={proveedorId}
                onCambio={setProveedorId}
                opciones={[{ valor: "", etiqueta: "Todos los proveedores" }, ...proveedoresFiltro.map((p) => ({ valor: p.id, etiqueta: p.nombre }))]}
              />
              <Filtro
                etiqueta="Ubicación"
                valor={ubicacionId}
                onCambio={setUbicacionId}
                opciones={[{ valor: "", etiqueta: "Todas las ubicaciones" }, ...s.ubicacionesActivas.map((u) => ({ valor: u.id, etiqueta: u.nombre }))]}
              />
            </div>
            <div className="cat-toolbar-end">
              <span className="cat-count">
                {formatearEntero(visibles.length)} {visibles.length === 1 ? "artículo" : "artículos"} · {formatearMoneda(valorVisible)}
              </span>
              <div className="cat-view" role="group" aria-label="Vista del catálogo">
                <button
                  type="button"
                  aria-pressed={vista === "tarjetas"}
                  onClick={() => cambiarVista("tarjetas")}
                >
                  <LayoutGrid aria-hidden />
                  <span>Tarjetas</span>
                </button>
                <button
                  type="button"
                  aria-pressed={vista === "tabla"}
                  onClick={() => cambiarVista("tabla")}
                >
                  <List aria-hidden />
                  <span>Tabla</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {visibles.length === 0 ? (
          <Vacio
            accion={
              hayFiltros ? (
                <Boton
                  variante="texto"
                  onClick={() => {
                    setBusqueda("");
                    setCategoria("");
                    setProveedorId("");
                    setUbicacionId("");
                  }}
                >
                  Quitar filtros
                </Boton>
              ) : undefined
            }
          >
            {hayFiltros
              ? "Ningún artículo coincide con la búsqueda."
              : pestana === "reponer"
                ? "Nada por reponer: todos los artículos están sobre su punto de reorden."
                : pestana === "archivados"
                  ? "No hay artículos archivados."
                  : "No hay artículos en esta pestaña."}
          </Vacio>
        ) : vista === "tarjetas" ? (
          <div className="cat-grid">
            {visibles.map((a) => {
              const n = stockDe(a);
              return (
                <button
                  key={a.id}
                  type="button"
                  className={cx("cat-card", !a.activo && "is-archived")}
                  onClick={() => abrirDetalle(a.id)}
                >
                  <span className="cat-card__top">
                    <MiniaturaProducto articulo={a} />
                    <span className="cat-card__body">
                      <span className="cat-card__meta">
                        <span className="cat-card__sku">{a.sku}</span>
                        <EstadoProducto articulo={a} />
                      </span>
                      <span className="cat-card__name">{a.nombre}</span>
                      <span className="cat-card__category">{a.categoria}</span>
                    </span>
                    <ChevronRight className="cat-card__chev" aria-hidden />
                  </span>
                  {a.activo && (
                    <span className="cat-card__level">
                      <span className="flex min-w-0 flex-1">
                        <NivelStock stock={stockTotal(a)} puntoReorden={a.puntoReorden} stockMaximo={a.stockMaximo} estado={estadoStock(a)} ancho="w-full" />
                      </span>
                      <span className="cat-card__range">
                        mín. {formatearEntero(a.puntoReorden)} · máx. {formatearEntero(a.stockMaximo)}
                      </span>
                    </span>
                  )}
                  <span className="cat-card__stats">
                    <span className="cat-stat">
                      <span className="cat-stat__label">Existencia</span>
                      <strong className="cat-stat__value">
                        {formatearEntero(n)} <small>{UNIDAD_CORTA[a.unidad]}</small>
                      </strong>
                    </span>
                    <span className="cat-stat">
                      <span className="cat-stat__label">Costo unitario</span>
                      <strong className="cat-stat__value">{formatearMoneda(a.costoUnitario)}</strong>
                    </span>
                    <span className="cat-stat">
                      <span className="cat-stat__label">Valor</span>
                      <strong className="cat-stat__value">{formatearMoneda(n * a.costoUnitario)}</strong>
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <>
            {/* Escritorio y tableta: tabla. */}
            <table className={cx(TABLA.tabla, "hidden sm:table")}>
              <thead>
                <tr>
                  <th className={TABLA.th}>Artículo</th>
                  <th className={cx(TABLA.th, "hidden lg:table-cell")}>Categoría</th>
                  <th className={TABLA.th}>Existencias{ubicacionId && ` en ${s.nombreUbicacion(ubicacionId)}`}</th>
                  <th className={cx(TABLA.thNum, "hidden md:table-cell")}>Costo unitario</th>
                  <th className={TABLA.thNum}>Valor</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((a) => {
                  const n = stockDe(a);
                  const estado = estadoStock(a);
                  return (
                    <tr
                      key={a.id}
                      className={TABLA.filaClic}
                      onClick={() => abrirDetalle(a.id)}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          abrirDetalle(a.id);
                        }
                      }}
                    >
                      <td className={cx(TABLA.td, "max-w-[360px]")}>
                        <div className="flex items-center gap-3">
                          <MiniaturaProducto articulo={a} pequeña />
                          <CeldaDoble principal={a.nombre} secundaria={`${a.sku} · ${s.nombreProveedor(a.proveedorId)}`} />
                        </div>
                      </td>
                      <td className={cx(TABLA.td, "hidden text-gray-600 lg:table-cell dark:text-gray-400")}>{a.categoria}</td>
                      <td className={TABLA.td}>
                        <div className="flex items-center gap-3">
                          <span className="w-12 text-right font-bold tabular-nums text-ink-body dark:text-white">{formatearEntero(n)}</span>
                          <NivelStock stock={stockTotal(a)} puntoReorden={a.puntoReorden} stockMaximo={a.stockMaximo} estado={estado} />
                          {a.activo && <EstadoTexto estado={estado} />}
                        </div>
                      </td>
                      <td className={cx(TABLA.tdNum, "hidden text-gray-600 md:table-cell dark:text-gray-400")}>{formatearMoneda(a.costoUnitario)}</td>
                      <td className={TABLA.tdNum}>{formatearMoneda(n * a.costoUnitario)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Móvil: lista de dos líneas. */}
            <div className="sm:hidden">
              {visibles.map((a) => {
                const estado = estadoStock(a);
                return (
                  <FilaMovil
                    key={a.id}
                    onClick={() => abrirDetalle(a.id)}
                    titulo={
                      <span className="flex min-w-0 items-center gap-3">
                        <MiniaturaProducto articulo={a} pequeña />
                        <span className="truncate">{a.nombre}</span>
                      </span>
                    }
                    detalle={
                      <span className="flex items-center gap-2">
                        {a.sku}
                        {a.activo && TEXTO_ESTADO[estado] && (
                          <>
                            <span aria-hidden>·</span>
                            <EstadoTexto estado={estado} />
                          </>
                        )}
                      </span>
                    }
                    cifra={
                      <span className="flex flex-col items-end gap-1.5">
                        <span className="font-bold text-ink-body dark:text-white">{formatearEntero(stockDe(a))}</span>
                        <NivelStock stock={stockTotal(a)} puntoReorden={a.puntoReorden} stockMaximo={a.stockMaximo} estado={estado} ancho="w-16" />
                      </span>
                    }
                  />
                );
              })}
            </div>
          </>
        )}

        <CreditosFotos />
      </div>

      <PanelDetalle
        articulo={formulario.abierto ? null : detalle}
        onCerrar={() => abrirDetalle(null)}
        onEditar={() => detalle && setFormulario({ abierto: true, articulo: detalle })}
        onArchivar={() => detalle && (detalle.activo ? setPorArchivar(detalle) : (s.alternarArticuloActivo(detalle.id), mostrar(`${detalle.nombre} reactivado`)))}
      />

      <PanelFormulario
        abierto={formulario.abierto}
        articulo={formulario.articulo}
        onCerrar={() => setFormulario({ abierto: false, articulo: null })}
        onGuardado={(a, nuevo) => {
          setFormulario({ abierto: false, articulo: null });
          mostrar(nuevo ? `Artículo ${a.sku} creado` : `Cambios guardados en ${a.sku}`);
          if (nuevo) abrirDetalle(a.id);
        }}
      />

      <Confirmar
        abierto={Boolean(porArchivar)}
        titulo={`¿Archivar ${porArchivar?.nombre ?? ""}?`}
        textoConfirmar="Archivar"
        peligro
        onConfirmar={confirmarArchivo}
        onCancelar={() => setPorArchivar(null)}
      >
        Sale del catálogo y de la cola de reorden, pero conserva su historial. Puedes reactivarlo desde la pestaña Archivados.
      </Confirmar>

      <Aviso texto={aviso} />
    </PaginaInventario>
  );
});

export default ArticulosPage;
