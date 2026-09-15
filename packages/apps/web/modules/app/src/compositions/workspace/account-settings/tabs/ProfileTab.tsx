import React from "react";
import { Upload, Trash2, Calendar, Clock } from "lucide-react";
import { Button, Field, Select, Textarea } from "@/elements";
import { formatProfileLastSeen, formatProfileMonthYear } from "../../../../auth/profile";
import { AccentPicker, AvatarPresetPicker } from "../../../shared/personalization";
import {
  AccountCard,
  AccountGroup,
  FieldGrid,
  LabeledField,
} from "../AccountPanels";
import type { AccountSettingsForm } from "../hooks/useAccountSettingsForm";

interface ProfileTabProps {
  form: AccountSettingsForm;
}

/**
 * Perfil y personalización.
 *
 * Todo el contenido que ya tenía la pestaña, agrupado en una sola tarjeta: quién
 * eres, cómo te ves, dónde operas y las notas de la cuenta. Los grupos los separa
 * una línea, no un panel cada uno.
 *
 * ⚠️ La personalización (avatar y acento) es la **misma** que la del paso
 * `onboarding_new_user`: se usan los componentes compartidos, así que las dos
 * superficies no pueden divergir. Como el modal es un borrador, el acento se
 * previsualiza en vivo y sólo se aplica al guardar.
 */
export const ProfileTab: React.FC<ProfileTabProps> = ({ form }) => {
  const {
    profile,
    displayName,
    initials,
    firstName, setFirstName,
    lastName, setLastName,
    documentId, setDocumentId,
    position, setPosition,
    preferredBusinessId, setPreferredBusinessId,
    city, setCity,
    country, setCountry,
    bio, setBio,
    avatarPreview, setAvatarPreview,
    accent, setAccent,
    businesses,
    handleAvatarUpload,
  } = form;

  /**
   * Resumen de identidad de la cabecera.
   *
   * Se lee del perfil **persistido**, no del borrador: la cabecera dice "quién
   * eres" y cambia al guardar, mientras que el formulario de abajo es el
   * borrador. Si las dos leyeran lo mismo, la cabecera sería una segunda vista
   * previa del formulario en lugar de un resumen de la cuenta.
   *
   * Un dato que no está capturado no se inventa: se dice "Por configurar", que
   * es lo que ya hace el resto de la pantalla.
   */
  const identityMeta = [
    profile?.position?.trim(),
    [profile?.city?.trim(), profile?.country?.trim()].filter(Boolean).join(", "),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <AccountCard>
      {/*
        Cabecera de identidad, con la estructura de la página de perfil del
        catálogo (`UserProfile`: portada, avatar solapado, nombre y cargo).

        La banda se tiñe con el acento del borrador (`--necto-accent`, que el
        modal publica en su raíz) porque ésta es *la* superficie de
        personalización: igual que el resto del modal, enseña el color elegido
        antes de guardar.

        ⚠️ El avatar es un círculo propio con `object-cover`, **no** el `Avatar`
        del catálogo: ese componente pinta un `<img>` sin ancho ni alto, así que
        sólo acierta con imágenes cuadradas —una foto vertical se sale del
        círculo y una horizontal queda como un óvalo—. Aquí la foto la sube el
        usuario y llega en cualquier proporción.
      */}
      <div className="h-28 w-full bg-[var(--necto-accent)] bg-gradient-to-br from-white/25 via-white/5 to-transparent" />

      <div className="flex flex-wrap items-end gap-4 px-5 sm:px-6">
        <span className="-mt-10 flex size-20 flex-none items-center justify-center overflow-hidden rounded-full border-4 border-white bg-gray-100 text-theme-xl font-semibold text-gray-400 dark:border-gray-900 dark:bg-gray-800">
          {profile?.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={displayName}
              className="h-full w-full object-cover"
            />
          ) : (
            initials
          )}
        </span>

        <div className="min-w-0 flex-1 pb-1">
          <h2 className="truncate text-lg font-bold text-secondary-600 dark:text-white">
            {displayName}
          </h2>
          <p className="mt-0.5 truncate text-theme-sm text-gray-500 dark:text-gray-400">
            {identityMeta || "Por configurar"}
          </p>
        </div>
      </div>

      <AccountGroup
        first
        title="Personalización"
        description="Cómo te ves dentro de la plataforma. Es el mismo avatar y acento que elegiste al crear tu cuenta."
      >
        <div className="flex flex-wrap items-center gap-4">
          <div className="size-20 flex-none overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt="Foto del administrador"
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-theme-xl font-semibold text-gray-400">
                {initials}
              </span>
            )}
          </div>

          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-brand-500 px-3.5 py-2 text-theme-xs font-bold text-white transition-colors hover:bg-brand-600">
              <Upload className="size-3.5" />
              <span>Subir foto</span>
              <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            </label>

            {avatarPreview && (
              /*
                El `className` reproduce el control original: el `Button` del
                catálogo trae `h-10 px-5 py-3.5 text-sm` y `rounded-lg`, que aquí
                no encajan, así que se anulan (`h-auto`, `rounded-full`, `px-3
                py-2`, `text-theme-xs`) y se conserva el tinte de peligro al
                pasar por encima. `cn()` es `tailwind-merge`: lo de después gana.
              */
              <Button
                variant="ghost"
                intent="account.avatar.clear"
                onClick={() => setAvatarPreview("")}
                startIcon={<Trash2 className="size-3.5" />}
                className="h-auto gap-1.5 rounded-full px-3 py-2 text-theme-xs font-semibold text-gray-500 hover:bg-gray-100 hover:text-error-600 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-error-600"
              >
                Quitar
              </Button>
            )}

            <span className="text-theme-xs text-gray-400 dark:text-gray-500">
              JPG, PNG o WEBP · máx. 3 MB
            </span>
          </div>
        </div>

        <AvatarPresetPicker
          value={avatarPreview}
          onChange={setAvatarPreview}
          label="O elige un avatar minimalista"
        />

        <div className="border-t border-gray-100 pt-4 dark:border-gray-800">
          <LabeledField
            label="Color de acento"
            hint="Tiñe tus superficies de personalización y tus llamadas a la acción."
          >
            <AccentPicker value={accent} onChange={setAccent} />
          </LabeledField>
        </div>
      </AccountGroup>

      <AccountGroup
        title="Información personal"
        description="Tus datos como titular de la cuenta."
      >
        <FieldGrid>
          <Field
            label="Nombre"
            intent="account.firstName"
            type="text"
            required
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            placeholder="Tu nombre"
          />
          <Field
            label="Apellido"
            intent="account.lastName"
            type="text"
            required
            value={lastName}
            onChange={e => setLastName(e.target.value)}
            placeholder="Tu apellido"
          />
          <Field
            label="Documento de identidad (C.C. / NIT)"
            intent="account.documentId"
            type="text"
            value={documentId}
            onChange={e => setDocumentId(e.target.value)}
            placeholder="Ej: 1020304050"
            hint="Opcional · se usa en facturación"
          />
          <Field
            label="Cargo en la empresa"
            intent="account.position"
            type="text"
            value={position}
            onChange={e => setPosition(e.target.value)}
            placeholder="Ej: Gerente general"
          />
        </FieldGrid>
      </AccountGroup>

      <AccountGroup
        title="Ubicación y sede habitual"
        description="Desde dónde operas y qué sede abres por defecto."
      >
        <FieldGrid>
          <Field
            label="Ciudad"
            intent="account.city"
            type="text"
            value={city}
            onChange={e => setCity(e.target.value)}
            placeholder="Ej: Bogotá, D.C."
          />
          <Field
            label="País"
            intent="account.country"
            type="text"
            value={country}
            onChange={e => setCountry(e.target.value)}
            placeholder="Ej: Colombia"
          />
        </FieldGrid>

        <LabeledField label="Sede habitual de operación">
          {/*
            `Select` de @/elements sólo acepta `defaultValue` (no controlado), y el
            borrador se siembra en un efecto posterior al primer render: sin el
            `key`, el select se montaba con el valor vacío y se quedaba mostrando
            el placeholder aunque la sede sí estuviera elegida.
          */}
          <Select
            key={`branch-${preferredBusinessId}`}
            defaultValue={preferredBusinessId}
            onChange={setPreferredBusinessId}
            placeholder="Selecciona una sede"
            options={businesses.map(b => ({
              value: b.id,
              label: `${b.name} (${b.city || "Principal"})`,
            }))}
          />
        </LabeledField>
      </AccountGroup>

      <AccountGroup
        title="Notas internas"
        description="Sólo para ti: responsabilidades o recordatorios de la cuenta."
      >
        <Textarea
          rows={3}
          value={bio}
          onChange={setBio}
          placeholder="Descripción breve de tus responsabilidades o notas operativas…"
        />
      </AccountGroup>

      <AccountGroup title="Cuenta">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-theme-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-2">
            <Calendar className="size-4 text-gray-400" />
            Creada en{" "}
            <strong className="font-semibold text-secondary-600 dark:text-white/90">
              {formatProfileMonthYear(profile?.createdAt ?? null)}
            </strong>
          </span>
          <span className="flex items-center gap-2">
            <Clock className="size-4 text-gray-400" />
            Último cambio: {formatProfileLastSeen(profile?.updatedAt ?? null)}
          </span>
        </div>
      </AccountGroup>
    </AccountCard>
  );
};
