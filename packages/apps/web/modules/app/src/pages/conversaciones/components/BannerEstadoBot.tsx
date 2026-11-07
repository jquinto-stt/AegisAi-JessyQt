import { observer } from "mobx-react-lite";
import { conversacionesStore } from "@/stores/conversaciones.store";
import { operadoresStore } from "@/stores/operadores.store";

interface BannerEstadoBotProps {
  convId: string;
}

export const BannerEstadoBot = observer(({ convId }: BannerEstadoBotProps) => {
  const conv = conversacionesStore.getConversacion(convId);
  if (!conv) return null;

  const esModoBot = conv.atencion === "bot";
  const operador = conv.operadorAsignadoId ? operadoresStore.porId(conv.operadorAsignadoId) : null;

  if (esModoBot) {
    return (
      <div className="w-full shrink-0 bg-[#d8b4fe] dark:bg-[#581c87] py-2 px-4 text-center text-xs sm:text-sm font-semibold text-[#3b0764] dark:text-[#f3e8ff] flex items-center justify-center gap-2 border-b border-purple-300 dark:border-purple-900 shadow-2xs transition-colors">
        <span className="text-base leading-none">🤖</span>
        <span>El bot está activo</span>
      </div>
    );
  }

  return (
    <div className="w-full shrink-0 bg-amber-100 dark:bg-amber-950/60 py-2 px-4 text-center text-xs sm:text-sm font-semibold text-amber-900 dark:text-amber-200 flex items-center justify-center gap-2 border-b border-amber-200 dark:border-amber-900 shadow-2xs transition-colors">
      <span className="text-base leading-none">👤</span>
      <span>
        Atendido por {operador?.nombre || "un asesor humano"} · <span className="font-normal opacity-85">Bot pausado</span>
      </span>
      <button
        type="button"
        onClick={() => conversacionesStore.asignar(convId, null)}
        className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-200/80 hover:bg-amber-300 px-2.5 py-0.5 text-[11px] font-bold text-amber-900 transition-colors cursor-pointer dark:bg-amber-900/60 dark:text-amber-100 dark:hover:bg-amber-800"
      >
        <span>Reactivar bot</span>
        <span className="text-xs">🤖</span>
      </button>
    </div>
  );
});

export default BannerEstadoBot;

