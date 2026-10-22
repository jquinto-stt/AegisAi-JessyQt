import React, { useState } from "react";
import { observer } from "mobx-react-lite";
import { useNavigate } from "react-router";
import { Switch } from "@/elements/form/switch";
import { organizacionStore } from "@/stores";
import { WhatsAppIcon, TelegramIcon } from "@/pages/conversaciones/components/CanalAvatar";

function InstagramIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  );
}

function FacebookIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

export interface CanalesGuardados {
  whatsapp: boolean;
  telegram: boolean;
  instagram: boolean;
  facebook: boolean;
}

/**
 * Estado de los canales tal como lo guarda esta pantalla. Lo lee también la
 * tarjeta del hub de Ajustes generales, para que ambas digan lo mismo.
 */
export function leerCanalesGuardados(): CanalesGuardados {
  const waStore = organizacionStore.esConectorActivo("pedidos", "whatsapp");
  try {
    const guardado = localStorage.getItem("pedidos_canales_integraciones");
    if (guardado) {
      const parsed = JSON.parse(guardado);
      return {
        whatsapp: parsed.whatsapp !== undefined ? Boolean(parsed.whatsapp) : waStore,
        telegram: parsed.telegram !== undefined ? Boolean(parsed.telegram) : true,
        instagram: Boolean(parsed.instagram),
        facebook: Boolean(parsed.facebook),
      };
    }
  } catch {}
  return { whatsapp: waStore, telegram: true, instagram: false, facebook: false };
}

/**
 * Pestaña de Canales e Integraciones a nivel de Organización.
 * Gestiona de forma transversal la conectividad de WhatsApp, Telegram, Instagram y Facebook.
 */
export const CanalesOrgTab: React.FC = observer(() => {
  const navigate = useNavigate();

  const [canales, setCanales] = useState<CanalesGuardados>(leerCanalesGuardados);

  const toggleCanal = (
    canal: "whatsapp" | "telegram" | "instagram" | "facebook",
    nuevoEstado: boolean
  ) => {
    setCanales((prev) => {
      const actualizado = { ...prev, [canal]: nuevoEstado };
      try {
        localStorage.setItem("pedidos_canales_integraciones", JSON.stringify(actualizado));
      } catch {}
      return actualizado;
    });

    if (canal === "whatsapp") {
      organizacionStore.setConectorActivo("pedidos", "whatsapp", nuevoEstado);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner explicativo del dominio */}
      <div className="rounded-2xl border border-secondary-100 bg-secondary-50/50 p-4.5 dark:border-white/10 dark:bg-white/[0.02]">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary-600 text-white dark:bg-accent-300 dark:text-ink-body">
            <WhatsAppIcon className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-900 dark:text-white">
              Canales de comunicación centralizados
            </h4>
            <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              Las conexiones de mensajería pertenecen a la organización. Los mensajes recibidos pueden canalizarse tanto a la bandeja de atención de Pedidos como al CRM y asistentes automatizados.
            </p>
          </div>
        </div>
      </div>

      {/* Grid de canales */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {/* WhatsApp Business */}
        <div
          className={cn(
            "relative flex flex-col justify-between rounded-3xl border bg-white p-6 shadow-sm transition-all dark:bg-gray-900/60",
            canales.whatsapp
              ? "border-2 border-emerald-500/40 shadow-emerald-500/5 hover:border-emerald-500"
              : "border-gray-200 opacity-75 dark:border-gray-800/60"
          )}
        >
          <div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-2xl",
                    canales.whatsapp
                      ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                      : "bg-gray-100 text-gray-500 dark:bg-gray-800"
                  )}
                >
                  <WhatsAppIcon className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-gray-900 dark:text-white">
                    WhatsApp Business
                  </h4>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Bandeja y notificaciones
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <span
                  className={cn(
                    "px-2.5 py-0.5 rounded-lg text-xs font-bold",
                    canales.whatsapp
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300"
                      : "bg-gray-100 text-gray-500 dark:bg-gray-800"
                  )}
                >
                  {canales.whatsapp ? "Activo" : "Inactivo"}
                </span>
                <Switch
                  checked={canales.whatsapp}
                  color="blue"
                  onChange={(val) => toggleCanal("whatsapp", val)}
                  aria-label="Activar WhatsApp Business"
                />
              </div>
            </div>

            <p className="mt-3.5 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
              Conexión para recepción de pedidos, confirmaciones automáticas y atención de clientes vía WhatsApp Cloud API o Webhook.
            </p>
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4 dark:border-gray-800">
            <span className="text-xs text-gray-500 font-normal">
              {canales.whatsapp ? "Sincronización activa" : "Canal desconectado"}
            </span>
            <button
              type="button"
              disabled={!canales.whatsapp}
              onClick={() =>
                navigate("/conversaciones/config?canal=whatsapp&from=/configuracion?tab=canales")
              }
              className="px-3.5 py-1.5 rounded-xl border border-gray-200 hover:border-brand-500 text-gray-800 hover:text-brand-600 font-bold text-xs transition-colors disabled:opacity-50 cursor-pointer dark:border-gray-700 dark:text-gray-300"
            >
              Configurar bot / webhook
            </button>
          </div>
        </div>

        {/* Telegram Bot */}
        <div
          className={cn(
            "relative flex flex-col justify-between rounded-3xl border bg-white p-6 shadow-sm transition-all dark:bg-gray-900/60",
            canales.telegram
              ? "border-2 border-sky-500/40 shadow-sky-500/5 hover:border-sky-500"
              : "border-gray-200 opacity-75 dark:border-gray-800/60"
          )}
        >
          <div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-2xl",
                    canales.telegram
                      ? "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400"
                      : "bg-gray-100 text-gray-500 dark:bg-gray-800"
                  )}
                >
                  <TelegramIcon className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-gray-900 dark:text-white">
                    Telegram Bot
                  </h4>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Bot conversacional
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <span
                  className={cn(
                    "px-2.5 py-0.5 rounded-lg text-xs font-bold",
                    canales.telegram
                      ? "bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300"
                      : "bg-gray-100 text-gray-500 dark:bg-gray-800"
                  )}
                >
                  {canales.telegram ? "Activo" : "Inactivo"}
                </span>
                <Switch
                  checked={canales.telegram}
                  color="blue"
                  onChange={(val) => toggleCanal("telegram", val)}
                  aria-label="Activar Telegram Bot"
                />
              </div>
            </div>

            <p className="mt-3.5 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
              Recepción automatizada de pedidos, catálogo interactivo y generación de enlaces de pago vía Telegram Bot API.
            </p>
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4 dark:border-gray-800">
            <span className="text-xs text-gray-500 font-normal">
              {canales.telegram ? "Bot en línea" : "Bot inactivo"}
            </span>
            <span className="text-xs font-semibold text-sky-600 dark:text-sky-400">
              Conectado por token
            </span>
          </div>
        </div>

        {/* Instagram Direct */}
        <div
          className={cn(
            "relative flex flex-col justify-between rounded-3xl border bg-white p-6 shadow-sm transition-all dark:bg-gray-900/60",
            canales.instagram
              ? "border-2 border-pink-500/40 shadow-pink-500/5 hover:border-pink-500"
              : "border-gray-200 opacity-75 dark:border-gray-800/60"
          )}
        >
          <div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-2xl",
                    canales.instagram
                      ? "bg-pink-50 text-pink-600 dark:bg-pink-500/10 dark:text-pink-400"
                      : "bg-gray-100 text-gray-500 dark:bg-gray-800"
                  )}
                >
                  <InstagramIcon className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-gray-900 dark:text-white">
                    Instagram Direct
                  </h4>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Mensajería directa (DM)
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <span
                  className={cn(
                    "px-2.5 py-0.5 rounded-lg text-xs font-bold",
                    canales.instagram
                      ? "bg-pink-100 text-pink-800 dark:bg-pink-500/20 dark:text-pink-300"
                      : "bg-gray-100 text-gray-500 dark:bg-gray-800"
                  )}
                >
                  {canales.instagram ? "Activo" : "Inactivo"}
                </span>
                <Switch
                  checked={canales.instagram}
                  color="blue"
                  onChange={(val) => toggleCanal("instagram", val)}
                  aria-label="Activar Instagram Direct"
                />
              </div>
            </div>

            <p className="mt-3.5 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
              Recepción de pedidos por mensajes directos (DM) y catálogo interactivo en historias y chat de Meta.
            </p>
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4 dark:border-gray-800">
            <span className="text-xs text-gray-500 font-normal">
              Meta Graph API
            </span>
            <button
              type="button"
              disabled={!canales.instagram}
              className="px-3.5 py-1.5 rounded-xl border border-gray-200 hover:border-brand-500 text-gray-800 hover:text-brand-600 font-bold text-xs transition-colors disabled:opacity-50 cursor-pointer dark:border-gray-700 dark:text-gray-300"
            >
              Conectar cuenta
            </button>
          </div>
        </div>

        {/* Facebook Messenger */}
        <div
          className={cn(
            "relative flex flex-col justify-between rounded-3xl border bg-white p-6 shadow-sm transition-all dark:bg-gray-900/60",
            canales.facebook
              ? "border-2 border-indigo-500/40 shadow-indigo-500/5 hover:border-indigo-500"
              : "border-gray-200 opacity-75 dark:border-gray-800/60"
          )}
        >
          <div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-2xl",
                    canales.facebook
                      ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400"
                      : "bg-gray-100 text-gray-500 dark:bg-gray-800"
                  )}
                >
                  <FacebookIcon className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-gray-900 dark:text-white">
                    Facebook Messenger
                  </h4>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Página de negocio y comentarios
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <span
                  className={cn(
                    "px-2.5 py-0.5 rounded-lg text-xs font-bold",
                    canales.facebook
                      ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-300"
                      : "bg-gray-100 text-gray-500 dark:bg-gray-800"
                  )}
                >
                  {canales.facebook ? "Activo" : "Inactivo"}
                </span>
                <Switch
                  checked={canales.facebook}
                  color="blue"
                  onChange={(val) => toggleCanal("facebook", val)}
                  aria-label="Activar Facebook Messenger"
                />
              </div>
            </div>

            <p className="mt-3.5 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
              Gestión de ventas, respuestas a comentarios de publicaciones y sincronización con Facebook Messenger.
            </p>
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4 dark:border-gray-800">
            <span className="text-xs text-gray-500 font-normal">
              Meta Business Suite
            </span>
            <button
              type="button"
              disabled={!canales.facebook}
              className="px-3.5 py-1.5 rounded-xl border border-gray-200 hover:border-brand-500 text-gray-800 hover:text-brand-600 font-bold text-xs transition-colors disabled:opacity-50 cursor-pointer dark:border-gray-700 dark:text-gray-300"
            >
              Conectar página
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
