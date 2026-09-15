import React from "react";
import { BUSINESS_ARCHETYPES } from "@/context/BusinessContext";
import { BusinessIcon } from "@/compositions/workspace/BusinessIcon";
import { Badge, Card } from "@/elements";
import type { StoreDashboardContext } from "../store-dashboard.types";

/**
 * Contexto de la tienda: quién es y en qué estado está.
 *
 * Es el encabezado del Dashboard y responde "¿de qué tienda estamos hablando?".
 * Deliberadamente **no** muestra métricas: un negocio recién creado no tiene
 * ninguna, y un número inventado aquí sería lo primero que ve el usuario.
 *
 * ⚠️ El estado operativo sale de `pauseConfig.isPaused`, que es el único estado
 * que la tienda tiene. No existe un campo `status`: inventarlo aquí obligaría a
 * mantenerlo sincronizado con la pausa programada, que ya lo dice.
 */
export const StoreIdentityWidget: React.FC<{ ctx: StoreDashboardContext }> = ({ ctx }) => {
  const { business } = ctx;

  const archetype = BUSINESS_ARCHETYPES.find(a => a.id === business.businessType);
  const typeLabel = business.specialty || archetype?.label;
  const isPaused = business.pauseConfig?.isPaused === true;

  return (
    <Card>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          {/* Logo/avatar — el de la tienda si lo tiene; si no, el icono del arquetipo. */}
          <div className="flex size-14 flex-none items-center justify-center overflow-hidden rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/10 dark:text-brand-400">
            {business.logoUrl ? (
              <img
                src={business.logoUrl}
                alt={business.name}
                style={{
                  transform: business.logoTransform
                    ? `rotate(${business.logoTransform.rotate || 0}deg) scale(${business.logoTransform.scale || 1}) translate(${business.logoTransform.posX || 0}%, ${business.logoTransform.posY || 0}%)`
                    : undefined,
                }}
                className="h-full w-full object-cover"
              />
            ) : (
              <BusinessIcon iconKey={business.iconKey} className="size-7" />
            )}
          </div>

          <div className="min-w-0">
            <h2 className="truncate text-2xl font-bold tracking-tight text-secondary-600 sm:text-3xl dark:text-white">
              {business.name}
            </h2>
            <p className="mt-1 max-w-xl text-theme-sm leading-relaxed text-gray-500 dark:text-gray-400">
              Todo lo importante de tu operación, en un solo lugar.
            </p>

            {/* Identidad de la tienda — sólo lo que ya está definido. */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {typeLabel && (
                <Badge color="primary" size="sm" className="px-2.5 font-bold">
                  {typeLabel}
                </Badge>
              )}
              {business.city && (
                <Badge
                  color="light"
                  size="sm"
                  className="px-2.5 font-bold text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                >
                  {business.city}
                </Badge>
              )}
              <Badge
                color="light"
                size="sm"
                className="px-2.5 font-bold text-gray-500 dark:bg-gray-800 dark:text-gray-400"
              >
                {business.currency}
              </Badge>
            </div>
          </div>
        </div>

        {/* Estado de la tienda */}
        <div className="flex flex-none self-start sm:self-center">
          <Badge
            color={isPaused ? "warning" : "success"}
            size="sm"
            className={`gap-1.5 px-3 py-1 font-bold ${
              isPaused ? "dark:text-warning-400" : "dark:text-success-400"
            }`}
          >
            <span
              className={`size-1.5 flex-none rounded-full ${
                isPaused ? "bg-warning-500" : "bg-success-500"
              }`}
            />
            <span>{isPaused ? "En pausa" : "Operando"}</span>
          </Badge>
        </div>
      </div>
    </Card>
  );
};

export default StoreIdentityWidget;
