import React from "react";
import {
  Check,
  Store,
  Upload,
  Trash2,
  ImageIcon,
} from "lucide-react";
import { Button } from "@/elements";
import { TransformControls } from "../TransformControls";
import { DEFAULT_TRANSFORM, transformStyle } from "../business-settings.constants";
import type { BusinessSettingsTabForm } from "../hooks/useBusinessSettingsForm";
import {
  SettingsCard,
  SettingsSection,
  SettingsLabel,
  settingsControlClass,
  settingsUploadAction,
} from "../SettingsSection";

/* ── SECCIÓN 5: MARCA Y IDENTIDAD VISUAL ─────────────────────────────
 * Live preview, logo, banner, brand colour and notification sound.
 * El encabezado de la sección lo pinta el modal desde el catálogo.
 *
 * ⚠️ Este tab monta **su propia** `SettingsCard`: los grupos van como hijos
 * directos de ella, para que su `divide-y` ponga la línea entre grupos.
 *
 * ── Lo que se queda nativo en este tab, y por qué ────────────────────
 *
 * - **Las dos acciones de archivo** (`settingsUploadAction`) son un `<label>`
 *   que envuelve un `<input type="file">` oculto. `Button` **no soporta
 *   `asChild`** (lo declara en sus propias limitaciones): siempre renderiza un
 *   `<button>`, y un `<button>` no puede envolver un input de archivo. Se
 *   queda el `<label>`.
 * - **Las cinco muestras de color** llevan `style={{ backgroundColor }}`,
 *   `aria-pressed`, `aria-label` y `title`. `Button` tiene una lista de props
 *   fija y **no reenvía `style` ni `aria-*`**: convertirlas perdería el color y
 *   el estado accesible. Se quedan nativas.
 * - **El selector de sonido** es un `<select>` controlado por `soundAlert`; el
 *   `Select` del catálogo es **no controlado** y no acepta `value`.
 *
 * Lo que **sí** se convierte: las dos acciones "Quitar", que son acciones de
 * grupo en estilo terciario (`Button variant="ghost"`).
 * ────────────────────────────────────────────────────────────────── */

export const BrandingTab: React.FC<{ form: BusinessSettingsTabForm }> = ({ form }) => {
  const { previewLocation, brandColor, setBrandColor, soundAlert, setSoundAlert, logoUrl, setLogoUrl, logoTransform, setLogoTransform, bannerUrl, setBannerUrl, bannerTransform, setBannerTransform, handleLogoUpload, handleBannerUpload, name } = form;

  return (
    <SettingsCard>
      {/* ── Vista previa: refleja la tarjeta del hub y la portada de la tienda ── */}
      <SettingsSection title="Vista previa">
        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
          {/* Cover.
              ⚠️ Sin portada **no** se pinta una losa `bg-brand-500`: la tarjeta
              del hub dejó de inventarse una portada, así que la vista previa
              tiene que decir lo mismo o promete algo que el cliente no verá. */}
          <div className="relative h-36 w-full overflow-hidden">
            {bannerUrl ? (
              <>
                <img
                  src={bannerUrl}
                  alt=""
                  style={transformStyle(bannerTransform)}
                  className="h-full w-full object-cover"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent" />
              </>
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500">
                <ImageIcon className="h-6 w-6" />
                <span className="text-theme-xs font-medium">Sin portada</span>
              </div>
            )}
            <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-theme-xs font-semibold text-gray-800 shadow-theme-xs ring-1 ring-black/5 backdrop-blur-md">
              <span className="h-1.5 w-1.5 rounded-full bg-success-500" />
              Operando
            </span>
          </div>

          {/* Identity */}
          <div className="px-5 pb-5">
            {/* `relative z-10` so the positioned cover does not paint over the logo */}
            <div className="relative z-10 -mt-7 flex items-end">
              <div className="flex h-14 w-14 flex-none items-center justify-center overflow-hidden rounded-xl bg-gray-50 ring-4 ring-white dark:bg-gray-800 dark:ring-gray-900">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt=""
                    style={transformStyle(logoTransform)}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Store className="h-7 w-7 text-brand-500" />
                )}
              </div>
            </div>
            {/* El nombre va en `text-lg font-bold` a propósito: esto **no** es un
                encabezado de la sección, es la maqueta de la tienda pública. Si
                bajara a la escala de los ajustes, la vista previa dejaría de
                parecerse a lo que verá el comprador. */}
            <h4 className="mt-3.5 truncate text-lg font-bold tracking-tight text-secondary-600 dark:text-white">
              {name.trim() || "Nombre de la sede"}
            </h4>
            <p className="mt-1 truncate text-theme-xs text-gray-500 dark:text-gray-400">
              {previewLocation}
            </p>
          </div>
        </div>
      </SettingsSection>

      {/* ── Logo ── */}
      <SettingsSection
        title="Logo de la sede"
        description="Cuadrado, mínimo 400 × 400 px (PNG, JPG o WebP)."
        bodyClassName="space-y-5"
        actions={
          <>
            <label className={settingsUploadAction}>
              <Upload className="h-3.5 w-3.5" />
              <span>{logoUrl ? "Cambiar logo" : "Subir logo"}</span>
              <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
            </label>
            {logoUrl && (
              <Button
                variant="ghost"
                intent="branding.logo.remove"
                onClick={() => {
                  setLogoUrl("");
                  setLogoTransform(DEFAULT_TRANSFORM);
                }}
                startIcon={<Trash2 className="h-3.5 w-3.5" />}
                className="h-auto gap-1.5 rounded-full px-3 py-2 text-theme-xs font-semibold text-gray-500 hover:bg-gray-100 hover:text-brand-500 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-brand-400"
              >
                Quitar
              </Button>
            )}
          </>
        }
      >
        <div className="flex flex-col gap-5 sm:flex-row">
          <div className="flex h-24 w-24 flex-none items-center justify-center overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Logo de la sede"
                style={transformStyle(logoTransform)}
                className="h-full w-full object-cover"
              />
            ) : (
              <Store className="h-8 w-8 text-gray-300 dark:text-gray-600" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            {logoUrl ? (
              <TransformControls value={logoTransform} onChange={setLogoTransform} />
            ) : (
              <p className="text-theme-xs leading-relaxed text-gray-400 dark:text-gray-500">
                Sube un logo para ajustar su zoom, rotación y encuadre.
              </p>
            )}
          </div>
        </div>
      </SettingsSection>

      {/* ── Portada ── */}
      <SettingsSection
        title="Portada"
        description="Es la imagen que aparece arriba de la tarjeta de tu sede y en la tienda web. Recomendado 1600 × 600 px."
        bodyClassName="space-y-4"
        actions={
          <>
            <label className={settingsUploadAction}>
              <Upload className="h-3.5 w-3.5" />
              <span>{bannerUrl ? "Cambiar portada" : "Subir portada"}</span>
              <input type="file" accept="image/*" onChange={handleBannerUpload} className="hidden" />
            </label>

            {bannerUrl && (
              <Button
                variant="ghost"
                intent="branding.banner.remove"
                onClick={() => {
                  setBannerUrl("");
                  setBannerTransform(DEFAULT_TRANSFORM);
                }}
                startIcon={<Trash2 className="h-3.5 w-3.5" />}
                className="h-auto gap-1.5 rounded-full px-3 py-2 text-theme-xs font-semibold text-gray-500 hover:bg-gray-100 hover:text-brand-500 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-brand-400"
              >
                Quitar
              </Button>
            )}
          </>
        }
      >
        <div className="relative h-40 w-full overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
          {bannerUrl ? (
            <img
              src={bannerUrl}
              alt="Portada de la sede"
              style={transformStyle(bannerTransform)}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-gray-400 dark:text-gray-500">
              <ImageIcon className="h-7 w-7" />
              <span className="text-theme-sm font-medium">Sin portada configurada</span>
            </div>
          )}
        </div>

        {bannerUrl && (
          <TransformControls value={bannerTransform} onChange={setBannerTransform} />
        )}
      </SettingsSection>

      {/* ── Color y alertas ── */}
      <SettingsSection
        title="Color de marca y alertas"
        description="Tono primario de la sede y timbre de avisos operativos."
        bodyClassName="space-y-5"
      >
        <div>
          <SettingsLabel>Color de marca</SettingsLabel>
          <div className="flex flex-wrap items-center gap-2.5">
            {/* ⚠️ Muestras nativas: `Button` no reenvía `style` ni `aria-*`, y
                cada muestra necesita su color en línea, su `aria-pressed` y su
                `aria-label`. Convertirlas perdería las tres cosas. */}
            {[
              { name: "Naranja Necto", hex: "#FF3F1A" },
              { name: "Azul Cobalto", hex: "#2563EB" },
              { name: "Esmeralda", hex: "#059669" },
              { name: "Violeta", hex: "#7C3AED" },
              { name: "Grafito", hex: "#18181B" },
            ].map(c => (
              <button
                key={c.hex}
                type="button"
                onClick={() => setBrandColor(c.hex)}
                title={c.name}
                aria-label={c.name}
                aria-pressed={brandColor === c.hex}
                className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-full transition-transform ${
                  brandColor === c.hex
                    ? "scale-105 ring-2 ring-brand-500 ring-offset-2 dark:ring-offset-gray-900"
                    : "hover:scale-105"
                }`}
                style={{ backgroundColor: c.hex }}
              >
                {brandColor === c.hex && <Check className="h-4 w-4 stroke-[3] text-white" />}
              </button>
            ))}

            {/* Custom colour — full freedom beyond the preset palette */}
            <label
              className="relative flex h-9 w-9 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-gray-100 ring-1 ring-gray-200 transition-transform hover:scale-105 dark:bg-gray-800 dark:ring-gray-700"
              title="Color personalizado"
            >
              <ImageIcon className="h-4 w-4 text-gray-400" />
              <input
                type="color"
                value={brandColor}
                onChange={e => setBrandColor(e.target.value)}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                aria-label="Color personalizado"
              />
            </label>

            <span className="ml-1 rounded-full bg-gray-100 px-2.5 py-1 text-theme-xs font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              {brandColor}
            </span>
          </div>
        </div>

        <div>
          <SettingsLabel htmlFor="settings-sound">Sonido de alerta de nuevos pedidos</SettingsLabel>
          {/* ⚠️ `<select>` controlado por `soundAlert`. El `Select` del catálogo
              es **no controlado** (gestiona su propio estado desde
              `defaultValue`) y no acepta `value`, así que no puede sustituirlo
              sin cambiar el contrato del formulario. */}
          <select
            id="settings-sound"
            value={soundAlert}
            onChange={e => setSoundAlert(e.target.value as any)}
            className={`${settingsControlClass} sm:w-72`}
          >
            <option value="bell">Campana suave (Bell)</option>
            <option value="chime">Timbre dinámico (Chime)</option>
            <option value="kitchen_ding">Timbre de cocina</option>
            <option value="pos_beep">Bip de caja / POS (Beep)</option>
            <option value="mute">Silencioso (Mute)</option>
          </select>
        </div>
      </SettingsSection>
    </SettingsCard>
  );
};
