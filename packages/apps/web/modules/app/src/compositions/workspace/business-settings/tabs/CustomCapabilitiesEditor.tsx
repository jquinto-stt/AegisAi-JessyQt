import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button, Input, Label, Textarea, Toggle } from "@/elements";
import type { CustomCapability } from "../business-settings.constants";

/* ── Custom capability editor ────────────────────────────────────────
 * Inline list + "add" form for per-source conversational rules. Rendered by
 * the WhatsApp bot tab once per knowledge source (catalog, business, faq,
 * policies, inventory, orders, human).
 *
 * ⚠️ Hereda la tipografía de la tarjeta que lo hospeda, no la suya: el nombre
 * de la capacidad iba en `text-base font-bold` —un escalón **por encima** del
 * título de la fila que lo contiene— y las reglas de la IA competían en peso con
 * el título de la sección. Aquí todo baja a la escala acordada: `theme-sm`
 * semibold para el nombre, `theme-xs` medio para rótulos y ayudas.
 *
 * ── Del catálogo ────────────────────────────────────────────────────
 *
 * ⚠️ Los dos campos usan **`Label` + `Input`**, no el `Field` del DS. El motivo
 * es de densidad: `Input` aplica su `className` **al propio `<input>`** y su
 * base va por `cn()` (tailwind-merge), así que `h-9` sobrescribe el `h-11` de la
 * receta. El `className` de `Field` aterriza en el `<label>` que envuelve, no en
 * el control, y con él no hay forma de reducir la altura. `Label` reproduce el
 * mismo rótulo (`mb-1.5 block text-sm font-medium`) que el `SettingsLabel` que
 * había aquí.
 *
 * ⚠️ El `Textarea` del DS recibe el **valor** (`onChange(value: string)`), no el
 * evento — igual que los demás campos de este formulario.
 *
 * ⚠️ El botón de borrar de cada capacidad se queda **nativo**: es un icono de
 * 14 px dentro de un `p-1.5` con `title`, y el `size="icon"` del catálogo mide
 * 40 × 40. Convertirlo inflaría la altura de cada fila de la lista, que es
 * exactamente lo que este editor viene a evitar. Los cuatro botones de acción
 * (cancelar, guardar, agregar) sí son `Button`.
 * ────────────────────────────────────────────────────────────────── */

export interface CustomCapabilitiesProps {
  sourceId: CustomCapability["sourceId"];
  capabilities: CustomCapability[];
  addingSource: string | null;
  newLabel: string;
  newDesc: string;
  newInstruction: string;
  onStartAdd: (sourceId: string) => void;
  onCancelAdd: () => void;
  onLabelChange: (v: string) => void;
  onDescChange: (v: string) => void;
  onInstructionChange: (v: string) => void;
  onAdd: (sourceId: CustomCapability["sourceId"]) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}
export const CustomCapabilitiesEditor: React.FC<CustomCapabilitiesProps> = ({
  sourceId,
  capabilities,
  addingSource,
  newLabel,
  newDesc,
  newInstruction,
  onStartAdd,
  onCancelAdd,
  onLabelChange,
  onDescChange,
  onInstructionChange,
  onAdd,
  onToggle,
  onDelete,
}) => {
  const sourceCaps = capabilities.filter(c => c.sourceId === sourceId);
  const isAdding = addingSource === sourceId;

  /* Cancelar hace tres cosas siempre (cerrar y vaciar los tres campos), y estaba
     escrito dos veces —una por cada botón de cancelar—. */
  const resetDraft = () => {
    onCancelAdd();
    onLabelChange("");
    onDescChange("");
    onInstructionChange("");
  };

  return (
    <div className="space-y-2.5 pt-2">
      {sourceCaps.length > 0 && (
        <div className="space-y-2">
          {sourceCaps.map((cap) => (
            <div
              key={cap.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3.5 dark:border-gray-700 dark:bg-gray-800"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-theme-sm font-semibold tracking-tight text-secondary-600 dark:text-white">
                    {cap.label}
                  </p>
                  <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-100 px-2 py-0.5 text-theme-xs font-medium text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
                    Personalizada
                  </span>
                </div>
                {cap.desc && (
                  <p className="text-theme-xs text-gray-500 dark:text-gray-400">{cap.desc}</p>
                )}
                {cap.instruction && (
                  <div className="mt-1.5 rounded-xl border border-gray-100 bg-white p-2 text-theme-xs leading-relaxed text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
                    <span className="font-semibold">Regla / Prompt IA: </span>
                    {cap.instruction}
                  </div>
                )}
              </div>
              <div className="flex flex-none items-center gap-2 pt-0.5">
                <Toggle
                  intent={`bot.custom.${cap.id}`}
                  checked={cap.enabled}
                  onChange={() => onToggle(cap.id)}
                />
                <button
                  type="button"
                  onClick={() => onDelete(cap.id)}
                  className="cursor-pointer rounded-full p-1.5 text-gray-400 transition-colors hover:bg-error-50 hover:text-error-600 dark:hover:bg-error-950/30"
                  title="Eliminar capacidad"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isAdding ? (
        <div className="animate-fade-in space-y-3 rounded-xl bg-brand-50/50 p-4 dark:bg-brand-950/20">
          <div className="flex items-center justify-between gap-3">
            <span className="text-theme-xs font-medium text-brand-600 dark:text-brand-400">
              Nueva capacidad personalizada
            </span>
            <Button
              variant="ghost"
              intent="bot.custom.cancel"
              onClick={resetDraft}
              className="h-auto rounded-none px-0 py-0 text-theme-xs font-medium text-gray-500 hover:bg-transparent hover:text-gray-700 dark:text-gray-500 dark:hover:bg-transparent dark:hover:text-gray-300"
            >
              Cancelar
            </Button>
          </div>

          <div className="space-y-2.5">
            <div>
              <Label htmlFor="cap-label">Nombre de la capacidad *</Label>
              <Input
                id="cap-label"
                type="text"
                value={newLabel}
                onChange={(e) => onLabelChange(e.target.value)}
                placeholder="Ej: Recomendar postres y bebidas grandes"
                className="h-9 w-full"
              />
            </div>

            <div>
              <Label htmlFor="cap-desc">Descripción corta</Label>
              <Input
                id="cap-desc"
                type="text"
                value={newDesc}
                onChange={(e) => onDescChange(e.target.value)}
                placeholder="Ej: Ofrece sugerencias al momento de elegir el plato fuerte"
                className="h-9 w-full"
              />
            </div>

            <div>
              <Label htmlFor="cap-instruction">
                Instrucción para el asistente IA (regla de comportamiento) *
              </Label>
              <Textarea
                rows={2}
                value={newInstruction}
                onChange={onInstructionChange}
                placeholder="Ej: Cuando el comprador elija un plato fuerte, sugiere amablemente agregar bebida grande por $1.500 adicionales."
                className="resize-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              variant="ghost"
              intent="bot.custom.cancel"
              onClick={resetDraft}
              className="h-auto rounded-full px-3 py-1.5 text-theme-xs font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              intent="bot.custom.save"
              onClick={() => onAdd(sourceId)}
              disabled={!newLabel.trim()}
              startIcon={<Plus className="h-3.5 w-3.5" />}
              className="h-auto gap-1.5 rounded-full px-3.5 py-1.5 text-theme-xs font-semibold shadow-none hover:bg-brand-600 disabled:opacity-50"
            >
              Guardar capacidad
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          intent="bot.custom.add"
          onClick={() => {
            onStartAdd(sourceId);
            onLabelChange("");
            onDescChange("");
            onInstructionChange("");
          }}
          startIcon={
            <Plus className="h-3.5 w-3.5 text-gray-400 transition-colors group-hover:text-brand-500" />
          }
          className="group h-auto w-full gap-1.5 rounded-full border border-dashed border-gray-300 px-3 py-2.5 text-theme-xs font-semibold text-gray-600 ring-0 hover:border-brand-500 hover:bg-brand-50/40 hover:text-brand-600 dark:border-gray-700 dark:text-gray-400 dark:hover:border-brand-400 dark:hover:bg-brand-950/20 dark:hover:text-brand-400"
        >
          Agregar capacidad personalizada
        </Button>
      )}
    </div>
  );
};
