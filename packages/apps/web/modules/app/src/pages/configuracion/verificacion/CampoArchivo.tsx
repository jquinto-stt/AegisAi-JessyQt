import { useRef, useState } from "react";

import { Button } from "@/elements/ui/button";
import { PhotoIcon, DocumentTextIcon } from "@heroicons/react/24/outline";
import type { ArchivoVerificacion } from "@/stores/organizacion.store";

/**
 * Tope por archivo, en KB.
 *
 * Es el mismo motivo que en las imágenes de la identidad: sin servidor de
 * archivos, el contenido va como data URL a `localStorage`. Con el 2 MB del
 * concepto, tres archivos ocuparían ~8 MB en base64 y el guardado fallaría en
 * silencio. El límite se dice con el peso real del archivo rechazado.
 */
export const LIMITE_ARCHIVO_KB = 300;

// Un archivo de 300 bytes no es «0 KB»: se redondea a 1 como mínimo, para que
// la cifra no parezca un archivo vacío.
const kb = (bytes: number) => Math.max(1, Math.round(bytes / 1024));

export interface CampoArchivoProps {
  id: string;
  etiqueta: string;
  descripcion?: string;
  /** Tipos aceptados (`accept` del input), p. ej. `image/*` o `.pdf,image/*`. */
  accept: string;
  valor?: ArchivoVerificacion;
  onChange: (archivo: ArchivoVerificacion | undefined) => void;
  /** Texto bajo el selector. Por defecto, el tope y los formatos. */
  nota?: string;
}

/**
 * CampoArchivo — un adjunto con nombre, peso y previsualización.
 *
 * Guarda el archivo como data URL **solo si cabe** en el tope; si no, no toca el
 * valor y explica por qué. Nunca deja el campo en un estado intermedio: o hay
 * archivo válido, o no hay archivo.
 */
export const CampoArchivo = ({
  id,
  etiqueta,
  descripcion,
  accept,
  valor,
  onChange,
  nota,
}: CampoArchivoProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const esImagen = valor?.tipo.startsWith("image/");

  const elegir = (archivo: File | undefined) => {
    if (!archivo) return;

    if (archivo.size > LIMITE_ARCHIVO_KB * 1024) {
      setError(
        `«${archivo.name}» pesa ${kb(archivo.size)} KB y el máximo es ${LIMITE_ARCHIVO_KB} KB. ` +
          "Se guarda en este navegador, sin servidor de archivos.",
      );
      return;
    }

    const lector = new FileReader();
    lector.onload = () => {
      const dataUrl = typeof lector.result === "string" ? lector.result : undefined;
      if (!dataUrl) {
        setError("No se pudo leer el archivo. Prueba con otro.");
        return;
      }
      setError(null);
      onChange({ nombre: archivo.name, tipo: archivo.type || "application/octet-stream", tamano: archivo.size, dataUrl });
    };
    lector.onerror = () => setError("No se pudo leer el archivo. Prueba con otro.");
    lector.readAsDataURL(archivo);
  };

  return (
    <div>
      <p className="text-[14px] font-bold text-ink-title dark:text-white">{etiqueta}</p>
      {descripcion && (
        <p className="mt-1 text-[13px] leading-5 text-[#212121]/70 dark:text-gray-400">{descripcion}</p>
      )}

      <div className="mt-3 rounded-xl border border-dashed border-gray-300 bg-gray-50/60 p-4 dark:border-gray-700 dark:bg-white/[0.02]">
        {valor ? (
          <div className="flex items-center gap-3">
            {esImagen && valor.dataUrl ? (
              <img
                src={valor.dataUrl}
                alt={`Vista previa de ${etiqueta.toLowerCase()}`}
                className="h-12 w-12 rounded-lg object-cover"
              />
            ) : (
              <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-white text-gray-500 dark:bg-gray-800 dark:text-gray-300">
                <DocumentTextIcon className="h-6 w-6" aria-hidden="true" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-ink-title dark:text-white" title={valor.nombre}>
                {valor.nombre}
              </p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">{kb(valor.tamano)} KB</p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => { setError(null); onChange(undefined); }}>
              Quitar
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-400 dark:bg-gray-800 dark:text-gray-500">
              <PhotoIcon className="h-5 w-5" aria-hidden="true" />
            </span>
            <input
              ref={inputRef}
              id={id}
              type="file"
              accept={accept}
              className="sr-only"
              onChange={(e) => {
                elegir(e.target.files?.[0]);
                // Permite volver a elegir el MISMO archivo tras un error.
                e.target.value = "";
              }}
            />
            <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()}>
              Seleccionar archivo
            </Button>
            <p className="text-center text-[11px] text-gray-500 dark:text-gray-400">
              {nota ?? `Máximo ${LIMITE_ARCHIVO_KB} KB por archivo.`}
            </p>
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-2 text-[12px] font-medium text-error-500">
          {error}
        </p>
      )}
    </div>
  );
};

export default CampoArchivo;
