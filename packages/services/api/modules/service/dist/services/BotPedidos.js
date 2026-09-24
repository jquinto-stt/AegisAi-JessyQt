// ═══════════════════════════════════════════════════════════════════════════
// BOT DE PEDIDOS — lógica pura, sin red y sin base de datos
// ═══════════════════════════════════════════════════════════════════════════

import {
    normalizarTexto,
    sinPuntuacion,
    pideHumano,
    esConsultaDePedido,
    quiereComprar,
    esSoloSaludo,
    preguntaCapacidades,
    esCancelar,
    esAfirmacion,
    pideCarta,
    esPreguntaIntermedia,
    modalidadDe,
    cantidadDe,
    resolverItem,
    resolverOpcion,
    parsearMensaje
} from './BotParser.js';

export {
    normalizarTexto,
    sinPuntuacion,
    pideHumano,
    esConsultaDePedido,
    quiereComprar,
    esSoloSaludo,
    preguntaCapacidades,
    esCancelar,
    esAfirmacion,
    pideCarta,
    esPreguntaIntermedia,
    modalidadDe,
    cantidadDe,
    resolverItem,
    resolverOpcion,
    parsearMensaje
};

//
// Qué es esto, y qué NO es
// ────────────────────────
// Esto es el bot que atiende AL CLIENTE por WhatsApp. NO es el asistente del
// operador (`modules-tools/pedidos/pedidos.tool-provider.ts`): aquel responde
// preguntas analíticas del dueño («¿cuánto vendí hoy?», «¿top productos?») y
// vive en el frontend leyendo de los stores de MobX. Este responde a un cliente
// que pregunta por SU pedido, y vive en el servidor porque tiene que atender
// aunque nadie tenga la aplicación abierta.
//
// Son dos productos distintos y por eso NO se comparte el motor: forzarlos al
// mismo sitio obligaría a arrastrar MobX al servidor para ganar nada.
//
// Alcance
// ───────
// SÍ:
//   · «¿Dónde está mi pedido?» → estado del pedido activo, con la plantilla del
//     perfil comercial de la organización.
//   · **Tomar un pedido** (añadido el 22/09): catálogo → elección → cantidad →
//     modalidad → dirección → resumen → confirmación → se escribe en
//     `necto.pedido` + `necto.pedido_item`. Ver «El ciclo de toma de pedido»
//     más abajo: es donde vive la decisión de hasta dónde valida y por qué.
//   · No entender → transferir a un humano (handoff), sin inventar respuesta.
//
// NO (y es a propósito, no un olvido):
//   · **Descontar stock.** El catálogo de venta y el inventario son dos cosas
//     distintas y este bot no las conecta: `catalogo[].id` no apunta a
//     `articulo.id`. Un pedido tomado por WhatsApp es una promesa comercial,
//     no un movimiento de kárdex. Ver `BotPedidosDAO.crearPedido`.
//   · Responder con un LLM. El texto sale de las plantillas que el dueño ya
//     tiene configuradas (`config_pedidos.plantillas_whatsapp` o el perfil), que
//     es lo que garantiza que el bot hable como la marca y no como un genérico.
//   · Calcular costos de envío o totales con impuestos: no hay tarifa
//     configurada y el bot NO inventa una. El resumen suma los items y lo dice.
//
// ─── El ciclo de toma de pedido, y dónde se detiene ───────────────────────
//
// El bot lleva un BORRADOR del pedido en `conversacion.estado_respuesta`
// (no hay tabla nueva: el borrador vive con la conversación) y avanza por
// pasos. El estado final es **`nuevo`**, no `confirmado`: lo que el bot
// garantiza es que el pedido llegó completo y con un precio congelado; que
// exista de verdad en la cocina y que haya stock lo confirma una persona. Un
// pedido que nace `confirmado` nacería confirmado por un bot que no puede
// comprobar nada de eso — sería un control que miente.
//
// Lo que SÍ valida, porque puede probarlo:
//   · Que el item elegido esté en el catálogo del dueño.
//   · Que la cantidad sea un entero mayor que cero.
//   · Que una modalidad de domicilio traiga dirección.
//   · Que el pedido tenga al menos un item.
//   · Que el total sea la suma de precio × cantidad de esos items.
//
// Lo que NO puede validar, y por eso no lo finge: que el platillo se pueda
// preparar hoy, que el domicilio esté en la zona de reparto, que el precio
// siga vigente en el local. Nada de eso se promete en el mensaje de cierre.
//
// ═══════════════════════════════════════════════════════════════════════════
/**
 * Plantillas por perfil comercial. **Copia literal del frontend.**
 *
 * ── Por qué están duplicadas y por qué es lo correcto aquí ────────────────
 *
 * Fuente: `packages/apps/web/modules/app/src/domain/pedidos/pedidos.profiles.ts`
 * (`BUSINESS_PROFILES[*].defaultPlantillas`). El bot corre en el **servidor** y
 * no puede importar del frontend: arrastrar `src/domain/pedidos` al servicio
 * significaría traer React y los tipos del mock a un proceso de Node.
 *
 * Es duplicación, sí. La alternativa —que el dueño que eligió «Alimentos y
 * Bebidas» reciba el texto genérico— es peor: el bot hablaría distinto que su
 * propia UI. Lo que hace esto tolerable es que **es un espejo de un catálogo
 * estático**: los presets cambian cuando alguien edita ese archivo a mano, no
 * por datos del cliente. Si se añade un perfil allí, aquí hay que añadirlo.
 *
 * El orden de precedencia sigue siendo el correcto: lo que el dueño escribió
 * (`config_pedidos.plantillas_whatsapp`) gana sobre el preset, y el preset gana
 * sobre `PLANTILLAS_POR_DEFECTO`.
 */
export const PLANTILLAS_POR_PERFIL = {
    food: {
        recibido: '¡Recibimos tu pedido! Lo estamos revisando.',
        confirmado: 'Tu pedido fue confirmado y pronto entra a cocina.',
        enPreparacion: '¡Manos a la obra! Estamos preparando tu comida.',
        listo: 'Tu pedido está listo y empacado.',
        enCamino: 'Tu pedido va en camino con el repartidor.',
        entregado: '¡Pedido entregado! Buen provecho y gracias por tu compra.',
        cancelado: 'Tu pedido fue cancelado. Si tienes dudas, escríbenos.',
    },
    fashion: {
        recibido: '¡Hola! Recibimos tu orden en nuestra tienda de moda.',
        confirmado: 'Tu orden fue confirmada y pasó a inspección y empaque.',
        enPreparacion: 'Estamos empacando tus prendas y preparando el rotulado.',
        listo: 'Tus prendas están empacadas y listas para despacho.',
        enCamino: '¡Tus prendas van en camino con la transportadora! Te avisaremos al entregar.',
        entregado: '¡Prendas entregadas! Esperamos que disfrutes tu outfit.',
        cancelado: 'Tu orden de prendas fue cancelada.',
    },
    services: {
        recibido: 'Recibimos tu solicitud de servicio.',
        confirmado: 'Tu cita fue confirmada en nuestra agenda.',
        enPreparacion: 'Tu cita está programada en el horario acordado.',
        listo: 'Te esperamos en recepción.',
        enCamino: 'Tu servicio está en curso.',
        entregado: '¡Servicio finalizado con éxito! Gracias por tu confianza.',
        cancelado: 'Tu cita fue cancelada.',
    },
    general: {
        recibido: '¡Recibimos tu pedido! Lo estamos procesando.',
        confirmado: 'Tu pedido fue confirmado.',
        enPreparacion: 'Estamos alistando tus productos.',
        listo: 'Tu paquete está listo.',
        enCamino: 'Tu pedido va en camino.',
        entregado: '¡Pedido entregado! Gracias por elegirnos.',
        cancelado: 'Tu pedido fue cancelado.',
    },
};
/**
 * Fallback si la organización no tiene plantillas configuradas. Es el juego de
 * `general` del frontend, y existe para que el bot NUNCA se quede sin texto:
 * un bot mudo por falta de configuración es un fallo silencioso.
 */
export const PLANTILLAS_POR_DEFECTO = {
    recibido: '¡Recibimos tu pedido! Lo estamos revisando.',
    confirmado: 'Tu pedido fue confirmado y pronto entra a preparación.',
    enPreparacion: 'Estamos preparando tu pedido.',
    listo: 'Tu pedido está listo.',
    enCamino: 'Tu pedido va en camino.',
    entregado: '¡Pedido entregado! Gracias por tu compra.',
    cancelado: 'Tu pedido fue cancelado. Si tienes dudas, escríbenos.',
};
/**
 * Mapeo estado → plantilla. `programado` cae en `recibido` a propósito: está
 * agendado y lo que el cliente necesita saber es «lo tenemos», no un estado
 * intermedio que no tiene plantilla propia.
 */
const PLANTILLA_POR_ESTADO = {
    nuevo: 'recibido',
    programado: 'recibido',
    confirmado: 'confirmado',
    en_preparacion: 'enPreparacion',
    listo: 'listo',
    en_camino: 'enCamino',
    entregado: 'entregado',
    cancelado: 'cancelado',
};
/**
 * Estados que NO cuentan como «pedido activo»: si el cliente pregunta por su
 * pedido y solo tiene estos, no está «en curso». Se distinguen para poder
 * responder algo útil («tu último pedido fue entregado») en vez de «no
 * encontramos nada», que sonaría a que se perdió.
 */
const ESTADOS_CERRADOS = new Set(['entregado', 'cancelado']);
/** Palabra que el cliente usa, por estado. Para redactar sin jerga interna. */
const ETIQUETA_ESTADO = {
    nuevo: 'recién recibido',
    programado: 'programado',
    confirmado: 'confirmado',
    en_preparacion: 'en preparación',
    listo: 'listo',
    en_camino: 'en camino',
    entregado: 'entregado',
    cancelado: 'cancelado',
};
/**
 * Respaldo. Es el último nivel de precedencia: si el dueño no configuró nada,
 * el bot habla con esto. Existe para que un bot sin configuración NO se quede
 * mudo — un bot que no contesta por falta de un `jsonb` es un fallo silencioso.
 */
export const CONVERSACION_POR_DEFECTO = {
    // ── PRESENTACIÓN: UNA LISTA, NO UNA INSTRUCCIÓN ─────────────────────────
    //
    // Antes decía «escríbeme "¿cómo va mi pedido?"». Eso pone la carga en el
    // cliente: hay que acordarse de una frase y escribirla tal cual, con las
    // tildes y todo. La gente no escribe así —escribe «y mi pedido?», «como
    // va», «hola», «buenas»— y el bot contestaba «no te entendí» a cada
    // variante. Ahora se ofrece una LISTA y se pide un NÚMERO: es la
    // interacción que cualquiera reconoce de un bot, y el número que el
    // cliente escribe ES el de la lista que acaba de ver.
    //
    // El pie (`menuPie`) se repite al final de cada respuesta de menú para que
    // el cliente nunca tenga que hacer scroll hacia arriba a buscar la lista.
    presentacion: '¡Hola! Soy el asistente virtual. Puedo ayudarte con esto:\n' +
        '{menu}\n\n' +
        'Escríbeme el número de la opción que quieras.',
    pideAsesor: 'Claro, te comunico con un asesor. En un momento te atiende.',
    noEntendido: 'Perdona, no te entendí. Elige una opción:\n' +
        '{menu}\n\n' +
        'Escríbeme solo el número, por ejemplo «2».',
    // Antes decía «Te lee un asesor en un momento», y era verdad mientras esta
    // rama transfería. Al dejar de transferir —un adjunto no puede apagar el
    // hilo— la frase pasó a ser una promesa que nadie cumple: el cliente
    // esperaría a una persona que no va a llegar. Se dice lo que pasa de verdad.
    sinTexto: 'No pude leer eso. Escríbeme lo que necesitas y te ayudo:',
    sinPedido: 'No tengo a la vista un pedido en curso con este número. Vamos a resolverlo:\n' +
        '{menu}\n\n' +
        'Escríbeme el número de la opción que quieras.',
    quiereComprar: 'Con gusto te ayudo con tu compra. Te comunico con un asesor para que lo tome contigo.',
    // ── Toma de pedido ──────────────────────────────────────────────────────
    // Los textos de aquí son los que ve un cliente cuando el dueño no configuró
    // nada. Se redactan para no prometer nada que el bot no pueda cumplir: no
    // dicen «ya está en cocina», dicen «quedó registrado».
    itemCatalogo: '{n}. {nombre} — {precio}',
    pedirCatalogo: 'Con gusto. Esto es lo que tenemos:\n{total}\n\n' +
        'Escríbeme el número del que quieras.',
    pedirCantidad: '¿Cuántas unidades de *{item}* quieres?\n\n' +
        'Escríbeme solo el número, por ejemplo «2».{siguiente}',
    // El paso de cantidad NO lleva lista numerada —ver `MENU_DE_PASO`— y en su
    // lugar lleva este pie: dice cómo cambiar de plato o salir sin ofrecer un
    // dígito que el cliente podría confundir con una cantidad. Antes de esto, el
    // único camino de salida era escribir «cancelar» a secas, que nadie adivina.
    pieCantidad: ' Si quieres otro producto escríbeme «otro», y si prefieres dejarlo escríbeme «cancelar».',
    cantidadInvalida: 'No entendí la cantidad de *{item}*. Escríbeme solo un número, por ejemplo «2».',
    // Las modalidades también se numeran: «¿cómo lo quieres?» con la respuesta
    // libre obligaba al cliente a adivinar el vocabulario que el bot acepta.
    pedirModalidad: '¿Cómo lo quieres?\n\n' +
        '{menu}\n\n' +
        'Escríbeme el número.',
    pedirDireccion: '¿A qué dirección te lo llevamos? Escríbela con el barrio o una referencia para que el repartidor la encuentre.',
    resumenPedido: 'Esto es tu pedido:\n{lineas}\n\nEntrega: {modalidad}.{direccion}\nTotal: *{total}*\n\n' +
        '{menu}\n\n' +
        'Escríbeme el número.',
    cancelarPedido: 'Listo, dejé el pedido sin confirmar. Cuando quieras empezamos de nuevo.',
    pedidoCreado: '¡Listo! Tu pedido quedó registrado con el número *{numero}* y ya lo está viendo el equipo. ' +
        'Te escribo cuando avance.',
    yaTienesPedido: 'Veo que ya tienes el pedido *{numero}* en curso.\n\n' +
        '{menu}\n\n' +
        'Escríbeme el número.',
    itemNoEncontrado: 'No encontré «{texto}» en el catálogo.\n\n' +
        '{menu}\n\n' +
        'Escríbeme el número de la opción que quieras.',
    // ── Menú numerado: las opciones de contexto ─────────────────────────────
    //
    // `{menu}` se compone con `componerMenu`, que renumera lo que realmente se
    // ofrece en cada momento. Un menú que anuncia una opción que el bot no
    // sabe atender sería el mismo defecto de siempre: un control que miente.
    opcionVerPedido: 'Cómo va mi pedido',
    opcionPedir: 'Hacer un pedido',
    opcionCarta: 'Ver los productos',
    opcionAsesor: 'Hablar con una persona',
    opcionConfirmar: 'Sí, confirmo el pedido',
    opcionCancelar: 'No, cancelar',
    opcionDomicilio: 'A domicilio',
    opcionRetiro: 'Para recoger en el local',
    opcionAgregarOtro: 'Agregar otro producto',
    verPedidoSinNumero: 'Puedo mirar tu pedido, pero necesito ubicarlo. Escríbeme el *número* del pedido, ' +
        'por ejemplo «1042», o elige otra opción:\n\n' +
        '{menu}\n\n' +
        'Escríbeme solo el número.',
};
/**
 * El menú de opciones, numerado como lo va a leer el cliente.
 *
 * ── Por qué el menú se compone y no se escribe ────────────────────────────
 *
 * Los números de las opciones tienen que ser EXACTAMENTE los que el cliente
 * puede escribir, y el conjunto cambia según el contexto (con un pedido en
 * curso hay «¿cómo va?»; con un carrito a medias hay «agregar otro»; con
 * catálogo hay «hacer un pedido»). Escribir seis variantes de la lista a mano
 * es garantizar que alguna quede desfasada — y una lista desfasada manda al
 * cliente a escribir un número que no existe. Se compone desde una lista de
 * claves y `resolverOpcion` lee esa MISMA lista, así que el número que se
 * muestra y el número que se entiende salen de la misma fuente.
 *
 * Lo que NO se ofrece, no se muestra: sin catálogo cargado, «hacer un pedido»
 * no aparece porque el bot no podría atenderlo.
 */
export function componerMenu(opciones, frases) {
    const f = frases ?? CONVERSACION_POR_DEFECTO;
    const TEXTO_DE = {
        ver_pedido: f.opcionVerPedido,
        pedir: f.opcionPedir,
        carta: f.opcionCarta,
        asesor: f.opcionAsesor,
        confirmar: f.opcionConfirmar,
        cancelar: f.opcionCancelar,
        domicilio: f.opcionDomicilio,
        retiro: f.opcionRetiro,
        agregar_otro: f.opcionAgregarOtro,
    };
    return opciones
        .filter((o) => typeof TEXTO_DE[o] === 'string' && TEXTO_DE[o].length > 0)
        .map((o, idx) => `${idx + 1}. ${TEXTO_DE[o]}`)
        .join('\n');
}
/**
 * Qué opciones tiene sentido ofrecer en este contexto.
 *
 * `carta` solo aparece en una conversación ya abierta (el cliente pidió ver el
 * catálogo y quizá quiere volver a verlo). Al saludar por primera vez, «hacer
 * un pedido» ya lleva el catálogo dentro; ofrecer las dos a la vez son dos
 * caminos al mismo sitio y un menú más largo de leer.
 *
 * ── Por qué `pedir` y `carta` desaparecen con un pedido en curso ─────────
 *
 * Medido el 22/09, probando el menú contra un hilo con el pedido WEB-0002
 * activo: con `hayPedidoEnCurso` el menú ofrecía «Hacer un pedido» como opción
 * 2, el cliente la pulsaba, y el bot respondía «ya tienes un pedido en curso»
 * — es decir, el menú ofrecía justo lo único que el bot tiene prohibido hacer.
 * El bot no abre un segundo pedido, así que no puede anunciarlo: es el mismo
 * defecto de siempre, un control que promete lo que el sistema no cumple.
 *
 * Con un pedido en curso lo que sí tiene sentido es mirarlo, y pedir una
 * persona. El cliente que de verdad quiera otro pedido lo dirá con palabras
 * —«cancelar» y empezar de nuevo—, que es donde no hay promesa falsa.
 */
export function opcionesDe(input) {
    const { hayCatalogo, hayPedidoEnCurso, enCiclo } = input;
    if (enCiclo)
        return ['agregar_otro', 'confirmar', 'cancelar', 'asesor'];
    if (hayPedidoEnCurso)
        return ['ver_pedido', 'asesor'];
    const out = [];
    if (hayCatalogo)
        out.push('pedir', 'carta');
    out.push('asesor');
    return out;
}
/**
 * El menú de cada paso del ciclo de pedido.
 *
 * Vive en el módulo y no dentro de `decidirEnCiclo` porque hay TRES sitios que
 * tienen que coincidir en la misma lista: la pregunta que se imprime
 * (`redactarPaso`), el lector del número (`resolverOpcion`) y la reimpresión
 * del resumen cuando la confirmación falla. Con la tabla duplicada, cambiar una
 * lista y olvidar otra deja al cliente escribiendo un número que ya no existe.
 *
 * ── Por qué dos pasos van SIN menú, y no es un olvido ─────────────────────
 *
 * **`eligiendo_cantidad`**: este paso espera un NÚMERO —«2» significa dos
 * unidades— y cualquier lista numerada le roba ese significado. Medido en este
 * mismo cambio: con un menú de dos opciones donde la 2 era «No, cancelar», un
 * cliente que contestaba «2» a «¿cuántas unidades quieres?» veía su pedido
 * CANCELADO. El número era correcto y hacía lo contrario de lo que el cliente
 * pidió. En un paso cuya respuesta natural es un dígito, el dígito es sagrado:
 * no se le superpone ninguna lista.
 *
 * **`eligiendo_items`**: el menú de este paso son los PRODUCTOS, que ya vienen
 * numerados del catálogo. Un segundo 1..n encima haría «1» ambiguo justo donde
 * más importa.
 *
 * En los dos casos la salida sigue existiendo por texto —«cancelar», «carta»,
 * «asesor»—, que es donde no compite con nada.
 *
 * **`eligiendo_direccion`** sí lleva menú, y también es deliberado: ahí no hay
 * número que perder. La dirección se exige de 5+ caracteres, así que un «1»
 * suelto no es una dirección y no hay colisión posible.
 */
const MENU_DE_PASO = {
    eligiendo_items: [],
    eligiendo_cantidad: [],
    eligiendo_modalidad: ['domicilio', 'retiro', 'cancelar'],
    // La dirección espera texto libre, así que su menú NO incluye «retiro»
    // como opción numerada: un «1» pegado por inercia cambiaría la modalidad
    // por accidente. Quien quiera cambiar a retiro lo escribe, que es
    // deliberado; un dígito no debería reescribir la entrega.
    eligiendo_direccion: [],
    confirmando: ['confirmar', 'cancelar'],
};
/** Las opciones de un paso del ciclo. */
export function menuDePaso(paso) {
    return MENU_DE_PASO[paso] ?? [];
}
/**
 * Rellena una frase del ciclo, poniendo el menú de ese paso si la frase lo pide.
 *
 * Se hace aquí y no en cada `return` porque `rellenar` solo sustituye lo que
 * recibe: si una rama se olvida de pasar `menu`, la frase sale con el
 * `{menu}` vacío y el cliente ve una pregunta sin opciones — y el defecto es
 * casi invisible, porque el texto sigue leyéndose. Medido en este mismo cambio:
 * se olvidó en `eligiendo_items` y la pregunta de cantidad salió con dos líneas
 * en blanco donde iba la lista.
 *
 * Los pasos sin lista reciben `pieCantidad`, que cumple la misma función —decir
 * cómo salir— sin ofrecer un dígito que compita con la respuesta esperada.
 */
function redactarPaso(plantilla, paso, frases, valores = {}) {
    const menu = componerMenu(menuDePaso(paso), frases);
    return rellenar(plantilla, {
        ...valores,
        menu,
        siguiente: menu ? '' : (frases.pieCantidad ?? ''),
    });
}
/** El saludo/menú de arranque, con las opciones del contexto. */
export function redactarMenu(input, frases) {
    const f = frases ?? CONVERSACION_POR_DEFECTO;
    const plantilla = f[input.plantilla] ?? f.presentacion;
    return rellenar(plantilla, { menu: componerMenu(opcionesDe(input), f) });
}
/**
 * Mezcla lo configurado sobre el respaldo, campo a campo.
 *
 * Campo a campo y no `{...defecto, ...configurado}` a secas, porque el dueño
 * puede configurar solo `presentacion`: si se reemplazara el objeto entero,
 * las otras cinco quedarían `undefined` y el bot mandaría `undefined` al
 * cliente. Un `jsonb` parcial es lo normal cuando alguien edita un formulario.
 */
export function frasesDe(configurado) {
    const out = { ...CONVERSACION_POR_DEFECTO };
    if (!configurado)
        return out;
    for (const k of Object.keys(CONVERSACION_POR_DEFECTO)) {
        const v = configurado[k];
        if (typeof v === 'string' && v.trim().length > 0)
            out[k] = v;
    }
    return out;
}
/**
 * Elige la plantilla del estado.
 *
 * Precedencia, de más específico a más genérico:
 *   1. Lo que el dueño escribió (`config_pedidos.plantillas_whatsapp`).
 *   2. El preset de su perfil comercial (`PLANTILLAS_POR_PERFIL`).
 *   3. `PLANTILLAS_POR_DEFECTO` — para que el bot NUNCA se quede sin texto.
 *
 * El paso 2 es el que evita que un restaurante reciba el texto genérico: si el
 * dueño eligió «Alimentos y Bebidas» en la UI, el bot habla como su cocina
 * aunque no haya personalizado nada.
 */
export function plantillaDeEstado(estado, plantillas, perfil) {
    const clave = PLANTILLA_POR_ESTADO[estado] ?? 'recibido';
    const delDueno = plantillas?.[clave];
    if (typeof delDueno === 'string' && delDueno.trim().length > 0)
        return delDueno;
    const delPerfil = perfil ? PLANTILLAS_POR_PERFIL[perfil]?.[clave] : undefined;
    if (typeof delPerfil === 'string' && delPerfil.trim().length > 0)
        return delPerfil;
    return PLANTILLAS_POR_DEFECTO[clave];
}
/** «en camino», «listo»… en lenguaje de cliente, no el literal de la columna. */
export function etiquetaEstado(estado) {
    return ETIQUETA_ESTADO[estado] ?? estado;
}
/** Minutos → «unos 20 minutos». Redondeado a 5 para no prometer precisión falsa. */
function minutosLegibles(min) {
    const m = Math.max(5, Math.round(min / 5) * 5);
    return m < 60 ? `unos ${m} minutos` : m === 60 ? 'alrededor de una hora' : `unas ${Math.round(m / 60)} horas`;
}
/**
 * Redacta la respuesta de estado. Combina la plantilla del dueño con el dato
 * concreto, sin inventar nada: si no hay estimación configurada, no se promete
 * un tiempo.
 */
export function redactarRespuestaDePedido(pedido, plantillas, perfil) {
    const base = plantillaDeEstado(pedido.estado, plantillas, perfil);
    const partes = [base];
    // El número del pedido siempre: es lo que el cliente necesita para reclamar.
    partes.push(`Pedido: ${pedido.numero}.`);
    if (pedido.estado === 'programado' && pedido.programadoPara) {
        partes.push(`Está agendado para el ${formatearFecha(pedido.programadoPara)}.`);
    }
    else if (pedido.minutosEstimados != null && !ESTADOS_CERRADOS.has(pedido.estado)) {
        partes.push(`Tiempo estimado: ${minutosLegibles(pedido.minutosEstimados)}.`);
    }
    return partes.join(' ');
}
/**
 * Fecha en formato es-CO, sin hora si es medianoche (un pedido programado para
 * un día concreto no gana nada con un «00:00» que nadie pidió).
 */
function formatearFecha(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime()))
        return iso;
    const fecha = d.toLocaleDateString('es-CO', {
        day: 'numeric',
        month: 'long',
        timeZone: 'America/Bogota',
    });
    const h = d.toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Bogota',
    });
    return h === '00:00' ? fecha : `${fecha} a las ${h}`;
}
// ═══════════════════════════════════════════════════════════════════════════
// EL CICLO DE TOMA DE PEDIDO
// ═══════════════════════════════════════════════════════════════════════════
//
// El bot lleva un borrador (`PedidoEnCurso`) en la conversación y avanza por
// pasos. Cada paso consume UN mensaje del cliente, y el mensaje se interpreta
// según el paso en que esté — no según lo que «parezca». Esa es la diferencia
// entre un formulario y una adivinanza:
//
//   · En `eligiendo_cantidad`, «2» es la cantidad. No hace falta que diga «dos
//     unidades» ni que el clasificador entienda nada.
//   · En `eligiendo_items`, «2» es el número del item del catálogo impreso.
//   · Fuera de un ciclo, «2» no es nada: se clasifica como siempre.
//
// ── Las salidas de emergencia ────────────────────────────────────────────
//
// Un formulario por WhatsApp solo funciona si el cliente puede salirse, y si
// el bot no puede quedarse atascado. Están cubiertos:
//
//   · «cancelar» / «no» en cualquier paso → se abandona el borrador. En
//     `confirmando`, «no» es la respuesta legítima a la pregunta.
//   · «asesor» en cualquier paso → handoff, y el borrador se descarta. Un
//     cliente que pide una persona no debe seguir contestando un formulario.
//   · Un paso desconocido en el `jsonb` (versión vieja, fila corrupta) → se
//     ignora el borrador y se decide desde cero. El peor caso es volver a
//     empezar, nunca crear un pedido con datos a medias.
//
// ── Por qué el precio se congela al elegir y no al confirmar ─────────────
//
// Si el dueño cambia un precio entre que el cliente ve el catálogo y confirma,
// el resumen que el cliente leyó debe ser el que se cobra. `LineaBorrador`
// guarda el precio en el momento de elegir y `crearPedido` escribe ese número
// en `pedido_item.precio_unitario`. Mismo criterio que el frontend: los items
// guardan snapshots, no punteros.
// ═══════════════════════════════════════════════════════════════════════════

/** Formatea un precio en pesos colombianos, sin decimales. */
export function precioLegible(precio) {
    const n = Math.round(precio);
    return `$${n.toLocaleString('es-CO')}`;
}
/** Sustituye `{clave}` por su valor. Deja el hueco si falta el valor. */
function rellenar(plantilla, valores) {
    return plantilla.replace(/\{(\w+)\}/g, (todo, clave) => valores[clave] !== undefined ? valores[clave] : todo);
}
/** Total del borrador, con el precio congelado de cada línea. */
export function totalDe(lineas) {
    return lineas.reduce((acc, l) => acc + l.precioUnitario * l.cantidad, 0);
}
/**
 * El catálogo numerado tal como lo lee el cliente.
 *
 * Se numera desde 1 porque es lo que el cliente va a escribir. El `id` interno
 * (`cat-f1`) no se muestra nunca: es una clave, no algo que una persona deba
 * transcribir.
 */
export function redactarCatalogo(catalogo, frases) {
    const lineas = catalogo
        .map((i, idx) => rellenar(frases.itemCatalogo, {
        n: String(idx + 1),
        nombre: i.nombre,
        precio: precioLegible(i.precio),
    }))
        .join('\n');
    // ── Por qué el listado se PEGA y no se sustituye por un marcador ─────────
    //
    // Primera versión: `{total}` en la frase del dueño, sustituido por el
    // listado. Falló, y de la peor manera — medida con este arnés: la frase que
    // el dueño ya tenía escrita (`pedirCatalogo`) **no menciona `{total}`**, así
    // que `rellenar` no tenía dónde ponerlo y el catálogo **desaparecía sin un
    // solo error**. El bot decía «estos son los productos que tenemos» y no
    // listaba ninguno. Los 24 fallos en cadena de esa corrida salieron de aquí:
    // sin números en pantalla, «1» no era ningún item y todo cayó a handoff.
    //
    // El listado no es parte de la redacción: es un DATO. La frase es la voz de
    // la marca y el dueño puede escribirla como quiera; lo que no puede es
    // borrar el catálogo por no saberse un marcador. Así que se compone:
    // frase + listado. Si la frase trae `{total}`, se respeta su sitio; si no,
    // el listado va detrás.
    if (frases.pedirCatalogo.includes('{total}')) {
        return rellenar(frases.pedirCatalogo, { total: lineas, negocio: '' });
    }
    return `${frases.pedirCatalogo}\n\n${lineas}`;
}
/** El resumen que se le lee al cliente antes de que confirme. */
export function redactarResumen(borrador, frases) {
    const lineas = borrador.lineas
        .map((l) => `· ${l.cantidad} × ${l.nombre} — ${precioLegible(l.precioUnitario * l.cantidad)}`)
        .join('\n');
    const direccion = borrador.direccion ? `\nDirección: ${borrador.direccion}` : '';
    return rellenar(frases.resumenPedido, {
        lineas,
        modalidad: borrador.modalidad ?? '—',
        direccion,
        total: precioLegible(totalDe(borrador.lineas)),
    });
}
/**
 * Los valores del resumen, para poder reimprimirlo desde más de un sitio.
 *
 * ── Por qué la dirección va con salto de línea REAL ──────────────────────
 *
 * Antes esto era `b.direccion ? '\\nDirección: ...' : ''` dentro de una cadena
 * normal, así que el `\n` se interpretaba como salto y salía bien. Al moverlo a
 * un literal con comillas invertidas el `\'\\n\'` se volvió un salto literal y
 * el resumen imprimía «Entrega: domicilio.\\nDirección: Cra 10…» en una sola
 * línea. Medido con el arnés: el cliente leía `\n` escrito. La dirección se
 * concatena aparte para que el salto sea un salto.
 */
function valoresDeResumen(b) {
    const lineas = b.lineas
        .map((l) => `· ${l.cantidad} × ${l.nombre} — ${precioLegible(l.precioUnitario * l.cantidad)}`)
        .join('\n');
    return {
        lineas,
        modalidad: b.modalidad ?? '—',
        direccion: b.direccion ? '\nDirección: ' + b.direccion : '',
        total: precioLegible(totalDe(b.lineas)),
    };
}
/**
 * Crear el pedido, con las dos guardas de cordura antes de escribir.
 *
 * Se extrajo a función porque hay DOS caminos que confirman —el «sí» escrito y
 * el número del menú— y duplicar las guardas era garantizar que una de las dos
 * se olvidara en el próximo cambio. Las guardas no son formulismo: la primera
 * evita escribir un pedido con total cero, y la segunda evita un segundo pedido
 * activo del mismo cliente, que es el caso que el bot no sabe resolver solo.
 */
function confirmarBorrador(b, input) {
    const { catalogo, frases: f, pedidoActivoNumero } = input;
    if (b.lineas.length === 0) {
        // El borrador solo llega a `confirmando` tras añadir una línea, pero un
        // `jsonb` corrupto puede conseguir lo contrario y es preferible volver a
        // empezar que escribir un pedido sin nada.
        return {
            accion: 'seguir',
            texto: redactarCatalogo(catalogo, f),
            borrador: borradorNuevo(),
            crear: false,
        };
    }
    if (pedidoActivoNumero) {
        return {
            accion: 'descartar',
            texto: rellenar(f.yaTienesPedido, {
                numero: pedidoActivoNumero,
                menu: componerMenu(['ver_pedido', 'asesor'], f),
            }),
        };
    }
    return { accion: 'crear', texto: f.pedidoCreado, borrador: b, crear: true, intent: 'confirmar_pedido' };
}
/**
 * Añade una línea al borrador o suma cantidad si el item ya estaba.
 *
 * Sumar y no duplicar: «2 hamburguesas» y luego «1 hamburguesa más» es un
 * pedido de 3, no dos líneas del mismo plato. El resumen que lee el cliente
 * tiene que coincidir con lo que pidió.
 */
function agregarLinea(lineas, item, cantidad) {
    const ya = lineas.findIndex((l) => l.itemId === item.id);
    if (ya >= 0) {
        const copia = [...lineas];
        copia[ya] = { ...copia[ya], cantidad: copia[ya].cantidad + cantidad };
        return copia;
    }
    return [
        ...lineas,
        { itemId: item.id, nombre: item.nombre, precioUnitario: item.precio, cantidad },
    ];
}
/** El borrador con el paso y las líneas que se quieran cambiar. */
function paso(borrador, cambios) {
    return { ...borrador, ...cambios };
}
/** Borrador vacío, listo para empezar a elegir items. */
export function borradorNuevo() {
    return {
        paso: 'eligiendo_items',
        lineas: [],
        itemPendienteId: null,
        modalidad: null,
        direccion: null,
        intento: 'tomar_pedido',
    };
}
/** Quita un ítem de las líneas del borrador. */
export function quitarLinea(lineas, itemId) {
    return lineas.filter((l) => l.itemId !== itemId);
}
/** Modifica la cantidad de un ítem existente en el borrador. Si cantidad <= 0, lo elimina. */
export function modificarCantidadLinea(lineas, itemId, nuevaCantidad) {
    if (nuevaCantidad <= 0)
        return quitarLinea(lineas, itemId);
    return lineas.map((l) => (l.itemId === itemId ? { ...l, cantidad: nuevaCantidad } : l));
}
/** Reemplaza un ítem viejo por uno nuevo en el borrador. */
export function reemplazarLinea(lineas, itemIdViejo, nuevoItem, nuevaCantidad) {
    const cant = nuevaCantidad > 0 ? nuevaCantidad : 1;
    const sinViejo = lineas.filter((l) => l.itemId !== itemIdViejo);
    return agregarLinea(sinViejo, nuevoItem, cant);
}

/**
 * Interpreta el mensaje del cliente DENTRO de un ciclo de toma de pedido.
 *
 * Devuelve `null` cuando el mensaje no pertenece al ciclo y hay que dejarlo
 * pasar al clasificador normal — por ejemplo, un cliente a mitad de elegir
 * items que pregunta «¿dónde está mi pedido anterior?». Esa pregunta la sabe
 * contestar el bot, y secuestrarla por estar en un formulario sería peor
 * servicio que el formulario.
 */
export function decidirEnCiclo(input) {
    const { texto, catalogo } = input;
    const f = input.frases;
    const b = input.borrador;
    // ── Consultas intermedias o preguntas sobre pedidos anteriores ──────────
    // Se dejan pasar para no atrapar al usuario en un paso rígido y no perder el carrito
    if (esPreguntaIntermedia(texto) || esConsultaDePedido(texto)) {
        return null;
    }
    // ── Iniciar nuevo pedido desde cero ─────────────────────────────────────
    const tNorm = normalizarTexto(texto || '');
    if (/\b(nuevo pedido|otro pedido|empezar de nuevo|comenzar de nuevo|borrar todo)\b/.test(tNorm)) {
        return {
            accion: 'nuevo_pedido',
            texto: redactarCatalogo(catalogo, f),
            borrador: borradorNuevo(),
            intent: 'iniciar_nuevo_pedido',
            crear: false,
        };
    }
    // ── Modificaciones del carrito activo (eliminar, corregir, reemplazar) ──
    if (b.lineas && b.lineas.length > 0) {
        // A. Eliminar producto
        const pareceEliminar = /\b(quita|quitar|elimina|eliminar|borra|borrar|no quiero|saca|sacar|sin)\b/.test(tNorm);
        if (pareceEliminar) {
            const itemAEliminar = b.lineas.find((l) => {
                const nombreNorm = normalizarTexto(l.nombre);
                const palabras = nombreNorm.split(' ').filter((p) => p.length >= 4);
                return tNorm.includes(nombreNorm) || palabras.some((p) => tNorm.includes(p));
            });
            if (itemAEliminar) {
                const nuevasLineas = quitarLinea(b.lineas, itemAEliminar.itemId);
                const nuevoBorrador = paso(b, { lineas: nuevasLineas, itemPendienteId: null });
                if (nuevasLineas.length === 0) {
                    return {
                        accion: 'seguir',
                        texto: `He retirado *${itemAEliminar.nombre}* de tu pedido. Tu carrito ha quedado vacío.\n\n¿Qué te gustaría pedir de nuestro menú?`,
                        borrador: paso(nuevoBorrador, { paso: 'eligiendo_items' }),
                        intent: 'eliminar_producto',
                        crear: false,
                    };
                }
                const resumen = nuevasLineas.map((l) => `• ${l.cantidad}x ${l.nombre} ($${(l.precioUnitario * l.cantidad).toLocaleString('es-CO')})`).join('\n');
                return {
                    accion: 'seguir',
                    texto: `Listo, retiré *${itemAEliminar.nombre}*. Tu pedido actual es:\n${resumen}\n\n*Total:* $${totalDe(nuevasLineas).toLocaleString('es-CO')}\n\n¿Deseas agregar algo más o continuar con el pedido?`,
                    borrador: nuevoBorrador,
                    intent: 'eliminar_producto',
                    crear: false,
                };
            }
        }
        // B. Reemplazar producto
        const pareceReemplazo = /\b(cambia|cambiar|reemplaza|reemplazar)\b/.test(tNorm) && /\b(por|en vez de)\b/.test(tNorm);
        if (pareceReemplazo) {
            const itemViejo = b.lineas.find((l) => {
                const nombreNorm = normalizarTexto(l.nombre);
                const palabras = nombreNorm.split(' ').filter((p) => p.length >= 4);
                return palabras.some((p) => tNorm.includes(p));
            });
            const itemNuevo = resolverItem(texto, catalogo);
            if (itemViejo && itemNuevo && itemViejo.itemId !== itemNuevo.id) {
                const cant = cantidadDe(texto) || itemViejo.cantidad || 1;
                const nuevasLineas = reemplazarLinea(b.lineas, itemViejo.itemId, itemNuevo, cant);
                const nuevoBorrador = paso(b, { lineas: nuevasLineas, itemPendienteId: null });
                const resumen = nuevasLineas.map((l) => `• ${l.cantidad}x ${l.nombre} ($${(l.precioUnitario * l.cantidad).toLocaleString('es-CO')})`).join('\n');
                return {
                    accion: 'seguir',
                    texto: `Listo, cambié *${itemViejo.nombre}* por *${itemNuevo.nombre}*. Tu pedido actual es:\n${resumen}\n\n*Total:* $${totalDe(nuevasLineas).toLocaleString('es-CO')}\n\n¿Deseas agregar algo más o continuar con la entrega?`,
                    borrador: nuevoBorrador,
                    intent: 'modificar_producto',
                    crear: false,
                };
            }
        }
        // C. Corregir cantidad
        const pareceCorreccionCantidad = /\b(no eran|no son|cambia|cambiar|ajustar|ponle|solo|solamente|deja)\b/.test(tNorm) || (b.lineas.length === 1 && /\b\d{1,3}\b/.test(tNorm));
        const nuevaCant = cantidadDe(texto);
        if (pareceCorreccionCantidad && nuevaCant !== null && nuevaCant > 0) {
            const itemACorregir = b.lineas.find((l) => {
                const nombreNorm = normalizarTexto(l.nombre);
                const palabras = nombreNorm.split(' ').filter((p) => p.length >= 4);
                return palabras.some((p) => tNorm.includes(p));
            }) || (b.lineas.length === 1 ? b.lineas[0] : null);
            if (itemACorregir) {
                const nuevasLineas = modificarCantidadLinea(b.lineas, itemACorregir.itemId, nuevaCant);
                const nuevoBorrador = paso(b, { lineas: nuevasLineas, itemPendienteId: null });
                const resumen = nuevasLineas.map((l) => `• ${l.cantidad}x ${l.nombre} ($${(l.precioUnitario * l.cantidad).toLocaleString('es-CO')})`).join('\n');
                return {
                    accion: 'seguir',
                    texto: `Listo, actualicé la cantidad de *${itemACorregir.nombre}* a ${nuevaCant}. Tu pedido actual es:\n${resumen}\n\n*Total:* $${totalDe(nuevasLineas).toLocaleString('es-CO')}\n\n¿Deseas confirmar este pedido o agregar algo más?`,
                    borrador: nuevoBorrador,
                    intent: 'corregir_cantidad',
                    crear: false,
                };
            }
        }
    }
    // ── El menú del paso lo pone `redactarPaso` ─────────────────────────────
    const opciones = menuDePaso(b.paso);
    // ── Salidas de emergencia, antes de cualquier otra lectura ──────────────
    if (pideHumano(texto)) {
        return { accion: 'descartar', texto: f.pideAsesor, intent: 'pedir_asesor' };
    }
    if (esCancelar(texto) || (b.paso === 'confirmando' && esNegacion(texto))) {
        return { accion: 'descartar', texto: f.cancelarPedido, intent: 'cancelar_borrador' };
    }
    const opcion = resolverOpcion(texto, opciones, f);
    if (opcion === 'asesor') {
        return { accion: 'descartar', texto: f.pideAsesor, intent: 'pedir_asesor' };
    }
    if (opcion === 'cancelar') {
        return { accion: 'descartar', texto: f.cancelarPedido, intent: 'cancelar_borrador' };
    }
    if (opcion === 'confirmar' && b.paso === 'confirmando') {
        return confirmarBorrador(b, { catalogo, frases: f, pedidoActivoNumero: input.pedidoActivoNumero });
    }
    if (opcion === 'domicilio' && b.paso === 'eligiendo_modalidad') {
        return {
            accion: 'seguir',
            texto: f.pedirDireccion,
            borrador: paso(b, { modalidad: 'domicilio', paso: 'eligiendo_direccion' }),
            intent: 'solicitar_entrega',
            crear: false,
        };
    }
    if (opcion === 'retiro' && b.paso === 'eligiendo_modalidad') {
        const listo = paso(b, { modalidad: 'retiro' });
        return {
            accion: 'seguir',
            texto: redactarPaso(f.resumenPedido, 'confirmando', f, valoresDeResumen(listo)),
            borrador: paso(listo, { paso: 'confirmando' }),
            intent: 'solicitar_entrega',
            crear: false,
        };
    }
    // Un cliente que pidió domicilio y ahora dice «mejor lo recojo»: sale de la
    // dirección sin abandonar el carrito. La alternativa —obligarlo a escribir
    // la dirección de todos modos— sería pedir un dato que ya no hace falta.
    if (opcion === 'retiro' && b.paso === 'eligiendo_direccion') {
        const listo = paso(b, { modalidad: 'retiro', direccion: null });
        return {
            accion: 'seguir',
            texto: redactarPaso(f.resumenPedido, 'confirmando', f, valoresDeResumen(listo)),
            borrador: paso(listo, { paso: 'confirmando' }),
            intent: 'solicitar_entrega',
            crear: false,
        };
    }
    if (opcion === 'agregar_otro' && b.paso !== 'eligiendo_items') {
        return {
            accion: 'seguir',
            texto: redactarCatalogo(catalogo, f),
            borrador: paso(b, { paso: 'eligiendo_items', itemPendienteId: null }),
            intent: 'ver_catalogo',
            crear: false,
        };
    }
    switch (b.paso) {
        // ── Elegir el item ────────────────────────────────────────────────────
        case 'eligiendo_items': {
            if (pideCarta(texto)) {
                return { accion: 'seguir', texto: redactarCatalogo(catalogo, f), borrador: b, crear: false };
            }
            const item = resolverItem(texto, catalogo);
            if (!item) {
                // Un mensaje que no es ni un número ni el nombre de un producto: se
                // deja pasar al clasificador. Puede ser una pregunta legítima.
                if (/^\s*\d{1,3}\s*$/.test(texto)) {
                    return {
                        accion: 'seguir',
                        texto: redactarPaso(f.itemNoEncontrado, 'eligiendo_cantidad', f, { texto: texto.trim() }),
                        borrador: b,
                        crear: false,
                    };
                }
                return null;
            }
            // Un item elegido sin cantidad aún: se pregunta cuántas. El menú de
            // `eligiendo_cantidad` («cancelar») viaja en la frase, para que quien
            // se equivocó de plato tenga salida sin saberse ninguna palabra clave.
            const cant = cantidadDe(texto);
            if (cant !== null && cant > 0) {
                const lineas = agregarLinea(b.lineas, item, cant);
                return {
                    accion: 'seguir',
                    texto: siguientePregunta(paso(b, { lineas, itemPendienteId: null }), f),
                    borrador: paso(b, {
                        lineas,
                        itemPendienteId: null,
                        paso: 'eligiendo_modalidad',
                    }),
                    intent: 'agregar_producto',
                    crear: false,
                };
            }
            return {
                accion: 'seguir',
                texto: redactarPaso(f.pedirCantidad, 'eligiendo_cantidad', f, { item: item.nombre }),
                borrador: paso(b, { paso: 'eligiendo_cantidad', itemPendienteId: item.id }),
                intent: 'agregar_producto',
                crear: false,
            };
        }
        // ── Elegir la cantidad del item fijado ────────────────────────────────
        case 'eligiendo_cantidad': {
            const item = catalogo.find((i) => i.id === b.itemPendienteId);
            if (!item) {
                return {
                    accion: 'seguir',
                    texto: redactarCatalogo(catalogo, f),
                    borrador: paso(b, { paso: 'eligiendo_items', itemPendienteId: null }),
                    crear: false,
                };
            }
            const cantidad = cantidadDe(texto);
            if (cantidad === null) {
                const pareceCambioDeItem = /\b(mejor|tambien|también|quiero|quisiera|agrega|añade|anade|otro|otra)\b/.test(normalizarTexto(texto));
                const otro = pareceCambioDeItem ? resolverItem(texto, catalogo) : null;
                if (otro && otro.id !== item.id) {
                    return {
                        accion: 'seguir',
                        texto: redactarPaso(f.pedirCantidad, 'eligiendo_cantidad', f, { item: otro.nombre }),
                        borrador: paso(b, { paso: 'eligiendo_cantidad', itemPendienteId: otro.id }),
                        intent: 'agregar_producto',
                        crear: false,
                    };
                }
                return {
                    accion: 'seguir',
                    texto: rellenar(f.cantidadInvalida, { item: item.nombre }),
                    borrador: b,
                    crear: false,
                };
            }
            const lineas = agregarLinea(b.lineas, item, cantidad);
            return {
                accion: 'seguir',
                texto: siguientePregunta(paso(b, { lineas, itemPendienteId: null }), f),
                borrador: paso(b, {
                    lineas,
                    itemPendienteId: null,
                    paso: 'eligiendo_modalidad',
                }),
                intent: 'agregar_producto',
                crear: false,
            };
        }
        // ── Elegir la modalidad ───────────────────────────────────────────────
        case 'eligiendo_modalidad': {
            const modalidad = modalidadDe(texto);
            if (!modalidad) {
                const pareceCambioDeItem = /\b(mejor|tambien|también|quiero|quisiera|agrega|añade|anade|otro|otra|falta)\b/.test(normalizarTexto(texto));
                const item = pareceCambioDeItem ? resolverItem(texto, catalogo) : null;
                if (item) {
                    const cant = cantidadDe(texto) || 1;
                    const lineas = agregarLinea(b.lineas, item, cant);
                    return {
                        accion: 'seguir',
                        texto: redactarPaso(f.pedirModalidad, 'eligiendo_modalidad', f, { opciones: 'domicilio o retiro' }),
                        borrador: paso(b, { lineas, itemPendienteId: null, paso: 'eligiendo_modalidad' }),
                        intent: 'agregar_producto',
                        crear: false,
                    };
                }
                return {
                    accion: 'seguir',
                    texto: redactarPaso(f.pedirModalidad, 'eligiendo_modalidad', f, { opciones: 'domicilio o retiro' }),
                    borrador: b,
                    crear: false,
                };
            }
            if (modalidad === 'domicilio') {
                return {
                    accion: 'seguir',
                    texto: f.pedirDireccion,
                    borrador: paso(b, { modalidad, paso: 'eligiendo_direccion' }),
                    intent: 'solicitar_entrega',
                    crear: false,
                };
            }
            const listo = paso(b, { modalidad, direccion: null });
            return {
                accion: 'seguir',
                texto: redactarPaso(f.resumenPedido, 'confirmando', f, valoresDeResumen(listo)),
                borrador: paso(listo, { paso: 'confirmando' }),
                intent: 'solicitar_entrega',
                crear: false,
            };
        }
        // ── Elegir la dirección ───────────────────────────────────────────────
        case 'eligiendo_direccion': {
            const limpia = texto.trim();
            if (limpia.length < 5) {
                return {
                    accion: 'seguir',
                    texto: redactarPaso(f.pedirDireccion, 'eligiendo_direccion', f),
                    borrador: b,
                    crear: false,
                };
            }
            const listo = paso(b, { direccion: limpia });
            return {
                accion: 'seguir',
                texto: redactarPaso(f.resumenPedido, 'confirmando', f, valoresDeResumen(listo)),
                borrador: paso(listo, { paso: 'confirmando' }),
                intent: 'solicitar_entrega',
                crear: false,
            };
        }
        // ── Confirmar ─────────────────────────────────────────────────────────
        case 'confirmando': {
            if (esAfirmacion(texto) || normalizarTexto(texto).includes('confirmar')) {
                return confirmarBorrador(b, {
                    catalogo, frases: f, pedidoActivoNumero: input.pedidoActivoNumero,
                });
            }
            return {
                accion: 'seguir',
                texto: redactarPaso(f.resumenPedido, 'confirmando', f, valoresDeResumen(b)),
                borrador: b,
                crear: false,
            };
        }
        default:
            // Paso desconocido: puede ser una fila escrita por una versión anterior
            // del bot. Se ignora el borrador y se decide desde cero.
            return null;
    }
}
/** Negación, para la respuesta a la confirmación. */
function esNegacion(texto) {
    const t = sinPuntuacion(texto);
    if (!t)
        return false;
    return ['no', 'nop', 'nel', 'nunca'].some((p) => t === p || t.split(' ').includes(p));
}
/**
 * La pregunta que toca tras añadir una línea.
 *
 * Hoy es siempre la modalidad, y el parámetro existe para que añadir un paso
 * (variante de talla, nota de preparación) no obligue a tocar la llamada.
 */
function siguientePregunta(_borrador, f) {
    return redactarPaso(f.pedirModalidad, 'eligiendo_modalidad', f, { opciones: 'domicilio o retiro' });
}

/**
 * Decide qué hacer con el texto del cliente.
 *
 * ── PRINCIPIO DE DISEÑO: el menú es la interfaz, no el diccionario ────────
 *
 * Antes esto era un clasificador: ~60 palabras clave repartidas en tres listas
 * (`PALABRAS_PEDIDO`, `PALABRAS_COMPRA`, `PALABRAS_HUMANO`) y, al final, un
 * «no te entendí». Cada mensaje que no contenía ninguna de esas palabras
 * acababa ahí, y el cliente leía que el bot no lo entendía — con el bot
 * entendiendo perfectamente que le estaban escribiendo.
 *
 * Medido con el arnés de lenguaje natural: «q tienen?», «que me recomiendas»
 * y «me antoje una hamburguesa» caían las tres en `no_entendido`. Las tres son
 * peticiones clarísimas. El diccionario no las tenía y esa era toda la razón.
 *
 * Se pueden añadir tres palabras y mañana fallarán otras tres. La lista no
 * tiene fondo: el lenguaje de un cliente no es enumerable.
 *
 * Lo que sí es finito son las ACCIONES del bot. Así que el orden se invierte:
 *
 *   1. **El bot ya mostró un menú → el cliente elige un número.** Nada que
 *      interpretar. Un número no tiene sinónimos, ni erratas, ni tildes, ni
 *      regionalismos. Es la única entrada del sistema que no puede fallar.
 *   2. **Señales inequívocas** que no compiten con el menú: pedir una persona,
 *      que es una petición explícita y se respeta siempre.
 *   3. **Un dato que el bot sabe usar**: si el cliente nombró un producto del
 *      catálogo, ya dijo qué quiere. No hay intención que clasificar.
 *   4. **Todo lo demás** —incluido el texto que ningún diccionario reconocería—
 *      recibe EL MENÚ, no un «no te entendí». El cliente ve las opciones y
 *      pulsa una. Se le da salida en vez de devolverle el problema.
 *
 * La diferencia práctica: antes, un mensaje inesperado terminaba en «no te
 * entendí» y el cliente tenía que adivinar qué escribir. Ahora termina en la
 * lista de lo que el bot sí sabe hacer, y basta con un dígito.
 *
 * El texto libre se conserva donde de verdad hace falta y no se puede sustituir
 * por un menú: la DIRECCIÓN de entrega, que es un dato abierto.
 */
export function decidir(input) {
    const { texto, pedidos, plantillas, perfil, catalogo } = input;
    const f = frasesDe(input.frases);
    const items = catalogo ?? [];
    // ── El estado del contexto, calculado UNA vez ────────────────────────────
    //
    // El menú se compone con esto, así que tiene que estar antes de cualquier
    // salida que devuelva un menú. Se calcula aquí y no dentro de cada rama
    // para que las tres ramas que ofrecen lista ofrezcan EXACTAMENTE la misma.
    const activos = pedidos.filter((p) => !ESTADOS_CERRADOS.has(p.estado));
    const contexto = {
        hayCatalogo: items.length > 0,
        hayPedidoEnCurso: activos.length > 0,
        enCiclo: Boolean(input.enCurso),
    };
    // El número de la opción que el cliente escribió, leído contra la MISMA
    // lista que el bot le mostró en su último turno. Es lo que permite que un
    // «2» suelto signifique algo: fuera de un ciclo, antes era `no_entendido`.
    const opcion = resolverOpcion(texto ?? '', opcionesDe(contexto), f);
    // `carta` y `agregar_otro` abren catálogo: si no hay catálogo cargado, el
    // bot no puede cumplirlas y no se ofrecen (ver `opcionesDe`). La guarda
    // cubre el caso de una lista vieja ya enviada.
    if (opcion === 'carta' && items.length > 0) {
        const borradorActual = input.enCurso && input.enCurso.lineas?.length > 0 ? input.enCurso : borradorNuevo();
        return {
            accion: 'tomarPedido',
            texto: redactarCatalogo(items, f),
            borrador: borradorActual,
            intent: 'ver_catalogo',
            estadoFlujo: borradorActual.lineas?.length > 0 ? 'CARRITO_EN_CONSTRUCCION' : 'CATALOGO_ACTIVO',
            catalogoMostrado: true,
        };
    }
    if (opcion === 'pedir' && items.length > 0) {
        const t = (texto || '').toLowerCase();
        const quiereNuevoExplicitamente = t.includes('nuevo') || t.includes('otro') || t.includes('otra cosa');
        const activo = activos[0];
        if (activo && !quiereNuevoExplicitamente) {
            return {
                accion: 'saludar',
                motivo: 'ya_tiene_pedido',
                texto: rellenar(f.yaTienesPedido, {
                    numero: activo.numero,
                    menu: componerMenu(opcionesDe({ ...contexto, hayCatalogo: true }), f),
                }),
                borrador: input.enCurso ?? null,
                intent: 'consultar_pedido_existente',
                estadoFlujo: input.enCurso?.lineas?.length > 0 ? 'CARRITO_EN_CONSTRUCCION' : 'IDLE',
                catalogoMostrado: Boolean(input.catalogoMostrado),
            };
        }
        const borradorActual = input.enCurso && input.enCurso.lineas?.length > 0 ? input.enCurso : borradorNuevo();
        return {
            accion: 'tomarPedido',
            texto: redactarCatalogo(items, f),
            borrador: borradorActual,
            intent: 'iniciar_nuevo_pedido',
            estadoFlujo: borradorActual.lineas?.length > 0 ? 'CARRITO_EN_CONSTRUCCION' : 'CATALOGO_ACTIVO',
            catalogoMostrado: true,
        };
    }
    if (opcion === 'ver_pedido') {
        if (activos.length === 1) {
            const p = activos[0];
            return {
                accion: 'responder',
                texto: redactarRespuestaDePedido(p, plantillas, perfil),
                pedidoId: p.id,
                borrador: input.enCurso ?? null,
                intent: 'consultar_pedido_existente',
                estadoFlujo: input.enCurso?.lineas?.length > 0 ? 'CARRITO_EN_CONSTRUCCION' : 'IDLE',
                catalogoMostrado: Boolean(input.catalogoMostrado),
            };
        }
        if (activos.length > 1) {
            const numeros = activos.map((p) => p.numero);
            return {
                accion: 'pedirNumero',
                numeros,
                texto: `Tienes ${activos.length} pedidos en curso: ${numeros.join(', ')}. ¿De cuál quieres saber el estado?`,
                borrador: input.enCurso ?? null,
                intent: 'consultar_pedido_existente',
                estadoFlujo: input.enCurso?.lineas?.length > 0 ? 'CARRITO_EN_CONSTRUCCION' : 'IDLE',
                catalogoMostrado: Boolean(input.catalogoMostrado),
            };
        }
        return {
            accion: 'saludar',
            motivo: 'sin_pedido_activo',
            texto: redactarMenu({ ...contexto, plantilla: 'sinPedido' }, f),
            borrador: input.enCurso ?? null,
            intent: 'consultar_pedido_existente',
            estadoFlujo: input.enCurso?.lineas?.length > 0 ? 'CARRITO_EN_CONSTRUCCION' : 'IDLE',
            catalogoMostrado: Boolean(input.catalogoMostrado),
        };
    }
    // `asesor` por número o palabra explícita
    if (opcion === 'asesor' || pideHumano(texto ?? '')) {
        return {
            accion: 'handoff',
            motivo: 'pide_asesor',
            evento: 'handoff_solicitado',
            texto: f.pideAsesor,
            borrador: null,
            intent: 'pedir_asesor',
            estadoFlujo: 'IDLE',
            catalogoMostrado: Boolean(input.catalogoMostrado),
        };
    }
    if (!texto || texto.trim().length === 0) {
        return {
            accion: 'saludar',
            motivo: 'sin_texto',
            texto: redactarMenu({ ...contexto, plantilla: 'sinTexto' }, f),
            borrador: input.enCurso ?? null,
            intent: 'sin_texto',
            estadoFlujo: input.enCurso?.lineas?.length > 0 ? 'CARRITO_EN_CONSTRUCCION' : 'IDLE',
            catalogoMostrado: Boolean(input.catalogoMostrado),
        };
    }
    // ── ¿Hay un pedido a medias? Él manda sobre todo lo demás ───────────────
    if (input.enCurso) {
        const enCiclo = decidirEnCiclo({
            texto,
            borrador: input.enCurso,
            catalogo: items,
            frases: f,
            pedidoActivoNumero: pedidos.find((p) => !ESTADOS_CERRADOS.has(p.estado))?.numero ?? null,
        });
        if (enCiclo) {
            if (enCiclo.accion === 'descartar') {
                return {
                    accion: 'handoff',
                    motivo: 'ciclo_cancelado',
                    evento: 'handoff_solicitado',
                    texto: enCiclo.texto,
                    borrador: null,
                    intent: enCiclo.intent || 'cancelar_borrador',
                    estadoFlujo: 'IDLE',
                    catalogoMostrado: Boolean(input.catalogoMostrado),
                };
            }
            if (enCiclo.accion === 'crear') {
                return {
                    accion: 'crearPedido',
                    texto: enCiclo.texto,
                    borrador: enCiclo.borrador,
                    intent: 'confirmar_pedido',
                    estadoFlujo: 'CONFIRMANDO_PEDIDO',
                    catalogoMostrado: Boolean(input.catalogoMostrado),
                };
            }
            if (enCiclo.accion === 'nuevo_pedido') {
                return {
                    accion: 'tomarPedido',
                    motivo: 'nuevo_pedido',
                    texto: enCiclo.texto,
                    borrador: enCiclo.borrador,
                    intent: 'iniciar_nuevo_pedido',
                    estadoFlujo: 'CATALOGO_ACTIVO',
                    catalogoMostrado: true,
                };
            }
            let flujo = 'CARRITO_EN_CONSTRUCCION';
            if (enCiclo.borrador.paso === 'confirmando')
                flujo = 'CONFIRMANDO_PEDIDO';
            else if (enCiclo.borrador.paso === 'eligiendo_direccion' || enCiclo.intent === 'solicitar_entrega')
                flujo = 'SOLICITANDO_ENTREGA';
            return {
                accion: 'tomarPedido',
                texto: enCiclo.texto,
                borrador: enCiclo.borrador,
                intent: enCiclo.intent || 'agregar_producto',
                estadoFlujo: flujo,
                catalogoMostrado: Boolean(input.catalogoMostrado),
            };
        }
    }
    // ── Consultas intermedias (domicilio, horarios, etc.) conservando carrito ─
    if (esPreguntaIntermedia(texto)) {
        let textoResp = 'Con gusto te informo: ';
        const tN = normalizarTexto(texto || '');
        if (/(?:domicilio|envio|flete|entrega)/.test(tN)) {
            textoResp = 'Hacemos envíos a domicilio. La tarifa estándar de envío es de $5.000.';
        }
        else if (/(?:horario|abren|cierran|atencion)/.test(tN)) {
            textoResp = 'Nuestro horario de atención es de lunes a domingo de 11:00 AM a 10:00 PM.';
        }
        else if (/(?:donde|ubicacion|sede)/.test(tN)) {
            textoResp = 'Estamos ubicados en nuestra sede principal y despachamos pedidos a domicilio en toda el área de cobertura.';
        }
        else if (/(?:pago|nequi|tarjeta|transferencia)/.test(tN)) {
            textoResp = 'Aceptamos pagos en efectivo, transferencias por Nequi o Daviplata, y tarjetas de débito/crédito con nuestro link de pago seguro.';
        }
        else {
            textoResp = 'Para nosotros es un gusto atenderte. ¿En qué más te podemos colaborar con tu pedido?';
        }
        if (input.enCurso && input.enCurso.lineas?.length > 0) {
            const resumen = input.enCurso.lineas.map((l) => `${l.cantidad}x ${l.nombre}`).join(', ');
            textoResp += `\n\n*(Por cierto, en tu carrito tienes: ${resumen}. ¿Deseas continuar con tu pedido?)*`;
        }
        return {
            accion: 'responder',
            motivo: 'consulta_intermedia',
            intent: 'consulta_intermedia',
            texto: textoResp,
            borrador: input.enCurso ?? null,
            estadoFlujo: input.enCurso?.lineas?.length > 0 ? 'CARRITO_EN_CONSTRUCCION' : (input.catalogoMostrado ? 'CATALOGO_ACTIVO' : 'IDLE'),
            catalogoMostrado: Boolean(input.catalogoMostrado),
        };
    }
    // ── Saludo o capacidades ────────────────────────────────────────────────
    if (esSoloSaludo(texto)) {
        return {
            accion: 'saludar',
            motivo: 'saludo',
            intent: 'saludo',
            texto: redactarMenu({ ...contexto, plantilla: 'presentacion' }, f),
            borrador: input.enCurso ?? null,
            estadoFlujo: input.enCurso?.lineas?.length > 0 ? 'CARRITO_EN_CONSTRUCCION' : (input.catalogoMostrado ? 'CATALOGO_ACTIVO' : 'IDLE'),
            catalogoMostrado: Boolean(input.catalogoMostrado),
        };
    }
    if (preguntaCapacidades(texto)) {
        return {
            accion: 'saludar',
            motivo: 'capacidades',
            intent: 'capacidades',
            texto: redactarMenu({ ...contexto, plantilla: 'presentacion' }, f),
            borrador: input.enCurso ?? null,
            estadoFlujo: input.enCurso?.lineas?.length > 0 ? 'CARRITO_EN_CONSTRUCCION' : (input.catalogoMostrado ? 'CATALOGO_ACTIVO' : 'IDLE'),
            catalogoMostrado: Boolean(input.catalogoMostrado),
        };
    }
    // ── Abrir el ciclo: el cliente quiere comprar y hay catálogo ────────────
    if (items.length > 0 && quiereComprar(texto)) {
        const borrador = input.enCurso && input.enCurso.lineas?.length > 0 ? input.enCurso : borradorNuevo();
        return {
            accion: 'tomarPedido',
            texto: redactarCatalogo(items, f),
            borrador,
            intent: 'ver_catalogo',
            estadoFlujo: borrador.lineas?.length > 0 ? 'CARRITO_EN_CONSTRUCCION' : 'CATALOGO_ACTIVO',
            catalogoMostrado: true,
        };
    }
    // ── ¿Nombró un plato? ───────────────────────────────────────────────────
    if (items.length > 0) {
        const nombrado = resolverItem(texto, items);
        if (nombrado) {
            const borradorBase = input.enCurso ?? borradorNuevo();
            return {
                accion: 'tomarPedido',
                texto: redactarPaso(f.pedirCantidad, 'eligiendo_cantidad', f, { item: nombrado.nombre }),
                borrador: paso(borradorBase, {
                    paso: 'eligiendo_cantidad',
                    itemPendienteId: nombrado.id,
                }),
                intent: 'agregar_producto',
                estadoFlujo: 'CARRITO_EN_CONSTRUCCION',
                catalogoMostrado: true,
            };
        }
    }
    if (esConsultaDePedido(texto)) {
        if (activos.length === 1) {
            const p = activos[0];
            return {
                accion: 'responder',
                texto: redactarRespuestaDePedido(p, plantillas, perfil),
                pedidoId: p.id,
                borrador: input.enCurso ?? null,
                intent: 'consultar_pedido_existente',
                estadoFlujo: input.enCurso?.lineas?.length > 0 ? 'CARRITO_EN_CONSTRUCCION' : (input.catalogoMostrado ? 'CATALOGO_ACTIVO' : 'IDLE'),
                catalogoMostrado: Boolean(input.catalogoMostrado),
            };
        }
        if (activos.length > 1) {
            const numeros = activos.map((p) => p.numero);
            return {
                accion: 'pedirNumero',
                numeros,
                texto: `Tienes ${activos.length} pedidos en curso: ${numeros.join(', ')}. ¿De cuál quieres saber el estado?`,
                borrador: input.enCurso ?? null,
                intent: 'consultar_pedido_existente',
                estadoFlujo: input.enCurso?.lineas?.length > 0 ? 'CARRITO_EN_CONSTRUCCION' : (input.catalogoMostrado ? 'CATALOGO_ACTIVO' : 'IDLE'),
                catalogoMostrado: Boolean(input.catalogoMostrado),
            };
        }
        return {
            accion: 'saludar',
            motivo: 'sin_pedido_activo',
            texto: redactarMenu({ ...contexto, plantilla: 'sinPedido' }, f),
            borrador: input.enCurso ?? null,
            intent: 'consultar_pedido_existente',
            estadoFlujo: input.enCurso?.lineas?.length > 0 ? 'CARRITO_EN_CONSTRUCCION' : (input.catalogoMostrado ? 'CATALOGO_ACTIVO' : 'IDLE'),
            catalogoMostrado: Boolean(input.catalogoMostrado),
        };
    }
    return {
        accion: 'saludar',
        motivo: 'menu_general',
        intent: 'no_entendido',
        texto: redactarMenu({ ...contexto, plantilla: 'noEntendido' }, f),
        borrador: input.enCurso ?? null,
        estadoFlujo: input.enCurso?.lineas?.length > 0 ? 'CARRITO_EN_CONSTRUCCION' : 'IDLE',
        catalogoMostrado: Boolean(input.catalogoMostrado),
    };
}
/**
 * Guarda contra el bucle: el bot NO responde a sus propios mensajes.
 *
 * Cuando el bot envía, Zernio devuelve ese mensaje con `direction: "outgoing"`
 * y `sentVia: "api"`. El receptor ya los descarta con `no_entrante`, pero esta
 * comprobación es una segunda red a propósito: un bot que se responde a sí mismo
 * genera un bucle de mensajes reales al cliente y factura de WhatsApp. Vale
 * tenerla duplicada.
 */
export function esMensajePropio(direccion, sentVia) {
    if (direccion === 'outgoing')
        return true;
    // `sentVia: 'api'` es el propio bot/API; `human` es un operador escribiendo
    // desde la bandeja — ese tampoco debe provocar respuesta del bot.
    return sentVia === 'api' || sentVia === 'human';
}
//# sourceMappingURL=BotPedidos.js.map