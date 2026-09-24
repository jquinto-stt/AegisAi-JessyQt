import { useMemo, useState } from "react";
import { observer } from "mobx-react-lite";

import { PageMeta } from "@/shell/meta";
import { Alert } from "@/elements/ui/alert";
import { Badge } from "@/elements/ui/badge";
import { Button } from "@/elements/ui/button";
import { Card } from "@/elements/ui/card";
import { Input } from "@/elements/form/input";
import { Label } from "@/elements/form/label";
import { Switch } from "@/elements/form/switch";
import TextArea from "@/elements/form/textarea";
import {
  AlertIcon,
  BoltIcon,
  BoxCubeIcon,
  CartIcon,
  ChatIcon,
  CheckCircleIcon,
  DocsIcon,
  EyeIcon,
  InfoIcon,
  PlugInIcon,
  TimeIcon,
} from "@/icons";
import {
  conversacionesStore,
  integracionesStore,
  puede,
  puedeEditarPlantillas,
  motivoSinPermiso,
  pedidosStore,
  uiStore,
  ATENCION_LABEL,
  etiquetaEstado,
  MODULOS_INTEGRABLES,
  ORDEN_MODULOS_INTEGRABLES,
  type ModuloIntegrable,
  type PedidosConfig,
} from "@/stores";
import type { PlantillasWhatsApp } from "@/stores/pedidos.store";
import {
  CardHead,
  ChipDia,
  ConfigAcciones,
  ConfigHeader,
  ConfigSectionNav,
  ConfigShell,
  Label2,
  Segmentado,
  ToggleRow,
  claseFila,
  type GrupoNav,
} from "@/pages/config-layout";

/** Alias del token compartido de fila, para no tocar cada uso en el cuerpo. */
const filaBase = claseFila;
import {
  DIAS_ATENCION,
  ESTADO_CANAL_BADGE,
  ESTADO_CANAL_LABEL,
  ESTADO_INTEGRACION_BADGE,
  ESTADO_INTEGRACION_LABEL,
  FILAS_PLANTILLA,
  GRUPO_SECCION_LABEL,
  META_SECCION,
  OPCIONES_DENSIDAD,
  OPCIONES_TEMA,
  ORDEN_SECCIONES,
  SWITCH_COLOR,
  seccionesPorGrupo,
  type DensidadBandeja,
  type EstadoCanal,
  type EstadoIntegracionCanal,
  type IconoSeccion,
  type PreferenciaTema,
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
  ChatIcon,
  PlugInIcon,
  DocsIcon,
  TimeIcon,
  BoltIcon,
  InfoIcon,
  AlertIcon,
  EyeIcon,
};

// ═══════════════════════════════════════════════════════════════════════════
// METADATOS DEL CANAL
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Número de WhatsApp del negocio.
 *
 * NO es configuración editable: es la IDENTIDAD del canal, la clave por la que
 * se cruzan pedidos y conversaciones (`pedidosStore.porTelefono`). En este mock
 * vive en el seed del canal y se muestra como dato de solo lectura — dejar
 * editarlo sugeriría que cambiarlo reasocia los hilos existentes, y no lo hace.
 */
const NUMERO_CANAL = "+57 300 555 1122";

/**
 * Nombre visible del negocio en el canal.
 *
 * Es un dato de PRESENTACIÓN del canal: no existe un campo de nombre comercial
 * en `PedidosConfig` (que solo guarda ajustes operativos), así que no se puede
 * editar desde aquí ni se finge que sí. Se expone como lectura para dar contexto
 * a las plantillas, que son el contenido que el cliente ve.
 */
const NOMBRE_VISIBLE_CANAL = "Necto";

// ═══════════════════════════════════════════════════════════════════════════
// LAYOUT COMPARTIDO
// ═══════════════════════════════════════════════════════════════════════════
//
// La fila etiqueta/control, el encabezado de tarjeta, la etiqueta con
// descripción, el control segmentado y el chip de día viven ahora en
// `@/pages/config-layout`, junto con la cabecera de página y la navegación de
// secciones. Se importan en vez de redeclararse: antes esta página y la de
// Pedidos tenían cada una su copia y habían divergido, así que el mismo ajuste
// se veía distinto según por dónde entraras.
//
// `filaBase` es un alias local del token compartido `claseFila`: el cuerpo de la
// página tiene decenas de filas ya escritas contra ese nombre. Aliasarlo en vez
// de reescribirlas mantiene el diff del refactor legible y, sobre todo, hace
// que TODAS hereden el token único — que es el objetivo.

// ═══════════════════════════════════════════════════════════════════════════
// PRESENTACIÓN DE LOS MÓDULOS INTEGRABLES
// ═══════════════════════════════════════════════════════════════════════════
//
// La tarjeta de un módulo es una VISTA del catálogo `MODULOS_INTEGRABLES`, no
// una copia suya. Aquí vive solo lo que es presentación —el icono, su color, la
// chapa de versión y el nombre del proveedor—; el estado, la descripción y las
// capacidades se leen del catálogo.
//
// ── Por qué se separó (21/09) ─────────────────────────────────────────────
// Antes eran dos bloques escritos a mano, uno por módulo. El de Inventario se
// quedó afirmando «En desarrollo · Próximamente» con el interruptor
// deshabilitado cuando el módulo ya tenía proveedor, cuatro rutas y su
// `disponible: true` — y encima con el estado real ya calculado tres líneas más
// arriba. Un control que miente, que es el defecto que el propio catálogo de
// integrables dice por escrito que hay que evitar.
//
// La copia no fue el problema: fue el síntoma. El problema es que la tarjeta
// pudiera afirmar del módulo algo distinto de lo que el asistente tiene
// registrado. Con una sola fuente, no puede.
//
// Es `Record<ModuloIntegrable, …>`: añadir un módulo integrable sin darle
// presentación es un error de compilación, no una tarjeta en blanco.

interface PresentacionIntegrable {
  /** Glifo del módulo. */
  Icono: React.FC<React.SVGProps<SVGSVGElement>>;
  /** Clases del cuadro del icono (fondo + tinta), en claro y en oscuro. */
  tono: string;
  /** Nombre del proveedor de datos, en el pie de la tarjeta. */
  proveedor: string;
  /** Chapa junto al nombre: versión del plugin. */
  version: string;
}

const PRESENTACION_INTEGRABLE: Record<ModuloIntegrable, PresentacionIntegrable> = {
  pedidos: {
    Icono: CartIcon,
    tono: "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400",
    proveedor: "Núcleo de Pedidos",
    version: "Plugin oficial · v1.2",
  },
  inventario: {
    Icono: BoxCubeIcon,
    // Tono de aviso, no de marca: el naranja de la marca es el acento de Pedidos
    // en esta misma pantalla y dos tarjetas contiguas del mismo color se leerían
    // como el mismo módulo.
    tono: "bg-warning-50 text-warning-600 dark:bg-warning-500/10 dark:text-warning-400",
    proveedor: "Núcleo de Inventario",
    // v1.0 es la primera versión: el proveedor se registró el 21/09.
    version: "Plugin oficial · v1.0",
  },
};

/** Clases de la chapa de versión. Igual en los dos módulos, a propósito. */
const TONO_VERSION =
  "bg-gray-100 text-gray-600 dark:bg-white/[0.06] dark:text-gray-400";

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
 * Navegación vertical de 7 secciones en 3 grupos (CANAL / MENSAJERÍA /
 * PREFERENCIAS). Es navegación por PESTAÑAS reales: solo una sección está
 * montada a la vez, sin scroll-spy ni secciones apiladas. El catálogo de
 * secciones vive en `configuracion.secciones.ts`.
 *
 * ── Estado ────────────────────────────────────────────────────────────────
 * Borrador local (`useState`) copiado de `pedidosStore.config` al montar, y
 * confirmado solo al pulsar Guardar. `Descartar cambios` re-copia el borrador
 * desde el store sin diálogo de confirmación (es una acción reversible: basta
 * volver a editar).
 *
 * ── Autorización ──────────────────────────────────────────────────────────
 * La ruta exige `channels.manage`. Si además faltara para las plantillas
 * (rol con `settings.manage` pero sin `channels.manage` entrando por otra ruta),
 * la página entra en **modo solo lectura**: se muestra un aviso arriba, los
 * campos quedan en un `<fieldset disabled>` y los dos botones quedan
 * deshabilitados pero VISIBLES. Se deshabilita en vez de ocultar porque ocultar
 * el botón de guardado haría creer que la página no guarda nada — el mismo
 * criterio que `pages/pedidos/ConfigPage.tsx`.
 */
export const ConfigPage = observer(() => {
  // ── Estado local de la superficie (no es estado de dominio) ──
  const [seccion, setSeccion] = useState<SeccionCanal>("perfil");
  const [guardado, setGuardado] = useState(false);

  // ── Preferencias locales de UI (sin fuente de verdad de negocio) ──
  const [tema, setTema] = useState<PreferenciaTema>("sistema");
  const [densidad, setDensidad] = useState<DensidadBandeja>("comoda");

  // ── Borrador: copia profunda de la config persistida ──
  // Se clonan los sub-objetos y arrays para que editar el borrador NO mute el
  // store antes de guardar. Sin el clon, `draft.horario.dias` sería el MISMO
  // array que el del store y `toggleDia` escribiría en el estado confirmado en
  // cada clic — el borrador dejaría de ser un borrador.
  const copiaDe = (): PedidosConfig => ({
    ...pedidosStore.config,
    modalidades: [...pedidosStore.config.modalidades],
    plantillas: { ...pedidosStore.config.plantillas },
    catalogo: pedidosStore.config.catalogo.map((c) => ({ ...c })),
    aliasEstados: { ...pedidosStore.config.aliasEstados },
    aliasModalidades: { ...pedidosStore.config.aliasModalidades },
    horario: { ...pedidosStore.config.horario, dias: [...pedidosStore.config.horario.dias] },
    tiemposObjetivo: { ...pedidosStore.config.tiemposObjetivo },
    alertaAtencion: { ...pedidosStore.config.alertaAtencion },
  });

  const [draft, setDraft] = useState<PedidosConfig>(copiaDe);

  // ── Autorización ──
  // `channels.manage` gobierna TODA la página (es la capacidad de la ruta), así
  // que el modo solo lectura se evalúa una vez. `motivoSinPermiso` construye el
  // texto desde `CAPACIDAD_LABEL`: ninguna pantalla escribe el motivo a mano.
  const puedeGestionarCanal = puedeEditarPlantillas();
  const soloLectura = !puedeGestionarCanal;
  const motivo = motivoSinPermiso("channels.manage");

  // ── Navegación: agrupación derivada del catálogo, calculada una vez ──
  //
  // El catálogo (`configuracion.secciones.ts`) es la fuente de verdad del
  // vocabulario; aquí solo se RESUELVE el nombre del icono contra el mapa
  // explícito y se pasa la forma que consume `<ConfigSectionNav>`. La página no
  // escribe ninguna etiqueta de sección: todas salen de `META_SECCION`.
  const grupos: GrupoNav[] = useMemo(
    () =>
      seccionesPorGrupo().map(({ grupo, secciones }) => ({
        grupo,
        label: GRUPO_SECCION_LABEL[grupo],
        secciones: secciones.map((s) => ({
          key: s,
          label: META_SECCION[s].label,
          hint: META_SECCION[s].hint,
          icono: ICONO_SECCION[META_SECCION[s].icono],
        })),
      })),
    [],
  );

  // ── Setters del borrador ──
  // Todos marcan `guardado = false`: cualquier edición invalida el aviso de
  // "Guardado", que si no quedaría afirmando algo falso.
  const set = <K extends keyof PedidosConfig>(k: K, v: PedidosConfig[K]) => {
    setDraft((prev) => ({ ...prev, [k]: v }));
    setGuardado(false);
  };

  const setPlantilla = (key: keyof PlantillasWhatsApp, value: string) => {
    setDraft((prev) => ({ ...prev, plantillas: { ...prev.plantillas, [key]: value } }));
    setGuardado(false);
  };

  /**
   * Edita el texto del aviso de pausa.
   *
   * Se apoya en la plantilla `cancelado` en vez de un campo nuevo: es el único
   * texto del modelo que se usa como mensaje de cierre cuando el canal no puede
   * atender, y crear un campo aparte sería un segundo sitio donde guardar el
   * mismo mensaje. La sección "Plantillas de mensaje" edita el MISMO valor, para
   * que las dos superficies no puedan discrepar.
   */
  const setPlantillaVigilada = (value: string) => setPlantilla("cancelado", value);

  const setHorario = <K extends keyof PedidosConfig["horario"]>(k: K, v: PedidosConfig["horario"][K]) => {
    setDraft((prev) => ({ ...prev, horario: { ...prev.horario, [k]: v } }));
    setGuardado(false);
  };

  const toggleDia = (d: number) => {
    setDraft((prev) => {
      const dias = prev.horario.dias.includes(d)
        ? prev.horario.dias.filter((x) => x !== d)
        : [...prev.horario.dias, d].sort((a, b) => a - b);
      return { ...prev, horario: { ...prev.horario, dias } };
    });
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
  const horarioInvalido = draft.horario.activo && draft.horario.cierre <= draft.horario.apertura;
  const puedeGuardar = !soloLectura && !horarioInvalido;

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

  // Preferencia de tema: el store del shell solo modela `light | dark`, así que
  // "sistema" se resuelve AQUÍ antes de escribir en él. No se amplía el contrato
  // de `uiStore`, compartido por toda la aplicación.
  const aplicarTema = (v: PreferenciaTema) => {
    setTema(v);
    if (v === "sistema") return; // "sistema" no impone un tema: deja el actual.
    uiStore.setTheme(v === "oscuro" ? "dark" : "light");
  };

  /**
   * Estado de conexión del canal, DERIVADO del horario real.
   *
   * No hay un campo "conectado" en la configuración, así que no se inventa uno
   * ni se guarda un badge propio: un segundo booleano sería un sitio más donde
   * afirmar lo mismo que ya dice `horario.activo`, y ambos podrían divergir. Se
   * deriva del único ajuste real de disponibilidad que existe en el modelo, y la
   * etiqueta sale de `ESTADO_CANAL_LABEL` — nunca de un literal en el JSX.
   */
  const estadoCanal: EstadoCanal = draft.horario.activo ? "conectado" : "pausado";

  // ── Encabezado de la sección activa ──
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
          descripcion="Identidad del canal, plantillas, horario, escalado y alertas de WhatsApp."
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

      <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
        {/* ═══════════ Navegación vertical de secciones ═══════════ */}
        {/* Va FUERA del `<fieldset>` a propósito: navegar entre secciones no es
            editar. Metido dentro, `fieldset disabled` desactiva sus botones y en
            modo solo lectura el usuario no podría ni cambiar de sección para
            consultar. */}
        <ConfigSectionNav
          grupos={grupos}
          activa={seccion}
          onSeleccionar={(k) => setSeccion(k as SeccionCanal)}
          ariaLabel="Secciones de configuración del canal"
        />

        {/* ═══════════ Panel de contenido: UNA sección montada ═══════════ */}
        {/*
          El panel es un <fieldset>: deshabilitarlo desactiva NATIVAMENTE todos
          los inputs, switches y textareas de dentro sin cablear `disabled` en
          cada control. `min-w-0` neutraliza el `min-inline-size` por defecto del
          fieldset, que rompería el layout de dos columnas.

          Envuelve SOLO el panel, NO la navegación: `fieldset disabled` también
          desactiva los `<button>` de dentro, y la nav es navegación, no edición.
        */}
        <fieldset disabled={soloLectura} className="m-0 min-w-0 flex-1 border-0 p-0">
          {/* El `key={seccion}` es lo que dispara el fundido: al cambiar de
              sección React desmonta el panel entero y monta uno nuevo, y el
              nuevo reproduce `animate-aparecer`. Sin la key reutilizaría el
              mismo nodo, la clase no cambiaría y la sección se sustituiría de
              golpe — el defecto que se corrige.

              Fundido PURO, sin desplazamiento: el panel nuevo ocupa el sitio del
              anterior, así que moverlo sugeriría que viene de algún lado. Cuando
              dos contenidos comparten el mismo hueco, lo correcto es que uno se
              apague y el otro se encienda. */}
          <ConfigShell
            seccionKey={seccion}
            titulo={meta.label}
            hint={meta.hint}
            footer={
              <>
                {/* Pie fijo: siempre visible, en toda sección. Se compone con
                    `ConfigAcciones` —el mismo patrón de botones que las otras
                    dos pantallas— y no con `ButtonsGroup`, que fija un ancho
                    mínimo y rompería la alineación a la derecha. */}
                <ConfigAcciones
                  fija
                  mensaje={
                    guardado ? (
                      <span className="text-sm text-success-600 dark:text-success-500">
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
            }
          >
              {/* ───────────── PERFIL DEL CANAL ───────────── */}
              {seccion === "perfil" && (
                <>
                  <Card>
                    <CardHead>Identidad del canal</CardHead>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Datos de identificación de la línea de WhatsApp conectada.
                    </p>

                    <div className="mt-4">
                      <div className={filaBase}>
                        <Label2
                          titulo="Número conectado"
                          descripcion="Es la clave por la que los pedidos encuentran su conversación."
                        />
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium tabular-nums text-gray-800 dark:text-white/90">
                            {NUMERO_CANAL}
                          </span>
                          <Badge color={ESTADO_CANAL_BADGE[estadoCanal]} size="sm">
                            {ESTADO_CANAL_LABEL[estadoCanal]}
                          </Badge>
                        </div>
                      </div>

                      <div className={filaBase}>
                        <Label2
                          titulo="Nombre visible"
                          descripcion="Cómo aparece el negocio en la bandeja y en el simulador."
                        />
                        <div className="w-full sm:w-72">
                          <Input
                            id="canal-nombre"
                            value={NOMBRE_VISIBLE_CANAL}
                            readOnly
                            aria-label="Nombre visible del canal"
                          />
                          <p className="mt-1.5 text-xs text-gray-400">
                            El nombre comercial se gestiona con los datos del negocio.
                          </p>
                        </div>
                      </div>
                    </div>
                  </Card>

                  <Card>
                    <CardHead>Pausa del canal</CardHead>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Estado de la línea y de la cola de atención. El número y el nombre son datos
                      de identidad del canal: no se editan desde aquí.
                    </p>

                    <div className="mt-4">
                      <div className={filaBase}>
                        <Label2
                          titulo="Número conectado"
                          descripcion="Clave por la que cada pedido encuentra su conversación."
                        />
                        <span className="text-sm font-medium tabular-nums text-gray-800 dark:text-white/90">
                          {NUMERO_CANAL}
                        </span>
                      </div>

                      <div className={filaBase}>
                        <Label2 titulo="Nombre visible" descripcion="Cómo aparece el negocio en el canal." />
                        <span className="text-sm font-medium text-gray-800 dark:text-white/90">
                          {NOMBRE_VISIBLE_CANAL}
                        </span>
                      </div>

                      <div className={filaBase}>
                        <Label2
                          titulo={`Hilos ${etiquetaEstado("en_espera").toLowerCase()}`}
                          descripcion="Hilos que pidieron un asesor humano y siguen sin respuesta."
                        />
                        {/* Selector del store, no un conteo en la vista. Es el
                            MISMO valor que muestra la tarjeta de Inicio: si se
                            contara aquí, dos superficies podrían discrepar.

                            El rótulo usa la etiqueta CANÓNICA del estado en vez
                            de «Clientes esperando», que era un cuarto nombre
                            para el mismo `en_espera`. Así la cifra del filtro,
                            la del badge y la de esta fila dicen lo mismo. */}
                        <Badge
                          color={
                            conversacionesStore.totalRequierenAtencion > 0 ? "warning" : "success"
                          }
                          size="sm"
                        >
                          {conversacionesStore.totalRequierenAtencion}
                        </Badge>
                      </div>
                    </div>
                  </Card>
                </>
              )}

              {/* ───────────── MÓDULOS CONECTADOS ───────────── */}
              {seccion === "modulos" && (
                <>
                  <Card>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <CardHead>Módulos conectados al canal</CardHead>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          Habilita o desconecta módulos del negocio. Cada módulo conectado aporta capacidades operativas al bot y pestañas de contexto en cada conversación de WhatsApp.
                        </p>
                      </div>
                      <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 dark:bg-white/[0.04]">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          Módulos activos:
                        </span>
                        <span className="text-sm font-bold text-gray-800 dark:text-white">
                          {integracionesStore.modulosHabilitados.length} / {ORDEN_MODULOS_INTEGRABLES.length}
                        </span>
                      </div>
                    </div>

                    <div className="mt-6 grid grid-cols-1 gap-5">
                      {/* Una tarjeta por módulo del catálogo, en su orden canónico.
                          Ninguna rama pregunta «¿es pedidos?»: el estado, la
                          descripción y las capacidades se leen de
                          `MODULOS_INTEGRABLES`, y solo el icono, su color y la
                          chapa de versión son presentación. */}
                      {integracionesStore.entradas.map(({ id, entrada }) => {
                        const { Icono, tono, proveedor, version } =
                          PRESENTACION_INTEGRABLE[id];
                        const conectado = integracionesStore.estaConectado(id);

                        // El estado se deriva de dos hechos independientes: si el
                        // módulo existe (catálogo) y si está conectado (store). La
                        // pantalla no decide nada por su cuenta.
                        const estado: EstadoIntegracionCanal = !entrada.disponible
                          ? "no_disponible"
                          : conectado
                            ? "conectado"
                            : "desconectado";

                        return (
                          <div
                            key={id}
                            className="relative overflow-hidden rounded-2xl border border-gray-200/90 bg-white p-5 shadow-theme-xs transition-all hover:border-gray-300 dark:border-white/10 dark:bg-gray-900/60 dark:hover:border-white/20"
                          >
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                              <div className="flex items-start gap-4">
                                <div
                                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-theme-xs ${tono}`}
                                >
                                  <Icono className="h-6 w-6" />
                                </div>

                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2.5">
                                    <h3 className="text-base font-semibold text-ink-title dark:text-white">
                                      Módulo de {entrada.label}
                                    </h3>
                                    <Badge color={ESTADO_INTEGRACION_BADGE[estado]} size="sm">
                                      {ESTADO_INTEGRACION_LABEL[estado]}
                                    </Badge>
                                    <span
                                      className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${TONO_VERSION}`}
                                    >
                                      {version}
                                    </span>
                                  </div>
                                  <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                                    {entrada.descripcion}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 self-end sm:self-start shrink-0">
                                {/* El estado, también aquí, y no «Habilitado» /
                                    «Deshabilitado»: en un módulo declarado sin
                                    proveedor «Deshabilitado» sugeriría que basta
                                    con pulsarlo. */}
                                <span className="text-xs font-medium text-gray-400 dark:text-gray-500 sm:hidden">
                                  {ESTADO_INTEGRACION_LABEL[estado]}
                                </span>
                                <Switch
                                  color={SWITCH_COLOR}
                                  checked={conectado}
                                  // Dos motivos distintos para deshabilitar, y los
                                  // dos ciertos: sin permiso de escritura no se
                                  // toca, y un módulo sin proveedor no tiene nada
                                  // que conectar.
                                  disabled={soloLectura || !entrada.disponible}
                                  onChange={() => integracionesStore.alternar(id)}
                                  aria-label={`Conectar módulo ${entrada.label} al canal`}
                                />
                              </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5">
                              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
                                {entrada.disponible
                                  ? "Capacidades habilitadas en el chat"
                                  : "Capacidades planificadas"}
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {entrada.ejemplos.map((capacidad) => (
                                  <span
                                    key={capacidad}
                                    className={
                                      entrada.disponible
                                        ? "inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50/70 px-2.5 py-1 text-xs text-gray-700 dark:border-white/10 dark:bg-white/[0.03] dark:text-gray-300"
                                        : "inline-flex items-center gap-1.5 rounded-lg border border-dashed border-gray-200 bg-gray-50/50 px-2.5 py-1 text-xs text-gray-500 dark:border-white/10 dark:bg-white/[0.02] dark:text-gray-400"
                                    }
                                  >
                                    <CheckCircleIcon
                                      className={`h-3.5 w-3.5 shrink-0 ${
                                        entrada.disponible ? "text-success-500" : "text-gray-400"
                                      }`}
                                    />
                                    {capacidad}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* Un módulo declarado que todavía no existe se
                                explica; no se disfraza de módulo apagado. */}
                            {!entrada.disponible && (
                              <div className="mt-4">
                                <Alert
                                  variant="info"
                                  title="Módulo declarado en el catálogo"
                                  message="Este módulo está registrado en la arquitectura del sistema, pero todavía no tiene proveedor de herramientas. El interruptor se habilitará solo el día que lo tenga: no se puede conectar algo que aún no hay."
                                />
                              </div>
                            )}

                            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[11px] text-gray-400 dark:text-gray-500">
                              <div className="flex items-center gap-4">
                                <span>Proveedor: {proveedor}</span>
                                {entrada.disponible && (
                                  <span>Permiso: {entrada.capacidad}</span>
                                )}
                              </div>
                              <span>
                                {entrada.disponible
                                  ? "Sincronización: En tiempo real"
                                  : "Estado: Pendiente de conector"}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>

                  <Card>
                    <CardHead>Impacto de los módulos en las conversaciones</CardHead>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Cómo se reflejan estos plugins en la experiencia del operador dentro de la bandeja de entrada.
                    </p>

                    <div className="mt-4">
                      <div className={filaBase}>
                        <Label2
                          titulo="Pestañas activas en el chat"
                          descripcion="Cada módulo conectado añade una pestaña de contexto operativo junto a los mensajes."
                        />
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge color="light" size="sm">
                            Conversación
                          </Badge>
                          {integracionesStore.modulosHabilitados.map((m) => (
                            <Badge key={m} color="success" size="sm">
                              {MODULOS_INTEGRABLES[m].label}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className={filaBase}>
                        <Label2
                          titulo="Disponibilidad para asesores"
                          descripcion="Herramientas y vistas operativas habilitadas para los operadores del canal."
                        />
                        <span className="text-sm font-medium text-gray-800 dark:text-white/90">
                          {integracionesStore.estaConectado("pedidos")
                            ? "Operativa con módulo de Pedidos"
                            : "Canal básico (sin módulos operativos)"}
                        </span>
                      </div>
                    </div>
                  </Card>
                </>
              )}

              {/* ───────────── PLANTILLAS DE MENSAJE ───────────── */}
              {seccion === "plantillas" && (
                <Card>
                  <div className="flex flex-wrap items-center gap-2">
                    <CardHead>Mensajes por transición</CardHead>
                    <Badge color="light" size="sm">
                      Solo referencia
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Guion sugerido para el equipo. En este mock <strong>no se envía nada</strong> a
                    WhatsApp; el texto sirve como referencia del mensaje en cada paso.
                  </p>

                  <div className="mt-4">
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
                </Card>
              )}

              {/* ───────────── HORARIO DE ATENCIÓN ───────────── */}
              {seccion === "horario" && (
                <Card>
                  <CardHead>Horario de atención</CardHead>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Días y horas en que el negocio recibe pedidos. Fuera de horario se puede sugerir
                    programar el pedido.
                  </p>

                  <div className="mt-4">
                    <div className={filaBase}>
                      <Label2
                        titulo="Aplicar horario"
                        descripcion="Si está desactivado, el canal atiende a cualquier hora."
                      />
                      <Switch
                        checked={draft.horario.activo}
                        onChange={(v) => setHorario("activo", v)}
                        color={SWITCH_COLOR}
                        aria-label="Aplicar horario de atención"
                      />
                    </div>
                  </div>

                  {draft.horario.activo && (
                    <div className="mt-5 space-y-5 border-t border-gray-100 pt-5 dark:border-white/5">
                      <div>
                        <Label htmlFor="canal-horario-dias">Días de atención</Label>
                        <div className="flex flex-wrap gap-2" id="canal-horario-dias">
                          {DIAS_ATENCION.map(({ d, label, largo }) => (
                            <ChipDia
                              key={d}
                              activo={draft.horario.dias.includes(d)}
                              label={label}
                              titulo={largo}
                              onClick={() => toggleDia(d)}
                            />
                          ))}
                        </div>
                        <p className="mt-2 text-xs text-gray-400">
                          {draft.horario.dias.length === 0
                            ? "Sin días seleccionados: el horario no aplica ningún día."
                            : `${draft.horario.dias.length} de 7 días seleccionados.`}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:max-w-md">
                        <div>
                          <Label htmlFor="canal-horario-apertura">Apertura</Label>
                          <Input
                            id="canal-horario-apertura"
                            type="time"
                            value={draft.horario.apertura}
                            onChange={(e) => setHorario("apertura", e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="canal-horario-cierre">Cierre</Label>
                          <Input
                            id="canal-horario-cierre"
                            type="time"
                            value={draft.horario.cierre}
                            onChange={(e) => setHorario("cierre", e.target.value)}
                            error={horarioInvalido}
                          />
                        </div>
                      </div>

                      {/* El borde rojo del campo, por sí solo, no explica el
                          bloqueo: se acompaña del motivo textual, igual que en
                          la configuración de pedidos. */}
                      {horarioInvalido && (
                        <p className="mt-2 text-xs text-error-500">
                          La hora de cierre debe ser mayor que la de apertura.
                        </p>
                      )}
                    </div>
                  )}
                </Card>
              )}

              {/* ───────────── AUTOMATIZACIÓN Y ESCALADO ───────────── */}
              {seccion === "automatizacion" && (
                <>
                  <Card>
                    <CardHead>Atención en el canal</CardHead>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Cómo se reparte la atención entre el bot y los asesores. Se lee del estado
                      real de los hilos.
                    </p>

                    <div className="mt-4">
                      <div className={filaBase}>
                        <Label2
                          titulo="Hilos que lleva el bot"
                          descripcion="Conversaciones en modo bot: el cliente recibe solo respuestas automáticas."
                        />
                        {/* Conteo DERIVADO de la lista del store, no almacenado:
                            la atención por hilo es la fuente de verdad. */}
                        <Badge color="primary" size="sm">
                          {conversacionesStore.conversaciones.filter(
                            (c) => c.atencion === "bot",
                          ).length}
                        </Badge>
                      </div>

                      <div className={filaBase}>
                        <Label2
                          titulo="Hilos con asesor"
                          descripcion="Conversaciones ya escaladas a una persona del equipo."
                        />
                        <Badge color="info" size="sm">
                          {conversacionesStore.conversaciones.filter(
                            (c) => c.atencion === "humano",
                          ).length}
                        </Badge>
                      </div>

                      <div className={filaBase}>
                        <Label2
                          titulo="Etiquetas de atención"
                          descripcion="Vocabulario del eje de atención, tal como se rotula en la consola."
                        />
                        <div className="flex flex-wrap gap-2">
                          <Badge color="primary" size="sm">
                            {ATENCION_LABEL.bot}
                          </Badge>
                          <Badge color="info" size="sm">
                            {ATENCION_LABEL.humano}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/*
                    Bloque INFORMATIVO, de solo lectura. Documenta el invariante
                    de handoff que gobierna la consola de conversaciones, para que
                    quien configura el canal entienda por qué un mensaje de
                    negocio no aparece en un hilo tomado por el bot. El
                    invariante se aplica en los stores y no se puede editar
                    desde aquí: exponer un interruptor sugeriría que la regla es
                    opcional, y no lo es.
                  */}
                  <Alert
                    variant="info"
                    title="Cómo funciona el traspaso bot ↔ asesor"
                    message="Mientras la atención está en modo bot, ningún mensaje del negocio entra al hilo: el cliente recibe solo respuestas automáticas. Al pasar a un asesor, el bot deja de responder y el hilo queda a cargo de esa persona. El traspaso se hace desde la consola de conversaciones, no desde esta página."
                  />
                </>
              )}

              {/* ───────────── AVISO DE PAUSA ───────────── */}
              {seccion === "aviso" && (
                <Card>
                  <div className="flex flex-wrap items-center gap-2">
                    <CardHead>Aviso de pausa</CardHead>
                    <Badge color="light" size="sm">
                      Solo referencia
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Texto de referencia para el equipo. En este mock <strong>no se envía nada</strong>:
                    sirve como guion del aviso que vería el cliente fuera de horario.
                  </p>

                  <div className="mt-4 border-t border-gray-100 pt-5 dark:border-white/5">
                    <Label htmlFor="canal-pausa-mensaje">Mensaje del aviso</Label>
                    <TextArea
                      rows={3}
                      placeholder="Estamos fuera de horario. Te responderemos en cuanto abramos."
                      value={draft.plantillas.cancelado}
                      onChange={(v) => setPlantillaVigilada(v)}
                      maxLength={280}
                      aria-label="Mensaje del aviso de pausa"
                    />
                    <p className="mt-1.5 text-xs text-gray-400">
                      {draft.plantillas.cancelado.length}/280 caracteres.
                    </p>
                  </div>

                  <div className="mt-4">
                    <Alert
                      variant="info"
                      title="Fuera de horario"
                      message={
                        draft.horario.activo
                          ? `El canal atiende ${draft.horario.dias.length} días, de ${draft.horario.apertura} a ${draft.horario.cierre}.`
                          : "El horario de atención está desactivado, así que el canal no aplica ningún aviso por franja horaria."
                      }
                    />
                  </div>
                </Card>
              )}

              {/* ───────────── ALERTAS ───────────── */}
              {seccion === "alertas" && (
                <Card>
                  <CardHead>Alerta sonora</CardHead>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Sonido recurrente mientras haya clientes que requieren atención. Se puede
                    silenciar temporalmente desde el modal de Clientes en Inicio.
                  </p>

                  <div className="mt-4">
                    <div className={filaBase}>
                      <Label2
                        titulo="Alerta sonora"
                        descripcion="Repite el aviso hasta que se atiendan los clientes pendientes."
                      />
                      <Switch
                        checked={draft.alertaAtencion.activo}
                        onChange={(v) => setAlerta("activo", v)}
                        color={SWITCH_COLOR}
                        aria-label="Alerta sonora de clientes pendientes"
                      />
                    </div>

                    <div className={filaBase}>
                      <Label2
                        titulo="Repetir cada (segundos)"
                        descripcion="Mínimo 5 s. Por defecto 30 s."
                      />
                      <div className="w-32">
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
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* ───────────── APARIENCIA ───────────── */}
              {seccion === "apariencia" && (
                <Card>
                  <div className="flex flex-wrap items-center gap-2">
                    <CardHead>Apariencia</CardHead>
                    <Badge color="light" size="sm">
                      Preferencia local
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Preferencias de esta interfaz. No son ajustes del negocio y no viajan con la
                    configuración del canal.
                  </p>

                  <div className="mt-4">
                    <div className={filaBase}>
                      <Label2
                        titulo="Tema"
                        descripcion="«Sistema» sigue la preferencia del sistema operativo sin imponer una."
                      />
                      <Segmentado
                        ariaLabel="Tema de la interfaz"
                        opciones={OPCIONES_TEMA}
                        valor={tema}
                        onChange={aplicarTema}
                      />
                    </div>

                    <div className={filaBase}>
                      <Label2
                        titulo="Densidad de la bandeja"
                        descripcion="Cuánto espacio ocupa cada hilo en la lista de conversaciones."
                      />
                      <Segmentado
                        ariaLabel="Densidad de la bandeja"
                        opciones={OPCIONES_DENSIDAD}
                        valor={densidad}
                        onChange={setDensidad}
                      />
                    </div>
                  </div>
                </Card>
              )}
          </ConfigShell>
        </fieldset>
      </div>
    </>
  );
});

export default ConfigPage;
