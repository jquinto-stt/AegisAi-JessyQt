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
      <div className="w-full shrink-0 bg-[#97D6DF]/20 dark:bg-[#190088]/30 py-2 px-4 text-center text-xs sm:text-sm font-semibold text-[#190088] dark:text-[#97D6DF] flex items-center justify-center gap-2 border-b border-[#97D6DF]/40 dark:border-[#190088]/60 shadow-2xs transition-colors">
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
        className="ml-2 inline-flex items-center gap-1 rounded-full bg-[#FF3F1A] hover:bg-[#e5351a] px-2.5 py-0.5 text-[11px] font-bold text-white transition-colors cursor-pointer shadow-xs"
      >
        <span>Reactivar bot</span>
        <span className="text-xs">🤖</span>
      </button>
    </div>
  );
});

export default BannerEstadoBot;

