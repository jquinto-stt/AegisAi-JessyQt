import React from "react";
import { Check, Minus } from "lucide-react";
import { Card } from "@/elements";
import { cn } from "@/utils";
import { useBusiness, NectoModuleKey } from "../../../../context/BusinessContext";
import {
  AccountCard,
  AccountGroup,
  ActionRow,
  ActionRowList,
  FieldGrid,
  StatusPill,
  ValueField,
} from "../AccountPanels";
import type { AccountSettingsForm } from "../hooks/useAccountSettingsForm";

interface PermissionsTabProps {
  form: AccountSettingsForm;
}

const MODULE_LABELS: Record<NectoModuleKey, { title: string; desc: string }> = {
  pedidos: {
    title: "Pedidos",
    desc: "Pedidos omnicanal por WhatsApp y panel de control.",
  },
  inventarios: {
    title: "Inventarios",
    desc: "Productos, stock, bodegas y alertas.",
  },
  agendamiento: {
    title: "Agendamiento",
    desc: "Citas, agendas de profesionales y servicios.",
  },
  reservas: {
    title: "Reservas",
    desc: "Espacios, capacidad y reglas de horarios.",
  },
  turnos: {
    title: "Turnos",
    desc: "Atención presencial y llamado de turnos.",
  },
  referidos: {
    title: "Referidos",
    desc: "Campañas de fidelización, puntos y premios.",
  },
};

/**
 * Alcance y permisos.
 *
 * Es una vista **de lectura**: no hay nada que editar aquí, así que no usa
 * controles — sólo pares rótulo/valor, filas con su distintivo y la rejilla de
 * módulos. Un panel de sólo lectura con campos de formulario sugeriría que se
 * pueden cambiar desde aquí.
 */
export const PermissionsTab: React.FC<PermissionsTabProps> = ({ form }) => {
  const { roleLabel } = form;
  const { activeBusiness } = useBusiness();

  const activeMods = activeBusiness?.activeModules ?? [];

  return (
    <AccountCard>
      <AccountGroup first title="Rol del titular">
        <FieldGrid>
          <ValueField label="Rol" value={`${roleLabel} (titular de la cuenta)`} />
          <ValueField label="Negocio" value={activeBusiness?.name || "Sin sede activa"} />
        </FieldGrid>

        <p className="text-theme-xs leading-relaxed text-gray-500 dark:text-gray-400">
          Administras la configuración del negocio, vinculas los canales oficiales de WhatsApp,
          activas módulos y gestionas a tu equipo.
        </p>
      </AccountGroup>

      <AccountGroup
        title="Capacidades del negocio"
        description="Lo que puedes hacer sobre esta sede, sin depender de los módulos."
      >
        <ActionRowList>
          <ActionRow
            title="Canal de WhatsApp y asistente con IA"
            description="Número, respuestas automáticas y base de conocimiento."
            action={<StatusPill tone="success">Habilitado</StatusPill>}
          />
          <ActionRow
            title="Configuración de tienda y horarios"
            description="Nombre comercial, catálogo base, dirección y horarios de atención."
            action={<StatusPill tone="success">Habilitado</StatusPill>}
          />
        </ActionRowList>
      </AccountGroup>

      <AccountGroup
        title="Módulos operativos"
        description="Las capacidades que esta sede tiene acopladas hoy."
      >
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {(Object.keys(MODULE_LABELS) as NectoModuleKey[]).map(modKey => {
            const isEnabled = activeMods.includes(modKey);
            const modInfo = MODULE_LABELS[modKey];

            return (
              /* Es el `Card` del catálogo, no un `<div>` clonado: la tarjeta de
                 módulo ya era exactamente su superficie (`rounded-xl border
                 border-gray-200 bg-white …`), así que aquí sólo se ajusta la
                 densidad y se elige el tinte según el módulo esté activo.
                 ⚠️ Hay que pasar `sm:p-3.5` además de `p-3.5`: `cn()` es
                 `tailwind-merge` y `sm:p-6` del `Card` es una variante distinta
                 de `p-5`, así que sin el `sm:` reaparecería por encima de 640px. */
              <Card
                key={modKey}
                className={cn(
                  "flex items-start gap-3 p-3.5 transition-colors sm:p-3.5",
                  isEnabled
                    ? "border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.02]"
                    : "border-transparent bg-gray-50 dark:bg-white/[0.01]"
                )}
              >
                <span
                  className={`mt-0.5 flex size-5 flex-none items-center justify-center rounded-full ${
                    isEnabled
                      ? "bg-brand-500 text-white"
                      : "bg-gray-200 text-gray-400 dark:bg-gray-800 dark:text-gray-500"
                  }`}
                >
                  {isEnabled ? (
                    <Check className="size-3 stroke-[3]" />
                  ) : (
                    <Minus className="size-3" />
                  )}
                </span>

                <div className="min-w-0">
                  <p
                    className={`text-theme-sm font-medium ${
                      isEnabled
                        ? "text-secondary-600 dark:text-white/90"
                        : "text-gray-400 dark:text-gray-500"
                    }`}
                  >
                    {modInfo.title}
                  </p>
                  <p className="mt-0.5 text-theme-xs leading-snug text-gray-500 dark:text-gray-400">
                    {modInfo.desc}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      </AccountGroup>
    </AccountCard>
  );
};
