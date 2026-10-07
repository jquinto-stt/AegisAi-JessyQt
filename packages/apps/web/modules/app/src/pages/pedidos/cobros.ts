import type { DatosBancariosConfig, MetodoPago } from "@/stores/pedidos.store";

// ═══════════════════════════════════════════════════════════════════════════
// COBROS — de la configuración a lo que de verdad se le enseña al cliente
// ═══════════════════════════════════════════════════════════════════════════
//
// ── Qué problema resuelve (07/10) ─────────────────────────────────────────
//
// La sección «Cuentas y cobros» de `/pedidos/config` tenía ONCE controles que no
// leía nadie: `grep -rn datosBancarios src/` devolvía solo el tipo, el default y
// el `loadConfig` del store, más la propia página que los editaba. Cero lectores.
//
// Y la página prometía por escrito lo que no ocurría: «cuentas que el bot y la
// tienda comunican al cliente», «el bot de WhatsApp y las órdenes compartirán
// este enlace exacto», «indicaciones que el bot envía al confirmar su orden».
// Nada de eso pasaba.
//
// Este módulo es el ÚNICO sitio donde la configuración de cobro se convierte en
// hechos utilizables: qué medios están encendidos, qué datos hay que darle al
// cliente que transfiere y cuál es el enlace de pago. Las superficies consumen
// esto; ninguna vuelve a leer `datosBancarios` por su cuenta.
//
// Vive en un `.ts` (sin JSX) para que un test de Node pueda recorrerlo entero,
// como el resto de catálogos del proyecto.

/** Un medio de cobro disponible, ya filtrado por lo que el negocio encendió. */
export interface MedioDeCobro {
  id: MetodoPago;
  label: string;
  /** Qué significa elegirlo. Se pinta bajo el rótulo en el selector. */
  descripcion: string;
}

/**
 * ¿Está encendido?
 *
 * `!== false` y no `=== true` A PROPÓSITO: las configuraciones guardadas antes
 * de que existieran estos interruptores no traen la clave, y su ausencia debe
 * leerse como «encendido» — que es el valor de fábrica. Tratar «no está» como
 * «apagado» dejaría a un negocio sin ningún medio de cobro al desplegar.
 */
function encendido(valor: boolean | undefined): boolean {
  return valor !== false;
}

/**
 * Los medios de cobro que el negocio acepta hoy, en orden de uso.
 *
 * Es la lista que debe pintar cualquier selector de método de pago —el del
 * operador al crear un pedido, y el del cliente si algún día se expone—. Antes
 * el selector del operador tenía los cuatro medios escritos a mano y no miraba
 * esta configuración: apagar «Contra entrega» no quitaba nada.
 */
export function mediosDeCobroHabilitados(
  cfg: DatosBancariosConfig | undefined,
): MedioDeCobro[] {
  const c = cfg ?? {};

  const todos: (MedioDeCobro & { encendido: boolean })[] = [
    {
      id: "efectivo",
      label: "Efectivo",
      descripcion: "Cobro en caja al retirar o consumir en el local.",
      encendido: encendido(c.efectivoActivo),
    },
    {
      id: "transferencia",
      label: "Transferencia",
      descripcion: "El cliente transfiere a tus cuentas y envía el comprobante.",
      encendido: encendido(c.transferenciaActivo),
    },
    {
      id: "contra_entrega",
      label: "Contra entrega",
      descripcion: "El cliente paga al recibir su pedido.",
      encendido: encendido(c.contraEntregaActivo),
    },
    {
      id: "tarjeta",
      label: "Tarjeta o PSE",
      descripcion: "Pago en línea con el enlace de cobro.",
      encendido: encendido(c.linkPagoActivo),
    },
  ];

  return todos
    .filter((m) => m.encendido)
    .map(({ encendido: _encendido, ...medio }) => medio);
}

/** Una cuenta a la que el cliente puede transferir. */
export interface CuentaParaTransferir {
  /** Nombre del medio: «Nequi», «Daviplata», «Banco». */
  etiqueta: string;
  /** El número o la cuenta, tal como lo escribió el negocio. */
  valor: string;
}

/** Todo lo que hay que darle al cliente que va a transferir. */
export interface DatosParaTransferir {
  /** Titular de las cuentas, si el negocio lo escribió. */
  titular?: string;
  /** Cuentas con valor. Una cuenta en blanco NO se incluye. */
  cuentas: CuentaParaTransferir[];
  /** Indicaciones de cobro del negocio, si las escribió. */
  instrucciones?: string;
}

/**
 * Los datos de transferencia que existen DE VERDAD.
 *
 * Devuelve `null` cuando no hay nada que dar: ni titular, ni cuentas con valor,
 * ni instrucciones. Esa distinción importa, porque la alternativa —devolver un
 * objeto con todo vacío— haría que la pantalla pintase un bloque de cobro en
 * blanco, que es peor que no pintar nada.
 *
 * Una cuenta con el campo vacío se DESCARTA en vez de pintarse vacía: el
 * negocio puede usar Nequi y no Daviplata, y una línea «Daviplata:» sin número
 * es un error de lectura para el cliente.
 */
export function datosParaTransferir(
  cfg: DatosBancariosConfig | undefined,
): DatosParaTransferir | null {
  const c = cfg ?? {};

  const cuentas: CuentaParaTransferir[] = [
    { etiqueta: "Nequi", valor: (c.nequi ?? "").trim() },
    { etiqueta: "Daviplata", valor: (c.daviplata ?? "").trim() },
    { etiqueta: "Banco", valor: (c.bancolombia ?? "").trim() },
  ].filter((cuenta) => cuenta.valor !== "");

  const titular = (c.titular ?? "").trim();
  const instrucciones = (c.instrucciones ?? "").trim();

  if (cuentas.length === 0 && titular === "" && instrucciones === "") return null;

  return {
    ...(titular !== "" ? { titular } : {}),
    cuentas,
    ...(instrucciones !== "" ? { instrucciones } : {}),
  };
}

/**
 * El enlace de cobro para un pedido concreto.
 *
 * Dos caminos, y el negocio elige cuál:
 *
 *   · `linkPagoTipo === "personalizado"` y hay URL ⇒ se devuelve ESA url tal
 *     cual. No se le añade la referencia del pedido: es el enlace del negocio
 *     (Wompi, Bold, Mercado Pago) y su formato no es asunto de esta aplicación.
 *   · En cualquier otro caso ⇒ el checkout propio, `/checkout/<ref>`.
 *
 * `origen` se recibe como parámetro —y no se lee de `window` aquí— para que la
 * función sea pura y un test pueda afirmar la URL exacta sin navegador.
 */
export function enlaceDePago(
  cfg: DatosBancariosConfig | undefined,
  ref: string,
  origen: string,
): string {
  const personalizado =
    cfg?.linkPagoTipo === "personalizado" ? (cfg.linkPagoUrl ?? "").trim() : "";
  if (personalizado !== "") return personalizado;
  return `${origen}/checkout/${encodeURIComponent(ref)}`;
}

/**
 * El mensaje de cobro listo para enviarle al cliente.
 *
 * Compone SOLO lo que el negocio configuró, en este orden: titular, cuentas,
 * enlace de pago (si acepta tarjeta) e indicaciones. Nada se inventa: si un
 * campo está vacío, su línea no existe.
 *
 * Existe para que `instrucciones`, las cuentas y el enlace sirvan de una vez —
 * que era justo lo que la sección prometía («indicaciones que el bot y la tienda
 * envían al cliente») sin que nada lo hiciera.
 */
export function mensajeDeCobro(
  cfg: DatosBancariosConfig | undefined,
  ref: string,
  origen: string,
): string {
  if (!cfg) return "";
  const datos = datosParaTransferir(cfg);
  const lineas: string[] = [];

  if (datos?.titular) lineas.push(`Titular: ${datos.titular}`);
  for (const cuenta of datos?.cuentas ?? []) lineas.push(`${cuenta.etiqueta}: ${cuenta.valor}`);

  const aceptaEnLinea = mediosDeCobroHabilitados(cfg).some((m) => m.id === "tarjeta");
  if (aceptaEnLinea) lineas.push(`Pago en línea: ${enlaceDePago(cfg, ref, origen)}`);

  if (datos?.instrucciones) {
    if (lineas.length > 0) lineas.push("");
    lineas.push(datos.instrucciones);
  }

  return lineas.join("\n").trim();
}
