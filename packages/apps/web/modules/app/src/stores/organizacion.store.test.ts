import { describe, it, expect, beforeEach, vi } from "vitest";
import { OrganizacionStore } from "./organizacion.store";
import { integracionesStore } from "./integraciones.store";

/** `localStorage` en memoria, para poder simular instalaciones previas. */
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

describe("OrganizacionStore (nivel 2 — Organización)", () => {
  let store: OrganizacionStore;

  beforeEach(() => {
    instalarLocalStorageStub();
    store = new OrganizacionStore();
    store.reiniciar();
  });

  // ── Estado limpio ─────────────────────────────────────────────────────────

  it("no siembra usuario ni organización de fábrica", () => {
    // Regresión directa del defecto anterior: `loadStorage()` devolvía
    // DEFAULT_USUARIO («Carolina Zapata») y DEFAULT_ORGANIZACION («Mi Empresa»),
    // así que una instalación limpia llegaba con perfil y organización ya creados
    // y el onboarding se saltaba dos pasos.
    expect(store.usuario).toBeNull();
    expect(store.organizacion).toBeNull();
    expect(store.tienePerfil).toBe(false);
    expect(store.tieneOrganizacion).toBe(false);
    expect(store.tieneModuloPedidos).toBe(false);
  });

  it("ignora el estado de la clave anterior (necto_workspace_v1)", () => {
    // El reset tiene que ser determinista: si la clave vieja siguiera alimentando
    // el modelo nuevo, «resetear» dependería de que alguien limpie a mano.
    localStorage.setItem(
      "necto_workspace_v1",
      JSON.stringify({
        usuario: { id: "usr_viejo", nombre: "Carolina", perfilCompletado: true },
        organizacion: { id: "org_viejo", nombre: "Mi Empresa", modulosInstalados: ["pedidos"] },
      }),
    );

    const desdeCero = new OrganizacionStore();
    expect(desdeCero.usuario).toBeNull();
    expect(desdeCero.organizacion).toBeNull();
  });

  // ── Flujo de onboarding ───────────────────────────────────────────────────

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

  // ── Persistencia ──────────────────────────────────────────────────────────

  it("persiste y restaura bajo la clave nueva", () => {
    store.actualizarPerfil({ nombre: "Ana", apellido: "Ríos", email: "ana@tienda.com" });
    store.crearOrganizacion({ nombre: "Tienda Ana" });

    const restaurado = new OrganizacionStore();
    expect(restaurado.usuario?.nombre).toBe("Ana");
    expect(restaurado.organizacion?.nombre).toBe("Tienda Ana");
  });

  // ── Defensa de argumentos ─────────────────────────────────────────────────

  it("tolera datos parciales o nulos sin lanzar TypeError", () => {
    // Los fallbacks de los MÉTODOS («Usuario», «Mi Empresa») siguen existiendo como
    // defensa frente a un llamador que no pase argumentos. No son siembra de estado:
    // sin llamada explícita, el store sigue vacío (ver primer test).
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

// ═══════════════════════════════════════════════════════════════════════════
// PERTENENCIA DE MÓDULOS — NIVEL 2
// ═══════════════════════════════════════════════════════════════════════════
//
// Este bloque cubre lo que antes probaba `plataforma.store.test.ts` desde el
// nivel equivocado («arranca con pedidos activo», «persiste y restaura»,
// «permite reiniciar al estado de fábrica»). El estado se mudó aquí; las
// pruebas vinieron con él, y se les añadió lo que faltaba: el puente al
// asistente, el fail-closed y la distinción `reiniciar` / `reiniciarModulos`.
//
// ═══════════════════════════════════════════════════════════════════════════

describe("OrganizacionStore — pertenencia de módulos (nivel 2)", () => {
  let store: OrganizacionStore;

  beforeEach(() => {
    instalarLocalStorageStub();
    // Estado conocido para el puente: `integracionesStore` es un singleton que
    // puede venir conectado a Pedidos por su propio default.
    integracionesStore.desconectar("pedidos");
    store = new OrganizacionStore();
    store.reiniciar();
  });

  it("una organización recién creada no tiene ningún módulo activo ni conectores encendidos", () => {
    expect(store.esModuloInstalado("pedidos")).toBe(false);
    expect(store.esModuloActivo("pedidos")).toBe(false);
    expect(store.esModuloActivo("inventario")).toBe(false);
    expect(store.esConectorActivo("pedidos", "necto_ia")).toBe(false);
    expect(store.esConectorActivo("pedidos", "whatsapp")).toBe(false);
    expect(store.tieneConectorActivo("necto_ia")).toBe(false);
    expect(store.tieneConectorActivo("whatsapp")).toBe(false);
    expect(store.rutaPrimerModuloActivo).toBeNull();
  });

  it("instalar un módulo lo deja activo pero NO enciende sus conectores", () => {
    // La app no fabrica una decisión de integración que el usuario no tomó. Antes
    // `pedidos` nacía con WhatsApp e IA encendidos por el simple hecho de existir
    // un default sembrado; ahora quien los enciende es el onboarding —que
    // pregunta— o el interruptor de la tarjeta del módulo.
    store.instalarModulo("inventario");
    expect(store.esModuloActivo("inventario")).toBe(true);
    expect(store.esConectorActivo("inventario", "necto_ia")).toBe(false);
    expect(store.esConectorActivo("inventario", "whatsapp")).toBe(false);
  });

  it("esConectorActivo exige las tres condiciones: instalado, activo y conector encendido", () => {
    store.instalarModulo("pedidos");
    store.setConectorActivo("pedidos", "necto_ia", true);
    expect(store.esConectorActivo("pedidos", "necto_ia")).toBe(true);

    // Apagar el módulo apaga el conector de cara al sistema, aunque el flag siga
    // guardado: es lo que permite reencender el módulo sin perder la configuración.
    store.setModuloActivo("pedidos", false);
    expect(store.modulos.pedidos.conectores.necto_ia).toBe(true);
    expect(store.esConectorActivo("pedidos", "necto_ia")).toBe(false);

    // Desinstalar, en cambio, lo apaga de verdad: no queda estado colgando de un
    // módulo que ya no está.
    store.setModuloActivo("pedidos", true);
    store.desinstalarModulo("pedidos");
    expect(store.modulos.pedidos.conectores.necto_ia).toBe(false);
  });

  it("tieneConectorActivo es transversal: basta UN módulo activo con ese conector", () => {
    store.instalarModulo("pedidos");
    store.instalarModulo("inventario");
    expect(store.tieneConectorActivo("whatsapp")).toBe(false);

    store.setConectorActivo("inventario", "whatsapp", true);
    expect(store.tieneConectorActivo("whatsapp")).toBe(true);
    expect(store.tieneConectorActivo("necto_ia")).toBe(false);
  });

  it("estaActivo traduce los nombres públicos de las secciones transversales", () => {
    store.instalarModulo("pedidos");
    expect(store.estaActivo("pedidos")).toBe(true);
    expect(store.estaActivo("asistente")).toBe(false);
    expect(store.estaActivo("conversaciones")).toBe(false);

    store.setConectorActivo("pedidos", "necto_ia", true);
    store.setConectorActivo("pedidos", "whatsapp", true);
    expect(store.estaActivo("asistente")).toBe(true);
    expect(store.estaActivo("conversaciones")).toBe(true);

    // Un id que no es ni módulo ni sección transversal no se inventa.
    expect(store.estaActivo("modulo_que_no_existe")).toBe(false);
  });

  it("el conector de IA mantiene integracionesStore en fase (puente nivel 2 → asistente)", () => {
    store.instalarModulo("pedidos");
    expect(integracionesStore.estaConectado("pedidos")).toBe(false);

    store.setConectorActivo("pedidos", "necto_ia", true);
    expect(integracionesStore.estaConectado("pedidos")).toBe(true);

    store.setConectorActivo("pedidos", "necto_ia", false);
    expect(integracionesStore.estaConectado("pedidos")).toBe(false);

    // Y borrar la capa de Organización no puede dejar al asistente conectado a un
    // módulo que ya no existe.
    store.setConectorActivo("pedidos", "necto_ia", true);
    store.reiniciar();
    expect(integracionesStore.estaConectado("pedidos")).toBe(false);
  });

  it("reiniciarModulos borra la pertenencia pero NO la organización", () => {
    // El botón «Restablecer» de la configuración de módulos llama a este método.
    // Si llamara a `reiniciar()`, borraría la empresa y el usuario.
    store.actualizarPerfil({ nombre: "Ana", apellido: "Ríos", email: "ana@tienda.com" });
    store.crearOrganizacion({ nombre: "Tienda Ana" });
    store.instalarModulo("pedidos");
    store.setConectorActivo("pedidos", "whatsapp", true);

    store.reiniciarModulos();

    expect(store.esModuloActivo("pedidos")).toBe(false);
    expect(store.esConectorActivo("pedidos", "whatsapp")).toBe(false);
    expect(store.organizacion?.nombre).toBe("Tienda Ana");
    expect(store.usuario?.nombre).toBe("Ana");
    expect(store.pasoActual).toBe("modulos");
  });

  it("siguienteRuta manda a la entrada del primer módulo activo, no a una ruta fija", () => {
    store.actualizarPerfil({ nombre: "Ana", apellido: "Ríos", email: "ana@tienda.com" });
    store.crearOrganizacion({ nombre: "Tienda Ana" });
    expect(store.pasoActual).toBe("modulos");
    expect(store.siguienteRuta).toBe("/onboarding/modulos");

    store.instalarModulo("pedidos");
    expect(store.pasoActual).toBe("completado");
    expect(store.rutaPrimerModuloActivo).toBe("/pedidos/inicio");
    expect(store.siguienteRuta).toBe("/pedidos/inicio");
  });

  it("rutaPrimerModuloActivo ignora un módulo NO disponible: no devuelve una ruta que no existe", () => {
    // Estado persistido real, de una organización anterior a que
    // `inventario.disponible` pasara a `false`: Pedidos instalado pero apagado,
    // Inventario instalado Y encendido.
    //
    // Sin el filtro por `disponible`, esta getter devolvía
    // `CATALOGO_MODULOS.inventario.rutaPrincipal` → `/inventario`, que no está en
    // `App.tsx`: el comodín redirige a `/login`, o sea que «entrar al primer módulo
    // activo» echaba al usuario de la aplicación.
    //
    // Se mide aquí y no en el navegador porque el único consumidor de esta ruta es
    // `siguienteRuta`, y `siguienteRuta` solo lo leen los tests: en runtime la ruta
    // es inalcanzable, así que un arnés de navegador pasaría con y sin el arreglo.
    localStorage.setItem(
      "necto.organizacion.v1",
      JSON.stringify({
        usuario: {
          id: "usr_ana",
          nombre: "Ana",
          apellido: "Ríos",
          email: "ana@tienda.com",
          pais: "Colombia",
          perfilCompletado: true,
        },
        organizacion: {
          id: "org_ana",
          nombre: "Tienda Ana",
          slug: "tienda-ana",
          pais: "Colombia",
          moneda: "COP",
          zonaHoraria: "America/Bogota",
          fechaCreacion: "2026-09-01T00:00:00.000Z",
        },
        modulos: {
          pedidos: { instalado: true, activo: false, conectores: { necto_ia: false, whatsapp: false } },
          inventario: { instalado: true, activo: true, conectores: { necto_ia: false, whatsapp: false } },
        },
      }),
    );

    const leido = new OrganizacionStore();

    // Precondición: el estado obsoleto SÍ se carga como activo. Sin esta aserción
    // el test pasaría por vacío (si `inventario` no se hubiera leído, `null` sería
    // la respuesta por la razón equivocada).
    expect(leido.esModuloActivo("inventario")).toBe(true);
    expect(leido.esModuloActivo("pedidos")).toBe(false);
    // `modulosActivos` sigue diciendo la verdad de la configuración…
    expect(leido.modulosActivos).toEqual(["inventario"]);
    // …pero no se traduce en una ruta a ninguna parte.
    expect(leido.rutaPrimerModuloActivo).toBeNull();
  });

  it("normaliza la pertenencia leída de localStorage: lo que no sea exactamente true queda en false", () => {
    localStorage.setItem(
      "necto.organizacion.v1",
      JSON.stringify({
        usuario: null,
        organizacion: null,
        modulos: {
          pedidos: { instalado: "sí", activo: 1, conectores: { necto_ia: true, whatsapp: "true" } },
          inventario: null,
          modulo_que_no_existe: { instalado: true, activo: true, conectores: {} },
        },
      }),
    );

    const leido = new OrganizacionStore();
    expect(leido.esModuloInstalado("pedidos")).toBe(false);
    expect(leido.esConectorActivo("pedidos", "necto_ia")).toBe(false);
    // El módulo desconocido no entra: el `Record` se reconstruye desde el catálogo,
    // no se confía en las claves del fichero.
    expect(Object.keys(leido.modulos).sort()).toEqual(["inventario", "pedidos"]);
  });

  it("acepta un estado guardado legítimo", () => {
    localStorage.setItem(
      "necto.organizacion.v1",
      JSON.stringify({
        usuario: null,
        organizacion: null,
        modulos: {
          pedidos: { instalado: true, activo: true, conectores: { necto_ia: false, whatsapp: true } },
          inventario: { instalado: false, activo: false, conectores: { necto_ia: false, whatsapp: false } },
        },
      }),
    );

    const leido = new OrganizacionStore();
    expect(leido.esModuloActivo("pedidos")).toBe(true);
    expect(leido.esConectorActivo("pedidos", "whatsapp")).toBe(true);
    expect(leido.esConectorActivo("pedidos", "necto_ia")).toBe(false);
  });

  it("la pertenencia sobrevive a una recarga", () => {
    store.instalarModulo("pedidos");
    store.setConectorActivo("pedidos", "whatsapp", true);

    const recargado = new OrganizacionStore();
    expect(recargado.esModuloActivo("pedidos")).toBe(true);
    expect(recargado.esConectorActivo("pedidos", "whatsapp")).toBe(true);
    expect(recargado.esConectorActivo("pedidos", "necto_ia")).toBe(false);
  });
});

describe("OrganizacionStore — actualizarPerfil es una actualización PARCIAL", () => {
  let store: OrganizacionStore;

  beforeEach(() => {
    instalarLocalStorageStub();
    store = new OrganizacionStore();
    store.reiniciar();
  });

  /**
   * `actualizarPerfil` reconstruía el objeto campo a campo. Añadir un campo al
   * modelo y olvidarlo en esa lista lo borraba en cada guardado, y el tipo **no**
   * avisaba. Es la misma trampa que se comió `variantesDisponibles` en
   * `pedidos.store`. Estos tests fallan si vuelve a pasar.
   */
  it("un guardado posterior que solo toca el nombre no borra el resto del perfil", () => {
    store.actualizarPerfil({
      nombre: "Ana",
      apellido: "Ríos",
      email: "ana@tienda.com",
      telefono: "+57 300 000 0000",
      cargo: "Gerente",
      bio: "Boutique de barrio",
      ubicacion: "Bogotá, Colombia",
      redes: { instagram: "https://instagram.com/ana" },
      direccion: { ciudad: "Bogotá", codigoPostal: "110111", identificacionFiscal: "900123456" },
    });

    store.actualizarPerfil({ nombre: "Ana María" });

    expect(store.usuario?.nombre).toBe("Ana María");
    expect(store.usuario?.apellido).toBe("Ríos");
    expect(store.usuario?.email).toBe("ana@tienda.com");
    expect(store.usuario?.telefono).toBe("+57 300 000 0000");
    expect(store.usuario?.cargo).toBe("Gerente");
    expect(store.usuario?.bio).toBe("Boutique de barrio");
    expect(store.usuario?.ubicacion).toBe("Bogotá, Colombia");
    expect(store.usuario?.redes?.instagram).toBe("https://instagram.com/ana");
    expect(store.usuario?.direccion?.identificacionFiscal).toBe("900123456");
  });

  it("vaciar un campo lo borra de verdad: cadena vacía no significa «no tocar»", () => {
    store.actualizarPerfil({ nombre: "Ana", telefono: "+57 300 000 0000" });
    store.actualizarPerfil({ telefono: "" });
    expect(store.usuario?.telefono).toBe("");
  });

  it("los campos extendidos sobreviven a una recarga", () => {
    store.actualizarPerfil({
      nombre: "Ana",
      apellido: "Ríos",
      email: "ana@tienda.com",
      cargo: "Gerente",
      redes: { x: "https://x.com/ana" },
    });

    const recargado = new OrganizacionStore();
    expect(recargado.usuario?.cargo).toBe("Gerente");
    expect(recargado.usuario?.redes?.x).toBe("https://x.com/ana");
  });
});
