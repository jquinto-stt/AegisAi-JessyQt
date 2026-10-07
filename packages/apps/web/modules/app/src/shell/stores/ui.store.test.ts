import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

// ═══════════════════════════════════════════════════════════════════════════
// Preferencias de interfaz que la configuración del canal AJUSTA de verdad
// ═══════════════════════════════════════════════════════════════════════════
//
// La sección «Apariencia» ofrece dos controles y los dos tienen que hacer algo:
//
//   · **Densidad de la bandeja** — era un `useState` local que nadie leía. Ahora
//     vive aquí, se persiste, y `BandejaLista` la lee.
//   · **Tema** — el control ofrecía «Sistema» y no lo recordaba: al volver a la
//     pantalla mostraba «Sistema» aunque el tema aplicado fuera otro. Ahora la
//     preferencia se guarda y «Sistema» se resuelve contra el SO.
//
// `environment: 'node'`: sin `localStorage` global se instala un stub antes de
// importar el store, que es un singleton que lee al construirse.

function instalarLocalStorageStub() {
  const store = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    key: (i: number) => [...store.keys()][i] ?? null,
    removeItem: (k: string) => {
      store.delete(k);
    },
    setItem: (k: string, v: string) => {
      store.set(k, String(v));
    },
  };
  vi.stubGlobal("localStorage", storage);
  return storage;
}

const CLAVE = "webforge-ui-preferences";

beforeEach(() => {
  vi.resetModules();
  instalarLocalStorageStub();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Densidad de la bandeja", () => {
  it("arranca en «cómoda»", async () => {
    const { uiStore } = await import("@/shell/stores/ui.store");
    expect(uiStore.densidadBandeja).toBe("comoda");
  });

  it("cambiarla la persiste, y sobrevive a una recarga", async () => {
    const { uiStore } = await import("@/shell/stores/ui.store");
    uiStore.setDensidadBandeja("compacta");

    // Se escribe bajo la MISMA clave que el resto de preferencias de interfaz.
    const guardado = JSON.parse(localStorage.getItem(CLAVE) ?? "{}");
    expect(guardado.densidadBandeja).toBe("compacta");

    // Recarga: un singleton nuevo lee lo guardado.
    vi.resetModules();
    const { uiStore: recargado } = await import("@/shell/stores/ui.store");
    expect(recargado.densidadBandeja).toBe("compacta");
  });

  it("un valor corrupto en el fichero no rompe el arranque", async () => {
    localStorage.setItem(CLAVE, JSON.stringify({ densidadBandeja: "enorme" }));
    const { uiStore } = await import("@/shell/stores/ui.store");
    expect(uiStore.densidadBandeja).toBe("comoda");
  });
});

describe("Preferencia de tema", () => {
  it("«sistema» se guarda como preferencia y resuelve un tema concreto", async () => {
    const { uiStore } = await import("@/shell/stores/ui.store");

    uiStore.setThemePreference("system");

    // La preferencia es «lo que diga el SO»; el tema aplicado, uno de los dos.
    expect(uiStore.themePreference).toBe("system");
    expect(["light", "dark"]).toContain(uiStore.theme);

    const guardado = JSON.parse(localStorage.getItem(CLAVE) ?? "{}");
    expect(guardado.themePreference).toBe("system");
  });

  it("elegir un tema explícito fija también la preferencia", async () => {
    // Si la preferencia se quedara en `system`, el tema elegido a mano se
    // desharía solo en el siguiente cambio de tema del sistema operativo.
    const { uiStore } = await import("@/shell/stores/ui.store");
    uiStore.setThemePreference("system");
    uiStore.setTheme("dark");

    expect(uiStore.themePreference).toBe("dark");
    expect(uiStore.theme).toBe("dark");
  });

  it("una sesión guardada sin preferencia adopta el tema que tenía aplicado", async () => {
    // Ficheros anteriores al 07/10 solo traían `theme`. Adoptarlo como
    // preferencia evita que el control pase a mostrar «Sistema» y el tema
    // pueda cambiarle al usuario sin que lo haya pedido.
    localStorage.setItem(CLAVE, JSON.stringify({ theme: "dark", sidebarExpanded: true }));
    const { uiStore } = await import("@/shell/stores/ui.store");

    expect(uiStore.themePreference).toBe("dark");
    expect(uiStore.theme).toBe("dark");
  });
});
