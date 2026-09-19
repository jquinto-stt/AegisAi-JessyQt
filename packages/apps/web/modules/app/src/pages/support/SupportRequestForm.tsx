import React, { useState } from "react";
import { CheckCircle2, TriangleAlert } from "lucide-react";
import { Button, Input, Label, Select, Textarea } from "@/elements";
import { organizacionStore } from "@/stores/organizacion.store";
import {
  SUPPORT_MESSAGE_MAX,
  SUPPORT_MESSAGE_MIN,
  SUPPORT_SUBJECT_MIN,
  SUPPORT_TOPICS,
  supportTopicLabel,
} from "./support.constants";
import {
  createSupportRequest,
  readSupportRequests,
  type SupportRequest,
} from "./support-requests";

/**
 * Validación de correo: deliberadamente laxa.
 *
 * No intenta cubrir la RFC 5322 —ninguna expresión corta lo hace, y las que lo
 * intentan rechazan direcciones válidas—. Sólo descarta lo que es imposible
 * contestar: sin arroba, sin dominio o con espacios. Un correo raro pero real
 * debe poder enviarse.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FieldErrors {
  subject?: string;
  message?: string;
  email?: string;
}

/**
 * Formulario de soporte — la **caja de texto** de la página.
 *
 * Se valida al enviar y no al teclear: marcar en rojo un campo a medio escribir
 * convierte el formulario en una discusión antes de que la persona haya podido
 * terminar la frase.
 *
 * ⚠️ El envío **no** sale a un buzón todavía. Lo que hace `createSupportRequest`
 * está documentado en `support-requests.ts`, y aquí sólo se consume su
 * resultado: la confirmación muestra la referencia que devuelve, así que lo que
 * se enseña y lo que se guarda son el mismo objeto.
 *
 * ⚠️ `Input` emite el **evento** en `onChange` y `Textarea` emite el **valor**
 * (`onChange(value: string)`). La asimetría es del catálogo, no de esta pantalla;
 * por eso los dos campos de texto no se escriben igual.
 */
export const SupportRequestForm: React.FC = () => {
  const [topic, setTopic] = useState<string>(SUPPORT_TOPICS[0]?.value ?? "otro");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  // Quien ya tiene sesión no debería volver a teclear su correo: se precarga y
  // se deja cambiar, porque la respuesta puede querer recibirla en otra cuenta.
  const [email, setEmail] = useState(organizacionStore.usuario?.email ?? "");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [sent, setSent] = useState<SupportRequest | null>(null);

  const reset = () => {
    setSubject("");
    setMessage("");
    setErrors({});
    setSent(null);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const next: FieldErrors = {};
    if (subject.trim().length < SUPPORT_SUBJECT_MIN) {
      next.subject = `Resume el caso en una frase (mínimo ${SUPPORT_SUBJECT_MIN} caracteres).`;
    }
    if (message.trim().length < SUPPORT_MESSAGE_MIN) {
      next.message = `Cuéntanos algo más de detalle (mínimo ${SUPPORT_MESSAGE_MIN} caracteres).`;
    }
    if (!EMAIL_RE.test(email.trim())) {
      next.email = "Necesitamos un correo válido: es donde te contestamos.";
    }

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSent(createSupportRequest({ topic, subject, message, email }));
  };

  return (
    <section aria-labelledby="support-request" id="solicitud" className="scroll-mt-24">
      <h2
        id="support-request"
        className="text-2xl font-bold tracking-tight text-secondary-600 dark:text-white"
      >
        Cuéntanos qué necesitas
      </h2>

      {sent ? (
        <Confirmation request={sent} onReset={reset} />
      ) : (
        <>
          <p className="mt-3 max-w-2xl text-theme-sm leading-relaxed text-gray-500 dark:text-gray-400">
            Escribe el caso con tus palabras. Queda registrado con una referencia, y
            cuanto más concreto sea, menos idas y venidas nos ahorramos los dos.
          </p>

          {/* Honestidad sobre el alcance de lo que se envía. No es un adorno: sin
              el buzón conectado, callarlo haría creer que alguien ha recibido la
              solicitud. Se retira el día que exista el canal real. */}
          <p
            data-support-scope-note
            className="mt-4 flex max-w-2xl items-start gap-2 rounded-xl border border-warning-200 bg-warning-25 px-4 py-3 text-theme-xs leading-relaxed text-warning-800 dark:border-warning-500/30 dark:bg-warning-500/10 dark:text-warning-200"
          >
            <TriangleAlert className="mt-0.5 h-3.5 w-3.5 flex-none" />
            <span>
              El buzón todavía no está conectado en este entorno: tu solicitud se guarda
              en el dispositivo con su referencia y no sale de aquí. El formulario ya
              recoge todo lo que necesitará el canal real.
            </span>
          </p>

          <form
            data-support-request-form
            onSubmit={handleSubmit}
            noValidate
            className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 sm:p-7 dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                {/* ⚠️ `Select` del catálogo no acepta `id`, así que no se puede
                    atar un `htmlFor` como en los demás campos. Se envuelve en el
                    `Label` para que la asociación sea implícita y el control siga
                    teniendo nombre accesible. */}
                <Label htmlFor={undefined} className="flex flex-col gap-1.5">
                  <span>Motivo</span>
                  <Select
                    aria-label="Motivo de la solicitud"
                    options={SUPPORT_TOPICS}
                    defaultValue={topic}
                    onChange={setTopic}
                  />
                </Label>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="support-subject">Asunto</Label>
                <Input
                  id="support-subject"
                  name="subject"
                  value={subject}
                  onChange={event => setSubject(event.target.value)}
                  placeholder="Ej.: no puedo entrar con mi correo"
                  error={Boolean(errors.subject)}
                  hint={errors.subject}
                  maxLength={120}
                />
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-1.5">
              <Label htmlFor="support-message">Descripción</Label>
              <Textarea
                id="support-message"
                name="message"
                rows={7}
                value={message}
                onChange={val => setMessage(val)}
                maxLength={SUPPORT_MESSAGE_MAX}
                error={Boolean(errors.message)}
                hint={errors.message}
                placeholder="Cuéntanos qué estabas haciendo, qué esperabas que pasara y qué pasó en su lugar."
                className="resize-y"
              />
              <p className="text-right text-theme-xs text-gray-400">
                {message.length} / {SUPPORT_MESSAGE_MAX}
              </p>
            </div>

            <div className="mt-5 flex flex-col gap-1.5 sm:max-w-sm">
              <Label htmlFor="support-email">Correo de respuesta</Label>
              <Input
                id="support-email"
                name="email"
                type="email"
                value={email}
                onChange={event => setEmail(event.target.value)}
                placeholder="tu@correo.com"
                error={Boolean(errors.email)}
                hint={errors.email}
                autoComplete="email"
              />
            </div>

            <div className="mt-6 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                className="h-11 rounded-full text-theme-sm font-bold"
                onClick={reset}
              >
                Limpiar
              </Button>
              <Button
                type="submit"
                data-support-submit
                className="h-11 rounded-full px-7 text-theme-sm font-bold"
              >
                Enviar solicitud
              </Button>
            </div>
          </form>
        </>
      )}
    </section>
  );
};

/**
 * Confirmación. Enseña **lo que se acaba de registrar**, no un "gracias" genérico:
 * la referencia, el motivo y el correo salen del objeto que se guardó, así que si
 * la confirmación y el registro divergieran se vería aquí.
 */
const Confirmation: React.FC<{ request: SupportRequest; onReset: () => void }> = ({
  request,
  onReset,
}) => {
  // Se lee después de escribir, así que el recuento ya incluye esta solicitud.
  const stored = readSupportRequests().length;

  return (
    <div
      data-support-sent
      className="mt-7 rounded-2xl border border-public-500/40 bg-public-500/[0.06] p-6 sm:p-8"
    >
      <div className="flex items-start gap-4">
        <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-public-500 text-white">
          <CheckCircle2 className="h-5.5 w-5.5" />
        </span>

        <div className="min-w-0 flex-1 space-y-4">
          <h3 className="text-lg font-bold text-secondary-600 dark:text-white">
            Solicitud registrada
          </h3>

          <p className="text-theme-sm leading-relaxed text-gray-600 dark:text-gray-300">
            Tu referencia es{" "}
            <span
              data-support-reference
              className="font-mono text-theme-sm font-bold text-public-700 dark:text-public-500"
            >
              {request.reference}
            </span>
            . Cítala si necesitas volver sobre este caso.
          </p>

          <dl className="grid gap-x-6 gap-y-2 text-theme-sm sm:grid-cols-[170px_minmax(0,1fr)]">
            <dt className="text-gray-500 dark:text-gray-400">Motivo</dt>
            <dd className="font-semibold text-gray-800 dark:text-gray-100">
              {supportTopicLabel(request.topic)}
            </dd>

            <dt className="text-gray-500 dark:text-gray-400">Asunto</dt>
            <dd className="font-semibold text-gray-800 dark:text-gray-100">
              {request.subject}
            </dd>

            <dt className="text-gray-500 dark:text-gray-400">Correo de respuesta</dt>
            <dd className="font-semibold text-gray-800 dark:text-gray-100">{request.email}</dd>
          </dl>

          <p className="text-theme-xs leading-relaxed text-gray-500 dark:text-gray-400">
            Guardada en este dispositivo. Llevas {stored} solicitudes registradas aquí.
          </p>

          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-full text-theme-sm font-bold"
            onClick={onReset}
          >
            Enviar otra solicitud
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SupportRequestForm;
