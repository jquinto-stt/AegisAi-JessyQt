import { useState } from "react";
import { observer } from "mobx-react-lite";
import { Modal } from "@/elements/ui/modal";
import { Button } from "@/elements/ui/button";
import { Switch } from "@/elements/form/switch";
import { queuesStore } from "@/stores";
import { cn } from "@/utils";

interface ConfigureDisplayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * ConfigureDisplayModal — Pick which queue to show on the waiting-room screen,
 * toggle sound, and open the fullscreen display.
 */
export const ConfigureDisplayModal = observer(({ isOpen, onClose }: ConfigureDisplayModalProps) => {
  const queues = queuesStore.queues;
  const [selectedId, setSelectedId] = useState<string>(queues[0]?.id ?? "");
  const [sound, setSound] = useState(true);

  const openDisplay = () => {
    if (!selectedId) return;
    const url = `/display?cola=${selectedId}${sound ? "&sound=1" : ""}`;
    window.open(url, "_blank");
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[480px] p-6">
      <h4 className="mb-1 text-lg font-semibold text-gray-800 dark:text-white/90">Configurar pantalla de sala</h4>
      <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
        Elige que cola mostrar en la pantalla de la sala de espera.
      </p>

      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Cola a mostrar</label>
          <div className="space-y-2">
            {queues.map((q) => (
              <button
                key={q.id}
                onClick={() => setSelectedId(q.id)}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors",
                  selectedId === q.id
                    ? "border-brand-500 bg-brand-50 dark:border-brand-500 dark:bg-brand-500/10"
                    : "border-gray-200 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/5",
                )}
              >
                <div className="flex items-center gap-2.5">
                  <span className={cn("h-2.5 w-2.5 rounded-full", q.color)} />
                  <span className="text-sm font-medium text-gray-800 dark:text-white/90">{q.nombre}</span>
                </div>
                <span className="text-xs text-gray-400">{q.waiting.length} esperando</span>
              </button>
            ))}
            {queues.length === 0 && (
              <p className="rounded-xl border border-dashed border-gray-200 py-6 text-center text-sm text-gray-400 dark:border-gray-800">
                No hay colas. Crea una primero.
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 pt-4 dark:border-gray-800">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Sonido al llamar turno</p>
            <p className="text-xs text-gray-400">Reproduce un tono cuando cambia el turno.</p>
          </div>
          <Switch checked={sound} onChange={setSound} />
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <Button size="sm" variant="outline" onClick={onClose}>Cancelar</Button>
        <Button size="sm" onClick={openDisplay}>Abrir pantalla</Button>
      </div>
    </Modal>
  );
});

export default ConfigureDisplayModal;
