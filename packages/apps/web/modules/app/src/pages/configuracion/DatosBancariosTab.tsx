import { observer } from "mobx-react-lite";

import { organizacionStore } from "@/stores/organizacion.store";
import { BloqueConfig } from "@/pages/config-layout";
import { BuildingLibraryIcon } from "@heroicons/react/24/outline";
import { CuentasBancarias } from "./bancarios/CuentasBancarias";

import { VerificacionBancariaGate } from "./bancarios/VerificacionBancariaGate";

/**
 * Datos bancarios — `?tab=general&seccion=bancarios`.
 *
 * Exige verificación de identidad y código de seguridad para operar con cuentas bancarias.
 * Una vez confirmado el código, muestra `CuentasBancarias` con el banner y cuentas vinculadas.
 */
export const DatosBancariosTab = observer(() => {
  const org = organizacionStore.organizacion;
  if (!org || !organizacionStore.tieneOrganizacion) {
    return (
      <BloqueConfig
        icono={BuildingLibraryIcon}
        pregunta="Todavía no hay ninguna organización"
        descripcion="Las cuentas bancarias pertenecen a una organización. Créala primero y vuelve a esta pantalla."
      >
        <span />
      </BloqueConfig>
    );
  }

  return (
    <VerificacionBancariaGate>
      <CuentasBancarias />
    </VerificacionBancariaGate>
  );
});

export default DatosBancariosTab;
