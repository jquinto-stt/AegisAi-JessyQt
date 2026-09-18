import { describe, it, expect, beforeEach, vi } from "vitest";
import { PlataformaStore } from "./plataforma.store";

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

describe("PlataformaStore (v2 - Scoped Connectors)", () => {
  let store: PlataformaStore;

  beforeEach(() => {
    instalarLocalStorageStub();
    store = new PlataformaStore();
  });

  it("arranca con pedidos activo y sus conectores encendidos por defecto", () => {
    expect(store.esModuloActivo("pedidos")).toBe(true);
    expect(store.esConectorActivo("pedidos", "necto_ia")).toBe(true);
    expect(store.esConectorActivo("pedidos", "whatsapp")).toBe(true);
    expect(store.esModuloActivo("inventario")).toBe(false);
  });

  it("evalúa correctamente tieneConectorActivo", () => {
    // Como pedidos tiene necto_ia y whatsapp activos:
    expect(store.tieneConectorActivo("necto_ia")).toBe(true);
    expect(store.tieneConectorActivo("whatsapp")).toBe(true);

    // Si apagamos el conector necto_ia de pedidos:
    store.setConectorActivo("pedidos", "necto_ia", false);
    expect(store.esConectorActivo("pedidos", "necto_ia")).toBe(false);
    expect(store.tieneConectorActivo("necto_ia")).toBe(false);

    // Si encendemos inventario y su conector necto_ia:
    store.setModuloActivo("inventario", true);
    store.setConectorActivo("inventario", "necto_ia", true);
    expect(store.tieneConectorActivo("necto_ia")).toBe(true);
  });

  it("si se desactiva un módulo completo, sus conectores quedan inactivos de cara al sistema", () => {
    store.setModuloActivo("pedidos", false);
    expect(store.esModuloActivo("pedidos")).toBe(false);
    // Aunque la config interna conserve el flag, esConectorActivo evalúa que el módulo esté activo
    expect(store.esConectorActivo("pedidos", "necto_ia")).toBe(false);
    expect(store.tieneConectorActivo("necto_ia")).toBe(false);
  });

  it("el helper estaActivo responde de forma coherente para retrocompatibilidad", () => {
    expect(store.estaActivo("pedidos")).toBe(true);
    expect(store.estaActivo("asistente")).toBe(true);
    expect(store.estaActivo("conversaciones")).toBe(true);

    store.setConectorActivo("pedidos", "necto_ia", false);
    expect(store.estaActivo("asistente")).toBe(false);
  });

  it("persiste y restaura en localStorage", () => {
    store.setModuloActivo("inventario", true);
    store.setConectorActivo("pedidos", "whatsapp", false);

    const nuevoStore = new PlataformaStore();
    expect(nuevoStore.esModuloActivo("inventario")).toBe(true);
    expect(nuevoStore.esConectorActivo("pedidos", "whatsapp")).toBe(false);
    expect(nuevoStore.esConectorActivo("pedidos", "necto_ia")).toBe(true);
  });

  it("permite reiniciar al estado de fábrica", () => {
    store.setModuloActivo("pedidos", false);
    store.reiniciar();
    expect(store.esModuloActivo("pedidos")).toBe(true);
    expect(store.esConectorActivo("pedidos", "necto_ia")).toBe(true);
  });
});
