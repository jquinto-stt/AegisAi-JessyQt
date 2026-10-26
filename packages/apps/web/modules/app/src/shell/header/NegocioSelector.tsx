import React, { useState, useRef, useEffect } from "react";
import { observer } from "mobx-react-lite";
import { useNavigate } from "react-router";
import { 
  BuildingStorefrontIcon, 
  ChevronDownIcon, 
  ChevronUpIcon, 
  PlusIcon,
  XMarkIcon,
  CheckIcon,
  Cog6ToothIcon,
  ArrowTopRightOnSquareIcon,
  GlobeAltIcon,
} from "@heroicons/react/24/outline";
import { organizacionStore, slugDe } from "@/stores/organizacion.store";
import { inicialesDe } from "@/utils";
import { InsigniaVerificada } from "@/icons";
import { ModalCrearNegocioWizard } from "./ModalCrearNegocioWizard";

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
// AVATAR / FOTO DEL NEGOCIO
// ═══════════════════════════════════════════════════════════════════════════

export const AvatarNegocio = ({
  logoUrl,
  nombre,
  pais,
  verificado,
  className = "w-7 h-7 sm:w-8 sm:h-8",
}: {
  logoUrl?: string;
  nombre?: string;
  pais?: string;
  verificado?: boolean;
  className?: string;
}) => {
  const [error, setError] = useState(false);
  const tieneLogo = Boolean(logoUrl?.trim()) && !error;

  useEffect(() => {
    setError(false);
  }, [logoUrl]);

  const esVerificado =
    verificado !== undefined
      ? verificado
      : organizacionStore.organizacion?.verificacion?.estado === "aprobado";

  return (
    <div className={`relative shrink-0 ${className}`}>
      <div className="relative rounded-lg overflow-hidden w-full h-full border border-black/10 dark:border-white/10 shadow-xs flex items-center justify-center bg-gray-100 dark:bg-gray-800">
        {tieneLogo ? (
          <img
            src={logoUrl}
            alt={nombre || "Foto del negocio"}
            className="w-full h-full object-cover"
            onError={() => setError(true)}
          />
        ) : nombre?.trim() ? (
          <div className="w-full h-full bg-gradient-to-br from-[#190088] to-[#2B00D9] dark:from-white/20 dark:to-white/10 flex items-center justify-center text-white font-bold text-[11px] sm:text-[12px] tracking-wide select-none">
            {inicialesDe(nombre)}
          </div>
        ) : (
          <BanderaPais pais={pais} className="w-full h-full rounded-none border-0 shadow-none" />
        )}
      </div>
      {esVerificado && (
        <span
          className="absolute -top-1 -right-1 z-10 flex items-center justify-center rounded-full bg-white dark:bg-gray-900 ring-1 ring-white dark:ring-gray-900 shadow-xs pointer-events-none"
          title="Negocio verificado"
        >
          <InsigniaVerificada className="size-3.5" />
        </span>
      )}
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
  const navigate = useNavigate();
  const [dropdownAbierto, setDropdownAbierto] = useState(false);
  const [modalEditarAbierto, setModalEditarAbierto] = useState(false);
  const [wizardCrearAbierto, setWizardCrearAbierto] = useState(false);
  const [negocioEditandoId, setNegocioEditandoId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Form State para Negocio
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

  const abrirEditarNegocio = (negocio: typeof listaNegocios[0]) => {
    setNegocioEditandoId(negocio.id);
    setNombre(negocio.nombre || "");
    setNombrePublico(negocio.nombrePublico || "");

    // Extraer prefijo y número telefónico si ya existen
    let telNum = negocio.telefono || "";
    let telPais = negocio.pais || "Colombia";
    if (!PREFIJOS[telPais]) telPais = "Colombia";

    for (const [paisKey, { prefijo }] of Object.entries(PREFIJOS)) {
      if (telNum.startsWith(prefijo)) {
        telPais = paisKey;
        telNum = telNum.slice(prefijo.length).trim();
        break;
      }
    }

    setTelefono(telNum);
    setPaisTelefono(telPais);
    setPaisOperacion(negocio.pais || "Colombia");
    setDropdownAbierto(false);
    setModalEditarAbierto(true);
  };

  const handleGuardarNegocio = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !negocioEditandoId) return;

    const prefijo = PREFIJOS[paisTelefono]?.prefijo || "+57";
    const telefonoCompleto = telefono.trim() ? `${prefijo} ${telefono.trim()}` : undefined;

    organizacionStore.actualizarOrganizacionPorId(negocioEditandoId, {
      nombre: nombre.trim(),
      nombrePublico: nombrePublico.trim() || undefined,
      telefono: telefonoCompleto,
      pais: paisOperacion,
    });

    setModalEditarAbierto(false);
  };

  const nombreMostrar = orgActiva?.nombre || "Mi Negocio";
  const paisMostrar = orgActiva?.pais || "Colombia";

  return (
    <div className="relative inline-block text-left font-['DM_Sans',sans-serif]" ref={dropdownRef}>
      {/* Botón Trigger en Navbar */}
      <button
        type="button"
        onClick={() => setDropdownAbierto((prev) => !prev)}
        className="group flex items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-white dark:bg-gray-900 border border-[#ECECEC] dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 shadow-xs hover:shadow-sm transition-all text-left focus:outline-none cursor-pointer"
      >
        <AvatarNegocio
          logoUrl={orgActiva?.logoUrl}
          nombre={nombreMostrar}
          pais={paisMostrar}
          verificado={orgActiva?.verificacion?.estado === "aprobado"}
          className="w-7 h-7 sm:w-8 sm:h-8"
        />
        <div className="flex flex-col min-w-0 pr-1">
          <span className="text-[14px] font-bold text-[#212121] dark:text-white truncate max-w-[130px] sm:max-w-[170px] leading-tight">
            {nombreMostrar}
          </span>
          <span className="text-[12px] font-light text-[#212121]/60 dark:text-gray-400 leading-none mt-0.5">
            {paisMostrar}
          </span>
        </div>
        {dropdownAbierto ? (
          <ChevronUpIcon className="w-4 h-4 text-[#212121]/70 dark:text-gray-400 shrink-0 stroke-[2]" />
        ) : (
          <ChevronDownIcon className="w-4 h-4 text-[#212121]/70 dark:text-gray-400 shrink-0 stroke-[2]" />
        )}
      </button>

      {/* Popover Menú */}
      {dropdownAbierto && (
        <div className="absolute left-0 mt-2 w-72 sm:w-80 rounded-2xl bg-white dark:bg-gray-900 border border-[#ECECEC] dark:border-gray-800 shadow-xl z-50 p-2.5 animate-aparecer font-['DM_Sans',sans-serif]">
          <div className="px-3 pt-1.5 pb-2 text-[12px] font-bold uppercase tracking-wider text-[#190088] dark:text-[#97D6DF]">
            Negocios Propios
          </div>

          <div className="flex flex-col gap-1 max-h-60 overflow-y-auto">
            {listaNegocios.map((negocio) => {
              const esActivo = orgActiva?.id === negocio.id;
              return (
                <div
                  key={negocio.id}
                  className={`group w-full flex items-center justify-between p-2 rounded-xl transition-colors ${
                    esActivo
                      ? "bg-[#EFE6D3]/30 dark:bg-white/10"
                      : "hover:bg-gray-50 dark:hover:bg-gray-800/60"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      organizacionStore.seleccionarOrganizacion(negocio.id);
                      setDropdownAbierto(false);
                    }}
                    className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer focus:outline-none"
                  >
                    <AvatarNegocio
                      logoUrl={negocio.logoUrl}
                      nombre={negocio.nombre}
                      pais={negocio.pais}
                      verificado={negocio.verificacion?.estado === "aprobado"}
                      className="w-8 h-8"
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="text-[14px] font-bold text-[#212121] dark:text-white truncate">
                        {negocio.nombre}
                      </span>
                      <span className="text-[12px] font-light text-[#212121]/60 dark:text-gray-400">
                        {negocio.pais}
                      </span>
                    </div>
                  </button>

                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        abrirEditarNegocio(negocio);
                      }}
                      title="Configurar campos del negocio"
                      aria-label={`Configurar ${negocio.nombre}`}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-[#190088] dark:text-gray-400 dark:hover:text-[#97D6DF] hover:bg-gray-200/70 dark:hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      <Cog6ToothIcon className="w-4 h-4 stroke-[1.8]" />
                    </button>
                    {esActivo && (
                      <CheckIcon className="w-4 h-4 text-[#FF3F1A] dark:text-[#97D6DF] stroke-[2.5]" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="h-px bg-[#ECECEC] dark:bg-gray-800 my-1.5" />

          {/* Botón Crear Nuevo Negocio con icono Heroicon */}
          <button
            type="button"
            onClick={() => {
              setDropdownAbierto(false);
              setWizardCrearAbierto(true);
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#EFE6D3]/30 dark:hover:bg-gray-800/60 transition-colors text-left group cursor-pointer"
          >
            <div className="relative flex items-center justify-center w-6 h-6 shrink-0 text-[#190088] dark:text-[#97D6DF]">
              <BuildingStorefrontIcon className="w-5 h-5 stroke-[1.8]" />
              <PlusIcon className="w-3 h-3 absolute -bottom-0.5 -right-0.5 text-[#FF3F1A] stroke-[3] bg-white dark:bg-gray-900 rounded-full" />
            </div>
            <span className="text-[14px] font-bold text-[#212121] dark:text-gray-200 group-hover:text-[#FF3F1A] dark:group-hover:text-white transition-colors">
              Crear Nuevo Negocio
            </span>
          </button>
        </div>
      )}

      {/* Onboarding Wizard slide por slide para Crear Nuevo Negocio */}
      <ModalCrearNegocioWizard
        abierto={wizardCrearAbierto}
        onCerrar={() => setWizardCrearAbierto(false)}
      />

      {/* Modal Editar Configuración del Negocio Existente */}
      {modalEditarAbierto && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in overflow-y-auto font-['DM_Sans',sans-serif]">
          <div 
            className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-[#ECECEC] dark:border-white/10 p-6 sm:p-8 flex flex-col gap-6 text-left my-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del Modal */}
            <div className="flex items-start justify-between border-b border-[#ECECEC] dark:border-white/10 pb-4">
              <div>
                <h3 className="text-[24px] font-bold text-[#190088] dark:text-white leading-tight font-['DM_Sans',sans-serif]">
                  Configuración del negocio
                </h3>
                <p className="text-[14px] font-light text-[#212121]/70 dark:text-gray-400 mt-1">
                  Edita los campos y datos de operación de este negocio
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalEditarAbierto(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                <XMarkIcon className="w-5 h-5 stroke-[2]" />
              </button>
            </div>

            <form onSubmit={handleGuardarNegocio} className="flex flex-col gap-4 font-['DM_Sans',sans-serif]">
              {/* Campo 1: Nombre del negocio */}
              <div className="flex flex-col gap-1">
                <label className="text-[14px] font-bold text-[#212121] dark:text-white">
                  ¿Cuál es el nombre de este negocio?
                </label>
                <p className="text-[12px] font-normal text-[#212121]/60 dark:text-gray-400">
                  Es el nombre con el que lo identificas, no es visible al público y puedes editarlo después
                </p>
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ingresa un nombre"
                  className="w-full mt-1 px-4 py-2.5 rounded-xl border-2 border-[#ECECEC] dark:border-white/10 bg-white dark:bg-white/5 text-[14px] font-normal text-[#212121] dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-[#FF3F1A] transition-all"
                />

                {/* Vista previa en tiempo real de la URL asignada */}
                <div className="mt-1.5 flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#EFE6D3]/40 dark:bg-white/5 border border-[#ECECEC] dark:border-white/10 text-[12px]">
                  <GlobeAltIcon className="w-4 h-4 text-[#FF3F1A] shrink-0" />
                  <span className="text-[#212121]/70 dark:text-gray-400 font-medium">URL personalizada:</span>
                  <span className="font-mono font-bold text-[#190088] dark:text-[#97D6DF] truncate">
                    necto.app/{slugDe(nombre || "tu-negocio")}
                  </span>
                </div>
              </div>

              {/* Campo 2: Nombre público */}
              <div className="flex flex-col gap-1">
                <label className="text-[14px] font-bold text-[#212121] dark:text-white">
                  Nombre público del negocio
                </label>
                <p className="text-[12px] font-normal text-[#212121]/60 dark:text-gray-400">
                  Es el nombre que aparecerá como remitente en las guías de las transportadoras.
                </p>
                <input
                  type="text"
                  value={nombrePublico}
                  onChange={(e) => setNombrePublico(e.target.value)}
                  placeholder="Ingresa un nombre público para tu negocio"
                  className="w-full mt-1 px-4 py-2.5 rounded-xl border-2 border-[#ECECEC] dark:border-white/10 bg-white dark:bg-white/5 text-[14px] font-normal text-[#212121] dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-[#FF3F1A] transition-all"
                />
              </div>

              {/* Campo 3: Teléfono del negocio */}
              <div className="flex flex-col gap-1">
                <label className="text-[14px] font-bold text-[#212121] dark:text-white">
                  Teléfono del negocio
                </label>
                <p className="text-[12px] font-normal text-[#212121]/60 dark:text-gray-400">
                  Este número será utilizado para colocarlo como contacto de remitente en las guías generadas.
                </p>
                <div className="relative flex items-center mt-1">
                  {/* Selector de prefijo */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setSelectorPrefijoAbierto((p) => !p)}
                      className="flex items-center gap-1.5 px-3 py-2.5 rounded-l-xl border-2 border-r-0 border-[#ECECEC] dark:border-white/10 bg-gray-50 dark:bg-white/10 hover:bg-gray-100 dark:hover:bg-white/15 text-[12px] font-bold text-[#212121] dark:text-gray-200 transition-colors cursor-pointer"
                    >
                      <BanderaPais pais={paisTelefono} className="w-5 h-5 rounded-sm" />
                      <span>{PREFIJOS[paisTelefono]?.codigo || "CO"}</span>
                      <ChevronDownIcon className="w-3.5 h-3.5 text-gray-500" />
                    </button>

                    {selectorPrefijoAbierto && (
                      <div className="absolute top-full left-0 mt-1 w-36 rounded-xl bg-white dark:bg-gray-900 border border-[#ECECEC] dark:border-gray-800 shadow-xl z-20 p-1 flex flex-col gap-0.5">
                        {Object.entries(PREFIJOS).map(([paisKey, val]) => (
                          <button
                            key={paisKey}
                            type="button"
                            onClick={() => {
                              setPaisTelefono(paisKey);
                              setSelectorPrefijoAbierto(false);
                            }}
                            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[12px] font-medium text-[#212121] dark:text-gray-200 hover:bg-[#EFE6D3]/40 dark:hover:bg-gray-800 text-left cursor-pointer"
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
                      className="w-full px-3.5 py-2.5 rounded-r-xl border-2 border-[#ECECEC] dark:border-white/10 bg-white dark:bg-white/5 text-[14px] font-normal text-[#212121] dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-[#FF3F1A] transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Campo 4: ¿Dónde operará tu negocio? */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[14px] font-bold text-[#212121] dark:text-white">
                  ¿Dónde operará tu negocio?
                </label>
                <p className="text-[12px] font-normal text-[#212121]/60 dark:text-gray-400">
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
                        className={`flex items-center justify-center gap-2 px-3 py-3 rounded-2xl border transition-all text-[14px] cursor-pointer ${
                          seleccionado
                            ? "border-2 border-[#190088] dark:border-[#97D6DF] ring-2 ring-[#190088]/20 bg-[#EFE6D3]/30 dark:bg-white/10 text-[#190088] dark:text-white font-bold"
                            : "border border-[#ECECEC] dark:border-white/15 hover:border-gray-400 dark:hover:border-white/25 bg-white dark:bg-white/5 text-[#212121] dark:text-gray-300 font-normal"
                        }`}
                      >
                        <BanderaPais pais={opcion.nombre} className="w-5 h-5 rounded-md" />
                        <span>{opcion.nombre}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Botones de acción y enlace avanzado */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 mt-2 border-t border-[#ECECEC] dark:border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setModalEditarAbierto(false);
                    navigate("/configuracion?tab=general");
                  }}
                  className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#FF3F1A] hover:underline cursor-pointer"
                >
                  <span>Configuración avanzada</span>
                  <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
                </button>

                <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setModalEditarAbierto(false)}
                    className="px-5 py-2.5 rounded-xl border border-[#ECECEC] dark:border-white/10 bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/15 text-[14px] font-medium text-[#212121] dark:text-gray-300 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={!nombre.trim()}
                    className="px-7 py-2.5 rounded-xl bg-[#FF3F1A] hover:bg-[#e03413] active:scale-95 text-[14px] font-bold text-white shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Guardar cambios
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
});
