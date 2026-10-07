import { useState } from "react";
import { useNavigate } from "react-router";
import { observer } from "mobx-react-lite";

import { PageMeta } from "@/shell/meta";
import { Button } from "@/elements/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/elements/ui/card";
import { Select } from "@/elements/form/select";
import { SearchInput } from "@/elements";
import { AdjustmentsHorizontalIcon, DownloadIcon, PlusIcon } from "@/icons";
import { cn } from "@/utils";
import { BOM_UTF8, construirCsv, descargarCsv, nombreArchivoCsv, ymdLocal } from "@/lib/csv";
import { puedeGestionarCatalogo } from "@/stores";
import { productosStore } from "@/stores/productos.store";
import { CabeceraPagina, ContenedorPagina } from "./inventarios.ui";
import { SinResultados } from "./inventarios.widgets";
import { ProductosTabla } from "./ProductosTabla";
import { ModalProducto } from "./ModalProducto";
import { InventarioZeroState } from "./InventarioZeroState";
import {
  FILTRO_TODOS,
  FILAS_POR_PAGINA,
  OPCIONES_SEMAFORO,
  SEMAFORO_META,
  TEXTO_SOLO_LECTURA,
  UNIDAD_META,
} from "./productos.constants";
import {
  filasDe,
  formatearMoneda,
  paginaValida,
  recortarPagina,
  totalPaginas,
} from "./productos.presentacion";

// ═══════════════════════════════════════════════════════════════════════════
// PRODUCTOS — el catálogo
// ═══════════════════════════════════════════════════════════════════════════
//
// ── Qué es esta pantalla ──────────────────────────────────────────────────
//
// La vista de trabajo diario: qué vendes, cuánto te cuesta, cuánto queda, desde
// qué cantidad conviene reponer y qué se está acabando. Todo lo demás del
// módulo (sedes, proveedores, órdenes, reportes) cuelga de aquí, porque el
// producto es lo único que existe en todos ellos.
//
// ── Los cuatro números del resumen son REALES ─────────────────────────────
//
// Categorías, productos, valorización y alertas se cuentan o se suman de los
// datos que hay. **No hay ninguna cifra decorativa.** El «más vendidos» que
// pedía el encargo no está porque exige datos de venta que este módulo no
// tiene, y poner un número inventado ahí sería exactamente la superficie que
// el usuario rechaza. Queda declarado en el handoff, no rellenado.
//
// ── Lo que esta pantalla NO hace ──────────────────────────────────────────
//
// No tiene un panel de filtros siempre abierto. Los tres desplegables viven
// detrás del botón «Filtros», que dice cuántos hay puestos: con la barra
// siempre desplegada, la tabla —que es el centro de la pantalla— empezaría
// 120px más abajo. Y el botón lleva el contador para que un filtro olvidado no
// se lea como «no hay productos».

export const ProductosPage = observer(function ProductosPage() {
  const navigate = useNavigate();

  // La fecha entra como parámetro para que el aviso de vencimiento sea
  // determinista y no dependa del reloj del render.
  const hoy = ymdLocal(new Date());
  const puedeEditar = puedeGestionarCatalogo();

  const [consulta, setConsulta] = useState("");
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);
  const [categoria, setCategoria] = useState(FILTRO_TODOS);
  const [sede, setSede] = useState(FILTRO_TODOS);
  const [semaforo, setSemaforo] = useState(FILTRO_TODOS);
  const [pagina, setPagina] = useState(0);
  const [modalAbierto, setModalAbierto] = useState(false);
  // Cambiar esta clave obliga a los `<Select>` a remontarse: son componentes no
  // controlados (solo aceptan `defaultValue`), así que sin remontarlos «Quitar
  // filtros» limpiaría el estado de React pero el desplegable seguiría
  // enseñando el valor viejo.
  const [versionFiltros, setVersionFiltros] = useState(0);

  const resumen = productosStore.resumen;

  // Se calcula en el render, sin `useMemo`: el resultado depende de los datos
  // observables del store, y memorizarlo con unas dependencias que no los
  // incluyen devolvería una tabla desfasada en cuanto se añadiera un producto.
  const filas = filasDe(
    productosStore.productosOrdenados,
    (id, sedes) => productosStore.cantidadDe(id, sedes),
    (producto, sedes) => productosStore.semaforoDe(producto, sedes),
    { consulta, categoria, sede, semaforo, todos: FILTRO_TODOS },
  );

  const paginaActual = paginaValida(pagina, filas.length, FILAS_POR_PAGINA);
  const visibles = recortarPagina(filas, paginaActual, FILAS_POR_PAGINA);
  const paginas = totalPaginas(filas.length, FILAS_POR_PAGINA);

  const filtrosPuestos =
    (categoria !== FILTRO_TODOS ? 1 : 0) +
    (sede !== FILTRO_TODOS ? 1 : 0) +
    (semaforo !== FILTRO_TODOS ? 1 : 0);

  const hayFiltro = filtrosPuestos > 0 || consulta.trim().length > 0;
  const catalogoVacio = productosStore.productosActivos.length === 0;

  function quitarFiltros() {
    setConsulta("");
    setCategoria(FILTRO_TODOS);
    setSede(FILTRO_TODOS);
    setSemaforo(FILTRO_TODOS);
    setVersionFiltros((v) => v + 1);
    setPagina(0);
  }

  /**
   * Descarga la lista **tal como se está viendo**.
   *
   * Exporta `filas` —lo filtrado— y no todo el catálogo: quien filtra por
   * «Agotado» y pulsa descargar espera la lista de agotados. Exportar el total
   * ignorando el filtro es la clase de detalle que hace que un reporte no sirva.
   */
  function descargar() {
    const contenido = construirCsv(
      ["Producto", "Código", "Categoría", "Precio de compra", "Cantidad", "Unidad", "Mínimo", "Vence", "Estado"],
      filas.map(({ producto, cantidad, semaforo: estado }) => [
        producto.nombre,
        producto.codigo,
        producto.categoria,
        producto.precioCompra,
        cantidad,
        UNIDAD_META[producto.unidad].plural,
        producto.minimo,
        producto.vencimiento ?? "",
        SEMAFORO_META[estado].label,
      ]),
    );
    descargarCsv(BOM_UTF8 + contenido, nombreArchivoCsv("productos"));
  }

  const opcionesCategoria = [
    { value: FILTRO_TODOS, label: "Todas las categorías" },
    ...productosStore.categorias.map((c) => ({ value: c, label: c })),
  ];
  const opcionesSede = [
    { value: FILTRO_TODOS, label: "Todas las sedes" },
    ...productosStore.sedesActivas.map((s) => ({ value: s.id, label: s.nombre })),
  ];
  const opcionesEstado = [
    { value: FILTRO_TODOS, label: "Todos los estados" },
    ...OPCIONES_SEMAFORO,
  ];

  const sedeFiltrada =
    sede === FILTRO_TODOS ? null : productosStore.nombreDeSede(sede);

  return (
    <ContenedorPagina>
      <PageMeta title="Productos · Inventario" />

      <CabeceraPagina
        titulo="Productos"
        descripcion="Lo que vendes: cuánto tienes, cuánto te cuesta y qué se está acabando."
        acciones={
          catalogoVacio ? undefined : (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (window.confirm("¿Seguro que deseas vaciar el inventario para probar el estado cero?")) {
                    productosStore.vaciarInventario();
                  }
                }}
                disabled={!puedeEditar}
              >
                Vaciar inventario (test)
              </Button>
              <Button
                startIcon={<PlusIcon className="h-4 w-4" />}
                onClick={() => setModalAbierto(true)}
                disabled={!puedeEditar}
              >
                Añadir producto
              </Button>
            </div>
          )
        }
      />

      {!puedeEditar && (
        <p className="rounded-xl bg-gray-100 px-3.5 py-2.5 text-sm text-gray-600 dark:bg-white/5 dark:text-gray-300">
          {TEXTO_SOLO_LECTURA}
        </p>
      )}

      {catalogoVacio ? (
        <InventarioZeroState
          onCrearManual={() => setModalAbierto(true)}
          puedeEditar={puedeEditar}
        />
      ) : (
        <>
          {/* ── Resumen ─────────────────────────────────────────────────────── */}
          <Card className="p-0 sm:p-0">
            <CardBody className="p-5 sm:p-6">
              <div className="grid grid-cols-2 gap-x-6 gap-y-5 xl:grid-cols-4">
                <Metrica
                  rotulo="Categorías"
                  valor={resumen.categorias.toLocaleString("es-CO")}
                  pie="En tu catálogo"
                />
                <Metrica
                  rotulo="Productos"
                  valor={resumen.productos.toLocaleString("es-CO")}
                  pie={`Valen ${formatearMoneda(resumen.valorizacion)}`}
                />
                <Metrica
                  rotulo="Queda poco"
                  valor={resumen.porAgotar.toLocaleString("es-CO")}
                  pie="Conviene reponer"
                  alerta={resumen.porAgotar > 0}
                />
                <Metrica
                  rotulo="Agotados"
                  valor={resumen.agotados.toLocaleString("es-CO")}
                  pie="Sin existencias"
                  alerta={resumen.agotados > 0}
                />
              </div>
            </CardBody>
          </Card>

          {/* ── Barra de acciones ───────────────────────────────────────────── */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <SearchInput
              value={consulta}
              placeholder="Buscar por nombre, código o categoría…"
              className="sm:flex-1"
              onChange={(e) => {
                setConsulta(e.target.value);
                setPagina(0);
              }}
              onClear={() => {
                setConsulta("");
                setPagina(0);
              }}
            />
            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                variant="outline"
                startIcon={<AdjustmentsHorizontalIcon className="h-4 w-4" />}
                onClick={() => setFiltrosAbiertos((v) => !v)}
                aria-expanded={filtrosAbiertos}
              >
                {filtrosPuestos > 0 ? `Filtros (${filtrosPuestos})` : "Filtros"}
              </Button>
              <Button
                variant="outline"
                startIcon={<DownloadIcon className="h-4 w-4" />}
                onClick={descargar}
                disabled={filas.length === 0}
              >
                Descargar lista
              </Button>
            </div>
          </div>

          {/* ── Filtros ─────────────────────────────────────────────────────── */}
          {filtrosAbiertos && (
            <div className="grid gap-4 rounded-xl bg-gray-50 p-4 sm:grid-cols-3 dark:bg-white/[0.02]">
              <Select
                key={`sede-${versionFiltros}`}
                aria-label="Filtrar por sede"
                options={opcionesSede}
                defaultValue={sede}
                onChange={(v) => {
                  setSede(v);
                  setPagina(0);
                }}
              />
              <Select
                key={`categoria-${versionFiltros}`}
                aria-label="Filtrar por categoría"
                options={opcionesCategoria}
                defaultValue={categoria}
                onChange={(v) => {
                  setCategoria(v);
                  setPagina(0);
                }}
              />
              <Select
                key={`estado-${versionFiltros}`}
                aria-label="Filtrar por estado"
                options={opcionesEstado}
                defaultValue={semaforo}
                onChange={(v) => {
                  setSemaforo(v);
                  setPagina(0);
                }}
              />
              {hayFiltro && (
                <div className="sm:col-span-3">
                  <Button variant="ghost" size="sm" onClick={quitarFiltros}>
                    Quitar los filtros
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* ── Tabla o Sin Resultados de Búsqueda ───────────────────────────── */}
          {filas.length === 0 ? (
            <SinResultados
              titulo="Sin resultados"
              detalle="Prueba con otras palabras o quita los filtros."
              accion={
                <Button variant="outline" onClick={quitarFiltros}>
                  Quitar los filtros
                </Button>
              }
            />
          ) : (
            <Card className="p-0 sm:p-0">
              <CardHeader>
                <CardTitle className="mb-0">
                  Todos los productos
                  {hayFiltro && (
                    <span className="ml-2 font-normal text-gray-500 text-theme-sm dark:text-gray-400">
                      {filas.length === 1 ? "1 coincide" : `${filas.length} coinciden`}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>

              <CardBody className="p-0 sm:p-0">
                <ProductosTabla
                  filas={visibles}
                  hoy={hoy}
                  sedeFiltrada={sedeFiltrada}
                  onAbrir={(id) => navigate(`/inventarios/productos/${id}`)}
                />
              </CardBody>

              {paginas > 1 && (
                <div className="flex items-center justify-between gap-3 border-t border-gray-200 px-5 py-3.5 sm:px-6 dark:border-gray-800">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagina(paginaActual - 1)}
                    disabled={paginaActual === 0}
                  >
                    Anterior
                  </Button>
                  <p className="text-gray-500 text-theme-xs dark:text-gray-400">
                    Página {paginaActual + 1} de {paginas}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagina(paginaActual + 1)}
                    disabled={paginaActual >= paginas - 1}
                  >
                    Siguiente
                  </Button>
                </div>
              )}
            </Card>
          )}
        </>
      )}

      <ModalProducto
        abierto={modalAbierto}
        onCerrar={() => setModalAbierto(false)}
        producto={null}
        categorias={productosStore.categorias}
        soloLectura={!puedeEditar}
        onGuardar={(datos) => productosStore.crearProducto(datos)}
      />
    </ContenedorPagina>
  );
});

/**
 * Una columna del resumen.
 *
 * ── El rótulo va en gris, y costó una captura descubrirlo ─────────────────
 *
 * Iba en `brand-700`, que sobre el blanco mide 5,95:1 y pasa AA. Pero el paso
 * 700 del naranja es **rojo ladrillo**: con los cuatro rótulos en ese color, la
 * tarjeta entera se leía como si todo fueran errores, que es lo contrario de lo
 * que un resumen debe transmitir. Ya está documentado en la memoria del
 * proyecto como un problema conocido de la rampa.
 *
 * En gris, la jerarquía queda: rótulo callado · cifra en la tinta de títulos ·
 * pie callado. El único acento lo lleva el pie de las métricas que piden acción.
 *
 * `alerta` **no** pinta la cifra en rojo: el número de agotados es un dato, no
 * un error. Lo que cambia es el pie.
 */
function Metrica({
  rotulo,
  valor,
  pie,
  alerta = false,
}: {
  rotulo: string;
  valor: string;
  pie: string;
  alerta?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="text-theme-xs font-medium text-gray-500 dark:text-gray-400">
        {rotulo}
      </p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-ink-title dark:text-white">
        {valor}
      </p>
      <p
        className={cn(
          "mt-0.5 truncate text-theme-xs",
          alerta
            ? "font-semibold text-ink-title dark:text-white"
            : "text-gray-500 dark:text-gray-400",
        )}
      >
        {pie}
      </p>
    </div>
  );
}
