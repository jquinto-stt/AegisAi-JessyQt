import { useMemo, useState } from "react";
import { observer } from "mobx-react-lite";
import { useNavigate, useSearchParams } from "react-router";

import { PageMeta } from "@/shell/meta";
import { Alert } from "@/elements/ui/alert";
import { Badge } from "@/elements/ui/badge";
import { Button } from "@/elements/ui/button";
import { Input } from "@/elements/form/input";
import { Switch } from "@/elements/form/switch";
import TextArea from "@/elements/form/textarea";
import {
  AlertIcon,
  BoltIcon,
  DocsIcon,
  InfoIcon,
} from "@/icons";
import {
  conversacionesStore,
  organizacionStore,
  puedeEditarPlantillas,
  motivoSinPermiso,
  pedidosStore,
  type PedidosConfig,
} from "@/stores";
import type { AvisoFueraHorario, PlantillasWhatsApp } from "@/stores/pedidos.store";
import {
  BloqueConfig,
  CampoConfig,
  ConfigAcciones,
  ConfigHeader,
  ConfigHub,
  ConfigShell,
  Label2,
  VolverAlHub,
  type TarjetaHub,
} from "@/pages/config-layout";

import {
  ESTADO_CANAL_BADGE,
  ESTADO_CANAL_LABEL,
  FILAS_PLANTILLA,
  META_SECCION,
  notaSinGuardado,
  ORDEN_SECCIONES,
  SWITCH_COLOR,
  seccionesPorGrupo,
  type EstadoCanal,
  type IconoSeccion,
  type SeccionCanal,
} from "@/pages/conversaciones/configuracion.secciones";

// ═══════════════════════════════════════════════════════════════════════════
// RESOLUCIÓN DE ICONOS
// ═══════════════════════════════════════════════════════════════════════════
//
// El catálogo guarda el NOMBRE del icono; aquí se resuelve contra un mapa
// explícito. Es `Record<IconoSeccion, …>`, así que añadir un icono al catálogo
// sin registrarlo aquí es un error de compilación, no un icono en blanco.

const ICONO_SECCION: Record<IconoSeccion, React.FC<React.SVGProps<SVGSVGElement>>> = {
  DocsIcon,
  BoltIcon,
  InfoIcon,
  AlertIcon,
};

// ═══════════════════════════════════════════════════════════════════════════
// IDENTIDAD DEL CANAL — contexto de la cabecera, no una sección
// ═══════════════════════════════════════════════════════════════════════════
//
// Hasta el 07/10 esto era la sección «Perfil del canal»: tres datos de SOLO
// LECTURA dentro de una pantalla de configuración, con su propia tarjeta en el
// menú de entrada. Abrir una sección para leer tres líneas que no se pueden
// cambiar es lo que hacía que la página pareciera informativa en vez de
// configurable.
//
// Los datos no se han perdido ni se han escondido: son el CONTEXTO de todo lo
// que se ajusta debajo (las plantillas y el aviso los escribe este negocio, en
// este número), así que viven en la cabecera, a la vista en todas las secciones.

/**
 * Número de WhatsApp del negocio.
 *
 * NO es configuración editable: es la IDENTIDAD del canal, la clave por la que
 * se cruzan pedidos y conversaciones (`pedidosStore.porTelefono`). En este mock
 * vive en el seed del canal y se muestra como dato de solo lectura — dejar
 * editarlo sugeriría que cambiarlo reasocia los hilos existentes, y no lo hace.
 */
const NUMERO_CANAL = "+57 300 555 1122";

// ═══════════════════════════════════════════════════════════════════════════
// ESTADO DEL AVISO FUERA DE HORARIO
// ═══════════════════════════════════════════════════════════════════════════
//
// El aviso depende de TRES hechos: que el horario esté activo (si no, el negocio
// se considera abierto siempre y el aviso no tiene cuándo aplicarse), que el
// interruptor esté encendido y que el mensaje tenga texto. La función dice en
// presente cuál de los tres falta, para que el usuario lo sepa ANTES de guardar
// en vez de preguntarse después por qué nadie recibe nada.
//
// Es una función pura sobre el borrador y no un `if` dentro del JSX: así el
// mismo cálculo sirve para el color y para el texto, y no hay dos ramas que
// puedan contradecirse.

function estadoAviso(
  aviso: AvisoFueraHorario,
  horario: PedidosConfig["horario"],
): {
  variant: "info" | "warning";
  title: string;
  message: string;
} {
  const { activo, mensaje } = aviso;

  if (!horario.activo) {
    return {
      variant: "info",
      title: "Todavía no se envía",
      message:
        "El horario de atención está desactivado, así que el negocio se considera abierto a cualquier hora y este aviso no tiene cuándo aplicarse. Actívalo en Configuración de Pedidos → Tiempos y horarios para que pueda enviarse.",
    };
  }

  if (!activo) {
    return {
      variant: "info",
      title: "Apagado",
      message:
        "El cliente que escriba fuera de horario no recibe nada: su mensaje queda en la bandeja esperando a que alguien lo atienda.",
    };
  }

  if (mensaje.trim() === "") {
    return {
      variant: "warning",
      title: "Encendido, pero sin texto",
      message:
        "El aviso está activado y el mensaje está vacío, así que no se enviaría nada. Escribe el texto que quieres que reciba el cliente.",
    };
  }

  return {
    variant: "info",
    title: "Se enviará fuera de horario",
    message: `El cliente que escriba fuera de la franja ${horario.apertura}–${horario.cierre} recibirá este mensaje. Si vuelve a escribir sin que nadie le haya contestado, no se le repite.`,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTEXTO DEL CANAL — la cabecera
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Nombre con el que el negocio aparece en el canal.
 *
 * Sale del nombre de la ORGANIZACIÓN (`organizacionStore`), que es el dato real
 * que existe en el modelo. Antes era la constante literal «Necto» —el nombre de
 * la aplicación—, y presentaba la marca del producto como si fuera el nombre
 * comercial del negocio del usuario.
 */
const ContextoCanal = observer(() => {
  const nombre = organizacionStore.organizacion?.nombre?.trim() ?? "";

  // Estado de atención DERIVADO del horario real, con `estaAbierto()`. No hay
  // un booleano «conectado» en el modelo y no se inventa uno: un segundo
  // booleano sería un sitio más donde afirmar lo mismo que ya dice el horario,
  // y los dos podrían divergir.
  const estado: EstadoCanal = pedidosStore.estaAbierto() ? "atendiendo" : "fuera_horario";

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <div className="min-w-0">
        {nombre !== "" && (
          <p className="truncate text-sm font-semibold text-ink-body dark:text-white/90">
            {nombre}
          </p>
        )}
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

// ═══════════════════════════════════════════════════════════════════════════
// PÁGINA
// ═══════════════════════════════════════════════════════════════════════════

/**
 * ConfigPage (Conversaciones) — configuración del canal de WhatsApp.
 *
 * Aparece bajo **Canales** en `/conversaciones/config` y responde a una pregunta
 * distinta de `/pedidos/config`: allí se ajusta el MOTOR de pedidos (pipeline,
 * modalidades, catálogo); aquí, el CANAL por el que entran y se atienden. Las dos
 * superficies comparten campos de `pedidosStore.config`, y comparten también una
 * única derivación de cada valor; ninguna mantiene una copia propia.
 *
 * ── Estructura ────────────────────────────────────────────────────────────
 * Cuatro secciones en dos grupos (CANAL / MENSAJERÍA). Es navegación por
 * PESTAÑAS reales: solo una sección está montada a la vez, sin scroll-spy ni
 * secciones apiladas. El catálogo vive en `configuracion.secciones.ts`, que
 * documenta las CINCO secciones retiradas el 07/10 y por qué: «Perfil del
 * canal» y «Automatización y escalado» no contenían ni un control, «Módulos
 * conectados» era la misma línea de código que «Módulos integrados» del
 * asistente, «Apariencia» —tema y densidad— es una preferencia de toda la
 * aplicación, y «Horario de atención» es del NEGOCIO: gobierna
 * `pedidosStore.estaAbierto()` y se edita en `/pedidos/config → Tiempos`.
 *
 * ── Estado ────────────────────────────────────────────────────────────────
 * Borrador local (`useState`) copiado de `pedidosStore.config` al montar, y
 * confirmado solo al pulsar Guardar. `Descartar cambios` re-copia el borrador
 * desde el store sin diálogo de confirmación (es una acción reversible: basta
 * volver a editar).
 *
 * Una sección NO usa el borrador porque se aplica al instante: `atencion`
 * (escribe en `conversacionesStore.respuestasAutomaticas`). Lleva su nota de por
 * qué no hay botón de guardar.
 *
 * ── Autorización ──────────────────────────────────────────────────────────
 * La ruta exige `channels.manage`. Si además faltara para las plantillas (rol
 * con `settings.manage` pero sin `channels.manage` entrando por otra ruta), la
 * página entra en **modo solo lectura**: se muestra un aviso arriba, los campos
 * quedan en un `<fieldset disabled>` y los dos botones quedan deshabilitados
 * pero VISIBLES. Se deshabilita en vez de ocultar porque ocultar el botón de
 * guardado haría creer que la página no guarda nada — el mismo criterio que
 * `pages/pedidos/ConfigPage.tsx`.
 */
export const ConfigPage = observer(() => {
  // ── La sección activa vive en la URL (`?seccion=`) ────────────────────────
  //
  // Antes era un `useState`: un enlace a «Plantillas» no existía, y quien llegaba
  // desde una incidencia siempre aterrizaba en «Perfil del canal». Con el
  // parámetro, cada sección es direccionable — y **sin parámetro se pinta el hub
  // de tarjetas**, porque es la pantalla de entrada. Elegir una sección «por
  // defecto» escondería las otras detrás de una nav que el usuario no ha visto.
  // Mismo criterio que `pages/pedidos/ConfigPage.tsx`.
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const from = searchParams.get("from");
  const canal = searchParams.get("canal");
  const seccionParam = searchParams.get("seccion");
  const seccion: SeccionCanal | null = esSeccionValida(seccionParam) ? seccionParam : null;

  /**
   * ¿Es `v` una sección conocida?
   *
   * El valor lo escribe el usuario. Uno inventado no puede dejar la pantalla en
   * blanco: cae al hub, que es lo que se pinta de verdad.
   */
  function esSeccionValida(v: string | null): v is SeccionCanal {
    return v !== null && (ORDEN_SECCIONES as string[]).includes(v);
  }

  const entrarASeccion = (k: string) => {
    const params: Record<string, string> = { seccion: k };
    if (from) params.from = from;
    if (canal) params.canal = canal;
    setSearchParams(params);
  };

  const volverAlHub = () => {
    const params: Record<string, string> = {};
    if (from) params.from = from;
    if (canal) params.canal = canal;
    setSearchParams(params);
  };

  const [guardado, setGuardado] = useState(false);

  // ── Borrador: copia profunda de la config persistida ──
  // Se clonan los sub-objetos y arrays para que editar el borrador NO mute el
  // store antes de guardar. Sin el clon, `draft.plantillas` sería el MISMO objeto
  // que el del store y `setPlantilla` escribiría en el estado confirmado en cada
  // tecla — el borrador dejaría de ser un borrador.
  const copiaDe = (): PedidosConfig => ({
    ...pedidosStore.config,
    modalidades: [...pedidosStore.config.modalidades],
    plantillas: { ...pedidosStore.config.plantillas },
    catalogo: pedidosStore.config.catalogo.map((c) => ({ ...c })),
    aliasEstados: { ...pedidosStore.config.aliasEstados },
    aliasModalidades: { ...pedidosStore.config.aliasModalidades },
    tiemposObjetivo: { ...pedidosStore.config.tiemposObjetivo },
    alertaAtencion: { ...pedidosStore.config.alertaAtencion },
    avisoFueraHorario: { ...pedidosStore.config.avisoFueraHorario },
  });

  const [draft, setDraft] = useState<PedidosConfig>(copiaDe);

  // ── Autorización ──
  // `channels.manage` gobierna TODA la página (es la capacidad de la ruta), así
  // que el modo solo lectura se evalúa una vez. `motivoSinPermiso` construye el
  // texto desde `CAPACIDAD_LABEL`: ninguna pantalla escribe el motivo a mano.
  const soloLectura = !puedeEditarPlantillas();
  const motivo = motivoSinPermiso("channels.manage");

  // ── Setters del borrador ──
  // Todos marcan `guardado = false`: cualquier edición invalida el aviso de
  // "Guardado", que si no quedaría afirmando algo falso.
  //
  // No hay un `set(clave, valor)` genérico: cada sección que queda escribe en su
  // propio sub-objeto, y un setter de clave arbitraria solo servía a las que se
  // retiraron. Se quitó con ellas.
  const setPlantilla = (key: keyof PlantillasWhatsApp, value: string) => {
    setDraft((prev) => ({ ...prev, plantillas: { ...prev.plantillas, [key]: value } }));
    setGuardado(false);
  };

  const setAviso = <K extends keyof AvisoFueraHorario>(k: K, v: AvisoFueraHorario[K]) => {
    setDraft((prev) => ({ ...prev, avisoFueraHorario: { ...prev.avisoFueraHorario, [k]: v } }));
    setGuardado(false);
  };

  const setAlerta = <K extends keyof PedidosConfig["alertaAtencion"]>(
    k: K,
    v: PedidosConfig["alertaAtencion"][K],
  ) => {
    setDraft((prev) => ({ ...prev, alertaAtencion: { ...prev.alertaAtencion, [k]: v } }));
    setGuardado(false);
  };

  // ── Derivaciones de validación (no se guardan: se recalculan) ──
  //
  // Ya no hay ninguna: la única que existía era la del horario, y el horario se
  // edita en `/pedidos/config`, donde vive su validación. Un `puedeGuardar`
  // atado a un campo que esta página no toca bloquearía el guardado por algo que
  // el usuario no puede arreglar desde aquí.
  const puedeGuardar = !soloLectura;

  const guardar = () => {
    // Defensa en profundidad: la ruta ya exige `channels.manage`, y aun así no
    // se persiste nada si la capacidad falta.
    if (!puedeGuardar) return;
    pedidosStore.updateConfig(draft);
    setGuardado(true);
  };

  const descartar = () => {
    // Vuelve a los últimos valores CONFIRMADOS del store, sin confirmación
    // previa: descartar siempre se puede repetir editando, no destruye nada.
    setDraft(copiaDe());
    setGuardado(false);
  };

  // Estado del aviso fuera de horario, calculado una vez por render.
  const avisoEstado = estadoAviso(draft.avisoFueraHorario, pedidosStore.config.horario);

  // ── Encabezado de la sección activa ──
  // Las tarjetas del hub salen del catálogo (`seccionesPorGrupo`), no de una
  // lista copiada: una sección nueva aparece aquí sola.
  const tarjetasHub: TarjetaHub[] = useMemo(
    () =>
      seccionesPorGrupo()
        .flatMap(({ secciones }) => secciones)
        .map((s) => ({
          key: s,
          label: META_SECCION[s].label,
          hint: META_SECCION[s].hint,
          icono: ICONO_SECCION[META_SECCION[s].icono],
        })),
    [],
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // VISTA RAÍZ — el hub de tarjetas
  // ═══════════════════════════════════════════════════════════════════════════
  //
  // Sin `?seccion=`. No se pinta el aviso de solo lectura: navegar no es editar,
  // y el aviso pertenece a la sección que se va a consultar, donde sí importa.
  if (!seccion) {
    return (
      <div className="pb-12">
        <PageMeta
          title="Configuración del canal · Conversaciones"
          description="Ajustes del canal de WhatsApp"
        />

        <div className="mb-4">
          <VolverAlHub
            onVolver={() => {
              if (from) {
                navigate(from);
              } else {
                navigate("/pedidos/config?seccion=integraciones");
              }
            }}
            etiqueta="Volver a Integraciones"
          />
        </div>

        <div className="mb-7">
          <ConfigHeader
            titulo={canal === "telegram" ? "Configuración de Telegram" : "Configuración del canal"}
            descripcion={
              canal === "telegram"
                ? "Ajustes del bot de Telegram, respuestas automáticas y notificaciones."
                : "Elige qué quieres ajustar. Cada opción abre su propia pantalla."
            }
            acciones={<ContextoCanal />}
          />
        </div>

        <ConfigHub tarjetas={tarjetasHub} onEntrar={entrarASeccion} />
      </div>
    );
  }

  const meta = META_SECCION[seccion];

  return (
    <>
      <PageMeta
        title="Configuración del canal · Conversaciones"
        description="Ajustes del canal de WhatsApp"
      />

      <div className="mb-5">
        <ConfigHeader
          titulo="Configuración del canal"
          descripcion="Módulos, plantillas, horario, atención automática y alertas del canal."
          acciones={<ContextoCanal />}
        />
      </div>

      {/* Aviso de solo lectura — visible siempre que falte la capacidad, en
          cualquier sección, porque afecta a toda la página. */}
      {soloLectura && (
        <div className="mb-6">
          <Alert
            variant="warning"
            title="Configuración en solo lectura"
            message={`Puedes consultar los ajustes del canal, pero no modificarlos. ${motivo}`}
          />
        </div>
      )}

      <div>
        {/* ═══════════ Vuelta al hub — FUERA del fieldset ═══════════ */}
        {/*
          El camino de vuelta va AQUÍ, fuera del `<fieldset disabled>`, y no
          dentro de `ConfigShell`. La razón es concreta: `fieldset disabled`
          desactiva NATIVAMENTE todos los `<button>` de dentro, y en modo solo
          lectura el usuario que llega por enlace directo se quedaría encerrado
          en la sección sin forma de ver las demás — el control existiría y no
          haría nada, que es exactamente lo que este proyecto no acepta.
          Volver no es editar, así que no debe desactivarse con la edición.
        */}
        <div className="mb-3 flex items-center justify-between">
          <VolverAlHub onVolver={volverAlHub} />
          <button
            type="button"
            onClick={() => {
              if (from) {
                navigate(from);
              } else {
                navigate("/pedidos/config?seccion=integraciones");
              }
            }}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors dark:text-gray-400 dark:hover:text-white"
          >
            <span>Volver a Integraciones</span>
          </button>
        </div>

        {/* ═══════════ Panel de contenido: UNA sección montada ═══════════ */}
        {/*
          El panel es un <fieldset>: deshabilitarlo desactiva NATIVAMENTE todos
          los inputs, switches y textareas de dentro sin cablear `disabled` en
          cada control.
        */}
        <fieldset disabled={soloLectura} className="m-0 min-w-0 border-0 p-0">
          {/* El `key={seccion}` es lo que dispara el fundido: al cambiar de
              sección React desmonta el panel entero y monta uno nuevo, y el
              nuevo reproduce `animate-aparecer`. */}
          <ConfigShell
            seccionKey={seccion}
            titulo={meta.label}
            hint={meta.hint}
            footer={
              // El pie de guardado SOLO va donde hay algo que guardar.
              //
              // Donde no hay pie, va la nota que dice por qué: quitar el botón
              // en silencio deja al usuario buscando uno que ya no existe.
              notaSinGuardado(seccion) === null ? (
                <>
                  {/* Se compone con `ConfigAcciones` —el mismo patrón de botones
                      que las otras pantallas— y no con `ButtonsGroup`, que fija
                      un ancho mínimo y rompería la alineación a la derecha. */}
                  <ConfigAcciones
                    fija
                    mensaje={
                      guardado ? (
                        <span className="text-sm text-accent-600 dark:text-accent-500">
                          Guardado ✓
                        </span>
                      ) : undefined
                    }
                  >
                    <Button variant="outline" onClick={descartar} disabled={soloLectura}>
                      Descartar cambios
                    </Button>
                    <Button onClick={guardar} disabled={!puedeGuardar}>
                      Guardar cambios
                    </Button>
                  </ConfigAcciones>

                  {soloLectura && (
                    <p className="mt-2 text-right text-xs text-gray-500 dark:text-gray-400">
                      {motivo}
                    </p>
                  )}
                </>
              ) : (
                <p className="mt-6 border-t border-gray-200 pt-4 text-xs leading-relaxed text-gray-500 dark:border-gray-800 dark:text-gray-400">
                  {notaSinGuardado(seccion)}
                </p>
              )
            }
          >
              {/* ───────────── PLANTILLAS DE MENSAJE ───────────── */}
              {seccion === "plantillas" && (
                <BloqueConfig
                  icono={ICONO_SECCION[meta.icono]}
                  pregunta={meta.pregunta}
                  descripcion="Estos textos se envían solos al hilo del cliente cuando su pedido llega a cada estado."
                >
                  {/* ── El rótulo decía «Solo referencia» y era FALSO ────────
                      Hasta el 07/10 esta sección afirmaba «No se envía nada a
                      WhatsApp: sirve como referencia del mensaje en cada paso».
                      No era cierto: `pages/pedidos/pedidos.notificaciones.ts`
                      publica la plantilla del estado nuevo en la conversación del
                      cliente cada vez que el pedido avanza. Un aviso que
                      tranquiliza al usuario sobre algo que no pasa es tan malo
                      como un control que miente. */}
                  <div className="mb-5">
                    <Alert
                      variant="info"
                      title="Se envían de verdad"
                      message="Cada plantilla entra en la conversación del cliente cuando su pedido llega a ese estado. Si el cliente no tiene una conversación abierta, no se envía nada: no se inventa un hilo."
                    />
                  </div>

                  <div>
                    {FILAS_PLANTILLA.map(({ key, label }, i) => (
                      <div
                        key={key}
                        className={
                          "flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-4 " +
                          (i < FILAS_PLANTILLA.length - 1
                            ? "border-b border-gray-100 dark:border-white/5"
                            : "")
                        }
                      >
                        <div className="sm:w-44 sm:shrink-0">
                          <Label2 titulo={label} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <Input
                            id={`canal-plantilla-${key}`}
                            value={draft.plantillas[key]}
                            onChange={(e) => setPlantilla(key, e.target.value)}
                            aria-label={`Plantilla ${label}`}
                            placeholder={`Mensaje de "${label}"`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </BloqueConfig>
              )}

              {/* ───────────── ATENCIÓN AUTOMÁTICA ───────────── */}
              {/*
                Sección NUEVA del 07/10. Ocupa el hueco que dejó «Automatización y
                escalado», que era un informe de solo lectura: dos conteos y una
                leyenda, cero controles. En vez de documentar cómo se reparte la
                atención, aquí se AJUSTA si el canal responde solo.

                El interruptor escribe en `conversacionesStore` y se aplica al
                instante; por eso esta sección no lleva pie de guardado.
              */}
              {seccion === "atencion" && (
                <BloqueConfig
                  icono={ICONO_SECCION[meta.icono]}
                  pregunta={meta.pregunta}
                  descripcion="Cuando está encendido, el canal contesta solo a los mensajes que entran. Apagarlo no cambia quién lleva cada conversación: solo detiene la respuesta automática."
                >
                  <div className="space-y-6">
                    <CampoConfig
                      etiqueta="Respuestas automáticas"
                      ayuda="Se aplica al instante, sin pasar por Guardar: quien lo apaga espera que el canal deje de contestar ya."
                      ancho="max-w-none"
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        <Switch
                          checked={conversacionesStore.respuestasAutomaticas}
                          onChange={(v) => conversacionesStore.setRespuestasAutomaticas(v)}
                          color={SWITCH_COLOR}
                          aria-label="Respuestas automáticas del canal"
                        />
                        <span className="text-sm font-medium text-ink-body dark:text-white/90">
                          {conversacionesStore.respuestasAutomaticas
                            ? "Encendidas: el canal contesta solo"
                            : "Apagadas: nadie contesta automáticamente"}
                        </span>
                      </div>
                    </CampoConfig>

                    {/* El invariante de handoff, que gobierna la consola. Es la
                        explicación que hace falta para entender la diferencia
                        entre este interruptor y el eje de atención por hilo. No
                        se puede editar desde aquí: exponer un interruptor para la
                        regla sugeriría que es opcional, y no lo es. */}
                    <Alert
                      variant="info"
                      title="Esto no es el eje de atención por conversación"
                      message="Que un hilo lo lleve el bot o un asesor se decide conversación por conversación, desde la consola: «Tomar chat» y «Devolver al bot». Este interruptor es del canal entero: apagado, ningún hilo recibe respuesta automática —ni la del bot ni el aviso de fuera de horario—, ni siquiera los que lleva el bot. Mientras un hilo está en manos de un asesor, el bot no responde en él: el cliente recibe solo lo que escriba esa persona."
                    />
                  </div>
                </BloqueConfig>
              )}

              {/* ───────────── AVISO FUERA DE HORARIO ───────────── */}
              {/*
                Reescrita el 07/10. Antes se llamaba «Aviso de pausa», editaba
                `plantillas.cancelado` —el MISMO campo que la fila «Cancelado» de
                las plantillas, con lo que dos pantallas escribían un solo
                valor— y su copy lo describía como un aviso «fuera de horario»
                que no existía en el código. Tres defectos en una sección:
                duplicaba un campo, mentía sobre cuándo se enviaba, y no enviaba
                nada.

                Ahora es el ajuste real que decía ser, sobre un campo propio
                (`avisoFueraHorario`), y el puente
                `pages/conversaciones/atencion.automatica.ts` lo envía de verdad.
              */}
              {seccion === "aviso" && (
                <BloqueConfig
                  icono={ICONO_SECCION[meta.icono]}
                  pregunta={meta.pregunta}
                  descripcion="Lo que recibe el cliente que escribe con el negocio cerrado. Se envía una sola vez por racha: si vuelve a escribir sin que nadie le haya contestado, no se le repite."
                >
                  <div className="space-y-6">
                    <CampoConfig
                      etiqueta="Responder fuera de horario"
                      ayuda="Usa el horario de la sección anterior. Con el horario desactivado, el negocio se considera abierto a cualquier hora y este aviso no se envía nunca."
                      ancho="max-w-none"
                    >
                      <Switch
                        checked={draft.avisoFueraHorario.activo}
                        onChange={(v) => setAviso("activo", v)}
                        color={SWITCH_COLOR}
                        aria-label="Responder fuera de horario"
                      />
                    </CampoConfig>

                    <CampoConfig
                      etiqueta="Mensaje del aviso"
                      htmlFor="canal-aviso-mensaje"
                      ayuda="Sustituye a la respuesta del bot: el cliente recibe el aviso en lugar de la respuesta automática, no las dos."
                      ancho="max-w-none"
                    >
                      <TextArea
                        rows={3}
                        placeholder="¡Gracias por escribirnos! Estamos fuera de horario; te respondemos en cuanto abramos."
                        value={draft.avisoFueraHorario.mensaje}
                        onChange={(v) => setAviso("mensaje", v)}
                        maxLength={280}
                        disabled={!draft.avisoFueraHorario.activo}
                        aria-label="Mensaje del aviso fuera de horario"
                      />
                      <p className="mt-1.5 text-xs text-gray-400">
                        {draft.avisoFueraHorario.mensaje.length}/280 caracteres.
                      </p>
                    </CampoConfig>

                    {/* El estado del aviso se DERIVA de los tres hechos que lo
                        gobiernan y se dice en presente: si no puede enviarse, el
                        usuario lo sabe antes de guardar, no después de
                        preguntarse por qué nadie contesta. */}
                    <Alert
                      variant={avisoEstado.variant}
                      title={avisoEstado.title}
                      message={avisoEstado.message}
                    />
                  </div>
                </BloqueConfig>
              )}

              {/* ───────────── ALERTAS ───────────── */}
              {seccion === "alertas" && (
                <BloqueConfig
                  icono={ICONO_SECCION[meta.icono]}
                  pregunta={meta.pregunta}
                  descripcion="Sonido recurrente mientras haya clientes que requieren atención. Se puede silenciar temporalmente desde el modal de Clientes en Inicio."
                >
                  <div className="space-y-6">
                    <CampoConfig
                      etiqueta="Alerta sonora"
                      ayuda="Repite el aviso hasta que se atiendan los clientes pendientes."
                      ancho="max-w-none"
                    >
                      <Switch
                        checked={draft.alertaAtencion.activo}
                        onChange={(v) => setAlerta("activo", v)}
                        color={SWITCH_COLOR}
                        aria-label="Alerta sonora de clientes pendientes"
                      />
                    </CampoConfig>

                    <CampoConfig
                      etiqueta="Repetir cada (segundos)"
                      ayuda="Mínimo 5 s. Por defecto 30 s."
                      htmlFor="canal-alerta-cada"
                      ancho="w-32"
                    >
                      <Input
                        id="canal-alerta-cada"
                        type="number"
                        value={draft.alertaAtencion.cadaSegundos}
                        disabled={!draft.alertaAtencion.activo}
                        onChange={(e) =>
                          setAlerta("cadaSegundos", Math.max(5, Number(e.target.value) || 30))
                        }
                        aria-label="Segundos entre repeticiones de la alerta"
                      />
                    </CampoConfig>
                  </div>
                </BloqueConfig>
              )}

          </ConfigShell>
        </fieldset>
      </div>
    </>
  );
});

export default ConfigPage;
