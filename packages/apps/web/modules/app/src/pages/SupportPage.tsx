import { PageMeta } from "@/shell/meta";
import PublicPageLayout from "../layouts/public/PublicPageLayout";
import { NumberedSteps } from "./shared/NumberedSteps";
import { SUPPORT_SEALS, SUPPORT_STEPS } from "./support/support.constants";
import { SupportChannels } from "./support/SupportChannels";
import { SupportRequestForm } from "./support/SupportRequestForm";

/**
 * Soporte (`/soporte`).
 *
 * Es la página que faltaba detrás del botón de soporte: hasta ahora el acceso
 * —`SupportButton` en la cabecera y la fila del pie del sidebar— era sólo la
 * pieza visual, porque no había ningún sitio al que llevar.
 *
 * Es **de acceso libre**, igual que el centro de ayuda y por la misma razón: se
 * puede pedir soporte sin tener sesión (un problema de acceso es justo el caso
 * en el que no se puede entrar). Comparte armazón con `/ayuda` y con las páginas
 * legales, así que la banda, el botón de vuelta y el pie no se reescriben aquí.
 *
 * El orden de las secciones es deliberado y va de lo más barato a lo más caro:
 * primero los canales —el centro de ayuda resuelve muchas consultas sin esperar
 * a nadie—, después el formulario, y al final qué pasa una vez enviado. Poner el
 * formulario primero sería pedirle a la persona que espere dos días por algo que
 * puede leer en dos minutos.
 *
 * ⚠️ La página **no** promete que el envío llegue a un buzón: eso lo dice el
 * propio formulario, y el porqué está en `support/support-requests.ts`. Cuando
 * exista el canal real, se retira esa nota y esta página no cambia.
 */
export default function SupportPage() {
  return (
    <PublicPageLayout
      eyebrow="Soporte"
      title="Estamos para ayudarte"
      summary="Escríbenos lo que necesitas y te contesta una persona del equipo. Si es una duda frecuente, el centro de ayuda suele resolverla al momento."
      heroExtra={
        <div className="mt-14 grid grid-cols-2 gap-8 sm:grid-cols-4">
          {SUPPORT_SEALS.map(({ id, label, icon: Icon }) => (
            <div key={id} className="flex flex-col items-center gap-3 text-center">
              <Icon className="h-9 w-9" strokeWidth={1.4} />
              <span className="text-theme-sm leading-tight font-bold">{label}</span>
            </div>
          ))}
        </div>
      }
    >
      <PageMeta
        title="Soporte — NECTO"
        description="Canales de contacto, formulario de soporte y plazos de respuesta de Necto"
      />

      <SupportChannels />

      <div className="mt-16">
        <SupportRequestForm />
      </div>

      <div className="mt-16">
        <NumberedSteps id="support-steps" heading="Qué pasa después" steps={SUPPORT_STEPS} />
      </div>
    </PublicPageLayout>
  );
}
