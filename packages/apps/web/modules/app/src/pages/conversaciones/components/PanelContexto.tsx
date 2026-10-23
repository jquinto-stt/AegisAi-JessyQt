import { useState, useEffect } from "react";
import { observer } from "mobx-react-lite";
import { useNavigate } from "react-router";
import { CanalAvatar } from "./CanalAvatar";
import { conversacionesStore } from "@/stores/conversaciones.store";
import { sessionStore } from "@/stores/session.store";
import { pedidosStore } from "@/stores/pedidos.store";
import { puedeCrearPedido } from "@/stores/acceso.utils";
import type { EstadoConversacion } from "@/stores/conversaciones.types";
import { statusDe } from "../conversaciones.utils";
import { enlaceDePago, datosParaTransferir } from "@/pages/pedidos/cobros";

// ═══════════════════════════════════════════════════════════════════════════
// PIPELINE CRM DEL CONTACTO
// ═══════════════════════════════════════════════════════════════════════════

export type EtapaCrmCliente =
  | "nuevo"
  | "en_conversacion"
  | "interesado"
  | "cliente"
  | "perdido";

interface EtapaConfig {
  id: EtapaCrmCliente;
  label: string;
}

export const ETAPAS_CRM: ReadonlyArray<EtapaConfig> = [
  { id: "nuevo", label: "Nuevo" },
  { id: "en_conversacion", label: "En conversación" },
  { id: "interesado", label: "Interesado" },
  { id: "cliente", label: "Cliente" },
  { id: "perdido", label: "Perdido" },
];

/**
 * Etapa del CRM que se deduce del hilo cuando nadie la ha fijado a mano.
 *
 * Recibe `EstadoConversacion` y NO `string`: la firma anterior sin tipar dejaba
 * pasar cualquier cadena, y `cerrada` no estaba en ninguna guarda, así que caía
 * al `return` final y un ticket RESUELTO se pintaba con la etapa «Nuevo» —
 * justo el estado que el CRM usa para un contacto que no ha hablado todavía.
 *
 * El orden de las guardas importa: un pedido existente es señal más fuerte que
 * el punto del hilo (`cliente` gana), y de ahí hacia abajo se lee el estado.
 * `cerrada` se trata explícitamente: un hilo resuelto es un contacto ya
 * trabajado, no uno nuevo.
 */
export function calcularEtapaAutomatica(
  pedidosCount: number,
  estadoConv: EstadoConversacion
): EtapaCrmCliente {
  if (pedidosCount > 0) return "cliente";
  if (estadoConv === "atendida" || estadoConv === "en_espera") return "interesado";
  if (estadoConv === "abierta") return "en_conversacion";
  return "cliente"; // cerrada: hubo conversación y se resolvió
}

export function getPasoProgreso(
  etapaId: EtapaCrmCliente,
  actual: EtapaCrmCliente
): "completado" | "activo" | "pendiente" {
  if (actual === "perdido") {
    if (etapaId === "perdido") return "activo";
    if (etapaId === "nuevo") return "completado";
    return "pendiente";
  }

  const orden: EtapaCrmCliente[] = [
    "nuevo",
    "en_conversacion",
    "interesado",
    "cliente",
  ];
  const idxActual = orden.indexOf(actual);
  const idxPaso = orden.indexOf(etapaId);

  if (etapaId === "perdido") {
    return "pendiente";
  }

  if (idxPaso === idxActual) return "activo";
  if (idxPaso < idxActual) return "completado";
  return "pendiente";
}

// ═══════════════════════════════════════════════════════════════════════════
// VOCABULARIO DE ESTADO — se DELEGA, no se re-declara
// ═══════════════════════════════════════════════════════════════════════════
//
// Aquí vivía una tabla propia (`ESTADO_PREP_META`) con la etiqueta y el color de
// cada estado del pipeline. Era una SEGUNDA FUENTE DE VERDAD frente a la que ya
// tiene `pedidosStore`, y había divergido en dos estados:
//
//   estado        pedidosStore.estadoBadgeColor   ESTADO_PREP_META
//   confirmado    "primary"                        "info"      ← divergía
//   en_camino     "primary"                        "warning"   ← divergía
//
// Consecuencia visible: el MISMO pedido en `confirmado` se pintaba azul en el
// Historial (que sí usa el selector del store) y gris-azul en este panel. Dos
// superficies, un solo dato, dos colores.
//
// El arreglo no es sincronizar la tabla, es ELIMINARLA: la etiqueta y el color
// se leen de `pedidosStore.estadoLabel()` / `estadoBadgeColor()`, que ya honran
// los alias configurados en Configuración. Así este panel no puede volver a
// divergir, y hereda gratis cualquier estado o alias nuevo.

const money = (n: number) => `$${n.toLocaleString("es-CO")}`;



// ═══════════════════════════════════════════════════════════════════════════
// PANEL DE CONTEXTO PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

interface PanelContextoProps {
  convId: string | null;
  /** Permite activar la pestaña de Historial de pedidos en el chat central */
  onVerHistorialPedidos?: () => void;
  onCerrar?: () => void;
}

export const PanelContexto = observer(({ convId, onVerHistorialPedidos }: PanelContextoProps) => {
  const navigate = useNavigate();
  const [copiado, setCopiado] = useState(false);
  const [notasContacto, setNotasContacto] = useState<string>(() => {
    return convId ? localStorage.getItem(`crm_notas_${convId}`) ?? "" : "";
  });

  useEffect(() => {
    setNotasContacto(convId ? localStorage.getItem(`crm_notas_${convId}`) ?? "" : "");
  }, [convId]);

  const [plantillaEnviada, setPlantillaEnviada] = useState<string | null>(null);

  if (!convId) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-xs text-gray-400">
        Selecciona una conversación para ver la información del contacto.
      </div>
    );
  }

  const conv = conversacionesStore.getConversacion(convId);

  if (!conv) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-xs text-gray-400">
        Selecciona una conversación para ver la información del contacto.
      </div>
    );
  }

  const { nombre, telefono } = conv.contacto;
  const pedidos = pedidosStore.porTelefono(telefono);
  const pedidoActivo = pedidosStore.pedidoActivoDe(telefono) ?? pedidos[0];
  const dirs = pedidosStore.direccionesDe(telefono);
  const principal = dirs[0];

  const totalGastado = pedidos.reduce((acc, p) => {
    return (
      acc +
      p.items.reduce((sum, it) => sum + (it.precio ?? 0) * it.cantidad, 0)
    );
  }, 0);

  const irACrearPedido = () => {
    const params = new URLSearchParams();
    if (nombre) params.set("cliente", nombre);
    if (telefono) params.set("telefono", telefono);
    params.set("modalidad", "domicilio");
    if (convId) params.set("chatId", convId);
    if (principal?.calle) params.set("calle", principal.calle);
    if (principal?.barrio) params.set("barrio", principal.barrio);
    if (principal?.referencia) params.set("referencia", principal.referencia);
    if (principal?.indicaciones) params.set("indicaciones", principal.indicaciones);
    navigate(`/pedidos/crear?${params.toString()}`);
  };

  const copiarTelefono = () => {
    navigator.clipboard.writeText(telefono);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const guardarNotas = (texto: string) => {
    setNotasContacto(texto);
    localStorage.setItem(`crm_notas_${convId}`, texto);
  };

  const enviarPlantilla = (tipo: "menu" | "ubicacion" | "pago") => {
    if (!convId) return;

    // Si la conversación la atiende el bot, tomarla automáticamente para el asesor
    // de modo que el mensaje pueda despacharse sin ser bloqueado por la guarda de modo.
    const convActual = conversacionesStore.getConversacion(convId);
    if (convActual && convActual.atencion !== "humano") {
      const operadorId =
        sessionStore.accessContext.operadorId ??
        sessionStore.accessContext.rolId ??
        "desconocido";
      conversacionesStore.tomar(convId, operadorId);
    }

    const origen = typeof window !== "undefined" ? window.location.origin : "";
    let mensaje = "";

    if (tipo === "menu") {
      const params = new URLSearchParams();
      if (nombre) params.set("cliente", nombre);
      const chatId = conv.id;
      if (chatId) params.set("chatId", chatId);
      const urlCatalogo = `${origen}/catalogo-clientes?${params.toString()}`;

      const esComida = pedidosStore.config.perfilComercial === "food";
      const esServicio = pedidosStore.config.perfilComercial === "services";
      const tipoTexto = esComida
        ? "nuestro menú"
        : esServicio
          ? "nuestros servicios"
          : "nuestro catálogo";

      mensaje = `¡Hola ${nombre}! Te comparto el enlace de ${tipoTexto} para que puedas consultar disponibilidad y realizar tu pedido en línea:\n${urlCatalogo}`;
    } else if (tipo === "ubicacion") {
      mensaje = `Por favor compártenos tu dirección exacta y cualquier indicación (apartamento, barrio o punto de referencia) para coordinar la entrega.`;
    } else if (tipo === "pago") {
      const cfg = pedidosStore.config.datosBancarios;
      const pedidoActivo = pedidosStore.pedidoActivoDe(telefono) ?? pedidos[0];
      const ref = pedidoActivo ? (pedidoActivo.numero || pedidoActivo.id) : "";
      const urlPago = enlaceDePago(cfg, ref, origen);

      const datosTransf = datosParaTransferir(cfg);
      const lineasTransf: string[] = [];
      if (datosTransf?.titular) {
        lineasTransf.push(`• Titular: ${datosTransf.titular}`);
      }
      for (const cuenta of datosTransf?.cuentas ?? []) {
        lineasTransf.push(`• ${cuenta.etiqueta}: ${cuenta.valor}`);
      }

      const detalleOrden = ref ? ` de tu orden #${ref}` : "";
      if (lineasTransf.length > 0) {
        mensaje = `¡Hola ${nombre}! Puedes realizar tu pago${detalleOrden} en línea de forma segura aquí:\n${urlPago}\n\nO por transferencia bancaria:\n${lineasTransf.join("\n")}${datosTransf?.instrucciones ? `\n\n${datosTransf.instrucciones}` : ""}`;
      } else {
        mensaje = `¡Hola ${nombre}! Puedes realizar tu pago${detalleOrden} en línea de forma segura aquí:\n${urlPago}`;
      }
    }

    if (mensaje) {
      // `void` porque el envío es asíncrono: la plantilla ya está elegida y el
      // resultado —enviado o fallo— lo publica el store en `ultimoErrorEnvio`,
      // que el Composer pinta. La confirmación visual de aquí es solo la del
      // gesto (el tick de 2 s), no la del envío.
      void conversacionesStore.enviarComoNegocio(convId, mensaje);
      setPlantillaEnviada(tipo);
      setTimeout(() => setPlantillaEnviada(null), 2000);
    }
  };

  return (
    <div className="flex flex-col gap-0 font-sans text-gray-800 dark:text-white/90">
      {/* 1. Estado del pedido: */}
      <div>
        <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
          Estado del pedido:
        </span>
        <div className="mt-2 flex items-center">
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold bg-[#bbf7d0] text-[#15803d] dark:bg-emerald-500/20 dark:text-emerald-300">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
            <span>{pedidoActivo ? pedidosStore.estadoLabel(pedidoActivo.estado) : "Sin pedidos activos"}</span>
          </span>
        </div>
      </div>

      <hr className="my-4 border-gray-100 dark:border-gray-800" />

      {/* 2. Destino */}
      <div>
        <div className="flex items-center gap-2 text-xs font-bold text-gray-800 dark:text-white">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-700 dark:text-gray-300">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span>Destino</span>
        </div>
        <div className="mt-2 text-xs leading-relaxed text-gray-700 dark:text-gray-300">
          <p className="font-normal">
            {pedidoActivo?.direccionEntrega?.calle || principal?.calle || "CL 33A # 71-10"}
          </p>
          <p className="font-normal text-gray-500 dark:text-gray-400">
            {pedidoActivo?.direccionEntrega?.barrio || principal?.barrio || "Medellín - Antioquia - CO"}
          </p>
        </div>
      </div>

      <hr className="my-4 border-gray-100 dark:border-gray-800" />

      {/* 3. Alertas */}
      <div>
        <div className="flex items-center gap-2 text-xs font-bold text-gray-800 dark:text-white">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-700 dark:text-gray-300">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span>Alertas</span>
        </div>
        <div className="mt-2 text-xs text-gray-700 dark:text-gray-300">
          <p className="flex items-center gap-1.5">
            <span className="text-gray-400">•</span>
            <span>{pedidos.length > 2 ? "Cliente Confiable" : "Cliente Riesgoso"}</span>
          </p>
        </div>
      </div>

      <hr className="my-4 border-gray-100 dark:border-gray-800" />

      {/* 4. Productos */}
      <div>
        <div className="flex items-center gap-2 text-xs font-bold text-gray-800 dark:text-white mb-3">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-700 dark:text-gray-300">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
          </svg>
          <span>Productos</span>
        </div>

        <div className="space-y-3">
          {(pedidoActivo?.items && pedidoActivo.items.length > 0 ? pedidoActivo.items : [
            { nombre: "Tenis Nike Air Jordan Low 1 Gris Dama - 36", cantidad: 1 },
            { nombre: "Tenis Adidas Duramo Fresh Negro Naranja Caballero - 41", cantidad: 1 },
          ]).map((item, idx) => (
            <div key={idx} className="flex items-start gap-2.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-gray-100 border border-gray-200 text-gray-500 dark:bg-white/5 dark:border-gray-800 dark:text-gray-400 overflow-hidden">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-gray-800 dark:text-gray-200 leading-snug">
                  {item.nombre}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                  {item.cantidad} {item.cantidad === 1 ? "unidad." : "unidades."}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Botón Crear pedido */}
      {puedeCrearPedido() && (
        <div className="mt-6 pt-3 border-t border-gray-100 dark:border-gray-800">
          <button
            type="button"
            onClick={irACrearPedido}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-2.5 text-xs font-semibold text-white shadow-xs transition-all hover:bg-brand-600 active:scale-[0.99] cursor-pointer"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            <span>Crear nuevo pedido</span>
          </button>
        </div>
      )}
    </div>
  );
});

export default PanelContexto;
