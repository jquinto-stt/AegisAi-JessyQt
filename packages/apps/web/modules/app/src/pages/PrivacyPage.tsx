import LegalDocumentView from "../legal/LegalDocumentView";
import { LEGAL_DOCUMENTS } from "../legal/legal.constants";

/**
 * Política de Privacidad (`/privacidad`).
 *
 * Acceso libre por la misma razón que los términos: se acepta al crear la cuenta
 * y tiene que poder leerse antes.
 */
export default function PrivacyPage() {
  return <LegalDocumentView doc={LEGAL_DOCUMENTS.privacy} />;
}
