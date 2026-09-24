/**
 * BOT PARSER - Capa de Procesamiento y Reconocimiento de Intenciones & Entidades
 * 
 * Funciones puras de NLP heurístico y normalización.
 * No depende de base de datos ni de estado.
 */

/** Minúsculas y sin diacríticos. */
export function normalizarTexto(texto) {
    if (!texto) return '';
    return texto
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
}

/** Minúsculas, sin diacríticos, sin puntuación, espacios colapsados. */
export function sinPuntuacion(texto) {
    if (!texto) return '';
    return normalizarTexto(texto)
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

const PALABRAS_HUMANO = [
    'asesor', 'humano', 'persona', 'agente', 'hablar con alguien', 'operador', 'queja', 'reclamo',
];

const PALABRAS_CANCELAR = [
    'cancelar', 'cancela', 'olvidalo', 'dejalo', 'dejemos', 'salir', 'atras',
];

const PALABRAS_SI = [
    'si', 'sip', 'claro', 'confirmo', 'confirmar', 'dale', 'listo', 'ok', 'okey', 'vale', 'correcto', 'asi es', 'de acuerdo',
];

const PALABRAS_CARTA = [
    'carta', 'catalogo', 'catálogo', 'menu', 'menú', 'productos', 'opciones', 'que tienen',
];

const MODALIDADES = {
    domicilio: ['domicilio', 'envio', 'envío', 'llevar', 'traer', 'delivery', 'a la casa', 'a mi casa', 'reparto'],
    retiro: ['retiro', 'retirar', 'recoger', 'recojo', 'paso', 'voy', 'local', 'tienda', 'mostrador'],
    mesa: ['en sitio', 'mesa', 'aqui', 'aquí', 'comer alli', 'comer allí', 'en el local'],
};

const PALABRAS_CAPACIDADES = [
    'que puedes hacer', 'que puede hacer', 'que sabes hacer', 'que hace', 'para que sirves',
    'para que sirve', 'en que me puedes ayudar', 'en que puedes ayudar', 'que ofreces',
    'que servicios', 'ayuda', 'opciones', 'comandos',
];

const PIEZAS_DE_SALUDO = new Set([
    'hola', 'holaa', 'holas', 'buenas', 'buenos', 'buen', 'buena', 'dia', 'dias', 'tarde',
    'tardes', 'noche', 'noches', 'saludos', 'que', 'q', 'tal', 'senor', 'senora', 'don', 'dona',
    'parce', 'parcero', 'amigo',
]);

const RUIDO_DE_SALUDO = new Set(['muy', 'y', 'o', 'el', 'la', 'los', 'las', 'de', 'del', 'a']);

/** ¿El cliente pidió explícitamente hablar con una persona? */
export function pideHumano(texto) {
    const t = normalizarTexto(texto);
    if (!t) return false;
    return PALABRAS_HUMANO.some((p) => t.includes(normalizarTexto(p)));
}

/** ¿El texto pide cancelar el borrador actual? */
export function esCancelar(texto) {
    const t = sinPuntuacion(texto);
    if (!t) return false;
    return PALABRAS_CANCELAR.some((p) => t === p || t.endsWith(` ${p}`) || t.startsWith(`${p} `));
}

/** ¿El texto es una afirmación para confirmar? */
export function esAfirmacion(texto) {
    const t = sinPuntuacion(texto);
    if (!t) return false;
    return PALABRAS_SI.some((p) => t === p || t.split(' ').includes(p));
}

/** ¿El cliente quiere volver a ver el catálogo? */
export function pideCarta(texto) {
    const t = sinPuntuacion(texto);
    if (!t) return false;
    return PALABRAS_CARTA.some((p) => t === p || t.includes(p));
}

/** ¿El cliente está intentando comprar o ver el catálogo? */
export function quiereComprar(texto) {
    const t = normalizarTexto(texto);
    if (!t) return false;
    return /\b(comprar|compra|catalogo|catálogo|carta|menu|menú|precio|precios|producto|productos|disponible|pedir|quisiera|queria|quería|tienen|tiene|hay|recomienda|recomiendas|recomendacion|recomendación|recomiendame|recomiéndame|sugerencia|sugerencias|sugiere|antoja|antoje|antojé|antojos|vender|venden|ofrecen|almuerzo|comida)\b/i.test(t);
}

/** ¿Pregunta qué capacidades tiene el bot? */
export function preguntaCapacidades(texto) {
    const t = normalizarTexto(texto);
    if (!t) return false;
    return PALABRAS_CAPACIDADES.some((p) => t.includes(normalizarTexto(p)));
}

/** ¿Es el mensaje un saludo y nada más? */
export function esSoloSaludo(texto) {
    const t = sinPuntuacion(texto);
    if (!t) return false;
    const palabras = t.split(' ').filter(Boolean);
    if (palabras.length === 0 || palabras.length > 5) return false;
    let utiles = 0;
    for (const p of palabras) {
        if (RUIDO_DE_SALUDO.has(p)) continue;
        if (!PIEZAS_DE_SALUDO.has(p)) return false;
        utiles++;
    }
    return utiles > 0;
}

/** ¿Parece una consulta sobre un pedido? */
export function esConsultaDePedido(texto) {
    const t = normalizarTexto(texto);
    if (!t) return false;
    if (/\b(hacer|nuevo|otro|crear|iniciar|comprar|cancelar)\s+(?:un\s+)?pedido\b/.test(t))
        return false;
    if (/\b(donde esta|dónde está|como va|cómo va|cuando llega|cuándo llega|estado|rastrear|seguimiento|pedido anterior|pedidos activos|que pedi|qué pedí)\b/.test(t))
        return true;
    if (t === '1' || t === 'ver pedido' || t === 'como va mi pedido' || t === 'estado de pedido')
        return true;
    return false;
}

/** Reconoce si es una consulta intermedia o informativa (costo envío, horarios, etc.) */
export function esPreguntaIntermedia(texto) {
    if (!texto) return false;
    const t = normalizarTexto(texto);
    if (/(?:cuanto cuesta|precio|costo|tarifa|valor)\s+(?:el\s+)?(?:envio|domicilio|entrega|flete)/.test(t))
        return true;
    if (/(?:hacen|tienen|hay)\s+(?:domicilios?|envios?)/.test(t))
        return true;
    if (/(?:horario|horarios|a que hora|que dias|abren|cierran|atencion)/.test(t))
        return true;
    if (/(?:donde estan|donde queda|ubicacion|direccion del local|sede fisica)/.test(t))
        return true;
    if (/(?:como pago|metodos de pago|medios de pago|aceptan tarjeta|nequi|daviplata|transferencia)/.test(t))
        return true;
    if (/(?:que trae|que contiene|ingredientes|de que es)/.test(t))
        return true;
    return false;
}

/** Reconoce la modalidad de entrega (domicilio, retiro, mesa). */
export function modalidadDe(texto) {
    const t = sinPuntuacion(texto);
    if (!t) return null;
    for (const [modalidad, palabras] of Object.entries(MODALIDADES)) {
        if (palabras.some((p) => t.includes(normalizarTexto(p))))
            return modalidad;
    }
    return null;
}

/** Lee una cantidad escrita por el cliente (dígitos o palabras 'dos', 'tres', etc.). */
export function cantidadDe(texto) {
    const t = sinPuntuacion(texto);
    if (!t) return null;
    const crudo = normalizarTexto(texto);
    if (/-\s*\d/.test(crudo)) return null;
    const PALABRAS = {
        un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6,
        siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12,
    };
    const m = t.match(/\b(\d+)\b/);
    if (m) {
        const n = Number(m[1]);
        return Number.isInteger(n) && n > 0 && n <= 999 ? n : null;
    }
    const palabra = t.split(' ').find((p) => PALABRAS[p] !== undefined);
    return palabra ? PALABRAS[palabra] : null;
}

/** Encuentra el ítem del catálogo al que se refiere el cliente (por índice o nombre). */
export function resolverItem(texto, catalogo) {
    if (!catalogo || catalogo.length === 0) return null;
    const soloNumero = texto.trim().match(/^(?:(?:el|la|los|las)\s+)?(\d{1,3})$/);
    if (soloNumero) {
        const idx = Number(soloNumero[1]) - 1;
        return catalogo[idx] ?? null;
    }
    const t = sinPuntuacion(texto);
    if (!t) return null;
    const exacto = catalogo.find((i) => t.includes(sinPuntuacion(i.nombre)));
    if (exacto) return exacto;
    const palabras = t.split(' ').filter((p) => p.length >= 4);
    const porPalabra = catalogo.filter((i) => {
        const propias = sinPuntuacion(i.nombre).split(' ').filter((p) => p.length >= 4);
        return propias.some((p) => palabras.includes(p));
    });
    return porPalabra.length === 1 ? porPalabra[0] : null;
}

/** Traduce el número o texto a una opción del menú contextual. */
export function resolverOpcion(texto, opciones, frases) {
    if (!opciones || opciones.length === 0) return null;
    const t = sinPuntuacion(texto);
    if (!t) return null;
    const soloNumero = texto.trim().match(/^(\d{1,2})$/);
    if (soloNumero) {
        const idx = Number(soloNumero[1]) - 1;
        return opciones[idx] ?? null;
    }
    const conNumero = t.match(/^(?:opcion\s+|(?:el|la|los|las)\s+)?(\d{1,2})(?:\s+(?:por favor|gracias|si|ok))?$/);
    if (conNumero) {
        const idx = Number(conNumero[1]) - 1;
        return opciones[idx] ?? null;
    }
    const f = frases ?? {};
    const TEXTO_DE = {
        ver_pedido: f.opcionVerPedido ?? 'Cómo va mi pedido',
        pedir: f.opcionPedir ?? 'Hacer un pedido',
        carta: f.opcionCarta ?? 'Ver los productos',
        asesor: f.opcionAsesor ?? 'Hablar con una persona',
        confirmar: f.opcionConfirmar ?? 'Sí, confirmo el pedido',
        cancelar: f.opcionCancelar ?? 'No, cancelar',
        domicilio: f.opcionDomicilio ?? 'A domicilio',
        retiro: f.opcionRetiro ?? 'Para recoger en el local',
        agregar_otro: f.opcionAgregarOtro ?? 'Agregar otro producto',
    };
    const candidatas = opciones.filter((o) => typeof TEXTO_DE[o] === 'string' && TEXTO_DE[o].length > 0);
    const porTexto = candidatas.filter((o) => {
        const etiqueta = sinPuntuacion(TEXTO_DE[o]);
        return etiqueta.length >= 4 && (t.includes(etiqueta) || etiqueta.includes(t));
    });
    return porTexto.length === 1 ? porTexto[0] : null;
}

/**
 * PARSER UNIFICADO
 * Analiza el mensaje entrante y produce una estructura tipada de intención y entidades.
 */
export function parsearMensaje(texto, { catalogo = [], opciones = [], frases = null } = {}) {
    const limpio = sinPuntuacion(texto);
    const norm = normalizarTexto(texto);
    const opcion = resolverOpcion(texto, opciones, frases);
    const item = resolverItem(texto, catalogo);
    const cantidad = cantidadDe(texto);
    const modalidad = modalidadDe(texto);

    let intent = 'desconocido';

    if (pideHumano(texto) || opcion === 'asesor') {
        intent = 'pedir_asesor';
    } else if (esCancelar(texto) || opcion === 'cancelar') {
        intent = 'cancelar_borrador';
    } else if (esAfirmacion(texto) || opcion === 'confirmar' || norm.includes('confirmar')) {
        intent = 'confirmar_pedido';
    } else if (/\b(nuevo pedido|otro pedido|empezar de nuevo|comenzar de nuevo|borrar todo)\b/.test(norm)) {
        intent = 'iniciar_nuevo_pedido';
    } else if (esPreguntaIntermedia(texto)) {
        intent = 'consulta_intermedia';
    } else if (esConsultaDePedido(texto) || opcion === 'ver_pedido') {
        intent = 'consultar_pedido_existente';
    } else if (opcion === 'carta' || opcion === 'pedir' || pideCarta(texto) || quiereComprar(texto)) {
        intent = 'ver_catalogo';
    } else if (modalidad !== null || opcion === 'domicilio' || opcion === 'retiro') {
        intent = 'solicitar_entrega';
    } else if (item !== null) {
        intent = 'agregar_producto';
    } else if (esSoloSaludo(texto)) {
        intent = 'saludo';
    } else if (preguntaCapacidades(texto)) {
        intent = 'capacidades';
    }

    return {
        textoOriginal: texto,
        textoLimpio: limpio,
        intent,
        entidades: {
            item,
            cantidad,
            modalidad: modalidad ?? (opcion === 'domicilio' ? 'domicilio' : opcion === 'retiro' ? 'retiro' : null),
            opcion,
        }
    };
}
