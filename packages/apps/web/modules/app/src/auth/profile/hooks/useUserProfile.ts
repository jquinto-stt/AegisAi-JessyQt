import { useCallback, useRef, useState } from "react";
import { uiStore, type Theme } from "@/stores";
import type { ProfileSeed, UserProfile, UserProfilePatch } from "../profile.types";
import {
  hasPassword as computeHasPassword,
  isNewUserOnboardingComplete as computeIsNewUserOnboardingComplete,
  loadOrCreateProfile,
  mergeProfile,
  removeStoredProfile,
  saveProfile,
} from "../profile.utils";

/* ── User profile domain ───────────────────────────────────────────────
 * Dueño del perfil del usuario de Necto en memoria. La persistencia vive en
 * `profile.utils` (mapa `necto_user_profiles` indexado por email).
 *
 * Lo consume `AuthContext`, que es quien decide cuándo hay perfil (alta,
 * inicio de sesión) y cuándo deja de haberlo (cierre de sesión).
 * ──────────────────────────────────────────────────────────────────── */

/** Traduce la preferencia declarada al tema que `uiStore` sabe aplicar. */
function resolveTheme(preference: UserProfile["preferences"]["theme"]): Theme {
  if (preference !== "system") return preference;
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function useUserProfile() {
  const [profile, setProfileState] = useState<UserProfile | null>(null);
  /**
   * Espejo síncrono del perfil activo.
   *
   * `updateProfile` necesita leer el valor actual y devolver el resultado en la
   * misma llamada; un updater de `setState` no sirve porque React lo ejecuta
   * más tarde. El ref mantiene la lectura y la escritura en el mismo tick.
   */
  const profileRef = useRef<UserProfile | null>(null);

  const commit = useCallback((next: UserProfile | null) => {
    profileRef.current = next;
    setProfileState(next);
  }, []);

  /**
   * Carga (o crea) el perfil del email dado y lo activa.
   *
   * El tema se adopta **desde** `uiStore` y no al revés: `uiStore` es el dueño
   * en tiempo de ejecución (escribe la clase `dark` y `webforge-ui-preferences`).
   * Así el perfil refleja el tema real en lugar de competir con él; solo un
   * cambio explícito del usuario en Ajustes empuja perfil → `uiStore`.
   */
  const hydrateProfile = useCallback(
    (seed: ProfileSeed): UserProfile => {
      const next = loadOrCreateProfile(seed);
      const synced: UserProfile = {
        ...next,
        preferences: { ...next.preferences, theme: uiStore.theme },
      };
      commit(synced);
      return synced;
    },
    [commit]
  );

  /**
   * Aplica un parche al perfil activo, lo persiste y sincroniza el tema.
   * Devuelve el perfil resultante, o `null` si no hay perfil activo (una
   * carrera con el cierre de sesión no debe reintroducir un perfil fantasma).
   */
  const updateProfile = useCallback(
    (patch: UserProfilePatch): UserProfile | null => {
      const current = profileRef.current;
      if (!current) return null;

      const updated = mergeProfile(current, patch);
      // El email es la clave del mapa: si cambia, hay que retirar la entrada
      // anterior o quedaría un perfil huérfano con el correo viejo. El `userId`
      // NO cambia: la identidad de la persona no depende de su correo.
      if (updated.email !== current.email) removeStoredProfile(current.email);
      saveProfile(updated);
      commit(updated);

      const nextTheme = patch.preferences?.theme;
      if (nextTheme) {
        const resolved = resolveTheme(nextTheme);
        if (uiStore.theme !== resolved) uiStore.setTheme(resolved);
      }

      return updated;
    },
    [commit]
  );

  /** Desactiva el perfil en memoria. El registro persistido se conserva. */
  const clearProfile = useCallback(() => {
    commit(null);
  }, [commit]);

  /** Borra el perfil persistido y lo desactiva (descarte definitivo). */
  const discardProfile = useCallback(
    (email: string) => {
      removeStoredProfile(email);
      commit(null);
    },
    [commit]
  );

  return {
    profile,
    isNewUserOnboardingComplete: computeIsNewUserOnboardingComplete(profile),
    hasPassword: computeHasPassword(profile),
    hydrateProfile,
    updateProfile,
    clearProfile,
    discardProfile,
  };
}

export type UserProfileState = ReturnType<typeof useUserProfile>;
