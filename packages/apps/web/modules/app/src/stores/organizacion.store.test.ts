import { describe, it, expect, beforeEach } from "vitest";
import { OrganizacionStore } from "./organizacion.store";

describe("OrganizacionStore (Multi-tenant hierarchy)", () => {
  let store: OrganizacionStore;

  beforeEach(() => {
    store = new OrganizacionStore();
    store.reiniciarOnboardingParaTest();
  });

  it("arranca en el paso de perfil si no hay usuario", () => {
    expect(store.tienePerfil).toBe(false);
    expect(store.tieneOrganizacion).toBe(false);
    expect(store.pasoActual).toBe("perfil");
    expect(store.siguienteRuta).toBe("/onboarding/perfil");
  });

  it("avanza a organizacion cuando el usuario completa su perfil", () => {
    store.actualizarPerfil({
      nombre: "Carolina",
      apellido: "Zapata",
      email: "caro@boutique.com",
      pais: "Colombia",
      comoNosConociste: "Instagram",
    });

    expect(store.tienePerfil).toBe(true);
    expect(store.usuario?.nombre).toBe("Carolina");
    expect(store.pasoActual).toBe("organizacion");
    expect(store.siguienteRuta).toBe("/onboarding/organizacion");
  });

  it("avanza a modulos cuando se crea la organizacion", () => {
    store.actualizarPerfil({
      nombre: "Carolina",
      apellido: "Zapata",
      email: "caro@boutique.com",
      pais: "Colombia",
    });

    store.crearOrganizacion({
      nombre: "Boutique Roma",
      pais: "Colombia",
      moneda: "COP",
      zonaHoraria: "America/Bogota",
    });

    expect(store.tieneOrganizacion).toBe(true);
    expect(store.organizacion?.slug).toBe("boutique-roma");
    expect(store.organizacion?.moneda).toBe("COP");
    expect(store.pasoActual).toBe("modulos");
    expect(store.siguienteRuta).toBe("/onboarding/modulos");
  });

  it("instala y desinstala modulos correctamente", () => {
    store.actualizarPerfil({
      nombre: "Carolina",
      apellido: "Zapata",
      email: "caro@boutique.com",
      pais: "Colombia",
    });

    store.crearOrganizacion({
      nombre: "Boutique Roma",
      pais: "Colombia",
      moneda: "COP",
    });

    expect(store.tieneModuloPedidos).toBe(false);

    store.instalarModulo("pedidos");
    expect(store.tieneModuloPedidos).toBe(true);
    expect(store.pasoActual).toBe("completado");
    expect(store.siguienteRuta).toBe("/pedidos/inicio");

    store.desinstalarModulo("pedidos");
    expect(store.tieneModuloPedidos).toBe(false);
    expect(store.pasoActual).toBe("modulos");
  });

  it("tolera datos parciales o nulos sin lanzar TypeError", () => {
    expect(() => {
      store.actualizarPerfil({});
      store.crearOrganizacion({});
    }).not.toThrow();

    expect(store.usuario?.nombre).toBe("Usuario");
    expect(store.usuario?.pais).toBe("Colombia");
    expect(store.organizacion?.nombre).toBe("Mi Empresa");
    expect(store.organizacion?.moneda).toBe("COP");
  });
});
