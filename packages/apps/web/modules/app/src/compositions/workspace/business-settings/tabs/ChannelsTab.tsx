import React from "react";
import { Smartphone, Globe, Store } from "lucide-react";
import { Button, Toggle } from "@/elements";
import { WhatsAppConnectPanel } from "@/compositions/shared/WhatsAppConnectPanel";
import { SettingsRow, SettingsRowGroup, SettingsCard, SettingsSection, SettingsSubPanel } from "../SettingsSection";
import type { BusinessSettingsTabForm } from "../hooks/useBusinessSettingsForm";

/* ── SECCIÓN 2: CANALES DE ENTRADA ───────────────────────────────────
 * Which sales channels are live for this location.
 * El encabezado de la sección lo pinta el modal desde el catálogo.
 *
 * ⚠️ Este tab monta **su propia** `SettingsCard`: los grupos van como hijos
 * directos de ella, para que su `divide-y` ponga la línea entre grupos.
 * ────────────────────────────────────────────────────────────────── */
export const ChannelsTab: React.FC<{ form: BusinessSettingsTabForm }> = ({ form }) => {
  const { enableWhatsapp, setEnableWhatsapp, enableWeb, setEnableWeb, enablePos, setEnablePos, isWhatsAppWidgetEnabled, setIsWhatsAppWidgetEnabled, isWhatsAppConnected, isWhatsAppDemo, whatsappRefs, isConnectingSim, handleConfirmWhatsAppConnection, handleDisconnectWhatsApp, contactPhone, business, updateBusiness, slug, setActiveTab, name } = form;

  return (
    <SettingsCard>
      <SettingsSection>
        <SettingsRowGroup>
          {/* WhatsApp Business */}
          <SettingsRow
            icon={Smartphone}
            title="WhatsApp Business"
            description={
              <>
                Recepción de pedidos conversacionales asistidos por IA oficial.
                <span className="mt-1 block text-theme-xs text-gray-400 dark:text-gray-500">
                  Teléfono vinculado:{" "}
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {contactPhone || "Sin asignar"}
                  </span>
                </span>
              </>
            }
            action={
              <Toggle
                intent="business.channel.toggle"
                checked={enableWhatsapp}
                onChange={(val) => {
                  setEnableWhatsapp(val);
                  // El canal encendido vive en la tienda (`channels.whatsapp`). La
                  // clave global `necto_whatsapp_channel_enabled` se escribía aquí
                  // y ya no la lee nadie: era el mismo bug que la conexión —apagar
                  // WhatsApp en una tienda lo apagaba en todas las del navegador—.
                  if (business?.id && business.id !== "new") {
                    updateBusiness(business.id, {
                      channels: {
                        ...business.channels,
                        whatsapp: val,
                      },
                    });
                  }
                }}
              />
            }
            bodyClassName="sm:pl-0"
          >
            {enableWhatsapp && (
              <>
                {/*
                  El canal se presenta **dentro** de la sección, no detrás de un
                  botón. Antes un "Conectar WhatsApp" abría un sub-modal: había
                  que hacer clic para ver de qué canal se trataba y la sección
                  quedaba vacía de contenido. Ahora el panel forma parte de la
                  presentación y cambia de estado en el sitio —conectado o no—,
                  sin abrir nada.

                  `rounded-xl` + `overflow-hidden` porque el panel trae su propio
                  fondo a sangre (el verde del canal): sin recortarlo asomaría por
                  las esquinas.
                */}
                <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
                  <WhatsAppConnectPanel
                    onConnectDemo={handleConfirmWhatsAppConnection}
                    isConnecting={isConnectingSim}
                    isConnected={isWhatsAppConnected}
                    isDemo={isWhatsAppDemo}
                    onDisconnect={handleDisconnectWhatsApp}
                  />
                </div>

                {/*
                  Datos que Necto guarda de la conexión. Son la contrapartida de
                  la autorización con Meta: si están vacíos es que todavía no
                  ocurrió, y eso es información útil, no un hueco que esconder.

                  ⚠️ Los rótulos iban en `uppercase tracking-wider`: la versalita
                  espaciada convertía tres etiquetas de dato en tres gritos. En
                  minúscula normal se leen como lo que son — rótulos.
                */}
                {isWhatsAppConnected && (
                  <SettingsSubPanel>
                    <p className="text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                      Datos de la conexión
                    </p>
                    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      {[
                        { term: "Número que atiende", value: whatsappRefs?.displayPhoneNumber },
                        { term: "Cuenta de negocio (WABA)", value: whatsappRefs?.wabaId },
                        { term: "Identificador del número", value: whatsappRefs?.phoneNumberId },
                      ].map(row => (
                        <div key={row.term} className="min-w-0">
                          <dt className="text-theme-xs font-medium text-gray-400 dark:text-gray-500">
                            {row.term}
                          </dt>
                          <dd
                            className={`mt-0.5 truncate text-theme-sm font-semibold ${
                              row.value
                                ? "text-gray-800 dark:text-gray-100"
                                : "text-gray-400 dark:text-gray-500"
                            }`}
                            title={row.value || undefined}
                          >
                            {row.value || "Se completa al autorizar con Meta"}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </SettingsSubPanel>
                )}

                {/* Puente al asistente: el canal y el bot son dos ajustes
                    distintos, y este es el atajo entre ellos.

                    ⚠️ Es un `Button variant="ghost"` del catálogo, no un `<button>`
                    suelto. Pero **no** puede ser `Link`: esto no navega a otra
                    página, cambia de pestaña dentro del propio modal, y el
                    catálogo reserva `Link` para navegación. El `className` anula
                    la caja del ghost (`h-auto`, `px-0`, `py-0`,
                    `hover:bg-transparent`) para que se lea como el enlace de texto
                    que era, conservando el tono de marca. */}
                <Button
                  variant="ghost"
                  intent="business.channel.assistant.link"
                  onClick={() => setActiveTab("assistant")}
                  className="h-auto rounded-none px-0 py-0 text-theme-xs font-semibold text-brand-500 hover:bg-transparent hover:text-brand-600 dark:text-brand-500 dark:hover:bg-transparent dark:hover:text-brand-600"
                >
                  Configurar el asistente IA que responde en este canal →
                </Button>

                {/* Widget flotante */}
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-theme-sm font-medium text-gray-800 dark:text-white">
                      Ventana de chat flotante
                    </p>
                    <p className="mt-0.5 text-theme-xs text-gray-500 dark:text-gray-400">
                      Muestra un botón de chat flotante en la tienda web para abrir WhatsApp directamente.
                    </p>
                  </div>
                  <Toggle
                    intent="business.whatsapp.widget.toggle"
                    checked={isWhatsAppWidgetEnabled}
                    onChange={(val) => {
                      setIsWhatsAppWidgetEnabled(val);
                      try {
                        localStorage.setItem("necto_whatsapp_widget_enabled", JSON.stringify(val));
                      } catch (e) {}
                    }}
                  />
                </div>
              </>
            )}
          </SettingsRow>

          {/* Tienda Web */}
          <SettingsRow
            icon={Globe}
            title="Tienda web y catálogo en línea"
            description={
              <>
                Catálogo digital interactivo con carrito y pago directo.
                <span className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-theme-xs font-medium text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                  <Globe className="w-3.5 h-3.5 text-gray-400" />
                  <span>necto.app/{slug || name.toLowerCase().replace(/\s+/g, "-")}</span>
                </span>
              </>
            }
            action={
              <Toggle
                intent="business.channel.toggle"
                checked={enableWeb}
                onChange={setEnableWeb}
              />
            }
          />

          {/* POS / Mostrador */}
          <SettingsRow
            icon={Store}
            title="Punto de venta (POS) / mostrador"
            description="Toma de comandas y ventas presenciales en salón o caja registradora."
            action={
              <Toggle
                intent="business.channel.toggle"
                checked={enablePos}
                onChange={setEnablePos}
              />
            }
          />
        </SettingsRowGroup>
      </SettingsSection>
    </SettingsCard>
  );
};
