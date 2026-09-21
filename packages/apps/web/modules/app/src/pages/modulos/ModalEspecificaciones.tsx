/**
 * Modal de especificaciones de un módulo del catálogo.
 *
 * Se abre desde «Ver especificaciones» en las tarjetas de módulos próximos.
 * Muestra lo que el catálogo SABE del módulo — nada inventado: si un campo no
 * está, no se pinta una línea con un valor de relleno. Prometer una
 * especificación que no existe es la misma mentira que un interruptor que no
 * conecta nada.
 *
 * Desde aquí se ofrece el único destino real: `/configuracion?tab=modulos`.
 * Esa ruta está guardada por `team.manage`, así que el enlace se pinta solo si
 * el rol puede — el botón que abre este modal ya viene filtrado, pero el enlace
 * de dentro se comprueba por su cuenta porque una superficie no hereda la
 * compuerta de la que la abrió.
 */

import { useNavigate } from "react-router";
import { observer } from "mobx-react-lite";
import { Lock } from "lucide-react";
import { Modal } from "@/elements/ui/modal";
import { Button } from "@/elements/ui/button";
import { Badge } from "@/elements/ui/badge";
import { puede, motivoSinPermiso } from "@/stores/acceso.utils";
import type { InfoModuloNegocio } from "@/stores/plataforma.store";

export interface ModalEspecificacionesProps {
  /** Módulo a mostrar, o `null` para cerrado. */
  modulo: InfoModuloNegocio | null;
  onClose: () => void;
}

export const ModalEspecificaciones: React.FC<ModalEspecificacionesProps> = observer(
  ({ modulo, onClose }) => {
    const navigate = useNavigate();
    const puedeGestionar = puede("team.manage");

    return (
      <Modal isOpen={modulo !== null} onClose={onClose} className="max-w-lg p-6">
        {modulo && (
          <div data-modal-especificaciones={modulo.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Especificaciones
                </span>
                <h3 className="mt-1 text-xl font-bold text-ink-title dark:text-white">
                  {modulo.nombre}
                </h3>
                <p className="mt-0.5 text-xs font-medium text-brand-600 dark:text-brand-400">
                  {modulo.tagline}
                </p>
              </div>
              <Badge color={modulo.disponible ? "info" : "light"} size="sm">
                {modulo.disponible ? "Disponible para instalar" : "Próximamente"}
              </Badge>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
              {modulo.descripcion}
            </p>

            {modulo.destacados.length > 0 && (
              <div className="mt-5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Incluye
                </span>
                <ul className="mt-2 space-y-1.5">
                  {modulo.destacados.map((d) => (
                    <li
                      key={d}
                      className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300"
                    >
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-400" />
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Lo que el catálogo NO dice no se rellena: si un módulo no
                tiene más campos, no hay más filas. Un «Precio: —» inventado
                sería una promesa. */}

            <div className="mt-6 flex flex-col gap-2 border-t border-gray-100 pt-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={onClose}
                className="rounded-full text-xs font-semibold"
              >
                Cerrar
              </Button>
              {puedeGestionar ? (
                <Button
                  size="sm"
                  onClick={() => {
                    onClose();
                    navigate("/configuracion?tab=modulos");
                  }}
                  className="rounded-full bg-brand-500 text-xs font-bold text-white shadow-theme-sm shadow-brand-500/20 hover:bg-brand-600"
                >
                  Ir a configuración de módulos
                </Button>
              ) : (
                <span className="flex items-center gap-1 text-[10px] leading-tight text-gray-400 dark:text-gray-500">
                  <Lock className="size-3 shrink-0" />
                  {motivoSinPermiso("team.manage")}
                </span>
              )}
            </div>
          </div>
        )}
      </Modal>
    );
  },
);

export default ModalEspecificaciones;
