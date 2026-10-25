import React, { useState, useRef, useEffect } from "react";
import { observer } from "mobx-react-lite";
import { assistantStore } from "@/stores";
import { FAQ_ITEMS, type FaqItem } from "@/pages/help/help.constants";

type WidgetTab = "home" | "chat";

const CATEGORIES = ["Todos", "Envíos", "Planes", "WhatsApp", "Bancos", "Cuenta"];

export const FloatingSupportWidget: React.FC = observer(() => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<WidgetTab>("home");
  const [inputTexto, setInputTexto] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");
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

  // Filtrado de preguntas frecuentes por categoría y búsqueda
  const articulosFiltrados = FAQ_ITEMS.filter((item) => {
    if (selectedCategory !== "Todos") {
      const text = (item.question + " " + item.answer).toLowerCase();
      if (selectedCategory === "WhatsApp" && !text.includes("whatsapp") && !text.includes("canal")) return false;
      if (selectedCategory === "Planes" && !text.includes("plan") && !text.includes("módulo") && !text.includes("modulos") && !text.includes("perfil")) return false;
      if (selectedCategory === "Bancos" && !text.includes("banc") && !text.includes("moneda") && !text.includes("pago") && !text.includes("retiro")) return false;
      if (selectedCategory === "Cuenta" && !text.includes("cuenta") && !text.includes("usuario") && !text.includes("organización") && !text.includes("contraseña")) return false;
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
          className="fixed bottom-24 right-4 sm:right-6 z-50 flex w-[calc(100vw-2rem)] sm:w-[390px] h-[610px] max-h-[84vh] flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl border border-[#ECECEC] dark:bg-[#212121] dark:border-white/10 font-['DM_Sans',sans-serif] animate-aparecer transition-all duration-300 ease-out"
        >
          {/* ══════════════════════════════════════════════════════════
              VISTA PRINCIPAL: HOME (Layout Hero + Canales + FAQs)
             ══════════════════════════════════════════════════════════ */}
          {activeTab === "home" && !articuloAbierto && (
            <div className="flex flex-1 min-h-0 flex-col overflow-hidden bg-white dark:bg-[#212121]">
              {/* ── Hero Superior: Azul Profundo NECTO #190088 con curva inferior ── */}
              <div className="relative shrink-0 bg-[#190088] px-5 pt-4 pb-5 text-white rounded-b-[28px] shadow-sm overflow-hidden">
                {/* Micro-patrón punteado de fondo */}
                <div
                  className="pointer-events-none absolute inset-0 opacity-15"
                  style={{
                    backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)",
                    backgroundSize: "16px 16px",
                  }}
                />

                {/* Fila superior: Logo NECTO en blanco + Botón Cerrar */}
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img
                      src="/images/logo/necto-full-pure-white.svg"
                      alt="NECTO"
                      className="h-4.5 w-auto object-contain"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-white/80 hover:bg-white/15 hover:text-white transition-colors cursor-pointer"
                    title="Cerrar soporte"
                    aria-label="Cerrar soporte"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>

                {/* Saludo / Greeting */}
                <div className="relative z-10 mt-3.5">
                  <h3 className="text-[24px] font-bold text-white tracking-tight leading-tight">
                    ¡Hola!
                  </h3>
                  <p className="mt-0.5 text-[14px] font-normal text-[#97D6DF]">
                    ¿Cómo podemos ayudarte hoy?
                  </p>
                </div>

                {/* Botón CTA Destacado: INICIAR CONVERSACIÓN en Naranja #FF3F1A */}
                <div className="relative z-10 mt-3.5">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("chat");
                      setArticuloAbierto(null);
                    }}
                    className="group flex w-full items-center justify-between rounded-2xl bg-[#FF3F1A] hover:bg-[#e03512] px-4 py-3 text-white shadow-lg transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <span className="text-[14px] font-bold tracking-wider uppercase">
                      INICIAR CONVERSACIÓN
                    </span>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 group-hover:bg-white group-hover:text-[#FF3F1A] transition-all text-white">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </div>
                  </button>
                </div>
              </div>

              {/* ── CUERPO SCROLLEABLE: Canales preferidos + Respuestas rápidas ── */}
              <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar flex flex-col">
                {/* 1. Sección: Canales Preferidos */}
                <div className="px-5 pt-4">
                  <h4 className="text-[14px] font-bold text-[#190088] dark:text-[#97D6DF] tracking-tight mb-2.5">
                    Hablemos por tus canales preferidos
                  </h4>
                  <div className="grid grid-cols-3 gap-2.5">
                    {/* Canal WhatsApp */}
                    <a
                      href="https://wa.me/573000000000?text=Hola,%20necesito%20soporte%20en%20Necto"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex flex-col items-center justify-center rounded-2xl border border-[#ECECEC] dark:border-white/10 bg-gray-50/70 hover:bg-emerald-50/50 hover:border-emerald-300 dark:bg-white/[0.03] dark:hover:bg-emerald-950/20 p-2.5 text-center transition-all active:scale-[0.97] cursor-pointer shadow-2xs"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#25D366]/15 text-[#25D366] group-hover:scale-110 transition-transform">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2m.01 1.67c4.54 0 8.24 3.7 8.24 8.24 0 2.2-.86 4.28-2.42 5.84a8.18 8.18 0 0 1-5.82 2.41c-1.42 0-2.82-.37-4.06-1.07l-.29-.16-3.11.82.83-3.03-.19-.3a8.21 8.21 0 0 1-1.26-4.51c0-4.54 3.7-8.24 8.24-8.24m4.53 11.64c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.02-1.25-.75-.67-1.26-1.5-1.4-1.75-.15-.25-.02-.39.11-.51.11-.11.25-.29.37-.44.13-.15.17-.25.25-.42.08-.17.04-.32-.02-.45-.06-.13-.56-1.35-.77-1.85-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1s.9 2.44 1.03 2.61c.13.17 1.77 2.7 4.29 3.79.6.26 1.07.41 1.44.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.15-1.18-.06-.1-.23-.16-.48-.29" />
                        </svg>
                      </div>
                      <span className="mt-1.5 text-[12px] font-bold text-[#212121] dark:text-white">WhatsApp</span>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400">Directo</span>
                    </a>

                    {/* Canal Chat IA */}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab("chat");
                        setArticuloAbierto(null);
                      }}
                      className="group flex flex-col items-center justify-center rounded-2xl border border-[#ECECEC] dark:border-white/10 bg-gray-50/70 hover:bg-[#190088]/5 hover:border-[#190088]/40 dark:bg-white/[0.03] dark:hover:bg-[#190088]/20 p-2.5 text-center transition-all active:scale-[0.97] cursor-pointer shadow-2xs"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#190088]/15 text-[#190088] dark:bg-[#97D6DF]/20 dark:text-[#97D6DF] group-hover:scale-110 transition-transform">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 8V4H8" />
                          <rect width="16" height="12" x="4" y="8" rx="2" />
                          <path d="M2 14h2" />
                          <path d="M20 14h2" />
                          <path d="M15 13v2" />
                          <path d="M9 13v2" />
                        </svg>
                      </div>
                      <span className="mt-1.5 text-[12px] font-bold text-[#212121] dark:text-white">Chat IA</span>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400">24/7 en vivo</span>
                    </button>

                    {/* Canal Correo */}
                    <a
                      href="mailto:soporte@necto.co"
                      className="group flex flex-col items-center justify-center rounded-2xl border border-[#ECECEC] dark:border-white/10 bg-gray-50/70 hover:bg-orange-50/50 hover:border-[#FF3F1A]/40 dark:bg-white/[0.03] dark:hover:bg-orange-950/20 p-2.5 text-center transition-all active:scale-[0.97] cursor-pointer shadow-2xs"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FF3F1A]/15 text-[#FF3F1A] group-hover:scale-110 transition-transform">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <rect width="20" height="16" x="2" y="4" rx="2" />
                          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                        </svg>
                      </div>
                      <span className="mt-1.5 text-[12px] font-bold text-[#212121] dark:text-white">Correo</span>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400">soporte@necto</span>
                    </a>
                  </div>
                </div>

                {/* 2. Sección: Encuentra Respuestas Rápidas */}
                <div className="px-5 pt-4 pb-4 flex flex-1 flex-col">
                  <h4 className="text-[14px] font-bold text-[#190088] dark:text-[#97D6DF] tracking-tight mb-2.5">
                    Encuentra respuestas rápidas
                  </h4>

                  {/* Buscador en centro de ayuda */}
                  <div className="relative shrink-0 mb-2.5">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar en el centro de ayuda..."
                      className="h-10 w-full rounded-2xl border border-[#ECECEC] bg-gray-50/90 pl-10 pr-9 text-[12px] text-[#212121] placeholder:text-gray-400 focus:border-[#190088] focus:bg-white focus:outline-hidden dark:border-white/10 dark:bg-white/[0.04] dark:text-[#ECECEC] dark:placeholder:text-gray-500 transition-colors"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                        title="Limpiar búsqueda"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Pills de categorías */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none shrink-0">
                    {CATEGORIES.map((cat) => {
                      const isActive = selectedCategory === cat;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setSelectedCategory(cat)}
                          className={`shrink-0 rounded-full px-3 py-1 text-[12px] font-medium transition-all cursor-pointer ${
                            isActive
                              ? "bg-[#190088] text-white shadow-xs"
                              : "bg-[#ECECEC] text-[#212121] hover:bg-gray-200 dark:bg-white/10 dark:text-[#ECECEC] dark:hover:bg-white/15"
                          }`}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>

                  {/* Lista de preguntas frecuentes filtradas */}
                  <div className="space-y-2 mt-1">
                    {articulosFiltrados.length === 0 ? (
                      <div className="py-6 text-center text-[12px] text-gray-400">
                        No se encontraron respuestas para esta búsqueda.
                      </div>
                    ) : (
                      articulosFiltrados.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setArticuloAbierto(item)}
                          className="group flex w-full items-center justify-between gap-3 rounded-2xl bg-gray-50/80 hover:bg-gray-100/90 dark:bg-white/[0.04] dark:hover:bg-white/[0.07] border border-[#ECECEC] dark:border-white/10 p-3 text-left transition-all active:scale-[0.99] cursor-pointer shadow-2xs"
                        >
                          <span className="text-[12px] font-normal text-[#212121] dark:text-[#ECECEC] line-clamp-2 leading-relaxed">
                            {item.question}
                          </span>
                          <svg
                            width="15"
                            height="15"
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
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              DETALLE DE ARTÍCULO / FAQ ABIERTO
             ══════════════════════════════════════════════════════════ */}
          {articuloAbierto && (
            <div className="flex flex-1 min-h-0 flex-col p-5 overflow-y-auto custom-scrollbar bg-white dark:bg-[#212121]">
              <button
                type="button"
                onClick={() => setArticuloAbierto(null)}
                className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#FF3F1A] hover:underline mb-3 cursor-pointer self-start"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                <span>Volver al inicio</span>
              </button>

              <h4 className="text-[16px] font-bold text-[#190088] dark:text-white mb-2 leading-snug">
                {articuloAbierto.question}
              </h4>

              <div className="rounded-2xl bg-gray-50 p-4 text-[14px] text-[#212121] leading-relaxed dark:bg-white/[0.04] dark:text-[#ECECEC] border border-[#ECECEC] dark:border-white/10">
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
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#190088] hover:bg-[#150070] text-white text-[14px] font-bold shadow-md transition-all active:scale-[0.98] cursor-pointer"
                >
                  <span>Preguntar sobre esto a la IA</span>
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
              <div className="relative shrink-0 bg-[#190088] px-4 py-3 text-white flex items-center justify-between shadow-xs">
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
                    <span className="text-[14px] font-bold text-white">Soporte IA</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-[#97D6DF]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#97D6DF] animate-pulse" />
                    <span>En línea 24/7</span>
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
