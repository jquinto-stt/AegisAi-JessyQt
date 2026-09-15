import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardDescription,
  CardHeader,
  CardTitle,
  type BadgeColor,
} from "@/elements";

/* ── Configuración del canal conversacional ──────────────────────────────────
 *
 * Existe por una razón muy concreta: el canal tiene dos mitades y sólo una está
 * implementada. **Conversaciones** es la experiencia del chat, que ya funciona con
 * datos locales. **Configuración** es la conexión real con WhatsApp, que todavía
 * no existe (§8) — y decir eso en pantalla es mejor que un menú que lleve a un
 * formulario vacío o, peor, que finja una conexión.
 *
 * ⚠️ La pestaña **no** ofrece un interruptor de "conectar". Un botón que no
 * conecta nada deja al operador creyendo que su WhatsApp está enlazado. Lo que
 * hay es el **estado real** del canal —que vive en la tienda, no aquí— y la lista
 * de lo que falta.
 *
 * ⚠️ La conexión del canal es **de la sede** y se administra en Ajustes de Sede
 * (pestaña Canales), que es su dueño. Esta pantalla sólo la muestra y enlaza: si
 * escribiera `channelConnections` por su cuenta, habría dos sitios decidiendo qué
 * significa "WhatsApp conectado" — que es exactamente lo que
 * `channel-connections.utils` vino a resolver.
 * ─────────────────────────────────────────────────────────────────────────── */

export interface ConversationSettingsViewProps {
  /** Abre Ajustes de Sede en la pestaña de canales. Puente, igual que en Pedidos. */
  onOpenStoreChannels: () => void;
  /** Estado del canal en la sede, ya resuelto por quien tiene la tienda. */
  connectionStatus: "not_connected" | "pending" | "connected" | "error";
  /** Teléfono de atención, si la conexión lo declara. */
  displayPhoneNumber?: string;
}

const STATUS_LABEL: Record<ConversationSettingsViewProps["connectionStatus"], string> = {
  connected: "Conectado",
  pending: "Pendiente",
  error: "Error",
  not_connected: "No conectado",
};

/**
 * ⚠️ La píldora de estado pasa a ser un `Badge` del catálogo, así que el color se
 * expresa como **color semántico** (`success`/`warning`/`error`/`light`) y ya no
 * como un mapa de clases. La tabla traduce estado → color, que es el único cambio:
 * los cuatro estados y su significado son los mismos.
 *
 * ⚠️ `warning` se corrige a mano: el catálogo pinta esa variante en
 * `dark:text-orange-400`, fuera de la paleta del proyecto. Es la misma traducción
 * que ya usa Pedidos para sus insignias de urgencia.
 */
const STATUS_BADGE: Record<
  ConversationSettingsViewProps["connectionStatus"],
  { color: BadgeColor; className?: string }
> = {
  connected: { color: "success" },
  pending: { color: "warning", className: "dark:text-warning-500" },
  error: { color: "error" },
  not_connected: { color: "light" },
};

export function ConversationSettingsView({
  onOpenStoreChannels,
  connectionStatus,
  displayPhoneNumber,
}: ConversationSettingsViewProps) {
  return (
    <div className="flex flex-col gap-5" data-conversation-settings>
      <Card className="p-0 sm:p-0">
        <CardHeader>
          <div>
            <CardTitle className="text-base font-bold">Conexión de WhatsApp</CardTitle>
            <CardDescription className="mt-0.5">
              El canal pertenece a esta sede; su conexión se administra con la tienda.
            </CardDescription>
          </div>
        </CardHeader>

        <CardBody className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 px-3 py-3 dark:border-gray-800">
            <div className="min-w-0">
              <p className="text-theme-sm font-medium text-gray-800 dark:text-white/90">
                WhatsApp Business
              </p>
              <p className="mt-0.5 truncate text-theme-xs text-gray-500 dark:text-gray-400">
                {displayPhoneNumber ?? "Sin número de atención registrado"}
              </p>
            </div>
            {/* ⚠️ El `Badge` del catálogo no reenvía `data-*` (lista de props fija, sólo
                emite `data-intent`): el atributo cuyo valor lee la guarda
                (`not_connected`) vive en el `<span>` que lo envuelve. */}
            <span
              data-conversation-connection-status={connectionStatus}
              className="inline-flex flex-none"
            >
              <Badge
                color={STATUS_BADGE[connectionStatus].color}
                size="sm"
                className={`px-2.5 font-bold ${STATUS_BADGE[connectionStatus].className ?? ""}`}
                intent="conversations.settings.status"
              >
                {STATUS_LABEL[connectionStatus]}
              </Badge>
            </span>
          </div>

          {/* ⚠️ `Button` y no `Link`: no navega a una ruta, invoca un callback que
              cambia de sección en el shell. El relleno `secondary`, la forma de píldora
              y la ausencia de sombra son del proyecto y se imponen por `className`. */}
          <Button
            variant="primary"
            onClick={onOpenStoreChannels}
            className="w-fit rounded-full bg-secondary-600 px-5 py-2.5 text-theme-sm font-medium shadow-none hover:bg-secondary-700 dark:bg-white dark:text-secondary-900 dark:hover:bg-gray-100"
            intent="conversations.settings.open_store"
          >
            Administrar en la configuración de sede
          </Button>
        </CardBody>
      </Card>

      <Card className="p-0 sm:p-0">
        <CardHeader>
          <div>
            <CardTitle className="text-base font-bold">Qué falta para conectar</CardTitle>
            <CardDescription className="mt-0.5">
              Hoy la conversación funciona con datos locales de demostración.
            </CardDescription>
          </div>
        </CardHeader>

        <CardBody className="flex flex-col gap-3">
          {/* ⚠️ `Alert` es la respuesta del catálogo a "bloque informativo persistente
              con título y cuerpo" (intención 20ef de discovery). Su contenedor es fijo
              (`rounded-xl border p-4`) y el componente NO expone `className`: el borde,
              el radio y el icono de 24 px son del catálogo, no del proyecto. Es el
              cambio más visible del lote y se deja señalado como decisión reversible. */}
          <Alert
            variant="default"
            title="Autorización de la cuenta de WhatsApp Business"
            message="El enlace con Meta se hará desde el canal de la sede. Mientras no exista, las conversaciones que ves son de demostración y no salen de este navegador."
          />

          <Alert
            variant="default"
            title="Recepción de mensajes entrantes"
            message="Los mensajes que escriban tus clientes llegarán a este mismo hilo cuando el envío y la recepción estén enlazados con el canal real."
          />
        </CardBody>
      </Card>
    </div>
  );
}

export default ConversationSettingsView;
