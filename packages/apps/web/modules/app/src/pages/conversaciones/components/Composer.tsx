import { useState, type KeyboardEvent } from "react";
import { observer } from "mobx-react-lite";

import { conversacionesStore } from "@/stores/conversaciones.store";
import {
  puedeResponderConversacion,
  motivoSinPermiso,
} from "@/stores/acceso.utils";

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Límite de caracteres del mensaje del operador (Req 3.1). Coincide con el
 * límite que aplica `conversacionesStore.enviarComoNegocio`; se replica aquí
 * solo para dar feedback previo al envío (contador + aviso de exceso, Req 3.5).
 */
const LIMITE_TEXTO = 4096;

// ═══════════════════════════════════════════════════════════════════════════
// COMPOSER — envío como negocio (consola del operador)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * `Composer` — zona inferior de la columna central de `/conversaciones`
 * (tarea 6.4). Permite al operador responder al cliente como `negocio`.
 *
 * Envío (Req 3.3): al enviar un texto no vacío de 1–4096 caracteres, llama a
 * `conversacionesStore.enviarComoNegocio(convId, texto)` (autor `negocio`). El
 * store también valida (vacío/solo espacios → no-op Req 3.4; exceso → rechazo
 * Req 3.5); aquí damos feedback previo.
 *
 * Gating por capacidad (Req 3.1/3.2): el composer se HABILITA solo si la sesión
 * tiene `channels.respond` (`puedeResponderConversacion()`). Sin el permiso, se
 * DESHABILITA el input y el botón (se impide la entrada de texto) y se muestra
 * el motivo (`motivoSinPermiso("channels.respond")`).
 *
 * Aviso de exceso de límite (Req 3.5): si el texto supera 4096 caracteres, se
 * muestra un aviso y NO se envía (el store igualmente rechazaría el envío).
 *
 * Es `observer` para reaccionar a cambios de capacidad/selección por
 * reactividad MobX.
 *
 * Requisitos: 3.1, 3.2, 3.5.
 */
export const Composer = observer(({ convId }: { convId: string }) => {
  const [texto, setTexto] = useState("");

  // Gating de capacidad (Req 3.1/3.2): habilitado solo con `channels.respond`.
  const puedeResponder = puedeResponderConversacion();

  const excedido = texto.length > LIMITE_TEXTO;
  const vacio = texto.trim() === "";
  const puedeEnviar = puedeResponder && !vacio && !excedido;

  const enviar = () => {
    // No-op defensivo: sin permiso, vacío o excedido no se envía (el store
    // también valida, pero evitamos siquiera intentarlo — Req 3.2/3.4/3.5).
    if (!puedeEnviar) return;
    conversacionesStore.enviarComoNegocio(convId, texto);
    setTexto("");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      enviar();
    }
  };

  // ── Sin permiso: composer deshabilitado + motivo (Req 3.2) ──
  if (!puedeResponder) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-end gap-2">
          <textarea
            value=""
            disabled
            readOnly
            rows={1}
            aria-label="Escribir respuesta"
            placeholder="No puedes responder en esta conversación"
            className="max-h-32 min-h-[44px] flex-1 cursor-not-allowed resize-none rounded-2xl border border-transparent bg-gray-100 px-4 py-2.5 text-sm text-gray-400 outline-none placeholder:text-gray-400 dark:bg-gray-800 dark:text-gray-500"
          />
          <button
            type="button"
            disabled
            aria-label="Enviar mensaje"
            className="flex h-11 w-11 shrink-0 cursor-not-allowed items-center justify-center rounded-full bg-brand-500 text-white opacity-50"
          >
            <SendIcon />
          </button>
        </div>
        <p
          className="text-xs font-medium text-warning-600 dark:text-warning-400"
          role="status"
        >
          {motivoSinPermiso("channels.respond")}
        </p>
      </div>
    );
  }

  // ── Con permiso: composer editable (Req 3.1) ──
  return (
    <div className="flex flex-col gap-2">
      {/* Aviso de exceso de límite (Req 3.5): no se envía mientras persista. */}
      {excedido && (
        <p className="text-xs font-medium text-error-500" role="alert">
          El mensaje supera el máximo de {LIMITE_TEXTO} caracteres.
        </p>
      )}
      <div className="flex items-end gap-2">
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          aria-label="Escribir respuesta"
          placeholder="Escribe una respuesta como negocio"
          className={`max-h-32 min-h-[44px] flex-1 resize-none rounded-2xl border bg-gray-100 px-4 py-2.5 text-sm text-gray-800 outline-none transition-colors placeholder:text-gray-400 focus:border-brand-400 dark:bg-gray-800 dark:text-white/90 ${
            excedido
              ? "border-error-400 focus:border-error-400"
              : "border-transparent"
          }`}
        />
        <button
          type="button"
          onClick={enviar}
          disabled={!puedeEnviar}
          aria-label="Enviar mensaje"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <SendIcon />
        </button>
      </div>
      <div className="flex justify-end">
        <span
          className={`text-[10px] ${excedido ? "text-error-500" : "text-gray-400"}`}
        >
          {texto.length}/{LIMITE_TEXTO}
        </span>
      </div>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// ICONS
// ═══════════════════════════════════════════════════════════════════════════

const SendIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    className="h-5 w-5"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
    />
  </svg>
);

export default Composer;
