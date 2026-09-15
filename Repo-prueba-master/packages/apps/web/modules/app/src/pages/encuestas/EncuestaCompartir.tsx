import { useState } from "react";
import { observer } from "mobx-react-lite";
import { PageMeta } from "@/shell/meta";
import { Card } from "@/elements/ui/card";
import { Button } from "@/elements/ui/button";
import { Input } from "@/elements/form/input";
import { Label } from "@/elements/form/label";
import { queuesStore } from "@/stores";

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="mr-1.5 h-4 w-4">
    <path d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm0 18a8 8 0 01-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1112 20z" />
  </svg>
);

/**
 * EncuestaCompartir — vista de Encuestas para el OPERADOR (mock).
 *
 * A diferencia del admin (que ve estadísticas y configura), el operador solo
 * comparte el link de la encuesta. La encuesta se envía automáticamente al
 * terminar cada turno; esto es un canal extra para compartirla manualmente.
 */
export const EncuestaCompartir = observer(() => {
  const [copiado, setCopiado] = useState(false);

  // Link público de la encuesta (mock: token de ejemplo).
  const link = `${window.location.origin}/s/demo`;
  const negocio = queuesStore.surveyConfig.businessName;

  // QR del link — imagen generada por un servicio público (mock, sin dependencias).
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=10&data=${encodeURIComponent(link)}`;
  const descargarQr = () => window.open(`${qrUrl}&download=1`, "_blank");

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      // Entorno sin clipboard API: silencioso, es mock.
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const compartirWhatsApp = () => {
    const msg = encodeURIComponent(
      `¡Hola! Cuéntanos cómo estuvo tu experiencia en ${negocio}. Califícanos aquí: ${link}`
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  const previsualizar = () => window.open("/s/demo", "_blank");

  return (
    <>
      <PageMeta title="Encuesta de satisfacción" description="Comparte el link de la encuesta con tus clientes" />

      {/* Encabezado */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">Encuesta de satisfacción</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Comparte el link con tus clientes para que califiquen su experiencia.
        </p>
      </div>

      {/* Tarjeta centrada */}
      <div className="mx-auto w-full max-w-lg">
        <Card>
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            Este es el enlace de la encuesta de {negocio}. Compártelo con el cliente para que califique el servicio.
          </p>

          {/* Código QR del link — el cliente lo escanea y abre la encuesta */}
          <div className="mb-5 flex flex-col items-center rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-white/[0.03]">
            <img
              src={qrUrl}
              alt="Código QR de la encuesta"
              width={180}
              height={180}
              className="h-44 w-44 rounded-lg bg-white p-2"
            />
            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              El cliente escanea este código para abrir la encuesta.
            </p>
            <Button size="sm" variant="outline" className="mt-3" onClick={descargarQr}>
              Descargar QR
            </Button>
          </div>

          {/* Link readonly + copiar */}
          <div>
            <Label htmlFor="survey-link">Link de la encuesta</Label>
            <div className="flex items-center gap-2">
              <Input id="survey-link" value={link} readOnly className="flex-1" />
              <Button size="sm" variant="outline" onClick={copiar}>
                {copiado ? "¡Copiado!" : "Copiar"}
              </Button>
            </div>
          </div>

          {/* Acciones de compartir */}
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Button size="sm" onClick={compartirWhatsApp}>
              <WhatsAppIcon />
              Compartir por WhatsApp
            </Button>
            <Button size="sm" variant="outline" onClick={previsualizar}>
              Previsualizar
            </Button>
          </div>

          {/* Nota al pie */}
          <p className="mt-5 text-xs text-gray-400 dark:text-gray-500">
            La encuesta se envía automáticamente al cliente cuando termina su turno. Este enlace es para compartirla manualmente si lo necesitas.
          </p>
        </Card>
      </div>
    </>
  );
});

export default EncuestaCompartir;
