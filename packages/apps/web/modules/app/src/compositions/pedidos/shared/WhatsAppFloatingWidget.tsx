import React, { useState } from "react";
import { usePedidos } from "../context/PedidosContext";
import { ConversacionesView } from "../operacion/ConversacionesView";
import {
  MessageSquare,
  X,
  Maximize2,
  Minimize2,
  ExternalLink,
} from "lucide-react";

export const WhatsAppFloatingWidget: React.FC<{
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onNavigateToFullView?: () => void;
}> = ({ isOpen: controlledIsOpen, onOpenChange, onNavigateToFullView }) => {
  const { conversations } = usePedidos();
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const setIsOpen = (next: boolean) => {
    if (onOpenChange) onOpenChange(next);
    else setInternalIsOpen(next);
  };

  const pendingInterventions = conversations.filter(c => c.status === "REQUIERE_INTERVENCION").length;
  const unreadCount = conversations.filter(c => c.unreadForOperator).length;
  const totalAlerts = pendingInterventions + unreadCount;

  // Draggable FAB Position State with localStorage persistence
  const [fabPosition, setFabPosition] = useState<{ x: number; y: number } | null>(() => {
    try {
      const saved = localStorage.getItem("necto_whatsapp_fab_pos");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  });

  const [isDraggingFab, setIsDraggingFab] = useState(false);
  const dragStartRef = React.useRef<{ mouseX: number; mouseY: number; startX: number; startY: number } | null>(null);
  const hasMovedRef = React.useRef(false);

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startX: rect.left,
      startY: rect.top,
    };
    hasMovedRef.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragStartRef.current) return;
    const deltaX = e.clientX - dragStartRef.current.mouseX;
    const deltaY = e.clientY - dragStartRef.current.mouseY;

    if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
      hasMovedRef.current = true;
      setIsDraggingFab(true);
      const newX = Math.max(16, Math.min(window.innerWidth - 180, dragStartRef.current.startX + deltaX));
      const newY = Math.max(16, Math.min(window.innerHeight - 70, dragStartRef.current.startY + deltaY));
      setFabPosition({ x: newX, y: newY });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (dragStartRef.current && hasMovedRef.current && fabPosition) {
      try {
        localStorage.setItem("necto_whatsapp_fab_pos", JSON.stringify(fabPosition));
      } catch (e) {}
    }
    dragStartRef.current = null;
    setIsDraggingFab(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (e) {}
  };

  const handleClick = () => {
    if (!hasMovedRef.current) {
      setIsOpen(true);
    }
  };

  return (
    <>
      {/* Floating Draggable Action Button (FAB) */}
      {!isOpen && (
        <div
          style={
            fabPosition
              ? { left: `${fabPosition.x}px`, top: `${fabPosition.y}px` }
              : { right: "24px", bottom: "24px" }
          }
          className="fixed z-50 flex items-center gap-3 select-none touch-none animate-fade-in"
        >
          <button
            type="button"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onClick={handleClick}
            className={`group relative flex items-center gap-2.5 px-3.5 py-2.5 rounded-full bg-[#FF3F1A] hover:bg-[#e03413] text-white shadow-xl hover:shadow-2xl transition-all duration-200 cursor-grab active:cursor-grabbing border border-white/20 ${
              isDraggingFab ? "scale-105 opacity-90 shadow-2xl" : ""
            }`}
            title="Arrastra para mover a cualquier posición o haz clic para abrir chats de WhatsApp"
          >
            {/* Animated Pulse Ring if there are pending alerts */}
            {totalAlerts > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 pointer-events-none">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#190088] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-[#190088] text-[10px] font-black text-white items-center justify-center border border-white/40">
                  {totalAlerts}
                </span>
              </span>
            )}

            {/* 9-dot grip drag indicator */}
            <div className="grid grid-cols-3 gap-[2px] w-3 h-3 opacity-75 group-hover:opacity-100 flex-none pointer-events-none">
              <span className="w-[3px] h-[3px] rounded-full bg-white" />
              <span className="w-[3px] h-[3px] rounded-full bg-white" />
              <span className="w-[3px] h-[3px] rounded-full bg-white" />
              <span className="w-[3px] h-[3px] rounded-full bg-white" />
              <span className="w-[3px] h-[3px] rounded-full bg-white" />
              <span className="w-[3px] h-[3px] rounded-full bg-white" />
              <span className="w-[3px] h-[3px] rounded-full bg-white" />
              <span className="w-[3px] h-[3px] rounded-full bg-white" />
              <span className="w-[3px] h-[3px] rounded-full bg-white" />
            </div>

            <div className="relative pointer-events-none">
              <MessageSquare className="w-4.5 h-4.5 text-white" />
            </div>

            <div className="flex flex-col text-left pointer-events-none pr-1">
              <span className="text-xs font-bold tracking-tight leading-none text-white">
                WhatsApp IA
              </span>
              <span className="text-[10px] font-medium text-white/80 leading-none mt-1">
                {pendingInterventions > 0
                  ? `${pendingInterventions} requieren atención`
                  : `${conversations.length} chats activos`}
              </span>
            </div>
          </button>
        </div>
      )}

      {/* Floating Chat Tray Modal */}
      {isOpen && (
        <div
          className={`fixed z-50 transition-all duration-300 ${
            isExpanded
              ? "inset-3 sm:inset-5 rounded-2xl"
              : "bottom-3 sm:bottom-5 right-3 sm:right-5 w-[calc(100vw-24px)] sm:w-[560px] lg:w-[940px] h-[640px] max-h-[88vh] rounded-2xl"
          } bg-white dark:bg-[#111B21] border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col animate-scale-up`}
        >
          {/* Authentic WhatsApp Top Bar */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-[#008069] dark:bg-[#202C33] text-white border-b border-[#00705c] dark:border-[#222E35] flex-none select-none">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-white/15 text-white flex items-center justify-center flex-none">
                <MessageSquare className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold tracking-tight">
                    WhatsApp Web & IA Necto
                  </h3>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-white/20 text-emerald-100">
                    Live
                  </span>
                </div>
                <p className="text-[10px] text-emerald-100/80 dark:text-zinc-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                  <span>Human-in-the-Loop activo</span>
                  {pendingInterventions > 0 && (
                    <span className="text-rose-200 dark:text-rose-400 font-bold font-mono">
                      · {pendingInterventions} alerta{pendingInterventions > 1 ? "s" : ""}
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {onNavigateToFullView && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onNavigateToFullView();
                  }}
                  className="p-1.5 px-2.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
                  title="Abrir en pantalla completa de Conversaciones"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Pantalla Completa</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 rounded-lg hover:bg-white/15 text-white transition-colors cursor-pointer hidden sm:block"
                title={isExpanded ? "Restaurar tamaño" : "Maximizar"}
              >
                {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/15 text-white transition-colors cursor-pointer"
                title="Cerrar ventana emergente"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Embedded Single Unified Conversations Inbox */}
          <div className="flex-1 min-h-0 bg-[#F0F2F5] dark:bg-[#111B21] overflow-hidden">
            <ConversacionesView isEmbedded={true} />
          </div>
        </div>
      )}
    </>
  );
};
