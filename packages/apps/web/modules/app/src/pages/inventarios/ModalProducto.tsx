import { useEffect, useRef, useState } from "react";

import { Modal } from "@/elements/ui/modal";
import { Input } from "@/elements/form/input";
import { Select } from "@/elements/form/select";
import { Label } from "@/elements/form/label";
import { Button } from "@/elements/ui/button";
import { PlusIcon, BoxCubeIcon } from "@/icons";
import { cn } from "@/utils";

import type {
  Producto,
  UnidadMedida,
} from "@/domain/inventarios/productos.domain";
import type { DatosProducto, ResultadoGuardado } from "@/stores/productos.store";
import {
  MAX_BYTES_IMAGEN,
  OPCIONES_UNIDAD,
  TEXTO_SOLO_LECTURA,
} from "./productos.constants";

// ═══════════════════════════════════════════════════════════════════════════
// MODAL — Añadir / editar producto
// ═══════════════════════════════════════════════════════════════════════════
//
// ── Por qué la foto es un `<label>` con un `<input>` escondido ──────────────
//
// El catálogo de Elements tiene un `Dropzone`, pero **no está vendido en este
// proyecto y depende de `react-dropzone`**, que tampoco está instalado. Meterlo
// significaría añadir una dependencia npm para un solo campo — una decisión de
// alcance que no se toma de paso. Se conserva el patrón nativo, que además es
// el que el proyecto ya usa para subir archivos.
//
// El `<label>` que envuelve al `<input type="file">` es lo que hace que el
// control sea accesible sin `htmlFor`: al pulsarlo se abre el diálogo del
// sistema, y con el teclado el `<input>` sigue siendo enfocable.
//
// ── La validación la hace el STORE, no este componente ─────────────────────
//
// Aquí solo se muestra el motivo que devuelve `onGuardar`. Si el modal
// repitiera las reglas (código repetido, precio vacío…) habría dos sitios
// decidiendo lo mismo, y el día que cambie una el otro seguiría mintiendo.

const idCampo = (sufijo: string) => `producto-${sufijo}`;

interface Formulario {
  nombre: string;
  codigo: string;
  categoria: string;
  categoriaNueva: string;
  precioCompra: string;
  cantidadInicial: string;
  unidad: UnidadMedida;
  vencimiento: string;
  minimo: string;
  imagenDataUrl: string | null;
}

const VACIO: Formulario = {
  nombre: "",
  codigo: "",
  categoria: "",
  categoriaNueva: "",
  precioCompra: "",
  cantidadInicial: "",
  unidad: "unidad",
  vencimiento: "",
  minimo: "0",
  imagenDataUrl: null,
};

const NUEVA_CATEGORIA = "__nueva__";

function desdeProducto(p: Producto): Formulario {
  return {
    nombre: p.nombre,
    codigo: p.codigo,
    categoria: p.categoria,
    categoriaNueva: "",
    precioCompra: String(p.precioCompra),
    cantidadInicial: "",
    unidad: p.unidad,
    vencimiento: p.vencimiento ?? "",
    minimo: String(p.minimo),
    imagenDataUrl: p.imagenDataUrl,
  };
}

export function ModalProducto({
  abierto,
  onCerrar,
  producto,
  categorias,
  soloLectura,
  onGuardar,
}: {
  abierto: boolean;
  onCerrar: () => void;
  /** `null` = alta; un producto = edición. */
  producto: Producto | null;
  categorias: string[];
  soloLectura: boolean;
  onGuardar: (datos: DatosProducto) => ResultadoGuardado;
}) {
  const [form, setForm] = useState<Formulario>(VACIO);
  const [error, setError] = useState<string | null>(null);
  const inputArchivo = useRef<HTMLInputElement>(null);

  const esEdicion = producto !== null;

  // Al abrir, el formulario se rellena desde el producto (o se vacía). Se
  // resetea el error también: arrastrar el «código repetido» de la vez anterior
  // a una ficha distinta hace creer que el problema es del producto nuevo.
  useEffect(() => {
    if (!abierto) return;
    setForm(producto ? desdeProducto(producto) : VACIO);
    setError(null);
  }, [abierto, producto]);

  const campo = <K extends keyof Formulario>(clave: K, valor: Formulario[K]) =>
    setForm((prev) => ({ ...prev, [clave]: valor }));

  /**
   * Lee la foto elegida o arrastrada.
   *
   * El tamaño se comprueba **antes** de leer: leer 40 MB para luego descartarlos
   * congela la pestaña y el usuario no entiende por qué. El tope está declarado
   * en `MAX_BYTES_IMAGEN`.
   */
  function cargarArchivo(archivo: File | undefined) {
    if (!archivo) return;
    if (!archivo.type.startsWith("image/")) {
      setError("Ese archivo no es una imagen. Elige una foto (JPG, PNG o WebP).");
      return;
    }
    if (archivo.size > MAX_BYTES_IMAGEN) {
      const mb = Math.round(MAX_BYTES_IMAGEN / 1024 / 1024);
      setError(`La foto pesa demasiado. El máximo son ${mb} MB.`);
      return;
    }
    const lector = new FileReader();
    lector.onload = () => {
      setError(null);
      campo("imagenDataUrl", typeof lector.result === "string" ? lector.result : null);
    };
    lector.onerror = () => setError("No pudimos leer la foto. Inténtalo otra vez.");
    lector.readAsDataURL(archivo);
  }

  function guardar() {
    const categoria =
      form.categoria === NUEVA_CATEGORIA ? form.categoriaNueva : form.categoria;

    const resultado = onGuardar({
      nombre: form.nombre,
      codigo: form.codigo,
      categoria,
      precioCompra: form.precioCompra,
      cantidadInicial: esEdicion ? 0 : form.cantidadInicial,
      minimo: form.minimo,
      unidad: form.unidad,
      vencimiento: form.vencimiento.trim() === "" ? null : form.vencimiento,
      imagenDataUrl: form.imagenDataUrl,
    });

    if (!resultado.ok) {
      setError(resultado.motivo ?? "No se pudo guardar");
      return;
    }
    onCerrar();
  }

  const opcionesCategoria = [
    ...categorias.map((c) => ({ value: c, label: c })),
    { value: NUEVA_CATEGORIA, label: "Añadir una categoría nueva…" },
  ];

  return (
    <Modal
      isOpen={abierto}
      onClose={onCerrar}
      className="max-w-2xl p-6 sm:p-8"
      ariaLabelledBy="titulo-modal-producto"
      manageFocus
    >
      <h2
        id="titulo-modal-producto"
        className="pr-12 text-lg font-bold text-ink-title dark:text-white"
      >
        {esEdicion ? "Editar producto" : "Añadir producto"}
      </h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {esEdicion
          ? "Cambia lo que necesites. La cantidad se ajusta desde la ficha del producto."
          : "Rellena la ficha. Solo el nombre, el código y el precio son obligatorios."}
      </p>

      {soloLectura && (
        <p className="mt-4 rounded-xl bg-estado-amarillo px-3.5 py-2.5 text-sm text-ink-body dark:bg-estado-amarillo/15 dark:text-estado-amarillo">
          {TEXTO_SOLO_LECTURA}
        </p>
      )}

      <fieldset disabled={soloLectura} className="mt-5 space-y-5">
        {/* ── Foto ─────────────────────────────────────────────────────── */}
        <div className="flex items-start gap-4">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-100 ring-1 ring-gray-200 dark:bg-white/5 dark:ring-white/10">
            {form.imagenDataUrl ? (
              <img src={form.imagenDataUrl} alt="Foto del producto" className="h-full w-full object-cover" />
            ) : (
              <BoxCubeIcon className="h-7 w-7 text-gray-400 dark:text-gray-500" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Foto del producto
            </p>
            <p className="mt-0.5 text-theme-xs text-gray-500 dark:text-gray-400">
              Opcional. Se pierde al recargar: todavía no hay dónde guardarla.
            </p>
            <label className="mt-2 inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-theme-xs font-medium text-brand-700 ring-1 ring-gray-300 transition-colors hover:bg-gray-50 dark:text-brand-400 dark:ring-gray-700 dark:hover:bg-white/5">
              <PlusIcon className="h-3.5 w-3.5" />
              {form.imagenDataUrl ? "Cambiar foto" : "Elegir una foto"}
              <input
                ref={inputArchivo}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => cargarArchivo(e.target.files?.[0])}
              />
            </label>
            {form.imagenDataUrl && (
              <button
                type="button"
                onClick={() => campo("imagenDataUrl", null)}
                className="ml-2 text-theme-xs text-gray-500 underline-offset-2 hover:underline dark:text-gray-400"
              >
                Quitar
              </button>
            )}
          </div>
        </div>

        {/* ── Nombre y código ──────────────────────────────────────────── */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor={idCampo("nombre")}>Nombre del producto</Label>
            <Input
              id={idCampo("nombre")}
              type="text"
              value={form.nombre}
              placeholder="Ej.: Caldo de gallina Maggi"
              onChange={(e) => campo("nombre", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor={idCampo("codigo")}>Código del producto</Label>
            <Input
              id={idCampo("codigo")}
              type="text"
              value={form.codigo}
              placeholder="Ej.: PRD-016"
              hint="Con este código lo identificas tú. No puede repetirse."
              onChange={(e) => campo("codigo", e.target.value)}
            />
          </div>
        </div>

        {/* ── Categoría y unidad ───────────────────────────────────────── */}
        {/* `Select` del catálogo no acepta `id`, así que el `Label` no puede
            asociarse con `htmlFor`. Se le da nombre accesible al desplegable
            con `aria-label` —sin él el control queda sin nombre en el árbol de
            accesibilidad— y el `Label` visible se mantiene para el ojo. La
            asociación real exige añadir `id` a `Select`: es una extensión del
            catálogo y se propone como decisión, no se hace de paso. */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Categoría</Label>
            <Select
              aria-label="Categoría"
              options={opcionesCategoria}
              placeholder="Elige una categoría"
              defaultValue={form.categoria}
              onChange={(v) => campo("categoria", v)}
            />
          </div>
          <div>
            <Label>Se cuenta en</Label>
            <Select
              aria-label="Se cuenta en"
              options={OPCIONES_UNIDAD}
              defaultValue={form.unidad}
              onChange={(v) => campo("unidad", v as UnidadMedida)}
            />
          </div>
        </div>

        {form.categoria === NUEVA_CATEGORIA && (
          <div>
            <Label htmlFor={idCampo("categoriaNueva")}>Nombre de la categoría nueva</Label>
            <Input
              id={idCampo("categoriaNueva")}
              type="text"
              value={form.categoriaNueva}
              placeholder="Ej.: Panadería"
              onChange={(e) => campo("categoriaNueva", e.target.value)}
            />
          </div>
        )}

        {/* ── Precio y cantidad ────────────────────────────────────────── */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor={idCampo("precio")}>Precio de compra</Label>
            <Input
              id={idCampo("precio")}
              type="number"
              min="0"
              step={100}
              value={form.precioCompra}
              placeholder="Ej.: 2400"
              hint="Lo que te cuesta a ti, en pesos."
              onChange={(e) => campo("precioCompra", e.target.value)}
            />
          </div>
          {!esEdicion && (
            <div>
              <Label htmlFor={idCampo("cantidad")}>Cuántos tienes ahora</Label>
              <Input
                id={idCampo("cantidad")}
                type="number"
                min="0"
                step={1}
                value={form.cantidadInicial}
                placeholder="Ej.: 43"
                hint="Entra en tu primera sede. Puedes repartirlo después."
                onChange={(e) => campo("cantidadInicial", e.target.value)}
              />
            </div>
          )}
        </div>

        {/* ── Vencimiento y mínimo ─────────────────────────────────────── */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor={idCampo("vencimiento")}>Fecha de vencimiento</Label>
            <Input
              id={idCampo("vencimiento")}
              type="date"
              value={form.vencimiento}
              hint="Déjala vacía si el producto no vence."
              onChange={(e) => campo("vencimiento", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor={idCampo("minimo")}>Cantidad mínima</Label>
            <Input
              id={idCampo("minimo")}
              type="number"
              min="0"
              step={1}
              value={form.minimo}
              placeholder="0"
              hint="Cuando queden menos que esto, aparecerá como «Queda poco». Escribe 0 para no avisar."
              onChange={(e) => campo("minimo", e.target.value)}
            />
          </div>
        </div>
      </fieldset>

      {/* El motivo del fallo va aquí y no en un `Alert` del catálogo: `Alert`
          exige título Y mensaje, y esta es una sola línea. Un `Alert` con
          título inventado para llenar el hueco sería peor que el texto. */}
      {error && (
        <p
          role="alert"
          className={cn(
            "mt-4 rounded-xl bg-estado-rojo px-3.5 py-2.5 text-sm text-ink-body",
            "dark:bg-estado-rojo/15 dark:text-estado-rojo",
          )}
        >
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-end gap-2.5">
        <Button variant="outline" onClick={onCerrar}>
          Descartar
        </Button>
        <Button onClick={guardar} disabled={soloLectura}>
          {esEdicion ? "Guardar cambios" : "Guardar producto"}
        </Button>
      </div>
    </Modal>
  );
}
