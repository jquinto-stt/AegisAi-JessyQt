import { useState, type ComponentType, type SVGProps } from "react";
import { observer } from "mobx-react-lite";
import { Modal } from "@/elements/ui/modal";
import { Button } from "@/elements/ui/button";
import { Switch } from "@/elements/form/switch";
import { pedidosStore, type Modalidad } from "@/stores";
import {
  TvIcon,
  BuildingStorefrontIcon,
  RectangleStackIcon,
  Squares2X2Icon,
  ViewColumnsIcon,
  ComputerDesktopIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
// Heroicons no tiene bicicleta ni cubiertos: son los dos glifos del dominio
// «reparto / salón» que no existen en su catálogo. Se quedan en lucide antes que
// sustituirlos por un icono que signifique otra cosa.
import { Bike, UtensilsCrossed } from "lucide-react";

interface ConfigureDisplayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TipoVista = "despacho" | "kanban" | "sala";

/** Los iconos de las tarjetas vienen de dos catálogos, así que el tipo común
 *  es el mínimo que ambos cumplen. */
type Icono = ComponentType<SVGProps<SVGSVGElement>>;

const OPCIONES_VISTA: {
  id: TipoVista;
  titulo: string;
  subtitulo: string;
  badge: string;
  icon: Icono;
}[] = [
  {
    id: "despacho",
    titulo: "Expedición & Despacho",
    subtitulo: "Ticket activo en foco + matriz de producción compacta",
    badge: "Recomendado Operación",
    icon: Squares2X2Icon,
  },
  {
    id: "kanban",
    titulo: "KDS Estaciones de Cocina",
    subtitulo: "3 columnas proporcionales con avance táctil en 1 toque",
    badge: "Cocina / Prep",
    icon: ViewColumnsIcon,
  },
  {
    id: "sala",
    titulo: "Monitor de Sala / Turnos",
    subtitulo: "Pantalla de llamado para clientes y repartidores",
    badge: "Smart TV",
    icon: ComputerDesktopIcon,
  },
];

const OPCIONES_MODALIDAD: { id: "todas" | Modalidad; label: string; desc: string; icon: Icono }[] = [
  { id: "todas", label: "Todas las modalidades", desc: "Mostrador, domicilios y salón integrados", icon: RectangleStackIcon },
  { id: "retiro", label: "Retiro en Mostrador", desc: "Pantalla para clientes en local", icon: BuildingStorefrontIcon },
  { id: "domicilio", label: "Despacho a Domicilio", desc: "Área de empaque y repartidores", icon: Bike },
  { id: "en_sitio", label: "En Mesa / Salón", desc: "Comandas y servicio a mesa", icon: UtensilsCrossed },
];

/**
 * ConfigureDisplayModal — Modal para configurar y proyectar la pantalla
 * de enfoque / KDS / TV monitor con estética oficial Necto.
 */
export const ConfigureDisplayModal = observer(({ isOpen, onClose }: ConfigureDisplayModalProps) => {
  const [vista, setVista] = useState<TipoVista>("despacho");
  const [modalidad, setModalidad] = useState<"todas" | Modalidad>("todas");
  const [sonido, setSonido] = useState(true);
  const [soloListos, setSoloListos] = useState(false);

  const conteoPara = (m: "todas" | Modalidad) => {
    return pedidosStore
      .enCurso(m === "todas" ? undefined : m)
      .filter((p) => (soloListos ? p.estado === "listo" : p.estado !== "entregado" && p.estado !== "cancelado")).length;
  };

  const abrirPantalla = () => {
    const params = new URLSearchParams();
    params.set("vista", vista);
    if (modalidad !== "todas") params.set("modalidad", modalidad);
    if (sonido) params.set("sonido", "1");
    if (soloListos) params.set("soloListos", "1");

    const url = `/pedidos/display?${params.toString()}`;
    window.open(url, "_blank");
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[560px] p-6 bg-white dark:bg-gray-950 border dark:border-gray-800 rounded-2xl shadow-2xl">
      {/* Header con identidad Necto */}
      <div className="flex items-center gap-3.5 mb-5 pb-4 border-b border-gray-100 dark:border-gray-800/80">
        <div className="flex size-11 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500 border border-brand-500/25 shadow-sm">
          <TvIcon className="size-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-bold text-ink-title dark:text-white">
              Modo Enfoque & Pantallas Necto
            </h3>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-brand-500/15 text-brand-500 rounded">
              <SparklesIcon className="size-2.5" />
              KDS / TV
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Aprovechamiento total de pantalla para estaciones de despacho, cocina y salas de espera.
          </p>
        </div>
      </div>

      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        {/* Selector de tipo de pantalla / vista */}
        <div>
          <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            1. Formato de Pantalla
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {OPCIONES_VISTA.map((v) => {
              const Icon = v.icon;
              const isSelected = vista === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVista(v.id)}
                  className={`flex flex-col p-3 rounded-xl border text-left transition-all cursor-pointer relative ${
                    isSelected
                      ? "border-brand-500 bg-brand-500/10 dark:bg-brand-950/20 shadow-sm ring-1 ring-brand-500/50"
                      : "border-gray-200 hover:border-gray-300 dark:border-gray-800 dark:hover:border-gray-700 bg-gray-50/50 dark:bg-gray-900/40"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className={`size-7 rounded-lg flex items-center justify-center ${
                        isSelected
                          ? "bg-brand-500 text-white"
                          : "bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                      }`}
                    >
                      <Icon className="size-4" />
                    </div>
                    <span
                      className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                        isSelected
                          ? "bg-brand-500/20 text-brand-500"
                          : "bg-gray-200/60 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                      }`}
                    >
                      {v.badge}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-ink-title dark:text-white leading-tight">
                    {v.titulo}
                  </h4>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 leading-snug">
                    {v.subtitulo}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Modalidad a Proyectar */}
        <div>
          <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            2. Filtro de Modalidad
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {OPCIONES_MODALIDAD.map((op) => {
              const Icon = op.icon;
              const isSelected = modalidad === op.id;
              const cantidad = conteoPara(op.id);
              return (
                <button
                  key={op.id}
                  type="button"
                  onClick={() => setModalidad(op.id)}
                  className={`flex items-center justify-between rounded-xl border p-2.5 text-left transition-all cursor-pointer ${
                    isSelected
                      ? "border-brand-500 bg-brand-500/10 dark:bg-brand-950/20 ring-1 ring-brand-500/40"
                      : "border-gray-200 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50 bg-gray-50/30 dark:bg-gray-900/30"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`flex size-7 shrink-0 items-center justify-center rounded-lg ${
                        isSelected
                          ? "bg-brand-500 text-white"
                          : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                      }`}
                    >
                      <Icon className="size-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                        {op.label}
                      </p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">{op.desc}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-brand-500 ml-2 shrink-0">
                    {cantidad}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Opciones adicionales */}
        <div className="rounded-xl border border-gray-200/80 bg-gray-50/70 p-3 space-y-2.5 dark:border-gray-800 dark:bg-gray-900/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                Sonido de alerta y llamados
              </p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500">
                Chime discreto al llamar ticket o cambiar de estado.
              </p>
            </div>
            <Switch checked={sonido} onChange={setSonido} />
          </div>

          <div className="flex items-center justify-between border-t border-gray-200/60 pt-2.5 dark:border-gray-800">
            <div>
              <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                Solo pedidos listos para retiro
              </p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500">
                Oculta pedidos en preparación (ideal para monitor de sala al cliente).
              </p>
            </div>
            <Switch checked={soloListos} onChange={setSoloListos} />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 pt-5 mt-4 border-t border-gray-100 dark:border-gray-800">
        <span className="text-[11px] text-gray-400 dark:text-gray-500 hidden sm:inline">
          Se abre en una pestaña nueva para pantalla completa [F11]
        </span>
        <div className="flex items-center gap-2.5 ml-auto">
          <Button size="sm" variant="outline" onClick={onClose} className="rounded-lg">
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={abrirPantalla}
            className="gap-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-lg shadow-sm"
          >
            <TvIcon className="size-4" />
            <span>Lanzar Pantalla</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
});

export default ConfigureDisplayModal;
