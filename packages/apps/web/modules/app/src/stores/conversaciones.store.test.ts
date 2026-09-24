import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Tests del resolutor canónico `porTelefono` / `normalizarTelefono`.
 *
 * El defecto que estos tests blindan: el seed de Conversaciones guarda los
 * teléfonos CON espacios (`"+57 300 555 1122"`) mientras que el seed de Pedidos
 * los guarda PLANOS (`"+573001112233"`). Comparar cadenas crudas con `===` hacía
 * que ninguna conversación resolviera contra su pedido. El resolutor normaliza
 * a dígitos, así que ambas formas son el mismo contacto.
 */
describe("ConversacionesStore — resolutor por teléfono", () => {
  let store: import("./conversaciones.store").ConversacionesStore;
  let normalizarTelefono: typeof import("./conversaciones.store").normalizarTelefono;

  beforeEach(async () => {
    // Entorno `node` sin localStorage: el store arranca con el seed.
    vi.resetModules();
    const mod = await import("./conversaciones.store");
    store = new mod.ConversacionesStore();
    normalizarTelefono = mod.normalizarTelefono;
  });

  describe("normalizarTelefono", () => {
    it("reduce a +dígitos, descartando espacios y separadores", () => {
      expect(normalizarTelefono("+57 300 555 1122")).toBe("+573005551122");
      expect(normalizarTelefono("+573001112233")).toBe("+573001112233");
      expect(normalizarTelefono("+57-300-111-2233")).toBe("+573001112233");
      expect(normalizarTelefono("(+57) 300 111 2233")).toBe("+573001112233");
    });

    it("devuelve cadena vacía si no hay ningún dígito", () => {
      expect(normalizarTelefono("")).toBe("");
      expect(normalizarTelefono("sin número")).toBe("");
      expect(normalizarTelefono("+ - ( )")).toBe("");
    });

    it("es idempotente", () => {
      const una = normalizarTelefono("+57 300 111 2233");
      expect(normalizarTelefono(una)).toBe(una);
    });
  });

  describe("porTelefono", () => {
    it("resuelve el hilo del seed cuando el teléfono viene CON espacios", () => {
      const conv = store.porTelefono("+57 300 555 1122");
      expect(conv?.id).toBe("conv-1");
      expect(conv?.contacto.nombre).toBe("Juan Carlos");
    });

    it("resuelve el MISMO hilo cuando el teléfono viene PLANO (formato de Pedidos)", () => {
      const conv = store.porTelefono("+573005551122");
      expect(conv?.id).toBe("conv-1");
    });

    it("las dos formas del mismo número devuelven la misma conversación", () => {
      const conEspacios = store.porTelefono("+57 300 111 2233");
      const plano = store.porTelefono("+573001112233");
      expect(conEspacios?.id).toBe("conv-3");
      expect(plano?.id).toBe(conEspacios?.id);
    });

    it("resuelve cada conversación del seed por su número plano", () => {
      expect(store.porTelefono("+573005551122")?.id).toBe("conv-1");
      expect(store.porTelefono("+573012223344")?.id).toBe("conv-2");
      expect(store.porTelefono("+573001112233")?.id).toBe("conv-3");
      expect(store.porTelefono("+573017773344")?.id).toBe("conv-4");
    });

    it("devuelve undefined para un teléfono sin hilo (no inventa conversación)", () => {
      // Números que NO pertenecen a ningún hilo del seed. `+573004445566` (Lucía)
      // y `+573005556677` (Andrés) SÍ tienen hilo ahora, así que no sirven.
      expect(store.porTelefono("+573009999999")).toBeUndefined();
      expect(store.porTelefono("+573002222222")).toBeUndefined();
    });

    it("devuelve undefined para entradas no numéricas o vacías", () => {
      expect(store.porTelefono("")).toBeUndefined();
      expect(store.porTelefono("   ")).toBeUndefined();
      expect(store.porTelefono("cliente sin teléfono")).toBeUndefined();
    });

    it("NO crea conversaciones: el recuento no cambia al consultar", () => {
      const antes = store.conversaciones.length;
      store.porTelefono("+573009998877");
      store.porTelefono("+57 300 555 1122");
      expect(store.conversaciones.length).toBe(antes);
    });

    it("ante duplicados por teléfono gana el hilo de últimaActividad más reciente", () => {
      store.conversaciones = [
        {
          id: "vieja",
          canal: "whatsapp",
          contacto: { telefono: "+57 300 555 1122", nombre: "Juan Carlos", origen: "whatsapp" },
          estado: "cerrada",
          atencion: "bot",
          operadorAsignadoId: null,
          noLeidos: 0,
          ultimaActividad: "2024-06-01T00:00:00.000Z",
        },
        {
          id: "nueva",
          canal: "whatsapp",
          contacto: { telefono: "+573005551122", nombre: "Juan Carlos", origen: "whatsapp" },
          estado: "abierta",
          atencion: "bot",
          operadorAsignadoId: null,
          noLeidos: 0,
          ultimaActividad: "2024-06-03T00:00:00.000Z",
        },
      ];
      expect(store.porTelefono("+573005551122")?.id).toBe("nueva");
    });
  });

  describe("tieneConversacion", () => {
    it("es coherente con porTelefono en ambos sentidos", () => {
      expect(store.tieneConversacion("+573005551122")).toBe(true);
      expect(store.tieneConversacion("+57 300 555 1122")).toBe(true);
      expect(store.tieneConversacion("+573003334455")).toBe(false);
    });
  });
});

/**
 * Tests de los selectores de historial de atención.
 *
 * El defecto que estos tests blindan: la página `/conversaciones/historial`
 * muestra tres tarjetas KPI (Total / Pending / Solved) y una tabla cuyo badge de
 * estado debe rotular exactamente el mismo estado que pinta el badge. Si cada
 * superficie contara `conversaciones` por su cuenta, o si una escribiera la
 * etiqueta del estado como literal, los tres números podrían cuadrar hoy y
 * contradecirse mañana. Estos tests fijan la derivación canónica única.
 */
describe("ConversacionesStore — selectores del historial de atención", () => {
  let store: import("./conversaciones.store").ConversacionesStore;
  let mod: typeof import("./conversaciones.store");

  beforeEach(async () => {
    // Entorno `node` sin localStorage: el store arranca con el seed.
    vi.resetModules();
    mod = await import("./conversaciones.store");
    store = new mod.ConversacionesStore();
  });

  describe("totalTickets", () => {
    it("cuenta TODAS las conversaciones del seed, sin filtro ni búsqueda", () => {
      expect(store.totalTickets).toBe(8);
      expect(store.totalTickets).toBe(store.conversaciones.length);
    });

    it("no depende del filtro ni de la búsqueda de la bandeja", () => {
      // La bandeja es del chat en vivo; el historial no se filtra con ella.
      store.setFiltro("requieren_atencion");
      store.setBusqueda("Carlos");
      expect(store.bandeja.length).toBeLessThan(store.totalTickets);
      expect(store.totalTickets).toBe(8);
    });
  });

  describe("clasificación del seed en los tres ejes", () => {
    it("clasifica el seed como 5 pendientes, 2 en curso y 1 resuelto", () => {
      expect(store.ticketsPendientes).toBe(5); // abiertas: 1,2,4,6 · en_espera: 5
      expect(store.ticketsEnProgreso).toBe(2); // atendidas: 3, 7
      expect(store.ticketsResueltos).toBe(1); // cerrada: 8
    });

    it("los tres ejes son exhaustivos: suman el total", () => {
      expect(
        store.ticketsPendientes + store.ticketsEnProgreso + store.ticketsResueltos,
      ).toBe(store.totalTickets);
    });

    it("los tres ejes son mutuamente excluyentes: cada ticket cae en exactamente uno", () => {
      for (const conv of store.conversaciones) {
        const ejes = [
          store.estaPendiente(conv),
          store.estaEnProgreso(conv),
          store.estaResuelta(conv),
        ];
        expect(ejes.filter(Boolean)).toHaveLength(1);
      }
    });

    it("cada eje coincide con el estado real de su conversación", () => {
      expect(store.estaPendiente(store.getConversacion("conv-1")!)).toBe(true); // abierta
      expect(store.estaPendiente(store.getConversacion("conv-5")!)).toBe(true); // en_espera
      expect(store.estaEnProgreso(store.getConversacion("conv-3")!)).toBe(true); // atendida
      expect(store.estaEnProgreso(store.getConversacion("conv-7")!)).toBe(true); // atendida
      expect(store.estaResuelta(store.getConversacion("conv-8")!)).toBe(true); // cerrada
    });

    it("`atendida` cuenta como EN CURSO y NO como pendiente", () => {
      const atendida = store.getConversacion("conv-3")!;
      expect(atendida.estado).toBe("atendida");
      expect(store.estaEnProgreso(atendida)).toBe(true);
      expect(store.estaPendiente(atendida)).toBe(false);
      expect(store.estaResuelta(atendida)).toBe(false);
    });

    it("`abierta` cuenta como PENDIENTE (lo lleva el bot, nadie lo ha resuelto)", () => {
      const abierta = store.getConversacion("conv-1")!;
      expect(abierta.estado).toBe("abierta");
      expect(store.estaPendiente(abierta)).toBe(true);
      expect(store.estaResuelta(abierta)).toBe(false);
    });

    it("`cerrada` es el ÚNICO estado resuelto", () => {
      for (const conv of store.conversaciones) {
        expect(store.estaResuelta(conv)).toBe(conv.estado === "cerrada");
      }
    });
  });

  describe("reactividad: cerrar un ticket mueve los ejes", () => {
    it("cerrar('conv-1') pasa un ticket de pendiente a resuelto y conserva el total", () => {
      const antes = {
        total: store.totalTickets,
        pendientes: store.ticketsPendientes,
        resueltos: store.ticketsResueltos,
        enProgreso: store.ticketsEnProgreso,
      };
      expect(antes).toEqual({ total: 8, pendientes: 5, resueltos: 1, enProgreso: 2 });

      store.cerrar("conv-1");

      expect(store.ticketsPendientes).toBe(antes.pendientes - 1);
      expect(store.ticketsResueltos).toBe(antes.resueltos + 1);
      expect(store.ticketsEnProgreso).toBe(antes.enProgreso); // intacto
      expect(store.totalTickets).toBe(antes.total); // el total no cambia al cerrar
    });

    it("tomar('conv-2') pasa un ticket de pendiente a en curso", () => {
      // conv-2 nace `abierta` (la lleva el bot) y `tomar` la admite.
      expect(store.estaPendiente(store.getConversacion("conv-2")!)).toBe(true);

      store.tomar("conv-2", "ope-1");

      expect(store.ticketsPendientes).toBe(4);
      expect(store.ticketsEnProgreso).toBe(3);
      expect(store.ticketsResueltos).toBe(1);
    });

    it("cerrar dos veces no altera los ejes la segunda vez (no-op del store)", () => {
      store.cerrar("conv-1");
      const resueltos = store.ticketsResueltos;
      store.cerrar("conv-1");
      expect(store.ticketsResueltos).toBe(resueltos);
    });
  });

  describe("los selectores NO mutan el estado", () => {
    it("leer los tres ejes y totalTickets no cambia nada", () => {
      const snapshot = store.conversaciones.map((c) => c.estado);
      void store.totalTickets;
      void store.ticketsPendientes;
      void store.ticketsEnProgreso;
      void store.ticketsResueltos;
      expect(store.conversaciones.map((c) => c.estado)).toEqual(snapshot);
    });
  });

  describe("asuntoDe", () => {
    it("devuelve el PRIMER mensaje del CLIENTE, no el primero del hilo", () => {
      // Todos los hilos del seed abren con el cliente, así que aquí el asunto
      // coincide con el primer mensaje del hilo. El caso que discrimina está en
      // el test del hilo que abre el bot.
      expect(store.asuntoDe("conv-1")).toBe("hola, que trae el combo clásico?");
      expect(store.asuntoDe("conv-2")).toBe("buenas, les quedan postres del día?");
    });

    it("busca el CLIENTE y no se queda con el primer mensaje cuando el bot abre", () => {
      // El seed abre los CUATRO hilos con el cliente, así que en el seed el
      // asunto coincide con el primer mensaje del hilo y no se distingue de un
      // `mensajes[0]`. Se construye aquí el caso que sí discrimina: un hilo que
      // abre el bot. Si el selector tomara `mensajes[0]` devolvería el saludo
      // del bot, que no describe el ticket.
      store.conversaciones = [
        {
          id: "conv-bot-first",
          canal: "whatsapp",
          contacto: { telefono: "+57 300 000 0002", nombre: "Rosa", origen: "whatsapp" },
          estado: "abierta",
          atencion: "bot",
          operadorAsignadoId: null,
          noLeidos: 0,
          ultimaActividad: "2024-06-01T00:00:00.000Z",
        },
      ];
      // El bot abre el hilo (no hay mensaje del cliente anterior), y luego el
      // cliente escribe lo que realmente necesita.
      store.agregarMensajeBot("conv-bot-first", "¡Hola! Bienvenido, ¿qué deseas hacer?");
      store.enviarComoCliente(
        "conv-bot-first",
        "  Quiero cambiar la dirección de entrega,\npor favor  ",
      );

      const primero = store.lineaDeTiempo("conv-bot-first")[0];
      expect(primero.clase).toBe("mensaje");
      if (primero.clase === "mensaje") {
        expect(primero.data.autor).toBe("bot");
      }

      // El asunto es el del cliente, NO el saludo del bot, y ya viene colapsado.
      expect(store.asuntoDe("conv-bot-first")).toBe(
        "Quiero cambiar la dirección de entrega, por favor",
      );
      expect(store.asuntoDe("conv-bot-first")).not.toContain("Bienvenido");
    });

    it("ignora los mensajes del negocio", () => {
      // conv-3 tiene un mensaje de `negocio` (Camila). Nunca puede ser el asunto.
      const asunto = store.asuntoDe("conv-3");
      expect(asunto).toBe("hola! quiero hacer un pedido para domicilio");
      for (const item of store.lineaDeTiempo("conv-3")) {
        if (item.clase === "mensaje" && item.data.autor !== "cliente") {
          expect(item.data.contenido.texto).not.toBe(asunto);
        }
      }
    });

    it("en un hilo que ABRE el cliente, el asunto coincide con el primer mensaje del hilo", () => {
      // Los cuatro hilos del seed abren con el cliente: aquí el asunto SÍ es el
      // primero del hilo. (El caso que discrimina está en el test del bot-first.)
      const primero = store.lineaDeTiempo("conv-1")[0];
      expect(primero.clase).toBe("mensaje");
      if (primero.clase === "mensaje") {
        expect(primero.data.autor).toBe("cliente");
        expect(store.asuntoDe("conv-1")).toBe(primero.data.contenido.texto);
      }
    });

    it("colapsa los saltos de línea a un espacio (cabe en una celda)", () => {
      store.conversaciones = [
        {
          id: "conv-nueva",
          canal: "whatsapp",
          contacto: { telefono: "+57 300 000 0000", nombre: "Test", origen: "whatsapp" },
          estado: "abierta",
          atencion: "bot",
          operadorAsignadoId: null,
          noLeidos: 0,
          ultimaActividad: "2024-06-01T00:00:00.000Z",
        },
      ];
      store.enviarComoCliente("conv-nueva", "  Linea uno\n\nLinea dos\tcon tab  ");

      const asunto = store.asuntoDe("conv-nueva");
      expect(asunto).toBe("Linea uno Linea dos con tab");
      expect(asunto).not.toContain("\n");
      expect(asunto).not.toContain("\t");
    });

    it("devuelve cadena vacía para una conversación inexistente (no inventa asunto)", () => {
      expect(store.asuntoDe("no-existe")).toBe("");
      expect(store.asuntoDe("")).toBe("");
    });

    it("devuelve cadena vacía para un hilo sin ningún mensaje del cliente", () => {
      store.conversaciones = [
        {
          id: "conv-solo-bot",
          canal: "whatsapp",
          contacto: { telefono: "+57 300 000 0001", nombre: "Solo bot", origen: "whatsapp" },
          estado: "abierta",
          atencion: "bot",
          operadorAsignadoId: null,
          noLeidos: 0,
          ultimaActividad: "2024-06-01T00:00:00.000Z",
        },
      ];
      store.agregarMensajeBot("conv-solo-bot", "Bienvenido, ¿en qué te ayudo?");

      expect(store.asuntoDe("conv-solo-bot")).toBe("");
    });

    it("no muta el estado al derivar el asunto", () => {
      const antes = store.lineaDeTiempo("conv-1").length;
      store.asuntoDe("conv-1");
      store.asuntoDe("conv-1");
      expect(store.lineaDeTiempo("conv-1").length).toBe(antes);
    });
  });

  describe("catálogo de presentación del estado", () => {
    it("ESTADO_CONVERSACION_META cubre los cuatro estados con las etiquetas canónicas", () => {
      expect(mod.etiquetaEstado("abierta")).toBe("Sin atender");
      expect(mod.etiquetaEstado("en_espera")).toBe("En espera");
      expect(mod.etiquetaEstado("atendida")).toBe("En curso");
      expect(mod.etiquetaEstado("cerrada")).toBe("Resuelta");
    });

    it("el catálogo es una correspondencia total de los cuatro estados", () => {
      expect(Object.keys(mod.ESTADO_CONVERSACION_META).sort()).toEqual(
        ["abierta", "atendida", "cerrada", "en_espera"].sort(),
      );
    });

    it("cada estado declara etiqueta, badge y presencia (ninguna cara a medias)", () => {
      for (const meta of Object.values(mod.ESTADO_CONVERSACION_META)) {
        expect(typeof meta.label).toBe("string");
        expect(meta.label.trim()).not.toBe("");
        expect(typeof meta.badge).toBe("string");
        expect(typeof meta.presencia).toBe("string");
      }
    });

    it("`cerrada` es el único estado con badge de éxito (resuelto)", () => {
      const exitosos = Object.entries(mod.ESTADO_CONVERSACION_META)
        .filter(([, meta]) => meta.badge === "success")
        .map(([estado]) => estado);
      expect(exitosos).toEqual(["cerrada"]);
    });

    it("los cuatro estados tienen colores DISTINTOS (no hay dos estados que se vean igual)", () => {
      const colores = Object.values(mod.ESTADO_CONVERSACION_META).map((m) => m.badge);
      expect(new Set(colores).size).toBe(colores.length);
    });

    it("`atendida` y `cerrada` NO comparten presencia: en curso no es lo mismo que resuelta", () => {
      // El defecto que esto fija: `statusDe` mandaba ambas a `offline`, así que
      // un hilo que un operador tenía entre manos se pintaba igual que uno ya
      // despachado.
      expect(mod.presenciaDe("atendida")).not.toBe(mod.presenciaDe("cerrada"));
    });

    it("solo `abierta` y `atendida` se ven como contacto disponible", () => {
      const enLinea = Object.entries(mod.ESTADO_CONVERSACION_META)
        .filter(([, meta]) => meta.presencia === "online")
        .map(([estado]) => estado)
        .sort();
      expect(enLinea).toEqual(["abierta", "atendida"]);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // LA PARTICIÓN CANÓNICA Y EL CONJUNTO DE ATENCIÓN
  // ═══════════════════════════════════════════════════════════════════════════
  //
  // Dos preguntas vecinas que durante un tiempo fueron el MISMO rótulo en dos
  // pantallas y daban cifras distintas. Esta sección fija que son distintas a
  // propósito, y CUÁLES son cada una.

  describe("«requiere atención» vs «pendiente»", () => {
    it("el conjunto de atención es exactamente `en_espera`", () => {
      const deAtencion = store.conversaciones
        .filter((c) => store.requiereAtencionHumana(c))
        .map((c) => c.estado);
      expect(new Set(deAtencion)).toEqual(new Set(["en_espera"]));
    });

    it("toda conversación que requiere atención está TAMBIÉN pendiente (es un subconjunto)", () => {
      for (const c of store.conversaciones) {
        if (store.requiereAtencionHumana(c)) {
          expect(store.estaPendiente(c)).toBe(true);
        }
      }
    });

    it("pero no toda pendiente requiere atención: lo que lleva el bot está pendiente y no espera a nadie", () => {
      const pendienteSinAtencion = store.conversaciones.filter(
        (c) => store.estaPendiente(c) && !store.requiereAtencionHumana(c),
      );
      expect(pendienteSinAtencion.length).toBeGreaterThan(0);
      for (const c of pendienteSinAtencion) {
        expect(c.estado).toBe("abierta");
      }
    });

    it("`totalRequierenAtencion` cuenta lo mismo que el filtro de la bandeja", () => {
      // Eran dos implementaciones del mismo conjunto: el predicado y el `switch`
      // del filtro. Si vuelven a divergir, esto falla.
      store.setFiltro("requieren_atencion");
      expect(store.bandeja.length).toBe(store.totalRequierenAtencion);
      store.setFiltro("todas");
    });

    it("`ticketsPendientes` es la pregunta ANCHA y no coincide con la de atención", () => {
      expect(store.ticketsPendientes).toBeGreaterThan(store.totalRequierenAtencion);
    });
  });
});
