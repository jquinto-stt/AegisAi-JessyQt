import React from "react";
import {
  Bot,
  BookOpen,
  FileText,
  HelpCircle,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Store,
  Upload,
  UserCheck,
  CheckCircle2,
} from "lucide-react";
import { Button, Field, Textarea, Toggle } from "@/elements";
import { botSubTabsFor, CAPABILITY_SOURCES, isCapabilitySourceAvailable, type BotSubTab } from "../business-settings.constants";
import {
  SettingsCard,
  SettingsCounter,
  SettingsFieldGrid,
  SettingsGroupLabel,
  SettingsHint,
  SettingsLabel,
  SettingsRow,
  SettingsRowGroup,
  SettingsSection,
  SettingsStatusPill,
  SettingsSubPanel,
  SettingsTag,
  settingsControlClass,
  settingsControlClassCompact,
  settingsUploadAction,
} from "../SettingsSection";
import { CustomCapabilitiesEditor } from "./CustomCapabilitiesEditor";
import type { BotPersonality } from "../../../../context/BusinessContext";
import type { BusinessSettingsTabForm } from "../hooks/useBusinessSettingsForm";

/* ── TAB 3: ASISTENTE DE WHATSAPP IA ─────────────────────────────────
 * The intelligence layer: identity, knowledge sources, custom capabilities,
 * OMS order rules, human handoff, availability and customer experience.
 *
 * ⚠️ Este tab monta **sus propias** `SettingsCard` —una por apartado— y por eso
 * devuelve un `<div>`, no un fragmento: entre la barra de apartados y cada panel
 * hay hermanos que no son grupos de una tarjeta. La barra queda **fuera** de la
 * tarjeta a propósito; dentro, su `divide-y` la habría tratado como un grupo más
 * y le habría puesto una línea debajo.
 *
 * ⚠️ La barra de apartados es contrato: `role="tablist"` +
 * `aria-label="Apartados del asistente"` + un `button[role=tab]` con su `<span>`
 * por apartado. El guardián de la sección la mide (seis apartados, sin scroll
 * horizontal, ninguno recortado, ninguna etiqueta truncada) y el de
 * notificaciones la recorre. No renombrar ni reestructurar sin actualizarlos.
 *
 * ── Lo que cambió aquí ──────────────────────────────────────────────────
 * Cinco tarjetas apiladas (una por origen de conocimiento) se volvieron **una**
 * tarjeta con cinco filas separadas por una línea: es el patrón de la
 * referencia, y es lo que hace que el apartado se lea como un formulario y no
 * como una pila de cajas. La fila "icono + título + distintivos + interruptor +
 * cuerpo desplegable" vivía copiada a mano seis veces con dos sangrías y dos
 * pesos tipográficos distintos; ahora es `SettingsRow`.
 * ────────────────────────────────────────────────────────────────── */

/**
 * Una capacidad de un origen: nombre, procedencia, explicación y su interruptor.
 *
 * Estaba escrita a mano **nueve** veces (catálogo ×2, negocio, inventario,
 * pedidos ×4, atención humana) con dos sangrías y dos pesos distintos, así que
 * la misma lista se leía distinto según el origen. Una sola definición.
 */
const CapabilityRow: React.FC<{
  label: string;
  description: string;
  intent: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}> = ({ label, description, intent, checked, onChange }) => (
  <div className="flex items-center justify-between gap-3 px-4 py-3">
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-theme-sm font-medium text-gray-900 dark:text-white">{label}</p>
        <SettingsTag>Nativa (Tool)</SettingsTag>
      </div>
      <p className="text-theme-xs text-gray-500 dark:text-gray-400">{description}</p>
    </div>
    <Toggle intent={intent} checked={checked} onChange={onChange} />
  </div>
);

/** Lista de capacidades de un origen, con su rótulo opcional. */
const CapabilityList: React.FC<{ label?: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <div className="space-y-2">
    {label && <SettingsGroupLabel>{label}</SettingsGroupLabel>}
    <SettingsRowGroup>{children}</SettingsRowGroup>
  </div>
);

/** Acción de archivo dentro de un sub-panel: nota a la izquierda, botón a la derecha. */
const UploadRow: React.FC<{
  hint: string;
  action: string;
  accept: string;
}> = ({ hint, action, accept }) => (
  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200/60 pt-3 dark:border-gray-700">
    <SettingsHint>{hint}</SettingsHint>
    <label className={settingsUploadAction}>
      <Upload className="h-3.5 w-3.5" />
      <span>{action}</span>
      <input type="file" accept={accept} className="hidden" />
    </label>
  </div>
);

export const WhatsAppBotTab: React.FC<{ form: BusinessSettingsTabForm }> = ({ form }) => {
  const { enableWhatsapp, botSubTab, setBotSubTab, botName, setBotName, botTone, setBotTone, botPersonality, setBotPersonality, responseStyle, setResponseStyle, emojiFrequency, setEmojiFrequency, knowsCatalog, setKnowsCatalog, knowsBusinessInfo, setKnowsBusinessInfo, knowsFaq, setKnowsFaq, knowsPolicies, setKnowsPolicies, knowsInventoryQuery, setKnowsInventoryQuery, customCapabilities, addingCapSource, setAddingCapSource, newCapLabel, setNewCapLabel, newCapDesc, setNewCapDesc, newCapInstruction, setNewCapInstruction, handleAddCustomCapability, handleToggleCustomCapability, handleDeleteCustomCapability, orderCreationMode, setOrderCreationMode, isAutoConfirmOrders, setIsAutoConfirmOrders, autoConfirmMaxAmount, setAutoConfirmMaxAmount, autoConfirmRequireStock, setAutoConfirmRequireStock, autoConfirmRequireCompleteData, setAutoConfirmRequireCompleteData, autoConfirmExcludeRestricted, setAutoConfirmExcludeRestricted, isHandoffEnabled, setIsHandoffEnabled, handoffToHumanMessage, setHandoffToHumanMessage, handoffTarget, setHandoffTarget, handoffBehavior, setHandoffBehavior, isWelcomeEnabled, setIsWelcomeEnabled, welcomeMessage, setWelcomeMessage, isClosedHoursEnabled, setIsClosedHoursEnabled, closedHoursMessage, setClosedHoursMessage, allowOrdersOutsideHours, setAllowOrdersOutsideHours, expShowCatalogCards, setExpShowCatalogCards, expShowCategories, setExpShowCategories, expShowPictures, setExpShowPictures, expInlineCart, setExpInlineCart, expPreConfirmationSummary, setExpPreConfirmationSummary, setEnableWhatsapp, catalogDataSource, setCatalogDataSource, faqDataSource, setFaqDataSource, policiesDataSource, setPoliciesDataSource, intentCatalog, setIntentCatalog, intentPrice, setIntentPrice, intentStock, setIntentStock, intentCreateOrder, setIntentCreateOrder, intentTrackOrder, setIntentTrackOrder, intentModifyOrder, setIntentModifyOrder, intentCancelOrder, setIntentCancelOrder, intentHoursLocation, setIntentHoursLocation, intentHumanAgent, setIntentHumanAgent, handleCancelAddCapability, business, updateBusiness, setActiveTab   } = form;

  /*
    Qué módulos tiene contratados la sede. Los orígenes de capacidades que
    dependen de un módulo se derivan de aquí en vez de que cada bloque pregunte
    por el suyo: la regla estaba escrita a mano **sólo** para inventario, y
    pedidos rotulaba "Pedidos conectados" aunque el módulo estuviera apagado.
  */
  const inventarioActivo = isCapabilitySourceAvailable("inventory", business?.activeModules);
  const pedidosActivo = isCapabilitySourceAvailable("orders", business?.activeModules);

  /*
    El apartado activo se **deriva**, no se corrige con un efecto: si el módulo
    que lo respalda se apaga —o un enlace guardado apunta a "Reglas de pedidos"
    de una sede sin Pedidos—, cae al primero disponible en vez de quedarse en un
    apartado que ya no está en la barra. Derivar evita el render intermedio con
    el apartado fantasma que tendría un `useEffect` correctivo.
  */
  const subTabs = botSubTabsFor(business?.activeModules);
  const activeSubTab: BotSubTab =
    subTabs.find((t) => t.id === botSubTab)?.id ?? subTabs[0]?.id ?? "identity";

  /*
    Los ocho orígenes de conocimiento comparten la misma forma: icono, título,
    descripción, un distintivo de estado, un contador de capacidades activas y
    un interruptor que despliega el cuerpo. El contador se deriva de los datos
    para que las seis tarjetas no repitan a mano la misma cuenta.
  */
  const capabilityCount = (sourceId: string, natives: number, activeNatives: number) => {
    const custom = customCapabilities.filter((c) => c.sourceId === sourceId);
    const total = natives + custom.length;
    const active = activeNatives + custom.filter((c) => c.enabled).length;
    // Sin nada que contar no se inventa un denominador: FAQ y políticas no
    // aportan capacidades nativas, y el `Math.max(1, …)` que había aquí para
    // esquivar el "0 / 0" acababa rotulando "0 / 1" —una capacidad inexistente—.
    return total === 0 ? "Sin capacidades" : `${active} / ${total} capacidades activas`;
  };

  return (
    <div className="space-y-6">
      {!enableWhatsapp ? (
        <SettingsCard>
          <SettingsSection className="py-10 text-center" bodyClassName="mx-auto max-w-md space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[10.5px] bg-brand-50 text-brand-500 dark:bg-brand-950/40 dark:text-brand-400">
              <Bot className="h-6 w-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-theme-xl font-bold leading-tight tracking-tight text-secondary-600 dark:text-white">
                Activa WhatsApp Business para configurar el asistente
              </h3>
              <p className="text-theme-sm leading-relaxed text-gray-500 dark:text-gray-400">
                El asistente opera sobre los mensajes de WhatsApp. Activa el canal para calibrar su identidad, catálogo y reglas de toma de pedidos.
              </p>
            </div>

            <div className="flex flex-col items-center justify-center gap-3 pt-2 sm:flex-row">
              {/* Los dos son `Button` del catálogo. El icono entra por
                  `startIcon`, no como hijo, para que herede el slot del catálogo
                  en vez de quedar fuera de sus reglas de alineación. */}
              <Button
                variant="primary"
                intent="business.whatsapp.channel.activate"
                onClick={() => {
                  setEnableWhatsapp(true);
                  // El canal encendido es un dato de la tienda. La clave global de
                  // `localStorage` se escribía aquí y ya no la lee nadie.
                  if (business?.id && business.id !== "new") {
                    updateBusiness(business.id, {
                      channels: {
                        ...business.channels,
                        whatsapp: true,
                      },
                    });
                  }
                }}
                startIcon={<Smartphone className="h-4 w-4" />}
                className="h-auto w-full rounded-full px-5 py-2.5 text-theme-sm font-semibold shadow-none hover:bg-brand-600 sm:w-auto"
              >
                Activar canal de WhatsApp
              </Button>
              <Button
                variant="outline"
                intent="business.whatsapp.channel.goto"
                onClick={() => setActiveTab("channels")}
                className="h-auto w-full rounded-full border border-gray-300 px-4 py-2.5 text-theme-sm font-semibold text-gray-700 ring-0 hover:bg-gray-50 sm:w-auto dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Ver canales de entrada
              </Button>
            </div>
          </SettingsSection>
        </SettingsCard>
      ) : (
        <>
          {/* Navegación de apartados: rejilla, no fila con scroll.
              ⚠️ Antes era una fila de píldoras con `overflow-x-auto` que pedía
              ~940 px para 832 disponibles: salía barra de desplazamiento
              horizontal y "Horarios" y "Experiencia" quedaban fuera de vista.
              Una rejilla no recorta nada y aprovecha el ancho del panel. */}
          <div
            role="tablist"
            aria-label="Apartados del asistente"
            className="grid grid-cols-1 gap-1.5 rounded-xl border border-gray-200/80 bg-gray-100 p-1.5 sm:grid-cols-2 xl:grid-cols-3 dark:border-gray-700 dark:bg-gray-800/90"
          >
            {subTabs.map((sub) => {
              const Icon = sub.icon;
              const isActive = activeSubTab === sub.id;
              return (
                <button
                  key={sub.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setBotSubTab(sub.id)}
                  className={`flex min-w-0 cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 text-left text-theme-sm transition-colors ${
                    isActive
                      ? "bg-white font-semibold text-secondary-600 shadow-xs dark:bg-gray-900 dark:text-white"
                      : "font-medium text-gray-600 hover:bg-white/60 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-900/60 dark:hover:text-white"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 flex-none ${isActive ? "text-brand-500" : "text-gray-400"}`}
                  />
                  <span className="truncate">{sub.label}</span>
                </button>
              );
            })}
          </div>

          {/* ── APARTADO 1: IDENTIDAD & COMPORTAMIENTO ── */}
          {activeSubTab === "identity" && (
            <SettingsCard className="animate-fade-in">
              <SettingsSection
                title="Identidad y tono de respuesta"
                description="Define el nombre y el estilo con el que interactuará con tus compradores."
              >
                <div className="space-y-4">
                  <SettingsFieldGrid>
                    <Field
                      label="Nombre del asistente"
                      type="text"
                      value={botName}
                      onChange={(e) => setBotName(e.target.value)}
                      placeholder="Ej: Sofía de Necto"
                    />

                    <div>
                      <SettingsLabel htmlFor="bot-tone">Tono de atención</SettingsLabel>
                      <select
                        id="bot-tone"
                        value={botTone}
                        onChange={(e) => setBotTone(e.target.value as any)}
                        className={settingsControlClass}
                      >
                        <option value="cálido">Cálido y cercano</option>
                        <option value="profesional">Profesional y ejecutivo</option>
                        <option value="ágil">Ágil y directo</option>
                        <option value="técnico">Técnico y especializado</option>
                      </select>
                    </div>
                  </SettingsFieldGrid>

                  <SettingsFieldGrid cols={3} className="border-t border-gray-100 pt-4 dark:border-gray-800">
                    <div>
                      <SettingsLabel htmlFor="bot-personality">Personalidad base</SettingsLabel>
                      <select
                        id="bot-personality"
                        value={botPersonality}
                        onChange={(e) => setBotPersonality(e.target.value as BotPersonality)}
                        className={settingsControlClass}
                      >
                        <option value="amigable">Amigable · empático</option>
                        <option value="ejecutivo">Ejecutivo · sobrio</option>
                        <option value="chef">Especialista · carta</option>
                        <option value="dinamico">Dinámico · proactivo</option>
                      </select>
                    </div>

                    <div>
                      <SettingsLabel htmlFor="bot-response-style">Estilo de respuesta</SettingsLabel>
                      <select
                        id="bot-response-style"
                        value={responseStyle}
                        onChange={(e) => setResponseStyle(e.target.value as any)}
                        className={settingsControlClass}
                      >
                        <option value="conciso">Conciso (respuestas cortas)</option>
                        <option value="claro">Claro (balanceado)</option>
                        <option value="extenso">Extenso (detallado)</option>
                      </select>
                    </div>

                    <div>
                      <SettingsLabel htmlFor="bot-emoji">Frecuencia de emojis</SettingsLabel>
                      <select
                        id="bot-emoji"
                        value={emojiFrequency}
                        onChange={(e) => setEmojiFrequency(e.target.value as any)}
                        className={settingsControlClass}
                      >
                        <option value="nunca">Nunca (0 emojis)</option>
                        <option value="moderado">Moderado (1-2 por mensaje)</option>
                        <option value="frecuente">Frecuente (expresivo)</option>
                      </select>
                    </div>
                  </SettingsFieldGrid>
                </div>
              </SettingsSection>

              {/* Saludo inicial: es una fila con interruptor, no un campo más —
                  el mensaje sólo existe cuando el saludo está encendido. */}
              <SettingsSection
                title="Saludo de bienvenida inicial"
                description="Primer mensaje que envía el asistente cuando un cliente escribe."
                actions={
                  <Toggle
                    intent="bot.welcome"
                    checked={isWelcomeEnabled}
                    onChange={setIsWelcomeEnabled}
                  />
                }
              >
                {isWelcomeEnabled && (
                  <Textarea
                    rows={2}
                    value={welcomeMessage}
                    onChange={setWelcomeMessage}
                    className="resize-none"
                  />
                )}
              </SettingsSection>
            </SettingsCard>
          )}

          {/* ── APARTADO 2: CONOCIMIENTO & CAPACIDADES ── */}
          {activeSubTab === "knowledge" && (
            <SettingsCard className="animate-fade-in">
              {/* Catálogo de productos y precios */}
              <SettingsRow
                icon={BookOpen}
                title="Catálogo de productos y precios"
                description="Consulta de nombres, precios vigentes, descripciones y fotos de la sede."
                badge={
                  <>
                    <SettingsStatusPill active={knowsCatalog}>
                      {knowsCatalog ? "Activo" : "Inactivo"}
                    </SettingsStatusPill>
                    <SettingsCounter>
                      {capabilityCount("catalog", 2, (intentCatalog ? 1 : 0) + (intentPrice ? 1 : 0))}
                    </SettingsCounter>
                  </>
                }
                action={
                  <Toggle intent="bot.knows.catalog" checked={knowsCatalog} onChange={setKnowsCatalog} />
                }
              >
                {knowsCatalog && (
                  <>
                    <SettingsSubPanel>
                      <div className="flex flex-col justify-between gap-2.5 sm:flex-row sm:items-center">
                        <SettingsGroupLabel>Origen de datos</SettingsGroupLabel>
                        <select
                          value={catalogDataSource}
                          onChange={(e) => setCatalogDataSource(e.target.value as any)}
                          className={settingsControlClassCompact}
                        >
                          <option value="module_db">Base de datos del módulo (automático)</option>
                          <option value="file">Archivo subido (CSV / Excel)</option>
                          <option value="url">URL externa</option>
                        </select>
                      </div>

                      {catalogDataSource === "file" && (
                        <UploadRow
                          hint="Formatos soportados: CSV, XLSX, JSON"
                          action="Subir catálogo"
                          accept=".csv,.xlsx,.xls,.json"
                        />
                      )}

                      {catalogDataSource === "url" && (
                        <div className="border-t border-gray-200/60 pt-3 dark:border-gray-700">
                          <Field
                            label="Dirección del archivo"
                            type="url"
                            value=""
                            onChange={() => {}}
                            placeholder="https://api.mi-negocio.com/catalogo"
                          />
                        </div>
                      )}
                    </SettingsSubPanel>

                    <CapabilityList label="Capacidades del catálogo">
                      <CapabilityRow
                        label="Consultar catálogo completo"
                        description="Presentar productos y categorías al cliente"
                        intent="bot.intent.catalog"
                        checked={intentCatalog}
                        onChange={setIntentCatalog}
                      />
                      <CapabilityRow
                        label="Consultar precios y promociones"
                        description="Informar valores vigentes al comprador"
                        intent="bot.intent.price"
                        checked={intentPrice}
                        onChange={setIntentPrice}
                      />
                    </CapabilityList>

                    <CustomCapabilitiesEditor
                      sourceId="catalog"
                      capabilities={customCapabilities}
                      addingSource={addingCapSource}
                      newLabel={newCapLabel}
                      newDesc={newCapDesc}
                      newInstruction={newCapInstruction}
                      onStartAdd={setAddingCapSource}
                      onCancelAdd={handleCancelAddCapability}
                      onLabelChange={setNewCapLabel}
                      onDescChange={setNewCapDesc}
                      onInstructionChange={setNewCapInstruction}
                      onAdd={handleAddCustomCapability}
                      onToggle={handleToggleCustomCapability}
                      onDelete={handleDeleteCustomCapability}
                    />
                  </>
                )}
              </SettingsRow>

              {/* Información del negocio y ubicación */}
              <SettingsRow
                icon={Store}
                title="Información del negocio y ubicación"
                description="Horarios, dirección física, modalidades de entrega y métodos de pago."
                badge={
                  <>
                    <SettingsStatusPill active={knowsBusinessInfo}>
                      {knowsBusinessInfo ? "Activo" : "Inactivo"}
                    </SettingsStatusPill>
                    <SettingsCounter>
                      {capabilityCount("business", 1, intentHoursLocation ? 1 : 0)}
                    </SettingsCounter>
                  </>
                }
                action={
                  <Toggle
                    intent="bot.knows.business"
                    checked={knowsBusinessInfo}
                    onChange={setKnowsBusinessInfo}
                  />
                }
              >
                {knowsBusinessInfo && (
                  <>
                    <SettingsSubPanel className="flex-row flex-wrap items-center justify-between">
                      <SettingsGroupLabel>Origen de datos</SettingsGroupLabel>
                      <SettingsStatusPill active icon={CheckCircle2}>
                        Conectado a la configuración de la sede
                      </SettingsStatusPill>
                    </SettingsSubPanel>

                    <CapabilityList label="Capacidades">
                      <CapabilityRow
                        label="Informar horarios y dirección"
                        description="Apertura, ubicación física y zonas de cobertura"
                        intent="bot.intent.hours"
                        checked={intentHoursLocation}
                        onChange={setIntentHoursLocation}
                      />
                    </CapabilityList>

                    <CustomCapabilitiesEditor
                      sourceId="business"
                      capabilities={customCapabilities}
                      addingSource={addingCapSource}
                      newLabel={newCapLabel}
                      newDesc={newCapDesc}
                      newInstruction={newCapInstruction}
                      onStartAdd={setAddingCapSource}
                      onCancelAdd={handleCancelAddCapability}
                      onLabelChange={setNewCapLabel}
                      onDescChange={setNewCapDesc}
                      onInstructionChange={setNewCapInstruction}
                      onAdd={handleAddCustomCapability}
                      onToggle={handleToggleCustomCapability}
                      onDelete={handleDeleteCustomCapability}
                    />
                  </>
                )}
              </SettingsRow>

              {/* Preguntas frecuentes */}
              <SettingsRow
                icon={HelpCircle}
                title="Preguntas frecuentes (FAQ)"
                description="Respuestas estándar sobre cobertura, tiempos de preparación y canales de contacto."
                badge={
                  <>
                    <SettingsStatusPill active={knowsFaq}>
                      {knowsFaq ? "Activo" : "Inactivo"}
                    </SettingsStatusPill>
                    <SettingsCounter>{capabilityCount("faq", 0, 0)}</SettingsCounter>
                  </>
                }
                action={<Toggle intent="bot.knows.faq" checked={knowsFaq} onChange={setKnowsFaq} />}
              >
                {knowsFaq && (
                  <>
                    <SettingsSubPanel>
                      <div className="flex flex-col justify-between gap-2.5 sm:flex-row sm:items-center">
                        <SettingsGroupLabel>Origen de datos</SettingsGroupLabel>
                        <select
                          value={faqDataSource}
                          onChange={(e) => setFaqDataSource(e.target.value as any)}
                          className={settingsControlClassCompact}
                        >
                          <option value="none">Sin configurar</option>
                          <option value="file">Archivo subido (PDF / TXT / Excel)</option>
                          <option value="url">URL externa</option>
                          <option value="manual">Entrada manual</option>
                        </select>
                      </div>

                      {faqDataSource === "none" && (
                        <div className="rounded-xl border border-warning-200 bg-warning-50 p-3 dark:border-warning-900/50 dark:bg-warning-950/30">
                          <p className="text-theme-xs text-warning-800 dark:text-warning-300">
                            Carga un archivo con preguntas y respuestas para que el asistente responda con precisión.
                          </p>
                        </div>
                      )}

                      {faqDataSource === "file" && (
                        <UploadRow
                          hint="PDF, TXT, CSV, Excel"
                          action="Subir archivo FAQ"
                          accept=".pdf,.txt,.csv,.xlsx,.xls"
                        />
                      )}

                      {faqDataSource === "url" && (
                        <div className="border-t border-gray-200/60 pt-3 dark:border-gray-700">
                          <Field
                            label="URL del documento de FAQ"
                            type="url"
                            value=""
                            onChange={() => {}}
                            placeholder="https://mi-negocio.com/faq"
                          />
                        </div>
                      )}
                    </SettingsSubPanel>

                    <CapabilityList label="Capacidades">
                      <CustomCapabilitiesEditor
                        sourceId="faq"
                        capabilities={customCapabilities}
                        addingSource={addingCapSource}
                        newLabel={newCapLabel}
                        newDesc={newCapDesc}
                        newInstruction={newCapInstruction}
                        onStartAdd={setAddingCapSource}
                        onCancelAdd={handleCancelAddCapability}
                        onLabelChange={setNewCapLabel}
                        onDescChange={setNewCapDesc}
                        onInstructionChange={setNewCapInstruction}
                        onAdd={handleAddCustomCapability}
                        onToggle={handleToggleCustomCapability}
                        onDelete={handleDeleteCustomCapability}
                      />
                    </CapabilityList>
                  </>
                )}
              </SettingsRow>

              {/* Políticas de cambios y garantías */}
              <SettingsRow
                icon={ShieldCheck}
                title="Políticas de cambios y garantías"
                description="Condiciones oficiales para cancelaciones, devoluciones o reclamos."
                badge={
                  <>
                    <SettingsStatusPill active={knowsPolicies}>
                      {knowsPolicies ? "Activo" : "Inactivo"}
                    </SettingsStatusPill>
                    <SettingsCounter>{capabilityCount("policies", 0, 0)}</SettingsCounter>
                  </>
                }
                action={
                  <Toggle intent="bot.knows.policies" checked={knowsPolicies} onChange={setKnowsPolicies} />
                }
              >
                {knowsPolicies && (
                  <>
                    <SettingsSubPanel>
                      <div className="flex flex-col justify-between gap-2.5 sm:flex-row sm:items-center">
                        <SettingsGroupLabel>Origen de datos</SettingsGroupLabel>
                        <select
                          value={policiesDataSource}
                          onChange={(e) => setPoliciesDataSource(e.target.value as any)}
                          className={settingsControlClassCompact}
                        >
                          <option value="none">Sin configurar</option>
                          <option value="file">Archivo subido (PDF / TXT)</option>
                          <option value="url">URL externa</option>
                          <option value="manual">Entrada manual</option>
                        </select>
                      </div>

                      {policiesDataSource === "none" && (
                        <div className="rounded-xl border border-warning-200 bg-warning-50 p-3 dark:border-warning-900/50 dark:bg-warning-950/30">
                          <p className="text-theme-xs text-warning-800 dark:text-warning-300">
                            Carga las políticas para que el asistente informe devoluciones o reclamos de acuerdo a tus términos.
                          </p>
                        </div>
                      )}

                      {policiesDataSource === "file" && (
                        <UploadRow
                          hint="PDF, TXT, DOCX"
                          action="Subir documento"
                          accept=".pdf,.txt,.docx"
                        />
                      )}

                      {policiesDataSource === "url" && (
                        <div className="border-t border-gray-200/60 pt-3 dark:border-gray-700">
                          <Field
                            label="URL del documento"
                            type="url"
                            value=""
                            onChange={() => {}}
                            placeholder="https://mi-negocio.com/politicas"
                          />
                        </div>
                      )}
                    </SettingsSubPanel>

                    <CapabilityList label="Capacidades">
                      <CustomCapabilitiesEditor
                        sourceId="policies"
                        capabilities={customCapabilities}
                        addingSource={addingCapSource}
                        newLabel={newCapLabel}
                        newDesc={newCapDesc}
                        newInstruction={newCapInstruction}
                        onStartAdd={setAddingCapSource}
                        onCancelAdd={handleCancelAddCapability}
                        onLabelChange={setNewCapLabel}
                        onDescChange={setNewCapDesc}
                        onInstructionChange={setNewCapInstruction}
                        onAdd={handleAddCustomCapability}
                        onToggle={handleToggleCustomCapability}
                        onDelete={handleDeleteCustomCapability}
                      />
                    </CapabilityList>
                  </>
                )}
              </SettingsRow>

              {/* Consulta de inventario en tiempo real */}
              <SettingsRow
                icon={ShoppingBag}
                title="Consulta de inventario en tiempo real"
                description={
                  inventarioActivo
                    ? "Valida existencias en bodega antes de confirmar disponibilidad."
                    : "Requiere el módulo de Inventarios activo en esta sede."
                }
                badge={
                  <>
                    <SettingsStatusPill active={!!inventarioActivo}>
                      {inventarioActivo ? "Módulo activo" : "Sin módulo"}
                    </SettingsStatusPill>
                    <SettingsCounter>
                      {capabilityCount("inventory", 1, intentStock ? 1 : 0)}
                    </SettingsCounter>
                  </>
                }
                action={
                  <Toggle
                    intent="bot.knows.inventory"
                    checked={knowsInventoryQuery && (inventarioActivo ?? false)}
                    onChange={(val) => {
                      if (inventarioActivo) {
                        setKnowsInventoryQuery(val);
                      }
                    }}
                  />
                }
              >
                {knowsInventoryQuery && inventarioActivo && (
                  <>
                    <CapabilityList label="Capacidades">
                      <CapabilityRow
                        label="Consultar disponibilidad de productos"
                        description="Verificar existencias antes de ofrecer un producto"
                        intent="bot.intent.stock"
                        checked={intentStock}
                        onChange={setIntentStock}
                      />
                    </CapabilityList>

                    <CustomCapabilitiesEditor
                      sourceId="inventory"
                      capabilities={customCapabilities}
                      addingSource={addingCapSource}
                      newLabel={newCapLabel}
                      newDesc={newCapDesc}
                      newInstruction={newCapInstruction}
                      onStartAdd={setAddingCapSource}
                      onCancelAdd={handleCancelAddCapability}
                      onLabelChange={setNewCapLabel}
                      onDescChange={setNewCapDesc}
                      onInstructionChange={setNewCapInstruction}
                      onAdd={handleAddCustomCapability}
                      onToggle={handleToggleCustomCapability}
                      onDelete={handleDeleteCustomCapability}
                    />
                  </>
                )}
              </SettingsRow>

              {/* Gestión de pedidos */}
              <SettingsRow
                icon={FileText}
                title="Gestión de pedidos"
                /*
                  ⚠️ Este distintivo era **incondicional**: decía "Pedidos
                  conectados" en verde aunque la sede no tuviera el módulo de
                  Pedidos. Afirmar una conexión que no existe es peor que no
                  mostrar nada, así que ahora depende del módulo —igual que el de
                  inventario— y el mismo dato alimenta el texto.
                */
                description={
                  pedidosActivo
                    ? "Acciones operativas sobre órdenes de compra conectadas al sistema de pedidos."
                    : CAPABILITY_SOURCES.orders.missingModuleHint
                }
                badge={
                  <>
                    <SettingsStatusPill active={!!pedidosActivo} icon={pedidosActivo ? CheckCircle2 : undefined}>
                      {pedidosActivo ? "Pedidos conectados" : "Sin módulo"}
                    </SettingsStatusPill>
                    <SettingsCounter>
                      {capabilityCount(
                        "orders",
                        4,
                        (intentCreateOrder ? 1 : 0) +
                          (intentTrackOrder ? 1 : 0) +
                          (intentModifyOrder ? 1 : 0) +
                          (intentCancelOrder ? 1 : 0)
                      )}
                    </SettingsCounter>
                  </>
                }
              >
                {/*
                  El cuerpo se **retira** con el módulo apagado, no se deja
                  deshabilitado: una lista de capacidades de pedidos que no se
                  pueden usar es ruido, y la cabecera ya dice qué falta.
                */}
                {pedidosActivo && (
                  <>
                    <CapabilityList label="Capacidades operativas">
                      {[
                        { intent: "bot.intent.create", label: "Tomar pedido", desc: "Armar orden de compra en el chat", checked: intentCreateOrder, set: setIntentCreateOrder },
                        { intent: "bot.intent.track", label: "Estado del pedido", desc: "Rastrear el estado de un pedido en curso", checked: intentTrackOrder, set: setIntentTrackOrder },
                        { intent: "bot.intent.modify", label: "Modificar pedido", desc: "Ajustar ítems antes de preparación", checked: intentModifyOrder, set: setIntentModifyOrder },
                        { intent: "bot.intent.cancel", label: "Cancelar pedido", desc: "Solicitar cancelación de comanda", checked: intentCancelOrder, set: setIntentCancelOrder },
                      ].map((cap) => (
                        <CapabilityRow
                          key={cap.intent}
                          label={cap.label}
                          description={cap.desc}
                          intent={cap.intent}
                          checked={cap.checked}
                          onChange={cap.set}
                        />
                      ))}
                    </CapabilityList>

                    <CustomCapabilitiesEditor
                      sourceId="orders"
                      capabilities={customCapabilities}
                      addingSource={addingCapSource}
                      newLabel={newCapLabel}
                      newDesc={newCapDesc}
                      newInstruction={newCapInstruction}
                      onStartAdd={setAddingCapSource}
                      onCancelAdd={handleCancelAddCapability}
                      onLabelChange={setNewCapLabel}
                      onDescChange={setNewCapDesc}
                      onInstructionChange={setNewCapInstruction}
                      onAdd={handleAddCustomCapability}
                      onToggle={handleToggleCustomCapability}
                      onDelete={handleDeleteCustomCapability}
                    />
                  </>
                )}
              </SettingsRow>

              {/* Atención humana */}
              <SettingsRow
                icon={UserCheck}
                title="Atención humana"
                description="Transferencia directa a un asesor real cuando el asistente no puede resolver la consulta."
                badge={
                  <>
                    <SettingsStatusPill active={intentHumanAgent}>
                      {intentHumanAgent ? "Activo" : "Inactivo"}
                    </SettingsStatusPill>
                    <SettingsCounter>
                      {capabilityCount("human", 1, intentHumanAgent ? 1 : 0)}
                    </SettingsCounter>
                  </>
                }
              >
                <CapabilityList label="Capacidades">
                  <CapabilityRow
                    label="Transferir a asesor humano"
                    description="Pase directo a atención humana bajo demanda o por regla"
                    intent="bot.intent.human"
                    checked={intentHumanAgent}
                    onChange={setIntentHumanAgent}
                  />
                </CapabilityList>

                <CustomCapabilitiesEditor
                  sourceId="human"
                  capabilities={customCapabilities}
                  addingSource={addingCapSource}
                  newLabel={newCapLabel}
                  newDesc={newCapDesc}
                  newInstruction={newCapInstruction}
                  onStartAdd={setAddingCapSource}
                  onCancelAdd={handleCancelAddCapability}
                  onLabelChange={setNewCapLabel}
                  onDescChange={setNewCapDesc}
                  onInstructionChange={setNewCapInstruction}
                  onAdd={handleAddCustomCapability}
                  onToggle={handleToggleCustomCapability}
                  onDelete={handleDeleteCustomCapability}
                />
              </SettingsRow>
            </SettingsCard>
          )}

          {/* ── APARTADO 3: REGLAS DE CREACIÓN & CONFIRMACIÓN DE PEDIDOS (OMS) ── */}
          {activeSubTab === "orders_oms" && (
            <SettingsCard className="animate-fade-in">
              <SettingsSection
                title="Cómo entran los pedidos"
                description="Define cómo ingresan al sistema de pedidos las órdenes pactadas en el chat."
              >
                <select
                  value={orderCreationMode}
                  onChange={(e) => setOrderCreationMode(e.target.value as any)}
                  className={settingsControlClass}
                >
                  <option value="auto_new">Crear como nuevo (ingresa de inmediato como comanda lista para confirmar)</option>
                  <option value="interactive_confirm">Confirmación en chat (envía el desglose y solicita un "sí" explícito)</option>
                  <option value="human_review">Revisión previa (queda en borrador hasta la validación de un operador humano)</option>
                </select>
              </SettingsSection>

              <SettingsSection
                title="Auto-confirmación directa"
                description="Pasa la orden automáticamente a preparación si cumple los montos y stock requeridos."
                actions={
                  <Toggle
                    intent="bot.autoconfirm"
                    checked={isAutoConfirmOrders}
                    onChange={setIsAutoConfirmOrders}
                  />
                }
              >
                {isAutoConfirmOrders && (
                  <SettingsSubPanel className="space-y-4">
                    <Field
                      label="Monto máximo para auto-confirmación ($)"
                      type="number"
                      value={autoConfirmMaxAmount}
                      onChange={(e) => setAutoConfirmMaxAmount(Number(e.target.value) || 0)}
                      placeholder="100000"
                    />

                    <div className="space-y-2 border-t border-gray-200 pt-3 dark:border-gray-700">
                      <SettingsGroupLabel>
                        Condiciones obligatorias para auto-confirmar
                      </SettingsGroupLabel>
                      <div className="grid grid-cols-1 gap-2.5 text-theme-sm sm:grid-cols-2">
                        <label className="flex cursor-pointer items-center gap-2.5 text-gray-700 dark:text-gray-300">
                          <input
                            type="checkbox"
                            checked={autoConfirmRequireStock}
                            onChange={(e) => setAutoConfirmRequireStock(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500/20"
                          />
                          <span>Requiere stock confirmado</span>
                        </label>
                        <label className="flex cursor-pointer items-center gap-2.5 text-gray-700 dark:text-gray-300">
                          <input
                            type="checkbox"
                            checked={autoConfirmRequireCompleteData}
                            onChange={(e) => setAutoConfirmRequireCompleteData(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500/20"
                          />
                          <span>Cliente con datos completos</span>
                        </label>
                        <label className="flex cursor-pointer items-center gap-2.5 text-gray-700 dark:text-gray-300">
                          <input
                            type="checkbox"
                            checked={autoConfirmExcludeRestricted}
                            onChange={(e) => setAutoConfirmExcludeRestricted(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500/20"
                          />
                          <span>Sin ítems con preparación restringida</span>
                        </label>
                      </div>
                    </div>
                  </SettingsSubPanel>
                )}
              </SettingsSection>
            </SettingsCard>
          )}

          {/* ── APARTADO 4: PASO A UN ASESOR ── */}
          {activeSubTab === "handoff" && (
            <SettingsCard className="animate-fade-in">
              <SettingsSection
                title="Transferencia a un asesor"
                description="Configura en qué momentos y bajo qué reglas el asistente debe ceder el control del chat a un asesor del equipo."
                actions={
                  <Toggle
                    intent="bot.handoff"
                    checked={isHandoffEnabled}
                    onChange={setIsHandoffEnabled}
                  />
                }
              >
                {isHandoffEnabled && (
                  <div className="space-y-5">
                    <div>
                      <SettingsLabel htmlFor="bot-handoff-message">
                        Mensaje de transición al cliente
                      </SettingsLabel>
                      <Textarea
                        rows={2}
                        value={handoffToHumanMessage}
                        onChange={setHandoffToHumanMessage}
                        className="resize-none"
                      />
                    </div>

                    <SettingsFieldGrid>
                      <div>
                        <SettingsLabel htmlFor="bot-handoff-target">
                          Destino de la transferencia
                        </SettingsLabel>
                        <select
                          id="bot-handoff-target"
                          value={handoffTarget}
                          onChange={(e) => setHandoffTarget(e.target.value as any)}
                          className={settingsControlClass}
                        >
                          <option value="general">Cualquier asesor disponible</option>
                          <option value="sales">Equipo de ventas</option>
                          <option value="support">Servicio al cliente y soporte</option>
                          <option value="ops">Operaciones y despacho</option>
                        </select>
                      </div>

                      <div>
                        <SettingsLabel htmlFor="bot-handoff-behavior">
                          Comportamiento de la IA
                        </SettingsLabel>
                        <select
                          id="bot-handoff-behavior"
                          value={handoffBehavior}
                          onChange={(e) => setHandoffBehavior(e.target.value as any)}
                          className={settingsControlClass}
                        >
                          <option value="pause_ia">Pausar la IA mientras atiende un humano</option>
                          <option value="assist_agent">Modo copiloto (la IA asiste al asesor)</option>
                          <option value="resume_on_finish">Reanudar la IA al cerrar la conversación</option>
                        </select>
                      </div>
                    </SettingsFieldGrid>
                  </div>
                )}
              </SettingsSection>
            </SettingsCard>
          )}

          {/* ── APARTADO 5: HORARIOS & DISPONIBILIDAD ── */}
          {activeSubTab === "hours" && (
            <SettingsCard className="animate-fade-in">
              <SettingsRow
                title="Permitir tomar pedidos fuera de horario"
                description="Si está activo, el asistente tomará la orden y la dejará programada para el próximo turno."
                action={
                  <Toggle
                    intent="bot.orders.outside.hours"
                    checked={allowOrdersOutsideHours}
                    onChange={setAllowOrdersOutsideHours}
                  />
                }
              />

              <SettingsRow
                title="Respuesta automática fuera de horario"
                description="Mensaje que recibirá el cliente si contacta a la sede cuando se encuentra cerrada."
                action={
                  <Toggle
                    intent="bot.closed"
                    checked={isClosedHoursEnabled}
                    onChange={setIsClosedHoursEnabled}
                  />
                }
              >
                {isClosedHoursEnabled && (
                  <Textarea
                    rows={3}
                    value={closedHoursMessage}
                    onChange={setClosedHoursMessage}
                    className="resize-none"
                  />
                )}
              </SettingsRow>
            </SettingsCard>
          )}

          {/* ── APARTADO 6: EXPERIENCIA DEL CLIENTE ── */}
          {activeSubTab === "experience" && (
            <SettingsCard className="animate-fade-in">
              {[
                {
                  title: "Desplegar catálogo visual en tarjetas",
                  desc: "Envía carrusel o tarjetas interactivas de productos directamente en el chat.",
                  intent: "exp.cards",
                  checked: expShowCatalogCards,
                  set: setExpShowCatalogCards,
                },
                {
                  title: "Mostrar menú por categorías",
                  desc: "Agrupa los productos en botones rápidos de categorías.",
                  intent: "exp.categories",
                  checked: expShowCategories,
                  set: setExpShowCategories,
                },
                {
                  title: "Incluir fotos y precios en respuestas",
                  desc: "Adjunta la fotografía y precio oficial de cada producto consultado.",
                  intent: "exp.pictures",
                  checked: expShowPictures,
                  set: setExpShowPictures,
                },
                {
                  title: "Permitir armar carrito desde la conversación",
                  desc: "El cliente puede sumar y restar ítems en el chat sin salir a enlaces externos.",
                  intent: "exp.cart",
                  checked: expInlineCart,
                  set: setExpInlineCart,
                },
                {
                  title: "Resumen previo del pedido con desglose completo",
                  desc: "Antes de confirmar, envía un resumen con ítems, dirección, entrega, medio de pago y total exacto.",
                  intent: "exp.summary",
                  checked: expPreConfirmationSummary,
                  set: setExpPreConfirmationSummary,
                },
              ].map((opt) => (
                <SettingsRow
                  key={opt.intent}
                  title={opt.title}
                  description={opt.desc}
                  action={<Toggle intent={opt.intent} checked={opt.checked} onChange={opt.set} />}
                />
              ))}
            </SettingsCard>
          )}
        </>
      )}
    </div>
  );
};
