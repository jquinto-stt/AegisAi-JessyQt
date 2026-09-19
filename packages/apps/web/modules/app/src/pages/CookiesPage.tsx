import LegalDocumentView from "../legal/LegalDocumentView";
import { LEGAL_DOCUMENTS } from "../legal/legal.constants";

/**
 * Política de Cookies (`/cookies`).
 *
 * Es el destino del enlace "Configurar cookies" del aviso de consentimiento y de
 * los enlaces legales del pie. Acceso libre: si el aviso se muestra en cualquier
 * pantalla pública, su enlace no puede exigir sesión.
 */
export default function CookiesPage() {
  return <LegalDocumentView doc={LEGAL_DOCUMENTS.cookies} />;
}
