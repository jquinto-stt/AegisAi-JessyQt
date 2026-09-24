/** Un pedido tal como lo necesita el bot. Subconjunto de `necto.pedido`. */
export interface PedidoParaBot {
    id: string;
    numero: string;
    cliente: string;
    estado: string;
    modalidad: string;
    /** ISO. Cuándo entró en el estado actual. */
    estadoDesde: string;
    /** ISO, solo si `estado = 'programado'`. */
    programadoPara: string | null;
    /** Minutos estimados de preparación, si la organización lo configuró. */
    minutosEstimados: number | null;
}
/**
 * Un item del catálogo de venta del dueño.
 *
 * Es el espejo del `CatalogoItem` del frontend (`stores/pedidos.store.ts`) y de
 * la columna `config_pedidos.catalogo`: `{id, nombre, precio, variantes?}`.
 *
 * **No es `Articulo`.** `Articulo` (Inventario) responde a «¿qué tengo, dónde y
 * cuánto me costó?»; esto responde a «¿qué vendo y a cuánto?». Son dos
 * preguntas distintas, el frontend las modela por separado a propósito y el
 * bot respeta esa separación: no lee `necto.articulo`.
 */
export interface CatalogoItemBot {
    id: string;
    nombre: string;
    precio: number;
    /** Tallas / variantes elegibles. Solo los perfiles que declaran `variants`. */
    variantesDisponibles?: string[];
}
/** Una línea del borrador: un item del catálogo con su cantidad. */
export interface LineaBorrador {
    /** `CatalogoItemBot.id`. */
    itemId: string;
    /** Copia del nombre en el momento de elegir, para no recalcular el resumen. */
    nombre: string;
    /** Precio unitario congelado al elegir. Es lo que se escribe en el pedido. */
    precioUnitario: number;
    cantidad: number;
}
/**
 * El paso del ciclo de toma de pedido en que va la conversación.
 *
 * Es un `string` y no un enum cerrado a propósito: vive en un `jsonb` y una
 * versión futura del bot puede añadir un paso. `decidir` trata cualquier valor
 * desconocido como «no hay pedido en curso» — el lado seguro, porque el peor
 * resultado de un paso corrupto es empezar de nuevo, no crear basura.
 */
export type PasoPedido = 'eligiendo_items' | 'eligiendo_cantidad' | 'eligiendo_modalidad' | 'eligiendo_direccion' | 'confirmando';
/**
 * El borrador de pedido que el bot lleva entre mensajes.
 *
 * ── Por qué viaja en la conversación y no en una tabla ────────────────────
 *
 * Un pedido a medias NO es un pedido: es un estado de conversación. Meterlo en
 * `necto.pedido` con un estado tipo `borrador` llenaría el tablero del operador
 * de filas que nadie pidió, y habría que limpiarlas por tiempo — un barrido que
 * puede borrar un pedido real a medio escribir. Guardarlo en la conversación
 * significa que caduca con ella y que nadie de operaciones lo ve hasta que el
 * cliente confirma.
 */
export interface PedidoEnCurso {
    paso: PasoPedido;
    lineas: LineaBorrador[];
    /** Item elegido, esperando cantidad. */
    itemPendienteId: string | null;
    modalidad: string | null;
    direccion: string | null;
    /** Lo que la conversación intentaba hacer. Hoy: `'tomar_pedido'`. */
    intento: string;
}
/**
 * Plantillas de mensaje por estado. Mismos campos que
 * `BusinessProfile.defaultPlantillas` del frontend y que
 * `config_pedidos.plantillas_whatsapp` en la base — tres sitios, un solo
 * vocabulario, para que el bot diga lo mismo que la UI muestra.
 */
export interface PlantillasPedido {
    recibido: string;
    confirmado: string;
    enPreparacion: string;
    listo: string;
    enCamino: string;
    entregado: string;
    cancelado: string;
}
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
export declare const PLANTILLAS_POR_PERFIL: Record<string, Partial<PlantillasPedido>>;
/**
 * Fallback si la organización no tiene plantillas configuradas. Es el juego de
 * `general` del frontend, y existe para que el bot NUNCA se quede sin texto:
 * un bot mudo por falta de configuración es un fallo silencioso.
 */
export declare const PLANTILLAS_POR_DEFECTO: PlantillasPedido;
/**
 * Qué hacer con el mensaje del cliente.
 *
 *   `responder`  → hay pedido: se contesta con la plantilla del estado.
 *   `pedirNumero`→ hay VARIOS pedidos activos y hace falta que diga cuál.
 *   `saludar`    → el cliente solo saludó: se presenta y dice qué sabe hacer.
 *                  NO transfiere y NO apaga el hilo (ver `PALABRAS_SALUDO`).
 *   `handoff`    → no se entendió, o no hay pedido: lo toma un humano.
 */
export type Decision = {
    accion: 'responder';
    texto: string;
    pedidoId: string;
} | {
    accion: 'pedirNumero';
    texto: string;
    numeros: string[];
} | {
    accion: 'saludar';
    motivo: string;
    texto: string;
} | {
    accion: 'tomarPedido';
    texto: string;
    borrador: PedidoEnCurso;
} | {
    accion: 'crearPedido';
    texto: string;
    borrador: PedidoEnCurso;
} | {
    accion: 'handoff';
    motivo: string;
    evento: string;
    texto: string;
};
/**
 * ¿Parece una consulta sobre un pedido?
 *
 * Se normaliza sin tildes para que «envío» y «envio» cuenten igual: el cliente
 * escribe desde el móvil y exigirle tildes sería absurdo.
 */
export declare function esConsultaDePedido(texto: string): boolean;
/** ¿El cliente pidió explícitamente hablar con una persona? */
export declare function pideHumano(texto: string): boolean;
/**
 * ¿El cliente está intentando comprar o ver el catálogo?
 *
 * No decide por sí sola: `decidir` la consulta solo cuando ya sabe que hay
 * consulta y no hay pedido activo, para elegir con qué frase derivar.
 */
export declare function quiereComprar(texto: string): boolean;
/**
 * Las frases de CONVERSACIÓN del bot — las que no dependen del estado de un
 * pedido: saludar, presentarse, derivar a un humano.
 *
 * ── Por qué esto es configuración y no constantes del código ──────────────
 *
 * Las frases de conversación son lo primero que ve un cliente y es donde vive
 * la voz de la marca. Cuando estaban escritas a mano en un `switch`, el usuario
 * recibió en su teléfono «Voy a pasar tu mensaje a un asesor para que te ayude
 * mejor» — una frase redactada por quien escribió el código, en un producto que
 * se vende a restaurantes que hablan distinto entre ellos.
 *
 * La frontera queda así:
 *   · El CÓDIGO decide **qué** frase toca (`saludar`, `handoff`, …).
 *   · La CONFIGURACIÓN decide **cómo** se dice.
 *
 * Los valores de aquí son los que el dueño escribe en
 * `config_pedidos.plantillas_whatsapp`; los de `CONVERSACION_POR_DEFECTO` son
 * el respaldo para que el bot nunca se quede mudo.
 */
export interface FrasesConversacion {
    /** Saludo y presentación. También responde «¿qué puedes hacer?». */
    presentacion: string;
    /** Cuando el cliente pide explícitamente una persona. */
    pideAsesor: string;
    /** Cuando no se entendió el mensaje. */
    noEntendido: string;
    /** Cuando llegó algo que no es texto (una foto, un audio). */
    sinTexto: string;
    /** Cuando preguntica por su pedido y el bot no puede verificarlo. */
    sinPedido: string;
    /** Cuando quiere comprar o ver el catálogo. */
    quiereComprar: string;
    /**
     * Viñeta de un item del catálogo, con tres huecos posicionales:
     * `{n}` número, `{nombre}`, `{precio}`. No es una plantilla con nombre de
     * campo sino por posición, porque el dueño la escribe de una vez y
     * `{0}`/`{1}`/`{2}` se lee peor que `{n}`/`{nombre}`/`{precio}`.
     */
    itemCatalogo: string;
    /** Encabezado del catálogo. `{negocio}` y `{total}`. */
    pedirCatalogo: string;
    /** Pide la cantidad del item elegido. `{item}`. */
    pedirCantidad: string;
    /** La cantidad no es un entero > 0. `{item}`. */
    cantidadInvalida: string;
    /** Pide la modalidad. `{opciones}`. */
    pedirModalidad: string;
    /** Pide la dirección. */
    pedirDireccion: string;
    /** Resumen antes de confirmar. `{lineas}`, `{modalidad}`, `{direccion}`, `{total}`. */
    resumenPedido: string;
    /** El cliente dijo que no a la confirmación. */
    cancelarPedido: string;
    /** Se creó el pedido. `{numero}`. */
    pedidoCreado: string;
    /**
     * El cliente intentó tomar un segundo pedido teniendo uno en curso.
     * `{numero}`. No se abre otro: dos pedidos activos del mismo cliente es
     * exactamente el caso que el bot no se atreve a resolver solo.
     */
    yaTienesPedido: string;
    /** El item elegido no está en el catálogo. `{texto}`. */
    itemNoEncontrado: string;
}
/**
 * Respaldo. Es el último nivel de precedencia: si el dueño no configuró nada,
 * el bot habla con esto. Existe para que un bot sin configuración NO se quede
 * mudo — un bot que no contesta por falta de un `jsonb` es un fallo silencioso.
 */
export declare const CONVERSACION_POR_DEFECTO: FrasesConversacion;
/**
 * Mezcla lo configurado sobre el respaldo, campo a campo.
 *
 * Campo a campo y no `{...defecto, ...configurado}` a secas, porque el dueño
 * puede configurar solo `presentacion`: si se reemplazara el objeto entero,
 * las otras cinco quedarían `undefined` y el bot mandaría `undefined` al
 * cliente. Un `jsonb` parcial es lo normal cuando alguien edita un formulario.
 */
export declare function frasesDe(configurado: Partial<FrasesConversacion> | null | undefined): FrasesConversacion;
/** ¿El cliente está preguntando qué sabe hacer el bot? */
export declare function preguntaCapacidades(texto: string): boolean;
/**
 * ¿Es el mensaje un saludo y NADA más?
 *
 * Devuelve `false` en cuanto hay cualquier otra palabra además del saludo: un
 * mensaje con más contenido tiene más intención que la de saludar, y esa
 * intención la tienen que clasificar las otras listas.
 */
export declare function esSoloSaludo(texto: string): boolean;
/** Minúsculas y sin diacríticos. `normalize('NFD')` separa la tilde y se filtra. */
export declare function normalizarTexto(texto: string): string;
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
export declare function plantillaDeEstado(estado: string, plantillas: Partial<PlantillasPedido> | null | undefined, perfil?: string | null): string;
/** «en camino», «listo»… en lenguaje de cliente, no el literal de la columna. */
export declare function etiquetaEstado(estado: string): string;
/**
 * Redacta la respuesta de estado. Combina la plantilla del dueño con el dato
 * concreto, sin inventar nada: si no hay estimación configurada, no se promete
 * un tiempo.
 */
export declare function redactarRespuestaDePedido(pedido: PedidoParaBot, plantillas: Partial<PlantillasPedido> | null | undefined, perfil?: string | null): string;
/**
 * Reconoce la modalidad que el cliente escribió.
 *
 * `null` si no se reconoce — y ese `null` NO se convierte en una modalidad por
 * defecto. Inventar «domicilio» porque no se entendió mandaría a un repartidor
 * a una casa a la que nadie pidió ir.
 */
export declare function modalidadDe(texto: string): string | null;
/**
 * Lee una cantidad escrita por un cliente.
 *
 * Acepta dígitos («2») y las palabras que la gente escribe de verdad («dos»,
 * «una»). Rechaza cero, negativos, decimales y cualquier cosa que no sea un
 * entero en un rango razonable.
 *
 * El tope de 999 no es una regla de negocio: es una guarda contra el dedo
 * pegado al teclado. Un cliente que pide 5000 hamburguesas por WhatsApp no
 * quiere 5000 hamburguesas.
 */
export declare function cantidadDe(texto: string): number | null;
/** Formatea un precio en pesos colombianos, sin decimales. */
export declare function precioLegible(precio: number): string;
/** Total del borrador, con el precio congelado de cada línea. */
export declare function totalDe(lineas: LineaBorrador[]): number;
/**
 * El catálogo numerado tal como lo lee el cliente.
 *
 * Se numera desde 1 porque es lo que el cliente va a escribir. El `id` interno
 * (`cat-f1`) no se muestra nunca: es una clave, no algo que una persona deba
 * transcribir.
 */
export declare function redactarCatalogo(catalogo: CatalogoItemBot[], frases: FrasesConversacion): string;
/** El resumen que se le lee al cliente antes de que confirme. */
export declare function redactarResumen(borrador: PedidoEnCurso, frases: FrasesConversacion): string;
/** Borrador vacío, listo para empezar a elegir items. */
export declare function borradorNuevo(): PedidoEnCurso;
/**
 * Interpreta el mensaje del cliente DENTRO de un ciclo de toma de pedido.
 *
 * Devuelve `null` cuando el mensaje no pertenece al ciclo y hay que dejarlo
 * pasar al clasificador normal — por ejemplo, un cliente a mitad de elegir
 * items que pregunta «¿dónde está mi pedido anterior?». Esa pregunta la sabe
 * contestar el bot, y secuestrarla por estar en un formulario sería peor
 * servicio que el formulario.
 */
export declare function decidirEnCiclo(input: {
    texto: string;
    borrador: PedidoEnCurso;
    catalogo: CatalogoItemBot[];
    frases: FrasesConversacion;
    /** Si el cliente ya tiene un pedido activo, no se abre otro. */
    pedidoActivoNumero?: string | null;
}): {
    accion: 'seguir';
    texto: string;
    borrador: PedidoEnCurso;
    crear?: false;
} | {
    accion: 'crear';
    texto: string;
    borrador: PedidoEnCurso;
    crear: true;
} | {
    accion: 'descartar';
    texto: string;
} | null;
/**
 * Encuentra el item del catálogo al que se refiere el cliente.
 *
 * Acepta el NÚMERO («2») y el NOMBRE («papas rústicas»). El número es la vía
 * principal —por eso el catálogo se imprime numerado— y el nombre es la red
 * para quien escribe «quiero una hamburguesa» de corrido.
 *
 * El nombre se compara por inclusión normalizada en los dos sentidos: «papas»
 * encuentra «Papas Rústicas con Queso», y «papas rusticas con queso por favor»
 * también.
 */
export declare function resolverItem(texto: string, catalogo: CatalogoItemBot[]): CatalogoItemBot | null;
/**
 * Decide qué hacer con el texto del cliente.
 *
 * Orden de comprobación, y por qué:
 *   1. **Handoff explícito** primero. Si pide un humano, no se le hace pasar por
 *      un clasificador: es la petición más clara que puede hacer.
 *   2. **Nada que responder** (sin texto, solo adjunto) → humano. El bot solo
 *      maneja texto en el MVP; fingir que entendió una foto sería mentir.
 *   3. **No parece pedido** → humano.
 *   4. **Sin pedidos** → humano, pero con un texto que NO diga «no existe»:
 *      puede ser que el pedido esté en otra organización o que el cliente
 *      escriba de un número distinto. Afirmar «no tienes pedidos» sería una
 *      conclusión que no podemos sostener.
 *   5. **Varios activos** → pedir el número.
 *   6. **Uno** → responder.
 */
export declare function decidir(input: {
    texto: string | null;
    pedidos: PedidoParaBot[];
    plantillas: Partial<PlantillasPedido> | null | undefined;
    /** `config_pedidos.perfil_comercial` de la organización. */
    perfil?: string | null;
    /**
     * Las frases de conversación ya resueltas por `frasesDe`. Si no se pasa, se
     * usan los valores por defecto — así los tests puros no tienen que armar el
     * objeto entero para comprobar una decisión.
     */
    frases?: Partial<FrasesConversacion> | null;
    /** El catálogo de venta del dueño (`config_pedidos.catalogo`). */
    catalogo?: CatalogoItemBot[];
    /**
     * El borrador de pedido que la conversación tuviera a medias, si lo tiene.
     * `null` cuando no hay ninguno en curso.
     */
    enCurso?: PedidoEnCurso | null;
}): Decision;
/**
 * Guarda contra el bucle: el bot NO responde a sus propios mensajes.
 *
 * Cuando el bot envía, Zernio devuelve ese mensaje con `direction: "outgoing"`
 * y `sentVia: "api"`. El receptor ya los descarta con `no_entrante`, pero esta
 * comprobación es una segunda red a propósito: un bot que se responde a sí mismo
 * genera un bucle de mensajes reales al cliente y factura de WhatsApp. Vale
 * tenerla duplicada.
 */
export declare function esMensajePropio(direccion: string, sentVia: string | null): boolean;
//# sourceMappingURL=BotPedidos.d.ts.map