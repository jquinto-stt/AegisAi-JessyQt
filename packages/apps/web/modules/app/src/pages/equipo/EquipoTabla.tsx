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
} from "@/icons";
import { operadoresStore, rolesStore, sessionStore, CAPACIDADES, type Operador } from "@/stores";
import { ESTADO_META } from "./equipo.constants";
import { inicialesDe, resumenDeAreas } from "./equipo.presentacion";

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

  // Separar operadores pendientes de los aprobados para visibilidad inmediata
  const pendientesOps = operadores.filter((o) => o.estado === "pendiente");
  const noPendientes = operadores.filter((o) => o.estado !== "pendiente");

  const grupos: GrupoEquipo[] = [];

  // Grupo prioritario de pendientes de aprobación si existen
  if (pendientesOps.length > 0) {
    grupos.push({
      id: "pendientes",
      titulo: "Pendientes de aprobación",
      esPendiente: true,
      operadores: pendientesOps,
    });
  }

  // Agrupación de operadores aprobados / activos / inactivos por rol
  grupos.push(
    {
      id: "admins",
      titulo: "Administradores",
      operadores: noPendientes.filter((o) => o.rolId === "admin_tienda"),
    },
    {
      id: "supervisores",
      titulo: "Supervisores",
      operadores: noPendientes.filter((o) => o.rolId === "supervisor_pedidos"),
    },
    {
      id: "vendedores",
      titulo: "Operadores",
      operadores: noPendientes.filter((o) => o.rolId === "vendedor"),
    },
    {
      id: "otros",
      titulo: "Otros Miembros",
      operadores: noPendientes.filter(
        (o) => o.rolId !== "admin_tienda" && o.rolId !== "supervisor_pedidos" && o.rolId !== "vendedor"
      ),
    }
  );

  const gruposVisibles = grupos.filter((g) => g.operadores.length > 0);

  return (
    <Card className="p-0 sm:p-0 overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell header className="pl-6">
                Nombre y Cargo
              </TableCell>
              <TableCell header>
                Qué puede hacer
              </TableCell>
              <TableCell header>
                Rol y Acceso
              </TableCell>
              <TableCell header className="text-right pr-6">
                Acciones
              </TableCell>
            </TableRow>
          </TableHeader>

          <TableBody>
            {gruposVisibles.map((grupo) => (
              <GrupoSection
                key={grupo.id}
                grupo={grupo}
                menuAbiertoId={menuAbiertoId}
                onSetMenuAbiertoId={setMenuAbiertoId}
                onAbrir={(id) => navigate(`/equipo/${id}`)}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// SECCIÓN DE GRUPO CON DIVISOR VISUAL
// ═══════════════════════════════════════════════════════════════════════════

const GrupoSection = observer(
  ({
    grupo,
    menuAbiertoId,
    onSetMenuAbiertoId,
    onAbrir,
  }: {
    grupo: GrupoEquipo;
    menuAbiertoId: string | null;
    onSetMenuAbiertoId: (id: string | null) => void;
    onAbrir: (id: string) => void;
  }) => {
    return (
      <>
        {/* Encabezado de grupo acorde a los tokens de Necto */}
        <tr
          className={
            grupo.esPendiente
              ? "bg-warning-50/15 dark:bg-warning-500/5 border-y border-warning-100 dark:border-warning-500/10"
              : "bg-gray-50/50 dark:bg-white/[0.015] border-y border-gray-100 dark:border-white/5"
          }
        >
          <td colSpan={4} className="px-6 py-2.5">
            <div className="flex items-center gap-3">
              <span
                className={`text-xs font-semibold uppercase tracking-wider flex items-center gap-2 ${
                  grupo.esPendiente
                    ? "text-warning-600 dark:text-warning-400"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              >
                {grupo.esPendiente && (
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-warning-500" />
                )}
                {grupo.titulo} ({grupo.operadores.length})
              </span>
            </div>
          </td>
        </tr>

        {/* Filas del grupo */}
        {grupo.operadores.map((op) => (
          <FilaEquipo
            key={op.id}
            op={op}
            isMenuOpen={menuAbiertoId === op.id}
            onToggleMenu={() =>
              onSetMenuAbiertoId(menuAbiertoId === op.id ? null : op.id)
            }
            onCloseMenu={() => onSetMenuAbiertoId(null)}
            onAbrir={() => onAbrir(op.id)}
          />
        ))}
      </>
    );
  }
);

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
    let userTypeConfig: { label: string; variant: "solid" | "light"; color: "primary" | "dark" | "light" | "info" } = {
      label: rol?.nombre || "Operador",
      variant: "solid",
      color: "dark",
    };

    if (op.rolId === "admin_tienda") {
      userTypeConfig = {
        label: "Admin",
        variant: "solid",
        color: "primary", // Necto Brand Orange (#FF3C10)
      };
    } else if (op.rolId === "supervisor_pedidos") {
      userTypeConfig = {
        label: "Supervisor",
        variant: "solid",
        color: "dark",
      };
    } else if (op.rolId === "vendedor") {
      userTypeConfig = {
        label: "Operador",
        variant: "light",
        color: "dark",
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
            ? "bg-warning-50/20 dark:bg-warning-500/10 hover:bg-warning-50/40"
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
                <Badge
                  color={esPendiente ? "warning" : (ESTADO_META[op.estado]?.color ?? "light")}
                  size="xs"
                  className={op.estado === "inactivo" ? "font-medium text-gray-500" : "font-medium"}
                >
                  {esPendiente ? "Pendiente" : (ESTADO_META[op.estado]?.label ?? op.estado)}
                </Badge>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {op.cargo || op.email}
              </span>
            </div>
          </div>
        </TableCell>

        {/* Columna 2: Qué puede hacer */}
        <TableCell className="py-4">
          <div className="flex flex-wrap items-center gap-1.5 cursor-pointer" onClick={onAbrir}>
            {esPendiente ? (
              <span className="text-xs italic text-warning-700 dark:text-warning-400">
                Se habilitarán al aprobar la solicitud
              </span>
            ) : areas.length > 0 ? (
              <>
                {areas.map((area) => (
                  <Badge
                    key={area.id}
                    variant="light"
                    color="light"
                    size="sm"
                    className="font-medium"
                  >
                    {area.label}
                  </Badge>
                ))}
                {ajustes && (
                  <span title="Tiene permisos ajustados a mano respecto a su rol">
                    <Badge variant="light" color="warning" size="sm" className="font-medium">
                      Con ajustes
                    </Badge>
                  </span>
                )}
              </>
            ) : (
              <span className="text-sm text-gray-400">Sin acceso</span>
            )}
          </div>
        </TableCell>

        {/* Columna 3: Rol y Acceso */}
        <TableCell className="py-4">
          <div className="flex items-center gap-2 cursor-pointer" onClick={onAbrir}>
            {/* Rol de la persona con badge del sistema */}
            <Badge
              variant={op.rolId === "admin_tienda" ? "solid" : "light"}
              color={
                op.rolId === "admin_tienda"
                  ? "primary"
                  : op.rolId === "supervisor_pedidos"
                  ? "dark"
                  : "light"
              }
              size="sm"
              className="font-medium"
            >
              {rol?.nombre || "Operador"}
            </Badge>

            {/* Acceso */}
            <Badge
              variant="light"
              color={accessBadge.color}
              size="sm"
              className="font-medium"
            >
              {accessBadge.label}
            </Badge>
          </div>
        </TableCell>

        {/* Columna 4: Acciones */}
        <TableCell className="py-4 text-right pr-6">
          <div className="flex items-center justify-end gap-1.5 relative">
            {/* Botón Aprobar si está pendiente (color positivo esmeralda) */}
            {esPendiente && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  operadoresStore.aprobar(op.id);
                }}
                className="h-8 px-3 rounded-lg text-xs font-semibold bg-success-600 hover:bg-success-700 text-white transition-colors cursor-pointer"
              >
                Aprobar
              </button>
            )}

            {/* Botón Lapicito: Editar Rol y Capacidades */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAbrir();
              }}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-100 hover:text-gray-900 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white transition-colors cursor-pointer"
              title="Editar capacidades y rol"
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

                {op.estado === "activo" && (
                  <DropdownItem
                    onClick={() => {
                      operadoresStore.desactivar(op.id);
                      onCloseMenu();
                    }}
                  >
                    <span className="text-warning-600 font-medium">Suspender operador</span>
                  </DropdownItem>
                )}

                {op.estado === "inactivo" && (
                  <DropdownItem
                    onClick={() => {
                      operadoresStore.activar(op.id);
                      onCloseMenu();
                    }}
                  >
                    <span className="text-success-600 font-medium">Reactivar operador</span>
                  </DropdownItem>
                )}

                {op.estado === "inactivo" && (
                  <DropdownItem
                    onClick={() => {
                      operadoresStore.activar(op.id);
                      onCloseMenu();
                    }}
                  >
                    <span className="text-success-600 font-medium">Activar</span>
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
