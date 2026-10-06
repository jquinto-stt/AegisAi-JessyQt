import { useMemo, useState } from "react";
import { observer } from "mobx-react-lite";

import { Button } from "@/elements/ui/button";
import { Modal } from "@/elements/ui/modal";
import { Checkbox } from "@/elements/form/checkbox";
import { Input } from "@/elements/form/input";
import { SearchInput } from "@/elements";
import { Select } from "@/elements/form/select";
import { Badge } from "@/elements/ui/badge";
import { Alert } from "@/elements/ui/alert";
import { PlusIcon } from "@/icons";
import { inventariosStore, type Elemento, type UnidadElemento } from "@/stores";
import { cn } from "@/utils";
import { OPCIONES_UNIDAD, UNIDAD_META } from "./inventarios.constants";
import { buscarCoincidencia } from "./inventarios.presentacion";

// ═══════════════════════════════════════════════════════════════════════════
// MODAL — AGREGAR ELEMENTOS AL CONTEO
// ═══════════════════════════════════════════════════════════════════════════
//
// ── Por qué esta pieza merece su propio archivo ────────────────────────────
//
// Es el flujo que el usuario señaló como ausente en la primera propuesta, y con
// razón: sin él no hay conteo. Cargar los elementos que *deberían* estar en la
// ubicación es el paso previo a contar, y es lo que después permite comparar.
//
// ── Las tres cosas que este modal NO hace ──────────────────────────────────
//
// 1. **No deja escribir una cantidad.** Cargar y contar son actos distintos:
//    aquí se declara «este elemento pertenece a esta ubicación». Si además
//    dejara contar, la mitad de los conteos se harían desde un formulario y la
//    línea perdería su `contadaEn` real.
// 2. **No permite cambiar la ubicación.** R3: la ubicación es un hecho del
//    conteo, no un campo de la línea. Cambiarla a mitad invalidaría la esperada
//    congelada.
// 3. **No esconde lo que ya está dentro.** Los elementos ya incluidos aparecen
//    con su check deshabilitado y la etiqueta «Ya incluido», en vez de
//    desaparecer de la lista: si desaparecieran, buscar un elemento y no
//    encontrarlo se leería como «no existe en el catálogo».
//
// ── El alta rápida: por qué está AQUÍ y no solo en el catálogo ─────────────
//
// Antes, cuando lo que se quería contar no existía, el modal decía «créalo desde
// Elementos» y **ahí se acababa el camino**. Dos defectos reales:
//
//   a) Si el perfil no tiene `inventory.manage`, el botón «Nuevo elemento» del
//      catálogo NO EXISTE. El modal mandaba a una pantalla donde no había nada
//      que pulsar, sin decir por qué. Un callejón sin salida disfrazado de
//      instrucción.
//   b) Obligaba a abandonar el conteo —perdiendo filtro, búsqueda y selección—
//      para crear el elemento, volver y empezar de nuevo. Es el caso NORMAL al
//      cargar un conteo: casi siempre hay algo que el catálogo todavía no tiene.
//
// Por eso el alta vive dentro del modal: se crea, se marca y se agrega **en un
// solo acto**, sin salir. No es una comodidad, es el flujo principal.
//
// La capacidad que lo gobierna se recibe como prop (`puedeCrear`), no se lee
// aquí: el store no conoce permisos y esta capa tampoco debe inventarlos. Si no
// se puede crear, el botón no se pinta y la nota explica qué falta — deshabilitar
// y callar sería la misma mentira que el enlace al vacío de antes.

export const ModalAgregarElemento = observer(function ModalAgregarElemento({
  abierto,
  inventarioId,
  onCerrar,
  actorId,
  puedeCrear,
}: {
  abierto: boolean;
  inventarioId: string;
  onCerrar: () => void;
  actorId: string;
  /** `inventory.manage`. Decide si se ofrece el alta rápida y si se explaya el motivo. */
  puedeCrear: boolean;
}) {
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [consulta, setConsulta] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("__todas__");
  const [error, setError] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);

  // `elementosAgregables` ya excluye inactivos y los que están en el conteo.
  // Los «ya incluidos» se obtienen aparte para poder pintarlos en su sitio.
  const agregables = inventariosStore.elementosAgregables(inventarioId);
  const yaEn = inventariosStore.elementosYaEn(inventarioId);
  const inactivos = useMemo(
    () => inventariosStore.elementos.filter((e) => e.estado === "inactivo"),
    [inventariosStore.elementos.length],
  );

  const categorias = useMemo(() => {
    const set = new Set<string>();
    for (const e of agregables) set.add(e.categoria);
    return [
      { value: "__todas__", label: "Todas las categorías" },
      ...[...set].sort((a, b) => a.localeCompare(b, "es")).map((c) => ({ value: c, label: c })),
    ];
  }, [agregables]);

  const visibles = useMemo(
    () =>
      agregables.filter((e) => {
        if (filtroCategoria !== "__todas__" && e.categoria !== filtroCategoria) return false;
        return buscarCoincidencia(consulta, e.codigo, e.nombre, e.categoria);
      }),
    [agregables, consulta, filtroCategoria],
  );

  function alternar(id: string) {
    setSeleccion((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setError(null);
  }

  /** Agrega los ids marcados. Devuelve el motivo si falló, o `null` si fue bien. */
  function agregar(ids: readonly string[]): string | null {
    const r = inventariosStore.agregarLineas(
      inventarioId,
      ids.map((elementoId) => ({ elementoId })),
      actorId,
    );
    return r.ok ? null : r.motivo ?? "No se pudieron agregar los elementos";
  }

  function confirmar() {
    if (seleccion.size === 0) {
      setError("Selecciona al menos un elemento");
      return;
    }
    const motivo = agregar([...seleccion]);
    if (motivo) {
      setError(motivo);
      return;
    }
    limpiar();
    onCerrar();
  }

  /**
   * Alta rápida: crea el elemento y lo agrega al conteo en el mismo gesto.
   *
   * El orden importa. Se crea PRIMERO y se agrega DESPUÉS, con el id que
   * devuelve `crearElemento`. Si se agregara antes de conocer el id no habría
   * nada que agregar; y si el alta falla —código repetido— no se agrega nada,
   * así que no queda una línea huérfana ni un elemento a medias.
   */
  function crearYAgregar(datos: {
    codigo: string;
    nombre: string;
    categoria: string;
    unidad: UnidadElemento;
  }): string | null {
    const alta = inventariosStore.crearElemento(datos);
    if (!alta.ok || !alta.ids?.[0]) {
      return alta.motivo ?? "No se pudo crear el elemento";
    }
    return agregar([alta.ids[0]]);
  }

  function limpiar() {
    setSeleccion(new Set());
    setConsulta("");
    setFiltroCategoria("__todas__");
    setError(null);
    setCreando(false);
  }

  function cerrar() {
    limpiar();
    onCerrar();
  }

  return (
    <Modal isOpen={abierto} onClose={cerrar} className="max-w-2xl p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-ink-title dark:text-white">Agregar productos al conteo</h2>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Selecciona los productos que vas a verificar físicamente en esta ubicación.
          </p>
        </div>

        {puedeCrear && (
          <Button
            size="sm"
            variant={creando ? "outline" : "primary"}
            startIcon={<PlusIcon className="h-4 w-4" />}
            onClick={() => {
              setCreando((v) => !v);
              setError(null);
            }}
          >
            {creando ? "Cancelar" : "Nuevo producto"}
          </Button>
        )}
      </div>

      {/* ── Alta rápida ───────────────────────────────────────────────── */}
      {creando && puedeCrear && (
        <FormularioAltaRapida
          onCrear={crearYAgregar}
          onExito={() => {
            setCreando(false);
            setError(null);
          }}
        />
      )}

      {/* ── Filtros ───────────────────────────────────────────────────── */}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <SearchInput
          value={consulta}
          onChange={(e) => setConsulta(e.target.value)}
          onClear={() => setConsulta("")}
          placeholder="Buscar por código, nombre o categoría…"
          className="sm:flex-1"
          aria-label="Buscar elementos"
        />
        <div className="w-full sm:w-48">
          <Select options={categorias} defaultValue={filtroCategoria} onChange={setFiltroCategoria} />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {visibles.length} {visibles.length === 1 ? "disponible" : "disponibles"} ·{" "}
          {seleccion.size} {seleccion.size === 1 ? "seleccionado" : "seleccionados"}
        </span>
        {visibles.length > 0 && (
          <button
            type="button"
            onClick={() =>
              setSeleccion((prev) => {
                const next = new Set(prev);
                const todos = visibles.every((e) => next.has(e.id));
                for (const e of visibles) {
                  if (todos) next.delete(e.id);
                  else next.add(e.id);
                }
                return next;
              })
            }
            className="text-xs font-medium text-brand-500 hover:text-brand-500 dark:text-brand-400"
          >
            {visibles.every((e) => seleccion.has(e.id)) ? "Quitar todos" : "Seleccionar todos los visibles"}
          </button>
        )}
      </div>

      {/* ── Lista ─────────────────────────────────────────────────────── */}
      <div className="mt-2 max-h-[22rem] overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-800">
        {visibles.length === 0 ? (
          // El vacío se explica según por qué está vacío: catálogo agotado,
          // filtro sin coincidencias, o búsqueda sin resultados. Un «sin
          // resultados» genérico obliga al usuario a adivinar cuál de los tres.
          //
          // Y la salida del vacío es un BOTÓN, no una instrucción: mandar a
          // «créalo desde Elementos» cuando el botón de allí puede no existir
          // era el callejón sin salida que este arreglo cierra.
          <div className="px-4 py-10 text-center">
            <p className="text-sm font-medium text-ink-body dark:text-gray-300">
              {agregables.length === 0
                ? "Todos los elementos activos ya están en este conteo"
                : "Ningún elemento coincide con el filtro"}
            </p>
            <p className="mx-auto mt-1 max-w-sm text-xs text-gray-500 dark:text-gray-400">
              {agregables.length === 0
                ? "Si lo que buscas no está en el catálogo, créalo aquí mismo y quedará agregado a este conteo."
                : "Prueba con otra categoría o borra la búsqueda."}
            </p>
            {agregables.length === 0 && puedeCrear && (
              <Button
                size="sm"
                className="mt-4"
                startIcon={<PlusIcon className="h-4 w-4" />}
                onClick={() => setCreando(true)}
              >
                Crear elemento
              </Button>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {visibles.map((e) => (
              <FilaSeleccionable
                key={e.id}
                elemento={e}
                marcado={seleccion.has(e.id)}
                onToggle={() => alternar(e.id)}
              />
            ))}
          </ul>
        )}
      </div>

      {/* ── Ya incluidos ──────────────────────────────────────────────── */}
      {yaEn.size > 0 && (
        <div className="mt-3">
          <p className="text-[11px] font-medium uppercase tracking-wider text-gray-600 dark:text-gray-400">
            Ya en este conteo · {yaEn.size}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {[...yaEn].slice(0, 24).map((id) => (
              <Badge key={id} color="light" size="xs">
                {inventariosStore.nombreDeElemento(id)}
              </Badge>
            ))}
            {yaEn.size > 24 && (
              <Badge key="resto" color="light" size="xs">
                +{yaEn.size - 24} más
              </Badge>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="mt-3">
          <Alert variant="error" title="No se pudo agregar" message={error} />
        </div>
      )}

      <div className="mt-5 flex items-center justify-end gap-3 border-t border-gray-200 pt-4 dark:border-gray-800">
        <Button variant="outline" onClick={cerrar}>
          Cancelar
        </Button>
        <Button onClick={confirmar} disabled={seleccion.size === 0}>
          Agregar {seleccion.size > 0 ? `(${seleccion.size})` : ""}
        </Button>
      </div>
    </Modal>
  );
});

// ── Alta rápida ───────────────────────────────────────────────────────────

/**
 * Formulario de alta dentro del propio modal de agregar.
 *
 * **Tres campos, no seis.** Es un alta de paso, no la ficha completa: `nombre`,
 * `codigo`, `unidad`. La categoría y la descripción se pueden completar después
 * desde el catálogo, y pedirlas aquí convertiría un gesto de dos segundos en un
 * formulario que la gente rellena mal o abandona. Los tres que se piden son los
 * que el conteo necesita para que la línea diga algo.
 *
 * El formulario **no se cierra al crear**: se limpia y se deja abierto, porque
 * quien está cargando un conteo casi nunca crea un solo elemento. Cerrarlo
 * obligaría a reabrirlo con cada uno.
 */
function FormularioAltaRapida({
  onCrear,
  onExito,
}: {
  onCrear: (datos: {
    codigo: string;
    nombre: string;
    categoria: string;
    unidad: UnidadElemento;
  }) => string | null;
  onExito: () => void;
}) {
  const [nombre, setNombre] = useState("");
  const [codigo, setCodigo] = useState("");
  const [unidad, setUnidad] = useState<UnidadElemento>(inventariosStore.config.unidadPorDefecto);
  const [error, setError] = useState<string | null>(null);

  const valido = nombre.trim().length > 0 && codigo.trim().length > 0;

  function enviar() {
    const motivo = onCrear({ codigo, nombre, categoria: "", unidad });
    if (motivo) {
      setError(motivo);
      return;
    }
    // Se limpia para el siguiente. El foco no se toca a propósito: el navegador
    // lo deja donde estaba y quien escribe en serie no pierde el sitio.
    setNombre("");
    setCodigo("");
    setError(null);
    onExito();
  }

  return (
    <form
      className="mt-4 rounded-xl border border-brand-200 bg-brand-50/50 p-4 dark:border-brand-500/30 dark:bg-brand-500/[0.06]"
      onSubmit={(e) => {
        e.preventDefault();
        enviar();
      }}
    >
      <p className="text-xs font-semibold text-ink-title dark:text-white">Nuevo elemento</p>
      <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
        Se crea en el catálogo y se agrega a este conteo en un solo paso. La categoría y la descripción se
        completan después desde Elementos.
      </p>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <div className="w-full sm:w-36">
          <Input
            value={codigo}
            onChange={(e) => {
              setCodigo(e.target.value);
              setError(null);
            }}
            placeholder="Código"
            aria-label="Código del elemento"
          />
        </div>
        <div className="w-full sm:flex-1">
          <Input
            value={nombre}
            onChange={(e) => {
              setNombre(e.target.value);
              setError(null);
            }}
            placeholder="Nombre del elemento"
            aria-label="Nombre del elemento"
          />
        </div>
        <div className="w-full sm:w-40">
          <Select
            options={OPCIONES_UNIDAD}
            defaultValue={unidad}
            onChange={(v) => setUnidad(v as UnidadElemento)}
            aria-label="Unidad del elemento"
          />
        </div>
        <Button type="submit" disabled={!valido}>
          Crear y agregar
        </Button>
      </div>

      {error && (
        <div className="mt-2">
          <Alert variant="error" title="No se pudo crear" message={error} />
        </div>
      )}
    </form>
  );
}

// ── Fila de la lista ──────────────────────────────────────────────────────

function FilaSeleccionable({
  elemento,
  marcado,
  onToggle,
}: {
  elemento: Elemento;
  marcado: boolean;
  onToggle: () => void;
}) {
  return (
    <li>
      <label
        className={cn(
          "flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors",
          marcado ? "bg-brand-50/60 dark:bg-brand-500/[0.08]" : "hover:bg-gray-50 dark:hover:bg-white/[0.02]",
        )}
      >
        <Checkbox checked={marcado} onChange={onToggle} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="font-mono text-[11px] text-gray-600 dark:text-gray-400">{elemento.codigo}</span>
            <span className="truncate text-sm text-ink-title dark:text-gray-100">{elemento.nombre}</span>
          </span>
          <span className="mt-0.5 block truncate text-[11px] text-gray-500 dark:text-gray-400">
            {elemento.categoria || "Sin categoría"} · {UNIDAD_META[elemento.unidad].label}
            {elemento.descripcion ? ` · ${elemento.descripcion}` : ""}
          </span>
        </span>
      </label>
    </li>
  );
}

export default ModalAgregarElemento;
