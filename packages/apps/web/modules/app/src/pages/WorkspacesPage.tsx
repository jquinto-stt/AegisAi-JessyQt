import { Navigate } from "react-router-dom";

import { NectoLogo } from "../compositions/shared/NectoLogo";
import { ThemeToggle } from "../compositions/shared/ThemeToggle";
import { GlobalSearchButton } from "../compositions/shared/GlobalSearchButton";
import { SupportButton } from "../compositions/shared/SupportButton";
import { UserProfileDropdown } from "../compositions/workspace/UserProfileDropdown";
import { GlobalFranchiseOverview } from "../compositions/workspace/GlobalFranchiseOverview";
import { useAuth } from "../auth/AuthContext";
import { BaseAppHeader } from "@/shell";
import { PageMeta } from "@/shell/meta";

/**
 * Hub de franquicias y sucursales — la raíz del producto (`/` · `/workspaces`).
 *
 * Sólo compone el **chrome** de la página: la barra superior y la superficie
 * donde vive el resumen consolidado. Todo el contenido y su lógica están en
 * `GlobalFranchiseOverview`, que a su vez abre su propia configuración de sede.
 *
 * El `bg-gray-100` del `body` (`css/base.css`) es el fondo real; esta pantalla
 * no lo repinta. Por eso el header y el contenido son superficies `rounded-3xl
 * bg-white shadow-theme-sm` — la separación se lee por **superficie y sombra**,
 * no por un `bg-slate` propio.
 *
 * ⚠️ Guarda de autenticación: sin sesión activa el hub redirige a `/login`.
 * Antes no había guarda y el hub era público: un origen nuevo (túnel Cloudflare,
 * otro navegador) mostraba el hub vacío en lugar de pedir credenciales, y el
 * botón "Nueva sucursal" tenía que defenderse solo con su propia guarda.
 */
export default function WorkspacesPage() {
  const { isAuthenticated, isLoading } = useAuth();

  // Mientras se rehidrata la sesión no se pinta nada: redirigir a `/login`
  // durante la carga crearía un flash y perdería la sesión que está por llegar.
  if (isLoading) return null;

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <div className="flex min-h-screen w-full flex-col gap-4 p-4 sm:gap-6 sm:p-6 lg:p-8">
      <PageMeta title="Hub de franquicias y sucursales — NECTO" description="Gestión global de sucursales y franquicias" />

      <BaseAppHeader
        leftContent={
          <div className="flex items-center gap-3 sm:gap-4">
            <NectoLogo size="xs" inline />
          </div>
        }
      >
        <GlobalSearchButton />
        <SupportButton />
        <ThemeToggle />
        <UserProfileDropdown />
      </BaseAppHeader>

      <main className="w-full flex-1 rounded-3xl bg-white p-5 shadow-theme-sm sm:p-6 lg:p-8 dark:bg-gray-900">
        <div className="mx-auto w-full max-w-7xl">
          <GlobalFranchiseOverview />
        </div>
      </main>
    </div>
  );
}
