import { useEffect, useRef, useState } from "react";
import { Cog6ToothIcon, StarIcon, TruckIcon, XMarkIcon } from "@heroicons/react/24/outline";

import { Switch } from "@/elements/form/switch";
import { TRANSPORTADORAS, type Transportadora } from "@/domain/pedidos/transportadoras.catalogo";
import {
  conFavorita,
  conHabilitacion,
  estaHabilitada,
  type PreferenciasTransportadoras,
} from "@/domain/pedidos/transportadoras.seleccion";

// ═══════════════════════════════════════════════════════════════════════════
// TRANSPORTADORAS — el apartado de Ajustes de pedidos
// ═══════════════════════════════════════════════════════════════════════════
//
// Responde a dos preguntas distintas y por eso hay DOS controles por tarjeta:
//
//   · ¿Con cuáles despacho?  → el interruptor de la tarjeta. Apagada, la
//     transportadora deja de ofrecerse en las cotizaciones de envío.
//   · ¿Cuál prefiero?        → el engranaje → la ventana → el interruptor verde.
//
// ── Por qué la favorita no es un segundo interruptor en la tarjeta ────────
//
// Porque «favorita» es excluyente y «habilitada» no: seis interruptores
// independientes en una rejilla se leen como seis decisiones sueltas, y una
// preferencia única escondida entre ellos se marcaría por accidente. Detrás del
// engranaje es una decisión deliberada, y el engranaje deja sitio para explicar
// qué hace la estrella.
//
// ── La estrella va ARRIBA del logo, no en una esquina ─────────────────────
//
// El logo es lo único que el ojo usa para reconocer la tarjeta de un vistazo;
// una insignia encima de él se lee como parte de la marca, en la esquina
// competiría con el engranaje y con el interruptor.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Recuadro del logo.
 *
 * Mismo criterio de fondo que el formulario de creación de pedidos: los logos
 * vienen en dos familias —tinta oscura y blanco puro— y el recuadro es lo que
 * evita que uno de los dos desaparezca según el tema. La imagen se limita con
 * `max-h-full max-w-full` en vez de estirarse al recuadro: los recortes van de
 * 5:1 (Coordinadora) a cuadrado (Servientrega), y forzarlos al mismo tamaño
 * agranda unos y aplasta otros.
 */
function RecuadroLogo({ transportadora }: { transportadora: Transportadora }) {
  const fondo = !transportadora.logo
    ? "bg-[#ECECEC]/70 dark:bg-white/[0.08]"
    : transportadora.fondoLogo === "oscuro"
      ? "bg-[#212121] ring-1 ring-black/10 dark:ring-white/15"
      : "bg-white ring-1 ring-[#ECECEC] dark:bg-white/90 dark:ring-white/10";

  return (
    <span
      className={`flex h-11 w-full items-center justify-center overflow-hidden rounded-lg px-3 ${fondo}`}
    >
      {transportadora.logo ? (
        <img
          src={transportadora.logo}
          alt=""
          loading="lazy"
          // `max-h-8` deja aire arriba y abajo: al límite del recuadro, el
          // wordmark de Coordinadora toca el borde y parece recortado.
          className="max-h-8 max-w-full object-contain"
        />
      ) : (
        <TruckIcon className="size-5 text-[#212121]/35 dark:text-white/40" aria-hidden="true" />
      )}
    </span>
  );
}

interface VentanaProps {
  transportadora: Transportadora;
  favorita: boolean;
  habilitada: boolean;
  onFavorita: (valor: boolean) => void;
  onCerrar: () => void;
}

/**
 * Ventana de opciones de una transportadora.
 *
 * Se cierra con la ✕, con `Escape` o pulsando fuera. Las tres salidas son la
 * misma: aquí no se confirma nada al cerrar —cada interruptor ya se aplicó—,
 * así que cerrar no puede perder trabajo y no hace falta un «Cancelar».
 */
function Ventana({
  transportadora,
  favorita,
  habilitada,
  onFavorita,
  onCerrar,
}: VentanaProps) {
  const cerrarRef = useRef<HTMLButtonElement>(null);

  // El efecto se monta UNA vez. Con `onCerrar` en las dependencias se volvía a
  // ejecutar en cada render del padre —que ocurre justo al mover el interruptor—
  // y el foco saltaba de vuelta a la ✕ después de cada clic.
  const onCerrarRef = useRef(onCerrar);
  onCerrarRef.current = onCerrar;

  useEffect(() => {
    cerrarRef.current?.focus();
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrarRef.current();
    };
    document.addEventListener("keydown", alPulsar);
    return () => document.removeEventListener("keydown", alPulsar);
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#212121]/45 p-4 backdrop-blur-[2px]"
      onClick={onCerrar}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`opciones-${transportadora.id}`}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-[#ECECEC] bg-white p-5 shadow-xl dark:border-white/10 dark:bg-gray-900"
      >
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3
              id={`opciones-${transportadora.id}`}
              className="truncate text-theme-sm font-bold text-[#212121] dark:text-white"
            >
              {transportadora.nombre}
            </h3>
            <p className="mt-0.5 text-[11px] font-normal text-[#212121]/50 dark:text-white/45">
              Preferencias de esta transportadora
            </p>
          </div>
          <button
            ref={cerrarRef}
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="-mr-1 -mt-1 flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[#212121]/50 transition-colors hover:bg-[#ECECEC]/60 hover:text-[#212121] dark:text-white/45 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <XMarkIcon className="size-5" aria-hidden="true" />
          </button>
        </header>

        <div className="mt-4 rounded-xl border border-[#ECECEC] p-3.5 dark:border-white/10">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-theme-xs font-bold text-[#212121] dark:text-white">
                Usar como favorita
              </p>
              <p className="mt-0.5 text-[11px] font-normal leading-snug text-[#212121]/55 dark:text-white/45">
                {habilitada
                  ? "Se propone primero al cotizar un envío. Solo puede haber una favorita."
                  : "Habilita la transportadora para poder marcarla como favorita."}
              </p>
            </div>
            <Switch
              checked={favorita}
              onChange={onFavorita}
              disabled={!habilitada}
              color="success"
              aria-label={`Marcar ${transportadora.nombre} como favorita`}
            />
          </div>
        </div>

        {favorita && (
          <p className="mt-3 flex items-start gap-1.5 text-[11px] font-normal leading-snug text-[#212121]/60 dark:text-white/50">
            <StarIcon
              className="mt-px size-3.5 shrink-0 fill-warning-400 text-warning-400"
              aria-hidden="true"
            />
            Al cerrar verás la estrella amarilla sobre el logo de {transportadora.nombre}.
          </p>
        )}
      </div>
    </div>
  );
}

interface Props {
  prefs: PreferenciasTransportadoras;
  onCambio: (prefs: PreferenciasTransportadoras) => void;
}

/**
 * Rejilla de transportadoras del negocio, con habilitación y favorita.
 *
 * Es un componente controlado: no guarda nada. El borrador de Ajustes es el
 * único dueño del valor hasta que se pulsa «Guardar cambios», igual que el
 * resto de las secciones — así «Descartar cambios» también deshace esto.
 */
export function TransportadorasAjustes({ prefs, onCambio }: Props) {
  const [abierta, setAbierta] = useState<string | null>(null);

  const favoritaId = prefs.favorita ?? null;
  const disponibles = TRANSPORTADORAS.filter((t) => estaHabilitada(prefs, t.id)).length;

  return (
    <div>
      <p className="text-[11px] font-normal text-[#212121]/55 dark:text-white/45">
        {disponibles} de {TRANSPORTADORAS.length} disponibles para cotizar envíos.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {TRANSPORTADORAS.map((t) => {
          const habilitada = estaHabilitada(prefs, t.id);
          const favorita = favoritaId === t.id;

          return (
            <article
              key={t.id}
              className={`relative rounded-2xl border p-3.5 transition-colors ${
                habilitada
                  ? "border-[#ECECEC] bg-white dark:border-white/10 dark:bg-gray-900"
                  : "border-dashed border-[#ECECEC] bg-[#FAFAF9] dark:border-white/10 dark:bg-white/[0.02]"
              }`}
            >
              <button
                type="button"
                onClick={() => setAbierta(t.id)}
                aria-label={`Opciones de ${t.nombre}`}
                className="absolute right-2 top-2 flex size-8 cursor-pointer items-center justify-center rounded-lg text-[#212121]/45 transition-colors hover:bg-[#ECECEC]/60 hover:text-[#212121] dark:text-white/40 dark:hover:bg-white/10 dark:hover:text-white"
              >
                <Cog6ToothIcon className="size-4" aria-hidden="true" />
              </button>

              {/* La franja de la estrella ocupa altura siempre: así los logos de
                  las seis tarjetas quedan alineados, con favorita o sin ella. */}
              <div className="flex h-5 items-center justify-center">
                {favorita && (
                  <StarIcon
                    className="size-4 fill-warning-400 text-warning-400"
                    role="img"
                    aria-label="Transportadora favorita"
                  />
                )}
              </div>

              <div className="mt-1">
                <RecuadroLogo transportadora={t} />
              </div>

              <p className="mt-2 truncate text-theme-xs font-bold text-[#212121] dark:text-white">
                {t.nombre}
              </p>
              <p className="mt-0.5 text-[11px] font-normal text-[#212121]/50 dark:text-white/40">
                {habilitada ? "Disponible" : "No disponible"}
              </p>

              <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#ECECEC] pt-2.5 dark:border-white/10">
                <span className="text-[11px] font-medium text-[#212121]/60 dark:text-white/50">
                  Cotizar envíos
                </span>
                <Switch
                  checked={habilitada}
                  onChange={(valor) => onCambio(conHabilitacion(prefs, t.id, valor))}
                  color="orange"
                  aria-label={`${habilitada ? "Deshabilitar" : "Habilitar"} ${t.nombre}`}
                />
              </div>
            </article>
          );
        })}
      </div>

      {abierta && (
        <Ventana
          transportadora={TRANSPORTADORAS.find((t) => t.id === abierta) ?? TRANSPORTADORAS[0]}
          favorita={favoritaId === abierta}
          habilitada={estaHabilitada(prefs, abierta)}
          onFavorita={(valor) => onCambio(conFavorita(prefs, valor ? abierta : null))}
          onCerrar={() => setAbierta(null)}
        />
      )}
    </div>
  );
}

export default TransportadorasAjustes;
