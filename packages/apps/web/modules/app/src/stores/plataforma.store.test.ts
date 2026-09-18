import { describe, it, expect, beforeEach, vi } from "vitest";
import { PlataformaStore, CATALOGO_PLATAFORMA } from "./plataforma.store";

function instalarLocalStorageStub() {
  const map = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    key: (i: number) => [...map.keys()][i] ?? null,
    removeItem: (k: string) => {
      map.delete(k);
    },
    setItem: (k: string, v: string) => {
      map.set(k, String(v));
    },
  };
  vi.stubGlobal("localStorage", storage);
  return storage;
}

describe("PlataformaStore", () => {
  let store: PlataformaStore;

  beforeEach(() => {
    instalarLocalStorageStub();
    store = new PlataformaStore();
  });

  it("arranca con la configuración de fábrica (pedidos, conversaciones y asistente activos)", () => {
    expect(store.estaActivo("pedidos")).toBe(true);
    expect(store.estaActivo("conversaciones")).toBe(true);
    expect(store.estaActivo("asistente")).toBe(true);
    expect(store.estaActivo("inventario")).toBe(false);
  });

  it("permite alternar el estado de un plugin o módulo con toggle", () => {
    store.toggle("asistente");
    expect(store.estaActivo("asistente")).toBe(false);

    store.toggle("asistente");
    expect(store.estaActivo("asistente")).toBe(true);
  });

  it("permite activar y desactivar explícitamente", () => {
    store.desactivar("pedidos");
    expect(store.estaActivo("pedidos")).toBe(false);

    store.activar("pedidos");
    expect(store.estaActivo("pedidos")).toBe(true);

    store.activar("inventario");
    expect(store.estaActivo("inventario")).toBe(true);
  });

  it("retorna false para módulos o claves desconocidas (fail-closed)", () => {
    expect(store.estaActivo("modulo_inexistente" as any)).toBe(false);
  });

  it("persiste y restaura el estado en localStorage", () => {
    store.desactivar("conversaciones");
    store.activar("inventario");

    const nuevoStore = new PlataformaStore();
    expect(nuevoStore.estaActivo("conversaciones")).toBe(false);
    expect(nuevoStore.estaActivo("inventario")).toBe(true);
    expect(nuevoStore.estaActivo("pedidos")).toBe(true);
  });

  it("separa correctamente módulos de negocio y plugins", () => {
    expect(store.modulosNegocio.map((m) => m.id)).toEqual(["pedidos", "inventario"]);
    expect(store.plugins.map((p) => p.id)).toEqual(["conversaciones", "asistente"]);
  });

  it("reinicia al estado de fábrica correctamente", () => {
    store.desactivar("pedidos");
    store.reiniciar();
    expect(store.estaActivo("pedidos")).toBe(true);
    expect(store.estaActivo("inventario")).toBe(false);
  });
});
