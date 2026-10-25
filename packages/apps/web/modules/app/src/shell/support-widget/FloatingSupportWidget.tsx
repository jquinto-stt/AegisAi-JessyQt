import React, { useState, useRef, useEffect } from "react";
import { observer } from "mobx-react-lite";
import { assistantStore } from "@/stores";
import { FAQ_ITEMS, type FaqItem } from "@/pages/help/help.constants";

type WidgetTab = "home" | "chat" | "articles" | "search";

export const FloatingSupportWidget: React.FC = observer(() => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<WidgetTab>("home");
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
    await assistantStore.enviar(pregunta);
  };

  // Filtrado de artículos para la pestaña Search y Articles
  const articulosFiltrados = FAQ_ITEMS.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return item.question.toLowerCase().includes(q) || item.answer.toLowerCase().includes(q);
  });

  // 3 Accesos rápidos representativos para la vista Home (como en la referencia)
  const accesosRapidos = FAQ_ITEMS.slice(0, 3);

  return (
    <div className="font-sans antialiased">
      {/* ── Ventana emergente del widget ── */}
      {isOpen && (
        <div
          ref={widgetRef}
          aria-label="Plataforma de soporte y asistencia IA"
          className="fixed bottom-24 right-4 sm:right-6 z-50 flex w-[calc(100vw-2rem)] sm:w-[375px] h-[580px] max-h-[82vh] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl border border-gray-200/80 dark:bg-gray-900 dark:border-gray-800 animate-aparecer transition-all duration-300 ease-out"
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

            {/* Fila superior: Botón Home + Segmented Nav Pill + Botón Minimizar */}
            <div className="relative z-10 flex items-center justify-between gap-2">
              {/* Botón Home circular */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab("home");
                  setArticuloAbierto(null);
                }}
                className={`flex h-8 w-8 items-center justify-center rounded-full transition-all shadow-xs cursor-pointer ${
                  activeTab === "home" && !articuloAbierto
                    ? "bg-white text-[#190088]"
                    : "bg-white/20 text-white hover:bg-white hover:text-[#190088]"
                }`}
                title="Inicio"
                aria-label="Inicio"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </button>

              {/* Segmented Nav Pill [ Chat | Articles | Search ] */}
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
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
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
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === "articles"
                      ? "bg-white/25 text-white shadow-xs"
                      : "text-white/75 hover:text-white"
                  }`}
                >
                  Articles
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("search");
                    setArticuloAbierto(null);
                  }}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === "search"
                      ? "bg-white/25 text-white shadow-xs"
                      : "text-white/75 hover:text-white"
                  }`}
                >
                  Search
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
              <h4 className="mt-2 text-sm font-bold tracking-tight text-white">
                Necto Support Platform
              </h4>

              {/* Indicador de disponibilidad en tiempo real */}
              <div className="mt-0.5 flex items-center gap-1.5 text-[11px] font-medium text-emerald-300">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                <span>Available 24/7</span>
              </div>
            </div>
          </div>

          {/* ── CUERPO PRINCIPAL (Cambia según la pestaña activa) ── */}
          <div className="flex flex-1 min-h-0 flex-col overflow-hidden bg-white dark:bg-gray-900">
            {/* ══════════════════════════════════════════════════════════
                VISTA 1: HOME (Accesos directos + CTA Iniciar conversación)
               ══════════════════════════════════════════════════════════ */}
            {activeTab === "home" && !articuloAbierto && (
              <div className="flex flex-1 min-h-0 flex-col justify-between p-4 sm:p-5 overflow-y-auto custom-scrollbar">
                <div>
                  <h5 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-2.5">
                    Quick Access
                  </h5>

                  {/* Lista de 3 accesos rápidos estilo tarjetas con chevron */}
                  <div className="space-y-2">
                    {accesosRapidos.map((item) => (
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
                    ))}
                  </div>
                </div>

                {/* Zona inferior: Botón Start Conversation + Powered by Necto */}
                <div className="pt-4 mt-auto">
                  <button
                    type="button"
                    onClick={() => setActiveTab("chat")}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#0D2E30] hover:bg-[#092224] text-white text-xs font-bold shadow-md transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <span>Start Conversation</span>
                  </button>

                  <p className="mt-3 text-center text-[11px] text-gray-400 dark:text-gray-500">
                    Powered by <strong className="font-semibold text-gray-600 dark:text-gray-300 underline underline-offset-2">Necto</strong>
                  </p>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════
                DETALLE DE ARTÍCULO ABIERTO DESDE HOME O ARTICLES
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
                  <span>Volver</span>
                </button>

                <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2">
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
                VISTA 2: CHAT CON IA (assistantStore conectado)
               ══════════════════════════════════════════════════════════ */}
            {activeTab === "chat" && !articuloAbierto && (
              <div className="flex flex-1 min-h-0 flex-col">
                {/* Mensajes del chat */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar text-xs">
                  {/* Mensaje de bienvenida inicial */}
                  <div className="flex items-start gap-2.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#190088] text-white shadow-xs">
                      <img src="/images/logo/necto-icon-white.svg" alt="IA" className="h-3.5 w-3.5 object-contain" />
                    </div>
                    <div className="rounded-2xl rounded-tl-sm bg-gray-100 dark:bg-white/10 px-3.5 py-2.5 text-gray-800 dark:text-gray-200 leading-relaxed max-w-[85%]">
                      ¡Hola! Soy tu asistente de soporte NECTO. ¿En qué te puedo ayudar hoy con tus pedidos o tu cuenta?
                    </div>
                  </div>

                  {/* Mensajes del store */}
                  {assistantStore.mensajes.map((m, idx) => {
                    const esUsuario = m.role === "user";
                    return (
                      <div
                        key={idx}
                        className={`flex items-start gap-2.5 ${esUsuario ? "justify-end" : "justify-start"}`}
                      >
                        {!esUsuario && (
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#190088] text-white shadow-xs">
                            <img src="/images/logo/necto-icon-white.svg" alt="IA" className="h-3.5 w-3.5 object-contain" />
                          </div>
                        )}
                        <div
                          className={`rounded-2xl px-3.5 py-2.5 leading-relaxed max-w-[85%] ${
                            esUsuario
                              ? "bg-[#190088] text-white rounded-tr-sm"
                              : "bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-gray-200 rounded-tl-sm"
                          }`}
                        >
                          {m.content}
                        </div>
                      </div>
                    );
                  })}

                  {/* Indicador de pensamiento */}
                  {assistantStore.pensando && (
                    <div className="flex items-center gap-2 text-xs text-gray-400 pl-9">
                      <span className="h-2 w-2 rounded-full bg-[#190088] animate-ping" />
                      <span>Escribiendo respuesta...</span>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Preguntas rápidas sugeridas si hay pocos mensajes */}
                {assistantStore.mensajes.length === 0 && (
                  <div className="px-4 pb-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                      Preguntas sugeridas:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleSeleccionarPreguntaRapida("¿Cómo vinculo mi cuenta bancaria?")}
                        className="rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/15 px-2.5 py-1 text-[11px] font-medium text-gray-700 dark:text-gray-300 transition-colors cursor-pointer"
                      >
                        Vincular cuenta bancaria
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSeleccionarPreguntaRapida("¿Cómo conectar WhatsApp?")}
                        className="rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/15 px-2.5 py-1 text-[11px] font-medium text-gray-700 dark:text-gray-300 transition-colors cursor-pointer"
                      >
                        Conectar WhatsApp
                      </button>
                    </div>
                  </div>
                )}

                {/* Input y botón enviar */}
                <form
                  onSubmit={handleEnviarMensaje}
                  className="shrink-0 border-t border-gray-100 dark:border-gray-800 p-2.5 flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={inputTexto}
                    onChange={(e) => setInputTexto(e.target.value)}
                    placeholder="Escribe tu mensaje aquí..."
                    className="flex-1 h-9 rounded-xl border border-gray-200 bg-gray-50/80 px-3 text-xs text-gray-800 placeholder:text-gray-400 focus:border-[#190088] focus:bg-white focus:outline-hidden dark:border-gray-800 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-gray-500"
                  />
                  <button
                    type="submit"
                    disabled={!inputTexto.trim() || assistantStore.pensando}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#190088] text-white transition-opacity disabled:opacity-40 cursor-pointer"
                    title="Enviar"
                    aria-label="Enviar mensaje"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  </button>
                </form>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════
                VISTA 3: ARTICLES (Documentación y Guías)
               ══════════════════════════════════════════════════════════ */}
            {activeTab === "articles" && !articuloAbierto && (
              <div className="flex flex-1 min-h-0 flex-col p-4 overflow-y-auto custom-scrollbar">
                <h5 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-2.5">
                  Artículos de Ayuda
                </h5>

                <div className="space-y-2">
                  {FAQ_ITEMS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setArticuloAbierto(item)}
                      className="group flex w-full items-center justify-between gap-3 rounded-2xl bg-gray-50 p-3 text-left transition-all hover:bg-gray-100 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] border border-gray-100 dark:border-gray-800 cursor-pointer"
                    >
                      <span className="text-xs font-medium text-gray-800 dark:text-gray-200 line-clamp-2">
                        {item.question}
                      </span>
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="shrink-0 text-gray-400 group-hover:text-gray-700 dark:group-hover:text-white"
                      >
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════
                VISTA 4: SEARCH (Buscador dinámico en la base de conocimiento)
               ══════════════════════════════════════════════════════════ */}
            {activeTab === "search" && !articuloAbierto && (
              <div className="flex flex-1 min-h-0 flex-col p-4 overflow-hidden">
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
                    className="h-9 w-full rounded-xl border border-gray-200 bg-gray-50/80 pl-9 pr-3 text-xs text-gray-800 placeholder:text-gray-400 focus:border-[#190088] focus:bg-white focus:outline-hidden dark:border-gray-800 dark:bg-white/[0.04] dark:text-white"
                    autoFocus
                  />
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-1">
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
                        className="group flex w-full items-center justify-between gap-3 rounded-2xl bg-gray-50 p-3 text-left transition-all hover:bg-gray-100 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] border border-gray-100 dark:border-gray-800 cursor-pointer"
                      >
                        <span className="text-xs font-medium text-gray-800 dark:text-gray-200 line-clamp-2">
                          {item.question}
                        </span>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-gray-400 group-hover:text-gray-700 dark:group-hover:text-white">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── BOTÓN FLOTANTE DISPARADOR (Launcher circular en esquina inferior derecha) ── */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#0D2E30] hover:bg-[#071E20] text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer border-2 border-white/20"
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
            {/* Logo de Necto o icono de chat bot */}
            <img
              src="/images/logo/necto-icon-white.svg"
              alt="Necto"
              className="h-7 w-7 object-contain"
            />
            {/* Punto verde de disponible 24/7 */}
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500 border-2 border-[#0D2E30]" />
            </span>
          </div>
        )}
      </button>
    </div>
  );
});
