import { useState } from "react";

import { Button } from "@/elements/ui/button";
import { Input } from "@/elements/form/input";
import { Switch } from "@/elements/form/switch";
import { Modal } from "@/elements/ui/modal";
import {
  CheckIcon,
  EnvelopeIcon,
  EyeIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/outline";
import { WhatsAppIcon } from "@/pages/conversaciones/components/CanalAvatar";
import {
  guardarNotificaciones,
  leerNotificaciones,
  type ConfigNotificaciones,
  type ReglaNotificacion,
} from "./reglas";

/**
 * Reglas de notificaciones — dentro de «Opciones de mensajería».
 *
 * ── Cómo está armada ──────────────────────────────────────────────────────
 *
 * 1. **WhatsApp de Servicio al Cliente**: el número que se comparte con el
 *    cliente final, editable en el sitio.
 * 2. **Control de notificaciones**: una fila por evento, con interruptor
 *    maestro, dos canales (correo y WhatsApp) y previsualización de la
 *    plantilla de cada canal.
 *
 * ── Las dos cosas que el sistema no puede hacer ───────────────────────────
 *
 * **No envía.** Ni correo ni WhatsApp: aquí solo se guarda la intención. Y **no
 * cobra**: el aviso de costo por mensaje es el del producto, pero no hay
 * billetera que descontar, así que el modal lo dice en vez de dar por hecho un
 * cobro que nunca ocurre.
 */

type Canal = "correo" | "whatsapp";

const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");

export const ReglasNotificaciones = () => {
  const [config, setConfig] = useState<ConfigNotificaciones>(leerNotificaciones);
  const [editandoNumero, setEditandoNumero] = useState(false);
  const [numeroBorrador, setNumeroBorrador] = useState(config.numeroServicio);

  /** Regla que espera confirmación para encender WhatsApp. */
  const [pendienteWhatsapp, setPendienteWhatsapp] = useState<string | null>(null);
  /** Regla cuya plantilla se está previsualizando. */
  const [previa, setPrevia] = useState<{ regla: ReglaNotificacion; canal: Canal } | null>(null);

  const aplicar = (nueva: ConfigNotificaciones) => {
    setConfig(nueva);
    guardarNotificaciones(nueva);
  };

  const cambiarRegla = (id: string, cambios: Partial<ReglaNotificacion>) => {
    aplicar({
      ...config,
      reglas: config.reglas.map((r) => (r.id === id ? { ...r, ...cambios } : r)),
    });
  };

  const alternarCanal = (regla: ReglaNotificacion, canal: Canal) => {
    // WhatsApp exige la confirmación de costo la PRIMERA vez, y solo la primera:
    // pedirla en cada interruptor convertiría un ajuste en un trámite.
    if (canal === "whatsapp" && !config.whatsappActivado && !regla.whatsapp) {
      setPendienteWhatsapp(regla.id);
      return;
    }
    cambiarRegla(regla.id, { [canal]: !regla[canal] } as Partial<ReglaNotificacion>);
  };

  const confirmarWhatsapp = () => {
    if (!pendienteWhatsapp) return;
    aplicar({
      ...config,
      whatsappActivado: true,
      reglas: config.reglas.map((r) =>
        r.id === pendienteWhatsapp ? { ...r, whatsapp: true } : r,
      ),
    });
    setPendienteWhatsapp(null);
  };

  return (
    <>
      <section className="mt-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900/60 sm:p-7">
        <h3 className="text-[17px] font-bold text-gray-900 dark:text-white">
          Reglas de notificaciones
        </h3>
        <p className="mt-1 text-[13px] leading-5 text-gray-600 dark:text-gray-400">
          Configura y administra las notificaciones que quieres enviar de manera automatizada con
          las órdenes de tu negocio.
        </p>

        {/* ── WHATSAPP DE SERVICIO AL CLIENTE ─────────────────────────────── */}
        <div className="mt-5 rounded-2xl bg-[#F6F7F9] p-5 dark:bg-white/[0.03]">
          <p className="text-[14px] font-bold text-gray-900 dark:text-white">
            WhatsApp de Servicio al Cliente
          </p>
          <p className="mt-1 text-[12.5px] leading-5 text-gray-600 dark:text-gray-400">
            Todos los mensajes automáticos de WhatsApp van acompañados de tu número de servicio al
            cliente, para que tus compradores te contacten fácilmente.
          </p>

          <div className="mt-3 max-w-md">
            <label
              htmlFor="num-servicio"
              className="text-[12px] font-semibold text-gray-700 dark:text-gray-300"
            >
              Número de WhatsApp
            </label>
            <div className="mt-1.5 flex items-center gap-2">
              <Input
                id="num-servicio"
                value={numeroBorrador}
                disabled={!editandoNumero}
                onChange={(e) => setNumeroBorrador(e.target.value)}
              />
              {editandoNumero ? (
                <>
                  <Button
                    size="sm"
                    onClick={() => {
                      aplicar({ ...config, numeroServicio: numeroBorrador.trim() });
                      setEditandoNumero(false);
                    }}
                  >
                    Guardar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setNumeroBorrador(config.numeroServicio);
                      setEditandoNumero(false);
                    }}
                  >
                    Cancelar
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setNumeroBorrador(config.numeroServicio);
                    setEditandoNumero(true);
                  }}
                >
                  <PencilSquareIcon className="mr-1.5 h-4 w-4" aria-hidden="true" />
                  Editar
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* ── CONTROL DE NOTIFICACIONES ───────────────────────────────────── */}
        <div className="mt-6">
          <p className="text-[14px] font-bold text-gray-900 dark:text-white">
            Control de Notificaciones
          </p>
          <p className="mt-1 text-[12.5px] text-gray-600 dark:text-gray-400">
            Selecciona las notificaciones que quieres enviar a tus clientes.
          </p>

          {/* Cabecera de canales. En pantallas angostas se oculta: las filas
              llevan el canal escrito para no depender de dos iconos sueltos. */}
          <div className="mt-3 hidden items-center justify-end gap-2 pr-1 sm:flex">
            <span className="w-16 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              Correo
            </span>
            <span className="w-16 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              WhatsApp
            </span>
            <span className="w-9" aria-hidden="true" />
          </div>

          <ul className="mt-1 space-y-2">
            {config.reglas.map((regla) => (
              <li
                key={regla.id}
                className={cx(
                  "flex flex-wrap items-center gap-3 rounded-xl border p-3 transition-colors sm:flex-nowrap",
                  regla.activa
                    ? "border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900/40"
                    : "border-gray-100 bg-gray-50/60 dark:border-gray-800/60 dark:bg-white/[0.02]",
                )}
              >
                <Switch
                  checked={regla.activa}
                  onChange={(val) => cambiarRegla(regla.id, { activa: val })}
                  aria-label={`Activar ${regla.titulo}`}
                />

                <span
                  className={cx(
                    "min-w-0 flex-1 text-[13px]",
                    regla.activa
                      ? "font-semibold text-gray-900 dark:text-white"
                      : "text-gray-500 dark:text-gray-400",
                  )}
                >
                  {regla.titulo}
                </span>

                <div className="flex items-center gap-2">
                  {(["correo", "whatsapp"] as Canal[]).map((canal) => {
                    const activo = regla.activa && regla[canal];
                    const Icono = canal === "correo" ? EnvelopeIcon : WhatsAppIcon;
                    return (
                      <button
                        key={canal}
                        type="button"
                        disabled={!regla.activa}
                        onClick={() => alternarCanal(regla, canal)}
                        aria-pressed={regla[canal]}
                        aria-label={`${regla[canal] ? "Desactivar" : "Activar"} ${canal} para ${regla.titulo}`}
                        title={`${canal === "correo" ? "Correo" : "WhatsApp"}: ${regla[canal] ? "activo" : "inactivo"}`}
                        className={cx(
                          "flex h-9 w-16 items-center justify-center gap-1.5 rounded-lg border text-[11px] font-bold transition-colors",
                          activo
                            ? "border-accent-300 bg-accent-50 text-accent-700 dark:border-accent-500/40 dark:bg-accent-500/15 dark:text-accent-300"
                            : "border-gray-200 bg-white text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-500",
                          !regla.activa && "cursor-not-allowed opacity-50",
                          regla.activa && "cursor-pointer hover:border-brand-400",
                        )}
                      >
                        <Icono className="h-3.5 w-3.5" />
                        {activo && <CheckIcon className="h-3 w-3" aria-hidden="true" />}
                        <span className="sm:hidden">{canal === "correo" ? "Correo" : "WA"}</span>
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => setPrevia({ regla, canal: "correo" })}
                    aria-label={`Previsualizar la notificación «${regla.titulo}»`}
                    title="Previsualizar la plantilla"
                    className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:border-brand-400 hover:text-brand-600 dark:border-gray-700 dark:text-gray-400"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <p className="mt-3 text-[12px] leading-5 text-gray-500 dark:text-gray-400">
            Estas reglas se guardan en tu organización, pero todavía no envían nada: no hay motor
            de envío ni cobro por mensaje en esta versión.
          </p>
        </div>
      </section>

      {/* ── CONFIRMACIÓN DE WHATSAPP ──────────────────────────────────────── */}
      <Modal
        isOpen={Boolean(pendienteWhatsapp)}
        onClose={() => setPendienteWhatsapp(null)}
        className="max-w-md p-6"
      >
        {/* `pr-10` deja sitio al botón de cerrar del modal, que va absoluto
            arriba a la derecha: sin él, el título se corta contra la X. */}
        <h3 className="pr-10 text-[16px] font-bold text-gray-900 dark:text-white">
          ¿Quieres activar las notificaciones por WhatsApp?
        </h3>
        <p className="mt-2 text-[13px] leading-5 text-gray-600 dark:text-gray-400">
          Al activar las notificaciones de WhatsApp se realiza un cobro de{" "}
          <strong className="font-semibold text-gray-900 dark:text-white">$197 COP</strong> por cada
          mensaje enviado, que se descuenta del saldo de la billetera.
        </p>
        <p className="mt-2 text-[12px] leading-5 text-amber-700 dark:text-amber-300">
          En esta versión no hay billetera ni motor de envío: aceptar activa el canal en la
          configuración, no genera cobros.
        </p>

        <div className="mt-5 flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => setPendienteWhatsapp(null)}>
            Cancelar
          </Button>
          <Button size="sm" onClick={confirmarWhatsapp}>
            <CheckIcon className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Sí, Activar Notificaciones
          </Button>
        </div>
      </Modal>

      {/* ── PREVISUALIZACIÓN ──────────────────────────────────────────────── */}
      <Modal
        isOpen={Boolean(previa)}
        onClose={() => setPrevia(null)}
        className="max-w-2xl p-6"
      >
        <h3 className="pr-10 text-[16px] font-bold text-gray-900 dark:text-white">
          Previsualiza las Notificaciones
        </h3>
        <p className="mt-1 text-[13px] leading-5 text-gray-600 dark:text-gray-400">
          Configura reglas para que el sistema envíe esta notificación por correo y por WhatsApp.
        </p>

        <div className="mt-4 flex gap-1 border-b border-gray-200 dark:border-gray-800">
          {(["correo", "whatsapp"] as Canal[]).map((canal) => (
            <button
              key={canal}
              type="button"
              onClick={() => previa && setPrevia({ ...previa, canal })}
              aria-pressed={previa?.canal === canal}
              className={cx(
                "-mb-px cursor-pointer border-b-2 px-4 py-2 text-[13px] font-semibold capitalize transition-colors",
                previa?.canal === canal
                  ? "border-brand-500 text-brand-700 dark:text-brand-300"
                  : "border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white",
              )}
            >
              {canal === "correo" ? "Correo" : "WhatsApp"}
            </button>
          ))}
        </div>

        <div className="mt-4">
          {previa?.canal === "correo" ? (
            <div className="rounded-2xl border border-gray-200 p-5 dark:border-gray-800">
              <p className="text-[11px] uppercase tracking-wide text-gray-400">Asunto</p>
              <p className="mt-0.5 text-[14px] font-bold text-gray-900 dark:text-white">
                {previa.regla.titulo}
              </p>
              <hr className="my-3 border-gray-100 dark:border-gray-800" />
              <p className="whitespace-pre-line text-[13px] leading-6 text-gray-700 dark:text-gray-300">
                {previa.regla.plantillaCorreo}
              </p>
              <p className="mt-4 text-[11px] text-gray-400">
                Este es un mensaje automático, no respondas a este correo.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl bg-[#E5DDD5] p-5 dark:bg-gray-800">
              <div className="ml-auto max-w-[85%] rounded-xl rounded-tr-none bg-[#DCF8C6] p-3 shadow-sm dark:bg-emerald-900/40">
                <p className="whitespace-pre-line text-[13px] leading-5 text-gray-800 dark:text-gray-100">
                  {previa?.regla.plantillaWhatsapp}
                </p>
                <p className="mt-2 border-t border-black/10 pt-1.5 text-[11px] text-gray-600 dark:border-white/10 dark:text-gray-300">
                  Escribe a nuestro WhatsApp de Servicio al Cliente: {config.numeroServicio}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-5 flex justify-end">
          <Button size="sm" variant="outline" onClick={() => setPrevia(null)}>
            Cerrar
          </Button>
        </div>
      </Modal>
    </>
  );
};

export default ReglasNotificaciones;
