import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { observer } from "mobx-react-lite";

import { PageMeta } from "@/shell/meta";
import { Button } from "@/elements/ui/button";
import { Modal } from "@/elements/ui/modal";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/elements/ui/table";
import { SearchInput } from "@/elements";
import { Select } from "@/elements/form/select";
import { Badge } from "@/elements/ui/badge";
import { Alert } from "@/elements/ui/alert";
import { DownloadIcon, EyeIcon, PencilIcon, PlusIcon, TrashBinIcon } from "@/icons";
import { cn } from "@/utils";
import { inventariosStore, puedeGestionarCatalogo, type Elemento } from "@/stores";
import { construirCsv, descargarCsv, fechaLegibleCsv, nombreArchivoCsv } from "@/lib/csv";
import { CabeceraPagina, ContenedorPagina } from "./inventarios.ui";
import { SinResultados, EstadoElementoBadge } from "./inventarios.widgets";
import { ModalElemento, EtiquetaUnidad } from "./ModalElemento";
import { FILTRO_TODOS, FILAS_POR_PAGINA } from "./inventarios.constants";
import { buscarCoincidencia } from "./inventarios.presentacion";

// ═══════════════════════════════════════════════════════════════════════════
// ELEMENTOS — catálogo general
// ═══════════════════════════════════════════════════════════════════════════
//
// ── Por qué el catálogo es «General» y no por ubicación ────────────────────
//
// Un elemento no «pertenece» a un sitio: la misma impresora puede estar hoy en
// la sede norte y mañana en la sur, y eso no la convierte en otro elemento. Lo
// que sí tiene ubicación es el **conteo**. Si el catálogo estuviera partido por
// ubicación, mover un equipo obligaría a duplicar su ficha y su historial se
// partiría en dos.
//
// ── Baja lógica, nunca borrado ─────────────────────────────────────────────
//
// Un elemento que aparece en cualquier conteo **no se puede borrar**: sus líneas
// viven dentro de conteos finalizados que son inmutables, y borrarlo dejaría
// líneas huérfanas apuntando a nada. Se da de baja: desaparece del selector de
// conteo y su historial se conserva.

export const ElementosPage = observer(function ElementosPage() {
  const navigate = useNavigate();

  const [consulta, setConsulta] = useState("");
  const [filtroEstado, setFiltroEstado] = useState(FILTRO_TODOS);
  const [filtroCategoria, setFiltroCategoria] = useState(FILTRO_TODOS);
  const [pagina, setPagina] = useState(0);
  const [modal, setModal] = useState<{ abierto: boolean; elemento: Elemento | null }>({
    abierto: false,
    elemento: null,
  });
  // Baja y reactivación desde la propia lista. Antes esto vivía SOLO en el
  // detalle del elemento, así que dar de baja un producto obligaba a entrar a
  // su ficha; el catálogo podía añadir pero no quitar. `UbicacionesPage` ya
  // resolvía lo mismo con un botón por fila y un modal de confirmación: se
  // copia ese patrón en vez de inventar otro.
  const [confirmarBaja, setConfirmarBaja] = useState<Elemento | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const puedeGestionar = puedeGestionarCatalogo();

  /** Da de baja o reactiva, según el estado actual. El `motivo` del store manda. */
  function alternarEstado(el: Elemento) {
    const esInactivo = el.estado === "inactivo";
    const r = esInactivo
      ? inventariosStore.activarElemento(el.id)
      : inventariosStore.desactivarElemento(el.id);
    if (!r.ok) {
      setAviso(r.motivo ?? "No se pudo cambiar el estado del producto");
      setConfirmarBaja(null);
      return;
    }
    setAviso(null);
    setConfirmarBaja(null);
  }

  const opcionesCategoria = useMemo(
    () => [
      { value: FILTRO_TODOS, label: "Todas las categorías" },
      ...inventariosStore.categoriasUsadas.map((c) => ({ value: c, label: c })),
    ],
    [inventariosStore.elementos.length],
  );

  const filtrados = useMemo(
    () =>
      inventariosStore.elementosOrdenados.filter((e) => {
        if (filtroEstado !== FILTRO_TODOS && e.estado !== filtroEstado) return false;
        if (filtroCategoria !== FILTRO_TODOS && e.categoria !== filtroCategoria) return false;
        return buscarCoincidencia(consulta, e.codigo, e.nombre, e.categoria, e.descripcion);
      }),
    [consulta, filtroEstado, filtroCategoria, inventariosStore.elementos.length],
  );

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / FILAS_POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas - 1);
  const visibles = filtrados.slice(paginaActual * FILAS_POR_PAGINA, (paginaActual + 1) * FILAS_POR_PAGINA);

  const hayFiltro = consulta.trim() !== "" || filtroEstado !== FILTRO_TODOS || filtroCategoria !== FILTRO_TODOS;

  function limpiar() {
    setConsulta("");
    setFiltroEstado(FILTRO_TODOS);
    setFiltroCategoria(FILTRO_TODOS);
    setPagina(0);
  }

  function exportar() {
    const csv = construirCsv(
      ["Código", "Nombre", "Categoría", "Unidad", "Estado", "Descripción", "Creado"],
      filtrados.map((e) => [
        e.codigo,
        e.nombre,
        e.categoria,
        e.unidad,
        e.estado,
        e.descripcion ?? "",
        fechaLegibleCsv(e.createdAt),
      ]),
    );
    descargarCsv(csv, nombreArchivoCsv("elementos"));
  }

  const activos = inventariosStore.elementos.filter((e) => e.estado === "activo").length;
  const inactivos = inventariosStore.elementos.length - activos;

  return (
    <>
      <PageMeta
        title="Productos · Inventarios"
        description="Catálogo de productos y artículos registrados para inventario."
      />

      <ContenedorPagina>
        <CabeceraPagina
          titulo="Productos"
          descripcion="Consulta y gestiona el catálogo de productos disponibles para tus conteos de inventario."
          acciones={
            <>
              <Button
                variant="outline"
                size="sm"
                startIcon={<DownloadIcon className="h-4 w-4" />}
                onClick={exportar}
                disabled={filtrados.length === 0}
              >
                Exportar lista
              </Button>
              {puedeGestionar && (
                <Button
                  size="sm"
                  startIcon={<PlusIcon className="h-4 w-4" />}
                  onClick={() => setModal({ abierto: true, elemento: null })}
                >
                  Agregar producto
                </Button>
              )}
            </>
          }
        />

        {/* El `motivo` que devuelve el store se muestra aquí. Sin esto, un
            rechazo (p. ej. reactivar un elemento cuyo padre está inactivo) no
            dejaría rastro visible y el botón parecería no hacer nada. */}
        {aviso && (
          <Alert variant="warning" title="No se pudo cambiar el estado" message={aviso} />
        )}

        {/* ── Búsqueda y Filtros ─────────────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <SearchInput
              value={consulta}
              onChange={(e) => {
                setConsulta(e.target.value);
                setPagina(0);
              }}
              onClear={() => setConsulta("")}
              placeholder="Buscar por código, nombre o categoría de producto…"
              className="sm:max-w-md sm:flex-1"
              aria-label="Buscar productos"
            />
            <div className="w-full sm:w-56">
              <Select
                options={opcionesCategoria}
                defaultValue={filtroCategoria}
                onChange={(v) => {
                  setFiltroCategoria(v);
                  setPagina(0);
                }}
                aria-label="Filtrar por categoría"
              />
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400 sm:ml-auto">
              Mostrando {filtrados.length} de {inventariosStore.elementos.length} productos
            </span>
          </div>

          {/* Segmentos rápidos por estado */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: FILTRO_TODOS, label: "Todos", n: inventariosStore.elementos.length },
              { id: "activo", label: "Activos", n: activos },
              { id: "inactivo", label: "De baja", n: inactivos },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setFiltroEstado(tab.id);
                  setPagina(0);
                }}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  filtroEstado === tab.id
                    ? "bg-brand-700 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10"
                }`}
              >
                <span>{tab.label}</span>
                <span className={filtroEstado === tab.id ? "text-white/80" : "text-gray-600 dark:text-gray-400"}>
                  {tab.n}
                </span>
              </button>
            ))}
            {hayFiltro && (
              <button
                type="button"
                onClick={limpiar}
                className="ml-2 text-xs font-medium text-gray-500 hover:text-brand-700 dark:text-gray-400 dark:hover:text-brand-400"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </div>

        {/* ── Tabla de Productos ─────────────────────────────────────────── */}
        {visibles.length === 0 ? (
          <SinResultados
            titulo={hayFiltro ? "No se encontraron productos con estos filtros" : "Aún no tienes productos registrados"}
            detalle={
              hayFiltro
                ? "Prueba buscando con otros términos o seleccionando otra categoría."
                : "Agrega el primer producto para poder incluirlo en los conteos de inventario."
            }
            accion={
              hayFiltro ? (
                <Button variant="outline" size="sm" onClick={limpiar}>
                  Ver todos los productos
                </Button>
              ) : puedeGestionar ? (
                <Button size="sm" startIcon={<PlusIcon className="h-4 w-4" />} onClick={() => setModal({ abierto: true, elemento: null })}>
                  Agregar primer producto
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell header className="w-[10rem]">Código</TableCell>
                  <TableCell header>Producto</TableCell>
                  <TableCell header className="w-[12rem]">Categoría</TableCell>
                  <TableCell header className="w-[10rem]">Unidad</TableCell>
                  <TableCell header className="w-[8rem]">Estado</TableCell>
                  <TableCell header className="w-[8rem] text-right">Acciones</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibles.map((e) => {
                  return (
                    <TableRow
                      key={e.id}
                      className="group cursor-pointer transition-colors hover:bg-gray-50/80 dark:hover:bg-white/[0.02]"
                      onClick={() => navigate(`/inventarios/elementos/${e.id}`)}
                    >
                      <TableCell>
                        <span className="font-mono text-xs font-semibold text-gray-700 dark:text-gray-300">{e.codigo}</span>
                      </TableCell>
                      <TableCell>
                        <div className="block w-full text-left">
                          <span className="block truncate text-sm font-semibold text-ink-title dark:text-gray-100">
                            {e.nombre}
                          </span>
                          {e.descripcion && (
                            <span className="mt-0.5 block truncate text-xs text-gray-500 dark:text-gray-400">
                              {e.descripcion}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge color="light" size="xs">
                          {e.categoria}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <EtiquetaUnidad unidad={e.unidad} />
                      </TableCell>
                      <TableCell>
                        <EstadoElementoBadge estado={e.estado} />
                      </TableCell>
                      <TableCell className="text-right">
                        {/* Las acciones aparecen al pasar el ratón —el patrón que
                            ya usa `ModalUbicacion`— pero se fuerzan visibles por
                            debajo de `sm` porque en táctil no hay hover, y se
                            mantienen al enfocar con teclado (`focus-within`).
                            Los iconos van a `h-4 w-4` (no `3.5`): el objetivo es
                            que la tabla la maneje alguien con poca vista, y un
                            icono de 14 px no se distingue de otro. */}
                        <div className="flex items-center justify-end gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
                          <button
                            type="button"
                            title="Ver detalles"
                            aria-label={`Ver detalles de ${e.nombre}`}
                            onClick={(ev) => {
                              ev.stopPropagation();
                              navigate(`/inventarios/elementos/${e.id}`);
                            }}
                            className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-500/10"
                          >
                            <EyeIcon className="h-4 w-4" />
                            <span>Ver</span>
                          </button>
                          {puedeGestionar && (
                            <button
                              type="button"
                              title="Editar"
                              aria-label={`Editar ${e.nombre}`}
                              onClick={(ev) => {
                                ev.stopPropagation();
                                setModal({ abierto: true, elemento: e });
                              }}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-brand-700 dark:hover:bg-white/5 dark:hover:text-brand-400"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                          )}
                          {puedeGestionar && (
                            <button
                              type="button"
                              title={e.estado === "inactivo" ? "Reactivar" : "Dar de baja"}
                              aria-label={
                                e.estado === "inactivo"
                                  ? `Reactivar ${e.nombre}`
                                  : `Dar de baja ${e.nombre}`
                              }
                              onClick={(ev) => {
                                ev.stopPropagation();
                                setConfirmarBaja(e);
                              }}
                              className={cn(
                                "inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors",
                                e.estado === "inactivo"
                                  ? "hover:bg-success-50 hover:text-success-700 dark:hover:bg-success-500/10"
                                  : "hover:bg-error-50 hover:text-error-700 dark:hover:bg-error-500/10",
                              )}
                            >
                              {e.estado === "inactivo" ? (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                </svg>
                              ) : (
                                <TrashBinIcon className="h-4 w-4" />
                              )}
                            </button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* ── Paginación ────────────────────────────────────────────────── */}
        {filtrados.length > FILAS_POR_PAGINA && (
          <div className="flex items-center justify-between gap-3 pt-1">
            <span className="text-xs text-gray-600 dark:text-gray-400">
              Mostrando {paginaActual * FILAS_POR_PAGINA + 1}–
              {Math.min((paginaActual + 1) * FILAS_POR_PAGINA, filtrados.length)} de {filtrados.length}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagina((p) => Math.max(0, p - 1))}
                disabled={paginaActual === 0}
              >
                Anterior
              </Button>
              <span className="text-xs tabular-nums text-gray-500 dark:text-gray-400">
                Página {paginaActual + 1} de {totalPaginas}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagina((p) => Math.min(totalPaginas - 1, p + 1))}
                disabled={paginaActual >= totalPaginas - 1}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </ContenedorPagina>

      <ModalElemento
        abierto={modal.abierto}
        elemento={modal.elemento}
        onCerrar={() => setModal({ abierto: false, elemento: null })}
      />

      {/* Confirmación antes de dar de baja: es un cambio con consecuencia
          (el producto sale del selector de conteo), así que no se hace de un
          clic suelto. Reactivar no pide confirmación: no destruye nada. */}
      <Modal
        isOpen={confirmarBaja !== null}
        onClose={() => setConfirmarBaja(null)}
        className="max-w-md p-6"
      >
        <h2 className="text-lg font-semibold text-ink-title dark:text-white">
          {confirmarBaja?.estado === "inactivo" ? "¿Reactivar producto?" : "¿Dar de baja este producto?"}
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
          {confirmarBaja?.estado === "inactivo" ? (
            <>
              <strong>{confirmarBaja?.nombre}</strong> vuelve a estar disponible para los próximos conteos.
            </>
          ) : (
            <>
              <strong>{confirmarBaja?.nombre}</strong> dejará de aparecer al cargar elementos en un conteo.
              No se borra: su historial y sus líneas en conteos anteriores se conservan, y puedes
              reactivarlo cuando quieras.
            </>
          )}
        </p>
        <div className="mt-5 flex items-center justify-end gap-3 border-t border-gray-200 pt-4 dark:border-gray-800">
          <Button variant="outline" onClick={() => setConfirmarBaja(null)}>
            Cancelar
          </Button>
          <Button
            variant={confirmarBaja?.estado === "inactivo" ? "primary" : "destructive"}
            onClick={() => confirmarBaja && alternarEstado(confirmarBaja)}
          >
            {confirmarBaja?.estado === "inactivo" ? "Reactivar" : "Dar de baja"}
          </Button>
        </div>
      </Modal>
    </>
  );
});

export default ElementosPage;
