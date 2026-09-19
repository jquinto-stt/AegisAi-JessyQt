/**
 * Modelo del contenido legal.
 *
 * Los tres documentos (términos, privacidad y cookies) comparten forma, así que
 * se describen como **datos** y no como JSX: la página que los pinta es una sola
 * (`LegalDocumentView`) y añadir un documento nuevo no toca ni una línea de
 * layout. Si cada documento fuera su propio `.tsx`, la cuarta revisión de copy
 * obligaría a editar tres archivos con la misma estructura.
 *
 * ⚠️ El **`version`** no es decorativo. El asentimiento del registro se guarda
 * junto a esta versión, así que subirla es lo que permite saber que alguien
 * aceptó unos términos que ya cambiaron. Si se edita el copy, hay que subirla.
 */

export type LegalDocumentId = "terms" | "privacy" | "cookies";

/** Un bloque del cuerpo. Se modela como unión para no admitir estados inválidos. */
export type LegalBlock =
  | { kind: "p"; text: string }
  | { kind: "list"; items: string[] }
  /** Sub-apartado con su propio título (p. ej. una tabla de cookies). */
  | { kind: "definitions"; items: { term: string; description: string }[] };

export interface LegalSection {
  /** Ancla estable para enlazar una sección concreta (`#datos-que-tratamos`). */
  id: string;
  title: string;
  blocks: LegalBlock[];
}

export interface LegalDocument {
  id: LegalDocumentId;
  /** Ruta pública canónica. Único lugar donde se declara. */
  path: string;
  /** Título del documento. Se usa también en el `<PageMeta>`. */
  title: string;
  /** Rótulo corto de la banda del hero. */
  eyebrow: string;
  /** Frase de entrada, en lenguaje llano. */
  summary: string;
  /** Versión vigente. Ver la nota de arriba antes de tocar el copy. */
  version: string;
  /** Fecha de entrada en vigor, ya formateada para mostrar. */
  effectiveDate: string;
  sections: LegalSection[];
}

/* ── Términos y Condiciones ──────────────────────────────────────────── */

const TERMS: LegalDocument = {
  id: "terms",
  path: "/terminos",
  title: "Términos y Condiciones",
  eyebrow: "Legal",
  summary:
    "Las reglas del servicio: qué te ofrecemos, qué esperamos de ti y cómo resolvemos los desacuerdos.",
  version: "1.0",
  effectiveDate: "14 de septiembre de 2026",
  sections: [
    {
      id: "que-es-necto",
      title: "1. Qué es Necto",
      blocks: [
        {
          kind: "p",
          text: "Necto es una plataforma para operar un negocio: te permite dar de alta tu organización, configurar módulos como pedidos y catálogo, y operar la venta y despacho de tus productos.",
        },
        {
          kind: "p",
          text: "Necto es la herramienta. El negocio, sus productos, sus precios y la relación con sus clientes son tuyos: nosotros no vendemos tus productos ni intermediamos en tus ventas.",
        },
      ],
    },
    {
      id: "tu-cuenta",
      title: "2. Tu cuenta",
      blocks: [
        {
          kind: "p",
          text: "Para usar Necto necesitas crear una cuenta con un correo electrónico válido. Eres responsable de la veracidad de los datos que registres y de mantener tu contraseña a salvo.",
        },
        {
          kind: "p",
          text: "Cada persona que acceda debe hacerlo con su propia credencial: no compartas el acceso.",
        },
        {
          kind: "p",
          text: "Si detectas un uso no autorizado de tu cuenta, avísanos de inmediato para desactivar el acceso.",
        },
      ],
    },
    {
      id: "uso-aceptable",
      title: "3. Uso aceptable",
      blocks: [
        { kind: "p", text: "Al usar Necto te comprometes a no:" },
        {
          kind: "list",
          items: [
            "Usar la plataforma para actividades ilegales o para vender productos prohibidos por la ley.",
            "Enviar mensajes no solicitados a personas que no dieron su consentimiento.",
            "Intentar acceder a datos de otras tiendas, cuentas o personas.",
            "Interferir con el funcionamiento del servicio o sobrecargarlo deliberadamente.",
            "Suplantar la identidad de otra persona o de otra empresa.",
          ],
        },
        {
          kind: "p",
          text: "Si incumples estas reglas podemos suspender la cuenta. Cuando sea posible, te avisaremos antes y te explicaremos qué pasó.",
        },
      ],
    },
    {
      id: "tus-datos-y-contenido",
      title: "4. Tu contenido",
      blocks: [
        {
          kind: "p",
          text: "El catálogo, los precios, las imágenes, los clientes y los mensajes que cargues siguen siendo tuyos. Sólo necesitamos permiso para alojarlos y mostrarlos mientras uses el servicio, que es lo mínimo para poder prestarte el servicio.",
        },
        {
          kind: "p",
          text: "Eres responsable de tener el derecho a usar el contenido que subes y de cumplir la normativa aplicable sobre datos de tus propios clientes.",
        },
      ],
    },
    {
      id: "disponibilidad",
      title: "5. Disponibilidad y cambios",
      blocks: [
        {
          kind: "p",
          text: "Trabajamos para que el servicio esté disponible de forma continua, pero no podemos prometer que no habrá interrupciones: hay mantenimientos, actualizaciones y fallos de terceros que no controlamos.",
        },
        {
          kind: "p",
          text: "Podemos modificar funciones o el propio servicio. Si un cambio afecta de forma sustancial a lo que ya usabas, lo avisaremos con antelación razonable.",
        },
      ],
    },
    {
      id: "responsabilidad",
      title: "6. Límite de responsabilidad",
      blocks: [
        {
          kind: "p",
          text: "Necto se ofrece tal como está. No respondemos por lucro cesante, pérdida de datos derivada de un uso inadecuado, ni por decisiones de negocio que tomes a partir de la información que muestra la plataforma.",
        },
        {
          kind: "p",
          text: "Nada en estos términos excluye responsabilidades que la ley no permita excluir.",
        },
      ],
    },
    {
      id: "cambios-en-los-terminos",
      title: "7. Cambios en estos términos",
      blocks: [
        {
          kind: "p",
          text: "Cuando cambiemos los términos, actualizaremos la versión y la fecha de entrada en vigor que aparecen al inicio de esta página. Si el cambio es relevante, te lo comunicaremos por los medios de contacto de tu cuenta.",
        },
        {
          kind: "p",
          text: "Seguir usando Necto después de la entrada en vigor significa que aceptas la versión nueva.",
        },
      ],
    },
    {
      id: "contacto",
      title: "8. Contacto",
      blocks: [
        {
          kind: "p",
          text: "Para cualquier duda sobre estos términos, escríbenos desde el centro de ayuda. Intentamos responder en un plazo de dos días hábiles.",
        },
      ],
    },
  ],
};

/* ── Política de Privacidad ──────────────────────────────────────────── */

const PRIVACY: LegalDocument = {
  id: "privacy",
  path: "/privacidad",
  title: "Política de Privacidad",
  eyebrow: "Legal",
  summary:
    "Qué datos tratamos, para qué los usamos, con quién los compartimos y cómo puedes ejercer tus derechos.",
  version: "1.0",
  effectiveDate: "14 de septiembre de 2026",
  sections: [
    {
      id: "responsable",
      title: "1. Quién trata tus datos",
      blocks: [
        {
          kind: "p",
          text: "El responsable del tratamiento de los datos de tu cuenta es Necto. Los datos de tus clientes que tú cargas los tratas tú: Necto actúa como encargado, es decir, los guarda y los procesa siguiendo tus instrucciones y para prestarte el servicio.",
        },
      ],
    },
    {
      id: "datos-que-tratamos",
      title: "2. Qué datos tratamos",
      blocks: [
        { kind: "p", text: "Para darte el servicio tratamos:" },
        {
          kind: "definitions",
          items: [
            {
              term: "Datos de la cuenta",
              description:
                "Nombre, apellido, correo electrónico y contraseña (guardada siempre con hash, nunca en claro).",
            },
            {
              term: "Datos del negocio",
              description:
                "Nombre de la organización, tipo de negocio, país, moneda y datos de contacto.",
            },
            {
              term: "Datos operativos",
              description:
                "Catálogo, precios, existencias, pedidos, citas y movimientos que registres en la plataforma.",
            },
            {
              term: "Mensajes de tus clientes",
              description:
                "Cuando conectas un canal, el contenido de las conversaciones que tus clientes intercambian contigo.",
            },
            {
              term: "Datos técnicos",
              description:
                "Dirección IP, tipo de dispositivo y navegador, y registros de uso necesarios para operar y proteger el servicio.",
            },
          ],
        },
      ],
    },
    {
      id: "para-que",
      title: "3. Para qué los usamos",
      blocks: [
        {
          kind: "list",
          items: [
            "Prestarte el servicio y mantener tu cuenta operativa.",
            "Mostrarte la información de tu negocio y generar tus reportes.",
            "Atender tus solicitudes de soporte.",
            "Detectar y prevenir fraude, abuso o accesos no autorizados.",
            "Cumplir obligaciones legales cuando corresponda.",
          ],
        },
        {
          kind: "p",
          text: "No usamos los datos de tus clientes para fines propios, ni los vendemos a terceros.",
        },
      ],
    },
    {
      id: "base-legal",
      title: "4. Con qué base tratamos los datos",
      blocks: [
        {
          kind: "p",
          text: "Tratamos los datos porque son necesarios para ejecutar el contrato que aceptas al crear la cuenta, porque tenemos un interés legítimo en proteger el servicio, o porque nos das tu consentimiento expreso. Puedes retirar el consentimiento cuando quieras, sin que eso afecte a lo que ya se hizo con él.",
        },
      ],
    },
    {
      id: "con-quien-compartimos",
      title: "5. Con quién compartimos",
      blocks: [
        {
          kind: "p",
          text: "Compartimos lo mínimo indispensable con proveedores que nos permiten funcionar: infraestructura en la nube, envío de correos transaccionales y las plataformas de mensajería que tú decidas conectar. Estos proveedores sólo acceden a los datos para prestar su servicio, no para fines propios.",
        },
        {
          kind: "p",
          text: "Si conectas un canal como WhatsApp Business, la conversación se rige también por las condiciones de esa plataforma. Te recomendamos leerlas: son terceros independientes de Necto.",
        },
      ],
    },
    {
      id: "conservacion",
      title: "6. Cuánto tiempo los guardamos",
      blocks: [
        {
          kind: "p",
          text: "Conservamos los datos mientras tu cuenta esté activa. Si la cierras, los eliminamos o los anonimizamos en un plazo razonable, salvo aquello que debamos conservar para cumplir una obligación legal o para atender una reclamación en curso.",
        },
      ],
    },
    {
      id: "tus-derechos",
      title: "7. Tus derechos",
      blocks: [
        { kind: "p", text: "Puedes ejercer en cualquier momento estos derechos:" },
        {
          kind: "definitions",
          items: [
            {
              term: "Acceso",
              description: "Saber qué datos tuyos tratamos y obtener una copia.",
            },
            {
              term: "Rectificación",
              description: "Corregir datos inexactos o incompletos.",
            },
            {
              term: "Supresión",
              description: "Pedir que eliminemos datos que ya no necesitemos.",
            },
            {
              term: "Oposición y limitación",
              description: "Oponerte a un tratamiento concreto o pedir que lo restrinjamos.",
            },
            {
              term: "Portabilidad",
              description: "Recibir tus datos en un formato que puedas llevarte.",
            },
          ],
        },
        {
          kind: "p",
          text: "Puedes ejercerlos desde la configuración de tu perfil o escribiéndonos desde el centro de ayuda.",
        },
      ],
    },
    {
      id: "seguridad",
      title: "8. Seguridad",
      blocks: [
        {
          kind: "p",
          text: "Aplicamos medidas técnicas y organizativas para proteger la información: cifrado en tránsito, contraseñas con hash, control de acceso por roles y registro de actividad. Ningún sistema es infalible, así que si detectamos un incidente que te afecte, te lo comunicaremos.",
        },
      ],
    },
    {
      id: "menores",
      title: "9. Menores de edad",
      blocks: [
        {
          kind: "p",
          text: "Necto es una herramienta para operar negocios y no está dirigida a menores de edad. No creamos cuentas a sabiendas de que pertenecen a un menor.",
        },
      ],
    },
    {
      id: "cambios-privacidad",
      title: "10. Cambios en esta política",
      blocks: [
        {
          kind: "p",
          text: "Cuando actualicemos la política cambiaremos la versión y la fecha que aparecen al inicio. Si el cambio afecta de forma sustancial al tratamiento, te avisaremos antes de que entre en vigor.",
        },
      ],
    },
  ],
};

/* ── Política de Cookies ─────────────────────────────────────────────── */

const COOKIES: LegalDocument = {
  id: "cookies",
  path: "/cookies",
  title: "Política de Cookies",
  eyebrow: "Legal",
  summary:
    "Usamos lo mínimo para que la sesión funcione. Aquí está exactamente qué guardamos y por qué.",
  version: "1.0",
  effectiveDate: "14 de septiembre de 2026",
  sections: [
    {
      id: "que-son",
      title: "1. Qué son y qué usamos",
      blocks: [
        {
          kind: "p",
          text: "Una cookie es un pequeño archivo que el navegador guarda por indicación de una web. Necto las usa para recordar quién eres mientras navegas y para no volver a preguntarte cosas que ya decidiste.",
        },
        {
          kind: "p",
          text: "Además de cookies usamos almacenamiento local del navegador, que cumple una función parecida: guardar preferencias en tu propio dispositivo. A efectos de esta política tratamos ambos igual.",
        },
      ],
    },
    {
      id: "que-guardamos",
      title: "2. Qué guardamos",
      blocks: [
        {
          kind: "p",
          text: "Sólo usamos categorías necesarias y funcionales. No usamos cookies publicitarias ni de perfilado: Necto no vende espacios ni sigue tu navegación por otras webs.",
        },
        {
          kind: "definitions",
          items: [
            {
              term: "Sesión",
              description:
                "Mantienen tu cuenta identificada mientras usas la plataforma. Sin ellas no podrías iniciar sesión. Son estrictamente necesarias.",
            },
            {
              term: "Preferencias",
              description:
                "Recuerdan ajustes que elegiste, como el tema claro u oscuro o si el menú lateral está expandido.",
            },
            {
              term: "Consentimiento",
              description:
                "Guardan que ya te hemos mostrado el aviso de cookies y qué decidiste, para no repetírtelo en cada visita.",
            },
            {
              term: "Funcionamiento",
              description:
                "Sostienen el funcionamiento de la aplicación que estás usando, por ejemplo para no perder un formulario a medio completar.",
            },
          ],
        },
      ],
    },
    {
      id: "terceros",
      title: "3. Cookies de terceros",
      blocks: [
        {
          kind: "p",
          text: "Necto no instala cookies publicitarias ni analíticas de terceros. Si en el futuro incorporamos una herramienta de medición, sólo se activará después de que la aceptes de forma explícita, y actualizaremos esta página y el aviso antes de hacerlo.",
        },
      ],
    },
    {
      id: "como-controlarlas",
      title: "4. Cómo controlarlas",
      blocks: [
        {
          kind: "p",
          text: "Puedes decidir sobre las cookies desde el aviso que aparece la primera vez que entras, y cambiar de opinión cuando quieras. También puedes borrarlas o bloquearlas desde la configuración de tu navegador.",
        },
        {
          kind: "p",
          text: "Ten en cuenta que si bloqueas las cookies necesarias la sesión no podrá mantenerse y no podrás usar la plataforma. Las de preferencias y consentimiento no son imprescindibles: si las borras, simplemente volveremos a preguntarte.",
        },
      ],
    },
    {
      id: "cambios-cookies",
      title: "5. Cambios en esta política",
      blocks: [
        {
          kind: "p",
          text: "Si añadimos o retiramos cookies, actualizaremos esta página, subiremos la versión y volveremos a pedirte el consentimiento cuando el cambio lo requiera.",
        },
      ],
    },
  ],
};

/* ── Registro y utilidades ───────────────────────────────────────────── */

/**
 * Todos los documentos, indexados por id. Es el **único** punto donde se declara
 * la ruta de cada uno: las páginas, el aviso de cookies y el pie de la app lo
 * leen de aquí para no repetir la URL en cuatro sitios.
 */
export const LEGAL_DOCUMENTS: Record<LegalDocumentId, LegalDocument> = {
  terms: TERMS,
  privacy: PRIVACY,
  cookies: COOKIES,
};

/** Orden en que se muestran los enlaces legales, de más a menos contractual. */
export const LEGAL_LINK_ORDER: LegalDocumentId[] = ["terms", "privacy", "cookies"];

/** Enlaces listos para pintar. Se derivan para que el rótulo y la ruta no divergan. */
export const LEGAL_LINKS = LEGAL_LINK_ORDER.map(id => ({
  id,
  label: LEGAL_DOCUMENTS[id].title,
  to: LEGAL_DOCUMENTS[id].path,
}));

/** Versión de los términos y de la privacidad que se acepta al crear la cuenta. */
export const ACCEPTED_LEGAL_VERSION = `${TERMS.version}+${PRIVACY.version}`;
