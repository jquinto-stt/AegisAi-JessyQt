import React, { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button, Card } from "@/elements";
import { StepHeading } from "./onboarding-chrome";
import { WhatsAppConnectPanel } from "../../compositions/shared/WhatsAppConnectPanel";

interface StepBranchWhatsAppProps {
  eyebrow: string;
  /** Teléfono de la sede, el que quedará vinculado a la sesión. */
  phone: string;
  isConnected: boolean;
  onConnected: () => void;
  /** Cierra el alta sin conectar: la conexión es opcional. */
  onSkip: () => void;
}

/**
 * Último paso del alta: conectar el **WhatsApp Business** de la sucursal.
 *
 * La conexión es **opcional** —el botón de continuar sin conectar es explícito—
 * y el paso ocupa una pantalla entera porque decide si la sede puede atender por
 * el canal donde está la mayoría de sus clientes.
 *
 * ⚠️ Aquí **no** se conecta con un QR. `WhatsAppQrPanel` modelaba el vínculo de
 * *dispositivos* (una sesión de app), que no recibe webhooks ni es el camino
 * soportado para automatizar; la conexión correcta es la autorización con Meta
 * (Embedded Signup), que necesita el backend. El panel compartido lo explica y
 * ofrece una demostración **marcada como tal** en lugar de aparentar una
 * integración que todavía no existe.
 */
export const StepBranchWhatsApp: React.FC<StepBranchWhatsAppProps> = ({
  eyebrow,
  phone,
  isConnected,
  onConnected,
  onSkip,
}) => {
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnectDemo = () => {
    setIsConnecting(true);
    // Guarda la conexión en la tienda (ver `handleFinish`). Es una demostración:
    // no hay autorización de Meta todavía, y la UI lo dice.
    setTimeout(() => {
      setIsConnecting(false);
      onConnected();
    }, 900);
  };

  return (
    <div className="animate-in space-y-10 fade-in slide-in-from-bottom-1 duration-300">
      <StepHeading
        eyebrow={eyebrow}
        description="Conecta el WhatsApp de esta sucursal para atender por el canal donde ya están tus clientes. Puedes dejarlo para después."
      >
        <span className="flex flex-wrap items-center gap-3">
          WhatsApp Business
          <span className="rounded-full border border-gray-300 px-3 py-1 text-theme-xs font-bold uppercase tracking-[0.14em] text-gray-500 dark:border-gray-700 dark:text-gray-400">
            Opcional
          </span>
        </span>
      </StepHeading>

      {isConnected ? (
        /* Es el `Card` del catálogo, no un `<div>` clonado: este bloque es
           literalmente "agrupa contenido relacionado en una unidad delimitada
           con borde y radio", que es la definición del `Card`. Su superficie
           base (`rounded-xl border border-gray-200 …`) ya era la de aquí.
           ⚠️ Dos ajustes, ambos para que el render quede **idéntico**:
            · `p-6` basta aunque el `Card` emita `p-5 sm:p-6` — el `sm:p-6` que
              sobrevive vale justo 6, así que no hay que anularlo.
            · `dark:bg-transparent` anula el `dark:bg-white/[0.03]` del `Card`:
              este panel no tenía fondo y la página ya es `bg-white` en claro
              (`OnboardingPage.tsx:267`), así que el `bg-white` del `Card` es
              invisible; pero en oscuro el tinte del catálogo sí se notaría. */
        <Card className="space-y-5 p-6 dark:bg-transparent">
          <div className="flex items-start gap-3.5">
            <span className="flex h-11 w-11 flex-none items-center justify-center rounded-[10.5px] bg-gray-100 text-success-600 dark:bg-gray-800">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <div className="space-y-1">
              <h2 className="text-theme-sm font-bold text-gray-900 dark:text-white">
                Canal de WhatsApp listo
              </h2>
              <p className="text-theme-sm text-gray-500 dark:text-gray-400">
                La conexión de{" "}
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {phone || "esta sucursal"}
                </span>{" "}
                quedará guardada con la sede.
              </p>
            </div>
          </div>
          <p className="text-theme-xs leading-relaxed text-gray-400 dark:text-gray-500">
            Está en <strong className="font-bold">modo de demostración</strong>: no recibirá
            mensajes reales hasta que autorices con Meta desde Configuración → Canales de entrada.
          </p>
        </Card>
      ) : (
        <>
          {/*
            El valor de la conexión y el teléfono que quedará vinculado los pinta
            el panel. Antes había aquí una tarjeta con tres motivos propios y el
            panel traía los suyos: el paso mostraba dos listas de lo mismo.
          */}
          <WhatsAppConnectPanel
            onConnectDemo={handleConnectDemo}
            isConnecting={isConnecting}
            contextNote={
              <>
                Quedará vinculado el teléfono de la sede:{" "}
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {phone || "sin teléfono todavía"}
                </span>
              </>
            }
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              variant="ghost"
              intent="onboarding.whatsapp.skip"
              onClick={onSkip}
              disabled={isConnecting}
              className="rounded-full px-5 font-bold"
            >
              Continuar sin conectarlo
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
