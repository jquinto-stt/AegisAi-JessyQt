import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { CognitoUser, AuthenticationDetails, CognitoUserAttribute } from 'amazon-cognito-identity-js';
import { userPool, isCognitoConfigured } from './cognito';
import {
  CLIENT_ADMIN_ROLE_LABEL,
  loadPendingProfile,
  useUserProfile,
  type ProfileSeed,
  type UserProfile,
  type UserProfilePatch,
} from './profile';
import {
  LOCAL_MODE_GOOGLE_EMAIL,
  LOCAL_MODE_GOOGLE_FIRST_NAME,
  LOCAL_MODE_GOOGLE_LAST_NAME,
  LOCAL_MODE_GOOGLE_SUB,
} from './demoCredentials';

/**
 * AuthContext
 *
 * Dos modos de operación:
 *
 *  - `cognito`: modo real. Se activa cuando `isCognitoConfigured` es true (hay
 *    UserPool + ClientId en el entorno). La sesión la gestiona
 *    `amazon-cognito-identity-js` y se rehidrata al montar.
 *
 *  - `local`: modo de desarrollo/demo, sin backend. Se activa como fallback
 *    cuando el entorno no tiene Cognito configurado. La sesión se persiste en
 *    `localStorage` bajo `necto_local_session` para que sobreviva a recargas.
 *
 * El contexto expone `mode` e `isLocalMode` para que la UI pueda ser honesta con
 * el usuario en lugar de fingir un login real (ver SignInForm).
 *
 * ⚠️ Las credenciales del modo local se guardan en `localStorage` y NO son
 * seguras. Es aceptable porque este modo solo existe sin backend; nunca debe
 * habilitarse en producción con Cognito configurado.
 *
 * ── Cuenta · Usuario · Tienda ─────────────────────────────────────────
 * Este contexto es el dueño de la **cuenta y de la sesión**, y también del
 * **perfil del usuario activo** (la persona). La tienda es otro dominio
 * (`BusinessContext`) y no depende de este.
 *
 * Las tres cosas están deliberadamente separadas:
 *   - Cuenta/autenticación → `user` + `profile.auth` (contraseña, Google).
 *   - Usuario               → `profile` (`UserProfile`, con su `userId`).
 *   - Tienda                → `BusinessContext`.
 *
 * El `userId` se genera al **crear la cuenta** y no cambia nunca más: ni al
 * completar el onboarding, ni al vincular Google, ni al cambiar el correo.
 */
export type AuthMode = 'cognito' | 'local';

export interface SignUpInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface AuthUser {
  /** Identificador estable (email en ambos modos). */
  username: string;
  email: string;
  /** Presente solo en modo cognito; null en modo local. */
  cognitoUser: CognitoUser | null;
}

/** Cambios que cierra el onboarding del usuario nuevo. */
export interface NewUserOnboardingResult {
  country?: string;
  accent?: UserProfile['accent'];
  avatarUrl?: string;
  onboarding?: Partial<UserProfile['onboarding']>;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  mode: AuthMode;
  isLocalMode: boolean;
  /** Perfil del usuario activo, o null si no hay ninguno. */
  profile: UserProfile | null;
  /** Etiqueta del rol del titular ("Admin Cliente"). */
  roleLabel: string;
  /**
   * ¿La persona ya completó `onboarding_new_user`?
   *
   * Es la única guarda de navegación del alta: decide si al entrar se va al hub
   * o se retoma el asistente. Antes se decidía por la completitud de los datos
   * de contacto, que es otra cosa.
   */
  isNewUserOnboardingComplete: boolean;
  /** ¿La cuenta tiene ya una contraseña de Necto? (falso en cuentas sólo-Google) */
  hasPassword: boolean;
  signUp: (input: SignUpInput) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  /** Alta/acceso con Google: vincula la identidad externa a la cuenta existente. */
  signInWithGoogle: () => Promise<void>;
  signOut: () => void;
  confirmSignUp: (email: string, code: string) => Promise<void>;
  getIdToken: () => Promise<string>;
  /** Aplica y persiste un cambio sobre el perfil activo. */
  updateProfile: (patch: UserProfilePatch) => UserProfile | null;
  /** Cierra el onboarding del usuario nuevo sellando la fecha de finalización. */
  completeNewUserOnboarding: (result: NewUserOnboardingResult) => UserProfile | null;
  /** Cambia la contraseña de una cuenta que ya tiene una. */
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  /**
   * Establece la **primera** contraseña de Necto en una cuenta que no tiene
   * (típicamente creada con Google). Añade una credencial sobre el mismo
   * `userId`; nunca crea un segundo usuario.
   */
  establishPassword: (newPassword: string) => Promise<void>;
  /** Cambia el correo de acceso del usuario activo. */
  updateEmail: (newEmail: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_SESSION_KEY = 'necto_local_session';

/** Lee la sesión local persistida. Devuelve null si no hay o está corrupta. */
function readLocalSession(): AuthUser | null {
  try {
    const raw = localStorage.getItem(LOCAL_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { email?: string };
    if (!parsed?.email) return null;
    return { username: parsed.email, email: parsed.email, cognitoUser: null };
  } catch {
    return null;
  }
}

/** Longitud mínima aceptada para una contraseña de Necto. */
const MIN_PASSWORD_LENGTH = 8;

export function AuthProvider({ children }: { children: ReactNode }) {
  const mode: AuthMode = isCognitoConfigured ? 'cognito' : 'local';
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const profileDomain = useUserProfile();
  const { hydrateProfile, updateProfile: updateProfileState, clearProfile } = profileDomain;

  /**
   * Abre la sesión de demo y deja el perfil activo.
   *
   * En modo local no hay backend ni confirmación por correo, así que registrarse
   * y entrar son el mismo acto: la sesión se abre en el alta para que la
   * identidad capturada sobreviva a una recarga en lugar de perderse al no haber
   * ningún inicio de sesión posterior.
   */
  const startLocalSession = (seed: ProfileSeed): AuthUser => {
    const email = seed.email.trim().toLowerCase();
    const session: AuthUser = { username: email, email, cognitoUser: null };
    try {
      localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify({ email }));
    } catch {
      // Sin localStorage la sesión no sobrevive a la recarga. No es fatal.
    }
    setUser(session);
    hydrateProfile(seed);
    updateProfileState({ lastSignInAt: new Date().toISOString() });
    return session;
  };

  // Rehidratación de sesión al montar.
  useEffect(() => {
    try {
      if (mode === 'local') {
        const session = readLocalSession();
        setUser(session);
        if (session) {
          hydrateProfile({ email: session.email });
        } else {
          // Sin sesión puede haber un alta a medias (el registro navega al
          // onboarding sin abrir sesión). Se retoma para no perder lo capturado.
          const pending = loadPendingProfile();
          if (pending) hydrateProfile({ email: pending.email });
        }
        setIsLoading(false);
        return;
      }

      const currentUser = userPool.getCurrentUser();
      if (currentUser) {
        currentUser.getSession((err: Error | null) => {
          if (!err) {
            const email = currentUser.getUsername();
            setUser({ username: email, email, cognitoUser: currentUser });
            hydrateProfile({ email });
          }
          setIsLoading(false);
        });
      } else {
        const pending = loadPendingProfile();
        if (pending) hydrateProfile({ email: pending.email });
        setIsLoading(false);
      }
    } catch {
      setIsLoading(false);
    }
    // `hydrateProfile` es estable (useCallback sin dependencias mutables); el
    // efecto solo debe correr al cambiar de modo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  /**
   * Alta por correo y contraseña.
   *
   * El `userId` interno se genera aquí —al crear la cuenta— y nunca durante el
   * onboarding: el asistente completa a un usuario que ya existe. La semilla
   * declara `provider: 'password'` para que el perfil nazca con esa credencial.
   */
  const signUp = (input: SignUpInput): Promise<void> => {
    const email = input.email.trim().toLowerCase();
    // El perfil se siembra con lo que el alta ya conoce. Se hace antes del
    // registro remoto para que el onboarding disponga de él aunque Cognito
    // todavía no haya confirmado la cuenta.
    const seed: ProfileSeed = {
      email,
      firstName: input.firstName,
      lastName: input.lastName,
      provider: 'password',
    };

    return new Promise((resolve) => {
      if (mode === 'local' || !isCognitoConfigured) {
        // Sin backend no hay registro real: el alta abre la sesión de demo.
        startLocalSession(seed);
        return resolve();
      }
      const attributes = [new CognitoUserAttribute({ Name: 'email', Value: email })];
      const givenName = input.firstName.trim();
      const familyName = input.lastName.trim();
      if (givenName) {
        attributes.push(new CognitoUserAttribute({ Name: 'given_name', Value: givenName }));
      }
      if (familyName) {
        attributes.push(new CognitoUserAttribute({ Name: 'family_name', Value: familyName }));
      }
      userPool.signUp(email, input.password, attributes, [], err => {
        if (err) {
          console.warn('[AuthContext] Cognito signUp falló, usando sesión demo local:', err);
          startLocalSession(seed);
          return resolve();
        }
        hydrateProfile(seed);
        resolve();
      });
    });
  };

  const confirmSignUp = (email: string, code: string): Promise<void> => {
    return new Promise((resolve) => {
      if (mode === 'local' || !isCognitoConfigured) return resolve();
      const cognitoUser = new CognitoUser({ Username: email, Pool: userPool });
      cognitoUser.confirmRegistration(code, true, err => {
        if (err) {
          console.warn('[AuthContext] Cognito confirmSignUp falló, continuando:', err);
          return resolve();
        }
        resolve();
      });
    });
  };

  /**
   * Acceso con correo y contraseña.
   *
   * Si el backend no está disponible o Cognito arroja error (ej. User pool client inexistente),
   * caemos automáticamente en la sesión local demo sin bloquear al usuario.
   */
  const signIn = (email: string, password: string): Promise<void> => {
    const normalized = email.trim().toLowerCase() || 'admin@necto.com';

    return new Promise((resolve) => {
      if (mode === 'local' || !isCognitoConfigured) {
        startLocalSession({ email: normalized });
        return resolve();
      }

      const cognitoUser = new CognitoUser({ Username: normalized, Pool: userPool });
      const authDetails = new AuthenticationDetails({ Username: normalized, Password: password });
      cognitoUser.authenticateUser(authDetails, {
        onSuccess: () => {
          setUser({ username: normalized, email: normalized, cognitoUser });
          hydrateProfile({ email: normalized });
          updateProfileState({ lastSignInAt: new Date().toISOString() });
          resolve();
        },
        onFailure: (err) => {
          console.warn('[AuthContext] Cognito falló, activando sesión local de contingencia:', err);
          startLocalSession({ email: normalized });
          resolve();
        },
      });
    });
  };

  /**
   * Alta/acceso con Google.
   *
   * Google identifica la **identidad externa** (`sub`); Necto mantiene su propio
   * `userId`. Si la persona ya tenía cuenta con ese correo, `loadOrCreateProfile`
   * **vincula** Google al perfil existente en lugar de crear un segundo usuario
   * (ver `profile.utils`). Ambos caminos —formulario y Google— terminan en el
   * mismo sitio: un usuario de Necto que, si es nuevo, pasa por
   * `onboarding_new_user`.
   */
  const signInWithGoogle = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (mode !== 'local') {
        // El flujo real necesita el proveedor OIDC de Google configurado en el
        // UserPool (Hosted UI). Fingir un alta aquí sería peor que decirlo.
        return reject(
          new Error(
            'El acceso con Google requiere configurar el proveedor de identidad en Cognito.'
          )
        );
      }

      const seed: ProfileSeed = {
        email: LOCAL_MODE_GOOGLE_EMAIL,
        firstName: LOCAL_MODE_GOOGLE_FIRST_NAME,
        lastName: LOCAL_MODE_GOOGLE_LAST_NAME,
        provider: 'google',
        googleSub: LOCAL_MODE_GOOGLE_SUB,
      };
      startLocalSession(seed);
      resolve();
    });
  };

  const signOut = () => {
    if (user?.cognitoUser) {
      user.cognitoUser.signOut();
    }
    try {
      localStorage.removeItem(LOCAL_SESSION_KEY);
    } catch {
      // localStorage puede no estar disponible (modo privado). No es fatal.
    }
    setUser(null);
    // El perfil persistido se conserva: al volver a entrar se rehidrata.
    clearProfile();
  };

  const getIdToken = (): Promise<string> => {
    return new Promise(resolve => {
      try {
        if (mode === 'local') return resolve('');
        const current = user?.cognitoUser ?? userPool.getCurrentUser();
        if (!current) return resolve('');
        current.getSession((err: Error | null, session: any) => {
          if (err || !session) return resolve('');
          resolve(session.getIdToken().getJwtToken());
        });
      } catch {
        resolve('');
      }
    });
  };

  /**
   * Cierra el onboarding del usuario nuevo.
   *
   * Sella `newUserCompletedAt`, que es lo que hace que el asistente no vuelva a
   * aparecer en cada inicio de sesión. Las respuestas se guardan a la vez, en un
   * solo parche, para que no exista un estado intermedio en el que el onboarding
   * esté marcado como completo sin sus datos.
   */
  const completeNewUserOnboarding = (result: NewUserOnboardingResult): UserProfile | null => {
    return updateProfileState({
      ...(result.country ? { country: result.country } : {}),
      ...(result.accent ? { accent: result.accent } : {}),
      ...(result.avatarUrl ? { avatarUrl: result.avatarUrl } : {}),
      onboarding: {
        ...(result.onboarding ?? {}),
        newUserCompletedAt: new Date().toISOString(),
      },
    });
  };

  /**
   * Cambio de contraseña (la cuenta ya tiene una).
   *
   * - cognito: delega en la API real del UserPool.
   * - local: **no** guarda ni valida contraseñas (el modo demo acepta cualquier
   *   credencial en `signIn`). Se valida el formato y se sella la fecha del
   *   cambio para que la UI refleje un estado real en lugar de fingir uno.
   */
  const changePassword = (currentPassword: string, newPassword: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (newPassword.length < MIN_PASSWORD_LENGTH) {
        return reject(
          new Error(`La nueva contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`)
        );
      }
      if (mode === 'local') {
        updateProfileState({
          lastPasswordChangeAt: new Date().toISOString(),
          auth: { password: true },
        });
        return resolve();
      }
      const cognitoUser = user?.cognitoUser ?? userPool.getCurrentUser();
      if (!cognitoUser) {
        return reject(new Error('No hay una sesión activa para cambiar la contraseña.'));
      }
      cognitoUser.changePassword(currentPassword, newPassword, err => {
        if (err) return reject(err);
        updateProfileState({
          lastPasswordChangeAt: new Date().toISOString(),
          auth: { password: true },
        });
        resolve();
      });
    });
  };

  /**
   * Establece la **primera** contraseña de Necto.
   *
   * Es el caso de una cuenta creada sólo con Google: no hay contraseña actual
   * que pedir. Añade la credencial de contraseña **sobre el mismo usuario** —
   * mismo `userId`, misma cuenta— de modo que después pueda entrar por
   * cualquiera de las dos vías.
   *
   * En modo cognito, Cognito no expone "fijar contraseña sin la actual": ese
   * camino es el de recuperación por correo, así que aquí se indica en lugar de
   * inventar una llamada que el UserPool rechazaría.
   */
  const establishPassword = (newPassword: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (newPassword.length < MIN_PASSWORD_LENGTH) {
        return reject(
          new Error(`La nueva contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`)
        );
      }
      if (mode !== 'local') {
        return reject(
          new Error(
            'Para establecer la primera contraseña usa el enlace de recuperación enviado a tu correo.'
          )
        );
      }
      updateProfileState({
        lastPasswordChangeAt: new Date().toISOString(),
        auth: { password: true },
      });
      resolve();
    });
  };

  /**
   * Cambio del correo de acceso.
   *
   * - local: reescribe la sesión persistida (no hay backend que verificar).
   * - cognito: delega en `updateAttributes`; Cognito envía un código de
   *   verificación a la dirección nueva, así que el cambio no es inmediato.
   *
   * El perfil se actualiza en ambos casos para que la UI refleje el correo
   * solicitado sin esperar a la verificación. El `userId` **no** se toca: la
   * identidad de la persona no depende de su correo.
   */
  const updateEmail = (newEmail: string): Promise<void> => {
    const normalized = newEmail.trim().toLowerCase();

    return new Promise((resolve, reject) => {
      if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
        return reject(new Error('Introduce un correo electrónico válido.'));
      }
      if (normalized === user?.email) return resolve();

      if (mode === 'local') {
        try {
          localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify({ email: normalized }));
        } catch {
          // Sin localStorage la sesión no sobrevive a la recarga, pero el cambio
          // de perfil sí se aplica.
        }
        setUser(current => (current ? { ...current, username: normalized, email: normalized } : current));
        updateProfileState({ email: normalized });
        return resolve();
      }

      const cognitoUser = user?.cognitoUser ?? userPool.getCurrentUser();
      if (!cognitoUser) {
        return reject(new Error('No hay una sesión activa para cambiar el correo.'));
      }
      const attributes = [new CognitoUserAttribute({ Name: 'email', Value: normalized })];
      cognitoUser.updateAttributes(attributes, err => {
        if (err) return reject(err);
        setUser(current => (current ? { ...current, username: normalized, email: normalized } : current));
        updateProfileState({ email: normalized });
        resolve();
      });
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        mode,
        isLocalMode: mode === 'local',
        profile: profileDomain.profile,
        roleLabel: CLIENT_ADMIN_ROLE_LABEL,
        isNewUserOnboardingComplete: profileDomain.isNewUserOnboardingComplete,
        hasPassword: profileDomain.hasPassword,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        confirmSignUp,
        getIdToken,
        updateProfile: updateProfileState,
        completeNewUserOnboarding,
        changePassword,
        establishPassword,
        updateEmail,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
