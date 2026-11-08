import { useState, useEffect, type KeyboardEvent } from "react";
import { Link } from "react-router";
import { observer } from "mobx-react-lite";
import { PaperPlaneIcon, WhatsAppIcon, AiIcon } from "@/icons";
import { BotIcon } from "./ConversacionIconos";
import { conversacionesStore } from "@/stores/conversaciones.store";
import { sessionStore } from "@/stores/session.store";
import {
  puedeResponderConversacion,
  hayCanalesMensajeriaActivos,
  motivoSinPermiso,
} from "@/stores/acceso.utils";

const LIMITE_TEXTO = 4096;

export const Composer = observer(({ convId }: { convId: string }) => {
  const [texto, setTexto] = useState("");
  const [modoMensaje, setModoMensaje] = useState<"chat" | "nota">("chat");
  const [sugiriendoIA, setSugiriendoIA] = useState(false);

  // Limpiar cualquier error previo de WhatsApp al cambiar de chat o al montar
  useEffect(() => {
    conversacionesStore.ultimoErrorEnvio = null;
  }, [convId]);

  const conv = conversacionesStore.getConversacion(convId);
  const esModoBot = conv?.atencion === "bot";

  const canalesActivos = hayCanalesMensajeriaActivos();
  const puedeResponder = puedeResponderConversacion();
  const excedido = texto.length > LIMITE_TEXTO;
  const vacio = texto.trim() === "";
  const enviando = conversacionesStore.enviandoMensaje;

  const puedeEnviar =
    modoMensaje === "nota"
      ? puedeResponder && !vacio && !excedido
      : puedeResponder && canalesActivos && !vacio && !excedido && !enviando;

  const enviar = () => {
    if (!puedeEnviar) return;
    if (modoMensaje === "nota") {
      conversacionesStore.agregarNotaInterna(convId, texto);
      setTexto("");
      return;
    }

    // Si el bot estaba activo y el operador escribe un mensaje directo, tomar control
    if (esModoBot) {
      const opId =
        sessionStore.accessContext.operadorId ??
        sessionStore.accessContext.rolId ??
        "operador";
      conversacionesStore.tomar(convId, opId);
    }

    void conversacionesStore.enviarComoNegocio(convId, texto);
    setTexto("");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      enviar();
    }
  };

  const sugerirRespuestaIA = () => {
    setSugiriendoIA(true);
    setTimeout(() => {
      if (!texto.trim()) {
        const nombre = conv?.contacto.nombre ? `Hola ${conv.contacto.nombre.split(" ")[0]}! ` : "¡Hola! ";
        setTexto(`${nombre}Con gusto te ayudamos con tu pedido. ¿Prefieres entrega a domicilio o recoger en local?`);
      } else {
        setTexto(`${texto.trim()} Quedamos muy atentos a tu confirmación para despacharte de inmediato.`);
      }
      setSugiriendoIA(false);
    }, 400);
  };

  return (
    <div
      className={`shrink-0 border-t transition-colors px-4 py-3 sm:px-6 sm:py-3.5 xl:px-7 font-sans text-gray-800 dark:text-white/90 ${
        modoMensaje === "nota"
          ? "border-amber-300/80 bg-amber-50/50 dark:border-amber-500/30 dark:bg-amber-950/20"
          : "border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
      }`}
    >
      {/* Selector de modo de redacción: Mensaje vs Nota Interna */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-0.5 text-xs dark:bg-white/5">
          <button
            type="button"
            onClick={() => setModoMensaje("chat")}
            className={`rounded-md px-2.5 py-1 font-medium transition-all cursor-pointer ${
              modoMensaje === "chat"
                ? "bg-white text-gray-900 shadow-xs dark:bg-gray-800 dark:text-white"
                : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            Mensaje al cliente
          </button>
          <button
            type="button"
            onClick={() => setModoMensaje("nota")}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-all cursor-pointer ${
              modoMensaje === "nota"
                ? "bg-amber-500 text-white shadow-xs font-semibold"
                : "text-amber-800 hover:text-amber-950 dark:text-amber-300 dark:hover:text-amber-200"
            }`}
          >
            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>Nota interna (equipo)</span>
          </button>
        </div>

        {/* Indicador de estado */}
        <div className="flex items-center gap-2 text-xs">
          {excedido && (
            <span className="text-red-500 font-medium">
              Límite excedido: {texto.length} / {LIMITE_TEXTO}
            </span>
          )}
          {esModoBot && modoMensaje === "chat" && (
            <span className="text-[11px] font-medium text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
              <BotIcon className="size-3.5 shrink-0" />
              <span>Bot activo · Al enviar tomarás el chat</span>
            </span>
          )}
        </div>
      </div>

      {/* Formulario de redacción estilo Lucid Bot */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          enviar();
        }}
        className="flex items-center gap-2.5"
      >
        {/* Contenedor tipo píldora oscura/clara con iconos integrados */}
        <div className="flex flex-1 items-center gap-2.5 rounded-2xl border border-gray-200 bg-gray-50/90 px-3.5 py-1.5 transition-all focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 dark:border-gray-700/80 dark:bg-gray-800/80">
          {/* Icono WhatsApp verde a la izquierda */}
          <div className="text-emerald-500 shrink-0" title="Canal activo WhatsApp">
            <WhatsAppIcon size={19} />
          </div>

          {/* Campo de entrada de texto */}
          <input
            type="text"
            disabled={!puedeResponder || !canalesActivos}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={
              modoMensaje === "nota"
                ? "Escribe una nota interna para el equipo..."
                : !canalesActivos
                  ? "Canales desconectados"
                  : !puedeResponder
                    ? "No puedes responder en esta conversación"
                    : "Escribe un mensaje..."
            }
            className="w-full bg-transparent border-0 outline-hidden h-9 text-sm font-normal text-gray-900 placeholder:text-gray-400 focus:border-0 focus:ring-0 focus:outline-hidden disabled:cursor-not-allowed disabled:opacity-60 dark:text-white dark:placeholder:text-gray-500"
          />

          {/* Acciones dentro de la píldora: Asistente IA + Adjunto */}
          {modoMensaje === "chat" && (
            <div className="flex items-center gap-1 shrink-0">
              {/* Botón de sugerencia IA ✨ */}
              <button
                type="button"
                onClick={sugerirRespuestaIA}
                disabled={!canalesActivos || sugiriendoIA}
                title="Sugerir o mejorar respuesta con IA"
                className={`p-1.5 rounded-lg text-gray-400 hover:text-secondary-600 hover:bg-accent-300/20 dark:text-gray-400 dark:hover:text-accent-300 dark:hover:bg-secondary-900/40 transition-colors cursor-pointer ${
                  sugiriendoIA ? "animate-pulse text-secondary-600" : ""
                }`}
              >
                <AiIcon className="h-4 w-4" />
              </button>

              {/* Botón Adjuntar 📎 */}
              <button
                type="button"
                disabled={!canalesActivos}
                title="Adjuntar archivo o imagen"
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200/50 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M12.9522 14.4422C12.9522 14.452 12.9524 14.4618 12.9527 14.4714V16.1442C12.9527 16.6699 12.5265 17.0961 12.0008 17.0961C11.475 17.0961 11.0488 16.6699 11.0488 16.1442V6.15388C11.0488 5.73966 10.7131 5.40388 10.2988 5.40388C9.88463 5.40388 9.54885 5.73966 9.54885 6.15388V16.1442C9.54885 17.4984 10.6466 18.5961 12.0008 18.5961C13.355 18.5961 14.4527 17.4983 14.4527 16.1442V6.15388C14.4527 6.14308 14.4525 6.13235 14.452 6.12166C14.4347 3.84237 12.5817 2 10.2983 2C8.00416 2 6.14441 3.85976 6.14441 6.15388V14.4422C6.14441 14.4492 6.1445 14.4561 6.14469 14.463V16.1442C6.14469 19.3783 8.76643 22 12.0005 22C15.2346 22 17.8563 19.3783 17.8563 16.1442V9.55775C17.8563 9.14354 17.5205 8.80775 17.1063 8.80775C16.6921 8.80775 16.3563 9.14354 16.3563 9.55775V16.1442C16.3563 18.5498 14.4062 20.5 12.0005 20.5C9.59485 20.5 7.64469 18.5498 7.64469 16.1442V9.55775C7.64469 9.55083 7.6446 9.54393 7.64441 9.53706L7.64441 6.15388C7.64441 4.68818 8.83259 3.5 10.2983 3.5C11.764 3.5 12.9522 4.68818 12.9522 6.15388L12.9522 14.4422Z"
                  />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Botón circular de envío azul estilo Lucid Bot */}
        <button
          type="submit"
          disabled={!puedeEnviar}
          title={modoMensaje === "nota" ? "Guardar nota interna" : "Enviar mensaje"}
          aria-busy={enviando}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white shadow-md transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${
            modoMensaje === "nota"
              ? "bg-amber-600 hover:bg-amber-700"
              : "bg-brand-500 hover:bg-brand-600"
          }`}
        >
          {enviando ? (
            <svg
              className="h-4 w-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
          ) : (
            <svg className="h-4 w-4 ml-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          )}
        </button>
      </form>
    </div>
  );
});

export default Composer;
