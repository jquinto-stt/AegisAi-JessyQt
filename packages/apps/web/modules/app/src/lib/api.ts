/**
 * Configuración centralizada de endpoints y URLs de la API del backend.
 *
 * En desarrollo (Vite dev server) sin VITE_API_URL explícita, se usa ruta relativa '/api'
 * para aprovechar el proxy configurado en vite.config.ts hacia localhost:8080.
 *
 * En producción (Azure Static Web Apps), se dirige directamente al FQDN de Azure Container Apps.
 */

const DEFAULT_API_URL = "https://app-nectoia-api.calmpond-ae5d55bf.eastus.azurecontainerapps.io";

export const API_BASE_URL = (
  (import.meta.env.VITE_API_URL as string | undefined) ||
  (import.meta.env.DEV ? "" : DEFAULT_API_URL)
).replace(/\/$/, "");

/**
 * Normaliza y construye la URL absoluta o relativa correcta según el entorno.
 * Si se invoca hacia Azure Container Apps directamente, quita el prefijo '/api'
 * ya que los controladores del backend están montados en la raíz.
 */
export function apiUrl(endpoint: string): string {
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

  if (!API_BASE_URL) {
    // Modo local Vite proxy
    return cleanEndpoint.startsWith("/api") ? cleanEndpoint : `/api${cleanEndpoint}`;
  }

  // Azure Container Apps directo: quitar '/api' si viene incluido
  const route = cleanEndpoint.startsWith("/api/") ? cleanEndpoint.replace(/^\/api/, "") : cleanEndpoint;
  return `${API_BASE_URL}${route}`;
}

