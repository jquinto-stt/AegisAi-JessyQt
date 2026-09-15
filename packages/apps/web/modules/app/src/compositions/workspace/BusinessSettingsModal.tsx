import React, { useMemo } from "react";
import { createPortal } from "react-dom";
import {
  useBusiness,
  BusinessInstance,
} from "../../context/BusinessContext";
import { Check } from "lucide-react";
import { eventBus } from "@/infrastructure/eventBus";
import { Button } from "@/elements";
import { useBusinessSettingsForm } from "./business-settings/hooks/useBusinessSettingsForm";
import {
  SETTINGS_TABS,
  settingsTabDef,
} from "./business-settings/business-settings.constants";
import { buildBusinessPayload, previewLocation } from "./business-settings/business-settings.utils";
import { SettingsHeading } from "./business-settings/SettingsSection";
import { GeneralTab } from "./business-settings/tabs/GeneralTab";
import { ChannelsTab } from "./business-settings/tabs/ChannelsTab";
import { WhatsAppBotTab } from "./business-settings/tabs/WhatsAppBotTab";
import { PaymentsTab } from "./business-settings/tabs/PaymentsTab";
import { BrandingTab } from "./business-settings/tabs/BrandingTab";
import { OperationsTab } from "./business-settings/tabs/OperationsTab";

/* ── Public surface (barrel) ───────────────────────────────────────────
 * Types and catalogues live in ./business-settings/*; the six tab bodies in
 * ./business-settings/tabs/* and the state in
 * ./business-settings/hooks/useBusinessSettingsForm.
 * ──────────────────────────────────────────────────────────────────── */
export type { SettingsTabKey } from "./business-settings/business-settings.constants";
export type { CustomCapability } from "./business-settings/business-settings.constants";

/**
 * Ajustes de sede — **modal con navegación vertical**.
 *
 * El modal es dueño de su propia chrome: encabezado con el nombre de la sede,
 * navegación lateral con las seis secciones y pie con las acciones (Guardar
 * Cambios / Volver / Descartar). El contenido se titula una sola vez, desde el
 * catálogo (`SETTINGS_TABS`), no desde cada pestaña.
 *
 * ⚠️ Tres invariantes que ya se rompieron una vez y que aquí están atadas a
 * tres clases concretas — no las cambies sin querer:
 *
 * 1. **El overlay cubre TODO el viewport** (`inset-0`, sin `xl:left-[290px]`).
 *    Si se deja ver el sidebar de la app, sus atajos *"Canales de entrada"* y
 *    *"Asistente de WhatsApp IA"* se pintan a la vez que las mismas entradas de
 *    esta navegación: dos columnas listando lo mismo.
 * 2. **`z-[100000]`**, por encima de `BaseAppHeader` (`z-99999`). Con un z-index
 *    menor, la barra del shell (búsqueda, soporte, avatar) se pinta *sobre* los
 *    ajustes y tapa el título.
 * 3. **El formulario vive en un `main` que ocupa el ancho que queda**, con el
 *    bloque de contenido en `max-w-4xl mx-auto`. Cuando el `main` medía 829 px
 *    (menos que los 896 del formulario) su `mx-auto` no centraba nada: de ahí
 *    el "descuadre" con el contenido pegado a la izquierda.
 *
 * Y una cuarta, de presentación:
 *
 * 4. **El contenido del tab va dentro de UNA `SettingsCard`** y los bloques son
 *    `SettingsSection`, que son **grupos** (sin borde ni fondo), no tarjetas.
 *    Si vuelves a envolver un grupo en su propio `Card`, reaparece la pila de
 *    cajas con un borde dentro de otro. El antetítulo de la sección va en
 *    minúscula normal: la versalita espaciada (`uppercase tracking-[0.2em]`) es
 *    justo el defecto de "tipografía y rótulos" que se vino a corregir.
 */
export const BusinessSettingsModal: React.FC<{
  business: BusinessInstance | null;
  isOpen: boolean;
  onClose: () => void;
  initialTab?: string;
}> = ({ business, isOpen, onClose, initialTab = "general" }) => {
  const { updateBusiness, updateStoreIdentity, deleteBusiness, createBusiness } = useBusiness();
  const form = useBusinessSettingsForm(business, isOpen, initialTab);

  const preview = useMemo(
    () => previewLocation(form.city, form.country),
    [form.city, form.country]
  );

  // ⚠️ El logo de la sede se guardaba también como avatar del usuario: subir el
  // logotipo de una sucursal cambiaba la foto del administrador. El avatar vive
  // ahora en `UserProfile` (ver src/auth/profile) y solo se edita desde Ajustes
  // de Perfil; aquí el logo pertenece únicamente a `BusinessInstance.logoUrl`.
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        form.setLogoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        form.setBannerUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    const payload = buildBusinessPayload(form.toFormValues(), business);

    if (business && business.id && business.id !== "new") {
      // El tipo de negocio, la moneda y el país son de ámbito **tienda**, no de
      // esta sede: se aplican a toda la red. Dejarlos por sucursal bifurcaba la
      // identidad del negocio (dos vocabularios de módulos bajo la misma tienda).
      updateStoreIdentity({
        ...(payload.businessType !== undefined ? { businessType: payload.businessType } : {}),
        ...(payload.currency !== undefined ? { currency: payload.currency } : {}),
        ...(payload.country !== undefined ? { country: payload.country } : {}),
      });

      updateBusiness(business.id, payload);

      // Emitter: updating an existing location is an event worth remembering.
      // Creating one is not — the modal opens on the fresh record, so a
      // "creada" notice would be noise.
      //
      // This used to also publish "Ritmo de operación actualizado", justified by
      // a comment claiming "this modal owns the slider". It does not: the modal
      // has no pace control (its only range inputs are the logo/banner framing),
      // and the pace domain in `useStorePace` has no reader anywhere in src/.
      // So that notice asserted a change that never happened — on every single
      // save. Wire a real pace control before bringing it back.
      eventBus.publish("necto_notification_created", {
        title: "Configuración guardada",
        desc: `Actualizaste la configuración de ${form.name.trim()}. Los cambios ya están activos para esta sede.`,
        type: "system",
        sourceKey: `business_saved_${business.id}`,
      });
    } else {
      createBusiness(payload as any);
    }

    onClose();
  };

  const handleDelete = () => {
    if (business?.id) {
      deleteBusiness(business.id);
    }
    onClose();
  };

  const tabForm = {
    ...form,
    handleLogoUpload,
    handleBannerUpload,
    previewLocation: preview,
    business,
    updateBusiness,
    handleDelete,
  };

  if (!isOpen) return null;

  const active = settingsTabDef(form.activeTab);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="business-settings-title"
      className="fixed inset-0 z-[100000] flex overflow-hidden bg-gray-100 font-sans animate-in fade-in duration-200 dark:bg-gray-950"
    >
      {/* El formulario envuelve todo el panel: la acción de guardar vive en el
          pie de la navegación, fuera del bloque de contenido. */}
      <form onSubmit={handleSave} className="flex h-full w-full gap-4 p-4 md:p-5">
        <div className="flex min-h-0 flex-1 overflow-hidden rounded-3xl bg-white shadow-theme-sm dark:bg-gray-900">
          {/* ── Navegación: título + secciones + acciones ── */}
          <aside className="flex w-60 flex-none flex-col border-r border-gray-100 dark:border-gray-800">
            <header className="flex-none px-6 pb-5 pt-6">
              <h1
                id="business-settings-title"
                className="truncate text-base font-bold tracking-tight text-secondary-600 dark:text-white"
              >
                {business?.id ? "Configuración de sede" : "Nueva sede"}
              </h1>
              {business?.name && (
                <p className="mt-0.5 truncate text-theme-xs text-gray-400 dark:text-gray-500">
                  {business.name}
                </p>
              )}
            </header>

            {/* ⚠️ El botón de la nav debe contener **sólo** el rótulo del catálogo
                como texto: el guardián selecciona por `textContent.trim() === label`.
                El icono no aporta texto, pero no añadas contadores ni atajos. */}
            <nav
              aria-label="Secciones"
              className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 pb-4"
            >
              {SETTINGS_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = form.activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => form.setActiveTab(tab.id)}
                    aria-current={isActive ? "page" : undefined}
                    /* ⚠️ El estado activo es **tinte claro + acento**, no una
                       píldora rellena. Antes era `bg-secondary-600` a sangre con
                       el texto en blanco: seis ítems y uno pintado como un botón
                       sólido competía con el CTA de guardar, que es el único que
                       debe verse sólido. El patrón del tinte es el de la
                       referencia (`bg-brand-50 text-brand-500`); se conserva el
                       `secondary-600` de la casa como acento de la selección. */
                    className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left text-theme-sm transition-colors ${
                      isActive
                        ? "bg-secondary-600/10 font-semibold text-secondary-600 dark:bg-white/10 dark:text-white"
                        : "font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 flex-none ${
                        isActive ? "text-secondary-600 dark:text-white" : "text-gray-400"
                      }`}
                    />
                    <span className="truncate">{tab.label}</span>
                  </button>
                );
              })}
            </nav>

            <footer className="flex-none space-y-2 border-t border-gray-100 p-4 dark:border-gray-800">
              <Button
                type="submit"
                variant="primary"
                startIcon={<Check className="h-4 w-4" />}
                className="w-full rounded-full"
              >
                Guardar cambios
              </Button>
              {/* ⚠️ Antes había DOS salidas ("Volver" y "Descartar") que llamaban
                  las dos a `onClose()`: la misma acción con dos etiquetas. Se
                  conserva "Descartar", que es la que dice lo que pasa (cerrar sin
                  guardar) y la que ya usa `verify-notifications`. */}
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                className="w-full rounded-full"
              >
                Descartar
              </Button>
            </footer>
          </aside>

          {/* ── Contenido: encabezado una sola vez (desde el catálogo) + pestaña ── */}
          <main className="min-w-0 flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950">
            <div className="mx-auto max-w-4xl space-y-6 px-8 py-8">
              <SettingsHeading
                eyebrow={active.eyebrow}
                title={active.title}
                description={active.description}
              />

              {/* ⚠️ La tarjeta la pone **cada pestaña**, no el modal. El
                  asistente abre con su propia sub-navegación de apartados, que
                  no es un grupo de ajustes: si el modal envolviera el tab en la
                  tarjeta, la barra de apartados quedaría dentro de ella y
                  `divide-y` le pondría una línea como si fuera un grupo más. */}
              <div className="animate-fade-in">
                {form.activeTab === "general" && <GeneralTab form={tabForm} />}
                {form.activeTab === "channels" && <ChannelsTab form={tabForm} />}
                {form.activeTab === "assistant" && <WhatsAppBotTab form={tabForm} />}
                {form.activeTab === "payments" && <PaymentsTab form={tabForm} />}
                {form.activeTab === "branding" && <BrandingTab form={tabForm} />}
                {form.activeTab === "operations" && <OperationsTab form={tabForm} />}
              </div>
            </div>
          </main>
        </div>
      </form>
    </div>,
    document.body
  );
};
