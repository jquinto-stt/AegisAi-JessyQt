import { Link } from "react-router";

import { Button } from "@/elements/ui/button";
import {
  ArrowDownTrayIcon,
  CheckIcon,
  DocumentTextIcon,
  HashtagIcon,
  IdentificationIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import type { ArchivoVerificacion, VerificacionFiscal as Verificacion } from "@/stores/organizacion.store";

/**
 * Estado «Documentos aprobados» de la verificación.
 *
 * Es la pantalla que ve el usuario cuando su registro quedó validado: el sello
 * de aprobación, sus datos tal como los envió y los dos documentos que subió,
 * con descarga real.
 *
 * ── Sobre la descarga ─────────────────────────────────────────────────────
 *
 * Los archivos viven como data URL en `localStorage`, así que el enlace
 * `download` los baja de verdad, sin backend. Si un archivo no tiene contenido
 * (registros viejos, o una importación sin bytes), el botón se apaga y lo dice:
 * un icono de descarga que no descarga es peor que no tenerlo.
 */

const kb = (bytes: number) => Math.max(1, Math.round(bytes / 1024));

/** Un dato de la ficha, con icono delante. */
const Dato = ({
  icono: Icono,
  children,
}: {
  icono: React.FC<React.SVGProps<SVGSVGElement>>;
  children: React.ReactNode;
}) => (
  <div className="flex items-center gap-2 text-[13px] text-[#212121]/80 dark:text-gray-300">
    <Icono className="h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500" aria-hidden="true" />
    <span className="truncate">{children}</span>
  </div>
);

/** Fila de documento con su descarga. */
const FilaDocumento = ({
  etiqueta,
  archivo,
}: {
  etiqueta: string;
  archivo?: ArchivoVerificacion;
}) => {
  const descargable = Boolean(archivo?.dataUrl);

  return (
    <li className="flex items-center gap-3 border-b border-[#ECECEC] py-3 last:border-b-0 dark:border-gray-800">
      <DocumentTextIcon className="h-5 w-5 shrink-0 text-gray-400 dark:text-gray-500" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-ink-title dark:text-white">{etiqueta}</p>
        {archivo && (
          <p className="truncate text-[11px] text-gray-500 dark:text-gray-400">
            {archivo.nombre} · {kb(archivo.tamano)} KB
          </p>
        )}
      </div>

      {descargable ? (
        <a
          href={archivo?.dataUrl}
          download={archivo?.nombre}
          aria-label={`Descargar ${etiqueta}`}
          className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-ink-title dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"
        >
          <ArrowDownTrayIcon className="h-4 w-4" />
        </a>
      ) : (
        <span
          title="El archivo no está disponible en este registro."
          className="rounded-lg p-2 text-gray-300 dark:text-gray-600"
        >
          <ArrowDownTrayIcon className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">Archivo no disponible</span>
        </span>
      )}
    </li>
  );
};

export interface EstadoAprobadoProps {
  verificacion: Verificacion;
  onReiniciar: () => void;
}

export const EstadoAprobado = ({ verificacion, onReiniciar }: EstadoAprobadoProps) => {
  const { nombreCompleto, persona, tipoDocumento, numeroDocumento, selfie, documento, comprobante } =
    verificacion;

  return (
    <div className="rounded-3xl border border-[#ECECEC] bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900 sm:p-8">
      {/* ── SELLO ────────────────────────────────────────────────────────── */}
      <div className="flex items-start gap-4 rounded-2xl border border-accent-200 bg-accent-50 p-5 dark:border-accent-500/30 dark:bg-accent-500/10">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-accent-600 text-accent-600 dark:border-accent-400 dark:text-accent-400">
          <CheckIcon className="h-6 w-6" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-[15px] font-bold text-accent-700 dark:text-accent-300">
            Documentos Aprobados
          </p>
          <p className="mt-1 text-[13px] leading-5 text-accent-700/80 dark:text-accent-200/80">
            Tu registro fue exitoso, a continuación podrás ver la información que subiste a la
            plataforma.
          </p>
        </div>
      </div>

      {/* ── DATOS + DOCUMENTOS ───────────────────────────────────────────── */}
      <div className="mt-7 grid gap-7 sm:grid-cols-2">
        <section>
          <h3 className="text-[15px] font-bold text-ink-title dark:text-white">Datos Personales</h3>

          <div className="mt-4 flex items-start gap-4">
            {selfie?.dataUrl ? (
              <img
                src={selfie.dataUrl}
                alt="Foto del rostro registrada"
                className="h-24 w-24 shrink-0 rounded-2xl object-cover"
              />
            ) : (
              <span className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500">
                <UserIcon className="h-8 w-8" aria-hidden="true" />
              </span>
            )}

            <div className="min-w-0">
              <p className="truncate text-[18px] font-bold leading-tight text-ink-title dark:text-white">
                {nombreCompleto || "Sin nombre registrado"}
              </p>
              <div className="mt-3 space-y-1.5">
                <Dato icono={UserIcon}>{persona === "juridica" ? "jurídica" : "natural"}</Dato>
                <Dato icono={IdentificationIcon}>{tipoDocumento || "Documento sin definir"}</Dato>
                <Dato icono={HashtagIcon}>{numeroDocumento || "Sin número"}</Dato>
              </div>
            </div>
          </div>
        </section>

        <section className="sm:border-l sm:border-[#ECECEC] sm:pl-7 dark:sm:border-gray-800">
          <h3 className="text-[15px] font-bold text-ink-title dark:text-white">Documentos Adjuntos</h3>
          <ul className="mt-2">
            <FilaDocumento etiqueta="Documento de Identificación" archivo={documento} />
            <FilaDocumento etiqueta="Comprobante de Dirección" archivo={comprobante} />
          </ul>
        </section>
      </div>

      {/* La aprobación de este entorno no la firma nadie: la marca el botón de
          demostración. Se dice, en pequeño, para no vender una validación que
          no existe. */}
      <p className="mt-6 text-[12px] leading-5 text-gray-500 dark:text-gray-400">
        Aprobación marcada en modo demostración: en esta versión no hay un equipo que valide los
        documentos.{" "}
        <Link to="/soporte" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">
          ¿Algo no coincide?
        </Link>
      </p>

      <div className="mt-5">
        <Button size="sm" variant="outline" onClick={onReiniciar}>
          Reiniciar verificación
        </Button>
      </div>
    </div>
  );
};

export default EstadoAprobado;
