/**
 * Países del onboarding. Los usan dos pasos: Teléfono (prefijo y formato del
 * número) y País (moneda y zona horaria de la operación). Las banderas están
 * en `BanderaPais.tsx`, por código.
 */
export interface PaisOnboarding {
  codigo: string;
  prefijo: string;
  nombre: string;
  placeholder: string;
  moneda: string;
  zonaHoraria: string;
}

export const PAISES_ONBOARDING: PaisOnboarding[] = [
  { codigo: "CO", prefijo: "+57", nombre: "Colombia", placeholder: "300 123 4567", moneda: "COP", zonaHoraria: "America/Bogota" },
  { codigo: "PE", prefijo: "+51", nombre: "Perú", placeholder: "912 345 678", moneda: "PEN", zonaHoraria: "America/Lima" },
  { codigo: "EC", prefijo: "+593", nombre: "Ecuador", placeholder: "99 123 4567", moneda: "USD", zonaHoraria: "America/Guayaquil" },
  { codigo: "MX", prefijo: "+52", nombre: "México", placeholder: "55 1234 5678", moneda: "MXN", zonaHoraria: "America/Mexico_City" },
  { codigo: "CL", prefijo: "+56", nombre: "Chile", placeholder: "9 1234 5678", moneda: "CLP", zonaHoraria: "America/Santiago" },
  { codigo: "AR", prefijo: "+54", nombre: "Argentina", placeholder: "11 1234 5678", moneda: "ARS", zonaHoraria: "America/Argentina/Buenos_Aires" },
  { codigo: "ES", prefijo: "+34", nombre: "España", placeholder: "612 345 678", moneda: "EUR", zonaHoraria: "Europe/Madrid" },
  { codigo: "US", prefijo: "+1", nombre: "Estados Unidos", placeholder: "202 555 0123", moneda: "USD", zonaHoraria: "America/New_York" },
];

