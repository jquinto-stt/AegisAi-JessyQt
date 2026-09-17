import { useState, type KeyboardEvent } from "react";
import { observer } from "mobx-react-lite";
import { PaperPlaneIcon } from "@/icons";
import { conversacionesStore } from "@/stores/conversaciones.store";
import {
  puedeResponderConversacion,
  motivoSinPermiso,
} from "@/stores/acceso.utils";

const LIMITE_TEXTO = 4096;

export const Composer = observer(({ convId }: { convId: string }) => {
  const [texto, setTexto] = useState("");

  const puedeResponder = puedeResponderConversacion();
  const excedido = texto.length > LIMITE_TEXTO;
  const vacio = texto.trim() === "";
  const puedeEnviar = puedeResponder && !vacio && !excedido;

  const enviar = () => {
    if (!puedeEnviar) return;
    conversacionesStore.enviarComoNegocio(convId, texto);
    setTexto("");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      enviar();
    }
  };

  return (
    <div className="sticky bottom-0 border-t border-gray-200 bg-white px-4 py-3 sm:px-6 sm:py-3.5 dark:border-gray-800 dark:bg-transparent">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          enviar();
        }}
        className="flex items-center justify-between gap-2"
      >
        <div className="relative flex flex-1 items-center">
          {/* Botón Emoji */}
          <button
            type="button"
            title="Insertar emoji"
            className="mr-3 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-200 shrink-0"
          >
            <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2ZM3.5 12C3.5 7.30558 7.30558 3.5 12 3.5C16.6944 3.5 20.5 7.30558 20.5 12C20.5 16.6944 16.6944 20.5 12 20.5C7.30558 20.5 3.5 16.6944 3.5 12ZM10.0001 9.23256C10.0001 8.5422 9.44042 7.98256 8.75007 7.98256C8.05971 7.98256 7.50007 8.5422 7.50007 9.23256V9.23266C7.50007 9.92301 8.05971 10.4827 8.75007 10.4827C9.44042 10.4827 10.0001 9.92301 10.0001 9.23266V9.23256ZM15.2499 7.98256C15.9403 7.98256 16.4999 8.5422 16.4999 9.23256V9.23266C16.4999 9.92301 15.9403 10.4827 15.2499 10.4827C14.5596 10.4827 13.9999 9.92301 13.9999 9.23266V9.23256C13.9999 8.5422 14.5596 7.98256 15.2499 7.98256ZM9.23014 13.7116C8.97215 13.3876 8.5003 13.334 8.17625 13.592C7.8522 13.85 7.79865 14.3219 8.05665 14.6459C8.97846 15.8037 10.4026 16.5481 12 16.5481C13.5975 16.5481 15.0216 15.8037 15.9434 14.6459C16.2014 14.3219 16.1479 13.85 15.8238 13.592C15.4998 13.334 15.0279 13.3876 14.7699 13.7116C14.1205 14.5274 13.1213 15.0481 12 15.0481C10.8788 15.0481 9.87961 14.5274 9.23014 13.7116Z"
              />
            </svg>
          </button>

          {/* Campo de texto plano sin bordes invasivos */}
          <input
            type="text"
            disabled={!puedeResponder}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={
              puedeResponder
                ? "Type a message"
                : "No puedes responder en esta conversación"
            }
            className="w-full bg-transparent border-0 outline-hidden h-9 text-sm text-gray-800 placeholder:text-gray-400 focus:border-0 focus:ring-0 focus:outline-hidden disabled:cursor-not-allowed disabled:opacity-60 dark:text-white/90 dark:placeholder:text-gray-500"
          />
        </div>

        {/* Acciones de la derecha: adjunto, mic y botón de envío índigo */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            title="Adjuntar archivo"
            className="text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-200"
          >
            <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12.9522 14.4422C12.9522 14.452 12.9524 14.4618 12.9527 14.4714V16.1442C12.9527 16.6699 12.5265 17.0961 12.0008 17.0961C11.475 17.0961 11.0488 16.6699 11.0488 16.1442V6.15388C11.0488 5.73966 10.7131 5.40388 10.2988 5.40388C9.88463 5.40388 9.54885 5.73966 9.54885 6.15388V16.1442C9.54885 17.4984 10.6466 18.5961 12.0008 18.5961C13.355 18.5961 14.4527 17.4983 14.4527 16.1442V6.15388C14.4527 6.14308 14.4525 6.13235 14.452 6.12166C14.4347 3.84237 12.5817 2 10.2983 2C8.00416 2 6.14441 3.85976 6.14441 6.15388V14.4422C6.14441 14.4492 6.1445 14.4561 6.14469 14.463V16.1442C6.14469 19.3783 8.76643 22 12.0005 22C15.2346 22 17.8563 19.3783 17.8563 16.1442V9.55775C17.8563 9.14354 17.5205 8.80775 17.1063 8.80775C16.6921 8.80775 16.3563 9.14354 16.3563 9.55775V16.1442C16.3563 18.5498 14.4062 20.5 12.0005 20.5C9.59485 20.5 7.64469 18.5498 7.64469 16.1442V9.55775C7.64469 9.55083 7.6446 9.54393 7.64441 9.53706L7.64441 6.15388C7.64441 4.68818 8.83259 3.5 10.2983 3.5C11.764 3.5 12.9522 4.68818 12.9522 6.15388L12.9522 14.4422Z"
              />
            </svg>
          </button>

          <button
            type="button"
            title="Nota de voz"
            className="text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-200"
          >
            <svg className="h-5 w-5 stroke-current" viewBox="0 0 24 24" fill="none">
              <rect x="7" y="2.75" width="10" height="12.5" rx="5" strokeWidth="1.5" />
              <path d="M20 10.25C20 14.6683 16.4183 18.25 12 18.25C7.58172 18.25 4 14.6683 4 10.25" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M10 21.25H14" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M12 18.25L12 21.25" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>

          <button
            type="submit"
            disabled={!puedeEnviar}
            title="Enviar mensaje"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#465fff] text-white shadow-xs transition-colors hover:bg-[#3b51e6] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PaperPlaneIcon className="h-4 w-4 fill-current" />
          </button>
        </div>
      </form>

      {!puedeResponder && (
        <p className="mt-1 text-xs text-warning-600 dark:text-warning-400">
          {motivoSinPermiso("channels.respond")}
        </p>
      )}
    </div>
  );
});

export default Composer;
