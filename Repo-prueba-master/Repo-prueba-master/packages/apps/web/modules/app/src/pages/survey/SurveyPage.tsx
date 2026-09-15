import { useState } from "react";
import { useParams } from "react-router";
import { observer } from "mobx-react-lite";
import { PageMeta } from "@/shell/meta";
import { Button } from "@/elements/ui/button";
import { queuesStore } from "@/stores";

// ═══════════════════════════════════════════════════════════════════════════
// Star rating (custom — no equivalent in the Elements catalog)
// ═══════════════════════════════════════════════════════════════════════════

interface StarRatingProps {
  value: number;
  onChange: (v: number) => void;
  labels?: string[];
  error?: boolean;
}

const StarRating = ({ value, onChange, labels, error }: StarRatingProps) => {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div>
      <div className="flex items-center justify-center gap-2" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${n} ${n === 1 ? "estrella" : "estrellas"}`}
            onClick={() => onChange(n)}
            onMouseEnter={() => setHover(n)}
            className="p-1 transition-transform hover:scale-110 focus:outline-none"
          >
            <svg
              viewBox="0 0 24 24"
              className={`h-10 w-10 transition-colors ${
                n <= shown ? "text-warning-400" : error ? "text-error-200" : "text-gray-200 dark:text-gray-700"
              }`}
              fill="currentColor"
            >
              <path d="M12 17.27l5.18 3.13-1.37-5.9 4.58-3.97-6.03-.52L12 4.5 9.64 10.01l-6.03.52 4.58 3.97-1.37 5.9z" />
            </svg>
          </button>
        ))}
      </div>
      {labels && shown > 0 && (
        <p className="mt-2 text-center text-sm font-medium text-gray-600 dark:text-gray-300">{labels[shown - 1]}</p>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// Survey page (public, standalone, mobile-first) — MOCK, no backend
// ═══════════════════════════════════════════════════════════════════════════

const SATISFACTION_LABELS = ["Muy malo", "Malo", "Regular", "Bueno", "Excelente"];

export const SurveyPage = observer(() => {
  useParams(); // token disponible como :token (mock: no se usa aún)
  const cfg = queuesStore.surveyConfig;

  const [satisfaction, setSatisfaction] = useState(0);
  const [recommendation, setRecommendation] = useState(0);
  const [comments, setComments] = useState("");
  const [error, setError] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = () => {
    if (satisfaction === 0) {
      setError(true);
      return;
    }
    // MOCK: sin backend. Aquí iría el POST /survey/:token.
    setSent(true);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8 dark:bg-gray-950">
      <PageMeta title="Encuesta de satisfacción" description="Cuéntanos cómo estuvo tu experiencia" />

      <div className="w-full max-w-md rounded-3xl border border-gray-100 bg-white p-7 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900 sm:p-8">
        {/* Branding */}
        <div className="mb-6 flex items-center justify-center gap-2">
          {cfg.logoUrl ? (
            <img src={cfg.logoUrl} alt={cfg.businessName} className="h-8 w-8 rounded-lg object-cover" />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-white">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                <path d="M12 2l2.4 7.4H22l-6 4.5 2.3 7.1-6.3-4.6L5.7 21l2.3-7.1-6-4.5h7.6z" />
              </svg>
            </span>
          )}
          <span className="text-base font-semibold text-gray-800 dark:text-white/90">{cfg.businessName}</span>
        </div>

        {sent ? (
          // ── Thank-you state (replaces the card content) ──
          <div className="py-8 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-success-500 text-white">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-8 w-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-800 dark:text-white/90">{cfg.thankYouTitle}</h1>
            <p className="mx-auto mt-2 max-w-xs text-sm text-gray-500 dark:text-gray-400">
              {cfg.thankYouMessage}
            </p>
          </div>
        ) : (
          // ── Form state ──
          <>
            <div className="mb-7 text-center">
              <h1 className="text-xl font-bold text-gray-800 dark:text-white/90">{cfg.title}</h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{cfg.subtitle}</p>
            </div>

            <div className="space-y-7">
              {/* Satisfacción (obligatoria) */}
              <div>
                <p className="mb-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
                  Tu satisfacción general
                </p>
                <StarRating
                  value={satisfaction}
                  onChange={(v) => { setSatisfaction(v); setError(false); }}
                  labels={SATISFACTION_LABELS}
                  error={error}
                />
                {error && (
                  <p className="mt-2 text-center text-xs text-error-500">
                    Por favor califica tu satisfacción para continuar.
                  </p>
                )}
              </div>

              {/* Recomendación (opcional) */}
              <div>
                <p className="mb-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
                  ¿Qué tan probable es que nos recomiendes?
                </p>
                <StarRating value={recommendation} onChange={setRecommendation} />
              </div>

              {/* Comentarios (opcional) */}
              <div>
                <label htmlFor="comments" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Comentarios <span className="font-normal text-gray-400">(opcional)</span>
                </label>
                <textarea
                  id="comments"
                  rows={3}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Cuéntanos qué te pareció..."
                  className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white/90"
                />
              </div>

              <Button className="w-full" size="md" onClick={handleSubmit}>
                Enviar calificación
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
});

export default SurveyPage;
