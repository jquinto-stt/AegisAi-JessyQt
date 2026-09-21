/**
 * ModuleSwitcher — Selector rápido de módulo del header.
 *
 * Muestra el módulo activo en un botón-pastilla (icono + nombre) y abre un
 * desplegable con los módulos que la SESIÓN puede operar, más una opción
 * separada al final que lleva al lanzador de módulos (`/modulos`).
 *
 * ── Tres decisiones que la spec no fijaba, y por qué ────────────────────────
 *
 * 1. **`ShellDropdown`, no `@/elements/ui/dropdown`.** La spec pedía el segundo,
 *    pero `shell/header/ShellDropdown.tsx` declara en su propio encabezado que
 *    el shell tiene *"zero dependencies on @/elements/ui/dropdown"* y que la
 *    duplicación es deliberada para mantener el shell autocontenido. Medido:
 *    los dos dropdowns del header (`NotificationDropdown`, `UserDropdown`) usan
 *    `ShellDropdown`, y en todo `shell/` no hay un solo import de
 *    `elements/ui/dropdown`. Usar el ajeno habría roto la regla del directorio
 *    que este archivo habita. Desviación declarada, no silenciosa.
 *
 * 2. **Se monta desde `AppShell.AppHeader`, no desde dentro de `BaseAppHeader`.**
 *    La spec decía "en `BaseAppHeader`". Pero `BaseAppHeader` tiene DOS
 *    consumidores: `AppShell.AppHeader` y `ModulosPage`. Pintarlo dentro del
 *    componente lo haría aparecer también en `/modulos` — la pantalla que *es*
 *    el lanzador, donde "cambiar de módulo" no significa nada. Se integra en el
 *    `leftContent` de `AppShell.AppHeader`, que es la costura que la spec busca.
 *
 * 3. **La lista se deriva de los módulos OPERABLES, no de `modulosActivos`.**
 *    `organizacionStore.modulosActivos` responde "¿qué tiene encendido la
 *    organización?" e incluye a propósito lo no disponible (`inventario`:
 *    `disponible: false`, sin ruta, sin página, sin store). Ofrecer eso aquí
 *    sería un control que miente. El vocabulario de la sesión es
 *    `type Modulo = "pedidos"`, así que hoy esta lista tiene **un** elemento.
 *    No se rellena ni se finge elección: `SeleccionarPage` ya retiró su selector
 *    de módulo por la misma razón — "un selector de un solo elemento no elige
 *    nada, y presentarlo como una elección es una mentira en la interfaz".
 *    Por eso el módulo activo se pinta como fila marcada y **deshabilitada**, y
 *    el desplegable conserva valor por la opción al lanzador.
 *
 * ── Icono ───────────────────────────────────────────────────────────────────
 *
 * No hay fuente única del icono de un módulo: `CATALOGO_MODULOS` e
 * `MODULOS_INTEGRABLES` no tienen campo `icono` (verificado por grep), y el
 * glifo de Pedidos ya está duplicado en `ModulosPage` (un `<svg>` inline) y en
 * `conversaciones/ConfigPage.tsx` (`<CartIcon />`). Este archivo NO añade un
 * campo a un store fuera del alcance de la spec ni crea un cuarto duplicado a
 * mano: usa `CartIcon` de `@/icons` y mantiene el mapa local, con la deuda
 * anotada abajo.
 *
 * @deuda El icono por módulo debería vivir en `CATALOGO_MODULOS` (o en un mapa
 *        derivado junto a él) y que las tres superficies lo lean de ahí.
 */

import { useState } from "react";
import { observer } from "mobx-react-lite";
import { useNavigate } from "react-router";
import { CartIcon, ChevronDownIcon, GridIcon } from "@/icons";
import { organizacionStore, sessionStore } from "@/stores";
import { modulosOperablesDeSesion } from "@/stores/session.store";
import { CATALOGO_MODULOS } from "@/stores/plataforma.store";
import type { Modulo } from "@/stores/session.store";
import { ShellDropdown, ShellDropdownItem } from "@/shell/header/ShellDropdown";

/** Ruta del lanzador de módulos. Fuente única en `App.tsx`; aquí se referencia. */
const RUTA_LANZADOR = "/modulos";

/** Icono por módulo operable. Ver @deuda en el encabezado. */
const ICONO_MODULO: Record<Modulo, React.FC<React.SVGProps<SVGSVGElement>>> = {
  pedidos: CartIcon,
};

/** Nombre visible de un módulo, tomado del catálogo. */
function nombreModulo(modulo: Modulo): string {
  return CATALOGO_MODULOS[modulo]?.nombre ?? modulo;
}

export const ModuleSwitcher: React.FC = observer(() => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const closeDropdown = () => setIsOpen(false);

  // Módulos que la sesión sabe operar (hoy: `pedidos`). No `modulosActivos`:
  // esa lista incluye lo encendido pero no disponible.
  const operables = modulosOperablesDeSesion(organizacionStore.modulosActivos);
  const actual = sessionStore.moduloActual;

  // Sin sesión no hay módulo que mostrar, y sin módulo no hay selector que
  // pintar. Preferimos no pintar nada antes que pintar un pill vacío.
  if (actual === null) return null;

  const IconoActual = ICONO_MODULO[actual];

  /**
   * Cambia de módulo: reconfigura la sesión preservando el tipo, y navega a la
   * ruta de entrada.
   *
   * El guard `!isSimulando && tipoActual` copia el de `ModulosPage` y
   * `SeleccionarPage`: reescribir el tipo de sesión con un valor fijo sería una
   * escalada de privilegios (quien abre esta pantalla obtendría ese rol), y
   * durante una simulación `simular()` estrecha los módulos al operador a
   * propósito, así que re-derivarlos aquí los ensancharía.
   */
  const irAlModulo = (modulo: Modulo) => {
    const tipoActual = sessionStore.accessContext.tipoSesion;
    if (!sessionStore.isSimulando && tipoActual) {
      sessionStore.configurar(modulosOperablesDeSesion(organizacionStore.modulosActivos), tipoActual);
    }
    const inicio = CATALOGO_MODULOS[modulo]?.rutaPrincipal ?? "/pedidos/inicio";
    navigate(inicio);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={`Módulo activo: ${nombreModulo(actual)}. Cambiar de módulo`}
        data-module-switcher="trigger"
        className="dropdown-toggle flex items-center gap-2 h-10 px-2.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03] lg:h-11 lg:px-3 transition-colors"
      >
        <span className="flex items-center justify-center size-6 rounded-md bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
          <IconoActual className="size-4" />
        </span>
        <span className="hidden max-w-[160px] truncate text-sm font-medium sm:block">
          {nombreModulo(actual)}
        </span>
        <ChevronDownIcon
          className={`size-4 text-gray-400 transition-transform duration-200 dark:text-gray-500 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      <ShellDropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute left-0 mt-[14px] flex w-[260px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-xl dark:border-gray-800 dark:bg-gray-900 z-50 font-sans animate-in fade-in slide-in-from-top-2"
      >
        <span className="px-2 pt-1 pb-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
          Módulos
        </span>

        <ul className="flex flex-col gap-0.5 pb-1">
          {operables.map((modulo) => {
            const Icono = ICONO_MODULO[modulo];
            const esActual = modulo === actual;

            // El módulo activo NO es un click muerto: se pinta marcado y
            // deshabilitado, con el motivo visible ("Activo"). Nunca un
            // interruptor que mienta.
            if (esActual) {
              return (
                <li key={modulo}>
                  <div
                    aria-current="true"
                    data-module-switcher-activo="true"
                    className="flex cursor-default items-center gap-3 rounded-xl bg-brand-50 px-2.5 py-2 text-sm font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"
                  >
                    <Icono className="size-4.5 text-brand-500 dark:text-brand-400" />
                    <span className="flex-1 truncate">{nombreModulo(modulo)}</span>
                    <span className="text-xs font-semibold text-brand-600 dark:text-brand-400">
                      Activo
                    </span>
                  </div>
                </li>
              );
            }

            return (
              <li key={modulo}>
                <ShellDropdownItem
                  onItemClick={() => {
                    closeDropdown();
                    irAlModulo(modulo);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800/70 dark:hover:text-white"
                >
                  <Icono className="size-4.5 text-gray-500 dark:text-gray-400" />
                  <span className="flex-1 truncate text-left">{nombreModulo(modulo)}</span>
                </ShellDropdownItem>
              </li>
            );
          })}
        </ul>

        {/* Opción separada al lanzador. */}
        <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
        <ShellDropdownItem
          tag="a"
          to={RUTA_LANZADOR}
          onItemClick={closeDropdown}
          className="flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800/70 dark:hover:text-white"
        >
          <GridIcon className="size-4.5 text-gray-500 dark:text-gray-400" />
          <span>Ver todos los módulos</span>
        </ShellDropdownItem>
      </ShellDropdown>
    </div>
  );
});

export default ModuleSwitcher;
