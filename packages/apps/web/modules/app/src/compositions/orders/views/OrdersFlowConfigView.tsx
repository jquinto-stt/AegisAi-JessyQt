/**
 * Pedidos → Configuración del flujo (§17)
 * ========================================
 *
 * "Aquí se deben configurar **únicamente parámetros propios de Pedidos**."
 *
 * ── Lo que esta pantalla NO hace (§17, §28) ─────────────────────────────────
 *
 * ⚠️ No hay formulario de identidad del negocio (es de la Tienda), ni
 * configuración de WhatsApp (es del canal), ni inventario, ni perfil de usuario.
 * El principio de §17 es literal:
 *
 *     Configuración global en Tienda. Configuración específica en el módulo.
 *
 * ── Por qué se reescribió ───────────────────────────────────────────────────
 *
 * ⚠️ La versión anterior tenía **cinco ajustes reales rodeados de texto**: dos
 * secciones enteras que no configuraban nada —"Ciclo de vida de las órdenes",
 * que era prosa, y "Significado de cada estado", que era una tabla de referencia
 * de nueve filas—, más un bloque de datos de la sede que no se edita aquí y dos
 * "preferencias" que eran afirmaciones disfrazadas de control (un `Toggle`
 * deshabilitado que no se puede cambiar, un `Badge` de sólo lectura). El
 * resultado era una pantalla donde no se distinguía **qué se puede cambiar** de
 * qué se está documentando, que es lo que la hacía inservible: un ajuste entre
 * veinte párrafos no se encuentra.
 *
 * ⚠️ Y el problema de fondo era otro: **ningún ajuste decía qué hacía**. Cada uno
 * llevaba debajo una explicación en prosa —"con 25 min, una orden que lleve más de
 * ese tiempo aparece como Demorada"— que describe la regla pero no responde la
 * única pregunta que el operador tiene delante del campo: *¿y ahora mismo?*. Para
 * eso había que salir de Configuración, ir a Alistamiento y contar.
 *
 * ⚠️ Ahora **cada control lleva su efecto medido sobre las órdenes reales de la
 * sede**. Al mover el umbral, el efecto cambia en el sitio: "2 órdenes llevan más
 * de 25 min sin avanzar" pasa a "5" al bajarlo a 10. Eso es lo que convierte el
 * campo en un ajuste y no en un número guardado en algún sitio.
 *
 * ⚠️ Y se retiraron los dos interruptores que **no tenían consumidor**
 * (`alertOnStagnation`, `alertOnScheduledOverdue`): se guardaban y ninguna
 * pantalla los leía. En vez de borrarlos se **conectaron** —los avisos de las
 * cuatro pantallas de trabajo los respetan, y Programados ganó el suyo de
 * vencidas—, porque el ajuste era razonable y lo que faltaba era su efecto.
 *
 * ⚠️ Reutiliza el vocabulario de `SettingsSection` (`SettingsCard`, `SettingsRow`…)
 * porque es la **única** definición del lenguaje de ajustes del proyecto; escribir
 * otra aquí daría dos vocabularios visuales para la misma tarea.
 */

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { AlarmClock, CalendarClock, ClipboardList, Eye, LayoutList, Timer } from "lucide-react";

import { Button, Input, Toggle } from "@/elements";
import {
  SettingsCard,
  SettingsRow,
  SettingsRowGroup,
  SettingsSection,
} from "@/compositions/workspace/business-settings/SettingsSection";
import { useOrders } from "../context/OrdersContext";
import {
  INBOX_WAIT_BOUNDS,
  STAGNATION_BOUNDS,
  useFlowSettings,
} from "../operational/flow-settings";
import {
  dispatchOrders,
  groupScheduledByDay,
  inboxOrders,
  isStagnant,
  minutesInCurrentState,
  preparationOrders,
  scheduleStateOf,
  scheduledOpenOrders,
} from "../operational/order-operations";
import {
  dayKey,
  formatDayLabel,
  formatDuration,
} from "../order-presentation.utils";

/* ── Campo de umbral ───────────────────────────────────────────────────────── */

interface ThresholdFieldProps {
  value: number;
  bounds: { min: number; max: number; step: number };
  ariaLabel: string;
  onCommit: (minutes: number) => void;
}

/**
 * Un umbral en minutos, editable.
 *
 * ⚠️ Mantiene un **borrador local** en vez de escribir en cada pulsación, y esa
 * diferencia es la que hace el campo usable: el almacén recorta los valores a su
 * rango (5–240), así que teclear "4" para luego escribir "40" haría que el campo
 * se corrigiera a "5" y el "0" se perdiera. Con el borrador, lo que se ve es lo
 * que se teclea y el valor se normaliza al salir del campo.
 *
 * ⚠️ Aun así se **avisa al almacén en cada cambio válido**, no sólo al salir: el
 * umbral lo leen cuatro pantallas, y ver el efecto de al lado recalcularse
 * mientras se ajusta el número es la confirmación de que el ajuste hace algo.
 */
function ThresholdField({ value, bounds, ariaLabel, onCommit }: ThresholdFieldProps) {
  const [draft, setDraft] = useState(String(value));

  // Si el valor cambia desde fuera (restaurar valores de fábrica), el campo se
  // sincroniza: sin esto, el borrador seguiría mostrando el número viejo.
  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  return (
    // ⚠️ El `onBlur` va en el **contenedor**, no en el `Input`: el componente del
    // catálogo declara `InputProps extends FormFieldProps` y no reenvía manejadores
    // nativos, así que un `onBlur` puesto en él se perdería en silencio. En React,
    // `onBlur` se implementa sobre `focusout`, que **burbujea**, de modo que el
    // contenedor recibe el evento cuando el campo pierde el foco. Es el mismo
    // recurso que las anclas `data-*` de las tablas: cuando el componente no
    // reenvía algo, se envuelve.
    <div className="flex items-center gap-2" onBlur={() => setDraft(String(value))}>
      <Input
        type="number"
        value={draft}
        min={String(bounds.min)}
        max={String(bounds.max)}
        step={bounds.step}
        aria-label={ariaLabel}
        onChange={event => {
          const raw = event.target.value;
          setDraft(raw);
          const parsed = Number(raw);
          if (Number.isFinite(parsed) && parsed > 0) onCommit(parsed);
        }}
        className="h-9 w-24 py-0 text-theme-xs"
      />
      <span className="text-theme-xs text-gray-400 dark:text-gray-500">min</span>
    </div>
  );
}

/* ── Efecto del ajuste ─────────────────────────────────────────────────────── */

/**
 * Lo que el ajuste está haciendo **ahora mismo**, medido sobre órdenes reales.
 *
 * ⚠️ Esto es la pieza que faltaba en toda la pantalla. Una descripción explica la
 * regla; esto responde "¿y ahora?". Sin ello, comprobar si un umbral está bien
 * puesto obligaba a salir de Configuración e ir a contar a otra pantalla — y al
 * volver, el campo ya no estaba a la vista.
 *
 * ⚠️ Va con ancla `data-orders-effect` para que una guarda pueda leer el efecto
 * calculado en lugar de creérselo por el texto.
 */
function SettingsEffect({ anchor, children }: { anchor: string; children: ReactNode }) {
  return (
    <div
      data-orders-effect={anchor}
      className="rounded-lg bg-gray-50 px-3.5 py-2.5 dark:bg-white/[0.03]"
    >
      <p className="text-theme-xs font-medium text-gray-500 dark:text-gray-400">
        Efecto ahora mismo
      </p>
      <p className="mt-1 text-theme-xs leading-relaxed text-gray-700 dark:text-gray-200">
        {children}
      </p>
    </div>
  );
}

/* ── Vista ─────────────────────────────────────────────────────────────────── */

export interface OrdersFlowConfigViewProps {
  /** Puente a Ajustes de Sede, donde vive la configuración global. */
  onOpenStoreSettings: () => void;
}

export function OrdersFlowConfigView({ onOpenStoreSettings }: OrdersFlowConfigViewProps) {
  const { orders } = useOrders();
  const { settings, updateSetting, resetSettings } = useFlowSettings();

  const { stagnationMinutes, inboxWaitMinutes } = settings;

  /* ── Efecto del umbral de demora ───────────────────────────────────────── */

  const lateByPhase = [
    { label: "en alistamiento", count: preparationOrders(orders).filter(o => isStagnant(o, stagnationMinutes)).length },
    { label: "en despacho", count: dispatchOrders(orders).filter(o => isStagnant(o, stagnationMinutes)).length },
    { label: "en programados", count: scheduledOpenOrders(orders).filter(o => isStagnant(o, stagnationMinutes)).length },
  ].filter(entry => entry.count > 0);
  const lateTotal = lateByPhase.reduce((sum, entry) => sum + entry.count, 0);

  /* ── Efecto del umbral de triaje ───────────────────────────────────────── */

  const inbox = inboxOrders(orders);
  const waitingInbox = inbox.filter(
    order => minutesInCurrentState(order) >= inboxWaitMinutes
  ).length;

  /* ── Efecto del aviso de demora ────────────────────────────────────────── */

  const stagnationAlertScreens = [
    { label: "Bandeja de entrada", count: waitingInbox },
    {
      label: "Mesa de alistamiento",
      count: preparationOrders(orders).filter(o => isStagnant(o, stagnationMinutes)).length,
    },
    {
      label: "Despacho y entrega",
      count: dispatchOrders(orders).filter(o => isStagnant(o, stagnationMinutes)).length,
    },
    {
      label: "Programados",
      count: scheduledOpenOrders(orders).filter(o => isStagnant(o, stagnationMinutes)).length,
    },
  ].filter(entry => entry.count > 0);

  /* ── Efecto del aviso de vencidas y del agrupado (§15) ─────────────────── */

  const scheduled = scheduledOpenOrders(orders);
  const overdue = scheduled.filter(order => scheduleStateOf(order) === "overdue").length;
  const dayGroups = groupScheduledByDay(scheduled, dayKey, formatDayLabel).length;

  return (
    <div data-orders-config className="flex flex-col gap-6 pb-16">
      <SettingsCard>
        {/* ── Umbrales (§12, §16, §17) ────────────────────────────────────────
            El corazón de la pantalla: los dos números que deciden qué se marca
            como atrasado, y que leen las cinco pantallas de trabajo.

            ⚠️ La descripción del grupo dice **sólo el alcance** —"se aplica a
            todas las pantallas a la vez"—. Decía además qué es un umbral
            ("Cuánto puede esperar una orden antes de que la operación la marque
            como atrasada"), y eso ya lo dicen el propio título del grupo y la
            descripción de cada fila: era la misma frase tres veces (§8). */}
        <SettingsSection
          title="Ritmo de trabajo"
          description="Se aplica a todas las pantallas de trabajo a la vez."
        >
          <SettingsRowGroup>
            <SettingsRow
              icon={Timer}
              title="Demora en el estado"
              description="Tiempo máximo que una orden puede permanecer en un mismo estado —alistando, despachando— antes de marcarse como demorada."
              action={
                <ThresholdField
                  value={stagnationMinutes}
                  bounds={STAGNATION_BOUNDS}
                  ariaLabel="Minutos de demora antes de marcar una orden como atrasada"
                  onCommit={minutes => updateSetting("stagnationMinutes", minutes)}
                />
              }
            >
              <SettingsEffect anchor="stagnationMinutes">
                {lateTotal === 0 ? (
                  <>
                    Ninguna orden lleva más de {formatDuration(stagnationMinutes)} sin cambiar de
                    estado.
                  </>
                ) : (
                  <>
                    <strong className="font-semibold text-error-600 dark:text-error-500">
                      {lateTotal} {lateTotal === 1 ? "orden lleva" : "órdenes llevan"} más de{" "}
                      {formatDuration(stagnationMinutes)} sin cambiar de estado
                    </strong>{" "}
                    — {lateByPhase.map(entry => `${entry.count} ${entry.label}`).join(", ")}.
                  </>
                )}
              </SettingsEffect>
            </SettingsRow>

            <SettingsRow
              icon={ClipboardList}
              title="Espera en triaje"
              description="Tiempo máximo que una orden puede estar sin validar en la bandeja de entrada. Es más corto que el de demora a propósito: en triaje nadie la ha mirado todavía."
              action={
                <ThresholdField
                  value={inboxWaitMinutes}
                  bounds={INBOX_WAIT_BOUNDS}
                  ariaLabel="Minutos de espera en triaje antes de avisar"
                  onCommit={minutes => updateSetting("inboxWaitMinutes", minutes)}
                />
              }
            >
              <SettingsEffect anchor="inboxWaitMinutes">
                {inbox.length === 0 ? (
                  <>La bandeja está vacía: no hay nada esperando validación.</>
                ) : waitingInbox === 0 ? (
                  <>
                    Ninguna de las {inbox.length} órdenes en bandeja lleva más de{" "}
                    {formatDuration(inboxWaitMinutes)} sin validarse.
                  </>
                ) : (
                  <>
                    <strong className="font-semibold text-warning-600 dark:text-warning-500">
                      {waitingInbox} de {inbox.length} órdenes en bandeja llevan más de{" "}
                      {formatDuration(inboxWaitMinutes)} sin validarse
                    </strong>
                    .
                  </>
                )}
              </SettingsEffect>
            </SettingsRow>
          </SettingsRowGroup>
        </SettingsSection>

        {/* ── Avisos ─────────────────────────────────────────────────────────
            ⚠️ El grupo ya **no lleva descripción**. Decía "Qué señala la
            operación por su cuenta. Son avisos de lectura: no cambian el ciclo de
            vida de ninguna orden." — la primera frase repetía el título, y la
            segunda explicaba la propia interfaz (§8). Que un interruptor llamado
            "Mostrar una alerta al principio de la pantalla…" no toca datos lo dice
            su propia descripción de fila, que sigue ahí. */}
        <SettingsSection title="Avisos en pantalla">
          <SettingsRowGroup>
            <SettingsRow
              icon={Eye}
              title="Avisar de órdenes demoradas"
              description="Mostrar una alerta al principio de la pantalla cuando hay órdenes atrasadas."
              action={
                <Toggle
                  checked={settings.alertOnStagnation}
                  onChange={next => updateSetting("alertOnStagnation", next)}
                  ariaLabel="Avisar de órdenes demoradas"
                />
              }
            >
              <SettingsEffect anchor="alertOnStagnation">
                {settings.alertOnStagnation ? (
                  stagnationAlertScreens.length === 0 ? (
                    <>Encendido. Ahora mismo no se ve ninguna alerta: no hay órdenes demoradas.</>
                  ) : (
                    <>
                      Encendido. La alerta se está mostrando en{" "}
                      <strong className="font-semibold text-gray-800 dark:text-white/90">
                        {stagnationAlertScreens.map(entry => entry.label).join(", ")}
                      </strong>
                      .
                    </>
                  )
                ) : (
                  <>
                    Apagado: ninguna pantalla muestra la alerta, aunque hay{" "}
                    <strong className="font-semibold text-gray-800 dark:text-white/90">
                      {lateTotal} {lateTotal === 1 ? "orden demorada" : "órdenes demoradas"}
                    </strong>{" "}
                    que ahora no se señalan en ningún sitio.
                  </>
                )}
              </SettingsEffect>
            </SettingsRow>

            <SettingsRow
              icon={AlarmClock}
              title="Avisar de programadas vencidas"
              description="Señalar las órdenes cuya hora comprometida con el cliente ya pasó."
              action={
                <Toggle
                  checked={settings.alertOnScheduledOverdue}
                  onChange={next => updateSetting("alertOnScheduledOverdue", next)}
                  ariaLabel="Avisar de programadas vencidas"
                />
              }
            >
              <SettingsEffect anchor="alertOnScheduledOverdue">
                {settings.alertOnScheduledOverdue ? (
                  overdue === 0 ? (
                    <>Encendido. Ahora mismo no hay ninguna orden vencida que señalar.</>
                  ) : (
                    <>
                      Encendido. Programados está señalando{" "}
                      <strong className="font-semibold text-error-600 dark:text-error-500">
                        {overdue} {overdue === 1 ? "orden vencida" : "órdenes vencidas"}
                      </strong>
                      .
                    </>
                  )
                ) : (
                  <>
                    Apagado: Programados no avisa, aunque{" "}
                    <strong className="font-semibold text-gray-800 dark:text-white/90">
                      {overdue} {overdue === 1 ? "orden pasó" : "órdenes pasaron"} su hora
                      comprometida
                    </strong>
                    .
                  </>
                )}
              </SettingsEffect>
            </SettingsRow>

            <SettingsRow
              icon={LayoutList}
              title="Agrupar programados por jornada"
              description="Ver las órdenes programadas agrupadas por día, en lugar de en una sola lista."
              action={
                <Toggle
                  checked={settings.groupScheduledByDay}
                  onChange={next => updateSetting("groupScheduledByDay", next)}
                  ariaLabel="Agrupar las órdenes programadas por día"
                />
              }
            >
              <SettingsEffect anchor="groupScheduledByDay">
                {scheduled.length === 0 ? (
                  <>No hay órdenes programadas en esta sede, así que el ajuste no cambia nada hoy.</>
                ) : settings.groupScheduledByDay ? (
                  <>
                    Programados muestra{" "}
                    <strong className="font-semibold text-gray-800 dark:text-white/90">
                      {dayGroups} {dayGroups === 1 ? "jornada" : "jornadas"}
                    </strong>{" "}
                    con {scheduled.length} {scheduled.length === 1 ? "orden" : "órdenes"}.
                  </>
                ) : (
                  <>
                    Programados muestra una sola lista con{" "}
                    <strong className="font-semibold text-gray-800 dark:text-white/90">
                      {scheduled.length} {scheduled.length === 1 ? "orden" : "órdenes"}
                    </strong>{" "}
                    repartidas en {dayGroups} {dayGroups === 1 ? "jornada" : "jornadas"}.
                  </>
                )}
              </SettingsEffect>
            </SettingsRow>
          </SettingsRowGroup>
        </SettingsSection>

        {/* ── Restaurar ────────────────────────────────────────────────────── */}
        <SettingsSection
          title="Restaurar"
          description="Vuelve a los valores de fábrica de esta sede. No afecta a las demás sucursales."
        >
          <Button
            variant="outline"
            size="sm"
            onClick={resetSettings}
            intent="orders.config.reset_flow"
            className="self-start"
          >
            Restaurar valores por defecto
          </Button>
        </SettingsSection>

        {/* ── Puente a la configuración global (§17, §28) ─────────────────────
            ⚠️ Aquí vivía un bloque "Estado en esta sede" que repetía la moneda, el
            recuento de órdenes y la pausa de recepción. Son datos **de la tienda**
            —§17 los sitúa en su propia configuración— y enseñarlos aquí en modo
            lectura no configuraba nada: sólo duplicaba una pantalla que ya existe y
            alargaba ésta. Lo que sí hace falta desde aquí es el **camino** a ellos,
            y eso es lo único que queda. */}
        <SettingsSection
          title="Configuración de la sede"
          description="La identidad de la tienda, sus canales, su moneda y su pausa de recepción son globales de la red: se editan una sola vez en Ajustes de Sede, y Pedidos los lee para operar."
          actions={
            /* ⚠️ `Button` acepta `intent`, así que el gancho `data-intent` se
               conserva al dejar de ser un `<button>` nativo. `h-auto px-0 py-0`
               mantiene la altura y el relleno de un texto en línea: esto es un
               enlace de sección, no un botón. */
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenStoreSettings}
              intent="orders.config.open_store"
              className="h-auto px-0 py-0 text-theme-xs font-semibold text-brand-500 hover:bg-transparent hover:text-brand-600 dark:text-brand-400 dark:hover:bg-transparent"
            >
              Abrir la configuración de sede
            </Button>
          }
        >
          <p className="text-theme-xs leading-relaxed text-gray-500 dark:text-gray-400">
            Ningún ajuste de esta pantalla altera qué transiciones son válidas ni qué datos
            pertenecen a la tienda. El ciclo de vida de una orden vive en el contrato del módulo y
            es igual para todas las sedes.
          </p>
        </SettingsSection>
      </SettingsCard>
    </div>
  );
}

export default OrdersFlowConfigView;
