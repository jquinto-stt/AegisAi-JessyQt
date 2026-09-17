import { useState, useEffect } from "react";
import type { AssistantArtifact } from "@/stores/assistant.store";
import { SpreadsheetCanvasView } from "./SpreadsheetCanvasView";
import { ChartCanvasView } from "./ChartCanvasView";
import { ListCanvasView } from "./ListCanvasView";

// ═══════════════════════════════════════════════════════════════════════════
// ARTIFACT CANVAS (CONTENEDOR INSPECTOR POLIMÓRFICO)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Duración del esqueleto de entrada, en ms. **Debe coincidir con la de
 * `paneo-entrada` en `css/base.css`**: el esqueleto y el paneo son un solo
 * gesto, y si divergen se ve el corte.
 */
const REVELADO_MS = 420;

/**
 * ¿Debe el esqueleto cubrir la ENTRADA de la tarjeta?
 *
 * ── Por qué esto NO es latencia simulada ───────────────────────────────────
 *
 * El esqueleto de `SpreadsheetCanvasView` está gobernado por `isLoading`, que la
 * página alimenta con `assistantStore.pensando`. Se midió en el navegador que
 * esa señal **nunca es observable** con el motor actual: `LocalRuleEngine.ask`
 * resuelve sin ceder a una macrotarea, así que `pensando = true`, la respuesta y
 * `pensando = false` se liquidan en la misma cadena de microtareas y MobX no
 * llega a notificar un render intermedio. Muestreando 236 fotogramas con la
 * tarjeta abierta y una petición en vuelo, el número de fotogramas con esqueleto
 * fue **0**. Es decir: `isLoading` es correcto y hoy inalcanzable — lo será de
 * verdad cuando el motor sea remoto (`RemoteLLMEngine`), que sí tiene latencia.
 *
 * Esperar esa latencia no es una opción, así que el esqueleto se ata a la ventana
 * que SÍ existe y es determinista: la animación de entrada. Durante el paneo la
 * tarjeta muestra su forma de carga, y al asentarse revela los datos. No se está
 * fingiendo una espera — se está cubriendo una transición con la forma del
 * contenido que va a aparecer, que es justo para lo que sirve un esqueleto.
 *
 * Con `prefers-reduced-motion` no hay paneo que cubrir, así que no hay esqueleto:
 * se revela de inmediato. Animar y además retener el contenido sería lo peor de
 * ambos mundos.
 */
function debeRevelar(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

interface ArtifactCanvasProps {
  artifact: AssistantArtifact;
  onClose: () => void;
  isLoading?: boolean;
}

export const ArtifactCanvas = ({
  artifact,
  onClose,
  isLoading,
}: ArtifactCanvasProps) => {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);

  // Arranca en `true` para que el primer render YA muestre el esqueleto: si se
  // encendiera en un efecto, se vería un fotograma de tabla cruda antes.
  const [revelando, setRevelando] = useState(debeRevelar);

  useEffect(() => {
    if (!revelando) return;
    const t = setTimeout(() => setRevelando(false), REVELADO_MS);
    return () => clearTimeout(t);
  }, [revelando]);

  /** Copia los datos al portapapeles en formato TSV (para pegar en Excel/Sheets) o JSON */
  const handleCopy = () => {
    try {
      if (artifact.type === "spreadsheet" && artifact.data) {
        const table = artifact.data;
        const lines = [table.columns.join("\t")];
        for (const row of table.rows) {
          lines.push(row.join("\t"));
        }
        navigator.clipboard.writeText(lines.join("\n"));
      } else {
        navigator.clipboard.writeText(JSON.stringify(artifact.data, null, 2));
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback si no hay soporte de clipboard
    }
  };

  /** Descarga CSV si es tabla */
  const handleDownloadCsv = () => {
    if (artifact.type !== "spreadsheet" || !artifact.data) return;
    try {
      const table = artifact.data;
      const lines = [table.columns.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(",")];
      for (const row of table.rows) {
        lines.push(row.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(","));
      }
      const blob = new Blob([lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${artifact.title.toLowerCase().replace(/\s+/g, "_")}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xs dark:border-gray-800 dark:bg-gray-900">
      {/* ── Cabecera del Canvas (Idéntica a capturas: [x] Título + Botones de acción) ── */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800">
        {/* Lado izquierdo: Botón cerrar + Título */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar canvas"
            title="Cerrar vista expandida"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          <h3 className="truncate text-base font-semibold text-gray-900 dark:text-white">
            {artifact.title || "Artefacto"}
          </h3>
        </div>

        {/* Lado derecho: Toolbar de acciones (Copiar, CSV, Feedback, Recargar) */}
        <div className="flex items-center gap-1">
          {/* Botón Descargar CSV (si es spreadsheet) */}
          {artifact.type === "spreadsheet" && (
            <button
              type="button"
              onClick={handleDownloadCsv}
              title="Descargar CSV"
              className="flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>CSV</span>
            </button>
          )}

          {/* Botón Copiar */}
          <button
            type="button"
            onClick={handleCopy}
            title="Copiar al portapapeles"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
          >
            {copied ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            )}
          </button>

          {/* Thumbs Up */}
          <button
            type="button"
            onClick={() => setFeedback(feedback === "up" ? null : "up")}
            title="Me gusta"
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
              feedback === "up"
                ? "bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400"
                : "text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
            }`}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
            </svg>
          </button>

          {/* Thumbs Down */}
          <button
            type="button"
            onClick={() => setFeedback(feedback === "down" ? null : "down")}
            title="No me gusta"
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
              feedback === "down"
                ? "bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400"
                : "text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
            }`}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Cuerpo del Canvas (Polimórfico según artifact.type) ── */}
      <div className="min-h-0 flex-1 overflow-hidden">
        {artifact.type === "spreadsheet" && (
          <SpreadsheetCanvasView
            table={artifact.data}
            isLoading={Boolean(isLoading) || revelando}
          />
        )}
        {artifact.type === "chart" && (
          <ChartCanvasView metrics={artifact.data} title={artifact.title} />
        )}
        {artifact.type === "list" && (
          <ListCanvasView list={artifact.data} />
        )}
      </div>
    </div>
  );
};

export default ArtifactCanvas;
