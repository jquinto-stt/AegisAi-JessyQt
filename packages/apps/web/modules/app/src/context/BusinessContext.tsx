import React, { createContext, useContext } from "react";
import { useBusinesses } from "./business/hooks/useBusinesses";
import { CLIENT_ADMIN_ROLE } from "./business/roles.constants";
import { useCommandPaletteShortcut } from "./business/hooks/useCommandPaletteShortcut";
import type { BusinessContextType } from "./business/types";

/* ── Public surface (barrel) ───────────────────────────────────────────
 * Everything the app imported from this module keeps working unchanged.
 * Types live in ./business/types, static catalogues in ./business/*.constants,
 * the semantics resolver in ./business/semantics and the state domains in
 * ./business/hooks/*.
 *
 * ⚠️ El rol es un catálogo de uno: el **Admin Cliente** (§5.3). Antes había un
 * dominio de roles con estado (`useRoles`) que persistía roles personalizados en
 * `necto_custom_roles` y alimentaba un selector de rol. Se retiró junto con los
 * cinco roles de restaurante que ningún flujo usaba. `activeRole` es ahora la
 * constante, no estado: no hay nada que cambiar en runtime.
 *
 * ⚠️ El catálogo de sedes arranca **vacío**. Se retiró `seed-businesses.ts`
 * (una ferretería y una hamburguesería de ejemplo): sembraba dos sucursales
 * inventadas en cuanto el almacenamiento estaba vacío, así que el estado "Aún no
 * tienes sucursales" del hub era inalcanzable. La primera sede la crea el usuario.
 *
 * ⚠️ Dos ámbitos: **tienda** (tipo de negocio, modelo de oferta, icono, moneda,
 * país) y **sucursal** (nombre, código, dirección, ciudad, contacto, horarios,
 * módulos). `storeIdentity` expone el primero para que "Crear sucursal" no vuelva
 * a tipificar el negocio en cada alta. Se lee de `businesses[0]`, que es la sede
 * **más reciente** (`createBusiness` antepone); da igual cuál sea, porque
 * `updateStoreIdentity` mantiene la identidad idéntica en toda la red.
 * ──────────────────────────────────────────────────────────────────── */
export * from "./business/types";
export type { BusinessContextType } from "./business/types";
export { BUSINESS_ARCHETYPES } from "./business/business-archetypes.constants";
export { CLIENT_ADMIN_ROLE } from "./business/roles.constants";
export {
  DEFAULT_OPENING_DAYS,
  DEFAULT_OPENING_HOURS,
  STORE_COUNTRIES,
  suggestBranchCode,
} from "./business/branch-defaults.constants";
export { getBusinessSemantics } from "./business/semantics";
export {
  channelStatus,
  emptyChannelConnections,
  findChannelConnection,
  isChannelConnected,
  isDemoConnection,
  isLiveConnection,
  upsertChannelConnection,
  whatsappConnection,
} from "./business/channel-connections.utils";

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export const BusinessProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const businessesDomain = useBusinesses();
  const paletteDomain = useCommandPaletteShortcut();

  return (
    <BusinessContext.Provider
      value={{
        businesses: businessesDomain.businesses,
        activeBusiness: businessesDomain.activeBusiness,
        activeBusinessId: businessesDomain.activeBusinessId,
        storeIdentity: businessesDomain.storeIdentity,
        semantics: businessesDomain.semantics,
        activeRole: CLIENT_ADMIN_ROLE,
        isCommandPaletteOpen: paletteDomain.isCommandPaletteOpen,
        setIsCommandPaletteOpen: paletteDomain.setIsCommandPaletteOpen,
        toggleModule: businessesDomain.toggleModule,
        createBusiness: businessesDomain.createBusiness,
        switchBusiness: businessesDomain.switchBusiness,
        updateBusiness: businessesDomain.updateBusiness,
        setChannelConnection: businessesDomain.setChannelConnection,
        disconnectChannel: businessesDomain.disconnectChannel,
        updateStoreIdentity: businessesDomain.updateStoreIdentity,
        deleteBusiness: businessesDomain.deleteBusiness,
      }}
    >
      {children}
    </BusinessContext.Provider>
  );
};

export const useBusiness = () => {
  const context = useContext(BusinessContext);
  if (!context) {
    throw new Error("useBusiness must be used within a BusinessProvider");
  }
  return context;
};
