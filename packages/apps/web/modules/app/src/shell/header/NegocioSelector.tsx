import React, { useState, useRef, useEffect } from "react";
import { observer } from "mobx-react-lite";
import { 
  BuildingStorefrontIcon, 
  ChevronDownIcon, 
  ChevronUpIcon, 
  PlusIcon,
  XMarkIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";
import { organizacionStore } from "@/stores/organizacion.store";

// ═══════════════════════════════════════════════════════════════════════════
// BANDERAS SVG
// ═══════════════════════════════════════════════════════════════════════════

export const BanderaPais = ({ 
  pais, 
  className = "w-7 h-7 sm:w-8 sm:h-8" 
}: { 
  pais?: string; 
  className?: string;
}) => {
  const p = pais?.toLowerCase().trim();

  let contenido = (
    // Default / Colombia
    <svg viewBox="0 0 300 200" className="w-full h-full object-cover">
      <rect width="300" height="100" fill="#FCD116" />
      <rect y="100" width="300" height="50" fill="#003893" />
      <rect y="150" width="300" height="50" fill="#CE1126" />
    </svg>
  );

  if (p === "perú" || p === "peru") {
    contenido = (
      <svg viewBox="0 0 300 200" className="w-full h-full object-cover">
        <rect width="100" height="200" fill="#D91023" />
        <rect x="100" width="100" height="200" fill="#FFFFFF" />
        <rect x="200" width="100" height="200" fill="#D91023" />
      </svg>
    );
  } else if (p === "ecuador") {
    contenido = (
      <svg viewBox="0 0 300 200" className="w-full h-full object-cover">
        <rect width="300" height="100" fill="#FFDD00" />
        <rect y="100" width="300" height="50" fill="#034EA2" />
        <rect y="150" width="300" height="50" fill="#ED1C24" />
        <circle cx="150" cy="115" r="18" fill="#034EA2" stroke="#FFDD00" strokeWidth="2.5" />
      </svg>
    );
  }

  return (
    <div className={`relative rounded-lg overflow-hidden shrink-0 border border-black/10 dark:border-white/10 shadow-xs bg-gray-100 dark:bg-gray-800 ${className}`}>
      {contenido}
      <div className="absolute inset-0 bg-gradient-to-tr from-black/5 via-transparent to-white/20 pointer-events-none" />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// PREFIJOS TELEFÓNICOS
// ═══════════════════════════════════════════════════════════════════════════

const PREFIJOS: Record<string, { codigo: string; prefijo: string }> = {
  Colombia: { codigo: "CO", prefijo: "+57" },
  Ecuador: { codigo: "EC", prefijo: "+593" },
  Perú: { codigo: "PE", prefijo: "+51" },
};

// ═══════════════════════════════════════════════════════════════════════════
// SELECTOR & MODAL DE NEGOCIOS
// ═══════════════════════════════════════════════════════════════════════════

export const NegocioSelector = observer(() => {
  const [dropdownAbierto, setDropdownAbierto] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Form State para Nuevo Negocio
  const [nombre, setNombre] = useState("");
  const [nombrePublico, setNombrePublico] = useState("");
  const [telefono, setTelefono] = useState("");
  const [paisOperacion, setPaisOperacion] = useState("Colombia");
  const [paisTelefono, setPaisTelefono] = useState("Colombia");
  const [selectorPrefijoAbierto, setSelectorPrefijoAbierto] = useState(false);

  // Click outside para cerrar el dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownAbierto(false);
      }
    };
    if (dropdownAbierto) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownAbierto]);

  const orgActiva = organizacionStore.organizacion;
  const listaNegocios = organizacionStore.organizaciones.length > 0
    ? organizacionStore.organizaciones
    : orgActiva
    ? [orgActiva]
    : [];

  const handleCrearNegocio = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;

    const prefijo = PREFIJOS[paisTelefono]?.prefijo || "+57";
    const telefonoCompleto = telefono.trim() ? `${prefijo} ${telefono.trim()}` : undefined;

    organizacionStore.agregarOrganizacion({
      nombre: nombre.trim(),
      nombrePublico: nombrePublico.trim() || undefined,
      telefono: telefonoCompleto,
      pais: paisOperacion,
    });

    // Reset y cerrar
    setNombre("");
    setNombrePublico("");
    setTelefono("");
    setPaisOperacion("Colombia");
    setModalAbierto(false);
    setDropdownAbierto(false);
  };

  const nombreMostrar = orgActiva?.nombre || "Mi Negocio";
  const paisMostrar = orgActiva?.pais || "Colombia";

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Botón Trigger en Navbar */}
      <button
        type="button"
        onClick={() => setDropdownAbierto((prev) => !prev)}
        className="group flex items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/90 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 shadow-xs hover:shadow-sm transition-all text-left focus:outline-none"
      >
        <BanderaPais pais={paisMostrar} className="w-7 h-7 sm:w-8 sm:h-8" />
        <div className="flex flex-col min-w-0 pr-1">
          <span className="text-xs sm:text-[13px] font-bold text-gray-900 dark:text-white truncate max-w-[130px] sm:max-w-[170px] leading-tight">
            {nombreMostrar}
          </span>
          <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium leading-none mt-0.5">
            {paisMostrar}
          </span>
        </div>
        {dropdownAbierto ? (
          <ChevronUpIcon className="w-4 h-4 text-gray-600 dark:text-gray-400 shrink-0 stroke-[2]" />
        ) : (
          <ChevronDownIcon className="w-4 h-4 text-gray-600 dark:text-gray-400 shrink-0 stroke-[2]" />
        )}
      </button>

      {/* Popover Menú */}
      {dropdownAbierto && (
        <div className="absolute left-0 mt-2 w-72 sm:w-80 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xl z-50 p-2.5 animate-aparecer">
          <div className="px-3 pt-1.5 pb-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
            Negocios Propios
          </div>

          <div className="flex flex-col gap-1 max-h-60 overflow-y-auto">
            {listaNegocios.map((negocio) => {
              const esActivo = orgActiva?.id === negocio.id;
              return (
                <button
                  key={negocio.id}
                  type="button"
                  onClick={() => {
                    organizacionStore.seleccionarOrganizacion(negocio.id);
                    setDropdownAbierto(false);
                  }}
                  className={`w-full flex items-center justify-between p-2 rounded-xl transition-colors text-left ${
                    esActivo
                      ? "bg-gray-100/80 dark:bg-gray-800"
                      : "hover:bg-gray-50 dark:hover:bg-gray-800/60"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <BanderaPais pais={negocio.pais} className="w-8 h-8" />
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs sm:text-[13px] font-bold text-gray-900 dark:text-white truncate">
                        {negocio.nombre}
                      </span>
                      <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                        {negocio.pais}
                      </span>
                    </div>
                  </div>
                  {esActivo && (
                    <CheckIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 stroke-[2.5] shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="h-px bg-gray-100 dark:bg-gray-800 my-1.5" />

          {/* Botón Crear Nuevo Negocio con icono Heroicon */}
          <button
            type="button"
            onClick={() => {
              setDropdownAbierto(false);
              setModalAbierto(true);
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors text-left group"
          >
            <div className="relative flex items-center justify-center w-6 h-6 shrink-0 text-gray-700 dark:text-gray-300">
              <BuildingStorefrontIcon className="w-5 h-5 stroke-[1.8]" />
              <PlusIcon className="w-3 h-3 absolute -bottom-0.5 -right-0.5 text-gray-900 dark:text-white stroke-[3] bg-white dark:bg-gray-900 rounded-full" />
            </div>
            <span className="text-xs sm:text-[13px] font-semibold text-gray-800 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-white">
              Crear Nuevo Negocio
            </span>
          </button>
        </div>
      )}

      {/* Modal Nuevo Negocio */}
      {modalAbierto && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
          <div 
            className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 p-6 sm:p-7 flex flex-col gap-5 text-left my-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del Modal */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
                  Nuevo negocio
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Crea un nuevo negocio dentro de tu cuenta de Mastershop
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalAbierto(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
              >
                <XMarkIcon className="w-5 h-5 stroke-[2]" />
              </button>
            </div>

            <form onSubmit={handleCrearNegocio} className="flex flex-col gap-4">
              {/* Campo 1: Nombre del negocio */}
              <div className="flex flex-col gap-1">
                <label className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">
                  ¿Cuál es el nombre de este negocio?
                </label>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Es el nombre con el que lo identificas, no es visible al público y puedes editarlo después
                </p>
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ingresa un nombre"
                  className="w-full mt-1 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-white/15 bg-white dark:bg-white/5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                />
              </div>

              {/* Campo 2: Nombre público */}
              <div className="flex flex-col gap-1">
                <label className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">
                  Nombre público del negocio
                </label>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Es el nombre que aparecerá como remitente en las guías de las transportadoras.
                </p>
                <input
                  type="text"
                  value={nombrePublico}
                  onChange={(e) => setNombrePublico(e.target.value)}
                  placeholder="Ingresa un nombre público para tu negocio"
                  className="w-full mt-1 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-white/15 bg-white dark:bg-white/5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                />
              </div>

              {/* Campo 3: Teléfono del negocio */}
              <div className="flex flex-col gap-1">
                <label className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">
                  Teléfono del negocio
                </label>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Este número será utilizado para colocarlo como contacto de remitente en las guias generadas.
                </p>
                <div className="relative flex items-center mt-1">
                  {/* Selector de prefijo */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setSelectorPrefijoAbierto((p) => !p)}
                      className="flex items-center gap-1.5 px-3 py-2.5 rounded-l-xl border border-r-0 border-gray-300 dark:border-white/15 bg-gray-50 dark:bg-white/10 hover:bg-gray-100 dark:hover:bg-white/15 text-xs font-semibold text-gray-800 dark:text-gray-200 transition-colors"
                    >
                      <BanderaPais pais={paisTelefono} className="w-5 h-5 rounded-sm" />
                      <span>{PREFIJOS[paisTelefono]?.codigo || "CO"}</span>
                      <ChevronDownIcon className="w-3.5 h-3.5 text-gray-500" />
                    </button>

                    {selectorPrefijoAbierto && (
                      <div className="absolute top-full left-0 mt-1 w-36 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-lg z-20 p-1 flex flex-col gap-0.5">
                        {Object.entries(PREFIJOS).map(([paisKey, val]) => (
                          <button
                            key={paisKey}
                            type="button"
                            onClick={() => {
                              setPaisTelefono(paisKey);
                              setSelectorPrefijoAbierto(false);
                            }}
                            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 text-left"
                          >
                            <BanderaPais pais={paisKey} className="w-4 h-4 rounded-sm" />
                            <span>{val.codigo}</span>
                            <span className="text-gray-400 text-[10px]">({val.prefijo})</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Input con prefijo visible */}
                  <div className="relative flex-1">
                    <input
                      type="tel"
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      placeholder={`(${PREFIJOS[paisTelefono]?.prefijo || "+57"}) Ingresa un teléfono`}
                      className="w-full px-3.5 py-2.5 rounded-r-xl border border-gray-300 dark:border-white/15 bg-white dark:bg-white/5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Campo 4: ¿Dónde operará tu negocio? */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">
                  ¿Dónde operará tu negocio?
                </label>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Usaremos la ubicación de tu negocio para configurar las transportadoras, la moneda y más.
                </p>
                <div className="grid grid-cols-3 gap-2.5 mt-1">
                  {[
                    { nombre: "Colombia" },
                    { nombre: "Ecuador" },
                    { nombre: "Perú" },
                  ].map((opcion) => {
                    const seleccionado = paisOperacion === opcion.nombre;
                    return (
                      <button
                        key={opcion.nombre}
                        type="button"
                        onClick={() => {
                          setPaisOperacion(opcion.nombre);
                          setPaisTelefono(opcion.nombre);
                        }}
                        className={`flex items-center justify-center gap-2 px-3 py-3 rounded-2xl border transition-all text-xs sm:text-sm font-medium ${
                          seleccionado
                            ? "border-gray-800 dark:border-white/50 ring-2 ring-gray-800/10 dark:ring-white/10 bg-gray-50 dark:bg-white/10 text-gray-900 dark:text-white font-semibold"
                            : "border-gray-300 dark:border-white/15 hover:border-gray-400 dark:hover:border-white/25 bg-white dark:bg-white/5 text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        <BanderaPais pais={opcion.nombre} className="w-5 h-5 rounded-md" />
                        <span>{opcion.nombre}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex items-center justify-between pt-3 mt-1">
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  className="px-6 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/15 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!nombre.trim()}
                  className="px-8 py-2.5 rounded-xl bg-[#1e7e34] hover:bg-[#166524] active:scale-95 text-xs sm:text-sm font-semibold text-white shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Crear
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
});
