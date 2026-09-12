import { makeAutoObservable } from 'mobx';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * @kgId bfc4b63d87e3
 */
export type Theme = 'light' | 'dark';

/**
 * @kgId 85ab001c7fe0
 */
export interface UIPreferences {
  theme: Theme;
  sidebarExpanded: boolean;
}

const STORAGE_KEY = 'webforge-ui-preferences';

/**
 * Legacy key written by an older standalone ThemeToggle that bypassed this
 * store. It is no longer written anywhere; we only read it once to migrate an
 * existing preference, then delete it.
 */
const LEGACY_THEME_KEY = 'theme';

const DEFAULT_PREFERENCES: UIPreferences = {
  theme: 'light',
  sidebarExpanded: true,
};

// ═══════════════════════════════════════════════════════════════════════════
// UI STORE
// ═══════════════════════════════════════════════════════════════════════════

class UIStore {
  // Theme
  theme: Theme = DEFAULT_PREFERENCES.theme;

  // Sidebar state
  sidebarExpanded: boolean = DEFAULT_PREFERENCES.sidebarExpanded;
  sidebarMobileOpen: boolean = false;
  sidebarHovered: boolean = false;

  // Header mobile menu
  headerMenuOpen: boolean = false;

  // Responsive
  private _isMobile: boolean = false;

  // Listener references for cleanup
  private _resizeHandler: (() => void) | null = null;
  private _storageHandler: ((e: StorageEvent) => void) | null = null;

  constructor() {
    makeAutoObservable(this);
    this.loadFromStorage();
    this.setupResizeListener();
    this.setupStorageListener();
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
    return this._isMobile
      ? this.sidebarMobileOpen
      : (this.sidebarExpanded || this.sidebarHovered);
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
      sidebarExpanded: this.sidebarExpanded,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // THEME ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  setTheme(theme: Theme): void {
    this.theme = theme;
    this.applyThemeToDOM();
    this.saveToStorage();
  }

  toggleTheme(): void {
    this.setTheme(this.isDarkMode ? 'light' : 'dark');
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
    this.sidebarExpanded = DEFAULT_PREFERENCES.sidebarExpanded;
    this.sidebarMobileOpen = false;
    this.sidebarHovered = false;
    this.headerMenuOpen = false;
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
          } catch {
            // ignore
          }
        }
      };

      window.addEventListener('storage', this._storageHandler);
    }
  }

  private loadFromStorage(): void {
    let hasStoredTheme = false;

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: Partial<UIPreferences> = JSON.parse(saved);

        if (parsed.theme === 'light' || parsed.theme === 'dark') {
          this.theme = parsed.theme;
          hasStoredTheme = true;
        }
        if (typeof parsed.sidebarExpanded === 'boolean') {
          this.sidebarExpanded = parsed.sidebarExpanded;
        }
      }
    } catch {
      // Keep defaults
    }

    if (!hasStoredTheme) {
      this.migrateLegacyThemeKey();
    }
  }

  /**
   * Adopt the value written by the old standalone ThemeToggle (if any), persist
   * it under the canonical key and drop the legacy key. Runs at most once.
   */
  private migrateLegacyThemeKey(): void {
    try {
      const legacy = localStorage.getItem(LEGACY_THEME_KEY);

      if (legacy === 'light' || legacy === 'dark') {
        this.theme = legacy;
        this.saveToStorage();
      }
      if (legacy !== null) {
        localStorage.removeItem(LEGACY_THEME_KEY);
      }
    } catch {
      // Ignore — storage may be unavailable (private mode, SSR, etc.)
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
