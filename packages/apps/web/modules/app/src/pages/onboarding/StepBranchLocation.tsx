import React from "react";
import { Input, Label } from "@/elements";
import { StepHeading } from "./onboarding-chrome";

interface StepBranchLocationProps {
  eyebrow: string;
  /** País de la tienda: contexto de la ciudad, no un dato que se edite aquí. */
  country: string;
  address: string;
  city: string;
  contactEmail: string;
  onAddressChange: (value: string) => void;
  onCityChange: (value: string) => void;
  onContactEmailChange: (value: string) => void;
}

/**
 * Ámbito **sucursal**: dónde opera esta unidad.
 *
 * El teléfono de atención se declara en el paso de identidad, junto al nombre y
 * el código: los tres son la carta de presentación de la sede. Aquí quedan la
 * dirección física, la ciudad y el email de la sucursal.
 */
export const StepBranchLocation: React.FC<StepBranchLocationProps> = ({
  eyebrow,
  country,
  address,
  city,
  contactEmail,
  onAddressChange,
  onCityChange,
  onContactEmailChange,
}) => {
  return (
    <div className="animate-in space-y-10 fade-in slide-in-from-bottom-1 duration-300">
      <StepHeading
        eyebrow={eyebrow}
        description="Dónde opera esta sede y por dónde la contactan tus clientes."
      >
        Ubicación y contacto
      </StepHeading>

      <div className="space-y-2.5">
        <Label
          htmlFor="branch-address"
          className="mb-0 text-theme-sm font-semibold text-gray-900 dark:text-gray-200"
        >
          Dirección
        </Label>
        <Input
          id="branch-address"
          type="text"
          placeholder="Ej: Carrera 43A # 1-50, Local 201"
          value={address}
          onChange={e => onAddressChange(e.target.value)}
        />
      </div>

      <div className="space-y-2.5">
        <Label
          htmlFor="branch-city"
          className="mb-0 text-theme-sm font-semibold text-gray-900 dark:text-gray-200"
        >
          Ciudad
        </Label>
        <Input
          id="branch-city"
          type="text"
          required
          placeholder="Medellín, Bogotá, Ciudad de México…"
          value={city}
          onChange={e => onCityChange(e.target.value)}
        />
        <p className="text-theme-xs text-gray-400 dark:text-gray-500">
          Zona de operación de la sede. El país de la tienda es {country}.
        </p>
      </div>

      <div className="space-y-2.5">
        <Label
          htmlFor="branch-email"
          className="mb-0 text-theme-sm font-semibold text-gray-900 dark:text-gray-200"
        >
          Email de contacto <span className="font-normal text-gray-400">(opcional)</span>
        </Label>
        <Input
          id="branch-email"
          type="email"
          placeholder="sede@mitienda.com"
          value={contactEmail}
          onChange={e => onContactEmailChange(e.target.value)}
        />
      </div>
    </div>
  );
};
