import { describe, expect, it } from "vitest";

import {
  datosParaTransferir,
  enlaceDePago,
  mediosDeCobroHabilitados,
  mensajeDeCobro,
} from "./cobros";

// ═══════════════════════════════════════════════════════════════════════════
// Cobros — de la configuración a lo que se le enseña al cliente
// ═══════════════════════════════════════════════════════════════════════════
//
// Estos tests existen porque los once controles de «Cuentas y cobros» no los
// leía NADIE: la sección prometía por escrito que el bot y la tienda comunicaban
// las cuentas, compartían el enlace y enviaban las indicaciones, y nada de eso
// ocurría. Aquí se fija qué produce cada control, para que la superficie que los
// consume no pueda volver a ignorarlos.

const ORIGEN = "https://app.necto.co";

describe("Medios de cobro habilitados", () => {
  it("sin configuración, los cuatro están disponibles", () => {
    // El valor de fábrica: un negocio recién creado no debe quedarse sin ningún
    // medio de cobro.
    expect(mediosDeCobroHabilitados(undefined).map((m) => m.id)).toEqual([
      "efectivo",
      "transferencia",
      "contra_entrega",
      "tarjeta",
    ]);
  });

  it("una clave AUSENTE se lee como encendida, no como apagada", () => {
    // Las configuraciones guardadas antes de que existieran estos interruptores
    // no traen la clave. Tratar «no está» como «apagado» dejaría al negocio sin
    // poder cobrar al desplegar.
    expect(mediosDeCobroHabilitados({}).map((m) => m.id)).toHaveLength(4);
  });

  it("apagar un interruptor QUITA su medio de la lista", () => {
    const medios = mediosDeCobroHabilitados({
      contraEntregaActivo: false,
      linkPagoActivo: false,
    });
    expect(medios.map((m) => m.id)).toEqual(["efectivo", "transferencia"]);
  });

  it("apagarlos todos deja la lista vacía (y eso es una configuración válida)", () => {
    const medios = mediosDeCobroHabilitados({
      efectivoActivo: false,
      transferenciaActivo: false,
      contraEntregaActivo: false,
      linkPagoActivo: false,
    });
    expect(medios).toEqual([]);
  });

  it("cada medio lleva su descripción, no solo el rótulo", () => {
    for (const m of mediosDeCobroHabilitados({})) {
      expect(m.label.trim()).not.toBe("");
      expect(m.descripcion.trim(), `"${m.id}" sin descripción`).not.toBe("");
    }
  });
});

describe("Datos para transferir", () => {
  it("sin nada configurado devuelve null, no un bloque en blanco", () => {
    // Un objeto con todo vacío haría que la pantalla pintase un bloque de cobro
    // sin una sola línea dentro.
    expect(datosParaTransferir(undefined)).toBeNull();
    expect(datosParaTransferir({ titular: "  ", nequi: "" })).toBeNull();
  });

  it("descarta las cuentas sin número", () => {
    // El negocio puede usar Nequi y no Daviplata: una línea «Daviplata:» vacía
    // es un error de lectura para el cliente.
    const datos = datosParaTransferir({
      nequi: "300 123 4567",
      daviplata: "   ",
      bancolombia: "",
    });
    expect(datos?.cuentas).toEqual([{ etiqueta: "Nequi", valor: "300 123 4567" }]);
  });

  it("recoge titular, cuentas e instrucciones cuando existen", () => {
    const datos = datosParaTransferir({
      titular: "Boutique Roma",
      nequi: "300 123 4567",
      bancolombia: "Ahorros 123-456789-01",
      instrucciones: "Envía el comprobante con tu número de pedido.",
    });
    expect(datos).toEqual({
      titular: "Boutique Roma",
      cuentas: [
        { etiqueta: "Nequi", valor: "300 123 4567" },
        { etiqueta: "Banco", valor: "Ahorros 123-456789-01" },
      ],
      instrucciones: "Envía el comprobante con tu número de pedido.",
    });
  });
});

describe("Enlace de pago", () => {
  it("sin configuración apunta al checkout propio, con la referencia", () => {
    expect(enlaceDePago(undefined, "P-001", ORIGEN)).toBe(`${ORIGEN}/checkout/P-001`);
  });

  it("con link externo devuelve ESA url, sin tocar la referencia", () => {
    // El enlace del negocio (Wompi, Bold, Mercado Pago) tiene su propio formato:
    // añadirle la referencia del pedido lo rompería.
    const url = "https://checkout.wompi.co/l/link-de-tu-negocio";
    expect(
      enlaceDePago({ linkPagoTipo: "personalizado", linkPagoUrl: url }, "P-001", ORIGEN),
    ).toBe(url);
  });

  it("con «personalizado» pero sin URL cae al checkout propio", () => {
    // No se inventa un enlace vacío: un `href=""` es peor que el checkout real.
    expect(
      enlaceDePago({ linkPagoTipo: "personalizado", linkPagoUrl: "   " }, "P-7", ORIGEN),
    ).toBe(`${ORIGEN}/checkout/P-7`);
  });

  it("escapa la referencia en la URL", () => {
    expect(enlaceDePago(undefined, "P 001/2", ORIGEN)).toBe(`${ORIGEN}/checkout/P%20001%2F2`);
  });
});

describe("Mensaje de cobro", () => {
  it("compone titular, cuentas, enlace e indicaciones, en ese orden", () => {
    const mensaje = mensajeDeCobro(
      {
        titular: "Boutique Roma",
        nequi: "300 123 4567",
        instrucciones: "Envía el comprobante con tu número de pedido.",
      },
      "P-001",
      ORIGEN,
    );
    expect(mensaje).toBe(
      [
        "Titular: Boutique Roma",
        "Nequi: 300 123 4567",
        `Pago en línea: ${ORIGEN}/checkout/P-001`,
        "",
        "Envía el comprobante con tu número de pedido.",
      ].join("\n"),
    );
  });

  it("NO incluye el enlace si el negocio no acepta pago en línea", () => {
    const mensaje = mensajeDeCobro({ nequi: "300 123 4567", linkPagoActivo: false }, "P-001", ORIGEN);
    expect(mensaje).toBe("Nequi: 300 123 4567");
  });

  it("no inventa líneas: sin nada configurado, el mensaje está vacío", () => {
    // Vacío es la respuesta correcta: quien lo llame debe poder decidir no
    // pintar el bloque. Un mensaje con texto por defecto prometería un cobro
    // que el negocio no ha configurado.
    expect(mensajeDeCobro(undefined, "P-001", ORIGEN)).toBe("");
    expect(
      mensajeDeCobro(
        { efectivoActivo: true, linkPagoActivo: false, transferenciaActivo: false },
        "P-001",
        ORIGEN,
      ),
    ).toBe("");
  });
});
