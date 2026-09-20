import { observer } from "mobx-react-lite";
import { useState } from "react";

import { Card } from "@/elements/ui/card";
import { Badge } from "@/elements/ui/badge";
import { Button } from "@/elements/ui/button";
import { Avatar } from "@/elements/ui/avatar";
import { Modal } from "@/elements/ui/modal";
import { pedidosStore, conversacionesStore, sessionStore } from "@/stores";
import { puede, puedeResponderConversacion, motivoSinPermiso } from "@/stores/acceso.utils";
import { ATENCION_LABEL, ESTADO_CONVERSACION_LABEL } from "@/stores";
import type { ConversacionCanal } from "@/stores";
import { AVATAR_MAP, inicialesDe } from "@/pages/conversaciones/conversaciones.utils";
import { CabeceraWidget, ListaVacia, relativo } from "./widgets.comunes";

// ═══════════════════════════════════════════════════════════════════════════
// CONVERSACIONES URGENTES — lo que espera respuesta
// ═══════════════════════════════════════════════════════════════════════════
//
// La fuente de verdad es `conversacionesStore`, NO `pedidosStore`: una fila de
// aquí es un CLIENTE-EN-UN-CANAL, y esa entidad pertenece al módulo de
// Conversaciones. Un cliente que está esperando a un asesor puede no tener
// ningún pedido en curso, y con `pedidosStore.enCurso()` desaparecía de la
// lista justo cuando más falta hacía verlo.
//
// La urgencia NO se infiere de `noLeidos` ni de la antigüedad: sale de
// `requiereAtencionHumana`, que responde a «¿el cliente PIDIÓ un asesor y nadie
// lo ha tomado?». Es la única pregunta que distingue «necesita algo de mí» de
// «está escribiendo».
//
// ── La acción se comprueba, no se asume ───────────────────────────────────
//
// «Tomar» escribe en el store y exige `channels.respond`. Una fila de esta
// tarjeta puede estar en una vista que un administrador esté PREVISUALIZANDO:
// pinta la vista de atención pero no por eso adquiere el permiso. El botón se
// deshabilita con el motivo visible, que es la regla de esta casa: nunca un
// control que mienta, nunca deshabilitar en silencio.
// ═══════════════════════════════════════════════════════════════════════════

/** Avatar generado como respaldo si no hay foto en el mapa. */
const avatarUrl = (nombre: string) =>
  `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(nombre)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;

/** Hilos que piden un asesor, el más antiguo primero. */
function urgentes(): ConversacionCanal[] {
  return conversacionesStore.conversaciones
    .filter((c) => conversacionesStore.requiereAtencionHumana(c))
    .sort((a, b) => a.ultimaActividad.localeCompare(b.ultimaActividad));
}

// ── Fila ───────────────────────────────────────────────────────────────────

const FilaUrgente = observer(
  ({
    conv,
    onAbrir,
    onTomar,
  }: {
    conv: ConversacionCanal;
    onAbrir: () => void;
    onTomar: () => void;
  }) => {
    const puedeTomar = puedeResponderConversacion();
    const pedido = pedidosStore.pedidoActivoDe(conv.contacto.telefono);

    return (
      <div className="flex items-center gap-3 rounded-xl border border-gray-200/70 p-3 dark:border-white/5">
        <button type="button" onClick={onAbrir} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <Avatar
            src={AVATAR_MAP[conv.id] || avatarUrl(conv.contacto.nombre)}
            alt={conv.contacto.nombre}
            initials={inicialesDe(conv.contacto.nombre)}
            size="medium"
            status="busy"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-800 dark:text-white/90">
              {conv.contacto.nombre}
            </p>
            <p className="truncate text-xs text-gray-400 dark:text-gray-500">
              {pedido
                ? `${pedidosStore.estadoLabel(pedido.estado)} · ${pedidosStore.modalidadLabel(pedido.modalidad)}`
                : `${ESTADO_CONVERSACION_LABEL[conv.estado]} · ${ATENCION_LABEL[conv.atencion]}`}
            </p>
          </div>
        </button>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-error-600 dark:text-error-400">
            <span className="h-1.5 w-1.5 rounded-full bg-error-500" />
            {relativo(conversacionesStore.minutosEsperando(conv))}
          </span>
          {/* `title` con el motivo: un botón gris sin explicación obliga a
              adivinar si falta un permiso o si la acción está rota. */}
          <span title={puedeTomar ? undefined : motivoSinPermiso("channels.respond")}>
            <Button size="sm" variant="outline" disabled={!puedeTomar} onClick={onTomar}>
              Tomar
            </Button>
          </span>
        </div>
      </div>
    );
  },
);

// ── Widget ─────────────────────────────────────────────────────────────────

export const UrgentChatsWidget = observer(({ max = 5 }: { max?: number }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const lista = urgentes();
  const visibles = lista.slice(0, max);
  const puedeTomar = puedeResponderConversacion();

  /**
   * Toma el hilo para el operador de la sesión.
   *
   * El `operadorId` sale de `accessContext`, no de un literal: `tomar()` lo
   * guarda en `operadorAsignadoId`, y una cadena inventada dejaría el hilo
   * asignado a nadie. Si la sesión es la del administrador directo (que no es
   * un operador del equipo), se usa su `rolId` como identidad — sigue siendo un
   * valor real de la sesión y no una constante de la vista.
   */
  const tomar = (convId: string) => {
    if (!puedeTomar) return;
    const ctx = sessionStore.accessContext;
    const actor = ctx.operadorId ?? ctx.rolId ?? "sesion";
    conversacionesStore.tomar(convId, actor);
  };

  return (
    <Card className="p-5">
      <CabeceraWidget
        titulo="Esperando respuesta"
        extra={
          lista.length > 0 ? (
            <Badge color="error" size="sm">
              {lista.length}
            </Badge>
          ) : undefined
        }
        accion={lista.length > 0 ? "Ver todos" : undefined}
        onAccion={() => setModalOpen(true)}
      />

      {visibles.length === 0 ? (
        <ListaVacia>Ningún cliente está esperando a un asesor.</ListaVacia>
      ) : (
        <div className="space-y-2">
          {visibles.map((c) => (
            <FilaUrgente
              key={c.id}
              conv={c}
              onAbrir={() => setModalOpen(true)}
              onTomar={() => tomar(c.id)}
            />
          ))}
        </div>
      )}

      {modalOpen && (
        <Modal isOpen onClose={() => setModalOpen(false)} className="max-w-md p-6">
          <h2 className="mb-1 text-xl font-bold text-gray-800 dark:text-white/90">
            Conversaciones esperando
          </h2>
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            {lista.length === 0
              ? "No hay ninguna."
              : `${lista.length} ${lista.length === 1 ? "cliente pidió" : "clientes pidieron"} un asesor.`}
          </p>
          <div className="max-h-[52vh] space-y-2 overflow-y-auto pr-1">
            {lista.map((c) => (
              <FilaUrgente
                key={c.id}
                conv={c}
                onAbrir={() => setModalOpen(false)}
                onTomar={() => tomar(c.id)}
              />
            ))}
          </div>
        </Modal>
      )}
    </Card>
  );
});

export default UrgentChatsWidget;
