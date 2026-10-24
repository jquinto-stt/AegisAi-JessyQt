import { useRef, useState } from "react";

import { Button } from "@/elements/ui/button";
import { Input } from "@/elements/form/input";
import { PhotoIcon } from "@heroicons/react/24/outline";

/**
 * Tope real de la imagen, en KB.
 *
 * No es un número de folleto: Necto es un mock sin servidor de archivos, así
 * que la imagen se guarda como data URL dentro de `localStorage`, junto al
 * resto de la organización. Una imagen de 2 MB —el tamaño que pedía el
 * concepto— ocupa ~2,7 MB en base64 y dos de ellas revientan la cuota del
 * navegador; `persistStorage` se traga el error y el usuario vería la imagen
 * hasta recargar, y después nada. Preferimos un límite pequeño y cierto a un
 * selector que promete 2 MB y pierde la imagen.
 */
export const LIMITE_IMAGEN_KB = 200;

const kb = (bytes: number) => Math.round(bytes / 1024);

export interface SelectorImagenProps {
  /** Id del campo de archivo. Debe ser único en la pantalla. */
  id: string;
  titulo: string;
  descripcion: string;
  /** Dimensiones recomendadas, en texto («600 × 600 px»). */
  recomendacion: string;
  /** `cuadrado` para el logo, `panoramica` para la portada. */
  forma: "cuadrado" | "panoramica";
  valor: string;
  onChange: (valor: string) => void;
}

/**
 * SelectorImagen — una imagen de la identidad, con previsualización.
 *
 * Dos caminos para el mismo dato, porque los dos hacen falta: **subir un
 * archivo** del equipo (lo natural) y **pegar una dirección** (lo que ya hacía
 * esta pantalla y lo único que funciona con imágenes alojadas fuera). El
 * archivo se convierte a data URL; la dirección se guarda tal cual.
 *
 * El error de tamaño se dice con el peso real del archivo («pesa 340 KB»), no
 * con un «archivo demasiado grande» que obliga a adivinar el límite.
 */
export const SelectorImagen = ({
  id,
  titulo,
  descripcion,
  recomendacion,
  forma,
  valor,
  onChange,
}: SelectorImagenProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const elegirArchivo = (archivo: File | undefined) => {
    if (!archivo) return;

    if (!archivo.type.startsWith("image/")) {
      setError("El archivo no es una imagen.");
      return;
    }

    if (archivo.size > LIMITE_IMAGEN_KB * 1024) {
      setError(
        `La imagen pesa ${kb(archivo.size)} KB y el máximo es ${LIMITE_IMAGEN_KB} KB. ` +
          "Se guarda en este navegador, sin servidor de archivos.",
      );
      return;
    }

    const lector = new FileReader();
    lector.onload = () => {
      const resultado = typeof lector.result === "string" ? lector.result : "";
      if (!resultado) {
        setError("No se pudo leer la imagen. Prueba con otro archivo.");
        return;
      }
      setError(null);
      onChange(resultado);
    };
    lector.onerror = () => setError("No se pudo leer la imagen. Prueba con otro archivo.");
    lector.readAsDataURL(archivo);
  };

  const hayImagen = valor.trim().length > 0;

  return (
    <div className="flex flex-col rounded-2xl border border-[#ECECEC] bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <h3 className="text-[15px] font-bold text-[#190088] dark:text-white">{titulo}</h3>
      <p className="mt-1 text-[13px] text-[#212121]/70 dark:text-gray-400">{descripcion}</p>

      {/* ── Zona de previsualización + carga ─────────────────────────────── */}
      <div
        className={`mt-4 flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-gray-300 bg-gray-50/60 px-4 py-6 dark:border-gray-700 dark:bg-white/[0.02] ${
          forma === "panoramica" ? "min-h-[132px]" : "min-h-[132px]"
        }`}
      >
        {hayImagen ? (
          <img
            src={valor}
            alt={`Vista previa de ${titulo.toLowerCase()}`}
            className={
              forma === "cuadrado"
                ? "h-16 w-16 rounded-full object-cover ring-2 ring-white dark:ring-gray-900"
                : "h-16 w-full rounded-lg object-cover"
            }
          />
        ) : (
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-gray-400 dark:bg-gray-800 dark:text-gray-500">
            <PhotoIcon className="h-6 w-6" aria-hidden="true" />
          </span>
        )}

        <input
          ref={inputRef}
          id={id}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            elegirArchivo(e.target.files?.[0]);
            // Se limpia para poder volver a elegir el MISMO archivo después de
            // un error: sin esto, el `change` no vuelve a dispararse.
            e.target.value = "";
          }}
        />

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()}>
            Seleccionar archivo
          </Button>
          {hayImagen && (
            <Button size="sm" variant="ghost" onClick={() => { setError(null); onChange(""); }}>
              Quitar
            </Button>
          )}
        </div>

        <p className="text-center text-[11px] text-gray-500 dark:text-gray-400">
          Máximo {LIMITE_IMAGEN_KB} KB · {recomendacion}
        </p>
      </div>

      {error && (
        <p role="alert" className="mt-2 text-[12px] font-medium text-error-500">
          {error}
        </p>
      )}

      {/* ── Alternativa: dirección de la imagen ──────────────────────────── */}
      <div className="mt-3">
        <Input
          type="url"
          value={valor.startsWith("data:") ? "" : valor}
          placeholder="https://…/imagen.jpg"
          aria-label={`Dirección de ${titulo.toLowerCase()}`}
          hint={
            valor.startsWith("data:")
              ? "Imagen cargada desde tu equipo."
              : "También puedes pegar la dirección de una imagen alojada fuera."
          }
          onChange={(e) => {
            setError(null);
            onChange(e.target.value);
          }}
        />
      </div>
    </div>
  );
};

export default SelectorImagen;
