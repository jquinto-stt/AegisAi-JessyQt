import React from "react";
import { MapPin } from "lucide-react";
import { STORE_COUNTRIES } from "../../../context/BusinessContext";
import { Input, Label } from "@/elements";
import { OptionCard, StepHeading } from "../onboarding-chrome";

interface StepCountryProps {
  eyebrow: string;
  country: string;
  onCountryChange: (country: string) => void;
}

/**
 * Paso 2 — País de `onboarding_new_user`.
 *
 * El país es un dato **de la persona**, no de la tienda: describe desde dónde
 * opera y con qué mercado lee sus cifras. Por eso vive en el perfil y no en
 * `BusinessInstance`.
 *
 * La lista es la misma que ofrece el alta de tienda (`STORE_COUNTRIES`) en lugar
 * de una copia propia: dos catálogos de mercados bajo el mismo producto acaban
 * divergiendo. Y siempre queda el campo libre, para que nadie quede fuera del
 * catálogo.
 */
export const StepCountry: React.FC<StepCountryProps> = ({
  eyebrow,
  country,
  onCountryChange,
}) => {
  const isPreset = STORE_COUNTRIES.includes(country);

  return (
    <div className="animate-in space-y-8 fade-in slide-in-from-bottom-1 duration-300">
      <StepHeading
        eyebrow={eyebrow}
        description="Nos sirve para hablar tu idioma comercial: moneda, formatos y ejemplos de tu región."
      >
        ¿En qué país estás?
      </StepHeading>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {STORE_COUNTRIES.map(name => (
          <OptionCard
            key={name}
            active={country === name}
            onClick={() => onCountryChange(name)}
            title={name}
            className="px-3.5 py-3"
          />
        ))}
      </div>

      <div className="space-y-2.5">
        <Label
          htmlFor="new-user-country-other"
          className="flex items-center gap-2 text-theme-sm font-semibold text-gray-900 dark:text-gray-200"
        >
          <MapPin className="h-4 w-4 text-gray-400" />
          <span>¿No está en la lista?</span>
        </Label>
        <Input
          id="new-user-country-other"
          type="text"
          value={isPreset ? "" : country}
          onChange={e => onCountryChange(e.target.value)}
          placeholder="Escribe tu país"
          className="font-semibold"
        />
        <p className="text-theme-xs text-gray-400">
          Escribir aquí reemplaza la selección de arriba.
        </p>
      </div>
    </div>
  );
};
