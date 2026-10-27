import { observer } from "mobx-react-lite";
import { ArrowTopRightOnSquareIcon, MapPinIcon, PencilSquareIcon } from "@heroicons/react/24/outline";

import {
  DIAS_SEMANA,
  ETIQUETA_RANGO,
  HORARIO_RANGO,
  INICIAL_DIA,
  frecuenciaLegible,
  type ConfiguracionFija,
} from "@/domain/pedidos/recolecciones.domain";
import { transportadoraPorNombre } from "@/domain/pedidos/transportadoras.catalogo";

// ═══════════════════════════════════════════════════════════════════════════
// TARJETA DE UNA RECOLECCIÓN FIJA
// ═══════════════════════════════════════════════════════════════════════════
//
// La tarjeta responde a «¿cómo está configurada esta recolección?» de un vistazo:
// quién pasa, qué días, en qué franja y desde dónde. El interruptor pausa la
// regla sin borrarla —una recolección que se detiene un mes no es una
// recolección que ya no existe— y «Editar» abre la pantalla de configuración.
//
// ── Por qué no hay mapa incrustado ────────────────────────────────────────
//
// El diseño de referencia lleva un mapa de Google en la mitad derecha. Meterlo
// exige una clave de API, una cuenta de facturación y una decisión sobre enviar
// las direcciones de las bodegas a un tercero; nada de eso está tomado. Mientras
// no lo esté, la dirección se lee como texto y lleva a Maps en otra pestaña, que
// resuelve la misma pregunta sin ceder el dato ni romper la página si el mapa no
// carga.
// ═══════════════════════════════════════════════════════════════════════════

/** Enlace a Maps por consulta de texto: no necesita clave ni coordenadas. */
function urlMapa(direccion: string, bodega: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${direccion}, ${bodega}`)}`;
}

/** Un rótulo pequeño y su contenido, el bloque del que se compone la tarjeta. */
const Bloque = ({
  etiqueta,
  children,
}: {
  etiqueta: string;
  children: React.ReactNode;
}) => (
  <div className="min-w-0">
    <p className="text-[10px] font-bold uppercase tracking-wider text-[#212121]/40 dark:text-white/35">
      {etiqueta}
    </p>
    <div className="mt-1.5">{children}</div>
  </div>
);

/** Interruptor de pausa. Es un `switch` de verdad, no una casilla disfrazada. */
const Interruptor = ({
  activa,
  onCambiar,
  etiqueta,
}: {
  activa: boolean;
  onCambiar: () => void;
  etiqueta: string;
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={activa}
    aria-label={etiqueta}
    onClick={onCambiar}
    className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${
      activa ? "bg-success-500" : "bg-[#ECECEC] dark:bg-white/15"
    }`}
  >
    <span
      className={`absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-all ${
        activa ? "left-[22px]" : "left-0.5"
      }`}
    />
  </button>
);

interface Props {
  configuracion: ConfiguracionFija;
  onEditar: () => void;
  onAlternar: () => void;
}

export const TarjetaRecoleccionFija = observer(
  ({ configuracion: c, onEditar, onAlternar }: Props) => {
    const transportadora = transportadoraPorNombre(c.transportadora);
    const dias = frecuenciaLegible(c.dias);

    return (
      <article
        className={`rounded-2xl border border-[#ECECEC] bg-white p-5 transition-colors dark:border-white/10 dark:bg-gray-900 ${
          c.activa ? "" : "opacity-70"
        }`}
      >
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            {transportadora?.logo ? (
              // `w-auto` + `max-h-4`: los logos ya no son todos cuadrados —el de
              // Servientrega pasó a ser un wordmark de 5,4:1— y con una altura
              // fija y un ancho máximo de 54 px se quedaba en una tira de 10 px
              // de alto. Ahora manda la altura y el ancho la acompaña.
              <img
                src={transportadora.logo}
                alt=""
                className="h-4 w-auto max-w-[92px] object-contain"
              />
            ) : (
              <span className="size-1.5 rounded-full bg-[#97D6DF]" aria-hidden="true" />
            )}
            <div className="min-w-0">
              <p className="truncate text-theme-sm font-bold text-[#212121] dark:text-white">
                {c.transportadora}
              </p>
              <p className="text-[11px] font-normal text-[#212121]/45 dark:text-white/40">
                {c.activa ? "Activa" : "Pausada"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Interruptor
              activa={c.activa}
              onCambiar={onAlternar}
              etiqueta={`${c.activa ? "Pausar" : "Activar"} la recolección de ${c.transportadora}`}
            />
            <button
              type="button"
              onClick={onEditar}
              className="flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-[#ECECEC] px-3 text-theme-xs font-bold text-[#212121] transition-colors hover:border-[#FF3F1A] hover:text-[#FF3F1A] dark:border-white/15 dark:text-white/85 dark:hover:border-[#FF3F1A] dark:hover:text-[#FF3F1A]"
            >
              <PencilSquareIcon className="size-4" aria-hidden="true" />
              Editar
            </button>
          </div>
        </header>

        <div className="mt-5 grid grid-cols-1 gap-x-6 gap-y-5 border-t border-[#ECECEC] pt-4 sm:grid-cols-2 lg:grid-cols-4 dark:border-white/10">
          <Bloque etiqueta="Bodega">
            <p className="truncate text-theme-xs font-bold text-[#212121] dark:text-white">
              {c.bodega}
            </p>
            <p className="mt-0.5 text-[11px] font-normal leading-snug text-[#212121]/55 dark:text-white/45">
              {c.direccion}
            </p>
            <a
              href={urlMapa(c.direccion, c.bodega)}
              target="_blank"
              rel="noreferrer"
              className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-[#FF3F1A] hover:underline"
            >
              <MapPinIcon className="size-3.5" aria-hidden="true" />
              Ver en el mapa
              <ArrowTopRightOnSquareIcon className="size-3" aria-hidden="true" />
            </a>
          </Bloque>

          <Bloque etiqueta="Horario de recolección">
            <p className="text-theme-xs font-bold text-[#212121] dark:text-white">
              {ETIQUETA_RANGO[c.rango]}: {HORARIO_RANGO[c.rango]}
            </p>
            <p className="mt-0.5 text-[11px] font-normal text-[#212121]/55 dark:text-white/45">
              Franja que asigna la transportadora
            </p>
          </Bloque>

          <Bloque etiqueta="Días programados">
            <div className="flex items-center gap-1">
              {DIAS_SEMANA.map((dia) => {
                const activo = c.dias.includes(dia);
                return (
                  <span
                    key={dia}
                    title={dia}
                    aria-label={dia}
                    className={`flex size-6 items-center justify-center rounded-full text-[10px] font-bold ${
                      activo
                        ? "bg-[#212121] text-white dark:bg-white dark:text-[#212121]"
                        : "border border-[#ECECEC] text-[#212121]/25 dark:border-white/15 dark:text-white/20"
                    }`}
                  >
                    {INICIAL_DIA[dia]}
                  </span>
                );
              })}
            </div>
            <p className="mt-1.5 text-[11px] font-normal text-[#212121]/55 dark:text-white/45">
              {dias}
            </p>
          </Bloque>

          <Bloque etiqueta="Persona que despacha">
            <p className="truncate text-theme-xs font-bold text-[#212121] dark:text-white">
              {c.despachaNombre} {c.despachaApellidos}
            </p>
            <p className="mt-0.5 text-[11px] font-normal text-[#212121]/55 dark:text-white/45">
              {c.paquetes} {c.paquetes === 1 ? "paquete" : "paquetes"} por recolección
            </p>
          </Bloque>
        </div>

        {c.notas && (
          <p className="mt-4 rounded-xl bg-[#EFE6D3]/50 px-3 py-2 text-[11px] font-normal leading-relaxed text-[#212121]/75 dark:bg-[#EFE6D3]/10 dark:text-[#EFE6D3]/85">
            {c.notas}
          </p>
        )}
      </article>
    );
  },
);
