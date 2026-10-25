import React, { useState, useEffect } from "react";
import { observer } from "mobx-react-lite";
import QRCode from "qrcode";
import {
  ArrowDownTrayIcon,
  ArrowTopRightOnSquareIcon,
  CheckIcon,
  ClipboardDocumentIcon,
} from "@heroicons/react/24/outline";
import { organizacionStore, slugDe } from "@/stores/organizacion.store";

interface TarjetaQrTiendaProps {
  nombre?: string;
  slug?: string;
  subtitulo?: string;
  className?: string;
}

/**
 * Tarjeta de URL y Código QR del negocio.
 * Réplica exacta del diseño de referencia QueryPal:
 *  - Fondo uniforme celeste/cian pastel (#D7E6EB).
 *  - Contornos oscuros precisos (#1A153A) con esquinas redondeadas.
 *  - Panel izquierdo con Isotipo Hexagonal + Nombre de la tienda y pregunta destacada.
 *  - Panel derecho con contenedor asimétrico y Código QR enmarcado en blanco con borde oscuro.
 */
export const TarjetaQrTienda: React.FC<TarjetaQrTiendaProps> = observer(({
  nombre,
  slug,
  subtitulo,
  className = "",
}) => {
  const org = organizacionStore.organizacion;
  const nombreTienda = (nombre || org?.nombre || "Necto").trim();
  const slugTienda = slug || slugDe(nombreTienda);

  const origin = typeof window !== "undefined" ? window.location.origin : "https://necto.app";
  const urlReal = `${origin}/catalogo-clientes?org=${slugTienda}`;
  const urlAmigable = `necto.app/${slugTienda}`;

  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    let activo = true;

    QRCode.toDataURL(urlReal, {
      width: 512,
      margin: 1,
      color: {
        dark: "#1A153A", // Morado / azul marino profundo idéntico a QueryPal
        light: "#FFFFFF",
      },
      errorCorrectionLevel: "H",
    })
      .then((dataUri) => {
        if (activo) setQrDataUrl(dataUri);
      })
      .catch((err) => console.error("[TarjetaQrTienda] Error generando QR:", err));

    return () => {
      activo = false;
    };
  }, [urlReal]);

  const copiarEnlace = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(urlReal);
      }
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2400);
    } catch {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2400);
    }
  };

  const pregunta =
    subtitulo?.trim() ||
    "¿Cuánto podría el catálogo digital de tu negocio reducir tiempos y costos de pedidos?";

  return (
    <div className={`w-full font-['DM_Sans',sans-serif] ${className}`}>
      {/* ── TARJETA PRINCIPAL ESTILO QUERYPAL ── */}
      <div className="relative w-full rounded-[36px] bg-[#D7E6EB] dark:bg-[#14202A] p-3 sm:p-4 border-2 border-[#1A153A] dark:border-white/20 shadow-md select-none transition-all overflow-hidden">
        <div className="flex flex-col lg:flex-row items-stretch gap-3">
          
          {/* ── PANEL IZQUIERDO: Identidad + Pregunta destacada ── */}
          <div className="relative flex-1 rounded-[28px] border-2 border-[#1A153A] dark:border-white/20 p-7 sm:p-10 flex flex-col justify-between min-h-[260px] sm:min-h-[300px]">
            {/* Cabecera: Isotipo Hexagonal + Nombre de Marca */}
            <div>
              <div className="flex items-center gap-4">
                {/* Isotipo Hexagonal estilo QueryPal con el símbolo de Necto */}
                <svg
                  className="w-13 h-13 sm:w-16 sm:h-16 shrink-0 drop-shadow-xs"
                  viewBox="0 0 64 64"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  {/* Hexágono exterior delineado */}
                  <path
                    d="M32 4.5L55 17.8V44.2L32 57.5L9 44.2V17.8L32 4.5Z"
                    stroke="#1A153A"
                    strokeWidth="4.5"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    className="dark:stroke-white"
                  />
                  {/* Hexágono interior sólido */}
                  <path
                    d="M32 13L47.5 22V40L32 49L16.5 40V22L32 13Z"
                    fill="#1A153A"
                    className="dark:fill-white"
                  />
                  {/* Dos cápsulas verticales */}
                  <rect
                    x="25"
                    y="25"
                    width="4"
                    height="10"
                    rx="2"
                    fill="#FFFFFF"
                    className="dark:fill-[#14202A]"
                  />
                  <rect
                    x="35"
                    y="22"
                    width="4"
                    height="10"
                    rx="2"
                    fill="#FFFFFF"
                    className="dark:fill-[#14202A]"
                  />
                </svg>

                {/* Nombre de la Marca */}
                <h2 className="text-[32px] sm:text-[44px] font-bold text-[#1A153A] dark:text-white tracking-tight leading-none truncate">
                  {nombreTienda}
                </h2>
              </div>

              {/* Pregunta Titular Destacada */}
              <p className="mt-8 sm:mt-12 text-[20px] sm:text-[26px] lg:text-[28px] font-medium text-[#1A153A] dark:text-gray-100 max-w-[620px] leading-snug tracking-tight">
                {pregunta}
              </p>
            </div>

            {/* URL amigable sutil al pie del panel */}
            <div className="mt-6 pt-4 flex items-center gap-2 text-[14px] font-semibold text-[#1A153A]/70 dark:text-white/60">
              <span className="font-mono text-[#1A153A] dark:text-[#97D6DF] font-bold">
                {urlAmigable}
              </span>
            </div>
          </div>

          {/* ── PANEL DERECHO: Marco asimétrico con Código QR en blanco ── */}
          <div className="w-full lg:w-[270px] xl:w-[310px] shrink-0 rounded-[28px] border-2 border-[#1A153A] dark:border-white/20 p-6 sm:p-8 flex flex-col items-center justify-center relative">
            {/* Contenedor del Código QR blanco con borde oscuro grueso */}
            <div
              onClick={copiarEnlace}
              title="Haz clic para copiar el enlace directo"
              className="bg-white rounded-[24px] sm:rounded-[28px] border-[2.5px] border-[#1A153A] p-3 sm:p-4 shadow-sm flex flex-col items-center justify-center cursor-pointer transition-transform hover:scale-[1.02] active:scale-98"
            >
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`Código QR de ${nombreTienda}`}
                  className="w-40 h-40 sm:w-48 sm:h-48 object-contain rounded-xl"
                />
              ) : (
                <div className="w-40 h-40 sm:w-48 sm:h-48 flex items-center justify-center text-[#1A153A]">
                  <span className="text-[12px] font-bold">Generando QR...</span>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* ── BARRA DE UTILIDAD / DESCARGA INFERIOR DISCRETA ── */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-2 text-[12px]">
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
          <span>Escanea con la cámara de cualquier teléfono para abrir el catálogo.</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Botón copiar URL */}
          <button
            type="button"
            onClick={copiarEnlace}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-[#1A153A] dark:text-white font-bold border border-gray-200 dark:border-gray-700 shadow-2xs transition-all active:scale-95 cursor-pointer"
          >
            {copiado ? (
              <>
                <CheckIcon className="w-3.5 h-3.5 text-[#10B981] stroke-[2.5]" />
                <span className="text-[#10B981]">¡URL Copiada!</span>
              </>
            ) : (
              <>
                <ClipboardDocumentIcon className="w-3.5 h-3.5 text-gray-500" />
                <span>Copiar URL</span>
              </>
            )}
          </button>

          {/* Botón descargar QR imprimible */}
          {qrDataUrl && (
            <a
              href={qrDataUrl}
              download={`qr-${slugTienda}.png`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-[#1A153A] dark:text-white font-bold border border-gray-200 dark:border-gray-700 shadow-2xs transition-all active:scale-95 cursor-pointer"
            >
              <ArrowDownTrayIcon className="w-3.5 h-3.5 text-gray-500" />
              <span>Descargar PNG</span>
            </a>
          )}

          {/* Botón Abrir tienda */}
          <a
            href={urlReal}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#1A153A] hover:bg-[#14102e] text-white font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <span>Ver Tienda</span>
            <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
});

export default TarjetaQrTienda;
