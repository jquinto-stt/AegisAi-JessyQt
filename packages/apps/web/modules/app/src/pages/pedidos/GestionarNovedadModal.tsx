import { useEffect, useState } from "react";

import { Modal } from "@/elements/ui/modal";
import { Button } from "@/elements/ui/button";
import {
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ExclamationTriangleIcon,
  MapPinIcon,
  SparklesIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

import { transportadoraPorNombre } from "@/domain/pedidos/transportadoras.catalogo";
import { LogoTransportadora } from "./LogoTransportadora";
import {
  ETIQUETA_ESTADO_NOVEDAD,
  MAX_OBSERVACION,
  MIN_OBSERVACION,
  SOLUCIONES_NOVEDAD,
  claseEstadoNovedad,
  diasEnNovedad,
  hoyISO,
  interpretarNovedad,
  solucionPorId,
  type DatosSolucion,
  type Novedad,
} from "@/domain/pedidos/novedades.domain";

// ═══════════════════════════════════════════════════════════════════════════
// GESTIONAR NOVEDAD — ventana de dos pasos
// ═══════════════════════════════════════════════════════════════════════════
//
// Paso 1 · ¿qué pasó y qué pedimos?
//   Tres datos del envío, la lectura de la novedad y el desplegable de solución.
//   La lectura va antes del desplegable a propósito: quien elige sin leer la
//   causal elige «reintentar» siempre, y la mitad de las novedades no se
//   arreglan reintentando.
//
// Paso 2 · ¿cuándo, a nombre de quién y qué le decimos al mensajero?
//   La solución queda a la vista, en lectura, para no resolver una novedad
//   creyendo que se eligió otra.
//
// ── Por qué la observación tiene tope ─────────────────────────────────────
//
// El campo de la guía corta a 50 caracteres al imprimir. Dejar escribir 300 y
// que la transportadora reciba los primeros 50 es perder el final del mensaje
// justo donde iba la instrucción.
// ═══════════════════════════════════════════════════════════════════════════

const VACIO: DatosSolucion = {
  solucion: "",
  observaciones: "",
  fechaReintento: "",
  direccionNueva: "",
  ciudadNueva: "",
  recibeNombre: "",
  recibeTelefono: "",
};

const CLASE_INPUT =
  "h-10 w-full rounded-xl border border-gray-300 bg-white px-3 text-theme-xs text-ink-body outline-none transition-colors placeholder:text-gray-400 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100";

/** Tarjeta del resumen: rótulo pequeño, dato debajo. */
function MiniTarjeta({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl border border-gray-100 bg-white px-3 py-2.5 dark:border-gray-800 dark:bg-gray-900">
      <div className="text-[9.5px] font-bold uppercase tracking-[0.08em] text-gray-400 dark:text-gray-500">
        {rotulo}
      </div>
      <div className="mt-1">{children}</div>
    </div>
  );
}

/** Campo con etiqueta. El error se pinta en el pie, no por campo. */
function Campo({
  id,
  etiqueta,
  children,
  ayuda,
  className = "",
}: {
  id: string;
  etiqueta: string;
  children: React.ReactNode;
  ayuda?: string;
  className?: string;
}) {
  return (
    <div className={`min-w-0 ${className}`}>
      <label htmlFor={id} className="block text-[11.5px] font-bold text-ink-body dark:text-gray-200">
        {etiqueta}
      </label>
      <div className="mt-1.5">{children}</div>
      {ayuda && <p className="mt-1.5 text-[10.5px] text-gray-500 dark:text-gray-400">{ayuda}</p>}
    </div>
  );
}

export interface GestionarNovedadModalProps {
  novedad: Novedad | null;
  onCerrar: () => void;
  /** Devuelve el error del store, o `null` si se aplicó. */
  onSolucionar: (id: string, datos: DatosSolucion) => string | null;
}

export const GestionarNovedadModal = ({
  novedad,
  onCerrar,
  onSolucionar,
}: GestionarNovedadModalProps) => {
  const [paso, setPaso] = useState<1 | 2>(1);
  const [datos, setDatos] = useState<DatosSolucion>(VACIO);
  const [error, setError] = useState<string | null>(null);

  // Cada novedad abre en limpio: arrastrar la solución de la anterior es cómo se
  // manda a la transportadora una dirección que no era.
  useEffect(() => {
    setPaso(1);
    setDatos(VACIO);
    setError(null);
  }, [novedad?.id]);

  if (!novedad) return null;

  const opcion = datos.solucion ? solucionPorId(datos.solucion) : undefined;
  const lectura = interpretarNovedad(novedad);

  const cambiar = <K extends keyof DatosSolucion>(campo: K, valor: DatosSolucion[K]) => {
    setDatos((prev) => ({ ...prev, [campo]: valor }));
    // El error se retira al primer cambio: un mensaje que sigue visible mientras
    // se corrige el campo contradice lo que se está viendo.
    if (error) setError(null);
  };

  const continuar = () => {
    if (!datos.solucion) {
      setError("Elige cómo se reintenta la entrega.");
      return;
    }
    // En el paso 1 solo se comprueba que haya una solución elegida. Los datos
    // que esa solución exige —la fecha, la dirección— se piden en el paso 2, así
    // que validarlos aquí bloquearía el avance con un error sobre un campo que
    // todavía no está en pantalla. Se validan al pulsar «Solucionar».
    setError(null);
    setPaso(2);
  };

  const solucionar = () => {
    const fallo = onSolucionar(novedad.id, datos);
    if (fallo) setError(fallo);
  };

  return (
    <Modal isOpen onClose={onCerrar} className="max-w-2xl">
      <div className="flex max-h-[88vh] flex-col">
        {/* ── Cabecera ── */}
        <header className="flex items-start gap-3 border-b border-gray-100 px-6 py-4 dark:border-gray-800">
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-500 dark:bg-brand-500/15">
            <ExclamationTriangleIcon className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-theme-md font-bold text-ink-title dark:text-white">
              Gestionar novedad
            </h2>
            <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
              Completa los datos del formulario para solucionar la novedad presentada con tu pedido.
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 cursor-pointer dark:hover:bg-gray-800 dark:hover:text-white"
          >
            <XMarkIcon className="size-4" />
          </button>
        </header>

        {/* ── Cuerpo ── */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {paso === 1 ? (
            <>
              {/* Los tres datos que sitúan la novedad, en una fila. */}
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                <MiniTarjeta rotulo="Cliente">
                  <div className="truncate text-[12.5px] font-bold text-ink-body dark:text-gray-100">
                    {novedad.cliente}
                  </div>
                  <div className="truncate text-[10.5px] text-gray-500 dark:text-gray-400">
                    Tel. {novedad.telefono}
                  </div>
                  <div className="truncate text-[10.5px] text-gray-500 dark:text-gray-400">
                    {novedad.ciudad}
                  </div>
                </MiniTarjeta>

                <MiniTarjeta rotulo="Días en novedad">
                  <div className="text-[12.5px] font-bold tabular-nums text-ink-body dark:text-gray-100">
                    {diasEnNovedad(novedad.creadaEn)}
                  </div>
                  <div className="mt-1">
                    <span
                      className={`inline-flex h-5 items-center whitespace-nowrap rounded-full px-2 text-[9.5px] font-bold ${claseEstadoNovedad(novedad.estado)}`}
                    >
                      {ETIQUETA_ESTADO_NOVEDAD[novedad.estado]}
                    </span>
                  </div>
                </MiniTarjeta>

                <MiniTarjeta rotulo="Transportadora">
                  <div className="flex items-center gap-2">
                    <LogoTransportadora
                      transportadora={transportadoraPorNombre(novedad.transportadora)}
                      nombre={novedad.transportadora}
                      tamano="sm"
                    />
                    <span className="truncate text-[10.5px] font-bold text-ink-body dark:text-gray-100">
                      {novedad.transportadora}
                    </span>
                  </div>
                  <div className="mt-1 truncate font-mono text-[10px] text-gray-400">
                    Guía {novedad.guia}
                  </div>
                </MiniTarjeta>
              </div>

              {/* Lectura de la novedad. Va antes del desplegable porque decide
                  la elección, no al revés. */}
              <div className="mt-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-[12.5px] font-bold text-ink-body dark:text-gray-100">
                    Observaciones de la novedad
                  </h3>
                  <span className="inline-flex h-4 items-center rounded bg-estado-amarillo px-1.5 text-[9px] font-bold uppercase tracking-wide text-ink-body dark:bg-estado-amarillo/20 dark:text-estado-amarillo">
                    Beta
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10.5px] italic text-brand-500">
                    <SparklesIcon className="size-3.5" />
                    Interpretación generada a partir del registro
                  </span>
                </div>

                <div className="mt-2 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-white/[0.03]">
                  <ol className="list-decimal space-y-1 pl-4 text-[11.5px] leading-relaxed text-gray-600 marker:text-gray-400 dark:text-gray-300">
                    {lectura.map((linea) => (
                      <li key={linea}>{linea}</li>
                    ))}
                  </ol>
                </div>
              </div>

              {/* Solución */}
              <div className="mt-4">
                <label
                  htmlFor="solucion-novedad"
                  className="block text-[11.5px] font-bold text-ink-body dark:text-gray-200"
                >
                  Solución a novedad
                </label>
                <div className="relative mt-1.5">
                  <select
                    id="solucion-novedad"
                    value={datos.solucion}
                    onChange={(e) =>
                      cambiar("solucion", e.target.value as DatosSolucion["solucion"])
                    }
                    className={`${CLASE_INPUT} cursor-pointer appearance-none pr-9`}
                  >
                    <option value="">Seleccionar</option>
                    {SOLUCIONES_NOVEDAD.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                </div>

                {opcion && (
                  <p className="mt-2 flex items-start gap-1.5 text-[10.5px] text-gray-500 dark:text-gray-400">
                    <CheckCircleIcon className="mt-px size-3.5 shrink-0 text-brand-500" />
                    {opcion.ayuda}
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
              {/* La solución elegida, en lectura: se confirma antes de escribir,
                  no se recuerda de memoria. */}
              <div>
                <div className="text-[11.5px] font-bold text-ink-body dark:text-gray-200">
                  Solución a novedad
                </div>
                <div className="mt-1.5 flex items-center gap-2 rounded-xl bg-estado-amarillo px-3 py-2.5 text-[12px] font-medium text-ink-body dark:bg-estado-amarillo/15 dark:text-estado-amarillo">
                  <CheckCircleIcon className="size-4 shrink-0" />
                  {opcion?.label}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {opcion?.exige === "fecha" && (
                  <Campo id="fecha-reintento" etiqueta="Fecha" className="sm:col-span-2">
                    <input
                      id="fecha-reintento"
                      type="date"
                      min={hoyISO()}
                      value={datos.fechaReintento ?? ""}
                      onChange={(e) => cambiar("fechaReintento", e.target.value)}
                      className={CLASE_INPUT}
                    />
                  </Campo>
                )}

                {(opcion?.exige === "direccion" || opcion?.exige === "ciudad") && (
                  <Campo
                    id="direccion-nueva"
                    etiqueta={opcion.campoLabel ?? "Dirección nueva"}
                    ayuda={opcion.campoAyuda}
                    className="sm:col-span-2"
                  >
                    <div className="relative">
                      <MapPinIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                      <input
                        id="direccion-nueva"
                        type="text"
                        value={
                          opcion.exige === "ciudad"
                            ? (datos.ciudadNueva ?? "")
                            : (datos.direccionNueva ?? "")
                        }
                        onChange={(e) =>
                          opcion.exige === "ciudad"
                            ? cambiar("ciudadNueva", e.target.value)
                            : cambiar("direccionNueva", e.target.value)
                        }
                        placeholder={
                          opcion.exige === "ciudad"
                            ? "Ej. Envigado · Carrera 43A #18-95"
                            : "Ej. Carrera 76 #33-10, barrio Laureles"
                        }
                        className={`${CLASE_INPUT} pl-9`}
                      />
                    </div>
                  </Campo>
                )}

                <Campo id="recibe-nombre" etiqueta="Nombre de quién recibe">
                  <input
                    id="recibe-nombre"
                    type="text"
                    value={datos.recibeNombre ?? ""}
                    onChange={(e) => cambiar("recibeNombre", e.target.value)}
                    placeholder="Ingresa el nombre de la persona"
                    className={CLASE_INPUT}
                  />
                </Campo>

                <Campo id="recibe-telefono" etiqueta="Teléfono">
                  <div className="flex h-10 items-center overflow-hidden rounded-xl border border-gray-300 bg-white transition-colors focus-within:border-brand-300 focus-within:ring-3 focus-within:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900">
                    <span className="flex h-full items-center border-r border-gray-200 px-2.5 text-[11px] font-medium text-gray-500 dark:border-gray-700 dark:text-gray-400">
                      +57
                    </span>
                    <input
                      id="recibe-telefono"
                      type="tel"
                      inputMode="tel"
                      value={datos.recibeTelefono ?? ""}
                      onChange={(e) => cambiar("recibeTelefono", e.target.value)}
                      placeholder="Ingresa un teléfono"
                      className="h-full w-full min-w-0 bg-transparent px-2.5 text-theme-xs text-ink-body outline-none placeholder:text-gray-400 dark:text-gray-100"
                    />
                  </div>
                </Campo>
              </div>

              <div className="mt-4">
                <label
                  htmlFor="observaciones"
                  className="block text-[11.5px] font-bold text-ink-body dark:text-gray-200"
                >
                  Observaciones
                </label>
                <p className="mt-1 text-[10.5px] text-gray-500 dark:text-gray-400">
                  Es lo único que la transportadora lee en la calle: quién recibe, en qué horario y
                  por qué entrada.
                </p>
                <textarea
                  id="observaciones"
                  rows={4}
                  maxLength={MAX_OBSERVACION}
                  value={datos.observaciones}
                  onChange={(e) => cambiar("observaciones", e.target.value)}
                  placeholder="Ej. Entregar a la hija de la señora, después de las 2 p.m."
                  className="mt-1.5 w-full resize-y rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-theme-xs leading-relaxed text-ink-body outline-none transition-colors placeholder:text-gray-400 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                />
                <div className="mt-1 flex items-center justify-between text-[10.5px] text-gray-400 dark:text-gray-500">
                  <span>Mínimo {MIN_OBSERVACION} caracteres.</span>
                  <span className="font-mono tabular-nums">
                    {datos.observaciones.length}/{MAX_OBSERVACION}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Pie ── */}
        <footer className="border-t border-gray-100 px-6 py-3.5 dark:border-gray-800">
          {error && (
            <p className="mb-3 flex items-start gap-1.5 rounded-lg bg-error-500/10 px-3 py-2 text-[11.5px] text-error-500">
              <ExclamationTriangleIcon className="mt-px size-3.5 shrink-0" />
              {error}
            </p>
          )}
          <div className="flex items-center justify-between gap-3">
            {paso === 1 ? (
              <span className="text-[11px] text-gray-400 dark:text-gray-500">Paso 1 de 2</span>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setPaso(1);
                }}
                className="inline-flex items-center gap-1 text-[11.5px] font-bold text-gray-500 transition-colors hover:text-ink-body cursor-pointer dark:text-gray-400 dark:hover:text-white"
              >
                <ChevronLeftIcon className="size-3.5" />
                Regresar
              </button>
            )}

            <div className="flex items-center gap-2">
              {paso === 1 ? (
                <Button variant="primary" size="sm" onClick={continuar}>
                  Continuar
                </Button>
              ) : (
                <Button variant="primary" size="sm" onClick={solucionar}>
                  Solucionar
                </Button>
              )}
            </div>
          </div>
        </footer>
      </div>
    </Modal>
  );
};
