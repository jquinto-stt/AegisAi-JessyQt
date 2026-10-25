import React, { useState, useRef, useEffect } from "react";
import { observer } from "mobx-react-lite";
import { assistantStore } from "@/stores";
import { FAQ_ITEMS, type FaqItem } from "@/pages/help/help.constants";

type WidgetTab = "chat" | "articles";

export const FloatingSupportWidget: React.FC = observer(() => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<WidgetTab>("articles");
  const [inputTexto, setInputTexto] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
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

  // Filtrado de artículos fusionado con búsqueda
  const articulosFiltrados = FAQ_ITEMS.filter((item) => {
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
          aria-label="Plataforma de soporte y asistencia IA"
          className="fixed bottom-24 right-4 sm:right-6 z-50 flex w-[calc(100vw-2rem)] sm:w-[380px] h-[590px] max-h-[82vh] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl border border-[#ECECEC] dark:bg-[#212121] dark:border-white/10 font-['DM_Sans',sans-serif] animate-aparecer transition-all duration-300 ease-out"
        >
          {/* ── Cabecera Temática NECTO (Azul profundo #190088 con micro-patrón) ── */}
          <div className="relative shrink-0 bg-[#190088] px-4 pt-4 pb-5 text-white overflow-hidden">
            {/* Micro-patrón de puntos decorativo de fondo */}
            <div
              className="pointer-events-none absolute inset-0 opacity-15"
              style={{
                backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)",
                backgroundSize: "16px 16px",
              }}
            />

            {/* Fila superior: Segmented Nav Pill [ Chat | Artículos ] + Botón Minimizar */}
            <div className="relative z-10 flex items-center justify-between gap-2">
              {/* Segmented Nav Pill [ Chat | Artículos ] */}
              <nav
                aria-label="Pestañas de soporte"
                className="flex items-center rounded-full bg-black/25 p-0.5 backdrop-blur-md"
              >
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("chat");
                    setArticuloAbierto(null);
                  }}
                  className={`rounded-full px-4 py-1 text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === "chat"
                      ? "bg-white/25 text-white shadow-xs"
                      : "text-white/75 hover:text-white"
                  }`}
                >
                  Chat
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("articles");
                    setArticuloAbierto(null);
                  }}
                  className={`rounded-full px-4 py-1 text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === "articles"
                      ? "bg-white/25 text-white shadow-xs"
                      : "text-white/75 hover:text-white"
                  }`}
                >
                  Artículos
                </button>
              </nav>

              {/* Botón Minimizar / Cerrar */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-white/80 hover:bg-white/15 hover:text-white transition-colors cursor-pointer"
                title="Minimizar"
                aria-label="Minimizar soporte"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            </div>

            {/* Hero Central: Stack de Avatares del equipo/IA + Título + Estado 24/7 */}
            <div className="relative z-10 mt-3.5 flex flex-col items-center text-center">
              {/* Stack de 3 avatares + Logo Necto circular */}
              <div className="flex items-center -space-x-2">
                <img
                  src="/images/user/user-01.jpg"
                  alt="Agente"
                  className="h-8 w-8 rounded-full border-2 border-[#190088] object-cover shadow-xs"
                />
                <img
                  src="/images/user/user-02.jpg"
                  alt="Agente"
                  className="h-8 w-8 rounded-full border-2 border-[#190088] object-cover shadow-xs"
                />
                <img
                  src="/images/user/user-03.jpg"
                  alt="Agente"
                  className="h-8 w-8 rounded-full border-2 border-[#190088] object-cover shadow-xs"
                />
                <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#190088] bg-white shadow-xs">
                  <img
                    src="/images/logo/necto-icon.svg"
                    alt="NECTO"
                    className="h-4 w-4 object-contain"
                  />
                </div>
              </div>

              {/* Título de la plataforma de soporte */}
              <h4 className="mt-2 text-[16px] font-bold tracking-tight text-white">
                Necto Support Platform
              </h4>

              {/* Indicador de disponibilidad en tiempo real */}
              <div className="mt-0.5 flex items-center gap-1.5 text-[12px] font-normal text-[#97D6DF]">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#97D6DF] opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#97D6DF]" />
                </span>
                <span>Available 24/7</span>
              </div>
            </div>
          </div>

          {/* ── CUERPO PRINCIPAL (2 Pestañas: Artículos fusionada con Búsqueda, y Chat) ── */}
          <div className="flex flex-1 min-h-0 flex-col overflow-hidden bg-white dark:bg-[#212121]">
            {/* ══════════════════════════════════════════════════════════
                PESTAÑA: ARTÍCULOS (Artículos + Búsqueda fusionados)
               ══════════════════════════════════════════════════════════ */}
            {activeTab === "articles" && !articuloAbierto && (
              <div className="flex flex-1 min-h-0 flex-col p-4 sm:p-5 overflow-hidden">
                {/* Buscador de artículos integrado */}
                <div className="relative mb-3 shrink-0">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar guías o preguntas..."
                    className="h-9 w-full rounded-xl border border-gray-200 bg-gray-50/90 pl-9 pr-8 text-xs text-gray-800 placeholder:text-gray-400 focus:border-[#190088] focus:bg-white focus:outline-hidden dark:border-gray-800 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-gray-500"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                      title="Limpiar búsqueda"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Lista de artículos / Guías */}
                <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-1">
                  <h5 className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    {searchQuery ? "Resultados de búsqueda" : "Guías y preguntas frecuentes"}
                  </h5>

                  {articulosFiltrados.length === 0 ? (
                    <div className="py-8 text-center text-xs text-gray-400">
                      No encontramos artículos para "{searchQuery}".
                    </div>
                  ) : (
                    articulosFiltrados.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setArticuloAbierto(item)}
                        className="group flex w-full items-center justify-between gap-3 rounded-2xl bg-gray-50/90 p-3.5 text-left transition-all hover:bg-gray-100/90 hover:shadow-xs active:scale-[0.99] dark:bg-white/[0.04] dark:hover:bg-white/[0.07] border border-gray-100 dark:border-gray-800/80 cursor-pointer"
                      >
                        <span className="text-xs font-medium text-gray-800 dark:text-gray-200 line-clamp-2 leading-relaxed">
                          {item.question}
                        </span>
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="shrink-0 text-gray-400 transition-transform group-hover:translate-x-0.5 group-hover:text-gray-700 dark:group-hover:text-white"
                        >
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </button>
                    ))
                  )}
                </div>

                {/* Zona inferior: Botón Start Conversation + Powered by Necto */}
                <div className="pt-3 mt-auto shrink-0 border-t border-gray-100 dark:border-gray-800">
                  <button
                    type="button"
                    onClick={() => setActiveTab("chat")}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#0D2E30] hover:bg-[#092224] text-white text-xs font-bold shadow-md transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <span>Start Conversation</span>
                  </button>

                  <p className="mt-2.5 text-center text-[11px] text-gray-400 dark:text-gray-500">
                    Powered by <strong className="font-semibold text-gray-600 dark:text-gray-300 underline underline-offset-2">Necto</strong>
                  </p>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════
                DETALLE DE ARTÍCULO ABIERTO
               ══════════════════════════════════════════════════════════ */}
            {articuloAbierto && (
              <div className="flex flex-1 min-h-0 flex-col p-4 sm:p-5 overflow-y-auto custom-scrollbar">
                <button
                  type="button"
                  onClick={() => setArticuloAbierto(null)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#FF3F1A] hover:underline mb-3 cursor-pointer self-start"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                  <span>Volver a artículos</span>
                </button>

                <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2 leading-snug">
                  {articuloAbierto.question}
                </h4>

                <div className="rounded-2xl bg-gray-50 p-3.5 text-xs text-gray-700 leading-relaxed dark:bg-white/[0.04] dark:text-gray-300 border border-gray-100 dark:border-gray-800">
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
                    className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#190088] text-white text-xs font-bold shadow-theme-xs transition-colors hover:bg-[#150070] cursor-pointer"
                  >
                    <span>Preguntar sobre esto a la IA</span>
                  </button>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════
                PESTAÑA: CHAT CON IA (assistantStore conectado)
               ══════════════════════════════════════════════════════════ */}
            {activeTab === "chat" && !articuloAbierto && (
              <div className="flex flex-1 min-h-0 flex-col bg-[#212121] text-[#ECECEC]">
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

                  {/* Preguntas sugeridas estilo imagen 2 si no hay mensajes */}
                  {assistantStore.mensajes.length === 0 && (
                    <div className="space-y-2.5 pt-1">
                      <div className="rounded-2xl rounded-tl-sm bg-[#2b2b2b] border border-white/[0.08] px-4 py-2.5 text-[#ECECEC] font-normal leading-relaxed max-w-[88%] ml-10">
                        ¿Puedo ayudarte con alguno de estos temas?
                      </div>

                      {/* Stack de opciones con flecha ↳ estilo referencia imagen 2 */}
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
                            {/* Flecha curva hacia abajo y derecha ↳ */}
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-[#97D6DF] transition-transform group-hover:translate-x-0.5">
                              <path d="M4 4v9a4 4 0 0 0 4 4h12" />
                              <polyline points="15 12 20 17 15 22" />
                            </svg>
                            <span className="text-[14px] font-normal text-[#97D6DF] group-hover:text-white leading-snug">
                              {op.label}
                            </span>
                          </button>
                        ))}

                        {/* Indicador de 3 puntos • • • */}
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

                {/* ── BARRA DE CHAT INFERIOR (Estilo Imagen 1: Pill con iconos + Botón Enter separado) ── */}
                <form
                  onSubmit={handleEnviarMensaje}
                  className="shrink-0 p-3 bg-[#181818] border-t border-white/[0.08] flex items-center gap-2.5"
                >
                  {/* Input Pill con iconos de archivo y emoji a la derecha */}
                  <div className="flex-1 relative flex items-center rounded-2xl bg-[#262626] border border-white/[0.08] px-4 py-2.5 transition-all focus-within:border-[#97D6DF]/60 focus-within:bg-[#2e2e2e]">
                    <input
                      type="text"
                      value={inputTexto}
                      onChange={(e) => setInputTexto(e.target.value)}
                      placeholder="Escribe un mensaje..."
                      className="flex-1 bg-transparent text-[14px] font-normal text-[#ECECEC] placeholder:text-gray-500 focus:outline-hidden pr-2"
                    />

                    {/* Iconos de archivo y emoji dentro del pill */}
                    <div className="flex items-center gap-2.5 shrink-0 text-gray-400">
                      <button
                        type="button"
                        onClick={() => {
                          // Feedback sutil para archivo
                        }}
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

                  {/* Botón Enter Azul NECTO con squircle redondeado */}
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
        </div>
      )}

      {/* ── BOTÓN FLOTANTE DISPARADOR (Launcher circular en esquina inferior derecha) ── */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#190088] hover:bg-[#150070] text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer border-2 border-white/20 font-['DM_Sans',sans-serif]"
        title="Soporte y Asistencia IA"
        aria-label="Abrir soporte y asistencia IA"
      >
        {isOpen ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <div className="relative flex items-center justify-center">
            {/* Logo de Necto */}
            <img
              src="/images/logo/necto-icon-white.svg"
              alt="Necto"
              className="h-7 w-7 object-contain"
            />
            {/* Badge Naranja NECTO (#FF3F1A) como en referencia de la imagen */}
            <span className="absolute -top-2 -right-2 flex h-5 min-w-[20px] px-1 items-center justify-center rounded-full bg-[#FF3F1A] text-white text-[12px] font-bold shadow-xs">
              3
            </span>
          </div>
        )}
      </button>
    </div>
  );
});
