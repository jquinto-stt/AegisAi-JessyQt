import { observer } from "mobx-react-lite";
import { useNavigate } from "react-router";

import { Badge } from "@/elements/ui/badge";
import { Button } from "@/elements/ui/button";
import {
  MODULOS_INTEGRABLES,
  type ModuloIntegrable,
} from "@/stores/integraciones.store";
import { conversacionesStore } from "@/stores/conversaciones.store";
import { pedidosStore } from "@/stores/pedidos.store";
import { formatoMoneda } from "@/utils";
import { tiempoRelativo } from "@/pages/conversaciones/conversaciones.utils";

// ═══════════════════════════════════════════════════════════════════════════
// CONTEXTO DE MÓDULO — qué aporta un módulo conectado a ESTA conversación
// ═══════════════════════════════════════════════════════════════════════════
//
// Este componente es el CUERPO de una pestaña de contexto del chat. Cada
// pestaña responde a la misma pregunta desde un módulo distinto: **¿qué tiene
// que ver este módulo con este cliente?**
//
// ── Lo que NO es ──────────────────────────────────────────────────────────
// No es un módulo dentro de WhatsApp. No crea, edita ni navega a nada del
// dominio: LEE lo que el módulo ya sabe de este contacto y lo pone al lado de la
// conversación. El dueño de los datos y de las acciones sigue siendo el módulo
// (Pedidos), y su puerta pública es el store de ese módulo.
//
// ── Por qué una vista por módulo y no una genérica ────────────────────────
// «Contexto» significa cosas distintas en cada módulo, y en uno puede no
// significar nada: en Pedidos es *qué ha comprado este cliente*; en Inventario
// no hay una pregunta equivalente, porque **el almacén no es de un cliente**.
// Un componente genérico que pintara «cosas del módulo» acabaría mostrando lo
// que le sobrara a cada uno. Cada módulo declara su vista; el `switch` es
// exhaustivo sobre `ModuloIntegrable`, así que añadir un módulo al catálogo sin
// escribir su vista es un error de compilación, no un hueco silencioso.
//
// ── Sobre el módulo que no tiene vista ────────────────────────────────────
// `inventario` está conectado a la conversación como cualquier otro —su
// `disponible` es `true` desde el 21/09 y su proveedor de herramientas está
// registrado—, pero su pestaña NO muestra un panel vacío: muestra el motivo.
//
// La ausencia es **semántica, no temporal**: no es que la vista esté pendiente
// de construir, es que no hay nada que construir, porque las existencias de un
// artículo no dependen de quién pregunta. Si algún día se quiere ver «qué se le
// ofreció a este cliente», eso es historia comercial del contacto y su dueño
// sería Pedidos, no Inventario.
//
// ═══════════════════════════════════════════════════════════════════════════

interface ContextoModuloProps {
  /** Conversación de la que se muestra el contexto. */
  convId: string;
  /** Módulo cuya vista de contexto se pinta. */
  modulo: ModuloIntegrable;
}

export const ContextoModulo = observer(({ convId, modulo }: ContextoModuloProps) => {
  const conv = conversacionesStore.getConversacion(convId);

  // La conversación puede desaparecer entre el render de la pestaña y el del
  // cuerpo (borrado, cambio de selección). La ausencia se representa como
  // ausencia: nada de un panel de relleno.
  if (!conv) return null;

  switch (modulo) {
    case "pedidos":
      return (
        <ContextoPedidos
          nombre={conv.contacto.nombre}
          telefono={conv.contacto.telefono}
        />
      );

    case "inventario":
      return <SinVistaDeContexto label={MODULOS_INTEGRABLES.inventario.label} />;
  }
});

export default ContextoModulo;

// ═══════════════════════════════════════════════════════════════════════════
// VISTA DE CONTEXTO — PEDIDOS
// ═══════════════════════════════════════════════════════════════════════════
//
// Los pedidos del contacto, leídos con el resolutor canónico
// (`pedidosStore.porTelefono`, que normaliza el teléfono y ordena por fecha
// descendente). No se recorre la colección a mano: el mismo teléfono escrito de
// dos maneras distintas ya causó un defecto real en este proyecto.

const ContextoPedidos = observer(
  ({ nombre, telefono }: { nombre: string; telefono: string }) => {
    const navigate = useNavigate();
    const pedidos = pedidosStore.porTelefono(telefono);

    return (
      <div className="flex h-full flex-col">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-5 py-3 dark:border-gray-800">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
              Pedidos de {nombre}
            </p>
            <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
              {pedidos.length === 0
                ? "Sin pedidos registrados"
                : `${pedidos.length} ${pedidos.length === 1 ? "pedido" : "pedidos"} · el más reciente primero`}
            </p>
          </div>

          {/* Pedidos sigue siendo el dueño de sus capacidades: desde aquí se
              puede saltar a su pantalla, pero el trabajo se hace allí. */}
          <Button variant="outline" size="sm" onClick={() => navigate("/pedidos")}>
            Abrir en Pedidos
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
          {pedidos.length === 0 ? (
            <p className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
              {nombre} todavía no tiene ningún pedido. No se muestra una lista de
              ejemplo: la ausencia se representa como ausencia.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {pedidos.map((p) => (
                <li
                  key={p.id}
                  className="rounded-xl border border-gray-200 p-3.5 dark:border-gray-800"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold tabular-nums text-gray-800 dark:text-white/90">
                        {p.numero}
                      </span>
                      <Badge color={pedidosStore.estadoBadgeColor(p.estado)} size="sm">
                        {pedidosStore.estadoLabel(p.estado)}
                      </Badge>
                      {pedidosStore.esUrgente(p) && (
                        <Badge color="error" size="xs">
                          Urgente
                        </Badge>
                      )}
                    </div>
                    <span className="text-sm font-semibold tabular-nums text-gray-800 dark:text-white/90">
                      {formatoMoneda(pedidosStore.totalPedido(p))}
                    </span>
                  </div>

                  <p className="mt-1.5 truncate text-xs text-gray-600 dark:text-gray-300">
                    {p.items
                      .map((it) => `${it.cantidad}× ${it.nombre}`)
                      .join(", ")}
                  </p>

                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-gray-400 dark:text-gray-500">
                    <span>{pedidosStore.modalidadLabel(p.modalidad)}</span>
                    <span>·</span>
                    <span>
                      {p.origen === "whatsapp" ? "Entró por WhatsApp" : "Creado por el equipo"}
                    </span>
                    <span>·</span>
                    <span>{tiempoRelativo(p.createdAt)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// MÓDULO DECLARADO SIN VISTA DE CONTEXTO
// ═══════════════════════════════════════════════════════════════════════════

const SinVistaDeContexto = ({ label }: { label: string }) => (
  <div className="flex h-full items-center justify-center p-6">
    <p className="max-w-xs rounded-lg border border-dashed border-gray-300 p-4 text-center text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
      {label} está conectado, pero todavía no aporta una vista de contexto a la
      conversación.
    </p>
  </div>
);
