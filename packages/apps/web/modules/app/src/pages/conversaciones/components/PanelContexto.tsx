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
    const dirs = pedidosStore.direccionesDe(telefono);
    const principal = dirs[0];
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

  const [plantillaEnviada, setPlantillaEnviada] = useState<string | null>(null);

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
    <div className="flex flex-col gap-3 pb-3 font-sans text-gray-800 dark:text-white/90">
      {/* ── 1. Tarjeta de Perfil del Cliente ── */}
      <div className="flex flex-col items-center rounded-2xl border border-gray-200 bg-white p-3.5 text-center dark:border-gray-800 dark:bg-white/[0.02]">
        <CanalAvatar
          canal={conv.canal}
          nombre={nombre}
          size="large"
          status={statusDe(conv.estado)}
        />
        <h3 className="mt-2 text-base font-semibold text-gray-800 dark:text-white/90">
          {nombre}
        </h3>

        {/* Teléfono y copiar */}
        <button
          type="button"
          onClick={copiarTelefono}
          title="Copiar número de teléfono"
          className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 py-0.5 text-xs font-normal text-gray-700 transition-colors hover:border-brand-500 hover:text-brand-500 cursor-pointer dark:border-gray-700 dark:bg-white/5 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:text-white"
        >
          <span className="font-mono text-xs">{telefono}</span>
          {copiado ? (
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-brand-500"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-gray-400"
            >
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          )}
        </button>

        {/* Dirección frecuente (Memoria CRM) */}
        {(() => {
          const dirs = pedidosStore.direccionesDe(telefono);
          if (dirs.length === 0) return null;
          const principal = dirs[0];
          return (
            <div className="mt-3 flex w-full items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 px-3 py-1.5 text-left text-xs font-normal text-gray-700 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-300">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0 text-brand-500 dark:text-brand-400"
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span className="truncate">{principal.calle}</span>
              {principal.barrio && (
                <span className="shrink-0 text-gray-400">({principal.barrio})</span>
              )}
            </div>
          );
        })()}

        {/* Métricas del Contacto */}
        <div className="mt-3 grid w-full grid-cols-2 gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
          <div className="rounded-xl bg-gray-50 p-2 text-center dark:bg-white/[0.02]">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Pedidos
            </p>
            <p className="text-base font-bold text-gray-800 dark:text-white">
              {pedidos.length}
            </p>
          </div>
          <div className="rounded-xl bg-gray-50 p-2 text-center dark:bg-white/[0.02]">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Total gastado
            </p>
            <p className="text-base font-bold text-gray-800 dark:text-white">
              {money(totalGastado)}
            </p>
          </div>
        </div>
      </div>

      {/* ── 2. Acciones Rápidas del Operador ── */}
      <div className="flex flex-col gap-2">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Acciones rápidas
        </label>

        {/* Botón Crear Pedido Real (con SVG) */}
        {puedeCrearPedido() && (
          <button
            type="button"
            onClick={irACrearPedido}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white shadow-xs transition-all hover:bg-brand-600 active:scale-[0.99] cursor-pointer"
          >
            <svg
              width="15"
              height="15"
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
            <span>Crear pedido</span>
          </button>
        )}

        {/* Botones de Plantillas al Chat con 1 Click (con SVG y feedback reactivo) */}
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => enviarPlantilla("menu")}
            title={`Enviar link de ${pedidosStore.config.perfilComercial === "food" ? "menú" : pedidosStore.config.perfilComercial === "services" ? "servicios" : "catálogo"} al chat`}
            className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-medium transition-all cursor-pointer ${
              plantillaEnviada === "menu"
                ? "border-brand-500 bg-brand-50 text-brand-600 dark:border-brand-500/40 dark:bg-brand-500/10 dark:text-brand-400"
                : "border-gray-200 bg-white text-gray-700 hover:border-brand-300 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900/60 dark:text-gray-300 dark:hover:bg-white/5 dark:hover:text-white"
            }`}
          >
            {plantillaEnviada === "menu" ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-brand-500">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-gray-400 group-hover:text-gray-600 dark:text-gray-400"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            )}
            <span>
              {plantillaEnviada === "menu"
                ? "¡Enviado!"
                : pedidosStore.config.perfilComercial === "food"
                  ? "Menú"
                  : pedidosStore.config.perfilComercial === "services"
                    ? "Servicios"
                    : "Catálogo"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => enviarPlantilla("ubicacion")}
            title="Solicitar dirección de entrega al cliente"
            className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-medium transition-all cursor-pointer ${
              plantillaEnviada === "ubicacion"
                ? "border-brand-500 bg-brand-50 text-brand-600 dark:border-brand-500/40 dark:bg-brand-500/10 dark:text-brand-400"
                : "border-gray-200 bg-white text-gray-700 hover:border-brand-300 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900/60 dark:text-gray-300 dark:hover:bg-white/5 dark:hover:text-white"
            }`}
          >
            {plantillaEnviada === "ubicacion" ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-brand-500">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-gray-400 group-hover:text-gray-600 dark:text-gray-400"
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            )}
            <span>{plantillaEnviada === "ubicacion" ? "¡Enviado!" : "Dirección"}</span>
          </button>

          <button
            type="button"
            onClick={() => enviarPlantilla("pago")}
            title="Enviar link de pago y datos bancarios al cliente"
            className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-medium transition-all cursor-pointer ${
              plantillaEnviada === "pago"
                ? "border-brand-500 bg-brand-50 text-brand-600 dark:border-brand-500/40 dark:bg-brand-500/10 dark:text-brand-400"
                : "border-gray-200 bg-white text-gray-700 hover:border-brand-300 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900/60 dark:text-gray-300 dark:hover:bg-white/5 dark:hover:text-white"
            }`}
          >
            {plantillaEnviada === "pago" ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-brand-500">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-gray-400 group-hover:text-gray-600 dark:text-gray-400"
              >
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                <line x1="1" y1="10" x2="23" y2="10" />
              </svg>
            )}
            <span>{plantillaEnviada === "pago" ? "¡Enviado!" : "Pago"}</span>
          </button>
        </div>
      </div>

      {/* ── 4. Notas Internas del Cliente ── */}
      <div>
        <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Notas internas del cliente
        </label>
        <textarea
          rows={2}
          value={notasContacto}
          onChange={(e) => guardarNotas(e.target.value)}
          placeholder="Notas solo visibles para el equipo..."
          className="mt-1 w-full rounded-xl border border-gray-300 bg-white p-2.5 text-xs font-normal text-gray-800 placeholder:text-gray-400 transition-colors focus:border-brand-500 focus:bg-white focus:outline-hidden dark:border-gray-800 dark:bg-gray-900 dark:text-white"
        />
      </div>

      {/* ── 5. Resumen de Pedidos del Contacto (El historial completo vive en la pestaña principal del chat) ── */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Pedidos del cliente
          </label>
          <span className="rounded-full bg-brand-50 text-brand-600 px-2 py-0.5 text-[11px] font-semibold dark:bg-brand-500/15 dark:text-brand-400">
            {pedidos.length} {pedidos.length === 1 ? "pedido" : "pedidos"}
          </span>
        </div>

        {pedidos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white p-3 text-center dark:border-gray-800 dark:bg-white/[0.01]">
            <p className="text-xs font-normal text-gray-500 dark:text-gray-400">
              Sin pedidos registrados aún
            </p>
            {puedeCrearPedido() && (
              <button
                type="button"
                onClick={irACrearPedido}
                className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline cursor-pointer dark:text-brand-400"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>Cargar primer pedido</span>
              </button>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-xs dark:border-gray-800 dark:bg-white/[0.02]">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 dark:text-gray-400">Total gastado:</span>
              <span className="font-semibold text-gray-800 dark:text-white/90">
                {money(totalGastado)}
              </span>
            </div>
            {onVerHistorialPedidos && (
              <button
                type="button"
                onClick={onVerHistorialPedidos}
                className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg bg-gray-100 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-200 hover:text-gray-900 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10 cursor-pointer"
              >
                <span>Ver historial en el chat →</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

export default PanelContexto;
