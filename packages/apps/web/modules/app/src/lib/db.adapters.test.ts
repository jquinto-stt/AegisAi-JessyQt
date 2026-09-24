import { describe, it, expect } from "vitest";
import {
  estadoDeBase,
  autorDeBase,
} from "@/lib/db.adapters";

/**
 * GUARDA DEL PUENTE: frontend ↔ base de datos.
 *
 * El vocabulario del frontend (`EstadoConversacion`) y el del DDL
 * (`check (estado in ('nueva','abierta','pendiente','resuelta','archivada'))`)
 * son dos cosas distintas. El adaptador es el ÚNICO lugar donde se cruzan, y
 * estos tests fijan las reglas de ese cruce para que una evolución en cualquiera
 * de los dos lados no rompa la UI en silencio.
 */

describe("estadoDeBase — el puente entre DDL y EstadoConversacion", () => {
  it("los valores del DDL que SÍ existen en el frontend se mapean sin pérdida", () => {
    // `nueva` y `abierta` → `abierta` (por diseño: una conversación recién
    // creada está abierta y sin tomar, y no añadimos un quinto estado).
    expect(estadoDeBase("nueva")).toBe("abierta");
    expect(estadoDeBase("abierta")).toBe("abierta");

    // `cerrada` existe en ambos lados: es la única intersección completa.
    expect(estadoDeBase("cerrada")).toBe("cerrada");
  });

  it("los valores del DDL que NO existen en el frontend caen a `abierta` (estado neutro)", () => {
    // `pendiente`, `resuelta` y `archivada` están en el DDL pero no en
    // `EstadoConversacion`. El adaptador los trata como `abierta` en vez de
    // lanzar o dejar pasar un valor que la UI no sabe pintar.
    expect(estadoDeBase("pendiente")).toBe("abierta");
    expect(estadoDeBase("resuelta")).toBe("abierta");
    expect(estadoDeBase("archivada")).toBe("abierta");
  });

  it("un valor desconocido (futuro DDL) no se inventa: cae a `abierta`", () => {
    // Si alguien añade un estado en la base sin tocar el frontend, la UI no
    // explota: lo trata como neutro y queda visible en el log.
    expect(estadoDeBase("inventado")).toBe("abierta");
  });

  it("los tres estados de atención del frontend son alcanzables desde el DDL", () => {
    // `en_espera` y `atendida` no están en el `check` del DDL, pero el
    // adaptador los conoce: cuando el DDL los añada (o cuando se migren datos
    // que ya los traen), el mapeo está listo.
    expect(estadoDeBase("en_espera")).toBe("en_espera");
    expect(estadoDeBase("atendida")).toBe("atendida");
  });

  it("el mapeo es total: todo string produce un EstadoConversacion válido", () => {
    const resultados = [
      estadoDeBase("nueva"),
      estadoDeBase("abierta"),
      estadoDeBase("pendiente"),
      estadoDeBase("resuelta"),
      estadoDeBase("archivada"),
      estadoDeBase("cerrada"),
      estadoDeBase("en_espera"),
      estadoDeBase("atendida"),
      estadoDeBase("cualquier_cosa"),
    ];
    for (const r of resultados) {
      expect(["abierta", "en_espera", "atendida", "cerrada"]).toContain(r);
    }
  });
});

describe("autorDeBase — el puente de autoría", () => {
  it("`asistente` (base) → `bot` (frontend)", () => {
    expect(autorDeBase("asistente")).toBe("bot");
  });

  it("`bot` (base, por si acaso) → `bot` (frontend)", () => {
    expect(autorDeBase("bot")).toBe("bot");
  });

  it("`negocio` y `operador` (base) → `negocio` (frontend)", () => {
    expect(autorDeBase("negocio")).toBe("negocio");
    expect(autorDeBase("operador")).toBe("negocio");
  });

  it("`cliente` pasa tal cual", () => {
    expect(autorDeBase("cliente")).toBe("cliente");
  });
});
