import { useState } from "react";
import { observer } from "mobx-react-lite";

import { PageMeta } from "@/shell/meta";
import { Alert } from "@/elements/ui/alert";
import { Badge } from "@/elements/ui/badge";
import { Button } from "@/elements/ui/button";
import { Card } from "@/elements/ui/card";
import { Switch } from "@/elements/form/switch";
import { Label } from "@/elements/form/label";
import {
  AiIcon,
  BoltIcon,
  EyeIcon,
  LockIcon,
  PlugInIcon,
  TimeIcon,
} from "@/icons";
import { assistantStore, uiStore } from "@/stores";
import type { Modulo } from "@/stores/session.store";
import { buildAccessContext } from "@/assistant/bootstrap";
import { toolRegistry } from "@/assistant";
import {
  CONFIANZA_BADGE,
  CONFIANZA_LABEL,
  EJEMPLOS_PREGUNTA,
  GRUPO_SECCION_LABEL,
  INFERENCIA_TIPO_LABEL,
  LIMITES_ASISTENTE,
  META_SECCION,
  MODULOS_CONOCIDOS,
  MOTOR_BADGE,
  MOTOR_BADGE_LABEL,
  MOTOR_DESCRIPCION,
  MOTOR_LABEL,
  NIVEL_BADGE,
  NIVEL_DESCRIPCION,
  NIVEL_LABEL,
  OPCIONES_DENSIDAD,
  OPCIONES_RESPUESTA,
  SWITCH_COLOR,
  TERMINOS_CAUSALES_PROHIBIDOS,
  nivelOperativo,
  seccionesPorGrupo,
  type ConfianzaInferencia,
  type DensidadAsistente,
  type IconoSeccion,
  type LongitudRespuesta,
  type NivelTool,
  type SeccionAsistente,
  type TipoInferencia,
  type TipoMotor,
} from "@/pages/asistente/configuracion.secciones";

// ═══════════════════════════════════════════════════════════════════════════
// ASISTENTE CONFIG PAGE — /asistente/config
// ═══════════════════════════════════════════════════════════════════════════
//
// Página de configuración de **NECTO AI**, el asistente interno del equipo.
// NO es el bot de WhatsApp: ver el bloque "PROPÓSITO DE NECTO AI" en
// `configuracion.secciones.ts` para la distinción completa.
//
// ── De dónde sale cada dato ────────────────────────────────────────────────
// Todo lo que se muestra se lee de una fuente real:
//
//   · Motor activo ............ `assistantStore.motor` (= `AssistantEngine.kind`)
//   · Herramientas disponibles  `toolRegistry.getAvailableTools(buildAccessContext())`
//   · Capacidades de cada tool  `tool.requiredCapabilities`
//   · Nivel de cada tool ....... `tool.level`
//   · Hilos guardados .......... `assistantStore.conversaciones`
//   · Permisos del operador .... `sessionStore.hasPermission(cap)`
//
// Nada se cuenta a mano en el componente: los conteos se derivan de las mismas
// colecciones que usa el motor, de modo que la página no puede afirmar algo
// distinto de lo que el asistente hace de verdad.
//
// ── Por qué la mayoría de la pantalla es de SOLO LECTURA ───────────────────
// Este es el punto que hace esta página distinta de un panel de ajustes normal.
// El comportamiento de NECTO AI no es configurable porque **no hay nada que
// configurar**: el motor es determinista, las reglas están en el código y no
// existe ningún servicio externo cuyos parámetros ajustar. Poner interruptores
// que no cambian nada sería el defecto más grave posible aquí — un control que
// miente. Así que se muestra el estado REAL del sistema y se explica.
//
// Lo único editable son dos preferencias de presentación declaradas como tales.
//
// ── Guard de acceso ───────────────────────────────────────────────────────
// La ruta está protegida por `assistant.use`. Dentro, el aviso de solo lectura
// es redundante con esa capacidad (quien entra, puede usar el asistente), así
// que NO se pinta: sería un aviso sobre algo que nunca puede ocurrir.
//
// ═══════════════════════════════════════════════════════════════════════════

/** Resolución de nombres de icono → componente, tipada para ser exhaustiva. */
const ICONO_SECCION: Record<IconoSeccion, React.FC<React.SVGProps<SVGSVGElement>>> = {
  AiIcon,
  BoltIcon,
  PlugInIcon,
  TimeIcon,
  LockIcon,
  EyeIcon,
};

/** Clases compartidas por las filas etiqueta/control de las tarjetas. */
const filaBase =
  "flex flex-col gap-2 border-b border-gray-100 py-4 last:border-b-0 last:pb-0 first:pt-0 sm:flex-row sm:items-start sm:justify-between sm:gap-6 dark:border-gray-800";

export const AsistenteConfigPage = observer(() => {
  const [seccion, setSeccion] = useState<SeccionAsistente>("perfil");

  // Preferencias locales. No se persisten en el dominio (no hay campo para
  // ellas) y por eso se declaran explícitamente como Preferencias de interfaz.
  const [densidad, setDensidad] = useState<DensidadAsistente>("comoda");
  const [longitud, setLongitud] = useState<LongitudRespuesta>("completa");

  // ── Estado REAL del asistente ─────────────────────────────────────────
  //
  // El motor se lee del store, no se escribe como literal: si mañana se inyecta
  // otro `AssistantEngine`, esta pantalla cambia sola.
  const motorCrudo = assistantStore.motor;
  const motor: TipoMotor = motorCrudo === "remote-llm" ? "remote-llm" : "local-rule";
  // El otro motor del catálogo: se deriva del activo, no se escribe a mano, así
  // que si el activo cambiara la ficha del alternativo seguiría siendo la otra.
  const motorAlternativo: TipoMotor = motor === "local-rule" ? "remote-llm" : "local-rule";

  // Hilos guardados en este navegador.
  const hilos = assistantStore.conversaciones.length;
  const mensajesTotales = assistantStore.conversaciones.reduce(
    (n, c) => n + c.mensajes.length,
    0,
  );

  // ── Herramientas visibles para ESTE operador ──────────────────────────
  //
  // Es la intersección módulos ∩ capacidades que aplica el propio registry;
  // no se reimplementa el filtro aquí. Si esta lista está vacía, el asistente
  // tampoco tiene nada que ejecutar — y la página lo dice.
  const { disponibles, totales } = herramientasVisibles();

  const grupos = seccionesPorGrupo();
  const meta = META_SECCION[seccion];

  return (
    <>
      <PageMeta
        title="Configuración de NECTO AI"
        description="Estado del asistente interno: motor, herramientas y límites"
      />

      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">
            Configuración de NECTO AI
          </h1>
          <Badge color={MOTOR_BADGE[motor]} size="sm">
            {MOTOR_BADGE_LABEL[motor]}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          El asistente interno del equipo: qué consulta, con qué motor y qué no hace.
        </p>
      </div>

      {/* Distinción explícita con el bot de WhatsApp. Sin esto, es fácil que
          quien llega aquí crea que está configurando el bot que atiende a los
          clientes. Son asistentes distintos y el aviso lo corta de raíz. */}
      <div className="mb-6">
        <Alert
          variant="info"
          title="Este no es el bot de WhatsApp"
          message="NECTO AI es el asistente interno: lo usa tu equipo para consultar datos de pedidos. El bot que responde a los clientes por WhatsApp se configura en Canales → Configuración."
        />
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
        {/* ═══════════ Navegación vertical de secciones ═══════════ */}
        <nav
          aria-label="Secciones de configuración de NECTO AI"
          className="shrink-0 lg:w-[240px]"
        >
          <ul className="flex flex-col gap-6">
            {grupos.map(({ grupo, secciones }) => (
              <li key={grupo}>
                <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                  {GRUPO_SECCION_LABEL[grupo]}
                </p>
                <ul className="flex flex-row gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
                  {secciones.map((s) => {
                    const { label, icono } = META_SECCION[s];
                    const Icono = ICONO_SECCION[icono];
                    const activo = s === seccion;
                    return (
                      <li key={s}>
                        <button
                          type="button"
                          onClick={() => setSeccion(s)}
                          aria-current={activo ? "page" : undefined}
                          className={
                            "inline-flex w-full items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-medium transition-colors " +
                            (activo
                              ? "bg-gray-100 text-gray-900 dark:bg-white/[0.06] dark:text-white"
                              : "text-gray-500 hover:bg-gray-50 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200")
                          }
                        >
                          <Icono className="h-5 w-5 shrink-0" />
                          {label}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
        </nav>

        {/* ═══════════ Panel de contenido: UNA sección montada ═══════════ */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              {meta.label}
            </h2>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{meta.hint}</p>
          </div>

          <div className="flex-1 space-y-5">
            {/* ───────────── PERFIL DEL ASISTENTE ───────────── */}
            {seccion === "perfil" && (
              <>
                <Card>
                  <CardHead>Identidad del asistente</CardHead>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Qué es NECTO AI y a quién sirve. Estos datos no se editan: describen
                    lo que el asistente es.
                  </p>

                  <div className="mt-4">
                    <div className={filaBase}>
                      <Label2
                        titulo="Nombre"
                        descripcion="Cómo aparece el asistente en la aplicación."
                      />
                      <span className="text-sm font-medium text-gray-800 dark:text-white/90">
                        NECTO AI
                      </span>
                    </div>

                    <div className={filaBase}>
                      <Label2
                        titulo="Para quién es"
                        descripcion="Quién usa este asistente y en calidad de qué."
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Tu equipo, no los clientes
                      </span>
                    </div>

                    <div className={filaBase}>
                      <Label2
                        titulo="De qué responde"
                        descripcion="El ámbito de datos sobre el que puede consultar."
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Pedidos y su analítica
                      </span>
                    </div>
                  </div>
                </Card>

                <Card>
                  <CardHead>Estado en este momento</CardHead>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Se lee del asistente en vivo, no de un valor guardado.
                  </p>

                  <div className="mt-4">
                    <div className={filaBase}>
                      <Label2
                        titulo="Motor en uso"
                        descripcion={MOTOR_LABEL[motor]}
                      />
                      <Badge color={MOTOR_BADGE[motor]} size="sm">
                        {MOTOR_BADGE_LABEL[motor]}
                      </Badge>
                    </div>

                    <div className={filaBase}>
                      <Label2
                        titulo="Herramientas a tu alcance"
                        descripcion="Consultas que el asistente puede ejecutar con tus permisos."
                      />
                      <span className="text-sm font-medium text-gray-800 dark:text-white/90">
                        {disponibles.length} de {totales}
                      </span>
                    </div>

                    <div className={filaBase}>
                      <Label2
                        titulo="Conversaciones guardadas"
                        descripcion="Hilos conservados en este navegador."
                      />
                      <span className="text-sm font-medium text-gray-800 dark:text-white/90">
                        {hilos} {hilos === 1 ? "hilo" : "hilos"} · {mensajesTotales}{" "}
                        {mensajesTotales === 1 ? "mensaje" : "mensajes"}
                      </span>
                    </div>

                    <div className={filaBase}>
                      <Label2
                        titulo="Tu capacidad"
                        descripcion="El permiso que te da acceso a este asistente."
                      />
                      <Badge color="success" size="sm">
                        assistant.use
                      </Badge>
                    </div>
                  </div>
                </Card>

                {disponibles.length === 0 && (
                  <Alert
                    variant="warning"
                    title="El asistente no tiene ninguna herramienta disponible"
                    message="Con tus permisos actuales no puede responder nada. Esto es intencionado: el filtro es fail-closed. Revisa Herramientas para ver exactamente qué falta."
                  />
                )}
              </>
            )}

            {/* ───────────── MOTOR DE RAZONAMIENTO ───────────── */}
            {seccion === "motor" && (
              <>
                <Card>
                  <CardHead>Motor activo</CardHead>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Cómo el asistente pasa de tu pregunta a una respuesta.
                  </p>

                  <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-white/[0.02]">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <BoltIcon className="h-5 w-5 text-brand-500" />
                      <span className="text-sm font-semibold text-gray-800 dark:text-white/90">
                        {MOTOR_LABEL[motor]}
                      </span>
                      <Badge color={MOTOR_BADGE[motor]} size="sm">
                        {MOTOR_BADGE_LABEL[motor]}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                      {MOTOR_DESCRIPCION[motor]}
                    </p>
                  </div>

                  <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                    El motor es una pieza intercambiable: la aplicación habla con una
                    interfaz, no con una implementación concreta. Por eso esta pantalla
                    muestra cuál está enchufado en vez de ofrecer un selector — no hay
                    varios motores entre los que elegir.
                  </p>

                  {/* El otro motor del catálogo existe en el código pero no está
                      implementado: se muestra para que nadie crea que se puede
                      activar. Las etiquetas y el texto salen del catálogo, nunca
                      se escriben como literal. */}
                  <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-white/[0.02]">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="text-sm font-semibold text-gray-800 dark:text-white/90">
                        {MOTOR_LABEL[motorAlternativo]}
                      </span>
                      <Badge color={MOTOR_BADGE[motorAlternativo]} size="sm">
                        {MOTOR_BADGE_LABEL[motorAlternativo]}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                      {MOTOR_DESCRIPCION[motorAlternativo]}
                    </p>
                  </div>
                </Card>

                <Card>
                  <CardHead>Los cinco pasos de una respuesta</CardHead>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Lo que ocurre desde que escribes una pregunta hasta que ves la
                    respuesta. Cada paso está en el código y es determinista.
                  </p>

                  <ol className="mt-4 space-y-3">
                    {PASOS.map((paso, i) => (
                      <li key={paso.titulo} className="flex gap-3">
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600 dark:bg-white/[0.06] dark:text-gray-300">
                          {i + 1}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                            {paso.titulo}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                            {paso.detalle}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </Card>

                <Card>
                  <CardHead>Cómo reconoce una intención</CardHead>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    El motor busca palabras clave sobre el texto normalizado (en
                    minúsculas y sin acentos) y gana la primera regla que coincide. No
                    hay modelo de lenguaje: es una tabla.
                  </p>

                  <div className="mt-4 space-y-2">
                    {EJEMPLOS_PREGUNTA.map((ej) => (
                      <div
                        key={ej.pregunta}
                        className="rounded-lg border border-gray-200 px-3 py-2.5 dark:border-gray-800"
                      >
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          «{ej.pregunta}»
                        </p>
                        <p className="mt-0.5 font-mono text-[11px] text-gray-400 dark:text-gray-500">
                          → {ej.toolId}
                        </p>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card>
                  <CardHead>Hechos e inferencias</CardHead>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Cada respuesta separa lo que se ha medido de lo que se ha
                    interpretado. Es la regla de diseño más importante del asistente.
                  </p>

                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                      <div className="flex items-center gap-2">
                        <Badge color="success" size="sm">
                          Hecho
                        </Badge>
                      </div>
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        Un dato leído directamente de los pedidos. Sin interpretación,
                        sin adjetivos. Es la parte en la que puedes confiar literalmente.
                      </p>
                    </div>

                    <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                      <div className="flex items-center gap-2">
                        <Badge color="info" size="sm">
                          Inferencia
                        </Badge>
                      </div>
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        Una observación sobre esos datos, siempre etiquetada con su tipo
                        y su confianza, y siempre apoyada en hechos concretos.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-300">
                      Tipos de inferencia que el asistente puede emitir
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(Object.keys(INFERENCIA_TIPO_LABEL) as TipoInferencia[]).map(
                        (t) => (
                          <Badge key={t} color="light" size="sm">
                            {INFERENCIA_TIPO_LABEL[t]}
                          </Badge>
                        ),
                      )}
                    </div>
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      Nótese que no existe un tipo «causa». El asistente nunca dice que
                      un dato provocó otro.
                    </p>
                  </div>

                  <div className="mt-4">
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-300">
                      Niveles de confianza
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(Object.keys(CONFIANZA_LABEL) as ConfianzaInferencia[]).map(
                        (c) => (
                          <Badge key={c} color={CONFIANZA_BADGE[c]} size="sm">
                            {CONFIANZA_LABEL[c]}
                          </Badge>
                        ),
                      )}
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-300">
                      Palabras que el asistente tiene prohibidas
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {TERMINOS_CAUSALES_PROHIBIDOS.map((t) => (
                        <span
                          key={t}
                          className="rounded-md border border-dashed border-gray-300 px-2 py-0.5 font-mono text-[11px] text-gray-400 dark:border-gray-700 dark:text-gray-500"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      Si alguna se colara en una respuesta, se sustituye por «coincide
                      con» antes de mostrártela.
                    </p>
                  </div>
                </Card>
              </>
            )}

            {/* ───────────── HERRAMIENTAS ───────────── */}
            {seccion === "herramientas" && (
              <>
                <Card>
                  <CardHead>Tu alcance sobre las herramientas</CardHead>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Una herramienta solo llega al asistente si su módulo está habilitado
                    y tú tienes todos los permisos que exige. El filtro es fail-closed:
                    ante la duda, no se expone.
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-white/[0.02]">
                    <span className="text-2xl font-bold text-gray-800 dark:text-white/90">
                      {disponibles.length}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      de {totales} herramientas disponibles para tu rol
                    </span>
                  </div>
                </Card>

                <Card>
                  <CardHead>Herramientas disponibles</CardHead>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Lo que el asistente puede ejecutar cuando preguntas tú. Se lee del
                    registro de herramientas en vivo.
                  </p>

                  <div className="mt-4 space-y-2">
                    {disponibles.map((t) => (
                      <div
                        key={t.id}
                        className="rounded-lg border border-gray-200 p-3 dark:border-gray-800"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-sm font-medium text-gray-800 dark:text-white/90">
                            {t.name}
                          </span>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge color={NIVEL_BADGE[t.level as NivelTool]} size="sm">
                              {NIVEL_LABEL[t.level as NivelTool]}
                            </Badge>
                            {t.requiredCapabilities.map((cap) => (
                              <Badge key={cap} color="light" size="sm">
                                {cap}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                          {t.description}
                        </p>
                        <p className="mt-1 font-mono text-[11px] text-gray-400 dark:text-gray-500">
                          {t.id}
                        </p>
                      </div>
                    ))}

                    {disponibles.length === 0 && (
                      <p className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                        Ninguna herramienta disponible con tus permisos actuales.
                      </p>
                    )}
                  </div>
                </Card>

                <Card>
                  <CardHead>Niveles de herramienta</CardHead>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    No todas las herramientas ejercen el mismo poder. Esta versión del
                    asistente solo admite las dos primeras.
                  </p>

                  <div className="mt-4">
                    {(Object.keys(NIVEL_LABEL) as NivelTool[]).map((n) => (
                      <div key={n} className={filaBase}>
                        <Label2 titulo={NIVEL_LABEL[n]} descripcion={NIVEL_DESCRIPCION[n]} />
                        <Badge color={NIVEL_BADGE[n]} size="sm">
                          {nivelOperativo(n) ? "Disponible" : "Reservado"}
                        </Badge>
                      </div>
                    ))}
                  </div>

                  <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                    Los niveles «Recomendación» y «Ejecución» están definidos en el
                    contrato pero no implementados. Si alguna vez se activaran, el
                    asistente dejaría de ser de solo lectura — por eso se muestran aquí.
                  </p>
                </Card>
              </>
            )}

            {/* ───────────── CONVERSACIONES ───────────── */}
            {seccion === "historial" && (
              <>
                <Card>
                  <CardHead>Conversaciones guardadas</CardHead>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Los hilos del asistente se conservan en este navegador para que
                    puedas retomar una consulta. No salen de aquí.
                  </p>

                  <div className="mt-4">
                    <div className={filaBase}>
                      <Label2
                        titulo="Hilos guardados"
                        descripcion="Conversaciones conservadas en este navegador."
                      />
                      <span className="text-sm font-medium text-gray-800 dark:text-white/90">
                        {hilos}
                      </span>
                    </div>

                    <div className={filaBase}>
                      <Label2
                        titulo="Mensajes en total"
                        descripcion="Suma de todos los mensajes, tuyos y del asistente."
                      />
                      <span className="text-sm font-medium text-gray-800 dark:text-white/90">
                        {mensajesTotales}
                      </span>
                    </div>

                    <div className={filaBase}>
                      <Label2
                        titulo="Dónde se guardan"
                        descripcion="El almacenamiento local del navegador. Sin servidor."
                      />
                      <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
                        localStorage
                      </span>
                    </div>

                    <div className={filaBase}>
                      <Label2
                        titulo="Quién más los ve"
                        descripcion="Ámbito de visibilidad de las conversaciones."
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Solo tú, en este navegador
                      </span>
                    </div>
                  </div>
                </Card>

                <Card>
                  <CardHead>Borrar el historial</CardHead>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Vacía el hilo de la conversación activa. Las demás conversaciones se
                    conservan hasta que las borres una a una desde el propio asistente.
                  </p>

                  <div className="mt-4">
                    <Button
                      variant="outline"
                      onClick={() => assistantStore.limpiar()}
                      disabled={assistantStore.mensajes.length === 0}
                    >
                      Vaciar la conversación activa
                    </Button>
                    {assistantStore.mensajes.length === 0 && (
                      <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                        La conversación activa ya está vacía.
                      </p>
                    )}
                  </div>
                </Card>
              </>
            )}

            {/* ───────────── ALCANCE Y LÍMITES ───────────── */}
            {seccion === "alcance" && (
              <>
                <Card>
                  <CardHead>Lo que NECTO AI no hace</CardHead>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Un asistente sin límites declarados es un asistente en el que no se
                    puede confiar. Estos son los suyos, y son propiedades reales del
                    sistema, no advertencias genéricas.
                  </p>

                  <ul className="mt-4 space-y-3">
                    {LIMITES_ASISTENTE.map((l) => (
                      <li
                        key={l.titulo}
                        className="flex gap-3 rounded-xl border border-gray-200 p-4 dark:border-gray-800"
                      >
                        <LockIcon className="mt-0.5 h-5 w-5 shrink-0 text-gray-400 dark:text-gray-500" />
                        <div>
                          <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                            {l.titulo}
                          </p>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {l.detalle}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </Card>

                <Card>
                  <CardHead>Ningún dato sale de la aplicación</CardHead>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    La aplicación es una maqueta sin servidor. No hay ninguna dirección
                    externa a la que enviar nada, aunque alguien la configurara.
                  </p>

                  <div className="mt-4">
                    <div className={filaBase}>
                      <Label2
                        titulo="Servidor"
                        descripcion="Backend que procese las preguntas."
                      />
                      <Badge color="light" size="sm">
                        No existe
                      </Badge>
                    </div>

                    <div className={filaBase}>
                      <Label2
                        titulo="Clave de API"
                        descripcion="Credencial para un servicio de lenguaje."
                      />
                      <Badge color="light" size="sm">
                        No existe
                      </Badge>
                    </div>

                    <div className={filaBase}>
                      <Label2
                        titulo="Modelo de lenguaje"
                        descripcion="Servicio externo de generación de texto."
                      />
                      <Badge color="light" size="sm">
                        No existe
                      </Badge>
                    </div>

                    <div className={filaBase}>
                      <Label2
                        titulo="Envío de datos a terceros"
                        descripcion="Cualquier salida de datos hacia fuera."
                      />
                      <Badge color="light" size="sm">
                        Ninguna
                      </Badge>
                    </div>
                  </div>

                  <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                    Por eso no verás aquí campos para claves, modelos, temperatura ni
                    memoria del asistente: no habría nada al otro lado que los leyera.
                  </p>
                </Card>
              </>
            )}

            {/* ───────────── APARIENCIA ───────────── */}
            {seccion === "apariencia" && (
              <Card>
                <CardHead>Presentación del asistente</CardHead>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Preferencias de esta interfaz. No afectan a lo que el asistente
                  responde ni a los datos que consulta.
                </p>

                <div className="mt-4">
                  <div className={filaBase}>
                    <Label2
                      titulo="Densidad del hilo"
                      descripcion={
                        OPCIONES_DENSIDAD.find((o) => o.value === densidad)?.detalle ?? ""
                      }
                    />
                    <Segmentado
                      opciones={OPCIONES_DENSIDAD.map((o) => ({
                        value: o.value,
                        label: o.label,
                      }))}
                      valor={densidad}
                      onCambiar={(v) => setDensidad(v as DensidadAsistente)}
                      etiqueta="Densidad del hilo"
                    />
                  </div>

                  <div className={filaBase}>
                    <Label2
                      titulo="Longitud de las respuestas"
                      descripcion={
                        OPCIONES_RESPUESTA.find((o) => o.value === longitud)?.detalle ?? ""
                      }
                    />
                    <Segmentado
                      opciones={OPCIONES_RESPUESTA.map((o) => ({
                        value: o.value,
                        label: o.label,
                      }))}
                      valor={longitud}
                      onCambiar={(v) => setLongitud(v as LongitudRespuesta)}
                      etiqueta="Longitud de las respuestas"
                    />
                  </div>

                  <div className={filaBase}>
                    <Label2
                      titulo="Tema de la aplicación"
                      descripcion="Compartido con el resto de la aplicación, no solo con el asistente."
                    />
                    <Switch
                      color={SWITCH_COLOR}
                      checked={uiStore.theme === "dark"}
                      onChange={(v) => uiStore.setTheme(v ? "dark" : "light")}
                      aria-label="Tema oscuro"
                    />
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* El pie de guardado NO existe en esta página: salvo el tema, que se
              aplica al instante, no hay nada que persistir. Mostrar un botón
              «Guardar» sin nada que guardar sería un control decorativo. */}
        </div>
      </div>
    </>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS DE DOMINIO
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Lee del registro REAL de herramientas la lista visible para el operador
 * actual, aplicando exactamente el mismo filtro que usa el motor (módulos
 * habilitados ∩ capacidades), y devuelve también el total sin filtrar.
 *
 * Por qué se hace aquí y no en el store: `toolRegistry` y `buildAccessContext`
 * son el cableado del núcleo (`src/assistant/bootstrap.ts`), no estado
 * observable de MobX. La página los consulta en el render, igual que hace el
 * motor en cada pregunta, así que lo que se muestra y lo que ocurre no pueden
 * divergir. No se reimplementa el filtro: se le pide al registry.
 */
function herramientasVisibles() {
  const access = buildAccessContext();
  const disponibles = toolRegistry.getAvailableTools({ access });

  // Total sin filtro: se cuentan las tools de todos los providers registrados
  // pidiéndolas con un contexto permisivo, para poder decir "N de M" sin
  // inventar M. Se copia a un array mutable porque `enabledModules` es
  // `Modulo[]`: el catálogo lo declara `as const` para que nadie lo mute.
  const permisivo = {
    enabledModules: [...MODULOS_CONOCIDOS] as Modulo[],
    hasCapability: () => true,
  };
  const totales = toolRegistry.getAvailableTools({ access: permisivo }).length;

  return { disponibles, totales };
}

/**
 * Los pasos del razonamiento del motor, en orden. Se declaran como datos para
 * que el texto de la página y el comportamiento documentado del motor sean la
 * misma cosa: cada paso corresponde a una fase real de `LocalRuleEngine.ask`.
 */
const PASOS: { titulo: string; detalle: string }[] = [
  {
    titulo: "Filtra las herramientas de tu rol",
    detalle:
      "Antes de mirar la pregunta, descarta toda herramienta cuyo módulo no esté habilitado o cuyos permisos no tengas.",
  },
  {
    titulo: "Reconoce la intención",
    detalle:
      "Normaliza el texto (minúsculas, sin acentos) y busca la primera regla cuya palabra clave aparezca.",
  },
  {
    titulo: "Resuelve la herramienta",
    detalle:
      "Vuelve a comprobar la autorización sobre la herramienta concreta. Si dejó de estar permitida, no se ejecuta.",
  },
  {
    titulo: "Ejecuta la consulta",
    detalle:
      "Solo se admiten herramientas de nivel consulta o análisis. Cualquier otra se rechaza con un aviso.",
  },
  {
    titulo: "Redacta separando hechos de observaciones",
    detalle:
      "Escribe los datos medidos y, aparte, las interpretaciones con su tipo y su confianza. Nunca afirma causas.",
  },
];

export default AsistenteConfigPage;

// ═══════════════════════════════════════════════════════════════════════════
// SUBCOMPONENTES LOCALES
// ═══════════════════════════════════════════════════════════════════════════
//
// Composiciones de elementos del catálogo, no sustitutos de ninguno. Se evita
// `ButtonsGroup` porque fija `min-w-[393px]`/`min-w-[309px]` y rompería el ancho
// de la tarjeta (mismo hallazgo que en la configuración del canal).
//
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Label2 — etiqueta con descripción secundaria, alineada a la izquierda de una
 * fila. La descripción explica QUÉ es el valor, no lo repite.
 */
function Label2({ titulo, descripcion }: { titulo: string; descripcion: string }) {
  return (
    <div className="min-w-0">
      <Label>{titulo}</Label>
      <p className="mt-0.5 max-w-md text-xs text-gray-500 dark:text-gray-400">
        {descripcion}
      </p>
    </div>
  );
}

/** CardHead — encabezado estándar de una tarjeta de sección. */
function CardHead({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
      {children}
    </h3>
  );
}

/**
 * Segmentado — control de selección exclusiva de dos o más opciones.
 *
 * No es un `<select>` (el del catálogo es NO controlado) ni `ButtonsGroup` (ancho
 * mínimo fijo): se compone con el estilo de píldora ya usado en el proyecto.
 * `role="radiogroup"` + `aria-checked` para que la selección sea anunciable.
 */
function Segmentado({
  opciones,
  valor,
  onCambiar,
  etiqueta,
}: {
  opciones: { value: string; label: string }[];
  valor: string;
  onCambiar: (v: string) => void;
  etiqueta: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={etiqueta}
      className="flex shrink-0 gap-1 rounded-lg border border-gray-200 p-1 dark:border-gray-800"
    >
      {opciones.map((o) => {
        const activo = o.value === valor;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={activo}
            onClick={() => onCambiar(o.value)}
            className={
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors " +
              (activo
                ? "bg-gray-100 text-gray-900 dark:bg-white/[0.06] dark:text-white"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200")
            }
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
