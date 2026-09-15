import React from "react";
import { Eye, EyeOff, AlertCircle, Info, Mail, Monitor } from "lucide-react";
import { Field, Link, Toggle } from "@/elements";
import { formatProfileDateTime } from "../../../../auth/profile";
import {
  AccountCard,
  AccountGroup,
  ActionRow,
  ActionRowList,
  FieldGrid,
  InlineNotice,
  StatusPill,
} from "../AccountPanels";
import type { AccountSettingsForm } from "../hooks/useAccountSettingsForm";

interface SecurityTabProps {
  form: AccountSettingsForm;
}

/**
 * Describe el navegador que está ejecutando la app.
 *
 * La lista de dispositivos anterior era fija (un iPhone inventado incluido). Se
 * sustituye por lo que realmente se puede saber desde el cliente: la sesión que
 * el usuario tiene delante. Las sesiones remotas necesitan backend, así que no
 * se fingen.
 */
function describeCurrentSession() {
  const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;

  const browser =
    /Edg\//.test(ua) ? "Microsoft Edge"
    : /OPR\//.test(ua) ? "Opera"
    : /Firefox\//.test(ua) ? "Firefox"
    : /CriOS\//.test(ua) ? "Chrome (iOS)"
    : /Chrome\//.test(ua) ? "Google Chrome"
    : /Safari\//.test(ua) ? "Safari"
    : "Navegador web";

  const os =
    /Windows/.test(ua) ? "Windows"
    : /Mac OS X/.test(ua) ? "macOS"
    : /Android/.test(ua) ? "Android"
    : /iPhone|iPad/.test(ua) ? "iOS"
    : /Linux/.test(ua) ? "Linux"
    : "Sistema desconocido";

  let timeZone = "";
  try {
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch {
    timeZone = "";
  }

  const language = typeof navigator === "undefined" ? "" : navigator.language;

  return { browser, os, timeZone, language };
}

/**
 * Seguridad.
 *
 * ⚠️ La contraseña distingue dos situaciones que la UI no debe confundir:
 * la cuenta que **ya** tiene contraseña la cambia (pide la actual), y la que se
 * creó sólo con Google **establece** la primera. Ofrecer "Cambiar contraseña"
 * cuando todavía no existe ninguna pediría una contraseña actual que el usuario
 * no tiene.
 */
export const SecurityTab: React.FC<SecurityTabProps> = ({ form }) => {
  const {
    profile,
    isLocalMode,
    hasPassword,
    currentPassword, setCurrentPassword,
    newPassword, setNewPassword,
    confirmPassword, setConfirmPassword,
    showCurrentPw, setShowCurrentPw,
    showNewPw, setShowNewPw,
    quickPin, setQuickPin,
    showPin, setShowPin,
    twoFactorEnabled, setTwoFactorEnabled,
  } = form;

  const session = describeCurrentSession();
  const passwordsMismatch = Boolean(newPassword && confirmPassword && newPassword !== confirmPassword);

  return (
    <AccountCard>
      <AccountGroup
        first
        title={hasPassword ? "Contraseña" : "Establecer contraseña"}
        description={
          hasPassword
            ? "Cámbiala cuando quieras; se te pedirá la actual."
            : "Tu cuenta se creó con Google y todavía no tiene contraseña de Necto."
        }
        actions={
          // ⚠️ "Cambiada {fecha}" con la fecha vacía producía "Cambiada Aún sin
          // registrar". Cuando no hay fecha se dice eso, no se concatena.
          <StatusPill tone={hasPassword ? "muted" : "warning"}>
            {hasPassword
              ? profile?.lastPasswordChangeAt
                ? `Cambiada ${formatProfileDateTime(profile.lastPasswordChangeAt)}`
                : "Sin registro de cambio"
              : "Sin contraseña"}
          </StatusPill>
        }
      >
        {!hasPassword && (
          <p className="text-theme-xs leading-relaxed text-gray-500 dark:text-gray-400">
            Al establecerla podrás entrar también con tu correo y contraseña, sin dejar de usar
            Google. Seguirás siendo la misma cuenta.
          </p>
        )}

        {isLocalMode && (
          <InlineNotice icon={Info}>
            Estás en modo demo sin backend: la contraseña no se valida ni se almacena. Con Cognito
            configurado, el cambio se aplica en el UserPool.
          </InlineNotice>
        )}

        {/* Las tres contraseñas comparten rejilla: así el campo de la actual
            alinea con la columna de la izquierda en lugar de flotar a su aire. */}
        <FieldGrid>
          {/* La contraseña actual sólo se pide si ya existe una. */}
          {hasPassword && (
            <div className="relative">
              <Field
                label="Contraseña actual"
                intent="account.currentPw"
                type={showCurrentPw ? "text" : "password"}
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="••••••••••••"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPw(!showCurrentPw)}
                aria-label={showCurrentPw ? "Ocultar contraseña actual" : "Mostrar contraseña actual"}
                className="absolute right-3 top-8 cursor-pointer text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showCurrentPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          )}

          <div className="relative">
            <Field
              label={hasPassword ? "Nueva contraseña" : "Contraseña de Necto"}
              intent="account.newPw"
              type={showNewPw ? "text" : "password"}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowNewPw(!showNewPw)}
              aria-label={showNewPw ? "Ocultar contraseña nueva" : "Mostrar contraseña nueva"}
              className="absolute right-3 top-8 cursor-pointer text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              {showNewPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>

          <Field
            label={hasPassword ? "Confirmar nueva contraseña" : "Repite la contraseña"}
            intent="account.confirmPw"
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder="Repite la contraseña"
            autoComplete="new-password"
          />
        </FieldGrid>

        {passwordsMismatch && (
          <p className="flex items-center gap-1.5 text-theme-xs font-semibold text-error-600 dark:text-error-400">
            <AlertCircle className="size-4" />
            <span>Las contraseñas no coinciden</span>
          </p>
        )}

        <p className="flex items-center gap-1.5 text-theme-xs text-gray-400 dark:text-gray-500">
          <Mail className="size-3.5 flex-none" />
          <span>
            ¿Prefieres recibir un enlace?{" "}
            {/* Es el `Link` del catálogo. No rompe la navegación: por dentro
                envuelve al `Link` de react-router, así que sigue siendo
                navegación de cliente. `variant="secondary"` da el
                `text-brand-500` que ya tenía, y `text-theme-xs` recupera el
                tamaño del párrafo —el `Link` base emite `text-sm`—. */}
            <Link
              to="/forgot-password"
              text="Usar recuperación por correo"
              variant="secondary"
              className="text-theme-xs font-semibold hover:underline"
            />
          </span>
        </p>
      </AccountGroup>

      <AccountGroup
        title="PIN rápido"
        description="Desbloqueo táctil en pantallas de comandas y punto de venta."
      >
        <div className="relative max-w-xs">
          <Field
            label="Código PIN numérico"
            intent="account.pin"
            type={showPin ? "text" : "password"}
            inputMode="numeric"
            value={quickPin}
            onChange={e => setQuickPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="1234"
            hint="Cuatro dígitos"
          />
          <button
            type="button"
            onClick={() => setShowPin(!showPin)}
            aria-label={showPin ? "Ocultar PIN" : "Mostrar PIN"}
            className="absolute right-3 top-8 cursor-pointer text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            {showPin ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </AccountGroup>

      <AccountGroup
        title="Verificación en dos pasos"
        description="Una capa extra de protección sobre tu contraseña."
      >
        <ActionRowList>
          <ActionRow
            title="Autenticación en dos pasos (2FA)"
            description="Pide un código temporal adicional al iniciar sesión desde una ubicación nueva."
            badge={
              <StatusPill tone={twoFactorEnabled ? "success" : "muted"}>
                {twoFactorEnabled ? "Activada" : "Desactivada"}
              </StatusPill>
            }
            action={
              <Toggle
                intent="account.2fa"
                checked={twoFactorEnabled}
                onCheckedChange={setTwoFactorEnabled}
              />
            }
          />
        </ActionRowList>
      </AccountGroup>

      <AccountGroup
        title="Sesión actual"
        description="El navegador desde el que estás trabajando ahora mismo."
      >
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gray-50 p-3.5 dark:bg-white/[0.03]">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-9 flex-none items-center justify-center rounded-[10.5px] bg-white text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              <Monitor className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-theme-sm font-medium text-secondary-600 dark:text-white/90">
                {session.browser} — {session.os}
              </p>
              <p className="truncate text-theme-xs text-gray-500 dark:text-gray-400">
                {[session.timeZone, session.language].filter(Boolean).join(" · ") ||
                  "Sin datos de entorno"}
              </p>
            </div>
          </div>

          <StatusPill tone="success">Esta sesión</StatusPill>
        </div>

        <InlineNotice icon={Info}>
          Cerrar sesiones en otros dispositivos necesita backend de sesiones; hoy sólo se muestra la
          de este navegador.
        </InlineNotice>
      </AccountGroup>
    </AccountCard>
  );
};
