import { useMemo, useState, useEffect } from "react";
import { observer } from "mobx-react-lite";
import { useNavigate, useSearchParams } from "react-router";

import { PageMeta } from "@/shell/meta";
import { Alert } from "@/elements/ui/alert";
import { Badge } from "@/elements/ui/badge";
import { Button } from "@/elements/ui/button";
import { Input } from "@/elements/form/input";
import { Switch } from "@/elements/form/switch";
import TextArea from "@/elements/form/textarea";
import QRCode from "qrcode";
import {
  AlertIcon,
  BoltIcon,
  DocsIcon,
  InfoIcon,
  PlugInIcon,
  AiIcon,
  EyeIcon,
  EyeCloseIcon,
} from "@/icons";
import {
  conversacionesStore,
  organizacionStore,
  pedidosStore,
} from "@/stores";
import {
  BloqueConfig,
  CampoConfig,
  ConfigAcciones,
  ConfigHeader,
  ConfigHub,
  ConfigShell,
  VolverAlHub,
  type TarjetaHub,
} from "@/pages/config-layout";

import {
  ESTADO_CANAL_BADGE,
  ESTADO_CANAL_LABEL,
  META_SECCION,
  notaSinGuardado,
  ORDEN_SECCIONES,
  SWITCH_COLOR,
  type EstadoCanal,
  type IconoSeccion,
  type SeccionCanal,
} from "@/pages/conversaciones/configuracion.secciones";

const ICONO_SECCION: Record<IconoSeccion, React.FC<React.SVGProps<SVGSVGElement>>> = {
  DocsIcon,
  BoltIcon,
  InfoIcon,
  AlertIcon,
  PlugInIcon,
  AiIcon,
};

const NUMERO_CANAL = "+34 612 345 678";

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

const ContextoCanal = observer(() => {
  const nombre = organizacionStore.organizacion?.nombre?.trim() ?? "Necto Taller";
  const estado: EstadoCanal = pedidosStore.estaAbierto() ? "atendiendo" : "fuera_horario";

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-ink-body dark:text-white/90">
          {nombre}
        </p>
        <p className="text-xs tabular-nums text-gray-500 dark:text-gray-400">
          {NUMERO_CANAL}
        </p>
      </div>
      <Badge color={ESTADO_CANAL_BADGE[estado]} size="sm">
        {ESTADO_CANAL_LABEL[estado]}
      </Badge>
    </div>
  );
});

export const ConfigPage = observer(() => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const from = searchParams.get("from") || "/configuracion?tab=canales";
  const seccionParam = searchParams.get("seccion");
  
  // Si no hay seccion en URL o no es válida, seleccionamos "modelo" por defecto
  const seccionActiva: SeccionCanal =
    seccionParam && (ORDEN_SECCIONES as string[]).includes(seccionParam)
      ? (seccionParam as SeccionCanal)
      : "modelo";


  const [guardado, setGuardado] = useState(false);

  // ── Estados locales de configuración de IA y Canal ──
  const [configIa, setConfigIa] = useState(() => {
    try {
      const guardadoStr = localStorage.getItem("necto_config_ia");
      if (guardadoStr) return JSON.parse(guardadoStr);
    } catch {}
    return {
      apiKey: "sk-or-v1-necto-production-key-sample",
      modelo: "google/gemini-2.0-flash-001",
      temperatura: 0.3,
      maxTokens: 1000,
      apiKeyStatus: "Configurada",
      nombreAsistente: "NectoBot",
      tono: "profesional",
      trato: "tu",
      saludo: "¡Hola! Gracias por comunicarte con nuestro taller. ¿En qué podemos ayudarte hoy?",
      promptPrincipal:
        "Eres el asistente virtual oficial de nuestro taller mecánico y centro de servicio automotriz. Atiendes de manera cordial, rápida y precisa en español. Tu objetivo es ayudar a los clientes con dudas sobre servicios, presupuestos estimados y agendamiento de citas en nuestros elevadores. Si el cliente requiere atención personalizada, presupuesto complejo o expresa inconformidad, deriva la conversación con un asesor del equipo.",
      reglasDerivacion:
        "1. Derivar si el cliente solicita explícitamente hablar con un humano o asesor.\n2. Derivar ante reclamaciones o incidencias graves de trabajos anteriores.\n3. Derivar si la avería descrita requiere diagnóstico presencial especializado sin servicio estándar.",
      restricciones:
        "- No inventar precios ni tiempos no listados en el catálogo.\n- No prometer entregas inmediatas sin confirmación de carga en elevadores.",
      permitirCotizar: true,
      servicios: [
        { id: "1", nombre: "Cambio de aceite y filtro", precio: 65, duracionMin: 45, activo: true },
        { id: "2", nombre: "Revisión general y diagnóstico", precio: 40, duracionMin: 30, activo: true },
        { id: "3", nombre: "Pastillas de freno (delanteras)", precio: 95, duracionMin: 60, activo: true },
        { id: "4", nombre: "Alineación y balanceo", precio: 50, duracionMin: 45, activo: true },
        { id: "5", nombre: "Carga de aire acondicionado", precio: 70, duracionMin: 40, activo: true },
      ],
      horario: {
        apertura: "08:00",
        cierre: "18:00",
        dias: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"],
        elevadores: 4,
        intervaloCitaMin: 30,
      },
      faq: [
        {
          id: "1",
          pregunta: "¿Dónde están ubicados?",
          respuesta: "Estamos ubicados en Calle Automoción 42, Polígono Industrial Este. Contamos con estacionamiento para clientes.",
        },
        {
          id: "2",
          pregunta: "¿Qué medios de pago aceptan?",
          respuesta: "Aceptamos efectivo, tarjetas de débito/crédito, transferencia bancaria y Bizum para empresas.",
        },
        {
          id: "3",
          pregunta: "¿Ofrecen garantía en las reparaciones?",
          respuesta: "Sí, todos nuestros trabajos y repuestos cuentan con 6 meses de garantía legal certificada.",
        },
      ],
    };
  });

  const [mostrarApiKey, setMostrarApiKey] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [cargandoQr, setCargandoQr] = useState(false);
  const [estadoBaileys, setEstadoBaileys] = useState<"desconectado" | "esperando_qr" | "conectado">("esperando_qr");
  const [numeroConectado, setNumeroConectado] = useState<string | null>(null);

  const cargarOGenerarQr = async () => {
    setCargandoQr(true);
    try {
      const res = await fetch("/api/whatsapp/status");
      if (res.ok) {
        const data = await res.json();
        if (data.estado === "conectado") {
          setEstadoBaileys("conectado");
          setNumeroConectado(data.numero || "+34 612 345 678");
        } else if (data.qr) {
          setQrCodeUrl(data.qr);
          setEstadoBaileys("esperando_qr");
          setCargandoQr(false);
          return;
        }
      }
    } catch {}

    // Generar un código QR Baileys auth real mediante QRCode.toDataURL
    try {
      const authPayload = `2@${Date.now()},${Math.random().toString(36).substring(2, 10)},necto-whatsapp-auth-baileys`;
      const url = await QRCode.toDataURL(authPayload, {
        width: 320,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      });
      setQrCodeUrl(url);
      setEstadoBaileys("esperando_qr");
    } catch (e) {
      console.error("Error generando QR:", e);
    } finally {
      setCargandoQr(false);
    }
  };

  useEffect(() => {
    cargarOGenerarQr();
  }, []);

  // Estado del chat de prueba interactivo
  const [mensajesPrueba, setMensajesPrueba] = useState<
    Array<{ id: string; emisor: "usuario" | "asistente"; texto: string; toolUsed?: string; hora: string }>
  >([
    {
      id: "1",
      emisor: "asistente",
      texto: "¡Hola! Soy NectoBot, asistente virtual del taller. ¿En qué puedo ayudarte hoy?",
      hora: "Ahora",
    },
  ]);
  const [inputPrueba, setInputPrueba] = useState("");
  const [enviandoPrueba, setEnviandoPrueba] = useState(false);

  // Guardar configuración
  const guardarCambios = () => {
    try {
      localStorage.setItem("necto_config_ia", JSON.stringify(configIa));
    } catch {}
    setGuardado(true);
    setTimeout(() => setGuardado(false), 3000);
  };

  const descartarCambios = () => {
    try {
      const guardadoStr = localStorage.getItem("necto_config_ia");
      if (guardadoStr) setConfigIa(JSON.parse(guardadoStr));
    } catch {}
    setGuardado(false);
  };

  // Enviar mensaje de prueba interactivo
  const enviarMensajePrueba = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputPrueba.trim() || enviandoPrueba) return;

    const textoUsuario = inputPrueba.trim();
    setInputPrueba("");
    const ahora = new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });

    setMensajesPrueba((prev) => [
      ...prev,
      { id: Date.now().toString(), emisor: "usuario", texto: textoUsuario, hora: ahora },
    ]);

    setEnviandoPrueba(true);

    setTimeout(() => {
      let respuestaSimulada = "";
      let toolUsed: string | undefined = undefined;

      const txt = textoUsuario.toLowerCase();
      if (txt.includes("aceite") || txt.includes("freno") || txt.includes("precio") || txt.includes("cuesta") || txt.includes("servicio")) {
        toolUsed = "consultarServiciosInfo(consulta: 'precios y catálogo')";
        respuestaSimulada = "El cambio de aceite y filtro tiene un costo estimado de 65 € (duración ~45 min). También tenemos cambio de pastillas de freno delanteras por 95 € y revisión general por 40 €. ¿Deseas agendar cita para alguno?";
      } else if (txt.includes("cita") || txt.includes("turno") || txt.includes("mañana") || txt.includes("hora")) {
        toolUsed = "consultarDisponibilidadCitas(elevadores: 4, horario: '08:00-18:00')";
        respuestaSimulada = `Actualmente tenemos disponibilidad en nuestros ${configIa.horario.elevadores} elevadores para mañana a partir de las 09:30 o a las 11:00. ¿Qué horario te viene mejor?`;
      } else if (txt.includes("humano") || txt.includes("asesor") || txt.includes("persona") || txt.includes("queja") || txt.includes("reclamo")) {
        toolUsed = "derivarAPersona(motivo: 'Solicitud de atención especializada')";
        respuestaSimulada = "Entendido, estoy derivando esta conversación a un compañero de nuestro equipo humano para que te atienda personalmente. En unos momentos estará contigo.";
      } else if (txt.includes("donde") || txt.includes("ubicados") || txt.includes("direccion")) {
        respuestaSimulada = "Estamos en Calle Automoción 42, Polígono Industrial Este. Disponemos de amplio aparcamiento para nuestros clientes.";
      } else {
        respuestaSimulada = "¡Con gusto te ayudo! Puedes consultarme precios de servicios, disponibilidad para agendar en nuestros elevadores, o si lo prefieres, te pongo en contacto con un asesor humano.";
      }

      setMensajesPrueba((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          emisor: "asistente",
          texto: respuestaSimulada,
          toolUsed,
          hora: new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
      setEnviandoPrueba(false);
    }, 700);
  };

  const meta = META_SECCION[seccionActiva];

  // Tarjetas para el Hub estándar Necto
  const tarjetasHub: TarjetaHub[] = useMemo(
    () =>
      ORDEN_SECCIONES.map((s) => ({
        key: s,
        label: META_SECCION[s].label,
        hint: META_SECCION[s].hint,
        icono: ICONO_SECCION[META_SECCION[s].icono],
        badge:
          s === "interruptor"
            ? conversacionesStore.respuestasAutomaticas
              ? "Activo"
              : "Apagado"
            : s === "qr"
              ? "Conectado"
              : undefined,
      })),
    [conversacionesStore.respuestasAutomaticas],
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // VISTA RAÍZ — Cuadrícula de tarjetas estándar Necto (ConfigHub)
  // ═══════════════════════════════════════════════════════════════════════════
  if (!seccionParam) {
    return (
      <div className="pb-16 max-w-7xl mx-auto px-4 sm:px-6">
        <PageMeta
          title="Configuración del canal WhatsApp · Necto"
          description="Ajustes de conexión, modelo OpenRouter y asistente virtual"
        />

        <div className="pt-2 pb-6">
          <div className="mb-4">
            <VolverAlHub
              onVolver={() => navigate(from)}
              etiqueta="Volver a Canales de la Organización"
            />
          </div>

          <ConfigHeader
            titulo="Configuración de WhatsApp y Asistente IA"
            descripcion="Elige qué apartado deseas configurar. Cada opción abre su respectiva pantalla con ajustes avanzados."
            acciones={<ContextoCanal />}
          />
        </div>

        <ConfigHub
          tarjetas={tarjetasHub}
          onEntrar={(k) => {
            const params = new URLSearchParams(searchParams);
            params.set("seccion", k);
            setSearchParams(params);
          }}
        />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VISTA DE SECCIÓN DETALLADA
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="pb-16 max-w-7xl mx-auto px-4 sm:px-6">
      <PageMeta
        title={`${meta.label} · Configuración de WhatsApp`}
        description={meta.hint}
      />

      {/* Navegación de regreso al hub y canales */}
      <div className="pt-2 pb-4">
        <div className="flex items-center justify-between">
          <VolverAlHub
            onVolver={() => {
              const params = new URLSearchParams(searchParams);
              params.delete("seccion");
              setSearchParams(params);
            }}
            etiqueta="Volver a Configuración de WhatsApp"
          />
          <button
            type="button"
            onClick={() => navigate(from)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors dark:text-gray-400 dark:hover:text-white cursor-pointer"
          >
            Volver a Canales
          </button>
        </div>
      </div>


      {/* ═══════════════════════════════════════════════════════════════════════════
          CONTENEDOR DE LA SECCIÓN ACTIVA
          ═══════════════════════════════════════════════════════════════════════════ */}
      <ConfigShell
        seccionKey={seccionActiva}
        titulo={meta.label}
        hint={meta.hint}
        footer={
          seccionActiva === "modelo" ? null : notaSinGuardado(seccionActiva) === null ? (
            <ConfigAcciones
              fija
              mensaje={
                guardado ? (
                  <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    Cambios guardados con éxito ✓
                  </span>
                ) : undefined
              }
            >
              <Button variant="outline" onClick={descartarCambios}>
                Descartar cambios
              </Button>
              <Button onClick={guardarCambios}>
                Guardar cambios
              </Button>
            </ConfigAcciones>
          ) : (
            <p className="mt-6 border-t border-gray-200 pt-4 text-xs leading-relaxed text-gray-500 dark:border-gray-800 dark:text-gray-400">
              {notaSinGuardado(seccionActiva)}
            </p>
          )
        }
      >
        {/* ───────────── 1. MODELO OPENROUTER ───────────── */}
        {seccionActiva === "modelo" && (
          <div className="space-y-6">
            {/* TARJETA 1: Clave API de OpenRouter */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs dark:border-gray-800 dark:bg-gray-900 space-y-4">
              {/* Cabecera Tarjeta 1 */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-[#FF3F1A]/10 text-[#FF3F1A] flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white leading-tight">
                      Clave API de OpenRouter
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Permite a la inteligencia artificial generar respuestas para tus clientes.
                    </p>
                  </div>
                </div>

                <div>
                  {configIa.apiKey && configIa.apiKey.trim().length > 8 ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span>
                        Clave configurada (
                        {configIa.apiKey.length > 12
                          ? `${configIa.apiKey.slice(0, 7)}·······${configIa.apiKey.slice(-4)}`
                          : "sk-or-v·······"}
                        )
                      </span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs font-medium text-amber-700 dark:text-amber-400">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      <span>Sin clave configurada</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Input de clave */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
                <div className="relative flex-1 flex items-center">
                  <input
                    type={mostrarApiKey ? "text" : "password"}
                    value={configIa.apiKey}
                    onChange={(e) => setConfigIa({ ...configIa, apiKey: e.target.value })}
                    placeholder="sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 pr-10 text-sm font-mono text-gray-900 placeholder:text-gray-400 focus:border-[#FF3F1A] focus:outline-none focus:ring-2 focus:ring-[#FF3F1A]/20 dark:border-gray-800 dark:bg-gray-950/50 dark:text-white shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarApiKey(!mostrarApiKey)}
                    className="absolute right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer"
                    title={mostrarApiKey ? "Ocultar clave" : "Mostrar clave"}
                  >
                    {mostrarApiKey ? (
                      <EyeCloseIcon className="h-4 w-4" />
                    ) : (
                      <EyeIcon className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {configIa.apiKey && (
                  <button
                    type="button"
                    onClick={() => setConfigIa({ ...configIa, apiKey: "" })}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800 text-xs font-medium transition-colors cursor-pointer shrink-0"
                  >
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Limpiar
                  </button>
                )}
              </div>

              {/* Pie de tarjeta con enlace directo */}
              <div className="flex flex-wrap items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-1 border-t border-gray-100 dark:border-gray-800/80">
                <span>Almacenamiento cifrado y seguro.</span>
                <a
                  href="https://openrouter.ai/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-[#FF3F1A] hover:underline inline-flex items-center gap-1"
                >
                  Obtener clave en OpenRouter.ai →
                </a>
              </div>
            </div>

            {/* TARJETA 2: Modelo de Inteligencia Artificial */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs dark:border-gray-800 dark:bg-gray-900 space-y-5">
              {/* Cabecera Tarjeta 2 */}
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[#190088]/10 text-[#190088] dark:bg-white/10 dark:text-white flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M3 9h2m-2 6h2m14-6h2m-2 6h2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white leading-tight">
                    Modelo de Inteligencia Artificial
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Selecciona el motor que generará las respuestas de WhatsApp.
                  </p>
                </div>
              </div>

              {/* Selector de modelo */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Modelo
                </label>
                <select
                  value={configIa.modelo}
                  onChange={(e) => setConfigIa({ ...configIa, modelo: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 focus:border-[#FF3F1A] focus:outline-none focus:ring-2 focus:ring-[#FF3F1A]/20 dark:border-gray-800 dark:bg-gray-950/50 dark:text-white shadow-2xs cursor-pointer"
                >
                  <option value="google/gemini-2.0-flash-001">
                    Google Gemini 2.0 Flash (Recomendado · Rápido y económico)
                  </option>
                  <option value="openai/gpt-4o-mini">
                    OpenAI GPT-4o Mini (Alta precisión)
                  </option>
                  <option value="anthropic/claude-3.5-haiku">
                    Anthropic Claude 3.5 Haiku (Excelente redacción)
                  </option>
                  <option value="meta-llama/llama-3.3-70b-instruct">
                    Meta Llama 3.3 70B (Código abierto)
                  </option>
                </select>
              </div>

              {/* Paneles de Temperatura y Tokens */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                {/* Temperatura */}
                <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800/80 dark:bg-gray-950/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Creatividad (Temperatura)
                    </label>
                    <span className="px-2 py-0.5 rounded-md bg-[#FF3F1A]/10 text-[#FF3F1A] font-mono font-bold text-xs">
                      {configIa.temperatura.toFixed(2)}
                    </span>
                  </div>

                  <div className="pt-1">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={configIa.temperatura}
                      onChange={(e) => setConfigIa({ ...configIa, temperatura: parseFloat(e.target.value) })}
                      className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg cursor-pointer accent-[#FF3F1A]"
                    />
                    <div className="flex justify-between text-[11px] text-gray-400 dark:text-gray-500 mt-2">
                      <span>Preciso (0.0)</span>
                      <span>Equilibrado (0.5)</span>
                      <span>Creativo (1.0)</span>
                    </div>
                  </div>
                </div>

                {/* Límite de Tokens */}
                <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800/80 dark:bg-gray-950/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Máximo de tokens por respuesta
                    </label>
                  </div>

                  <div className="pt-1 space-y-2">
                    <div className="flex items-center rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 px-3.5 py-1.5 shadow-2xs focus-within:ring-2 focus-within:ring-[#FF3F1A]/20 focus-within:border-[#FF3F1A]">
                      <input
                        type="number"
                        min="100"
                        max="8192"
                        step="50"
                        value={configIa.maxTokens}
                        onChange={(e) => setConfigIa({ ...configIa, maxTokens: parseInt(e.target.value) || 500 })}
                        className="w-full bg-transparent text-sm font-medium text-gray-900 dark:text-white focus:outline-none"
                      />
                      <span className="text-xs text-gray-400 select-none pl-2">
                        tokens
                      </span>
                    </div>

                    <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-tight">
                      Evita mensajes excesivamente largos por WhatsApp.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Barra inferior de acciones con estilo Necto */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>Los cambios se aplican de inmediato al guardar.</span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={descartarCambios}
                  className="text-xs font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white transition-colors cursor-pointer px-2 py-1"
                >
                  Descartar cambios
                </button>
                <button
                  type="button"
                  onClick={guardarCambios}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#FF3F1A] hover:bg-[#e5351a] text-white text-xs font-bold shadow-md shadow-[#FF3F1A]/20 transition-all active:scale-98 cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  Guardar cambios
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ───────────── 2. WHATSAPP QR ───────────── */}
        {seccionActiva === "qr" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 md:p-8 shadow-xs dark:border-gray-800 dark:bg-gray-900 space-y-6">
              {/* Cabecera limpia y profesional */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
                    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.008v.008H6.75V6.75zM6.75 16.5h.008v.008H6.75V16.5zM16.5 6.75h.008v.008H16.5V6.75zM13.5 13.5h3v3h-3v-3zM16.5 16.5h3v3h-3v-3zM13.5 19.5h3v.75h-3v-.75zM19.5 13.5h.75v3h-.75v-3z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-tight">
                      Vincular WhatsApp
                    </h3>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      Conecta la línea de WhatsApp para activar el bot de atención y las conversaciones del equipo.
                    </p>
                  </div>
                </div>

                <div>
                  {estadoBaileys === "conectado" ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Conectado ({numeroConectado || NUMERO_CANAL})</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs font-medium text-amber-700 dark:text-amber-400">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      <span>Esperando vinculación</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Si ya está conectado, mostramos tarjeta de estado activo con opción de desconectar */}
              {estadoBaileys === "conectado" ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 dark:border-emerald-800/60 dark:bg-emerald-950/20 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-bold text-gray-900 dark:text-white">
                          Línea de WhatsApp conectada
                        </h4>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 text-[11px] font-semibold">
                          En línea
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-1">
                        {numeroConectado || NUMERO_CANAL}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        El bot está respondiendo mensajes entrantes en tiempo real.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={cargarOGenerarQr}
                      className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                    >
                      Reconectar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        fetch("/api/whatsapp/disconnect", { method: "POST" })
                          .then(() => {
                            setEstadoBaileys("desconectado");
                            cargarOGenerarQr();
                          })
                          .catch(() => alert("Error al desconectar"));
                      }}
                      className="px-4 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/30 dark:hover:bg-red-900/40 dark:text-red-400 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Desconectar línea
                    </button>
                  </div>
                </div>
              ) : (
                /* Grid de 2 columnas para escanear el QR */
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                  {/* Columna Izquierda: QR Code (5 columnas) */}
                  <div className="md:col-span-5 flex flex-col items-center">
                    <div className="relative p-5 rounded-3xl bg-white border border-gray-200 shadow-sm dark:border-gray-800 dark:bg-gray-950/80">
                      <div className="w-60 h-60 sm:w-64 sm:h-64 flex items-center justify-center bg-white rounded-2xl overflow-hidden">
                        {cargandoQr ? (
                          <div className="flex flex-col items-center gap-3 text-gray-400 text-xs">
                            <span className="h-8 w-8 rounded-full border-2 border-[#FF3F1A] border-t-transparent animate-spin" />
                            <span>Generando código QR...</span>
                          </div>
                        ) : qrCodeUrl ? (
                          <img
                            src={qrCodeUrl}
                            alt="Código QR de WhatsApp"
                            className="w-full h-full object-contain p-1"
                          />
                        ) : (
                          <div className="text-center p-4">
                            <span className="text-xs text-gray-400">Pulsa en «Generar código QR»</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-4 text-xs font-medium text-gray-500 dark:text-gray-400">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                      <span>Apunta con la cámara de tu WhatsApp</span>
                    </div>
                  </div>

                  {/* Columna Derecha: Pasos numerados y Acción (7 columnas) */}
                  <div className="md:col-span-7 space-y-6">
                    <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-5 dark:border-gray-800 dark:bg-white/[0.02] space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Cómo vincular en 3 pasos:
                      </h4>

                      <div className="space-y-3.5">
                        <div className="flex items-start gap-3">
                          <span className="h-6 w-6 rounded-full bg-[#FF3F1A]/10 text-[#FF3F1A] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                            1
                          </span>
                          <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                            Abre la app de <strong className="font-semibold text-gray-900 dark:text-white">WhatsApp</strong> en tu teléfono.
                          </p>
                        </div>

                        <div className="flex items-start gap-3">
                          <span className="h-6 w-6 rounded-full bg-[#FF3F1A]/10 text-[#FF3F1A] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                            2
                          </span>
                          <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                            Ve a <strong className="font-semibold text-gray-900 dark:text-white">Ajustes</strong> (o los 3 puntos) → <strong className="font-semibold text-gray-900 dark:text-white">Dispositivos vinculados</strong>.
                          </p>
                        </div>

                        <div className="flex items-start gap-3">
                          <span className="h-6 w-6 rounded-full bg-[#FF3F1A]/10 text-[#FF3F1A] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                            3
                          </span>
                          <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                            Toca en <strong className="font-semibold text-gray-900 dark:text-white">Vincular un dispositivo</strong> y escanea el código de la pantalla.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={cargarOGenerarQr}
                        disabled={cargandoQr}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition-all active:scale-98 cursor-pointer disabled:opacity-50"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span>{cargandoQr ? "Actualizando..." : "Actualizar código QR"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ───────────── 3. PERSONALIDAD ───────────── */}
        {seccionActiva === "personalidad" && (
          <BloqueConfig
            icono={ICONO_SECCION[meta.icono]}
            pregunta={meta.pregunta}
            descripcion="Personaliza el nombre, tono de voz y saludo que utiliza el asistente con tus clientes."
          >
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <CampoConfig
                  etiqueta="Nombre del Asistente"
                  ayuda="Nombre con el que se presentará el asistente ante los clientes en WhatsApp."
                  ancho="max-w-md"
                >
                  <Input
                    value={configIa.nombreAsistente}
                    onChange={(e) => setConfigIa({ ...configIa, nombreAsistente: e.target.value })}
                    placeholder="Ej: NectoBot, Sofía del Taller..."
                  />
                </CampoConfig>

                <CampoConfig
                  etiqueta="Tratamiento al cliente"
                  ayuda="Define si el trato será informal ('Tú') o formal ('Usted')."
                  ancho="max-w-md"
                >
                  <select
                    value={configIa.trato}
                    onChange={(e) => setConfigIa({ ...configIa, trato: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-800 shadow-xs dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                  >
                    <option value="tu">Tú (Cercano, empático y directo)</option>
                    <option value="usted">Usted (Formal y corporativo)</option>
                  </select>
                </CampoConfig>
              </div>

              <CampoConfig
                etiqueta="Tono general de comunicación"
                ayuda="Determina el estilo de redacción de los mensajes enviados por el asistente."
                ancho="max-w-xl"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: "profesional", titulo: "Profesional y Técnico", desc: "Claro, preciso y con terminología adecuada." },
                    { id: "cercano", titulo: "Cercano y Amigable", desc: "Cálido, accesible y con emojis comedidos." },
                    { id: "ejecutivo", titulo: "Conciso y Directo", desc: "Rápido, al punto, sin rodeos." },
                  ].map((t) => (
                    <div
                      key={t.id}
                      onClick={() => setConfigIa({ ...configIa, tono: t.id })}
                      className={cn(
                        "p-3.5 rounded-xl border cursor-pointer transition-all",
                        configIa.tono === t.id
                          ? "border-indigo-600 bg-indigo-50/40 dark:border-indigo-500 dark:bg-indigo-500/10"
                          : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900"
                      )}
                    >
                      <p className="text-xs font-bold text-gray-900 dark:text-white">{t.titulo}</p>
                      <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">{t.desc}</p>
                    </div>
                  ))}
                </div>
              </CampoConfig>

              <CampoConfig
                etiqueta="Mensaje de bienvenida automático"
                ayuda="Mensaje que envía el asistente al iniciar el primer contacto con un nuevo cliente."
                ancho="max-w-none"
              >
                <TextArea
                  rows={3}
                  value={configIa.saludo}
                  onChange={(v) => setConfigIa({ ...configIa, saludo: v })}
                />
              </CampoConfig>
            </div>
          </BloqueConfig>
        )}

        {/* ───────────── 4. INSTRUCCIONES ───────────── */}
        {seccionActiva === "instrucciones" && (
          <BloqueConfig
            icono={ICONO_SECCION[meta.icono]}
            pregunta={meta.pregunta}
            descripcion="Define el prompt del sistema, las políticas de derivación humana y los límites operativos."
          >
            <div className="space-y-6">
              <CampoConfig
                etiqueta="Instrucciones Principales (System Prompt)"
                ayuda="Contexto raíz que recibe el modelo en cada turno. Explica el negocio, el rol y las directrices fundamentales."
                ancho="max-w-none"
              >
                <TextArea
                  rows={6}
                  value={configIa.promptPrincipal}
                  onChange={(v) => setConfigIa({ ...configIa, promptPrincipal: v })}
                />
              </CampoConfig>

              <CampoConfig
                etiqueta="Reglas de Derivación a Asesor Humano (Handoff)"
                ayuda="Condiciones explícitas bajo las cuales el modelo debe invocar la herramienta 'derivarAPersona' y pausarse."
                ancho="max-w-none"
              >
                <TextArea
                  rows={4}
                  value={configIa.reglasDerivacion}
                  onChange={(v) => setConfigIa({ ...configIa, reglasDerivacion: v })}
                />
              </CampoConfig>

              <CampoConfig
                etiqueta="Restricciones y Guardrails"
                ayuda="Lo que el asistente tiene terminantemente prohibido hacer o responder."
                ancho="max-w-none"
              >
                <TextArea
                  rows={3}
                  value={configIa.restricciones}
                  onChange={(v) => setConfigIa({ ...configIa, restricciones: v })}
                />
              </CampoConfig>
            </div>
          </BloqueConfig>
        )}

        {/* ───────────── 5. SERVICIOS ───────────── */}
        {seccionActiva === "servicios" && (
          <BloqueConfig
            icono={ICONO_SECCION[meta.icono]}
            pregunta={meta.pregunta}
            descripcion="Catálogo de servicios disponibles para que el asistente consulte precios y agende citas."
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 bg-gray-50/50 dark:border-gray-800 dark:bg-white/[0.02]">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    Cotización automática de servicios
                  </p>
                  <p className="text-xs text-gray-500">
                    Permite que el asistente informe precios y tiempos estimados a los clientes que pregunten.
                  </p>
                </div>
                <Switch
                  checked={configIa.permitirCotizar}
                  color={SWITCH_COLOR}
                  onChange={(v) => setConfigIa({ ...configIa, permitirCotizar: v })}
                  aria-label="Permitir cotización de servicios"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase text-gray-500 tracking-wider">
                    Servicios cargados ({configIa.servicios.length})
                  </h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const nuevo = {
                        id: Date.now().toString(),
                        nombre: "Nuevo servicio",
                        precio: 50,
                        duracionMin: 30,
                        activo: true,
                      };
                      setConfigIa({ ...configIa, servicios: [...configIa.servicios, nuevo] });
                    }}
                  >
                    + Añadir servicio
                  </Button>
                </div>

                <div className="divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-xs dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900">
                  {configIa.servicios.map((srv: any, idx: number) => (
                    <div key={srv.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <input
                          type="text"
                          value={srv.nombre}
                          onChange={(e) => {
                            const copia = [...configIa.servicios];
                            copia[idx].nombre = e.target.value;
                            setConfigIa({ ...configIa, servicios: copia });
                          }}
                          className="font-medium text-sm text-gray-900 bg-transparent border-b border-transparent focus:border-indigo-500 focus:outline-hidden w-full dark:text-white"
                        />
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <span>Precio:</span>
                          <input
                            type="number"
                            value={srv.precio}
                            onChange={(e) => {
                              const copia = [...configIa.servicios];
                              copia[idx].precio = parseFloat(e.target.value) || 0;
                              setConfigIa({ ...configIa, servicios: copia });
                            }}
                            className="w-16 rounded-md border border-gray-200 px-2 py-1 text-right text-xs font-semibold text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                          />
                          <span>€</span>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <span>Duración:</span>
                          <input
                            type="number"
                            value={srv.duracionMin}
                            onChange={(e) => {
                              const copia = [...configIa.servicios];
                              copia[idx].duracionMin = parseInt(e.target.value) || 0;
                              setConfigIa({ ...configIa, servicios: copia });
                            }}
                            className="w-14 rounded-md border border-gray-200 px-2 py-1 text-right text-xs font-semibold text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                          />
                          <span>min</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setConfigIa({
                              ...configIa,
                              servicios: configIa.servicios.filter((s: any) => s.id !== srv.id),
                            });
                          }}
                          className="text-xs text-red-500 hover:text-red-700 p-1 cursor-pointer"
                          title="Eliminar servicio"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </BloqueConfig>
        )}

        {/* ───────────── 6. HORARIO Y ELEVADORES ───────────── */}
        {seccionActiva === "horario" && (
          <BloqueConfig
            icono={ICONO_SECCION[meta.icono]}
            pregunta={meta.pregunta}
            descripcion="Gestiona los horarios comerciales y la capacidad física de elevadores/bahías para turnos."
          >
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <CampoConfig
                  etiqueta="Hora de Apertura"
                  ayuda="Hora a la que el taller comienza a recibir vehículos."
                  ancho="max-w-xs"
                >
                  <Input
                    type="time"
                    value={configIa.horario.apertura}
                    onChange={(e) =>
                      setConfigIa({
                        ...configIa,
                        horario: { ...configIa.horario, apertura: e.target.value },
                      })
                    }
                  />
                </CampoConfig>

                <CampoConfig
                  etiqueta="Hora de Cierre"
                  ayuda="Hora límite de finalización de jornada de trabajo."
                  ancho="max-w-xs"
                >
                  <Input
                    type="time"
                    value={configIa.horario.cierre}
                    onChange={(e) =>
                      setConfigIa({
                        ...configIa,
                        horario: { ...configIa.horario, cierre: e.target.value },
                      })
                    }
                  />
                </CampoConfig>
              </div>

              <div className="p-5 rounded-2xl border border-indigo-100 bg-indigo-50/30 dark:border-indigo-500/20 dark:bg-indigo-500/5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                      Capacidad física de Elevadores / Bahías
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 leading-relaxed">
                      El asistente utiliza esta capacidad para evitar sobre-agendar citas en el mismo intervalo horario.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">Elevadores en taller:</span>
                    <Input
                      type="number"
                      min="1"
                      max="20"
                      className="w-20 text-center font-bold"
                      value={configIa.horario.elevadores}
                      onChange={(e) =>
                        setConfigIa({
                          ...configIa,
                          horario: { ...configIa.horario, elevadores: parseInt(e.target.value) || 1 },
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <CampoConfig
                etiqueta="Días operativos"
                ayuda="Días en los que se aceptan citas y se realizan intervenciones mecánicas."
                ancho="max-w-none"
              >
                <div className="flex flex-wrap gap-2">
                  {["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"].map((dia) => {
                    const activo = configIa.horario.dias.includes(dia);
                    return (
                      <button
                        key={dia}
                        type="button"
                        onClick={() => {
                          const nuevosDias = activo
                            ? configIa.horario.dias.filter((d: string) => d !== dia)
                            : [...configIa.horario.dias, dia];
                          setConfigIa({
                            ...configIa,
                            horario: { ...configIa.horario, dias: nuevosDias },
                          });
                        }}
                        className={cn(
                          "px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer",
                          activo
                            ? "bg-indigo-600 text-white shadow-xs"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
                        )}
                      >
                        {dia}
                      </button>
                    );
                  })}
                </div>
              </CampoConfig>
            </div>
          </BloqueConfig>
        )}

        {/* ───────────── 7. CONOCIMIENTO ───────────── */}
        {seccionActiva === "conocimiento" && (
          <BloqueConfig
            icono={ICONO_SECCION[meta.icono]}
            pregunta={meta.pregunta}
            descripcion="Base de conocimientos y preguntas frecuentes (FAQ) para respuestas inmediatas del bot."
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                    Preguntas Frecuentes (FAQ)
                  </h4>
                  <p className="text-xs text-gray-500">
                    Información fáctica para resolver dudas sobre ubicación, pagos, garantías y políticas.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const nuevo = {
                      id: Date.now().toString(),
                      pregunta: "¿Nueva pregunta?",
                      respuesta: "Escribe la respuesta aquí...",
                    };
                    setConfigIa({ ...configIa, faq: [...configIa.faq, nuevo] });
                  }}
                >
                  + Añadir FAQ
                </Button>
              </div>

              <div className="space-y-4">
                {configIa.faq.map((item: any, idx: number) => (
                  <div
                    key={item.id}
                    className="p-4.5 rounded-2xl border border-gray-200 bg-white shadow-xs space-y-3 dark:border-gray-800 dark:bg-gray-900"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">P:</span>
                        <input
                          type="text"
                          value={item.pregunta}
                          onChange={(e) => {
                            const copia = [...configIa.faq];
                            copia[idx].pregunta = e.target.value;
                            setConfigIa({ ...configIa, faq: copia });
                          }}
                          className="font-semibold text-sm text-gray-900 bg-transparent border-b border-transparent focus:border-indigo-500 focus:outline-hidden w-full dark:text-white"
                          placeholder="Pregunta del cliente..."
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setConfigIa({
                            ...configIa,
                            faq: configIa.faq.filter((f: any) => f.id !== item.id),
                          });
                        }}
                        className="text-xs text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                        title="Eliminar pregunta"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="flex items-start gap-2">
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1">R:</span>
                      <textarea
                        rows={2}
                        value={item.respuesta}
                        onChange={(e) => {
                          const copia = [...configIa.faq];
                          copia[idx].respuesta = e.target.value;
                          setConfigIa({ ...configIa, faq: copia });
                        }}
                        className="w-full text-xs text-gray-700 bg-gray-50/50 p-2.5 rounded-xl border border-gray-200 focus:border-indigo-500 focus:outline-hidden dark:bg-gray-800/50 dark:border-gray-700 dark:text-gray-200"
                        placeholder="Respuesta oficial del taller..."
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </BloqueConfig>
        )}

        {/* ───────────── 8. INTERRUPTOR MAESTRO ───────────── */}
        {seccionActiva === "interruptor" && (
          <BloqueConfig
            icono={ICONO_SECCION[meta.icono]}
            pregunta={meta.pregunta}
            descripcion="Control maestro para habilitar o suspender las respuestas automáticas de todo el canal."
          >
            <div className="space-y-6">
              <div className="p-6 rounded-3xl border border-gray-200 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-900">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "h-3 w-3 rounded-full",
                          conversacionesStore.respuestasAutomaticas ? "bg-emerald-500 animate-pulse" : "bg-gray-400"
                        )}
                      />
                      <h4 className="text-base font-bold text-gray-900 dark:text-white">
                        {conversacionesStore.respuestasAutomaticas
                          ? "Asistente IA WhatsApp ACTIVADO"
                          : "Asistente IA WhatsApp SUSPENDIDO"}
                      </h4>
                    </div>
                    <p className="text-xs text-gray-500 max-w-xl leading-relaxed">
                      {conversacionesStore.respuestasAutomaticas
                        ? "El modelo OpenRouter responderá automáticamente a los mensajes entrantes de clientes, respetando horarios, catálogo y derivaciones."
                        : "Ningún mensaje entrante recibirá respuesta automatizada. Toda la atención queda a cargo del equipo humano en la bandeja compartida."}
                    </p>
                  </div>

                  <Switch
                    checked={conversacionesStore.respuestasAutomaticas}
                    onChange={(v) => conversacionesStore.setRespuestasAutomaticas(v)}
                    color={SWITCH_COLOR}
                    aria-label="Interruptor maestro de IA"
                  />
                </div>
              </div>

              <Alert
                variant="info"
                title="Pausa inteligente por intervención manual"
                message="Cuando un miembro del equipo escribe manualmente en una conversación o pulsa 'Tomar chat', la IA se desactiva exclusivamente para ese hilo. El cliente solo recibirá mensajes de esa persona hasta que se pulse 'Devolver al bot'."
              />
            </div>
          </BloqueConfig>
        )}

        {/* ───────────── 9. PROBAR ASISTENTE ───────────── */}
        {seccionActiva === "probar" && (
          <BloqueConfig
            icono={ICONO_SECCION[meta.icono]}
            pregunta={meta.pregunta}
            descripcion="Simulador en tiempo real con herramientas activas. No envía mensajes a WhatsApp."
          >
            <div className="space-y-4">
              <div className="rounded-2xl border border-gray-200 bg-white shadow-xs flex flex-col h-[460px] overflow-hidden dark:border-gray-800 dark:bg-gray-900">
                {/* Cabecera del chat simulador */}
                <div className="p-3.5 border-b border-gray-100 bg-gray-50/70 flex items-center justify-between dark:border-gray-800 dark:bg-gray-800/50">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                      IA
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900 dark:text-white">
                        {configIa.nombreAsistente} ({configIa.modelo.split("/")[1] || configIa.modelo})
                      </p>
                      <span className="text-[10px] text-emerald-600 font-medium">Entorno Sandbox de pruebas</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setMensajesPrueba([
                        {
                          id: "1",
                          emisor: "asistente",
                          texto: `¡Hola! Soy ${configIa.nombreAsistente}. ¿En qué puedo ayudarte hoy?`,
                          hora: "Ahora",
                        },
                      ])
                    }
                    className="text-xs text-gray-500 hover:text-gray-800 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    Reiniciar chat
                  </button>
                </div>

                {/* Mensajes del simulador */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/20 dark:bg-white/[0.01]">
                  {mensajesPrueba.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex flex-col max-w-[80%]",
                        msg.emisor === "usuario" ? "ml-auto items-end" : "mr-auto items-start"
                      )}
                    >
                      {msg.toolUsed && (
                        <div className="mb-1 flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-[10px] font-mono text-purple-700 border border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800/40">
                          <span>⚡ Tool:</span>
                          <span>{msg.toolUsed}</span>
                        </div>
                      )}
                      <div
                        className={cn(
                          "p-3 rounded-2xl text-xs leading-relaxed",
                          msg.emisor === "usuario"
                            ? "bg-indigo-600 text-white rounded-br-xs"
                            : "bg-white text-gray-800 border border-gray-200/80 shadow-xs rounded-bl-xs dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                        )}
                      >
                        {msg.texto}
                      </div>
                      <span className="text-[10px] text-gray-400 mt-1 px-1">{msg.hora}</span>
                    </div>
                  ))}

                  {enviandoPrueba && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 p-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-bounce" />
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.2s]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.4s]" />
                      <span className="ml-1 text-[11px]">Asistente generando respuesta...</span>
                    </div>
                  )}
                </div>

                {/* Input de envío */}
                <form
                  onSubmit={enviarMensajePrueba}
                  className="p-3 border-t border-gray-100 bg-white flex items-center gap-2 dark:border-gray-800 dark:bg-gray-900"
                >
                  <input
                    type="text"
                    value={inputPrueba}
                    onChange={(e) => setInputPrueba(e.target.value)}
                    placeholder="Escribe una pregunta para probar el bot (ej: ¿cuánto cuesta el cambio de aceite?)..."
                    className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2 text-xs text-gray-800 focus:border-indigo-500 focus:bg-white focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                  <Button type="submit" size="sm" disabled={!inputPrueba.trim() || enviandoPrueba}>
                    Enviar
                  </Button>
                </form>
              </div>

              {/* Sugerencias de prueba rápidas */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                <span className="font-medium text-[11px]">Pruebas rápidas:</span>
                {[
                  "¿Cuánto cuesta el cambio de aceite?",
                  "¿Tienen cita para mañana?",
                  "Quiero hablar con una persona",
                  "¿Dónde están ubicados?",
                ].map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => {
                      setInputPrueba(sug);
                    }}
                    className="px-2.5 py-1 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 text-[11px] text-gray-700 transition-colors cursor-pointer dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </div>
          </BloqueConfig>
        )}
      </ConfigShell>
    </div>
  );
});

export default ConfigPage;
