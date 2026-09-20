import { observer } from "mobx-react-lite";
import { useState } from "react";

import { Modal } from "@/elements/ui/modal";
import { Button } from "@/elements/ui/button";
import { Textarea } from "@/elements/form/textarea";
import { AlertIcon } from "@/icons";
import type { Pedido } from "@/stores/pedidos.store";
import { puedeCancelarPedido, puedePrepararPedido, motivoSinPermiso } from "@/stores/acceso.utils";
import { reportarNovedadEntrega } from "./pedidos.notificaciones";
import {
  DESENLACE_AYUDA,
  DESENLACE_ICONO,
  DESENLACE_LABEL,
  MOTIVOS_NOVEDAD,
  motivoInicial,
  novedadTexto,
  puedeConfirmarNovedad,
  type DesenlaceNovedad,
  type MotivoNovedad,
} from "./novedad.utils";

// ═══════════════════════════════════════════════════════════════════════════
// MODAL: REPORTAR NOVEDAD DE ENTREGA
// ═══════════════════════════════════════════════════════════════════════════
//
// El repartidor no pudo entregar. Este modal recoge POR QUÉ y QUÉ SE HACE con el
// pedido, y deja constancia en los tres sitios que importan: la nota del pedido,
// su estado y el hilo del cliente.
//
// ── Por qué el desenlace se elige y no se asume ────────────────────────────
// Lo natural tras una entrega fallida no es anular la venta: si el cliente no
// estaba, el negocio vuelve mañana. Un modal que solo supiera cancelar
// convertiría cada timbre sin respuesta en una venta perdida. Los dos desenlaces
// se ofrecen con su consecuencia escrita debajo, para que el repartidor sepa qué
// está eligiendo y no solo qué botón pulsa.
//
// ── Por qué hay DOS compuertas y no una ────────────────────────────────────
// Abrir el modal (reportar el hecho) y cancelar el pedido son cosas distintas:
// `preparation.manage` vs `orders.cancel`. El rol «Preparación» tiene la primera
// y NO la segunda. Un solo gate le habría dado la capacidad de cancelar por la
// puerta de atrás, sin pasar por el contrato de acceso. Aquí el botón de
// confirmar comprueba la capacidad del DESENLACE elegido y, si falta, se
// deshabilita CON su motivo — nunca se oculta el botón: el repartidor tiene que
// poder leer por qué no puede, no encontrarse un hueco.
//
// ── Por qué no se puede confirmar sin motivo ───────────────────────────────
// El motivo es el dato. Sin él, la nota diría «hubo una novedad» y nada más, y
// el negocio no podría decidir nada. El botón de confirmar arranca deshabilitado
// y el motivo «Otro» exige además texto libre: es la única opción que no dice
// nada por sí sola.
// ═══════════════════════════════════════════════════════════════════════════

const DESENLACES: DesenlaceNovedad[] = ["reintentar", "cancelar"];

/** Capacidad que habilita cada desenlace. `reintentar` mueve la ruta, no cancela. */
function puedeDesenlace(d: DesenlaceNovedad): boolean {
  return d === "cancelar" ? puedeCancelarPedido() : puedePrepararPedido();
}

function motivoDeDesenlace(d: DesenlaceNovedad): string {
  return d === "cancelar" ? motivoSinPermiso("orders.cancel") : motivoSinPermiso("preparation.manage");
}

export const ModalNovedadEntrega = observer(
  ({ pedido, onClose }: { pedido: Pedido; onClose: () => void }) => {
    const [motivo, setMotivo] = useState<MotivoNovedad | undefined>(motivoInicial);
    const [detalle, setDetalle] = useState("");
    const [desenlace, setDesenlace] = useState<DesenlaceNovedad>("reintentar");

    const puedeConfirmar = puedeConfirmarNovedad(motivo, detalle);
    const desenlaceHabilitado = puedeDesenlace(desenlace);

    const confirmar = () => {
      if (!puedeConfirmar || !motivo) return;
      // Segunda comprobación, ya con el desenlace elegido: el botón está
      // deshabilitado, pero un `disabled` es una pista visual, no una guarda.
      if (!desenlaceHabilitado) return;

      const bloque = novedadTexto(motivo, detalle, desenlace);
      // El puente hace las tres cosas: anexa la nota (sin pisar las del
      // cliente), mueve el estado y avisa al hilo si el desenlace lo amerita.
      reportarNovedadEntrega(pedido.id, bloque, desenlace);
      onClose();
    };

    return (
      <Modal isOpen onClose={onClose} className="max-w-lg p-6 sm:p-8">
        <div className="mb-5 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning-50 text-warning-600 dark:bg-warning-500/10 dark:text-warning-400">
            <AlertIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Reportar novedad de entrega
            </h2>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              {pedido.numero} · {pedido.cliente}
            </p>
          </div>
        </div>

        {/* ── Motivo ───────────────────────────────────────────────────── */}
        <fieldset className="mb-5">
          <legend className="mb-2 text-xs font-medium text-gray-600 dark:text-gray-300">
            ¿Qué pasó con la entrega?
          </legend>
          <div className="space-y-1.5">
            {MOTIVOS_NOVEDAD.map((m) => {
              const activo = motivo?.id === m.id;
              const Icono = m.icono;
              return (
                <label
                  key={m.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                    activo
                      ? "border-brand-500 bg-brand-50 dark:border-brand-500/50 dark:bg-brand-500/10"
                      : "border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-white/[0.03]"
                  }`}
                >
                  {/* `sr-only` y no `appearance-none` con estilos propios: el
                      radio nativo conserva la navegación por flechas del grupo y
                      el anuncio del lector de pantalla. Solo se oculta el
                      cuadro, no el control. El círculo pintado imita el del
                      `Radio` del catálogo (`elements/form/radio`) para que esta
                      tarjeta no se lea como un control de otra librería. */}
                  <input
                    type="radio"
                    name="motivo-novedad"
                    value={m.id}
                    checked={activo}
                    onChange={() => setMotivo(m)}
                    className="sr-only"
                  />
                  <span
                    aria-hidden="true"
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-[1.25px] ${
                      activo
                        ? "border-brand-500 bg-brand-500"
                        : "border-gray-300 bg-transparent dark:border-gray-700"
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full bg-white ${activo ? "block" : "hidden"}`}
                    />
                  </span>
                  <Icono
                    className={`h-4 w-4 shrink-0 ${
                      activo ? "text-brand-500" : "text-gray-400 dark:text-gray-500"
                    }`}
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-200">{m.label}</span>
                  {m.requiereTexto && (
                    <span className="ml-auto text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">
                      requiere detalle
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </fieldset>

        {/* ── Observaciones ────────────────────────────────────────────── */}
        <div className="mb-5">
          <label
            htmlFor="novedad-detalle"
            className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-300"
          >
            Observaciones{" "}
            <span className="font-normal text-gray-400 dark:text-gray-500">
              {motivo?.requiereTexto ? "(obligatorias para este motivo)" : "(opcional)"}
            </span>
          </label>
          <Textarea
            id="novedad-detalle"
            rows={3}
            value={detalle}
            onChange={setDetalle}
            placeholder="Ej: torre B, apto 302; el portero no dejó subir."
            aria-label="Observaciones de la novedad"
          />
        </div>

        {/* ── Desenlace ────────────────────────────────────────────────── */}
        <fieldset className="mb-6">
          <legend className="mb-2 text-xs font-medium text-gray-600 dark:text-gray-300">
            ¿Qué hacemos con el pedido?
          </legend>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {DESENLACES.map((d) => {
              const activo = desenlace === d;
              const habilitado = puedeDesenlace(d);
              const Icono = DESENLACE_ICONO[d];
              return (
                <label
                  key={d}
                  title={habilitado ? DESENLACE_AYUDA[d] : motivoDeDesenlace(d)}
                  className={`flex flex-col gap-1 rounded-lg border px-3 py-2.5 transition-colors ${
                    !habilitado
                      ? "cursor-not-allowed border-gray-200 opacity-60 dark:border-gray-700"
                      : activo
                        ? "cursor-pointer border-brand-500 bg-brand-50 dark:border-brand-500/50 dark:bg-brand-500/10"
                        : "cursor-pointer border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-white/[0.03]"
                  }`}
                >
                  <input
                    type="radio"
                    name="desenlace-novedad"
                    value={d}
                    checked={activo}
                    disabled={!habilitado}
                    onChange={() => setDesenlace(d)}
                    className="sr-only"
                  />
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-[1.25px] ${
                        activo && habilitado
                          ? "border-brand-500 bg-brand-500"
                          : "border-gray-300 bg-transparent dark:border-gray-700"
                      }`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full bg-white ${
                          activo && habilitado ? "block" : "hidden"
                        }`}
                      />
                    </span>
                    <Icono
                      className={`h-4 w-4 shrink-0 ${
                        activo && habilitado
                          ? "text-brand-500"
                          : "text-gray-400 dark:text-gray-500"
                      }`}
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                      {DESENLACE_LABEL[d]}
                    </span>
                  </span>
                  {/* La consecuencia, siempre visible: elegir «cancelar» cierra
                      la venta, y eso no se deduce del texto del botón. */}
                  <span className="pl-7 text-[11px] leading-snug text-gray-500 dark:text-gray-400">
                    {DESENLACE_AYUDA[d]}
                  </span>
                  {!habilitado && (
                    <span className="pl-7 text-[11px] leading-snug text-error-500 dark:text-error-400">
                      {motivoDeDesenlace(d)}
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </fieldset>

        {/* ── Acciones ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-3">
          <Button size="sm" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          {/* El motivo va en un `<span title>` que envuelve al botón: `Button`
              no declara `title` ni reenvía props sueltas (no hay `{...rest}`),
              así que pasárselo no compila. Es el mismo patrón que usan los
              botones compuertos de este proyecto. */}
          <span
            title={
              !desenlaceHabilitado
                ? motivoDeDesenlace(desenlace)
                : !puedeConfirmar
                  ? motivo?.requiereTexto
                    ? "Falta la observación: este motivo la exige"
                    : "Elige un motivo para continuar"
                  : undefined
            }
          >
            <Button
              size="sm"
              variant={desenlace === "cancelar" ? "destructive" : "primary"}
              disabled={!puedeConfirmar || !desenlaceHabilitado}
              onClick={confirmar}
            >
              {desenlace === "cancelar" ? "Confirmar y cancelar" : "Confirmar novedad"}
            </Button>
          </span>
        </div>
      </Modal>
    );
  },
);

export default ModalNovedadEntrega;
