import { useCallback, useEffect, useState } from "react";
import { uiStore } from "@/stores";
import { useAuth } from "../../../../auth/AuthContext";
import { useBusiness } from "../../../../context/BusinessContext";
import {
  DEFAULT_ACCENT,
  DEFAULT_NOTIFICATION_CHANNEL,
  profileDisplayName,
  profileInitials,
  type AccentId,
  type AvailabilityShift,
  type NotificationChannel,
  type ProfileThemePreference,
} from "../../../../auth/profile";

export type AccountTab = "profile" | "contact" | "preferences" | "security" | "permissions";

/**
 * Huella de lo que el borrador va a persistir.
 *
 * Sirve para una sola pregunta: "¿hay algo que guardar?". Se comparan dos
 * huellas —la del borrador y la de lo ya guardado— en vez de mantener a mano un
 * `isDirty` que cada setter tendría que levantar: con veinte campos, olvidarse de
 * uno deja el aviso mintiendo.
 *
 * ⚠️ Los campos se **normalizan igual** en las dos huellas (recorte de espacios
 * y correo en minúsculas). Comparar el valor crudo del input contra el
 * persistido marcaría como "cambiado" un simple espacio al final.
 *
 * Las contraseñas quedan fuera a propósito: no se persisten con el resto del
 * perfil y siempre deben verse como "pendientes de escribir".
 */
function accountSignature(v: {
  firstName: string;
  lastName: string;
  documentId: string;
  position: string;
  preferredBusinessId: string;
  city: string;
  country: string;
  bio: string;
  avatarUrl: string;
  accent: AccentId;
  email: string;
  billingEmail: string;
  contactPhone: string;
  whatsappNumber: string;
  availabilityShift: AvailabilityShift;
  quickPin: string;
  twoFactorEnabled: boolean;
  theme: ProfileThemePreference;
  notificationChannel: NotificationChannel;
}): string {
  return JSON.stringify([
    v.firstName.trim(),
    v.lastName.trim(),
    v.documentId.trim(),
    v.position.trim(),
    v.preferredBusinessId,
    v.city.trim(),
    v.country.trim(),
    v.bio.trim(),
    v.avatarUrl,
    v.accent,
    v.email.trim().toLowerCase(),
    v.billingEmail.trim(),
    v.contactPhone.trim(),
    v.whatsappNumber.trim(),
    v.availabilityShift,
    v.quickPin,
    v.twoFactorEnabled,
    v.theme,
    v.notificationChannel,
  ]);
}

/**
 * Owns every field of the account-settings form.
 *
 * El formulario es un **borrador**: se siembra desde el `UserProfile` real
 * cuando el modal se abre y solo se persiste al guardar, de modo que
 * "Cancelar" descarta de verdad. No queda ningún valor hardcodeado: si un
 * campo aparece vacío es porque el administrador no lo ha capturado, y la UI
 * lo dice ("Por configurar") en lugar de inventar un dato.
 *
 * El borrador incluye también la **personalización** (avatar y acento), que es
 * la misma que se ofrece en `onboarding_new_user`. Al ser borrador, el acento
 * puede previsualizarse en vivo dentro del modal antes de guardar.
 */
export function useAccountSettingsForm(isOpen: boolean) {
  const {
    profile,
    updateProfile,
    changePassword,
    establishPassword,
    updateEmail,
    roleLabel,
    isLocalMode,
    hasPassword,
  } = useAuth();
  const { activeBusiness, businesses } = useBusiness();

  const [activeTab, setActiveTab] = useState<AccountTab>("profile");

  // Perfil & Identidad
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [position, setPosition] = useState("");
  const [preferredBusinessId, setPreferredBusinessId] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [bio, setBio] = useState("");
  const [avatarPreview, setAvatarPreview] = useState("");
  /** Acento del borrador: permite previsualizarlo antes de guardar. */
  const [accent, setAccent] = useState<AccentId>(DEFAULT_ACCENT);

  // Canales de Contacto
  const [email, setEmail] = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [availabilityShift, setAvailabilityShift] = useState<AvailabilityShift>("all_shifts");

  // Preferencias
  const [theme, setTheme] = useState<ProfileThemePreference>(uiStore.theme);
  const [notificationChannel, setNotificationChannel] =
    useState<NotificationChannel>(DEFAULT_NOTIFICATION_CHANNEL);

  // Seguridad & Credenciales
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [quickPin, setQuickPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  // Estado de guardado
  const [savedToast, setSavedToast] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  /**
   * Vuelca el perfil persistido en el borrador.
   *
   * El tema se lee de `uiStore` (dueño en tiempo de ejecución) y no del perfil:
   * así el control siempre muestra el tema realmente aplicado, aunque el usuario
   * lo haya cambiado con el botón de tema fuera del modal.
   */
  const seedFromProfile = useCallback(() => {
    if (!profile) return;
    setFirstName(profile.firstName);
    setLastName(profile.lastName);
    setDocumentId(profile.documentId);
    setPosition(profile.position);
    setPreferredBusinessId(profile.preferredBusinessId || activeBusiness?.id || "");
    setCity(profile.city);
    setCountry(profile.country);
    setBio(profile.bio);
    setAvatarPreview(profile.avatarUrl);
    setAccent(profile.accent);

    setEmail(profile.email);
    setBillingEmail(profile.billingEmail);
    setContactPhone(profile.contactPhone);
    setWhatsappNumber(profile.whatsappNumber);
    setAvailabilityShift(profile.availabilityShift);

    setTheme(uiStore.theme);
    setNotificationChannel(profile.preferences.notificationChannel);

    setQuickPin(profile.quickPin);
    setTwoFactorEnabled(profile.twoFactorEnabled);

    // Los campos de contraseña nunca se pre-rellenan.
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setSaveError("");
  }, [profile, activeBusiness?.id]);

  // Se re-siembra al abrir el modal y cada vez que el perfil persistido cambia
  // (por ejemplo, tras guardar): el borrador nunca queda desincronizado.
  useEffect(() => {
    if (!isOpen) return;
    seedFromProfile();
  }, [isOpen, seedFromProfile]);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setAvatarPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  /** Descarta el borrador y vuelve a lo persistido. */
  const handleReset = () => {
    seedFromProfile();
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!profile) return;

    setSaveError("");
    const wantsPasswordChange = Boolean(newPassword);

    if (wantsPasswordChange) {
      if (newPassword.length < 8) {
        setSaveError("La nueva contraseña debe tener al menos 8 caracteres.");
        return;
      }
      if (newPassword !== confirmPassword) {
        setSaveError("Las contraseñas no coinciden.");
        return;
      }
    }

    setIsSaving(true);
    try {
      // Las credenciales van primero: si el backend las rechaza, no tiene
      // sentido haber escrito el resto del perfil.
      //
      // El camino depende de si la cuenta YA tiene contraseña: cambiarla exige
      // la actual; establecerla, no (todavía no existe ninguna). Los dos casos
      // escriben sobre el mismo usuario: establecer la primera contraseña añade
      // una credencial, no crea una cuenta nueva.
      if (wantsPasswordChange) {
        if (hasPassword) {
          await changePassword(currentPassword, newPassword);
        } else {
          await establishPassword(newPassword);
        }
      }
      const normalizedEmail = email.trim().toLowerCase();
      if (normalizedEmail && normalizedEmail !== profile.email) {
        await updateEmail(normalizedEmail);
      }

      updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        documentId: documentId.trim(),
        position: position.trim(),
        preferredBusinessId,
        city: city.trim(),
        country: country.trim(),
        bio: bio.trim(),
        avatarUrl: avatarPreview,
        accent,
        billingEmail: billingEmail.trim(),
        contactPhone: contactPhone.trim(),
        whatsappNumber: whatsappNumber.trim(),
        availabilityShift,
        quickPin,
        twoFactorEnabled,
        preferences: { theme, notificationChannel },
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 2400);
    } catch (err: any) {
      setSaveError(err?.message || "No se pudieron guardar los cambios.");
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * ¿Hay cambios sin guardar?
   *
   * Se **deriva** de las dos huellas en cada render en vez de guardarse en
   * estado: así no hay un fotograma de desfase al sembrar el borrador ni después
   * de guardar —que es justo el momento en que el aviso tiene que apagarse solo—.
   */
  const draftSignature = accountSignature({
    firstName,
    lastName,
    documentId,
    position,
    preferredBusinessId,
    city,
    country,
    bio,
    avatarUrl: avatarPreview,
    accent,
    email,
    billingEmail,
    contactPhone,
    whatsappNumber,
    availabilityShift,
    quickPin,
    twoFactorEnabled,
    theme,
    notificationChannel,
  });

  const persistedSignature = profile
    ? accountSignature({
        firstName: profile.firstName,
        lastName: profile.lastName,
        documentId: profile.documentId,
        position: profile.position,
        preferredBusinessId: profile.preferredBusinessId || activeBusiness?.id || "",
        city: profile.city,
        country: profile.country,
        bio: profile.bio,
        avatarUrl: profile.avatarUrl,
        accent: profile.accent,
        email: profile.email,
        billingEmail: profile.billingEmail,
        contactPhone: profile.contactPhone,
        whatsappNumber: profile.whatsappNumber,
        availabilityShift: profile.availabilityShift,
        quickPin: profile.quickPin,
        twoFactorEnabled: profile.twoFactorEnabled,
        // El tema lo posee `uiStore` en tiempo de ejecución, no el perfil: el que
        // está aplicado es el que se escribirá al guardar.
        theme: uiStore.theme,
        notificationChannel: profile.preferences.notificationChannel,
      })
    : "";

  const isDirty = Boolean(profile) && draftSignature !== persistedSignature;

  return {
    // identidad de la cuenta
    profile,
    displayName: profileDisplayName(profile),
    initials: profileInitials(profile),
    roleLabel,
    isLocalMode,
    /** ¿La cuenta ya tiene contraseña de Necto? Decide "cambiar" vs "establecer". */
    hasPassword,

    // navigation
    activeTab,
    setActiveTab,

    // profile
    firstName,
    setFirstName,
    lastName,
    setLastName,
    documentId,
    setDocumentId,
    position,
    setPosition,
    preferredBusinessId,
    setPreferredBusinessId,
    city,
    setCity,
    country,
    setCountry,
    bio,
    setBio,
    avatarPreview,
    setAvatarPreview,

    // personalización visual
    accent,
    setAccent,

    // contact
    email,
    setEmail,
    billingEmail,
    setBillingEmail,
    contactPhone,
    setContactPhone,
    whatsappNumber,
    setWhatsappNumber,
    availabilityShift,
    setAvailabilityShift,

    // preferences
    theme,
    setTheme,
    notificationChannel,
    setNotificationChannel,

    // security
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    showCurrentPw,
    setShowCurrentPw,
    showNewPw,
    setShowNewPw,
    quickPin,
    setQuickPin,
    showPin,
    setShowPin,
    twoFactorEnabled,
    setTwoFactorEnabled,

    // sedes disponibles para la sede habitual
    businesses,

    // toast + actions
    savedToast,
    saveError,
    isSaving,
    /** ¿El borrador difiere de lo persistido? Decide el aviso y el botón "Descartar". */
    isDirty,
    handleAvatarUpload,
    handleSave,
    handleReset,
  };
}

export type AccountSettingsForm = ReturnType<typeof useAccountSettingsForm>;
