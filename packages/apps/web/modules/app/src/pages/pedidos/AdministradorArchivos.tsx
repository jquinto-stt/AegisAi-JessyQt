import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CloudArrowUpIcon,
  FolderIcon,
  MagnifyingGlassIcon,
  PhotoIcon,
  PlusIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

// ═══════════════════════════════════════════════════════════════════════════
// ADMINISTRADOR DE ARCHIVOS — selector de imágenes del catálogo
// ═══════════════════════════════════════════════════════════════════════════
//
// Se abre al pulsar «Seleccionar archivos» en la ficha de producto, en lugar
// del selector nativo del navegador: el negocio organiza sus fotos en carpetas
// y elige de ahí, no del escritorio de su computador.
//
// ── Por qué el almacén vive fuera del componente ──────────────────────────
//
// Sin backend de archivos, las carpetas y las imágenes se guardan en memoria
// (`almacenArchivos`). Si vivieran en el `useState` del modal, cerrar y volver
// a abrir borraría lo que el usuario acababa de subir, y tendría que repetirlo
// cada vez que elige una foto.
//
// Las imágenes se leen como data URL: no se suben a ningún servidor, así que
// el límite de tamaño se avisa en el texto y no se valida contra un servicio.

interface AlmacenArchivos {
  carpetas: string[];
  /** Imágenes por carpeta, como data URL. */
  archivos: Record<string, string[]>;
}

const almacenArchivos: AlmacenArchivos = { carpetas: [], archivos: {} };

/** Lee un archivo local como data URL, para previsualizarlo sin subirlo. */
const leerComoDataUrl = (file: File): Promise<string> =>
  new Promise((resolve) => {
    const lector = new FileReader();
    lector.onload = () => resolve(String(lector.result));
    lector.readAsDataURL(file);
  });

export interface AdministradorArchivosProps {
  abierto: boolean;
  /** Solo se puede elegir una imagen (foto principal). */
  seleccionUnica?: boolean;
  onCerrar: () => void;
  onSeleccionar: (imagenes: string[]) => void;
}

export const AdministradorArchivos: React.FC<AdministradorArchivosProps> = ({
  abierto,
  seleccionUnica = false,
  onCerrar,
  onSeleccionar,
}) => {
  const [, setTick] = useState(0);
  const refrescar = () => setTick((t) => t + 1);

  const [carpetaActiva, setCarpetaActiva] = useState<string | null>(
    almacenArchivos.carpetas[0] ?? null,
  );
  const [busqueda, setBusqueda] = useState('');
  const [creandoCarpeta, setCreandoCarpeta] = useState(false);
  const [nombreCarpeta, setNombreCarpeta] = useState('');
  const [seleccion, setSeleccion] = useState<string[]>([]);

  const inputCarpetaRef = useRef<HTMLInputElement>(null);
  const inputArchivoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (abierto) {
      setCarpetaActiva(almacenArchivos.carpetas[0] ?? null);
      setSeleccion([]);
      setBusqueda('');
      setCreandoCarpeta(false);
      setNombreCarpeta('');
    }
  }, [abierto]);

  useEffect(() => {
    if (creandoCarpeta) inputCarpetaRef.current?.focus();
  }, [creandoCarpeta]);

  const carpetasVisibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return almacenArchivos.carpetas.filter((c) => !q || c.toLowerCase().includes(q));
  }, [busqueda, almacenArchivos.carpetas.length, abierto]);

  const imagenesCarpeta = carpetaActiva ? almacenArchivos.archivos[carpetaActiva] ?? [] : [];

  const crearCarpeta = () => {
    const nombre = nombreCarpeta.trim();
    if (!nombre) {
      setCreandoCarpeta(false);
      return;
    }
    if (!almacenArchivos.carpetas.includes(nombre)) {
      almacenArchivos.carpetas.push(nombre);
      almacenArchivos.archivos[nombre] = [];
    }
    setCarpetaActiva(nombre);
    setNombreCarpeta('');
    setCreandoCarpeta(false);
    refrescar();
  };

  const cargarImagenes = async (files: File[]) => {
    if (!carpetaActiva) return;
    const urls = await Promise.all(files.map(leerComoDataUrl));
    almacenArchivos.archivos[carpetaActiva] = [
      ...(almacenArchivos.archivos[carpetaActiva] ?? []),
      ...urls,
    ];
    refrescar();
  };

  const alternarSeleccion = (url: string) => {
    setSeleccion((prev) => {
      if (seleccionUnica) return prev[0] === url ? [] : [url];
      return prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url];
    });
  };

  if (!abierto) return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
      <div className="flex h-[600px] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5 dark:border-gray-800">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-[#212121] dark:bg-gray-800 dark:text-white">
              <PhotoIcon className="h-4.5 w-4.5" aria-hidden="true" />
            </span>
            <h2 className="text-[16px] font-bold text-[#212121] dark:text-white">
              Administrador de archivos
            </h2>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/5 dark:hover:text-gray-200"
          >
            <XMarkIcon className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 p-5 sm:grid-cols-[260px_1fr]">
          {/* Panel de carpetas */}
          <div className="flex min-h-0 flex-col">
            <button
              type="button"
              onClick={() => {
                setCreandoCarpeta(true);
                setNombreCarpeta('');
              }}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-[#212121] text-[13px] font-bold text-white transition-colors hover:bg-black dark:bg-white dark:text-[#212121] dark:hover:bg-gray-200"
            >
              <PlusIcon className="h-4 w-4" aria-hidden="true" />
              Nueva Carpeta
            </button>

            {creandoCarpeta && (
              <input
                ref={inputCarpetaRef}
                value={nombreCarpeta}
                onChange={(e) => setNombreCarpeta(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') crearCarpeta();
                  if (e.key === 'Escape') setCreandoCarpeta(false);
                }}
                onBlur={crearCarpeta}
                placeholder="Nombre de la carpeta"
                aria-label="Nombre de la carpeta"
                className="mt-2 h-9 w-full rounded-lg border border-[#FF3F1A] px-3 text-[13px] outline-none focus:ring-1 focus:ring-[#FF3F1A]/30 dark:bg-gray-900 dark:text-white"
              />
            )}

            <div className="relative mt-2">
              <MagnifyingGlassIcon
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                aria-hidden="true"
              />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar..."
                aria-label="Buscar carpeta"
                className="h-9 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-[13px] outline-none transition-colors placeholder:text-gray-400 focus:border-[#FF3F1A] dark:border-gray-800 dark:bg-gray-900 dark:text-white"
              />
            </div>

            <div className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between border-b border-gray-200 bg-[#ECECEC]/60 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:bg-white/[0.04] dark:text-gray-400">
                <span>Nombre</span>
                <span>({carpetasVisibles.length})</span>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto">
                {carpetasVisibles.length === 0 ? (
                  <p className="px-3 py-6 text-center text-[12px] font-normal text-gray-400">
                    No hay carpetas todavía. Crea una con «Nueva Carpeta».
                  </p>
                ) : (
                  carpetasVisibles.map((carpeta) => {
                    const activa = carpeta === carpetaActiva;
                    return (
                      <button
                        key={carpeta}
                        type="button"
                        onClick={() => {
                          setCarpetaActiva(carpeta);
                          setSeleccion([]);
                        }}
                        className={
                          activa
                            ? 'flex w-full items-center gap-2 border-l-2 border-[#FF3F1A] bg-[#FF3F1A]/5 px-3 py-2 text-left text-[13px] font-bold text-[#212121] dark:text-white'
                            : 'flex w-full items-center gap-2 border-l-2 border-transparent px-3 py-2 text-left text-[13px] font-normal text-gray-600 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5'
                        }
                      >
                        <FolderIcon className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
                        <span className="truncate">{carpeta}</span>
                        <span className="ml-auto text-[11px] text-gray-400">
                          {(almacenArchivos.archivos[carpeta] ?? []).length}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Panel de imágenes */}
          <div className="flex min-h-0 flex-col gap-3">
            <div className="flex flex-col items-start justify-between gap-3 rounded-xl border border-dashed border-gray-300 px-4 py-3.5 sm:flex-row sm:items-center dark:border-gray-700">
              <div className="flex items-center gap-3">
                <CloudArrowUpIcon className="h-6 w-6 shrink-0 text-gray-400" aria-hidden="true" />
                <div>
                  <p className="text-[13px] font-bold text-[#212121] dark:text-white">
                    Selecciona las imágenes para subir a tu catálogo
                  </p>
                  <p className="mt-0.5 text-[11px] font-normal text-gray-500 dark:text-gray-400">
                    El archivo seleccionado debe tener como máximo 10 MB de tamaño.
                  </p>
                </div>
              </div>

              <input
                ref={inputArchivoRef}
                type="file"
                accept="image/*"
                multiple={!seleccionUnica}
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  if (files.length) void cargarImagenes(files);
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                onClick={() => inputArchivoRef.current?.click()}
                disabled={!carpetaActiva}
                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-[#212121] px-3.5 text-[12px] font-bold text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-[#212121] dark:hover:bg-gray-200"
              >
                <PlusIcon className="h-4 w-4" aria-hidden="true" />
                Cargar Imagen
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-gray-200 p-3 dark:border-gray-800">
              {!carpetaActiva ? (
                <p className="py-10 text-center text-[12px] text-gray-400">
                  Crea una carpeta para empezar a cargar imágenes.
                </p>
              ) : imagenesCarpeta.length === 0 ? (
                <p className="py-10 text-center text-[12px] text-gray-400">
                  Esta carpeta está vacía.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {imagenesCarpeta.map((url, i) => {
                    const elegida = seleccion.includes(url);
                    return (
                      <button
                        key={`${i}-${url.slice(-10)}`}
                        type="button"
                        onClick={() => alternarSeleccion(url)}
                        aria-pressed={elegida}
                        className={
                          elegida
                            ? 'relative aspect-square overflow-hidden rounded-lg ring-2 ring-[#FF3F1A] ring-offset-1'
                            : 'relative aspect-square overflow-hidden rounded-lg ring-1 ring-gray-200 transition-shadow hover:ring-gray-300 dark:ring-gray-700'
                        }
                      >
                        <img src={url} alt={`Imagen ${i + 1}`} className="h-full w-full object-cover" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Pie */}
        <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-3 dark:border-gray-800">
          <button
            type="button"
            onClick={onCerrar}
            className="h-9 rounded-lg bg-gray-100 px-4 text-[13px] font-bold text-gray-600 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onSeleccionar(seleccion)}
            disabled={seleccion.length === 0}
            className="h-9 rounded-lg bg-[#212121] px-4 text-[13px] font-bold text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-[#212121] dark:hover:bg-gray-200"
          >
            Seleccionar
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default AdministradorArchivos;
