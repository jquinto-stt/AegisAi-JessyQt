import type { Survey, Sentiment } from "@/stores";
import { StarRating } from "./StarRating";
import { cn } from "@/utils";

interface CommentCardProps {
  survey: Survey;
  sentiment: Sentiment;
  onReply: () => void;
}

const accent: Record<Sentiment, string> = {
  positive: "border-l-success-500",
  neutral: "border-l-gray-300 dark:border-l-gray-600",
  negative: "border-l-error-500",
};

const WhatsAppBadge = () => (
  <span className="inline-flex items-center gap-1 rounded-full bg-success-50 px-2 py-0.5 text-xs font-medium text-success-600 dark:bg-success-500/15 dark:text-success-500">
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
      <path d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm0 18a8 8 0 01-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1112 20z" />
    </svg>
    WhatsApp
  </span>
);

/**
 * CommentCard — A single survey opinion with sentiment accent and reply action.
 */
export const CommentCard = ({ survey, sentiment, onReply }: CommentCardProps) => {
  return (
    <div className={cn("rounded-2xl border border-l-4 border-gray-200 bg-white p-4 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900", accent[sentiment])}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-medium text-gray-800 dark:text-white/90">{survey.cliente}</p>
          <p className="text-xs text-gray-400">{survey.queueName} · {survey.fecha}</p>
        </div>
        <StarRating value={survey.rating} size="sm" />
      </div>

      {survey.comentario && (
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">"{survey.comentario}"</p>
      )}

      <div className="mt-3 flex items-center justify-between">
        <WhatsAppBadge />
        <button
          onClick={onReply}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-success-500">
            <path d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2z" />
          </svg>
          Responder
        </button>
      </div>
    </div>
  );
};

export default CommentCard;
