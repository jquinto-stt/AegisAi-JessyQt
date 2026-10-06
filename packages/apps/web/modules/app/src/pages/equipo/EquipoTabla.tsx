import { useState } from "react";
import { useNavigate } from "react-router";
import { observer } from "mobx-react-lite";
import { Avatar } from "@/elements/ui/avatar";
import { Badge } from "@/elements/ui/badge";
import { Button } from "@/elements/ui/button";
import { Card } from "@/elements/ui/card";
import { Dropdown, DropdownItem } from "@/elements/ui/dropdown";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/elements/ui/table";
import {
  MoreDotIcon,
  PencilIcon,
  UserCircleIcon,
  TrashBinIcon
} from "@/icons";
import { operadoresStore, rolesStore, sessionStore, CAPACIDADES, type Operador } from "@/stores";
import { ESTADO_META } from "./equipo.constants";
import { inicialesDe, resumenDeAreas } from "./equipo.presentacion";
import { Switch } from "@/elements/form/switch";

// ═══════════════════════════════════════════════════════════════════════════
// TABLA DEL EQUIPO (Elements UI)
// ═══════════════════════════════════════════════════════════════════════════

/** true si la persona tiene excepciones sobre las capacidades de su rol. */
function tieneAjustes(op: Operador): boolean {
  return (op.capacidadesExtra?.length ?? 0) > 0 || (op.capacidadesRemovidas?.length ?? 0) > 0;
}

interface GrupoEquipo {
  id: string;
  titulo: string;
  esPendiente?: boolean;
  operadores: Operador[];
}

export const EquipoTabla = observer(({ operadores }: { operadores: Operador[] }) => {
  const navigate = useNavigate();
  const [menuAbiertoId, setMenuAbiertoId] = useState<string | null>(null);

  if (operadores.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 py-14 text-center dark:border-gray-800">
        <p className="text-sm text-gray-500 dark:text-gray-400">No hay personas que coincidan con el filtro.</p>
      </div>
    );
  }

  // Ordenar: primero pendientes, luego activos, luego inactivos
  const sorted = [...operadores].sort((a, b) => {
    if (a.estado === "pendiente" && b.estado !== "pendiente") return -1;
    if (a.estado !== "pendiente" && b.estado === "pendiente") return 1;
    if (a.estado === "activo" && b.estado === "inactivo") return -1;
    if (a.estado === "inactivo" && b.estado === "activo") return 1;
    return 0;
  });

  return (
    <Card className="p-0 sm:p-0 overflow-hidden bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border-gray-200/50 dark:border-gray-800/50">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-transparent">
            <TableRow className="border-b border-gray-100 dark:border-gray-800/60 hover:bg-transparent">
              <TableCell header className="pl-6 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Miembro
              </TableCell>
              <TableCell header className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Rol
              </TableCell>
              <TableCell header className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Estado
              </TableCell>
              <TableCell header className="text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
                Acceso
              </TableCell>
              <TableCell header className="text-right pr-6 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Acciones
              </TableCell>
            </TableRow>
          </TableHeader>

          <TableBody>
            {sorted.map((op) => (
              <FilaEquipo
                key={op.id}
                op={op}
                isMenuOpen={menuAbiertoId === op.id}
                onToggleMenu={() => setMenuAbiertoId(menuAbiertoId === op.id ? null : op.id)}
                onCloseMenu={() => setMenuAbiertoId(null)}
                onAbrir={() => navigate(`/equipo/${op.id}`)}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// FILA DE OPERADOR
// ═══════════════════════════════════════════════════════════════════════════

const FilaEquipo = observer(
  ({
    op,
    isMenuOpen,
    onToggleMenu,
    onCloseMenu,
    onAbrir,
  }: {
    op: Operador;
    isMenuOpen: boolean;
    onToggleMenu: () => void;
    onCloseMenu: () => void;
    onAbrir: () => void;
  }) => {
    const navigate = useNavigate();
    const rol = rolesStore.porId(op.rolId);
    const capacidades = rolesStore.capacidadesEfectivas(op);
    // Nombres de área en lenguaje de negocio ("Conversaciones", no "Canales"), y
    // solo las que la persona tiene: en una celda, listar lo que NO puede hacer
    // sería ruido. El detalle vive en su perfil.
    const areas = resumenDeAreas(capacidades).filter((a) => a.nivel !== "no");
    const ajustes = tieneAjustes(op);
    const esPendiente = op.estado === "pendiente";
    const puedeVerComo = op.estado === "activo";

    const verComo = () => {
      if (!puedeVerComo) return;
      onCloseMenu();
      sessionStore.simular(op.id);
      navigate(sessionStore.homePathActual);
    };

    // Determinación del badge de Rol con tokens NECTO
    let userTypeConfig: { label: string; color: "primary" | "dark" | "light" | "info" } = {
      label: rol?.nombre || "Operador",
      color: "dark",
    };

    if (op.rolId === "admin_tienda") {
      userTypeConfig = {
        label: "Admin",
        color: "primary", // Necto Brand Orange (#ff3f1a)
      };
    } else if (op.rolId === "supervisor_pedidos") {
      userTypeConfig = {
        label: "Supervisor",
        color: "dark",
      };
    } else if (op.rolId === "vendedor") {
      userTypeConfig = {
        label: "Operador",
        color: "light",
      };
    }

    // Determinación del badge de Acceso con tokens NECTO
    let accessBadge: { label: string; color: "primary" | "warning" | "light" } = {
      label: esPendiente ? "Sin acceso aún" : "Estándar",
      color: esPendiente ? "warning" : "light",
    };

    if (!esPendiente) {
      // El "acceso total" se mide contra el catálogo, no contra un 18 escrito a
      // mano: si mañana se añade una capacidad, el badge sigue diciendo la verdad.
      if (op.rolId === "admin_tienda" || capacidades.length >= CAPACIDADES.length) {
        accessBadge = {
          label: "Acceso Total",
          color: "primary", // Necto Brand Tint
        };
      } else if (ajustes) {
        accessBadge = {
          label: "Personalizado",
          color: "warning", // Necto Warning Tint
        };
      }
    }

    return (
      <TableRow
        // Sin retardo escalonado a propósito: las filas van agrupadas por rol
        // (`grupo.operadores.map`), así que un índice por grupo reiniciaría la
        // cascada en cada cabecera y se leería como varias listas sueltas. Aquí
        // el grupo entra como una unidad.
        className={`animate-entrada-lista transition-colors ${
          esPendiente
            ? "bg-brand-50/20 dark:bg-brand-500/10 hover:bg-brand-50/40"
            : "hover:bg-gray-50/60 dark:hover:bg-white/[0.02]"
        }`}
      >
        {/* Columna 1: Nombre y Cargo */}
        <TableCell className="py-4 pl-6">
          <div className="flex items-center gap-3 cursor-pointer" onClick={onAbrir}>
            <Avatar
              src={op.avatarUrl || ""}
              initials={inicialesDe(op.nombre)}
              size="medium"
              status={esPendiente ? "busy" : op.estado === "activo" ? "online" : "none"}
              alt={op.nombre}
              className="ring-2 ring-gray-100 dark:ring-gray-800 shadow-theme-xs flex-shrink-0"
            />
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                  {op.nombre}
                </span>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {op.cargo || op.email}
              </span>
            </div>
          </div>
        </TableCell>

        {/* Columna 2: Rol y Permisos */}
        <TableCell className="py-4">
          <div className="flex flex-col gap-1.5 cursor-pointer" onClick={onAbrir}>
            <div className="flex items-center gap-2">
              <Badge
                variant={op.rolId === "admin_tienda" ? "solid" : "light"}
                color={userTypeConfig.color}
                size="xs"
                className="font-medium"
              >
                {userTypeConfig.label}
              </Badge>
              {ajustes && (
                <span title="Tiene permisos ajustados a mano respecto a su rol">
                  <Badge variant="light" color="warning" size="xs" className="font-medium">
                    Personalizado
                  </Badge>
                </span>
              )}
            </div>
            {areas.length > 0 ? (
              <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
                {areas.map(a => a.label).join(", ")}
              </span>
            ) : (
              <span className="text-xs text-gray-400">Sin acceso</span>
            )}
          </div>
        </TableCell>

        {/* Columna 3: Estado */}
        <TableCell className="py-4">
          <div className="flex items-center cursor-pointer" onClick={onAbrir}>
            <Badge
              color={
                esPendiente
                  ? "warning"
                  : op.estado === "activo"
                  ? "success"
                  : "light"
              }
              variant="light"
              size="sm"
              className={op.estado === "inactivo" ? "font-medium text-gray-500" : "font-medium"}
            >
              {esPendiente ? "Pendiente" : op.estado === "activo" ? "Configurado" : "Sin configurar"}
            </Badge>
          </div>
        </TableCell>

        {/* Columna 4: Acceso (Toggle) */}
        <TableCell className="py-4 text-center">
          <div className="flex items-center justify-center">
            {esPendiente ? (
               <Switch
                 checked={false}
                 disabled={true}
                 onChange={() => {}}
               />
            ) : (
              <Switch
                checked={op.estado === "activo"}
                onChange={(checked) => {
                  if (checked) {
                    operadoresStore.activar(op.id);
                  } else {
                    operadoresStore.desactivar(op.id);
                  }
                }}
              />
            )}
          </div>
        </TableCell>

        {/* Columna 5: Acciones */}
        <TableCell className="py-4 text-right pr-6">
          <div className="flex items-center justify-end gap-1.5 relative">
            {/* Botón Aprobar si está pendiente.
                Antes iba en `bg-accent-600` —el CYAN de la paleta— sobre una
                fila teñida de naranja: dos acentos compitiendo y el botón de
                confirmar no se distinguía del fondo. Va en el naranja de marca,
                que es el color de la acción principal en toda la app. */}
            {esPendiente && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  operadoresStore.aprobar(op.id);
                }}
                className="h-8 px-3 mr-2 rounded-lg text-xs font-semibold bg-brand-500 hover:bg-brand-600 text-white transition-colors cursor-pointer"
              >
                Aprobar
              </button>
            )}

            {/* Botón Lapicito: Editar */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAbrir();
              }}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white transition-colors cursor-pointer"
              title="Editar"
              aria-label="Editar"
            >
              <PencilIcon className="h-4 w-4" />
            </button>

            {/* Menú contextual de opciones administrativas (...) */}
            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleMenu();
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/5 dark:hover:text-gray-200 transition-colors cursor-pointer"
                title="Más opciones"
                aria-label="Más opciones"
              >
                <MoreDotIcon className="h-4 w-4" />
              </button>

              {/* Dropdown Menu */}
              <Dropdown
                isOpen={isMenuOpen}
                onClose={onCloseMenu}
                className="right-0 top-full mt-1 w-48 text-left z-20 shadow-theme-lg border border-gray-100 dark:border-white/5"
              >
                <DropdownItem
                  onClick={verComo}
                  className={!puedeVerComo ? "opacity-50 pointer-events-none" : ""}
                >
                  <span className="flex items-center gap-2">
                    <UserCircleIcon className="h-4 w-4 text-gray-400" />
                    <span>Ver como (Simular)</span>
                  </span>
                </DropdownItem>

                {op.estado === "pendiente" && (
                  <DropdownItem
                    onClick={() => {
                      operadoresStore.rechazar(op.id);
                      onCloseMenu();
                    }}
                  >
                    <span className="text-error-600 font-medium">Rechazar solicitud</span>
                  </DropdownItem>
                )}
              </Dropdown>
            </div>
          </div>
        </TableCell>
      </TableRow>
    );
  }
);
