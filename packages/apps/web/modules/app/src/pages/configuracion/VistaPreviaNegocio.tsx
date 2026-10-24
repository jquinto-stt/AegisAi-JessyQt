import type { FC } from "react";

import { slugDe } from "@/stores/organizacion.store";

/**
 * Vista previa de la identidad del negocio.
 *
 * ── Qué es y qué NO es ────────────────────────────────────────────────────
 *
 * Pinta, con los valores del BORRADOR (no de lo guardado), lo que el negocio
 * va a mostrar en las superficies de identidad: el selector de negocio de la
 * cabecera y —cuando exista— su perfil público. No promete un mercado ni un
 * catálogo público: eso no existe todavía en Necto y decirlo aquí sería vender
 * una pantalla que nadie va a ver.
 *
 * ── Por qué la portada es oscura por defecto ──────────────────────────────
 *
 * El concepto original traía una franja de portada. Sin imagen, se pinta un
 * degradado oscuro con un halo: da el contraste que necesita el logo circular
 * para recortarse, y deja ver de un vistazo que ahí FALTA una imagen, en vez de
 * un hueco blanco que se lee como un error de carga.
 *
 * ── Datos reales, no métricas de adorno ───────────────────────────────────
 *
 * El concepto mostraba un cuadro de reputación con pedidos, ventas y tiempos.
 * Aquí no hay mercado ni reseñas, así que esas cifras serían inventadas. En su
 * lugar van los cinco datos que sí existen y sí se guardan: país, moneda, zona
 * horaria, tamaño del equipo e identificador web.
 */
export interface VistaPreviaNegocioProps {
  nombre: string;
  descripcion: string;
  sitioWeb: string;
  logoUrl: string;
  portadaUrl: string;
  pais: string;
  moneda: string;
  zonaHoraria: string;
  tipoEmpresa: string;
  tamanoEquipo: string;
}

/** Iniciales del nombre, para cuando no hay logo. Nunca más de dos letras. */
function inicialesDe(nombre: string): string {
  const palabras = nombre.trim().split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return "?";
  const primera = palabras[0]?.[0] ?? "";
  const segunda = palabras.length > 1 ? (palabras[1]?.[0] ?? "") : "";
  return `${primera}${segunda}`.toUpperCase();
}

/** Un dato de la franja inferior. Etiqueta arriba, valor abajo. */
const Dato: FC<{ etiqueta: string; valor: string }> = ({ etiqueta, valor }) => (
  <div className="min-w-0">
    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
      {etiqueta}
    </p>
    <p className="mt-0.5 truncate text-[13px] font-semibold text-[#212121] dark:text-gray-200" title={valor}>
      {valor || "—"}
    </p>
  </div>
);

export const VistaPreviaNegocio: FC<VistaPreviaNegocioProps> = ({
  nombre,
  descripcion,
  sitioWeb,
  logoUrl,
  portadaUrl,
  pais,
  moneda,
  zonaHoraria,
  tipoEmpresa,
  tamanoEquipo,
}) => {
  const rubro = tipoEmpresa || "Rubro sin definir";

  return (
    <section
      aria-label="Vista previa de la identidad del negocio"
      className="overflow-hidden rounded-3xl border border-[#ECECEC] bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900"
    >
      {/* ── PORTADA ─────────────────────────────────────────────────────── */}
      <div className="relative h-36 bg-[#1F2023] sm:h-44">
        {portadaUrl.trim() ? (
          <img src={portadaUrl} alt="Portada del negocio" className="h-full w-full object-cover" />
        ) : (
          <div
            className="h-full w-full"
            style={{
              backgroundImage:
                "radial-gradient(120% 140% at 50% 0%, rgba(151,214,223,0.22) 0%, rgba(25,0,136,0.28) 45%, rgba(31,32,35,0) 78%)",
            }}
          />
        )}

        <span className="absolute left-4 top-4 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
          Vista previa
        </span>
      </div>

      {/* ── IDENTIDAD ───────────────────────────────────────────────────── */}
      {/*
        El bloque lleva `relative` a propósito: la portada de arriba también lo
        es, y un elemento posicionado pinta POR ENCIMA del contenido estático que
        viene después en el DOM. Sin esto, el círculo del logo —que se monta
        sobre el borde de la portada con `-top-10`— quedaba recortado por la
        franja oscura y solo asomaban las letras por debajo.
      */}
      <div className="relative px-6 pb-6 sm:px-8">
        <span className="absolute -top-10 left-6 z-10 flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-black/[0.06] bg-white text-lg font-bold text-[#190088] ring-4 ring-white dark:border-white/10 dark:bg-gray-800 dark:text-white dark:ring-gray-900 sm:left-8">
          {logoUrl.trim() ? (
            <img src={logoUrl} alt="Logo del negocio" className="h-full w-full object-cover" />
          ) : (
            inicialesDe(nombre)
          )}
        </span>

        <div className="min-w-0 pl-24 pt-1">
          <h3 className="truncate text-[20px] font-bold leading-tight text-[#190088] dark:text-white sm:text-[24px]">
            {nombre.trim() || "Nombre de tu negocio"}
          </h3>
          <p className="truncate text-[13px] text-[#212121]/70 dark:text-gray-400">
            {rubro}
            {tamanoEquipo ? ` · ${tamanoEquipo}` : ""}
          </p>
        </div>

        {descripcion.trim() && (
          <p className="mt-4 line-clamp-3 text-[14px] text-[#212121]/80 dark:text-gray-300">
            {descripcion}
          </p>
        )}

        {sitioWeb.trim() && (
          <a
            href={sitioWeb}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-3 inline-block truncate text-[13px] font-semibold text-brand-600 hover:underline dark:text-brand-400"
          >
            {sitioWeb}
          </a>
        )}

        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-[#ECECEC] pt-5 dark:border-gray-800 sm:grid-cols-4">
          <Dato etiqueta="País" valor={pais} />
          <Dato etiqueta="Moneda" valor={moneda} />
          <Dato etiqueta="Zona horaria" valor={zonaHoraria} />
          <Dato etiqueta="Identificador" valor={`necto.app/${slugDe(nombre)}`} />
        </div>
      </div>
    </section>
  );
};

export default VistaPreviaNegocio;
