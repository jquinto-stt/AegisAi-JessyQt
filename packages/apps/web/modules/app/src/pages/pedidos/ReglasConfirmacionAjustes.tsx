import { useEffect, useId, useRef, useState } from "react";

import { Switch } from "@/elements/form/switch";
import { PencilSquareIcon, ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import {
  ETIQUETA_FORMA,
  FORMAS_CONFIRMACION,
  conForma,
  conPresupuesto,
  conRiesgosas,
  reglasVigentes,
  type FormaConfirmacion,
  type ReglasConfirmacion,
} from "@/domain/pedidos/confirmacion.reglas";
import { formatoMoneda } from "@/utils";
import { cn } from "@/utils";

// ═══════════════════════════════════════════════════════════════════════════
// REGLAS DE CONFIRMACIÓN — Ajustes de pedidos
// ═══════════════════════════════════════════════════════════════════════════
//
// Tres bloques apilados, en el orden de la referencia:
//
//   1. Presupuesto máximo para el valor de envío  → ¿qué pedido es caro de enviar?
//   2. Confirmación de pedidos riesgosos          → ¿esos se revisan a mano?
//   3. Jerarquía de aceptación de pedidos         → ¿cómo se confirman los demás?
//
// ── Por qué NO se usan las tarjetas `BloqueConfig` ────────────────────────
//
// La primera versión metió esta pantalla en el patrón de bloques del resto de
// la configuración: icono grande, pregunta de 24 px, tarjeta con borde. Se
// descartó porque la referencia —y esta pantalla— no son tres ajustes sueltos
// que se hojean: son una LISTA de reglas que se lee de arriba abajo, y cada
// fila pesa lo mismo. Con tres tarjetas de 24 px el ojo no encuentra la regla,
// encuentra tres portadas.
//
// ── El interruptor va a la IZQUIERDA, como en la referencia ────────────────
//
// El resto de la app lo pone a la derecha (`claseFila`), pero aquí el
// interruptor es el SUJETO de la fila —«esta regla está encendida»— y no el
// control de un valor que se lee a la izquierda. Puesto a la derecha, la
// columna de interruptores queda al final de frases largas y se pierde el
// barrido vertical de «cuáles están activas».

/** La guía para resolver el error de número de teléfono de WhatsApp. */
const GUIA_TELEFONO_WHATSAPP =
  "https://ayuda.mastershop.com/es/article/como-configurar-un-numero-de-telefono-para-poder-enviar-mensajes-por-whatsapp-1nnpf06";

/** Texto de cada forma. El nombre sale de `ETIQUETA_FORMA`: un solo sitio. */
const DETALLE_FORMA: Record<FormaConfirmacion, string> = {
  manual:
    "Esta regla condiciona que todos los pedidos que ingresen al negocio deben ser confirmados manualmente (uno a uno).",
  whatsapp:
    "El cliente puede confirmar, editar la dirección o cancelar respondiendo la conversación automatizada que se dispara con una plantilla de WhatsApp.",
  automatica:
    "Los pedidos se confirman solos al entrar y pasan a pendientes: solo faltaría generar la guía para pasarlos a por alistar.",
};

/** Título de la fila. El de WhatsApp lleva su excepción, como en la referencia. */
function tituloForma(forma: FormaConfirmacion, riesgosasAMano: boolean): string {
  const base = ETIQUETA_FORMA[forma];
  if (forma === "manual") return base;
  // La excepción se escribe SOLO cuando existe: con el interruptor de riesgosas
  // apagado, decir «excepto los riesgosos» sería una advertencia falsa.
  return riesgosasAMano ? `${base} (Excepto los pedidos riesgosos)` : base;
}

// ═══════════════════════════════════════════════════════════════════════════
// PIEZAS DE MAQUETACIÓN
// ═══════════════════════════════════════════════════════════════════════════

/** Banda de una fila: fondo tenue y esquinas redondeadas, como la referencia. */
const claseBanda =
  "rounded-2xl bg-[#ECECEC]/55 px-4 py-3.5 dark:bg-white/[0.04]";

/** Título de bloque, con su línea de qué se decide. */
function TituloBloque({ titulo, descripcion }: { titulo: string; descripcion: string }) {
  return (
    <div>
      <h3 className="text-[16px] font-bold leading-6 text-[#212121] dark:text-white">{titulo}</h3>
      <p className="mt-0.5 text-[14px] font-normal leading-5 text-gray-500 dark:text-gray-400">
        {descripcion}
      </p>
    </div>
  );
}

export interface ReglasConfirmacionAjustesProps {
  reglas: ReglasConfirmacion;
  /** Se llama con las reglas ya resueltas: quien lo usa solo las escribe en el borrador. */
  onCambio: (reglas: ReglasConfirmacion) => void;
}

export function ReglasConfirmacionAjustes({ reglas: entrada, onCambio }: ReglasConfirmacionAjustesProps) {
  const reglas = reglasVigentes(entrada);
  const idValor = useId();

  // ── Edición del tope ─────────────────────────────────────────────────────
  //
  // El valor se teclea en un borrador local y se confirma al pulsar «Listo» (o
  // al salir del campo). Escribir directamente en el store haría que «22.00»
  // —un número a medio escribir— se guardara como tope de 22 pesos y marcara
  // todos los pedidos como riesgosos mientras el usuario sigue tecleando.
  const [editando, setEditando] = useState(false);
  const [borrador, setBorrador] = useState("");
  const campoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editando) campoRef.current?.focus();
  }, [editando]);

  const empezarEdicion = () => {
    setBorrador(reglas.presupuestoEnvio.valorMaximo > 0 ? String(reglas.presupuestoEnvio.valorMaximo) : "");
    setEditando(true);
  };

  const confirmarEdicion = () => {
    if (!editando) return;
    const soloDigitos = borrador.replace(/\D/g, "");
    const valor = soloDigitos ? Number(soloDigitos) : 0;
    if (valor !== reglas.presupuestoEnvio.valorMaximo) {
      onCambio(conPresupuesto(reglas, { valorMaximo: valor }));
    }
    setEditando(false);
  };

  const { activo, valorMaximo } = reglas.presupuestoEnvio;
  const valorVisible = editando
    ? borrador
    : valorMaximo > 0
    ? valorMaximo.toLocaleString("es-CO")
    : "";

  return (
    <div className="space-y-7">
      {/* ═══════════════════════════════════════════════════════════════════
          REGLA 1 — PRESUPUESTO MÁXIMO PARA EL VALOR DE ENVÍO
         ═══════════════════════════════════════════════════════════════════ */}
      <section className="rounded-2xl bg-[#ECECEC]/55 p-5 sm:p-6 dark:bg-white/[0.04]">
        <TituloBloque
          titulo="Presupuesto máximo para el valor de envío"
          descripcion="Para cuidar tu rentabilidad, los pedidos con un valor superior al definido se marcarán como riesgosos."
        />

        <p className="mt-5 text-[14px] font-bold text-[#212121] dark:text-white">
          Valor máximo de envío
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-3">
          <Switch
            checked={activo}
            color="success"
            onChange={(v) => onCambio(conPresupuesto(reglas, { activo: v }))}
            aria-label="Aplicar el presupuesto máximo de envío"
          />

          <div
            className={cn(
              "flex h-10 items-center overflow-hidden rounded-xl border bg-white transition-colors dark:bg-gray-900",
              editando
                ? "border-[#FF3F1A] ring-2 ring-[#FF3F1A]/20"
                : "border-[#ECECEC] dark:border-gray-800",
              !activo && "opacity-60",
            )}
          >
            <span
              className="flex h-full items-center border-r border-[#ECECEC] px-3 text-[14px] font-normal text-gray-500 dark:border-gray-800 dark:text-gray-400"
              aria-hidden="true"
            >
              $
            </span>
            <input
              ref={campoRef}
              id={idValor}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              readOnly={!editando}
              disabled={!activo}
              value={valorVisible}
              placeholder="0"
              onChange={(e) => setBorrador(e.target.value)}
              onBlur={(e) => {
                // Al pulsar «Listo» el campo pierde el foco ANTES del clic. Si
                // el blur confirmara también, la edición se cerraría y el clic
                // volvería a abrirla: se ignora el blur que va hacia ese botón.
                if ((e.relatedTarget as HTMLElement | null)?.dataset.accion === "confirmar-tope") {
                  return;
                }
                confirmarEdicion();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") confirmarEdicion();
                if (e.key === "Escape") setEditando(false);
              }}
              aria-label="Valor máximo de envío en pesos"
              className={cn(
                "h-full w-28 bg-transparent px-3 text-[14px] font-normal text-[#212121] outline-none placeholder:text-gray-400 dark:text-white",
                !editando && "cursor-default",
              )}
            />
          </div>

          <button
            type="button"
            data-accion="confirmar-tope"
            onClick={editando ? confirmarEdicion : empezarEdicion}
            disabled={!activo}
            className={cn(
              "inline-flex h-10 items-center gap-1.5 rounded-xl px-4 text-[14px] font-bold transition-colors",
              "bg-[#212121] text-white hover:bg-black",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF3F1A]/40",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "dark:bg-white dark:text-[#212121] dark:hover:bg-gray-200",
            )}
          >
            <PencilSquareIcon className="h-4 w-4" aria-hidden="true" />
            {editando ? "Listo" : "Editar"}
          </button>
        </div>

        {/* Qué hace hoy el tope, escrito: un interruptor encendido sobre un
            valor vacío parece una protección que no existe. */}
        <p className="mt-3 text-[12px] font-normal text-gray-500 dark:text-gray-400">
          {!activo
            ? "Apagado: el valor del envío no marca ningún pedido como riesgoso."
            : valorMaximo > 0
            ? `Los pedidos con un envío superior a ${formatoMoneda(valorMaximo)} se marcarán como riesgosos.`
            : "Sin valor definido: el tope está encendido pero no marca ningún pedido todavía."}
        </p>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          REGLA 2 — CONFIRMACIÓN DE PEDIDOS RIESGOSOS
         ═══════════════════════════════════════════════════════════════════ */}
      <section className="space-y-3">
        <TituloBloque
          titulo="Confirmación de pedidos riesgosos"
          descripcion="Activa o desactiva la regla de confirmación para pedidos riesgosos."
        />

        <div className={claseBanda}>
          <div className="flex items-start gap-3.5">
            <Switch
              checked={reglas.riesgosas}
              color="success"
              onChange={(v) => onCambio(conRiesgosas(reglas, v))}
              aria-label="Confirmar a mano los pedidos riesgosos"
            />

            <div className="min-w-0 flex-1">
              <p className="text-[16px] font-bold leading-6 text-[#212121] dark:text-white">
                Pedidos riesgosos
              </p>
              <p className="mt-0.5 text-[14px] font-normal leading-5 text-gray-500 dark:text-gray-400">
                Esta regla condiciona que todos los pedidos calificados como «riesgosos» se
                deben confirmar manualmente para ser procesados.
              </p>
              <p className="mt-1.5 text-[12px] font-normal leading-[18px] text-gray-500 dark:text-gray-400">
                Se marcan así: pedido repetido, producto sin inventario, cliente que cancela o
                devuelve con frecuencia, dirección sin verificar en Google Maps y envío por
                encima del presupuesto de arriba.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          REGLA 3 — JERARQUÍA DE ACEPTACIÓN
         ═══════════════════════════════════════════════════════════════════ */}
      <section className="space-y-3">
        <TituloBloque
          titulo="Jerarquía de aceptación de pedidos"
          descripcion="Define cómo te gustaría confirmar tus pedidos."
        />

        {FORMAS_CONFIRMACION.map((forma) => {
          const activa = reglas.forma === forma;
          return (
            <div key={forma} className={claseBanda}>
              <div className="flex items-start gap-3.5">
                <Switch
                  checked={activa}
                  color="success"
                  onChange={(v) => onCambio(conForma(reglas, forma, v))}
                  aria-label={ETIQUETA_FORMA[forma]}
                />

                <div className="min-w-0 flex-1">
                  <p className="text-[16px] font-bold leading-6 text-[#212121] dark:text-white">
                    {tituloForma(forma, reglas.riesgosas)}
                  </p>

                  <p className="mt-0.5 text-[14px] font-normal leading-5 text-gray-500 dark:text-gray-400">
                    {DETALLE_FORMA[forma]}
                  </p>

                  {/* WhatsApp: el costo del mensaje es un dato de la regla, y
                      la guía del número es la única acción que resuelve el
                      error que aparece al encenderla. */}
                  {forma === "whatsapp" && (
                    <div className="mt-1.5 space-y-1">
                      <p className="text-[12px] font-normal leading-[18px] text-gray-500 dark:text-gray-400">
                        Cada mensaje de WhatsApp tiene un costo de $197 (pesos colombianos).
                      </p>

                      {activa && (
                        <p className="text-[12px] font-normal leading-[18px] text-gray-500 dark:text-gray-400">
                          Si ves «Debes configurar un número de teléfono para poder enviar mensajes
                          por WhatsApp»,{" "}
                          <a
                            href={GUIA_TELEFONO_WHATSAPP}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="inline-flex items-center gap-1 rounded-sm font-bold text-[#FF3F1A] underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF3F1A]"
                          >
                            sigue esta guía
                            <ArrowTopRightOnSquareIcon className="h-3 w-3" aria-hidden="true" />
                          </a>
                          .
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Una sola forma manda. Se dice aquí y no solo con el comportamiento:
            tres interruptores apagados no explican por qué se apagó el otro. */}
        <p className="text-[12px] font-normal leading-[18px] text-gray-500 dark:text-gray-400">
          Solo una forma puede estar activa: es la que gobierna los pedidos no riesgosos.
          {!reglas.forma && " Ahora mismo no hay ninguna elegida, así que los pedidos esperan confirmación."}
        </p>
      </section>
    </div>
  );
}

export default ReglasConfirmacionAjustes;
