import React from "react";
import { Building2, Hash, Phone } from "lucide-react";
import { Input, Label } from "@/elements";
import { StepHeading } from "./onboarding-chrome";

interface StepBranchIdentityProps {
  eyebrow: string;
  branchName: string;
  branchCode: string;
  contactPhone: string;
  onBranchNameChange: (value: string) => void;
  onBranchCodeChange: (value: string) => void;
  onContactPhoneChange: (value: string) => void;
}

/**
 * Ámbito **sucursal**: cómo se llama esta unidad operativa, cómo se la identifica
 * y cómo se la contacta.
 *
 * ⚠️ Aquí no se pregunta nada del titular ni del negocio. El propietario ya está
 * establecido por la sesión y la identidad de la tienda se hereda, así que este
 * paso no puede convertirse en un segundo registro de usuario.
 *
 * El teléfono es el **de la sede**, no el del titular: una sucursal puede tener su
 * propia línea de atención. Se precarga con el contacto que la tienda ya conoce
 * para no obligar a escribirlo de nuevo, pero el valor pertenece a esta sede.
 *
 * ⚠️ Los `id` (`branch-name`, `branch-code`, `branch-phone`) viajan al `<input>`
 * del DS y son contrato: `verify-profile.mjs` los busca así y les escribe el valor
 * despachando un `input` nativo, que es justo lo que escucha el `onChange` del DS.
 */
export const StepBranchIdentity: React.FC<StepBranchIdentityProps> = ({
  eyebrow,
  branchName,
  branchCode,
  contactPhone,
  onBranchNameChange,
  onBranchCodeChange,
  onContactPhoneChange,
}) => {
  return (
    <div className="animate-in space-y-10 fade-in slide-in-from-bottom-1 duration-300">
      <StepHeading
        eyebrow={eyebrow}
        description="Sólo los datos de esta unidad operativa. La cuenta ya identifica a su propietario, así que no hay nada que volver a registrar."
      >
        Configura tu sucursal
      </StepHeading>

      {/* Nombre de la sucursal */}
      <div className="space-y-2.5">
        <Label
          htmlFor="branch-name"
          className="mb-0 text-theme-sm font-semibold text-gray-900 dark:text-gray-200"
        >
          Nombre de la sucursal
        </Label>
        <Input
          id="branch-name"
          type="text"
          required
          placeholder="Sede Centro, Sucursal Norte, Local 201…"
          value={branchName}
          onChange={e => onBranchNameChange(e.target.value)}
          className="font-semibold"
        />
        <p className="text-theme-xs text-gray-400 dark:text-gray-500">
          Es el nombre con el que tus clientes y tu equipo reconocen esta sede.
        </p>
      </div>

      {/* Código interno */}
      <div className="space-y-2.5">
        <Label
          htmlFor="branch-code"
          className="mb-0 text-theme-sm font-semibold text-gray-900 dark:text-gray-200"
        >
          Código interno <span className="font-normal text-gray-400">(opcional)</span>
        </Label>
        <Input
          id="branch-code"
          type="text"
          placeholder="SUC-01"
          value={branchCode}
          onChange={e => onBranchCodeChange(e.target.value)}
          className="font-mono font-semibold uppercase"
        />
        <p className="text-theme-xs text-gray-400 dark:text-gray-500">
          Identifica la sucursal en reportes, pedidos y transferencias de stock.
        </p>
      </div>

      {/* Teléfono de la sucursal */}
      <div className="space-y-2.5">
        <Label
          htmlFor="branch-phone"
          className="mb-0 text-theme-sm font-semibold text-gray-900 dark:text-gray-200"
        >
          Teléfono de la sucursal <span className="font-normal text-gray-400">(opcional)</span>
        </Label>
        <Input
          id="branch-phone"
          type="tel"
          placeholder="+57 300 000 0000"
          value={contactPhone}
          onChange={e => onContactPhoneChange(e.target.value)}
        />
        <p className="text-theme-xs text-gray-400 dark:text-gray-500">
          Línea de atención de esta sede. Viene con el contacto que ya conocemos:
          cámbialo si la sucursal tiene el suyo.
        </p>
      </div>
    </div>
  );
};
