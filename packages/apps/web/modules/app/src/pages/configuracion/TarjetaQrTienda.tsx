import React, { useState, useEffect } from "react";
import { observer } from "mobx-react-lite";
import QRCode from "qrcode";
import {
  ArrowDownTrayIcon,
  ArrowTopRightOnSquareIcon,
  CheckIcon,
  ClipboardDocumentIcon,
  GlobeAltIcon,
  QrCodeIcon,
} from "@heroicons/react/24/outline";
import { organizacionStore, slugDe } from "@/stores/organizacion.store";

interface TarjetaQrTiendaProps {
  nombre?: string;
  slug?: string;
  subtitulo?: string;
  className?: string;
}

/**
 * Tarjeta promocional de la URL de la Tienda con Código QR dinámico.
 * Réplica exacta del estilo QueryPal:
 *   - Fondo menta / cyan claro (#E8F3F6 / NECTO Cyan #97D6DF).
 *   - Identidad de marca a la izquierda con eslogan invitacional.
 *   - Contenedor asimétrico a la derecha con Código QR escaneable y descargable.
 */
export const TarjetaQrTienda: React.FC<TarjetaQrTiendaProps> = observer(({
  nombre,
  slug,
  subtitulo,
  className = "",
}) => {
  const org = organizacionStore.organizacion;
  const nombreTienda = (nombre || org?.nombre || "Tu Tienda").trim();
  const slugTienda = slug || slugDe(nombreTienda);

  // Origen para el enlace real del catálogo
  const origin = typeof window !== "undefined" ? window.location.origin : "https://necto.app";
  const urlReal = `${origin}/catalogo-clientes?org=${slugTienda}`;
  const urlAmigable = `necto.app/${slugTienda}`;

  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copiado, setCopiado] = useState(false);

  // Generación reactiva del código QR en alta resolución
  useEffect(() => {
    let activo = true;

    QRCode.toDataURL(urlReal, {
      width: 480,
      margin: 1,
      color: {
        dark: "#190088", // Azul profundo NECTO
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
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    }
  };

  return (
    <div
      className={`relative w-full rounded-[32px] p-2.5 sm:p-3 bg-[#EAF5F8] dark:bg-[#13222B] border border-[#97D6DF]/70 dark:border-white/10 shadow-md font-['DM_Sans',sans-serif] text-[#212121] dark:text-white transition-all overflow-hidden ${className}`}
    >
      <div className="flex flex-col lg:flex-row items-stretch gap-3">
        {/* ── PANEL IZQUIERDO: Identidad, llamada a la acción y enlace ── */}
        <div className="flex-1 rounded-[26px] bg-white/70 dark:bg-white/[0.04] p-6 sm:p-8 flex flex-col justify-between border border-[#97D6DF]/30 dark:border-white/5 relative">
          <div>
            {/* Cabecera con Logotipo de Tienda / Isotipo Hexagonal NECTO */}
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl bg-[#190088] text-white shadow-md">
                <img
                  src="/images/logo/necto-icon-white.svg"
                  alt="Necto"
                  className="h-7 w-7 sm:h-8 sm:w-8 object-contain"
                />
              </div>
              <div className="min-w-0">
                <h2 className="text-[26px] sm:text-[32px] font-bold text-[#190088] dark:text-white tracking-tight leading-none truncate">
                  {nombreTienda}
                </h2>
                <div className="flex items-center gap-1.5 mt-1 text-[11px] font-semibold text-[#10B981]">
                  <span className="h-2 w-2 rounded-full bg-[#10B981] animate-pulse" />
                  <span>Tienda activa en línea</span>
                </div>
              </div>
            </div>

            {/* Texto de llamado principal estilo QueryPal */}
            <p className="text-[17px] sm:text-[21px] font-bold text-[#190088] dark:text-gray-100 mt-6 sm:mt-8 leading-snug tracking-tight">
              {subtitulo || "¿Quieres que tus clientes hagan pedidos y exploren tu catálogo digital?"}
            </p>

            <p className="text-[13px] sm:text-[14px] font-normal text-[#212121]/70 dark:text-gray-300 mt-2 leading-relaxed">
              Comparte el enlace directo o exhibe el código QR en tu mostrador físico, redes sociales y empaques para recibir compras directas.
            </p>
          </div>

          {/* Barra de URL amigable y botones de acción */}
          <div className="mt-6 pt-5 border-t border-[#97D6DF]/30 dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
            {/* Pill de la URL */}
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#EAF5F8] dark:bg-white/10 border border-[#97D6DF]/60 dark:border-white/10 text-[13px]">
              <GlobeAltIcon className="w-4 h-4 text-[#FF3F1A] shrink-0" />
              <span className="font-mono font-bold text-[#190088] dark:text-[#97D6DF]">
                {urlAmigable}
              </span>
            </div>

            {/* Acciones: Copiar y Abrir */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={copiarEnlace}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-[#212121] hover:bg-gray-50 dark:hover:bg-gray-800 text-[#190088] dark:text-white text-[12px] font-bold border border-gray-200 dark:border-white/10 shadow-2xs transition-all active:scale-95 cursor-pointer"
                title="Copiar enlace"
              >
                {copiado ? (
                  <>
                    <CheckIcon className="w-3.5 h-3.5 text-[#10B981] stroke-[2.5]" />
                    <span className="text-[#10B981]">¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <ClipboardDocumentIcon className="w-3.5 h-3.5 text-gray-500" />
                    <span>Copiar URL</span>
                  </>
                )}
              </button>

              <a
                href={urlReal}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#190088] hover:bg-[#150070] text-white text-[12px] font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
                title="Abrir tienda en pestaña nueva"
              >
                <span>Visitar</span>
                <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>

        {/* ── PANEL DERECHO: Tarjeta con Código QR (Diseño idéntico a referencia) ── */}
        <div className="w-full lg:w-[280px] shrink-0 rounded-[26px] bg-white/70 dark:bg-white/[0.04] p-6 flex flex-col items-center justify-center border border-[#97D6DF]/30 dark:border-white/5 relative">
          {/* Marco blanco con borde negro para el Código QR */}
          <div className="p-3 bg-white rounded-[22px] border-2 border-[#190088]/20 shadow-sm relative group">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`Código QR de ${nombreTienda}`}
                className="w-40 h-40 sm:w-44 sm:h-44 object-contain rounded-xl"
              />
            ) : (
              <div className="w-40 h-40 sm:w-44 sm:h-44 flex flex-col items-center justify-center text-gray-400 gap-2">
                <QrCodeIcon className="w-8 h-8 animate-pulse text-[#190088]" />
                <span className="text-[11px] font-medium">Generando QR...</span>
              </div>
            )}
          </div>

          {/* Subtítulo y botón de descarga directa */}
          <div className="mt-4 text-center">
            <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
              Escanea con cualquier cámara móvil
            </p>
            {qrDataUrl && (
              <a
                href={qrDataUrl}
                download={`qr-tienda-${slugTienda}.png`}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#190088]/10 hover:bg-[#190088]/20 dark:bg-white/10 dark:hover:bg-white/20 text-[#190088] dark:text-[#97D6DF] text-[11px] font-bold transition-all cursor-pointer"
                title="Descargar imagen PNG para imprimir"
              >
                <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                <span>Descargar QR imprimible</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export default TarjetaQrTienda;
