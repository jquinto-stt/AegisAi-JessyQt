import { useEffect, useMemo, useState } from "react";
import { observer } from "mobx-react-lite";

import { Modal } from "@/elements/ui/modal";
import { Button } from "@/elements/ui/button";
import { Input } from "@/elements/form/input";
import { Label } from "@/elements/form/label";
import { Radio } from "@/elements/form/radio";
import { Textarea } from "@/elements/form/textarea";
import { Badge } from "@/elements/ui/badge";
import { Alert } from "@/elements/ui/alert";
import { CheckLineIcon } from "@/icons";
import { inventariosStore, type DatosElemento, type Elemento } from "@/stores";
import { validarElemento } from "./inventarios.presentacion";
import { OPCIONES_UNIDAD, UNIDAD_META } from "./inventarios.constants";

// ═══════════════════════════════════════════════════════════════════════════
// MODAL — CREAR Y EDITAR ELEMENTO
// ═══════════════════════════════════════════════════════════════════════════
//
// El catálogo registra qué elementos se pueden reconocer en un conteo. No es
// stock en tiempo real: la unidad aclara si se cuenta de uno en uno o por grupo.
// Categoría es texto libre; las categorías reales solo ayudan a mantener nombres
// consistentes y nunca limitan el rubro.

export const ModalElemento = observer(function ModalElemento({
  abierto,
  elemento,
  onCerrar,
}: {
  abierto: boolean;
  /** `null` para crear, un elemento para editar. */
  elemento: Elemento | null;
  onCerrar: () => void;
}) {
  const editando = elemento !== null;

  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("");
  const [categoria, setCategoria] = useState("");
  const [unidad, setUnidad] = useState<DatosElemento["unidad"]>("unidad");
  const [descripcion, setDescripcion] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // El mismo diálogo sirve para crear y editar, así que vuelve a sincronizar
  // cada vez que se abre y toma los datos actuales del elemento seleccionado.
  useEffect(() => {
    if (!abierto) return;
    setEnviado(false);
    setError(null);
    if (elemento) {
      setCodigo(elemento.codigo);
      setNombre(elemento.nombre);
      setCategoria(elemento.categoria);
      setUnidad(elemento.unidad);
      setDescripcion(elemento.descripcion ?? "");
    } else {
      setCodigo("");
      setNombre("");
      setCategoria("");
      setUnidad(inventariosStore.config.unidadPorDefecto);
      setDescripcion("");
    }
  }, [abierto, elemento?.id, inventariosStore.config.unidadPorDefecto]);

  const sugeridas = inventariosStore.categoriasSugeridas;

  const validacion = useMemo(
    () => validarElemento({ codigo, nombre, categoria, unidad, descripcion }, inventariosStore.elementos, elemento?.id),
    [codigo, nombre, categoria, unidad, descripcion, elemento?.id, inventariosStore.elementos.length],
  );

  function guardar() {
    setEnviado(true);
    setError(null);
    if (!validacion.ok) return;

    const datos: DatosElemento = {
      codigo: codigo.trim(),
      nombre: nombre.trim(),
      categoria: categoria.trim(),
      unidad,
      descripcion: descripcion.trim() || undefined,
    };

    const r = editando ? inventariosStore.actualizarElemento(elemento.id, datos) : inventariosStore.crearElemento(datos);

    if (!r.ok) {
      setError(r.motivo ?? "No se pudo guardar el elemento");
      return;
    }
    onCerrar();
  }

  const err = (campo: string) => (enviado ? validacion.errores[campo] : undefined);
  const codigoError = err("codigo");
  const nombreError = err("nombre");
  const categoriaError = err("categoria");
  const descripcionError = err("descripcion");
  const categoriaNormalizada = categoria.trim().toLocaleLowerCase("es");

  return (
    <Modal
      isOpen={abierto}
      onClose={onCerrar}
      ariaLabelledBy="el-dialog-title"
      manageFocus
      className="max-h-[calc(100dvh-2rem)] max-w-[850px] overflow-hidden p-0"
    >
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          guardar();
        }}
        className="flex max-h-[calc(100dvh-2rem)] min-h-0 flex-col"
      >
        <header className="shrink-0 px-5 pb-5 pt-7 sm:px-8 sm:pb-5 sm:pt-7">
          <h2 id="el-dialog-title" className="text-xl font-bold tracking-tight text-ink-title dark:text-white sm:text-2xl">
            {editando ? "Editar producto" : "Agregar producto"}
          </h2>
          <p className="mt-1.5 max-w-2xl text-sm leading-5 text-ink-body dark:text-gray-300">
            {editando
              ? "Actualiza la ficha que se usará para reconocerlo en próximos conteos."
              : "Completa la ficha que se usará para reconocerlo en los próximos conteos."}
          </p>
        </header>

        <div className="mx-5 shrink-0 border-t border-gray-100 dark:border-white/10 sm:mx-8" />

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5 sm:px-8 sm:py-6">
          <section aria-labelledby="el-identificacion-title">
            <div className="mb-3 flex items-baseline justify-between gap-4">
              <h3 id="el-identificacion-title" className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                Identificación
              </h3>
              <span className="text-xs text-gray-500 dark:text-gray-400">* Campo obligatorio</span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1.35fr_0.8fr]">
              <div>
                <Label htmlFor="el-nombre" className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Nombre del producto <span className="text-brand-700 dark:text-brand-300">*</span>
                </Label>
                <Input
                  id="el-nombre"
                  value={nombre}
                  onChange={(event) => setNombre(event.target.value)}
                  placeholder="Ej: Silla ergonómica con brazos"
                  required
                  error={!!nombreError}
                  aria-invalid={!!nombreError}
                  aria-describedby={nombreError ? "el-nombre-error" : undefined}
                  className="h-12 rounded-xl px-3.5 text-sm font-medium text-ink-title dark:text-white"
                />
                {nombreError && (
                  <p id="el-nombre-error" className="mt-1.5 text-xs text-error-700 dark:text-error-400">
                    {nombreError}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="el-codigo" className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Código o referencia <span className="text-brand-700 dark:text-brand-300">*</span>
                </Label>
                <Input
                  id="el-codigo"
                  value={codigo}
                  onChange={(event) => setCodigo(event.target.value)}
                  placeholder="Ej: MOB-1001"
                  required
                  error={!!codigoError}
                  aria-invalid={!!codigoError}
                  aria-describedby={codigoError ? "el-codigo-error" : "el-codigo-hint"}
                  className="h-12 rounded-xl px-3.5 font-mono text-sm font-semibold tracking-wide"
                />
                {codigoError ? (
                  <p id="el-codigo-error" className="mt-1.5 text-xs leading-4 text-error-700 dark:text-error-400">
                    {codigoError}
                  </p>
                ) : (
                  <p id="el-codigo-hint" className="mt-1.5 text-xs leading-4 text-gray-500 dark:text-gray-400">
                    Código único del elemento.
                  </p>
                )}
              </div>
            </div>
          </section>

          <section aria-label="Clasificación y forma de conteo" className="grid grid-cols-1 gap-6 border-t border-gray-100 pt-5 dark:border-white/10 md:grid-cols-[0.92fr_1.08fr] md:gap-7">
            <div>
              <Label htmlFor="el-categoria" className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                Categoría <span className="text-brand-700 dark:text-brand-300">*</span>
              </Label>
              <p id="el-categoria-hint" className="mt-1 text-xs leading-4 text-gray-600 dark:text-gray-400">
                Escribe una categoría o elige una existente.
              </p>
              <Input
                id="el-categoria"
                value={categoria}
                onChange={(event) => setCategoria(event.target.value)}
                placeholder="Ej: Mobiliario, Herramientas…"
                required
                error={!!categoriaError}
                aria-invalid={!!categoriaError}
                aria-describedby={categoriaError ? "el-categoria-hint el-categoria-error" : "el-categoria-hint"}
                className="mt-2.5 h-11 rounded-xl px-3.5 text-sm font-medium text-ink-title dark:text-white"
              />
              {categoriaError && (
                <p id="el-categoria-error" className="mt-1.5 text-xs text-error-700 dark:text-error-400">
                  {categoriaError}
                </p>
              )}

              {sugeridas.length > 0 && (
                <div className="mt-3" role="group" aria-label="Elegir una categoría existente">
                  <p className="mb-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                    Categorías existentes
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {sugeridas.slice(0, 8).map((sugerencia) => {
                      const seleccionada = categoriaNormalizada === sugerencia.toLocaleLowerCase("es");
                      return (
                        <button
                          key={sugerencia}
                          type="button"
                          aria-pressed={seleccionada}
                          onClick={() => setCategoria(sugerencia)}
                          className={
                            seleccionada
                              ? "inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-brand-300 bg-brand-50 px-2.5 py-1.5 text-xs font-semibold text-brand-800 transition-colors hover:bg-brand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 dark:border-brand-500/40 dark:bg-brand-500/15 dark:text-brand-200 dark:hover:bg-brand-500/20"
                              : "inline-flex min-h-9 items-center rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 dark:border-white/10 dark:bg-white/[0.03] dark:text-gray-300 dark:hover:border-white/20 dark:hover:bg-white/[0.05]"
                          }
                        >
                          {seleccionada && <CheckLineIcon className="h-4 w-4 shrink-0 text-brand-700 dark:text-brand-300" />}
                          {sugerencia}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <fieldset className="min-w-0">
              <legend className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                Forma de conteo <span className="text-brand-700 dark:text-brand-300">*</span>
              </legend>
              <p id="el-unidad-hint" className="mt-1 text-xs leading-4 text-gray-600 dark:text-gray-400">
                Define qué representa cada cantidad.
              </p>
              <div className="mt-2.5 space-y-2">
                {OPCIONES_UNIDAD.map(({ value: opcion }) => {
                  const meta = UNIDAD_META[opcion];
                  const seleccionada = unidad === opcion;
                  const id = `el-unidad-${opcion}`;
                  return (
                    <Radio
                      key={opcion}
                      id={id}
                      name="el-unidad"
                      value={opcion}
                      checked={seleccionada}
                      label={meta.label}
                      description={meta.hint}
                      aria-describedby={`el-unidad-hint ${id}-description`}
                      required
                      onChange={(value) => setUnidad(value as DatosElemento["unidad"])}
                      className={
                        seleccionada
                          ? "min-h-[58px] w-full items-center rounded-xl border border-brand-300 bg-brand-25 px-3.5 py-2.5 text-left text-ink-title ring-1 ring-brand-100 transition-colors focus-within:outline-hidden focus-within:ring-2 focus-within:ring-brand-500/40 dark:border-brand-500/40 dark:bg-brand-500/10 dark:text-white dark:ring-brand-500/20"
                          : "min-h-[58px] w-full items-center rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-left text-gray-700 transition-colors hover:border-gray-300 focus-within:outline-hidden focus-within:ring-2 focus-within:ring-brand-500/40 dark:border-white/10 dark:bg-white/[0.02] dark:text-gray-100 dark:hover:border-white/20"
                      }
                    />
                  );
                })}
              </div>
            </fieldset>
          </section>

          <section aria-labelledby="el-descripcion-title" className="border-t border-gray-100 pt-5 dark:border-white/10">
            <div className="mb-1.5 flex items-center gap-2">
              <Label htmlFor="el-descripcion" className="mb-0 text-sm font-semibold text-gray-700 dark:text-gray-200">
                Descripción o notas
              </Label>
              <span className="text-xs text-gray-500 dark:text-gray-400">Opcional</span>
            </div>
            <span id="el-descripcion-title" className="sr-only">Notas para reconocer el elemento</span>
            <Textarea
              id="el-descripcion"
              value={descripcion}
              onChange={setDescripcion}
              rows={2}
              placeholder="Detalles que faciliten reconocerlo (marca, color, especificaciones)…"
              error={!!descripcionError}
              aria-invalid={!!descripcionError}
              aria-describedby={descripcionError ? "el-descripcion-error" : "el-descripcion-hint"}
              className="min-h-16 resize-y rounded-xl bg-gray-50 px-3.5 py-2.5 text-sm leading-5 dark:bg-white/[0.03]"
            />
            {descripcionError ? (
              <p id="el-descripcion-error" className="mt-1.5 text-xs text-error-700 dark:text-error-400">
                {descripcionError}
              </p>
            ) : (
              <p id="el-descripcion-hint" className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                Añade detalles que ayuden a distinguir este elemento en un conteo.
              </p>
            )}
          </section>

          {error && (
            <Alert variant="error" title="No se pudo guardar" message={error} />
          )}
        </div>

        <footer className="flex shrink-0 flex-col gap-3 border-t border-gray-100 bg-white px-5 py-4 dark:border-white/10 dark:bg-gray-900 sm:flex-row sm:items-center sm:justify-between sm:gap-5 sm:px-8 sm:py-5">
          <div className="min-w-0">
            <p className="max-w-[340px] text-xs leading-5 text-gray-600 dark:text-gray-300">
              El producto quedará disponible para los próximos conteos.
            </p>
            {enviado && !validacion.ok && (
              <p className="mt-1 text-xs font-medium text-error-700 dark:text-error-400" aria-live="polite">
                Corrige los campos marcados para continuar.
              </p>
            )}
          </div>
          <div className="flex shrink-0 flex-col-reverse gap-2 sm:flex-row sm:items-center sm:gap-3">
            <Button type="button" variant="outline" onClick={onCerrar} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={enviado && !validacion.ok}
              className="w-full disabled:bg-brand-100 disabled:text-brand-800 disabled:opacity-100 dark:disabled:bg-brand-500/15 dark:disabled:text-brand-200 sm:w-auto"
            >
              {editando ? "Guardar cambios" : "Agregar producto"}
            </Button>
          </div>
        </footer>
      </form>
    </Modal>
  );
});

/** Etiqueta de unidad, para reusar en la tabla. */
export function EtiquetaUnidad({ unidad }: { unidad: DatosElemento["unidad"] }) {
  return (
    <Badge color="light" size="xs">
      {UNIDAD_META[unidad].label}
    </Badge>
  );
}

export default ModalElemento;
