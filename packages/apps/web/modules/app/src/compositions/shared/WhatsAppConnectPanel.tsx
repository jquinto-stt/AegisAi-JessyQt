import React, { useId } from "react";
import { Check, Info, ShieldCheck } from "lucide-react";

interface WhatsAppConnectPanelProps {
  /**
   * Inicia una conexión **de demostración**: registra la conexión en la tienda
   * pero sin autorización real de Meta.
   */
  onConnectDemo: () => void;
  isConnecting?: boolean;
  /**
   * ¿Está disponible la autorización real con Meta?
   *
   * Hoy es `false` en todos los entornos: Embedded Signup necesita el servicio
   * de Necto en el servidor (intercambiar el código por un token y guardarlo en
   * el secret manager), y un SPA no puede recibir webhooks ni custodiar tokens.
   * El panel lo **dice** en lugar de ofrecer un botón que no lleva a ninguna parte.
   */
  metaAuthorizationAvailable?: boolean;
  /**
   * Línea de contexto bajo el CTA. El alta de sede la usa para decir qué
   * teléfono quedará vinculado; en Ajustes no hace falta.
   */
  contextNote?: React.ReactNode;
  /**
   * ¿El canal ya está conectado?
   *
   * Cuando lo está, la acción deja de ofrecer conectar —un botón "Conectar" en un
   * canal ya conectado es ruido— y pasa a confirmar el estado. El panel **no
   * desaparece** al conectar: sigue siendo la presentación del canal, y eso es lo
   * que permite tenerlo empotrado en la sección en lugar de detrás de un botón.
   */
  isConnected?: boolean;
  /** Deshacer la conexión. Sin esto, el estado conectado no tendría salida. */
  onDisconnect?: () => void;
  /**
   * ¿La conexión guardada es de demostración?
   *
   * Es distinto de `metaAuthorizationAvailable`: aquello dice si *se puede*
   * autorizar con Meta (hoy no), esto dice si la conexión que hay *es* de
   * mentira. Se lee del estado guardado, no de la capacidad, porque el día que
   * exista el backend convivirán las dos cosas.
   */
  isDemo?: boolean;
}

/** Los tres motivos, en orden de embudo: rapidez → pedidos → cobertura. */
const BENEFITS: { title: string; hint: string }[] = [
  {
    title: "Responde al instante",
    hint: "El asistente contesta catálogo, precios y stock en segundos, sin que nadie esté pendiente del teléfono.",
  },
  {
    title: "Recibe pedidos automáticamente",
    hint: "Cada pedido entra a Necto con su detalle, listo para preparar.",
  },
  {
    title: "Atiende 24/7",
    hint: "Fuera de horario el canal sigue abierto y toma el pedido igual.",
  },
];

/**
 * Contorno exterior del glifo de WhatsApp: la burbuja **sólida** con su cola.
 *
 * ⚠️ En el original este contorno arranca con un `moveto` **relativo**
 * (`m8.413-18.297`) encadenado al contorno anterior, así que no se puede copiar
 * suelto — habría dibujado la burbuja en otro sitio. El `M` absoluto de aquí
 * (20.463 3.488) se calculó midiendo con `getPointAtLength` dónde termina el
 * contorno previo, y coincide con el `M20.464 3.488` del propio original.
 */
const WA_BUBBLE =
  "M20.463 3.488A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z";

/** El auricular. Va centrado en la burbuja: su caja es (12.05, 12) y la de aquella (12, 12). */
const WA_HANDSET =
  "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347";

/**
 * Logotipo de WhatsApp **a color**: la burbuja verde con el auricular blanco, que
 * es lo que la gente reconoce de la app. Se usa para firmar la integración junto
 * al logotipo de Necto.
 *
 * Va en dos trazos y no en uno. El glifo oficial es un solo `path` con la burbuja
 * y el auricular como contornos separados, y en monocromo el auricular sale
 * **perforado** —transparente—: sobre el verde oscuro del panel eso se leería como
 * un agujero, no como el logotipo. Con la burbuja en verde y el auricular
 * en blanco encima, el resultado es el logotipo real.
 *
 * 🚨 MEDIDO EL 20/09 — la advertencia de abajo se cumple, y el comentario la
 * incumplía. Los tokens `--color-whatsapp-*` NUNCA se declararon en `theme.css`:
 * `var(--color-whatsapp-500)` no resuelve, el `fill` queda inválido y la burbuja
 * se pinta en NEGRO, en silencio. Y no hay guarda: el texto prometía una, pero no
 * existe ningún test de este archivo.
 *
 * El componente tampoco tiene consumidores (nadie lo importa), así que el fallo
 * hoy no se ve — y por eso sobrevivió. Antes de montarlo hay que decidir una de
 * dos: declarar la rampa `whatsapp-*` en el tema, sabiendo que WhatsApp define
 * cuatro colores (#25D366, #128C7E, #075E54, #DCF8C6) y NO una rampa de nueve
 * pasos —los intermedios hay que derivarlos—, o cambiar los `fill` y las clases
 * por hex oficiales, que es lo que ya hacen TableroPage e HistorialPage.
 */
const WhatsAppLogo: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={className}>
    <path d={WA_BUBBLE} fill="var(--color-whatsapp-500)" />
    <path d={WA_HANDSET} fill="var(--color-white)" />
  </svg>
);

/**
 * *Wallpaper* de WhatsApp: el mosaico de garabatos de línea que la app pinta
 * detrás de los chats. Es lo que hace que el panel verde se lea como WhatsApp y
 * no como "un panel verde".
 *
 * ⚠️ El `id` llega por prop y sale de `useId()`: un `id` fijo se repetiría si el
 * panel se pintara dos veces en la misma página, y `fill="url(#…)"` resolvería al
 * patrón equivocado —o a ninguno, y el fondo saldría **liso sin avisar**, que es
 * el peor fallo posible aquí porque parece intencionado.
 *
 * ⚠️ Cada garabato tiene que caber **dentro de la losa de 140×140**: el patrón
 * recorta en el borde, así que un grupo que se salga aparece cortado a media
 * línea y se lee como un fallo de render, no como textura. El sitio de cada uno
 * está elegido para no solaparse con sus vecinos.
 */
const WhatsAppDoodlePattern: React.FC<{ id: string }> = ({ id }) => (
  <svg
    aria-hidden="true"
    focusable="false"
    className="pointer-events-none absolute inset-0 h-full w-full"
  >
    <defs>
      <pattern id={id} width="140" height="140" patternUnits="userSpaceOnUse">
        <g
          fill="none"
          stroke="var(--color-whatsapp-300)"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.22"
        >
          {/* Burbuja de chat */}
          <g transform="translate(4 6) rotate(-8)">
            <rect x="1" y="1" width="22" height="16" rx="5" />
            <path d="M6 17l-2 5 6-5" />
          </g>
          {/* Reloj */}
          <g transform="translate(56 16) rotate(-10)">
            <circle cx="9" cy="9" r="8" />
            <path d="M9 4.5V9l3.5 2" />
          </g>
          {/* Corazón */}
          <g transform="translate(86 2) rotate(10)">
            <path d="M8 14C3 10 1 7 2 4.5 3 2 6 2 8 5c2-3 5-3 6-.5C15 7 13 10 8 14Z" />
          </g>
          {/* Carita */}
          <g transform="translate(14 52)">
            <circle cx="9" cy="9" r="8" />
            <circle cx="6" cy="7" r="0.9" fill="var(--color-whatsapp-300)" />
            <circle cx="12" cy="7" r="0.9" fill="var(--color-whatsapp-300)" />
            <path d="M5.5 11.5a4.6 4.6 0 0 0 7 0" />
          </g>
          {/* Nota musical */}
          <g transform="translate(96 46) rotate(8)">
            <path d="M7 14V3l10-2v11" />
            <circle cx="4.4" cy="14.4" r="2.7" />
            <circle cx="14.4" cy="12.4" r="2.7" />
          </g>
          {/* Pin de ubicación */}
          <g transform="translate(56 70) rotate(6)">
            <path d="M9 17.5s7-6.6 7-11.2A7 7 0 1 0 2 6.3c0 4.6 7 11.2 7 11.2Z" />
            <circle cx="9" cy="6.3" r="2.6" />
          </g>
          {/* Avión de papel */}
          <g transform="translate(6 104) rotate(-6)">
            <path d="M21 1 11 13M21 1l-7 20-3-8-8-4Z" />
          </g>
          {/* Cámara */}
          <g transform="translate(94 100) rotate(6)">
            <rect x="1" y="5" width="21" height="14" rx="3.5" />
            <circle cx="11.5" cy="12" r="4" />
            <path d="M7 5l2-3h5l2 3" />
          </g>
          {/* Taza de café */}
          <g transform="translate(36 32) rotate(-8)">
            <path d="M2 4h13v6.5a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5Z" />
            <path d="M15 6h2.4a2.6 2.6 0 0 1 0 5.2H15" />
            <path d="M1 19h15" />
          </g>
          {/* Planeta */}
          <g transform="translate(114 66) rotate(-16)">
            <circle cx="9" cy="9" r="6.5" />
            <ellipse cx="9" cy="9" rx="11.5" ry="3.6" />
          </g>
          {/* Flor */}
          <g transform="translate(58 112) rotate(8 8 8)">
            <circle cx="8" cy="8" r="2.7" />
            <circle cx="8" cy="2.8" r="2.5" />
            <circle cx="13.1" cy="5.9" r="2.5" />
            <circle cx="11.2" cy="11.8" r="2.5" />
            <circle cx="4.8" cy="11.8" r="2.5" />
            <circle cx="2.9" cy="5.9" r="2.5" />
          </g>
        </g>
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill={`url(#${id})`} />
  </svg>
);

/**
 * Ilustración de marca: una **conversación** de dos burbujas —la pregunta del
 * cliente y la respuesta de Necto con el pedido— cerrada con el **doble check**
 * de entregado.
 *
 * Es una conversación y no un icono suelto a propósito. Lo que hace que el panel
 * se lea como WhatsApp no es el verde —cualquier marca puede pintar verde— sino
 * la forma de las burbujas con su cola y el recibo de dos ticks, que es el
 * pictograma que la gente reconoce sin que nadie se lo explique.
 *
 * Los colores NO salen de tokens, aunque se escribieran como
 * `var(--color-whatsapp-*)`: esa rampa nunca se declaró, así que hoy la
 * ilustración se pinta en negro. Es el mismo caso que el logotipo de arriba —
 * allí está la explicación y la decisión pendiente.
 */
const WhatsAppHeroArt: React.FC = () => (
  <svg
    viewBox="0 18 260 196"
    fill="none"
    aria-hidden="true"
    focusable="false"
    className="h-auto w-full max-w-[280px]"
  >
    {/*
      ⚠️ Sin disco de fondo. Antes había un círculo opaco `whatsapp-800` detrás de
      la ilustración y **tapaba el patrón**: el mosaico se cortaba en seco al
      rodearla y parecía un fallo de render. Las burbujas ya son opacas, así que se
      leen como objetos sólidos sobre la textura sin necesidad de aislarlas.
    */}
    <g transform="rotate(-4 130 118)">
      {/* ── Entrante: la pregunta del cliente ── */}
      <rect
        x="8"
        y="30"
        width="128"
        height="58"
        rx="17"
        fill="var(--color-whatsapp-800)"
        stroke="var(--color-whatsapp-700)"
        strokeWidth="1.5"
      />
      {/* Cola: nace 2 px por encima del borde inferior y se funde con la burbuja. */}
      <path d="M28 86 L20 104 L48 86" fill="var(--color-whatsapp-800)" />
      {/* Tres líneas de anchura decreciente: dos líneas gruesas se leían como un
          signo igual, no como un mensaje escrito. */}
      <path
        d="M30 46h84M30 60h68M30 74h44"
        stroke="var(--color-whatsapp-200)"
        strokeWidth="4.5"
        strokeLinecap="round"
      />

      {/* ── Saliente: lo que contesta Necto, con el pedido ya entregado ── */}
      <rect x="104" y="122" width="148" height="70" rx="17" fill="var(--color-whatsapp-500)" />
      <path d="M224 190 L242 206 L212 190" fill="var(--color-whatsapp-500)" />
      {/* Carrito */}
      <path
        d="M124 142h10l6 24h32"
        stroke="var(--color-whatsapp-900)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M140 152h28l-5 15h-19z" fill="var(--color-whatsapp-900)" />
      <circle cx="147" cy="176" r="3.2" fill="var(--color-whatsapp-900)" />
      <circle cx="168" cy="176" r="3.2" fill="var(--color-whatsapp-900)" />
      {/* Doble check: dos trazos idénticos, el segundo 12 px a la derecha. Va al
          pie de la burbuja, separado del carrito, para que no se lea como un
          zigzag pegado a él. */}
      <path
        d="M198 174l6 6L216 162"
        stroke="var(--color-whatsapp-900)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M210 174l6 6L228 162"
        stroke="var(--color-whatsapp-900)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>

    {/* Destellos */}
    <path d="M232 46l4.5 12 12 4.5-12 4.5-4.5 12-4.5-12-12-4.5 12-4.5z" fill="var(--color-whatsapp-300)" />
    <path d="M34 186l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill="var(--color-whatsapp-400)" />
  </svg>
);

/**
 * Conexión del canal de WhatsApp con Meta.
 *
 * Sustituye al panel de QR de *dispositivos vinculados* (`WhatsAppQrPanel`), que
 * modelaba el mecanismo equivocado: una sesión de app no recibe webhooks, es por
 * dispositivo y no es el camino soportado para automatizar. Lo correcto es
 * **autorizar con Meta** (Embedded Signup), que es lo que este panel explica.
 *
 * Tiene la forma del flujo real de Meta: columna de lectura (motivos + aviso +
 * acción) y panel de marca en verde WhatsApp, con el *wallpaper* de garabatos del
 * canal detrás, una conversación ilustrada —burbujas con cola y doble check— y su
 * rótulo al pie. Antes era una tarjeta con una lista de "lo que recibimos" y un
 * botón; el canal pesa más que eso en el producto, y la lista de requisitos
 * competía con los motivos para conectarlo.
 *
 * ⚠️ Mientras no exista el backend, el panel **no finge** una autorización: dice
 * que no está disponible y ofrece una conexión de demostración marcada como tal.
 * Un botón que aparenta conectar y no conecta es el defecto que este cambio
 * viene a corregir.
 */
export const WhatsAppConnectPanel: React.FC<WhatsAppConnectPanelProps> = ({
  onConnectDemo,
  isConnecting = false,
  metaAuthorizationAvailable = false,
  contextNote,
  isConnected = false,
  onDisconnect,
  isDemo = false,
}) => {
  // `useId()` devuelve algo como ":r0:" y los dos puntos ensucian el `url(#…)`,
  // así que se limpia a alfanumérico antes de montar el id del patrón.
  const patternId = `wa-doodles-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  return (
    /*
      ⚠️ Dos columnas **sólo si cada una cabe**, y eso no lo puede decidir un
      breakpoint de viewport: el panel se usa en el modal de conexión (768 px) y en
      el paso de alta de sede, que vive en una columna de formulario de 576 px. Con
      un `md:` de viewport, una pantalla ancha metía dos columnas de ~274 px dentro
      de la columna estrecha y el hero quedaba ilegible.

      `auto-fit` + `minmax(320px, 1fr)` lo expresa en una regla: se pintan tantas
      columnas como quepan a 320 px mínimo y las que sobren se colapsan (los dos
      bloques se reparten el ancho). Un `@container` con `@min-[560px]:` sería lo
      idiomático, pero aquí el variant no llegó a emitirse —la clase quedaba sin
      efecto y el hero se apilaba también en el modal—, así que se resuelve en CSS
      puro, sin depender de esa feature.
    */
    <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))]">
      {/* ── Columna de lectura ── */}
      <div className="flex flex-col px-8 pb-8 pt-14 md:px-10 md:py-10">
        <span className="text-theme-xs font-bold uppercase tracking-[0.2em] text-brand-500">
          Canal oficial de WhatsApp
        </span>
        <h2
          id="whatsapp-connect-title"
          className="mt-2 text-theme-xl font-bold tracking-tight text-ink-title dark:text-white"
        >
          Conecta tu WhatsApp Business
        </h2>
        <p className="mt-2 text-theme-sm leading-relaxed text-gray-500 dark:text-gray-400">
          Autorizas con Meta sin copiar claves: eliges con qué cuenta de negocio y con qué número
          quieres atender. Necto se encarga del resto.
        </p>

        <ul className="mt-6 space-y-4">
          {BENEFITS.map(benefit => (
            <li key={benefit.title} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full bg-whatsapp-50 text-whatsapp-600 dark:bg-whatsapp-500/15 dark:text-whatsapp-300">
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
              </span>
              <div className="min-w-0">
                <p className="text-theme-sm font-bold text-gray-900 dark:text-white">
                  {benefit.title}
                </p>
                <p className="text-theme-xs leading-relaxed text-gray-500 dark:text-gray-400">
                  {benefit.hint}
                </p>
              </div>
            </li>
          ))}
        </ul>

        {/* Acción al pie: `mt-auto` la ancla abajo cuando el panel verde es más alto. */}
        <div className="mt-auto space-y-3 pt-8">
          {contextNote && (
            <p className="text-theme-xs leading-relaxed text-gray-500 dark:text-gray-400">
              {contextNote}
            </p>
          )}

          {isConnected ? (
            /*
              Conectado. Se retiran el aviso de "todavía no está disponible" y el
              botón de conectar: los dos hablan de una acción que ya ocurrió, y
              dejarlos haría que la sección pareciera no haberse enterado.
            */
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-whatsapp-200 bg-whatsapp-50 p-3 dark:border-whatsapp-500/25 dark:bg-whatsapp-500/10">
              <p className="flex flex-wrap items-center gap-2 text-theme-xs font-bold text-whatsapp-700 dark:text-whatsapp-300">
                <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-whatsapp-500 text-white">
                  <Check className="h-3 w-3" strokeWidth={3.5} />
                </span>
                Canal conectado
                {isDemo && (
                  <span className="rounded-full bg-warning-100 px-2 py-0.5 font-bold text-warning-700 dark:bg-warning-900/40 dark:text-warning-300">
                    Demostración
                  </span>
                )}
              </p>
              {onDisconnect && (
                <button
                  type="button"
                  onClick={onDisconnect}
                  className="cursor-pointer rounded-full px-3 py-1.5 text-theme-xs font-bold text-error-600 transition-colors hover:bg-error-50 dark:text-error-400 dark:hover:bg-error-950/30"
                >
                  Desconectar
                </button>
              )}
            </div>
          ) : (
            <>
              {!metaAuthorizationAvailable && (
                <p className="flex items-start gap-2 rounded-xl bg-gray-50 p-3 text-theme-xs leading-relaxed text-gray-500 dark:bg-gray-800/60 dark:text-gray-400">
                  <Info className="mt-0.5 h-3.5 w-3.5 flex-none text-gray-400" />
                  <span>
                    La autorización con Meta necesita el servicio de Necto en el servidor y{" "}
                    <strong className="font-bold text-gray-700 dark:text-gray-200">
                      todavía no está disponible
                    </strong>
                    . Mientras tanto puedes dejar el canal en modo de demostración: la conexión se
                    guarda en la tienda, pero no recibirá mensajes reales.
                  </span>
                </p>
              )}

              <button
                type="button"
                onClick={onConnectDemo}
                disabled={isConnecting}
                className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-brand-500 px-6 py-3 text-theme-sm font-bold text-white transition-colors hover:bg-brand-600 disabled:opacity-50"
              >
                {isConnecting
                  ? "Guardando conexión…"
                  : metaAuthorizationAvailable
                  ? "Conectar con Meta"
                  : "Conectar en modo demostración"}
              </button>
            </>
          )}

          <p className="flex items-start gap-2 text-theme-xs leading-relaxed text-gray-500 dark:text-gray-400">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 flex-none text-gray-400" />
            <span>
              Conexión oficial vía Meta y credenciales en el servidor de Necto, nunca en el navegador.{" "}
              {/*
                Enlace en pestaña nueva a propósito: en Ajustes hay cambios sin
                guardar y en el alta hay un asistente a medias; navegar en la misma
                pestaña los tiraría. `target="_blank"` no puede romper el flujo.
              */}
              <a
                href="/ayuda"
                target="_blank"
                rel="noreferrer"
                className="font-bold text-gray-700 underline transition-colors hover:text-brand-500 dark:text-gray-300 dark:hover:text-brand-400"
              >
                ¿Necesitas ayuda? Visita nuestro centro de ayuda
              </a>
            </span>
          </p>
        </div>
      </div>

      {/* ── Panel de marca ── */}
      <div className="relative flex flex-col items-center justify-center gap-7 overflow-hidden bg-whatsapp-900 p-8 md:p-10">
        <WhatsAppDoodlePattern id={patternId} />

        <div className="relative flex w-full max-w-[320px] flex-col items-center gap-5">
          <WhatsAppHeroArt />
          <div className="space-y-0.5 text-center">
            <p className="text-theme-sm font-bold text-white">Asistente Necto</p>
            <p className="text-theme-xs text-whatsapp-200">Nos cruzamos, nos unimos, crecemos</p>
          </div>
        </div>

        {/*
          Firma de la integración: logotipo de Necto × logotipo del canal. Es lo
          que dice *quién* conecta con *qué*, que un rótulo de texto solo no dice.

          El logotipo de Necto va en su versión blanca porque este panel es una
          superficie oscura **en los dos temas**: la variante a color esconde la
          "E" (#15008B) sobre el verde. Es la misma regla que sigue el sidebar.
        */}
        <div className="relative flex flex-col items-center gap-3">
          <div className="flex items-center gap-4" role="img" aria-label="Necto con WhatsApp">
            <img
              src="/images/logo/necto-full-white.svg"
              alt=""
              className="h-6 w-auto select-none"
            />
            {/*
              El separador es el signo de multiplicar (×), no una "x": es la
              notación de un lockup de integración. Va en `white/60` porque a
              `white/40` desaparecía sobre el verde y el lockup se leía como dos
              logotipos sueltos, que es justo lo que la "×" viene a decir.
            */}
            <span aria-hidden="true" className="text-theme-xl font-light leading-none text-white/60">
              ×
            </span>
            <WhatsAppLogo className="h-8 w-8 flex-none" />
          </div>
          <p className="text-theme-xs font-bold uppercase tracking-[0.18em] text-white/75">
            WhatsApp Business
          </p>
        </div>
      </div>
    </div>
  );
};
