import { makeAutoObservable } from 'mobx';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * @kgId bfc4b63d87e3
 */
export type Theme = 'light' | 'dark';

/**
 * Preferencia de tema ELEGIDA por el usuario, que no es lo mismo que el tema
 * aplicado. `system` no impone un tema: sigue al sistema operativo.
 *
 * ── Por qué son dos cosas distintas (07/10) ───────────────────────────────
 *
 * Hasta ahora el store solo modelaba `light | dark` y cada pantalla guardaba su
 * propia preferencia en un `useState`. Eso tenía dos consecuencias medibles: al
 * recargar, el control volvía a mostrar su valor por defecto aunque el tema
 * aplicado fuera otro, y elegir «Sistema» no se recordaba ni seguía al SO.
 *
 * Con la preferencia en el store, «Sistema» significa algo: se resuelve contra
 * `prefers-color-scheme` y se vuelve a resolver si el sistema cambia de tema.
 */
export type ThemePreference = 'light' | 'dark' | 'system';

/**
 * Densidad de la lista de conversaciones.
 *
 * Vive aquí —y no en un `useState` de la pantalla que la ofrece— porque una
 * preferencia que se elige y no la lee nadie es un control que miente. La lee
 * `BandejaLista`, que es quien cambia el espaciado de cada hilo.
 */
export type DensidadBandeja = 'comoda' | 'compacta';

/**
 * Densidad del hilo del asistente.
 *
 * Misma regla que la anterior: se administra en `/configuracion → Apariencia` y
 * la lee `ChatThread`, que es quien separa los mensajes. Antes era un `useState`
 * local del panel de configuración del asistente que no leía nadie.
 */
export type DensidadAsistente = 'comoda' | 'compacta';

/**
 * @kgId 85ab001c7fe0
 */
export interface UIPreferences {
  theme: Theme;
  themePreference: ThemePreference;
  sidebarExpanded: boolean;
  densidadBandeja: DensidadBandeja;
  densidadAsistente: DensidadAsistente;
}

const STORAGE_KEY = 'webforge-ui-preferences';

/**
 * Preferencias de fábrica.
 *
 * `themePreference` arranca en `light` y no en `system` A PROPÓSITO: cambiar el
 * valor por defecto a `system` haría que una máquina con el SO en oscuro abriera
 * la aplicación en oscuro sin que nadie lo pidiera. Es un cambio de
 * comportamiento que no toca a esta tarea; «Sistema» es una opción que el
 * usuario elige, no el estado inicial.
 */
const DEFAULT_PREFERENCES: UIPreferences = {
  theme: 'light',
  themePreference: 'light',
  sidebarExpanded: true,
  densidadBandeja: 'comoda',
  densidadAsistente: 'comoda',
};

/** Consulta del sistema operativo. Devuelve `null` donde no existe `matchMedia`. */
function consultaSistema(): MediaQueryList | null {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return null;
  }
  try {
    return window.matchMedia('(prefers-color-scheme: dark)');
  } catch {
    return null;
  }
}

/** Tema EFECTIVO que corresponde a una preferencia. */
function resolverTema(preferencia: ThemePreference): Theme {
  if (preferencia !== 'system') return preferencia;
  return consultaSistema()?.matches ? 'dark' : 'light';
}

/** ¿`v` es una densidad válida? Guarda de forma para lo persistido. */
function esDensidad(v: unknown): v is DensidadBandeja & DensidadAsistente {
  return v === 'comoda' || v === 'compacta';
}

// ═══════════════════════════════════════════════════════════════════════════
// UI STORE
// ═══════════════════════════════════════════════════════════════════════════

class UIStore {
  // Theme
  theme: Theme = DEFAULT_PREFERENCES.theme;

  /** Qué eligió el usuario. `theme` es el resultado de resolver esta preferencia. */
  themePreference: ThemePreference = DEFAULT_PREFERENCES.themePreference;

  // Sidebar state
  sidebarExpanded: boolean = DEFAULT_PREFERENCES.sidebarExpanded;
  sidebarMobileOpen: boolean = false;
  sidebarHovered: boolean = false;

  /** Espaciado de la lista de conversaciones. */
  densidadBandeja: DensidadBandeja = DEFAULT_PREFERENCES.densidadBandeja;

  /** Espaciado del hilo del asistente. */
  densidadAsistente: DensidadAsistente = DEFAULT_PREFERENCES.densidadAsistente;

  // Header mobile menu
  headerMenuOpen: boolean = false;

  // Responsive
  private _isMobile: boolean = false;

  // Listener references for cleanup
  private _resizeHandler: (() => void) | null = null;
  private _storageHandler: ((e: StorageEvent) => void) | null = null;
  private _systemThemeQuery: MediaQueryList | null = null;
  private _systemThemeHandler: (() => void) | null = null;

  constructor() {
    makeAutoObservable(this);
    this.loadFromStorage();
    this.setupResizeListener();
    this.setupStorageListener();
    this.setupSystemThemeListener();
    // Se re-resuelve DESPUÉS de cargar: si la preferencia guardada es `system`,
    // el tema aplicado debe salir de `prefers-color-scheme` y no del valor de
    // fábrica. Sin este paso, una sesión con «Sistema» guardado arrancaría en
    // claro en una máquina oscura hasta que el usuario tocara el control.
    this.theme = resolverTema(this.themePreference);
    this.applyThemeToDOM();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPUTED
  // ═══════════════════════════════════════════════════════════════════════════

  get isDarkMode(): boolean {
    return this.theme === 'dark';
  }

  get isMobile(): boolean {
    return this._isMobile;
  }

  /**
   * Effective sidebar expanded state considering mobile and hover
   */
  get isSidebarVisible(): boolean {
    return this.sidebarExpanded || this.sidebarHovered || this.sidebarMobileOpen;
  }

  /**
   * For desktop: actual expanded state (not hover)
   */
  get isDesktopSidebarExpanded(): boolean {
    return this._isMobile ? false : this.sidebarExpanded;
  }

  get preferences(): UIPreferences {
    return {
      theme: this.theme,
      themePreference: this.themePreference,
      sidebarExpanded: this.sidebarExpanded,
      densidadBandeja: this.densidadBandeja,
      densidadAsistente: this.densidadAsistente,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // THEME ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Aplica un tema concreto. Fija también la preferencia al mismo valor: quien
   * pide `dark` explícitamente no está pidiendo «lo que diga el sistema», así
   * que dejar la preferencia en `system` haría que el tema se deshiciera solo
   * en el siguiente cambio de tema del SO.
   *
   * Es lo que usa el atajo de la cabecera. La ADMINISTRACIÓN de la preferencia
   * —incluida la opción «Sistema»— vive en `/configuracion → Apariencia`.
   */
  setTheme(theme: Theme): void {
    this.theme = theme;
    this.themePreference = theme;
    this.applyThemeToDOM();
    this.saveToStorage();
  }

  toggleTheme(): void {
    this.setTheme(this.isDarkMode ? 'light' : 'dark');
  }

  /**
   * Cambia la PREFERENCIA de tema. Es lo que usa el control de apariencia:
   * `system` resuelve contra el SO, y el resto fija el tema.
   */
  setThemePreference(preferencia: ThemePreference): void {
    this.themePreference = preferencia;
    this.theme = resolverTema(preferencia);
    this.applyThemeToDOM();
    this.saveToStorage();
  }

  /** Cambia la densidad de la lista de conversaciones. */
  setDensidadBandeja(densidad: DensidadBandeja): void {
    this.densidadBandeja = densidad;
    this.saveToStorage();
  }

  /** Cambia la densidad del hilo del asistente. */
  setDensidadAsistente(densidad: DensidadAsistente): void {
    this.densidadAsistente = densidad;
    this.saveToStorage();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SIDEBAR ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  toggleSidebar(): void {
    if (this._isMobile) {
      this.sidebarMobileOpen = !this.sidebarMobileOpen;
    } else {
      this.sidebarExpanded = !this.sidebarExpanded;
      this.saveToStorage();
    }
  }

  setSidebarHovered(hovered: boolean): void {
    this.sidebarHovered = hovered;
  }

  closeMobileSidebar(): void {
    this.sidebarMobileOpen = false;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HEADER MENU ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  toggleHeaderMenu(): void {
    this.headerMenuOpen = !this.headerMenuOpen;
  }

  closeHeaderMenu(): void {
    this.headerMenuOpen = false;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RESET
  // ═══════════════════════════════════════════════════════════════════════════

  reset(): void {
    this.theme = DEFAULT_PREFERENCES.theme;
    this.themePreference = DEFAULT_PREFERENCES.themePreference;
    this.sidebarExpanded = DEFAULT_PREFERENCES.sidebarExpanded;
    this.sidebarMobileOpen = false;
    this.sidebarHovered = false;
    this.headerMenuOpen = false;
    this.densidadBandeja = DEFAULT_PREFERENCES.densidadBandeja;
    this.densidadAsistente = DEFAULT_PREFERENCES.densidadAsistente;
    this.applyThemeToDOM();
    this.saveToStorage();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DISPOSE (cleanup listeners for testing/SSR)
  // ═══════════════════════════════════════════════════════════════════════════

  dispose(): void {
    if (typeof window !== 'undefined') {
      if (this._resizeHandler) {
        window.removeEventListener('resize', this._resizeHandler);
        this._resizeHandler = null;
      }
      if (this._storageHandler) {
        window.removeEventListener('storage', this._storageHandler);
        this._storageHandler = null;
      }
      if (this._systemThemeQuery && this._systemThemeHandler) {
        this._systemThemeQuery.removeEventListener('change', this._systemThemeHandler);
        this._systemThemeQuery = null;
        this._systemThemeHandler = null;
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE
  // ═══════════════════════════════════════════════════════════════════════════

  private applyThemeToDOM(): void {
    if (typeof document !== 'undefined') {
      if (this.isDarkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }

  private setupResizeListener(): void {
    if (typeof window !== 'undefined') {
      this._resizeHandler = () => {
        const wasMobile = this._isMobile;
        this._isMobile = window.innerWidth < 1280;

        // Close mobile sidebar when switching to desktop
        if (wasMobile && !this._isMobile) {
          this.sidebarMobileOpen = false;
        }
      };

      this._resizeHandler();
      window.addEventListener('resize', this._resizeHandler);
    }
  }

  /**
   * Re-resuelve el tema cuando el SISTEMA cambia, pero solo si la preferencia es
   * `system`. Es lo que hace que «Sistema» sea de verdad «lo que diga el SO» y
   * no una foto del valor que tenía al pulsarlo.
   */
  private setupSystemThemeListener(): void {
    const query = consultaSistema();
    if (!query) return;

    this._systemThemeQuery = query;
    this._systemThemeHandler = () => {
      if (this.themePreference !== 'system') return;
      this.theme = query.matches ? 'dark' : 'light';
      this.applyThemeToDOM();
    };
    query.addEventListener('change', this._systemThemeHandler);
  }

  /**
   * Listen for storage changes from other contexts (e.g. parent window ↔ iframe).
   * The 'storage' event fires when localStorage is modified by another browsing context.
   */
  private setupStorageListener(): void {
    if (typeof window !== 'undefined') {
      this._storageHandler = (e: StorageEvent) => {
        if (e.key === STORAGE_KEY && e.newValue) {
          try {
            const parsed: Partial<UIPreferences> = JSON.parse(e.newValue);
            if (parsed.theme && parsed.theme !== this.theme) {
              this.theme = parsed.theme;
              this.applyThemeToDOM();
            }
            if (parsed.themePreference) {
              this.themePreference = parsed.themePreference;
            }
            if (esDensidad(parsed.densidadBandeja)) {
              this.densidadBandeja = parsed.densidadBandeja;
            }
            if (esDensidad(parsed.densidadAsistente)) {
              this.densidadAsistente = parsed.densidadAsistente;
            }
          } catch {
            // ignore
          }
        }
      };

      window.addEventListener('storage', this._storageHandler);
    }
  }

  private loadFromStorage(): void {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: Partial<UIPreferences> = JSON.parse(saved);

        if (parsed.theme === 'light' || parsed.theme === 'dark') {
          this.theme = parsed.theme;
        }
        if (
          parsed.themePreference === 'light' ||
          parsed.themePreference === 'dark' ||
          parsed.themePreference === 'system'
        ) {
          this.themePreference = parsed.themePreference;
        } else if (parsed.theme === 'light' || parsed.theme === 'dark') {
          // Sesiones guardadas ANTES de que existiera la preferencia: el tema
          // que tenían aplicado era su elección, así que se adopta como
          // preferencia. Sin esto, una sesión en oscuro pasaría a mostrar
          // «Sistema» en el control y el tema podría cambiarle sola.
          this.themePreference = parsed.theme;
        }
        if (typeof parsed.sidebarExpanded === 'boolean') {
          this.sidebarExpanded = parsed.sidebarExpanded;
        }
        // Guarda de forma: un valor corrupto en el fichero no rompe el arranque.
        if (esDensidad(parsed.densidadBandeja)) {
          this.densidadBandeja = parsed.densidadBandeja;
        }
        if (esDensidad(parsed.densidadAsistente)) {
          this.densidadAsistente = parsed.densidadAsistente;
        }
      }
    } catch {
      // Keep defaults
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.preferences));
    } catch {
      console.warn('Failed to save UI preferences to localStorage');
    }
  }
}

// Singleton export
/**
 * @kgId 2663cf336ee7
 */
export const uiStore = new UIStore();

// Export class for testing
export { UIStore };
