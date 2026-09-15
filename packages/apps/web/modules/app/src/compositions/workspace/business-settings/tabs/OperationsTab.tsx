import React from "react";
import {
  Clock,
  PauseCircle,
  AlertTriangle,
} from "lucide-react";
import { Button, Field, Toggle } from "@/elements";
import { SettingsRow, SettingsRowGroup, SettingsCard, SettingsSection } from "../SettingsSection";
import type { BusinessSettingsTabForm } from "../hooks/useBusinessSettingsForm";

/* ── SECCIÓN 6: OPERACIONES Y ESTADO DE SEDE ─────────────────────────
 * Order flow, scheduled pauses and critical location actions.
 * El encabezado de la sección lo pinta el modal desde el catálogo.
 *
 * ⚠️ Este tab monta **su propia** `SettingsCard`: los grupos van como hijos
 * directos de ella, para que su `divide-y` ponga la línea entre grupos.
 * ────────────────────────────────────────────────────────────────── */
export const OperationsTab: React.FC<{ form: BusinessSettingsTabForm }> = ({ form }) => {
  const { name, isPreparacionEnabled, setIsPreparacionEnabled, kitchenBufferMin, setKitchenBufferMin, isPaused, setIsPaused, pauseReason, setPauseReason, pauseMessage, setPauseMessage, confirmDelete, setConfirmDelete, handleDelete } = form;

  return (
    <SettingsCard>
      {/* Preparación de pedidos */}
      <SettingsSection
        title="Flujo operativo de órdenes"
        description="Configura el comportamiento del tablero de comandas y los tiempos de cocina."
      >
        <SettingsRowGroup>
          <SettingsRow
            icon={Clock}
            title="Etapa intermedia de preparación"
            description='Si está activa, las órdenes pasan a "En preparación" antes de marcarse como listas para entrega.'
            action={
              <Toggle
                intent="orders.prep.toggle"
                checked={isPreparacionEnabled}
                onChange={setIsPreparacionEnabled}
              />
            }
          />
          <div className="p-5">
            <Field
              label="Tiempo estimado de preparación (minutos)"
              type="number"
              value={kitchenBufferMin}
              onChange={(e) => setKitchenBufferMin(Number(e.target.value) || 0)}
              placeholder="20"
            />
          </div>
        </SettingsRowGroup>
      </SettingsSection>

      {/* Pausa / vacaciones */}
      <SettingsSection
        title="Pausa temporal / modo vacaciones"
        description="Suspende temporalmente el ingreso de nuevas compras desde la web o chat."
      >
        <SettingsRowGroup>
          <SettingsRow
            icon={PauseCircle}
            title="Pausar recepción de pedidos"
            description="Al activarse, los clientes verán que la sede está en pausa y no podrán generar órdenes nuevas."
            action={
              <Toggle
                intent="business.pause.toggle"
                checked={isPaused}
                onChange={setIsPaused}
              />
            }
          >
            {isPaused && (
              <>
                <Field
                  label="Motivo de la pausa"
                  type="text"
                  value={pauseReason}
                  onChange={(e) => setPauseReason(e.target.value)}
                  placeholder="Ej: Vacaciones colectivas / Mantenimiento de cocina"
                />
                <Field
                  label="Mensaje automático para clientes"
                  type="text"
                  value={pauseMessage}
                  onChange={(e) => setPauseMessage(e.target.value)}
                  placeholder="En este momento nos encontramos en pausa. Regresamos pronto."
                />
              </>
            )}
          </SettingsRow>
        </SettingsRowGroup>
      </SettingsSection>

      {/* Zona de peligro.
          ⚠️ Era un bloque con su propio borde, su propio fondo y su propio
          `rounded-xl` **dentro** de la pila de tarjetas: un cuarto contenedor
          anidado. Ahora es un grupo más de la tarjeta (el `divide-y` del padre
          le pone la línea encima) y lo que lo distingue es el tinte de error,
          no otro borde.

          ⚠️ Los tres botones son `Button` del catálogo. Las dos acciones de
          borrado van en `variant="destructive"` con el tono `error-600` de la
          casa (el catálogo trae `error-500`; se sube un escalón con
          `className` para conservar el contraste que ya tenía la pantalla), y
          el cancelar es `variant="outline"` con el anillo anulado (`ring-0`)
          porque su superficie es el gris de relleno, no un contorno. */}
      <section className="space-y-4 bg-error-50/50 px-5 py-6 sm:px-6 dark:bg-error-950/20">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 flex-none text-error-600 dark:text-error-400" />
          <h3 className="text-theme-sm font-semibold tracking-tight text-error-700 dark:text-error-300">
            Zona de peligro
          </h3>
        </div>

        <p className="text-theme-sm leading-relaxed text-error-700 dark:text-error-300">
          Eliminar esta sede eliminará también sus órdenes locales, su configuración y sus enlaces. Esta acción es irreversible.
        </p>

        {!confirmDelete ? (
          <Button
            variant="destructive"
            intent="business.delete.open"
            onClick={() => setConfirmDelete(true)}
            className="h-auto rounded-full bg-error-600 px-4 py-2 text-theme-sm font-semibold shadow-none hover:bg-error-700"
          >
            Eliminar esta sede
          </Button>
        ) : (
          <div className="space-y-3 rounded-xl border border-error-200 bg-white p-4 dark:border-error-900/60 dark:bg-gray-900">
            <p className="text-theme-sm font-medium text-error-900 dark:text-error-200">
              ¿Confirmas que deseas eliminar permanentemente la sede "{name}"?
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="destructive"
                intent="business.delete.confirm"
                onClick={handleDelete}
                className="h-auto rounded-full bg-error-600 px-4 py-2 text-theme-sm font-semibold shadow-none hover:bg-error-700"
              >
                Sí, eliminar definitivamente
              </Button>
              <Button
                variant="outline"
                intent="business.delete.cancel"
                onClick={() => setConfirmDelete(false)}
                className="h-auto rounded-full bg-gray-100 px-4 py-2 text-theme-sm font-semibold text-gray-700 ring-0 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </section>
    </SettingsCard>
  );
};
