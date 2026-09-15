import React from "react";
import { createPortal } from "react-dom";
import { X, User, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/elements";
import { useAccountSettingsForm } from "./account-settings/hooks/useAccountSettingsForm";
import { TABS } from "./account-settings/account-settings.constants";
import { ProfileTab } from "./account-settings/tabs/ProfileTab";
import { ContactTab } from "./account-settings/tabs/ContactTab";
import { PreferencesTab } from "./account-settings/tabs/PreferencesTab";
import { SecurityTab } from "./account-settings/tabs/SecurityTab";
import { PermissionsTab } from "./account-settings/tabs/PermissionsTab";
import { accentCssVars } from "../shared/personalization";

/* ── Ajustes de perfil ────────────────────────────────────────────────────
 *
 * **Cabecera = identidad. Contenido = grupos.** El encabezado dice quién eres
 * —avatar, nombre, rol y correo— y cada área agrupa sus ajustes en una tarjeta.
 * Nada más: no hay un tercer nivel de títulos repitiendo el propósito de la
 * pantalla, que era lo que hacía ruido antes.
 *
 * ⚠️ `z-[100000]` **no** es un número al azar: `BaseAppHeader` vive en
 * `z-99999` y el modal del DS en el mismo valor. Con el `z-[9999]` que tenía,
 * este modal se abría **por debajo** de la cabecera de la app —y encima se abría
 * desde ella—, así que la barra superior se pintaba sobre el overlay.
 * ────────────────────────────────────────────────────────────────────── */

export const AccountSettingsModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const form = useAccountSettingsForm(isOpen);
  const { activeTab, setActiveTab, savedToast, saveError, isSaving, handleSave, handleReset } = form;

  if (!isOpen) return null;

  // Sin perfil activo no hay nada real que editar. Mostrar el formulario vacío
  // invitaría a "guardar" datos que no pertenecen a ninguna cuenta, así que se
  // dice lo que pasa en lugar de fingir un perfil.
  if (!form.profile) {
    return createPortal(
      <div className="fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-6 bg-gray-900/70 backdrop-blur-sm animate-fade-in font-sans antialiased">
        <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl shadow-theme-xl p-7 text-center space-y-4 animate-scale-up">
          <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-400 flex items-center justify-center mx-auto">
            <User className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-base font-bold text-secondary-600 dark:text-white">
              No hay una sesión activa
            </h2>
            <p className="text-theme-xs leading-relaxed text-gray-500 dark:text-gray-400">
              Inicia sesión para consultar y editar el perfil del administrador de tu cuenta.
            </p>
          </div>
          <Button
            variant="primary"
            intent="account.empty.close"
            onClick={onClose}
            className="rounded-full px-6 py-2.5 text-theme-xs font-bold"
          >
            Entendido
          </Button>
        </div>
      </div>,
      document.body
    );
  }

  const active = TABS.find(t => t.id === activeTab) ?? TABS[0];

  return createPortal(
    /*
      El acento del **borrador** se publica como variable CSS en la raíz del
      modal: así el propio modal se tiñe mientras el usuario prueba colores y ve
      el resultado antes de guardar. Al descartar o cancelar, el borrador vuelve
      al valor persistido y el modal recupera su color.
    */
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-6 bg-gray-900/70 backdrop-blur-sm animate-fade-in font-sans antialiased"
      style={accentCssVars(form.accent)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Ajustes de perfil y cuenta"
        className="bg-white dark:bg-gray-900 w-full max-w-5xl max-h-[92vh] rounded-3xl shadow-theme-xl flex flex-col overflow-hidden animate-scale-up"
      >
        {/* Cabecera: quién eres, no qué es esta pantalla. */}
        <header className="flex flex-none items-center justify-between gap-4 border-b border-gray-100 px-5 py-4 sm:px-6 dark:border-gray-800">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-10 flex-none items-center justify-center overflow-hidden rounded-[10.5px] bg-gray-100 text-theme-sm font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              {form.avatarPreview ? (
                <img
                  src={form.avatarPreview}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                form.initials
              )}
            </span>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-theme-sm font-semibold text-secondary-600 dark:text-white">
                  {form.displayName}
                </h2>
                <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-theme-xs font-semibold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                  {form.roleLabel}
                </span>
              </div>
              {/* ⚠️ El correo no se repite cuando el nombre **es** el correo: una
                  cuenta recién creada sin nombre completo cae a mostrar el email
                  como nombre, y sin esta guarda el mismo texto salía dos veces. */}
              {form.profile.email.trim().toLowerCase() !== form.displayName.trim().toLowerCase() && (
                <p className="mt-0.5 truncate text-theme-xs text-gray-500 dark:text-gray-400">
                  {form.profile.email}
                </p>
              )}
            </div>
          </div>

          <Button
            variant="ghost"
            intent="account.close"
            onClick={onClose}
            aria-label="Cerrar"
            className="p-0 w-9 h-9 rounded-xl text-gray-400 hover:text-secondary-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </Button>
        </header>

        {/* Cuerpo: barra de áreas + contenido */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          <nav
            aria-label="Áreas del perfil"
            className="w-full md:w-60 flex-none overflow-y-auto border-b border-gray-100 p-3 md:border-b-0 md:border-r dark:border-gray-800"
          >
            <ul className="flex flex-row gap-1 overflow-x-auto md:flex-col md:overflow-visible">
              {TABS.map(tab => {
                const Icon = tab.icon;
                const isActive = active.id === tab.id;

                return (
                  <li key={tab.id} className="flex-none md:w-full">
                    <button
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      aria-current={isActive ? "page" : undefined}
                      className={`flex w-full cursor-pointer items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-left text-theme-sm transition-colors ${
                        isActive
                          ? "bg-gray-100 font-semibold text-secondary-600 dark:bg-gray-800 dark:text-white"
                          : "font-normal text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800/60 dark:hover:text-gray-200"
                      }`}
                    >
                      <Icon
                        className={`size-4 flex-none ${
                          isActive ? "text-brand-500" : "text-gray-400"
                        }`}
                      />
                      <span className="truncate">{tab.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          <main className="min-w-0 flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-6 dark:bg-gray-950">
            <div className="mx-auto max-w-3xl">
              {active.id === "profile" && <ProfileTab form={form} />}
              {active.id === "contact" && <ContactTab form={form} />}
              {active.id === "preferences" && <PreferencesTab form={form} />}
              {active.id === "security" && <SecurityTab form={form} />}
              {active.id === "permissions" && <PermissionsTab form={form} />}
            </div>
          </main>
        </div>

        {/* Pie: mensaje a la izquierda, acciones a la derecha. */}
        <footer className="flex flex-none items-center justify-between gap-4 border-t border-gray-100 px-5 py-4 sm:px-6 dark:border-gray-800">
          <div className="min-w-0">
            {saveError && (
              <div className="flex items-center gap-2 text-theme-xs font-semibold text-error-600 animate-fade-in dark:text-error-400">
                <AlertCircle className="w-4 h-4 flex-none" />
                <span className="truncate">{saveError}</span>
              </div>
            )}
            {savedToast && !saveError && (
              <div className="flex items-center gap-2 text-theme-xs font-semibold text-success-600 animate-fade-in dark:text-success-400">
                <CheckCircle2 className="w-4 h-4 flex-none" />
                <span>Cambios guardados</span>
              </div>
            )}
            {!saveError && !savedToast && form.isDirty && (
              <span className="text-theme-xs text-gray-400 dark:text-gray-500">
                Tienes cambios sin guardar
              </span>
            )}
          </div>

          <div className="flex flex-none items-center gap-2">
            {/* ⚠️ "Descartar" sólo aparece si hay algo que descartar. Antes
                convivía siempre con "Cancelar", y las dos hacen lo mismo salvo
                que una cierra: dos botones para una decisión. */}
            {form.isDirty && (
              <Button
                variant="ghost"
                intent="account.reset"
                onClick={handleReset}
                className="rounded-full px-4 py-2 text-theme-xs font-semibold text-gray-500 dark:text-gray-400"
              >
                Descartar
              </Button>
            )}
            <Button
              variant="ghost"
              intent="account.cancel"
              onClick={onClose}
              className="rounded-full px-4 py-2 text-theme-xs font-semibold text-gray-600 dark:text-gray-300"
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              intent="account.save"
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-full px-5 py-2.5 text-theme-xs font-bold"
            >
              <span>{isSaving ? "Guardando…" : "Guardar cambios"}</span>
            </Button>
          </div>
        </footer>
      </div>
    </div>,
    document.body
  );
};
