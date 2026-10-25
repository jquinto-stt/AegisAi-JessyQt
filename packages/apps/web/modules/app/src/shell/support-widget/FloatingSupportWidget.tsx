import React, { useState, useRef, useEffect } from "react";
import { observer } from "mobx-react-lite";
import { assistantStore } from "@/stores";
import { FAQ_ITEMS, type FaqItem } from "@/pages/help/help.constants";

type WidgetTab = "home" | "chat";

const CATEGORIES = ["Envíos", "Planes", "WhatsApp", "Bancos"];

export const FloatingSupportWidget: React.FC = observer(() => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<WidgetTab>("home");
  const [inputTexto, setInputTexto] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [articuloAbierto, setArticuloAbierto] = useState<FaqItem | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<HTMLDivElement>(null);

  // Auto-scroll al final del chat cuando se agregan mensajes
  useEffect(() => {
    if (activeTab === "chat" && isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [assistantStore.mensajes.length, assistantStore.pensando, activeTab, isOpen]);

  // Cerrar al presionar Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleEnviarMensaje = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const texto = inputTexto.trim();
    if (!texto || assistantStore.pensando) return;
    setInputTexto("");
    await assistantStore.enviar(texto);
  };

  const handleSeleccionarPreguntaRapida = async (pregunta: string) => {
    setActiveTab("chat");
    setArticuloAbierto(null);
    await assistantStore.enviar(pregunta);
  };

  // Filtrado de preguntas frecuentes
  const articulosFiltrados = FAQ_ITEMS.filter((item) => {
    if (selectedCategory) {
      const text = (item.question + " " + item.answer).toLowerCase();
      if (selectedCategory === "WhatsApp" && !text.includes("whatsapp") && !text.includes("canal")) return false;
      if (selectedCategory === "Planes" && !text.includes("plan") && !text.includes("módulo") && !text.includes("modulos") && !text.includes("perfil")) return false;
      if (selectedCategory === "Bancos" && !text.includes("banc") && !text.includes("moneda") && !text.includes("pago") && !text.includes("retiro")) return false;
      if (selectedCategory === "Envíos" && !text.includes("envío") && !text.includes("pedido") && !text.includes("entrega") && !text.includes("comercial")) return false;
    }

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return item.question.toLowerCase().includes(q) || item.answer.toLowerCase().includes(q);
  });

  return (
    <div className="font-['DM_Sans',sans-serif] antialiased">
      {/* ── Ventana emergente del widget ── */}
      {isOpen && (
        <div
          ref={widgetRef}
          aria-label="Plataforma de soporte y asistencia NECTO"
          className="fixed bottom-24 right-4 sm:right-6 z-50 flex w-[calc(100vw-2rem)] sm:w-[370px] h-[600px] max-h-[85vh] flex-col overflow-hidden rounded-[34px] bg-white shadow-2xl border border-[#ECECEC] dark:bg-[#1a1a1a] dark:border-white/10 font-['DM_Sans',sans-serif] animate-aparecer transition-all duration-300 ease-out"
        >
          {/* ══════════════════════════════════════════════════════════
              VISTA PRINCIPAL: HOME (Layout idéntico a referencia)
             ══════════════════════════════════════════════════════════ */}
          {activeTab === "home" && !articuloAbierto && (
            <div className="flex flex-1 min-h-0 flex-col overflow-hidden bg-white dark:bg-[#1a1a1a]">
              {/* ── 1. Hero Card Superior (Azul profundo #190088 con curva inferior) ── */}
              <div className="relative shrink-0 bg-[#190088] px-6 pt-5 pb-6 text-white rounded-b-[32px] shadow-sm overflow-hidden">
                {/* Micro-patrón punteado de fondo */}
                <div
                  className="pointer-events-none absolute inset-0 opacity-15"
                  style={{
                    backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)",
                    backgroundSize: "16px 16px",
                  }}
                />

                {/* Fila superior: Isotipo en blanco + Botón Cerrar */}
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img
                      src="/images/logo/necto-icon-white.svg"
                      alt="Necto"
                      className="h-7 w-7 object-contain"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-white/80 hover:bg-white/15 hover:text-white transition-colors cursor-pointer"
                    title="Cerrar soporte"
                    aria-label="Cerrar soporte"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>

                {/* Saludo / Greeting */}
                <div className="relative z-10 mt-4">
                  <h3 className="text-[24px] font-bold text-white tracking-tight leading-tight">
                    Hello!
                  </h3>
                  <p className="mt-1 text-[16px] font-medium text-white/90">
                    How can we Help You?
                  </p>
                </div>

                {/* Botón CTA Destacado: START A CONVERSATION en Naranja #FF3F1A */}
                <div className="relative z-10 mt-5">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("chat");
                      setArticuloAbierto(null);
                    }}
                    className="group flex w-full items-center justify-between rounded-2xl bg-[#FF3F1A] hover:bg-[#e03512] p-2 pl-6 text-white shadow-lg transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <span className="flex-1 text-center text-[13px] font-bold tracking-wider uppercase text-white">
                      START A CONVERSATION
                    </span>
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#FF3F1A] shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </div>
                  </button>
                </div>
              </div>

              {/* ── CUERPO: Tarjeta de canales + Buscador rápido de respuestas ── */}
              <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar flex flex-col p-4 space-y-4">
                {/* ── 2. Middle Section: Canales flotantes redondeados ── */}
                <div className="rounded-3xl bg-[#F8FAFC] dark:bg-white/[0.03] border border-gray-100 dark:border-white/5 p-4 text-center">
                  <p className="text-[13px] font-semibold text-gray-800 dark:text-gray-200">
                    Talk to us on your favourite channels
                  </p>

                  <div className="flex items-center justify-center gap-3.5 mt-3">
                    {/* Canal Messenger / Chat IA */}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab("chat");
                        setArticuloAbierto(null);
                      }}
                      className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white dark:bg-white/10 shadow-sm border border-gray-100 dark:border-white/10 hover:shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
                      title="Chat directo con IA"
                    >
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" fill="#0084FF" />
                        <path d="M12 4C7.58 4 4 7.36 4 11.5c0 2.22 1.05 4.22 2.76 5.61v2.75l2.67-1.48c.81.23 1.67.36 2.57.36 4.42 0 8-3.36 8-7.5S16.42 4 12 4zm.8 10.15l-2.05-2.18-4 2.18 4.4-4.68 2.05 2.18 4-2.18-4.4 4.68z" fill="white" />
                      </svg>
                    </button>

                    {/* Canal WhatsApp */}
                    <a
                      href="https://wa.me/573000000000?text=Hola,%20necesito%20soporte%20en%20Necto"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white dark:bg-white/10 shadow-sm border border-gray-100 dark:border-white/10 hover:shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
                      title="Chatear por WhatsApp"
                    >
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" fill="#25D366" />
                        <path d="M17.5 14.3c-.2-.1-1.3-.6-1.5-.7-.2-.1-.3-.1-.5.1-.1.2-.5.7-.7.8-.1.1-.3.2-.5.1-.2-.1-.9-.3-1.7-1.1-.6-.6-1.1-1.3-1.2-1.5-.1-.2 0-.3.1-.4.1-.1.2-.2.3-.4.1-.1.1-.2.2-.4 0-.1 0-.3-.1-.4-.1-.1-.5-1.2-.7-1.6-.2-.4-.4-.4-.5-.4h-.4c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 1.9s.8 2.2.9 2.4c.1.2 1.6 2.4 3.9 3.4.5.2 1 .4 1.3.5.5.2 1 .1 1.4.1.4-.1 1.3-.5 1.5-1 .2-.5.2-1 .1-1.1 0-.1-.2-.1-.4-.2z" fill="white" />
                      </svg>
                    </a>

                    {/* Canal Correo */}
                    <a
                      href="mailto:soporte@necto.co"
                      className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white dark:bg-white/10 shadow-sm border border-gray-100 dark:border-white/10 hover:shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
                      title="Enviar correo"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FF3F1A]/10 text-[#FF3F1A]">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                        </svg>
                      </div>
                    </a>
                  </div>
                </div>

                {/* ── 3. Bottom Section: Find an Answer Quickly ── */}
                <div className="flex flex-1 flex-col">
                  <h4 className="text-[14px] font-bold text-gray-900 dark:text-white mb-2 px-1">
                    Find an Answer Quickly
                  </h4>

                  {/* Buscador unificado con botón azul a la derecha */}
                  <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.04] p-1.5 flex items-center shadow-2xs focus-within:border-[#190088] transition-colors">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search our Help Center"
                      className="flex-1 bg-transparent px-3 text-[13px] text-gray-800 placeholder:text-gray-400 focus:outline-hidden dark:text-gray-100 dark:placeholder:text-gray-500"
                    />

                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="mr-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                        title="Limpiar"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    )}

                    {/* Botón azul cuadrado con icono de check / búsqueda */}
                    <button
                      type="button"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#190088] text-white shadow-xs hover:bg-[#150070] active:scale-95 transition-all cursor-pointer"
                      title="Buscar"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Píldoras de categorías estilo referencia */}
                  <div className="flex items-center gap-2 mt-3 overflow-x-auto scrollbar-none pb-1">
                    {CATEGORIES.map((cat) => {
                      const isActive = selectedCategory === cat;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setSelectedCategory(isActive ? null : cat)}
                          className={`shrink-0 rounded-xl px-3.5 py-1.5 text-[12px] font-semibold transition-all cursor-pointer ${
                            isActive
                              ? "bg-[#190088] text-white shadow-xs"
                              : "bg-[#EEF2F6] dark:bg-white/10 text-[#190088] dark:text-[#97D6DF] hover:bg-[#E2E8F0] dark:hover:bg-white/15"
                          }`}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>

                  {/* Lista de artículos filtrados si hay búsqueda o categoría activa */}
                  {(searchQuery || selectedCategory) && (
                    <div className="space-y-2 mt-3 pt-2 border-t border-gray-100 dark:border-white/5 animate-aparecer">
                      {articulosFiltrados.length === 0 ? (
                        <div className="py-4 text-center text-[12px] text-gray-400">
                          No se encontraron resultados para esta búsqueda.
                        </div>
                      ) : (
                        articulosFiltrados.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setArticuloAbierto(item)}
                            className="group flex w-full items-center justify-between gap-3 rounded-2xl bg-gray-50/80 hover:bg-gray-100/90 dark:bg-white/[0.04] dark:hover:bg-white/[0.07] border border-gray-200/60 dark:border-white/10 p-3 text-left transition-all active:scale-[0.99] cursor-pointer"
                          >
                            <span className="text-[12px] font-medium text-gray-800 dark:text-gray-200 line-clamp-2">
                              {item.question}
                            </span>
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="shrink-0 text-gray-400 group-hover:text-[#190088] dark:group-hover:text-[#97D6DF] group-hover:translate-x-0.5 transition-all"
                            >
                              <polyline points="9 18 15 12 9 6" />
                            </svg>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              DETALLE DE ARTÍCULO / FAQ ABIERTO
             ══════════════════════════════════════════════════════════ */}
          {articuloAbierto && (
            <div className="flex flex-1 min-h-0 flex-col p-5 overflow-y-auto custom-scrollbar bg-white dark:bg-[#1a1a1a]">
              <button
                type="button"
                onClick={() => setArticuloAbierto(null)}
                className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#FF3F1A] hover:underline mb-3 cursor-pointer self-start"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                <span>Back to Help</span>
              </button>

              <h4 className="text-[16px] font-bold text-[#190088] dark:text-white mb-2 leading-snug">
                {articuloAbierto.question}
              </h4>

              <div className="rounded-2xl bg-gray-50 p-4 text-[13px] text-gray-700 leading-relaxed dark:bg-white/[0.04] dark:text-[#ECECEC] border border-gray-100 dark:border-white/10">
                {articuloAbierto.answer}
              </div>

              <div className="mt-auto pt-4">
                <button
                  type="button"
                  onClick={() => {
                    const q = articuloAbierto.question;
                    setArticuloAbierto(null);
                    handleSeleccionarPreguntaRapida(q);
                  }}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#190088] hover:bg-[#150070] text-white text-[13px] font-bold shadow-md transition-all active:scale-[0.98] cursor-pointer"
                >
                  <span>Ask AI about this</span>
                </button>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              VISTA: CHAT CON ASISTENTE IA (assistantStore conectado)
             ══════════════════════════════════════════════════════════ */}
          {activeTab === "chat" && !articuloAbierto && (
            <div className="flex flex-1 min-h-0 flex-col bg-[#212121] text-[#ECECEC]">
              {/* Cabecera del chat con botón Volver a Home */}
              <div className="relative shrink-0 bg-[#190088] px-4 py-3.5 text-white flex items-center justify-between shadow-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab("home")}
                  className="flex items-center gap-1.5 rounded-full bg-white/15 hover:bg-white/25 px-3 py-1 text-[12px] font-medium text-white transition-all cursor-pointer"
                  title="Volver a inicio"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                  <span>Inicio</span>
                </button>

                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1.5">
                    <img src="/images/logo/necto-icon-white.svg" alt="Necto" className="h-4 w-4 object-contain" />
                    <span className="text-[14px] font-bold text-white">Necto Support</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-[#97D6DF]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#97D6DF] animate-pulse" />
                    <span>Online 24/7</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-white/80 hover:bg-white/15 hover:text-white transition-colors cursor-pointer"
                  title="Cerrar soporte"
                  aria-label="Cerrar soporte"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {/* Mensajes del chat */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar text-[14px]">
                {/* Mensaje de bienvenida inicial */}
                <div className="flex items-start gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#190088] text-white shadow-xs">
                    <img src="/images/logo/necto-icon-white.svg" alt="IA" className="h-4 w-4 object-contain" />
                  </div>
                  <div className="rounded-2xl rounded-tl-sm bg-[#2b2b2b] border border-white/[0.08] px-4 py-2.5 text-[#ECECEC] font-normal leading-relaxed max-w-[85%]">
                    ¡Hola! Soy tu asistente de soporte NECTO.
                  </div>
                </div>

                {/* Preguntas sugeridas estilo referencia si no hay mensajes */}
                {assistantStore.mensajes.length === 0 && (
                  <div className="space-y-2.5 pt-1">
                    <div className="rounded-2xl rounded-tl-sm bg-[#2b2b2b] border border-white/[0.08] px-4 py-2.5 text-[#ECECEC] font-normal leading-relaxed max-w-[88%] ml-10">
                      ¿Puedo ayudarte con alguno de estos temas?
                    </div>

                    {/* Stack de opciones con flecha ↳ */}
                    <div className="space-y-2 ml-10 max-w-[88%]">
                      {[
                        { id: "account", label: "Configurar mi cuenta y organización", q: "¿Cómo configuro mi cuenta y organización?" },
                        { id: "whatsapp", label: "Conectar canales y WhatsApp", q: "¿Cómo conectar WhatsApp?" },
                        { id: "bank", label: "Cuentas bancarias y retiros", q: "¿Cómo vinculo mi cuenta bancaria?" },
                        { id: "metrics", label: "Consultar métricas y pedidos", q: "¿Dónde veo mis métricas y pedidos?" },
                      ].map((op) => (
                        <button
                          key={op.id}
                          type="button"
                          onClick={() => handleSeleccionarPreguntaRapida(op.q)}
                          className="group flex w-full items-center gap-2.5 rounded-2xl bg-[#2b2b2b]/90 hover:bg-[#343434] border border-[#97D6DF]/20 hover:border-[#97D6DF]/60 px-4 py-3 text-left transition-all active:scale-[0.98] cursor-pointer shadow-xs"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-[#97D6DF] transition-transform group-hover:translate-x-0.5">
                            <path d="M4 4v9a4 4 0 0 0 4 4h12" />
                            <polyline points="15 12 20 17 15 22" />
                          </svg>
                          <span className="text-[14px] font-normal text-[#97D6DF] group-hover:text-white leading-snug">
                            {op.label}
                          </span>
                        </button>
                      ))}

                      {/* Indicador de 3 puntos en paleta NECTO • • • */}
                      <div className="flex items-center justify-center gap-2 pt-1 text-gray-500 opacity-60">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#97D6DF]" />
                        <span className="h-1.5 w-1.5 rounded-full bg-[#ECECEC]" />
                        <span className="h-1.5 w-1.5 rounded-full bg-[#FF3F1A]" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Mensajes del store */}
                {assistantStore.mensajes.map((m, idx) => {
                  const esUsuario = m.role === "user";
                  return (
                    <div
                      key={idx}
                      className={`flex items-start gap-2.5 ${esUsuario ? "justify-end" : "justify-start"}`}
                    >
                      {!esUsuario && (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#190088] text-white shadow-xs">
                          <img src="/images/logo/necto-icon-white.svg" alt="IA" className="h-4 w-4 object-contain" />
                        </div>
                      )}
                      <div
                        className={`rounded-2xl px-4 py-2.5 text-[14px] font-normal leading-relaxed max-w-[85%] ${
                          esUsuario
                            ? "bg-[#190088] text-white rounded-tr-sm shadow-sm"
                            : "bg-[#2b2b2b] border border-white/[0.08] text-[#ECECEC] rounded-tl-sm"
                        }`}
                      >
                        {m.text}
                      </div>
                    </div>
                  );
                })}

                {/* Indicador de pensamiento */}
                {assistantStore.pensando && (
                  <div className="flex items-center gap-2 text-[12px] font-light text-[#97D6DF] pl-10">
                    <span className="h-2 w-2 rounded-full bg-[#97D6DF] animate-ping" />
                    <span>Escribiendo respuesta...</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* ── BARRA DE CHAT INFERIOR: Pill con iconos + Botón Enter en Azul NECTO ── */}
              <form
                onSubmit={handleEnviarMensaje}
                className="shrink-0 p-3 bg-[#181818] border-t border-white/[0.08] flex items-center gap-2.5"
              >
                {/* Input Pill con iconos de archivo y emoji */}
                <div className="flex-1 relative flex items-center rounded-2xl bg-[#262626] border border-white/[0.08] px-4 py-2.5 transition-all focus-within:border-[#97D6DF]/60 focus-within:bg-[#2e2e2e]">
                  <input
                    type="text"
                    value={inputTexto}
                    onChange={(e) => setInputTexto(e.target.value)}
                    placeholder="Escribe un mensaje..."
                    className="flex-1 bg-transparent text-[14px] font-normal text-[#ECECEC] placeholder:text-gray-500 focus:outline-hidden pr-2"
                  />

                  {/* Iconos de archivo y emoji */}
                  <div className="flex items-center gap-2.5 shrink-0 text-gray-400">
                    <button
                      type="button"
                      onClick={() => {}}
                      className="hover:text-[#97D6DF] transition-colors cursor-pointer"
                      title="Adjuntar archivo"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
                        <path d="M12 12v9" />
                        <path d="m16 16-4-4-4 4" />
                      </svg>
                    </button>

                    <button
                      type="button"
                      onClick={() => setInputTexto((prev) => prev + " 😊")}
                      className="hover:text-[#97D6DF] transition-colors cursor-pointer"
                      title="Insertar emoji"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                        <line x1="9" y1="9" x2="9.01" y2="9" />
                        <line x1="15" y1="9" x2="15.01" y2="9" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Botón Enter Azul NECTO */}
                <button
                  type="submit"
                  disabled={!inputTexto.trim() || assistantStore.pensando}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#190088] hover:bg-[#150070] active:scale-95 text-white shadow-md transition-all disabled:opacity-40 cursor-pointer"
                  title="Enviar (Enter)"
                  aria-label="Enviar mensaje"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 10 4 15 9 20" />
                    <path d="M20 4v7a4 4 0 0 1-4 4H4" />
                  </svg>
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* ── BOTÓN FLOTANTE DISPARADOR (Launcher circular en esquina inferior derecha) ── */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#190088] hover:bg-[#150070] text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer border-2 border-white/20 font-['DM_Sans',sans-serif]"
        title="Soporte y Asistencia NECTO"
        aria-label="Abrir soporte y asistencia NECTO"
      >
        {isOpen ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <div className="relative flex items-center justify-center">
            {/* Logo Isotipo de Necto en blanco */}
            <img
              src="/images/logo/necto-icon-white.svg"
              alt="Necto"
              className="h-7 w-7 object-contain"
            />
            {/* Badge Naranja NECTO (#FF3F1A) */}
            <span className="absolute -top-2 -right-2 flex h-5 min-w-[20px] px-1 items-center justify-center rounded-full bg-[#FF3F1A] text-white text-[12px] font-bold shadow-xs">
              3
            </span>
          </div>
        )}
      </button>
    </div>
  );
});
