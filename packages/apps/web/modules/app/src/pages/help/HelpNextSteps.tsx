import React from "react";
import { NumberedSteps } from "../shared/NumberedSteps";
import { HELP_STEPS } from "./help.constants";

/**
 * "Primeros pasos" del centro de ayuda: la secuencia del alta —cuenta, usuario,
 * tienda, módulos— que es justo el modelo que el producto separa.
 *
 * Sólo une el contenido con la pieza compartida. La maquetación de la línea de
 * tiempo —conector, insignia numerada, contrato de `aria-hidden`— vive en
 * `NumberedSteps`, que la página de soporte reusa para "Qué pasa después".
 */
export const HelpNextSteps: React.FC = () => (
  <NumberedSteps id="help-next-steps" heading="Primeros pasos" steps={HELP_STEPS} />
);

export default HelpNextSteps;
