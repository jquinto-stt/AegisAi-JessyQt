import { Download, FileText, Mic } from "lucide-react";

import type { ConversationMessage } from "@/contracts/conversation.contract";
import { Avatar } from "@/elements";
import { formatTime } from "../conversation-time.utils";
import { MessageStatusIcon } from "../shared/MessageStatusIcon";
import { cn } from "@/utils";

export interface MessageBubbleProps {
  message: ConversationMessage;
  isBurstStart?: boolean;
  isBurstEnd?: boolean;
  authorName?: string;
  authorAvatar?: string;
}

export function MessageBubble({
  message,
  isBurstStart = true,
  isBurstEnd = true,
  authorName = "Cliente",
  authorAvatar,
}: MessageBubbleProps) {
  const isOutgoing = message.direction === "outgoing";

  return (
    <div
      className={cn(
        "flex w-full",
        isOutgoing ? "justify-end" : "items-start gap-3 justify-start"
      )}
      data-message-direction={message.direction}
    >
      {/* Avatar en mensajes entrantes (Elements ChatBoxBody pattern) */}
      {!isOutgoing && (
        <div className="flex-none pt-0.5">
          {isBurstEnd ? (
            <Avatar
              size="small"
              src={authorAvatar}
              initials={authorName.slice(0, 2).toUpperCase()}
              alt={authorName}
              className="shadow-theme-xs"
            />
          ) : (
            <div className="h-8 w-8 max-w-8" />
          )}
        </div>
      )}

      <div className={cn("max-w-[85%] sm:max-w-[70%]", isOutgoing ? "text-right" : "")}>
        <div
          data-message-id={message.id}
          className={cn(
            "relative px-4 py-2.5 text-theme-sm transition-all",
            "rounded-2xl",
            isOutgoing
              ? cn(
                  "bg-brand-500 text-white shadow-theme-xs text-left",
                  isBurstEnd ? "rounded-br-xs" : "rounded-br-2xl",
                  isBurstStart ? "rounded-tr-2xl" : "rounded-tr-xs"
                )
              : cn(
                  "bg-gray-100 text-gray-800 dark:bg-white/[0.06] dark:text-white/90 text-left",
                  isBurstEnd ? "rounded-bl-xs" : "rounded-bl-2xl",
                  isBurstStart ? "rounded-tl-2xl" : "rounded-tl-xs"
                )
          )}
        >
          <MessageContent message={message} isOutgoing={isOutgoing} authorName={authorName} />
        </div>

        {/* Pie de mensaje: autor + hora + estado */}
        <div
          className={cn(
            "mt-1 flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-gray-500",
            isOutgoing ? "justify-end" : "justify-start pl-1"
          )}
        >
          <span>
            {isOutgoing ? formatTime(message.sentAt) : `${authorName}, ${formatTime(message.sentAt)}`}
          </span>

          {isOutgoing && message.status && (
            <span
              data-message-status={message.status}
              className="inline-flex items-center text-brand-500 dark:text-brand-400"
            >
              <MessageStatusIcon status={message.status} />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function MessageContent({
  message,
  isOutgoing,
  authorName,
}: {
  message: ConversationMessage;
  isOutgoing: boolean;
  authorName?: string;
}) {
  const { content } = message;

  switch (content.kind) {
    case "text":
      return <p className="break-words leading-relaxed">{content.body}</p>;

    case "image":
      return (
        <div className="space-y-1.5">
          <div className="overflow-hidden rounded-xl bg-black/10 dark:bg-black/30">
            <div className="flex h-40 w-full max-w-[280px] items-center justify-center bg-gray-200/60 dark:bg-gray-800/80 text-gray-500 dark:text-gray-400">
              <span className="text-theme-xs font-medium">📷 {content.fileName}</span>
            </div>
          </div>
          {content.caption && <p className="break-words text-theme-xs">{content.caption}</p>}
        </div>
      );

    case "document":
      return (
        <div className="space-y-1.5">
          <div
            className={cn(
              "flex items-center gap-3 rounded-xl p-2.5",
              isOutgoing ? "bg-white/10" : "bg-white dark:bg-white/5 border border-gray-200/60 dark:border-gray-700/60"
            )}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500/15 text-brand-500">
              <FileText className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-theme-xs font-semibold">{content.fileName}</p>
              <span className="text-[11px] opacity-75">{content.sizeLabel}</span>
            </div>
            <button
              type="button"
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              title="Descargar documento"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>
          {content.caption && <p className="break-words text-theme-xs">{content.caption}</p>}
        </div>
      );

    case "audio":
      return (
        <div className="flex items-center gap-3 py-1">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500/15 text-brand-500">
            <Mic className="h-4 w-4" />
          </span>
          <div className="flex-1">
            <div className="h-1.5 w-32 rounded-full bg-current opacity-20" />
          </div>
          <span className="text-[11px] tabular-nums opacity-75">{content.durationLabel}</span>
        </div>
      );

    default:
      return null;
  }
}

export default MessageBubble;
