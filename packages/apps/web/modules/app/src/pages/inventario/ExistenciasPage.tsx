import { useMemo, useState } from "react";
import { observer } from "mobx-react-lite";

import { PageMeta } from "@/shell/meta";
import { Alert } from "@/elements/ui/alert";
import { Button } from "@/elements/ui/button";
import { Card } from "@/elements/ui/card";
import { Modal } from "@/elements/ui/modal";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/elements/ui/table";
import { Input } from "@/elements/form/input";
import { Label } from "@/elements/form/label";
import { Select } from "@/elements/form/select";
import {
  inventarioStore,
  motivoSinPermiso,
  puede,
  UNIDAD_MEDIDA_LABEL,
  UNIDADES_MEDIDA,
  type Articulo,
  type EstadoStock,
  type UnidadMedida,
} from "@/stores";
import {
  cantidad,
  etiquetaVariante,
  filtrarArticulos,
  money,
  tieneVariantes,
} from "./inventario.utils";
import { CabeceraPagina, EstadoBadge, SinResultados } from "./inventario.widgets";

// ═══════════════════════════════════════════════════════════════════════════
// EXISTENCIAS — el catálogo con lo que hay de cada cosa
// ═══════════════════════════════════════════════════════════════════════════
//
// Es la pantalla que responde «¿qué tengo, dónde y cuánto me costó?» para TODOS
// los artículos, con filtros. El panel de llegada responde a la misma pregunta
// pero solo para lo que exige atención.
//
// ── Dos decisiones de lectura ─────────────────────────────────────────────
//
// 1. **El selector de bodega cambia la columna de existencia, no la lista.** Un
//    artículo agotado en una bodega sigue siendo un artículo: filtrar la lista
//    por bodega escondería justo lo que hay que ver (que no está). La columna
//    dice de dónde es el número, y se rotula en el encabezado.
// 2. **Las variantes se despliegan, no se suman en silencio.** Un artículo con
//    tallas enseña su total y, al desplegarlo, el desglose real. Enseñar solo el
//    total haría creer que hay 4 camisetas M cuando puede haber 0.
//
// ── Escritura ─────────────────────────────────────────────────────────────
//
// Alta y baja de artículos exigen `inventory.manage`. Los controles se muestran
// deshabilitados con el motivo en vez de ocultarse: quien despacha mercancía
// necesita saber que existe un catálogo que alguien más administra, no creer que
// el módulo no lo tiene.

/**
 * Centinela de «sin filtro» para los tres selectores (categoría, bodega, estado).
 *
 * Es UNO solo, y no un valor por filtro, porque los tres viven en el mismo
 * formulario y dos centinelas distintos que debieran coincidir acaban
 * divergiendo: alguien cambia uno y el otro filtro deja de reconocer el suyo en
 * silencio.
 *
 * ── La regla que este valor obliga a recordar (21/09) ──────────────────────
 * **Un centinela de UI no puede llegar crudo a una función pura.** `"__todas__"`
 * es una cadena *truthy*, y `filtrarArticulos` interpreta «hay categoría» como
 * «filtra por ella»: comparaba `"Ropa" !== "__todas__"` y descartaba el catálogo
 * entero. La pantalla mostraba «0 de 8 artículos» y «Ningún artículo coincide»
 * con los filtros vacíos.
 *
 * No lo vio nadie porque la función está probada con `categoria: null` y con
 * categorías reales, nunca con el centinela de la superficie: el defecto vivía en
 * la costura entre las dos capas, que es justo donde no mira ningún test unitario.
 * Lo cazó el arnés de navegador. Por eso el centinela se traduce a `null` en el
 * borde (`categoriaSel`, `bodegaSel`) y no dentro de la utilidad, que es pura y no
 * debe conocer vocabulario de UI.
 */
const TODAS = "__todas__";

interface BorradorArticulo {
  sku: string;
  nombre: string;
  categoria: string;
  unidad: UnidadMedida;
  minimo: string;
  costoUnitario: string;
}

const borradorVacio = (unidad: UnidadMedida): BorradorArticulo => ({
  sku: "",
  nombre: "",
  categoria: "",
  unidad,
  minimo: "",
  costoUnitario: "",
});

export const ExistenciasPage = observer(() => {
  // ── Filtros (estado de la superficie, no del dominio) ──
  const [texto, setTexto] = useState("");
  const [categoria, setCategoria] = useState<string>(TODAS);
  const [bodegaId, setBodegaId] = useState<string>(TODAS);
  const [estado, setEstado] = useState<EstadoStock | typeof TODAS>(TODAS);
  const [desplegados, setDesplegados] = useState<ReadonlySet<string>>(new Set());

  // ── Modales ──
  const [creando, setCreando] = useState(false);
  const [borrador, setBorrador] = useState<BorradorArticulo>(() =>
    borradorVacio(inventarioStore.config.unidadPorDefecto),
  );
  const [errorAlta, setErrorAlta] = useState<string | null>(null);
  const [porEliminar, setPorEliminar] = useState<Articulo | null>(null);
  const [errorBaja, setErrorBaja] = useState<string | null>(null);

  // ── Autorización ──
  const puedeAdministrar = puede("inventory.manage");
  const motivoAdministrar = motivoSinPermiso("inventory.manage");

  const bodegas = inventarioStore.bodegas;
  const bodegaSel = bodegaId === TODAS ? null : inventarioStore.bodegaPorId(bodegaId);

  /**
   * La categoría elegida, YA TRADUCIDA: `null` cuando el selector está en
   * «Todas las categorías».
   *
   * Sin esta línea, `"__todas__"` llega a `filtrarArticulos`, que lo lee como una
   * categoría real y descarta el catálogo entero. Ver el docblock de `TODAS`.
   */
  const categoriaSel = categoria === TODAS ? null : categoria;

  /**
   * Existencia del artículo **en el ámbito elegido**: la bodega seleccionada o el
   * total. Es una función, no un mapa: calcular las existencias de todo el
   * catálogo antes de filtrar haría trabajo para las filas que se descartan.
   */
  const existenciaEnAmbito = (articuloId: string) =>
    bodegaSel
      ? inventarioStore.existenciaDe(articuloId, bodegaSel.id)
      : inventarioStore.existenciaTotal(articuloId);

  const filas = useMemo(() => {
    const base = filtrarArticulos(inventarioStore.articulos, {
      texto,
      categoria: categoriaSel,
    });
    if (estado === TODAS) return base;
    return base.filter((a) => inventarioStore.estadoDe(a.id) === estado);
    // `inventarioStore.articulos` y los filtros son las dependencias reales. El
    // store es observable, así que MobX re-ejecuta al registrar un movimiento.
  }, [texto, categoriaSel, estado, inventarioStore.articulos, inventarioStore.movimientos]);

  const valorFiltrado = filas.reduce(
    (acc, a) => acc + existenciaEnAmbito(a.id) * a.costoUnitario,
    0,
  );

  const toggleDespliegue = (id: string) => {
    setDesplegados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ── Alta ──
  const abrirAlta = () => {
    setBorrador(borradorVacio(inventarioStore.config.unidadPorDefecto));
    setErrorAlta(null);
    setCreando(true);
  };

  const confirmarAlta = () => {
    const minimo = Number(borrador.minimo);
    const costo = Number(borrador.costoUnitario);
    // La validación de forma es de la superficie; la de unicidad de SKU es del
    // store, que es quien conoce el catálogo. Ninguna de las dos se duplica.
    if (!borrador.sku.trim() || !borrador.nombre.trim() || !borrador.categoria.trim()) {
      setErrorAlta("SKU, nombre y categoría son obligatorios.");
      return;
    }
    if (!Number.isFinite(minimo) || minimo < 0 || !Number.isFinite(costo) || costo < 0) {
      setErrorAlta("El mínimo y el costo deben ser números iguales o mayores que cero.");
      return;
    }

    const res = inventarioStore.crearArticulo({
      sku: borrador.sku.trim(),
      nombre: borrador.nombre.trim(),
      categoria: borrador.categoria.trim(),
      unidad: borrador.unidad,
      minimo,
      costoUnitario: costo,
    });

    if (!res.ok) {
      setErrorAlta(res.motivo);
      return;
    }
    setCreando(false);
  };

  // ── Baja ──
  const confirmarBaja = () => {
    if (!porEliminar) return;
    const res = inventarioStore.eliminarArticulo(porEliminar.id);
    if (!res.ok) {
      setErrorBaja(res.motivo);
      return;
    }
    setPorEliminar(null);
    setErrorBaja(null);
  };

  const opcionesCategoria = [
    { value: TODAS, label: "Todas las categorías" },
    ...inventarioStore.categorias.map((c) => ({ value: c, label: c })),
  ];

  const opcionesBodega = [
    { value: TODAS, label: "Todas las bodegas (total)" },
    ...bodegas.map((b) => ({ value: b.id, label: b.nombre })),
  ];

  const opcionesEstado = [
    { value: TODAS, label: "Todos los estados" },
    { value: "agotado", label: "Agotados" },
    { value: "bajo_minimo", label: "Bajo mínimo" },
    { value: "ok", label: "Disponibles" },
  ];

  const rotuloExistencia = bodegaSel ? `Existencia · ${bodegaSel.nombre}` : "Existencia total";

  return (
    <>
      <PageMeta title="Inventario · Existencias" description="Catálogo y existencias por bodega" />

      <CabeceraPagina
        titulo="Existencias"
        descripcion="Todos los artículos con lo que hay de cada uno. Las existencias se derivan del kárdex."
        acciones={
          <Button onClick={abrirAlta} disabled={!puedeAdministrar}>
            Nuevo artículo
          </Button>
        }
      />

      {!puedeAdministrar && (
        <div className="mb-6">
          <Alert
            variant="info"
            title="Catálogo en solo lectura"
            message={`Puedes consultar existencias y kárdex, pero no dar de alta ni de baja artículos. ${motivoAdministrar}`}
          />
        </div>
      )}

      {/* ── Filtros ───────────────────────────────────────────────────────── */}
      <Card className="p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <Label htmlFor="inv-buscar">Buscar</Label>
            <div className="mt-1.5">
              <Input
                id="inv-buscar"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Nombre o SKU"
                aria-label="Buscar artículo por nombre o SKU"
              />
            </div>
          </div>
          <div>
            <Label>Categoría</Label>
            <div className="mt-1.5">
              <Select
                key={`cat-${categoria}-${inventarioStore.categorias.join("|")}`}
                options={opcionesCategoria}
                defaultValue={categoria}
                onChange={setCategoria}
                aria-label="Filtrar por categoría"
              />
            </div>
          </div>
          <div>
            <Label>Bodega</Label>
            <div className="mt-1.5">
              <Select
                key={`bod-${bodegaId}-${bodegas.map((b) => b.id).join("|")}`}
                options={opcionesBodega}
                defaultValue={bodegaId}
                onChange={setBodegaId}
                aria-label="Bodega de la que se muestra la existencia"
              />
            </div>
          </div>
          <div>
            <Label>Estado</Label>
            <div className="mt-1.5">
              <Select
                key={`est-${estado}`}
                options={opcionesEstado}
                defaultValue={estado}
                onChange={(v) => setEstado(v as EstadoStock | typeof TODAS)}
                aria-label="Filtrar por estado de existencias"
              />
            </div>
          </div>
        </div>

        <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          {filas.length} de {inventarioStore.totalArticulos} artículos · valor a costo del filtro:{" "}
          <span className="font-medium tabular-nums text-gray-700 dark:text-gray-300">
            {money(valorFiltrado)}
          </span>
        </p>
      </Card>

      {/* ── Tabla ─────────────────────────────────────────────────────────── */}
      <div className="mt-6">
        <Card className="p-5">
          {filas.length === 0 ? (
            <SinResultados
              titulo="Ningún artículo coincide"
              mensaje="Prueba con otro texto, otra categoría u otro estado. Los filtros se combinan: basta con que uno no encaje para que la fila desaparezca."
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableCell header>Artículo</TableCell>
                    <TableCell header>SKU</TableCell>
                    <TableCell header>Categoría</TableCell>
                    <TableCell header className="text-right">{rotuloExistencia}</TableCell>
                    <TableCell header className="text-right">Mínimo</TableCell>
                    <TableCell header>Estado</TableCell>
                    <TableCell header className="text-right">Valor</TableCell>
                    <TableCell header className="text-right">Acciones</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filas.map((a) => {
                    const abierto = desplegados.has(a.id);
                    const variantes = inventarioStore.existenciasPorVariante(a.id);
                    const existencia = existenciaEnAmbito(a.id);

                    return (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium text-gray-800 dark:text-white/90">
                          <span className="flex items-start gap-2">
                            {tieneVariantes(a) && (
                              <button
                                type="button"
                                onClick={() => toggleDespliegue(a.id)}
                                aria-expanded={abierto}
                                aria-label={`${abierto ? "Ocultar" : "Ver"} variantes de ${a.nombre}`}
                                className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border border-gray-200 text-xs text-gray-500 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/[0.03]"
                              >
                                {abierto ? "−" : "+"}
                              </button>
                            )}
                            <span className="min-w-0">
                              {a.nombre}

                              {/* Desglose por variante, DENTRO de la celda.
                                  No como filas hijas: `TableCell` del catálogo no
                                  admite `colSpan`, y una fila con seis celdas
                                  vacías se lee como una fila rota.

                                  Se listan TODAS las variantes, incluidas las que
                                  están a cero: esconder la talla agotada es
                                  esconder justo la que hay que reponer. */}
                              {abierto && variantes.length > 0 && (
                                <ul className="mt-2 space-y-1">
                                  {variantes.map((v) => (
                                    <li
                                      key={`${a.id}-${v.variante}`}
                                      className="flex flex-wrap items-center gap-2 text-xs font-normal text-gray-500 dark:text-gray-400"
                                    >
                                      <span className="min-w-10 font-medium text-gray-600 dark:text-gray-300">
                                        {etiquetaVariante(v.variante)}
                                      </span>
                                      <span className="tabular-nums">
                                        {cantidad(v.cantidad, a.unidad)}
                                      </span>
                                      <EstadoBadge
                                        estado={inventarioStore.estadoDeVariante(a.id, v.variante)}
                                      />
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </span>
                          </span>
                        </TableCell>
                        <TableCell className="tabular-nums text-gray-500 dark:text-gray-400">
                          {a.sku}
                        </TableCell>
                        <TableCell className="text-gray-500 dark:text-gray-400">
                          {a.categoria}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-gray-800 dark:text-white/90">
                          {cantidad(existencia, a.unidad)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-gray-500 dark:text-gray-400">
                          {cantidad(a.minimo, a.unidad)}
                        </TableCell>
                        <TableCell>
                          <EstadoBadge estado={inventarioStore.estadoDe(a.id)} />
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-gray-500 dark:text-gray-400">
                          {money(existencia * a.costoUnitario)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={!puedeAdministrar}
                            onClick={() => {
                              setErrorBaja(null);
                              setPorEliminar(a);
                            }}
                          >
                            Eliminar
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>

      {/* ── Modal de alta ─────────────────────────────────────────────────── */}
      <Modal
        isOpen={creando}
        onClose={() => setCreando(false)}
        className="max-w-lg rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900"
      >
        <h2 className="text-lg font-semibold text-ink-title dark:text-white/90">Nuevo artículo</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          El artículo nace sin existencia: lo que hay se registra con movimientos del kárdex, no
          con un campo en la ficha.
        </p>

        <div className="mt-5 flex flex-col gap-4">
          <div>
            <Label htmlFor="alta-sku">SKU</Label>
            <div className="mt-1.5">
              <Input
                id="alta-sku"
                value={borrador.sku}
                onChange={(e) => setBorrador((p) => ({ ...p, sku: e.target.value }))}
                placeholder="SKU-1001"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="alta-nombre">Nombre</Label>
            <div className="mt-1.5">
              <Input
                id="alta-nombre"
                value={borrador.nombre}
                onChange={(e) => setBorrador((p) => ({ ...p, nombre: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="alta-categoria">Categoría</Label>
            <div className="mt-1.5">
              <Input
                id="alta-categoria"
                value={borrador.categoria}
                onChange={(e) => setBorrador((p) => ({ ...p, categoria: e.target.value }))}
                placeholder="Ropa, Insumos, Empaques…"
              />
            </div>
          </div>
          <div>
            <Label>Unidad de medida</Label>
            <div className="mt-1.5">
              <Select
                key={`unidad-${borrador.unidad}`}
                options={UNIDADES_MEDIDA.map((u) => ({ value: u, label: UNIDAD_MEDIDA_LABEL[u] }))}
                defaultValue={borrador.unidad}
                onChange={(v) => setBorrador((p) => ({ ...p, unidad: v as UnidadMedida }))}
                aria-label="Unidad de medida del artículo"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="alta-minimo">Punto de reorden</Label>
              <div className="mt-1.5">
                <Input
                  id="alta-minimo"
                  type="number"
                  value={borrador.minimo}
                  onChange={(e) => setBorrador((p) => ({ ...p, minimo: e.target.value }))}
                  placeholder="0"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="alta-costo">Costo unitario</Label>
              <div className="mt-1.5">
                <Input
                  id="alta-costo"
                  type="number"
                  value={borrador.costoUnitario}
                  onChange={(e) => setBorrador((p) => ({ ...p, costoUnitario: e.target.value }))}
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {errorAlta && (
            <Alert variant="error" title="No se pudo dar de alta" message={errorAlta} />
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setCreando(false)}>
            Cancelar
          </Button>
          <Button onClick={confirmarAlta}>Crear artículo</Button>
        </div>
      </Modal>

      {/* ── Modal de baja ─────────────────────────────────────────────────── */}
      <Modal
        isOpen={porEliminar !== null}
        onClose={() => setPorEliminar(null)}
        className="max-w-md rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900"
      >
        <h2 className="text-lg font-semibold text-ink-title dark:text-white/90">
          Eliminar artículo
        </h2>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Vas a eliminar <span className="font-medium text-gray-700 dark:text-gray-300">{porEliminar?.nombre}</span>{" "}
          ({porEliminar?.sku}). Un artículo con movimientos en el kárdex no se puede eliminar: su
          historial es la única explicación de por qué hay lo que hay.
        </p>

        {errorBaja && (
          <div className="mt-4">
            <Alert variant="error" title="No se pudo eliminar" message={errorBaja} />
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setPorEliminar(null)}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={confirmarBaja}>
            Eliminar
          </Button>
        </div>
      </Modal>
    </>
  );
});

export default ExistenciasPage;
