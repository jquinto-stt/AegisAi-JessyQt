import LegalDocumentView from "../legal/LegalDocumentView";
import { LEGAL_DOCUMENTS } from "../legal/legal.constants";

/**
 * Términos y Condiciones (`/terminos`).
 *
 * Página de **acceso libre**: es el contrato que alguien acepta *antes* de tener
 * cuenta, así que exigir sesión para leerlo vaciaría de sentido el asentimiento.
 */
export default function TermsPage() {
  return <LegalDocumentView doc={LEGAL_DOCUMENTS.terms} />;
}
