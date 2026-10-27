import { useState } from "react";
import { observer } from "mobx-react-lite";
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ArrowsUpDownIcon,
  CheckIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  TruckIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

import { PageMeta } from "@/shell/meta";
import { SearchInput } from "@/elements";
import { recoleccionesStore } from "@/stores";
import {
  ETIQUETA_ESTADO_RECOLECCION,
  ESTADOS_RECOLECCION,
  filtrarRecolecciones,
  type DatosConfiguracionFija,
  type DatosRecoleccion,
  type EstadoRecoleccion,
  type Recoleccion,
  type TipoRecoleccion,
} from "@/domain/pedidos/recolecciones.domain";
import { TRANSPORTADORAS, transportadoraPorNombre } from "@/domain/pedidos/transportadoras.catalogo";
import { Modal } from "@/elements/ui/modal";
import { Button } from "@/elements/ui/button";
import { PlusIcon } from "@/icons";
import { campo } from "./transportadoras.campos";
import { csvCitas, csvFijas, nombreArchivoRecolecciones } from "./transportadoras.csv";
import { descargarCsv } from "./analitica.utils";
import { TarjetaRecoleccionFija } from "./TarjetaRecoleccionFija";
import { TransportadorasConfigurar } from "./TransportadorasConfigurar";

// ═══════════════════════════════════════════════════════════════════════════
// TRANSPORTADORAS — recolecciones
// ═══════════════════════════════════════════════════════════════════════════
//
// La página responde a dos preguntas distintas, y por eso las dos pestañas no
// pintan lo mismo:
//
//   EVENTUAL — «¿qué recogidas hay pedidas?». Cada fila es un hecho con fecha,
//   estado y número de paquetes. Se pide una y se sigue hasta que ocurre.
//
//   FIJA — «¿cada cuánto pasa esta transportadora?». Cada tarjeta es una REGLA
//   que se repite: días de la semana, franja horaria, bodega y quién despacha.
//   No tiene fecha ni estado porque no ocurre una vez: ocurre siempre.
//
// Meter las dos en una tabla obligaba a que la mitad de las columnas estuvieran
// vacías en cada pestaña. La tarjeta tampoco sirve para una cita suelta: no hay
// nada que pausar ni días que programar.
//
// ── Estado vacío con el texto del mock ────────────────────────────────────
//
// No hay datos sembrados (ver `recolecciones.store`). Cuando la lista sale vacía
// se dice por qué puede ser: o no hay nada, o los filtros lo esconden. Un lienzo
// en blanco se lee como «esta pantalla no funciona».
// ═══════════════════════════════════════════════════════════════════════════

const TIPOS: { clave: TipoRecoleccion; label: string }[] = [
  { clave: "eventual", label: "Eventual" },
  { clave: "fija", label: "Fija" },
];

const VACIO_FILTROS = "¡Ups! Aún no tienes recolecciones, revisa los filtros";

/** `2026-10-28` → `28 oct 2026`, sin depender del locale del navegador. */
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
function fechaLegible(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? "");
  if (!m) return "—";
  const [, anio, mes, dia] = m;
  return `${Number(dia)} ${MESES[Number(mes) - 1] ?? ""} ${anio}`;
}

/** Color del chip de estado: los tres de la marca, sin escalones intermedios. */
const ESTILO_ESTADO: Record<EstadoRecoleccion, string> = {
  programada: "bg-[#EFE6D3] text-[#212121] dark:bg-[#EFE6D3]/15 dark:text-[#EFE6D3]",
  asignada: "bg-[#97D6DF]/25 text-[#190088] dark:bg-[#97D6DF]/15 dark:text-[#97D6DF]",
  con_novedad: "bg-[#FF3F1A]/10 text-[#FF3F1A] dark:bg-[#FF3F1A]/15 dark:text-[#FF3F1A]",
};

const PUNTO_ESTADO: Record<EstadoRecoleccion, string> = {
  programada: "bg-[#212121]/40",
  asignada: "bg-[#190088]",
  con_novedad: "bg-[#FF3F1A]",
};

/** Los campos de la recolección eventual. Una cita suelta es siempre eventual. */
const FORM_VACIO = (): DatosRecoleccion => ({
  tipo: "eventual",
  transportadora: "",
  bodega: "",
  fecha: "",
  horario: "",
  paquetes: "",
  despacha: "",
});

/** El borrador de una configuración fija que todavía no existe. */
const CONFIG_VACIA = (transportadora = ""): DatosConfiguracionFija => ({
  transportadora,
  dias: [],
  bodega: "",
  direccion: "",
  despachaNombre: "",
  despachaApellidos: "",
  rango: "manana",
  paquetes: "",
  notas: "",
});

// ── Barra de filtros ───────────────────────────────────────────────────────

/**
 * Las tres piezas de la barra de filtros, calcadas de «Gestión de pedidos».
 *
 * No son estilos «parecidos»: son las mismas medidas y la misma jerarquía que la
 * barra del tablero (h-10, rounded-xl, borde de 1 px, texto de 12 px, icono de
 * 3.5). Un filtro que se ve distinto en cada pantalla obliga a reaprender dónde
 * está cada cosa; el color de marca va en el acento, no en la forma.
 */
const PILDORA =
  "inline-flex h-10 shrink-0 select-none items-center gap-1.5 rounded-xl border border-[#ECECEC] bg-white px-3 text-theme-xs font-medium text-[#212121] shadow-theme-xs transition-colors hover:bg-[#ECECEC]/40 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/85 dark:hover:bg-white/[0.07] cursor-pointer";

const BOTON_ICONO =
  "flex size-10 shrink-0 items-center justify-center rounded-xl border border-[#ECECEC] bg-white text-[#212121] shadow-theme-xs transition-colors hover:bg-[#ECECEC]/40 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/85 dark:hover:bg-white/[0.07] cursor-pointer";

/** Chip del filtro puesto: se lee qué está filtrando y se quita desde ahí. */
const CHIP =
  "inline-flex h-10 select-none items-center gap-1.5 rounded-xl border border-[#FF3F1A]/45 bg-white px-3 text-theme-xs font-bold text-[#FF3F1A] dark:bg-[#FF3F1A]/10";

const MENU_ITEM = "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-theme-xs transition-colors cursor-pointer";

// ── Estado vacío ───────────────────────────────────────────────────────────

/**
 * La ilustración del estado vacío.
 *
 * Dibujada en línea y no con una imagen: pesa nada, hereda el color del texto y
 * se ve nítida en cualquier densidad. Es una planilla con dos renglones y una
 * etiqueta, que es lo que se espera encontrar en esta pantalla.
 *
 * Los trazos grises van en `currentColor` y no en `#ECECEC` fijo: en tema oscuro
 * un gris claro pinta líneas blancas que brillan más que el mensaje que
 * acompañan. El color lo pone el contenedor, que sí sabe en qué tema está.
 */
const IlustracionVacia = () => (
  <svg
    viewBox="0 0 160 120"
    className="h-28 w-40 text-[#ECECEC] dark:text-white/15"
    fill="none"
    aria-hidden="true"
  >
    <rect x="52" y="18" width="56" height="52" rx="6" stroke="currentColor" strokeWidth="2.5" />
    <path d="M64 34h32M64 44h22" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M30 34h14M24 44h20" stroke="#97D6DF" strokeWidth="2.5" strokeLinecap="round" />
    <rect x="38" y="80" width="84" height="18" rx="9" stroke="currentColor" strokeWidth="2.5" />
    <circle cx="118" cy="26" r="3" fill="#FF3F1A" />
  </svg>
);

/** Una fila de la tabla de recolecciones eventuales. */
const FilaRecoleccion = ({ recoleccion: r }: { recoleccion: Recoleccion }) => {
  const transportadora = transportadoraPorNombre(r.transportadora);
  return (
    <tr className="transition-colors hover:bg-[#F9F9F8] dark:hover:bg-white/[0.03]">
      <td className="px-4 py-4">
        <div className="flex items-center gap-2">
          {transportadora?.logo ? (
            <img src={transportadora.logo} alt="" className="h-4 max-w-[54px] object-contain" />
          ) : (
            <span className="size-1.5 rounded-full bg-[#97D6DF]" aria-hidden="true" />
          )}
          <span className="font-bold text-[#212121] dark:text-white">{r.transportadora}</span>
        </div>
      </td>
      <td className="px-4 py-4 font-mono font-semibold tabular-nums text-[#190088] dark:text-[#97D6DF]">
        {r.codigo}
      </td>
      <td className="px-4 py-4 font-normal text-[#212121]/80 dark:text-white/70">{r.bodega}</td>
      <td className="px-4 py-4 whitespace-nowrap font-normal text-[#212121]/80 dark:text-white/70">
        {fechaLegible(r.fecha)}
      </td>
      <td className="px-4 py-4">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold ${ESTILO_ESTADO[r.estado]}`}
        >
          <span className={`size-1.5 rounded-full ${PUNTO_ESTADO[r.estado]}`} />
          {ETIQUETA_ESTADO_RECOLECCION[r.estado]}
        </span>
      </td>
      <td className="px-4 py-4 tabular-nums font-normal text-[#212121]/80 dark:text-white/70">
        {r.paquetes}
      </td>
      <td className="px-4 py-4 whitespace-nowrap font-normal text-[#212121]/80 dark:text-white/70">
        {r.horario}
      </td>
      <td className="px-4 py-4 font-normal text-[#212121]/80 dark:text-white/70">{r.despacha}</td>
    </tr>
  );
};

// ── Página ─────────────────────────────────────────────────────────────────

export const TransportadorasPage = observer(() => {
  const [tipo, setTipo] = useState<TipoRecoleccion>("eventual");
  const [estados, setEstados] = useState<EstadoRecoleccion[]>([]);
  const [transportadora, setTransportadora] = useState<string | null>(null);
  /** Un solo menú abierto a la vez: abrir uno cierra el otro. */
  const [menuAbierto, setMenuAbierto] = useState<"estados" | "transportadora" | null>(null);
  const [buscadorAbierto, setBuscadorAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [ordenDescendente, setOrdenDescendente] = useState(false);
  const [formulario, setFormulario] = useState<DatosRecoleccion | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * La configuración que se está editando, o `null` si se ve la lista.
   *
   * Es una pantalla y no un modal: son siete campos, una rejilla de días y una
   * explicación por bloque. El borrador vive aquí y no en la pantalla de
   * configuración para que cancelar sea simplemente poner esto en `null`.
   */
  const [configurando, setConfigurando] = useState<{
    id?: string;
    datos: DatosConfiguracionFija;
  } | null>(null);
  const [errorConfig, setErrorConfig] = useState<string | null>(null);

  const esFija = tipo === "fija";

  /**
   * El texto del buscador, ya normalizado. Se compara contra todo lo que la
   * persona tiene delante —código, transportadora, bodega, quién despacha— y no
   * contra un campo «de búsqueda»: quien escribe «envía» espera encontrar la
   * cita de Envía sin saber en qué columna vive.
   */
  const consulta = busqueda.trim().toLocaleLowerCase("es");
  const coincide = (campos: (string | number | undefined)[]) =>
    !consulta || campos.join(" ").toLocaleLowerCase("es").includes(consulta);

  // Las citas de la tabla son siempre eventuales: una recolección fija no tiene
  // fecha ni estado, así que no puede ser una fila de esta tabla.
  const citasBase = filtrarRecolecciones(recoleccionesStore.recolecciones, {
    tipo: "eventual",
    estados,
    transportadora,
  }).filter((r) => coincide([r.codigo, r.transportadora, r.bodega, r.despacha, r.horario]));

  // `filtrarRecolecciones` ordena por fecha ascendente (lo de mañana importa más
  // que lo del mes que viene). «Ordenar» invierte ese orden; no lo reordena por
  // otra columna, porque no hay otra que sea útil aquí.
  const citas = ordenDescendente ? [...citasBase].reverse() : citasBase;

  const fijas = recoleccionesStore.configuraciones
    .filter((c) => !transportadora || c.transportadora === transportadora)
    .filter((c) =>
      coincide([c.transportadora, c.bodega, c.direccion, c.despachaNombre, c.despachaApellidos]),
    );

  const hayFiltros = estados.length > 0 || transportadora !== null || consulta.length > 0;

  const alternarEstado = (estado: EstadoRecoleccion) =>
    setEstados((prev) => (prev.includes(estado) ? prev.filter((e) => e !== estado) : [...prev, estado]));

  const limpiarFiltros = () => {
    setEstados([]);
    setTransportadora(null);
    setBusqueda("");
  };

  const descargar = () => {
    if (esFija) {
      descargarCsv(csvFijas(fijas), nombreArchivoRecolecciones("fija"));
      return;
    }
    descargarCsv(csvCitas(citas), nombreArchivoRecolecciones("eventual"));
  };

  const contarEstado = (estado: EstadoRecoleccion) =>
    recoleccionesStore.recolecciones.filter((r) => r.tipo === "eventual" && r.estado === estado).length;

  const abrirFormulario = () => {
    setError(null);
    setFormulario(FORM_VACIO());
  };

  const guardar = () => {
    if (!formulario) return;
    const resultado = recoleccionesStore.crear(formulario);
    if (!resultado.ok) {
      setError(resultado.error);
      return;
    }
    setFormulario(null);
    setError(null);
  };

  const abrirConfiguracion = (id?: string) => {
    setErrorConfig(null);
    const existente = id ? recoleccionesStore.configuraciones.find((c) => c.id === id) : undefined;
    setConfigurando({
      id,
      datos: existente
        ? {
            transportadora: existente.transportadora,
            dias: [...existente.dias],
            bodega: existente.bodega,
            direccion: existente.direccion,
            despachaNombre: existente.despachaNombre,
            despachaApellidos: existente.despachaApellidos,
            rango: existente.rango,
            paquetes: String(existente.paquetes),
            notas: existente.notas,
          }
        : CONFIG_VACIA(transportadora ?? ""),
    });
  };

  const guardarConfiguracion = (datos: DatosConfiguracionFija) => {
    const resultado = recoleccionesStore.guardarConfiguracion(datos, configurando?.id);
    if (!resultado.ok) {
      setErrorConfig(resultado.error);
      return;
    }
    // Se queda en la pestaña Fija: la regla que se acaba de guardar vive ahí, y
    // volver a Eventual la escondería justo después de crearla.
    setTipo("fija");
    setConfigurando(null);
    setErrorConfig(null);
  };

  // ── Pantalla de configuración ──────────────────────────────────────────
  if (configurando) {
    return (
      <div className="flex w-full flex-col gap-5 font-sans">
        <PageMeta
          title="Configurar Recogida"
          description="Días, bodega y datos de quien despacha de una recolección fija"
        />
        <TransportadorasConfigurar
          key={configurando.id ?? "nueva"}
          inicial={configurando.datos}
          editando={Boolean(configurando.id)}
          error={errorConfig}
          onCambio={() => setErrorConfig(null)}
          onCancelar={() => {
            setConfigurando(null);
            setErrorConfig(null);
          }}
          onGuardar={guardarConfiguracion}
        />
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-5 font-sans">
      <PageMeta
        title="Transportadoras"
        description="Recolecciones de tus pedidos con cada transportadora"
      />

      {/* ── Cabecera ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-theme-2xl font-bold tracking-tight text-[#190088] lg:text-title-md dark:text-white">
            Transportadoras
          </h1>
          <p className="mt-1 max-w-2xl text-theme-sm font-light text-[#212121]/70 dark:text-white/60">
            En este módulo podrás gestionar las recolecciones de tus pedidos con cada transportadora.
          </p>
        </div>

        <button
          type="button"
          onClick={() => (esFija ? abrirConfiguracion() : abrirFormulario())}
          className="flex h-10 shrink-0 items-center gap-2 rounded-xl bg-[#FF3F1A] px-4 text-theme-sm font-bold text-white transition-colors hover:bg-[#FF3F1A]/90 cursor-pointer"
        >
          <PlusIcon className="size-4" aria-hidden="true" />
          {esFija ? "Configurar recolección" : "Nueva recolección"}
        </button>
      </div>

      {/* ── Pestañas ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-[#ECECEC] dark:border-white/10">
        {TIPOS.map((t) => {
          const activo = tipo === t.clave;
          return (
            <button
              key={t.clave}
              type="button"
              onClick={() => setTipo(t.clave)}
              aria-pressed={activo}
              className={`-mb-px rounded-t-xl border border-b-0 px-5 py-2 text-theme-xs font-bold transition-colors cursor-pointer ${
                activo
                  ? "border-[#ECECEC] bg-white text-[#FF3F1A] dark:border-white/10 dark:bg-gray-900 dark:text-[#FF3F1A]"
                  : "border-transparent text-[#212121]/55 hover:text-[#212121] dark:text-white/50 dark:hover:text-white"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ── Barra de filtros (la misma de «Gestión de pedidos») ──────────── */}
      <div className="flex flex-wrap items-center gap-2.5">
        {buscadorAbierto && (
          <SearchInput
            autoFocus
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            onClear={() => setBusqueda("")}
            placeholder="Transportadora, bodega, código…"
            className="h-10 w-48 shrink-0 sm:w-64"
            aria-label="Buscar recolecciones"
          />
        )}

        {/* Lupa: abre y cierra el buscador */}
        <button
          type="button"
          onClick={() => {
            if (buscadorAbierto) setBusqueda("");
            setBuscadorAbierto((v) => !v);
          }}
          aria-expanded={buscadorAbierto}
          aria-label={buscadorAbierto ? "Ocultar el buscador" : "Buscar recolecciones"}
          title={buscadorAbierto ? "Ocultar el buscador" : "Buscar recolecciones"}
          className={`flex size-10 shrink-0 items-center justify-center rounded-xl border transition-colors cursor-pointer ${
            buscadorAbierto
              ? "border-[#212121]/25 bg-[#ECECEC] text-[#212121] dark:border-white/25 dark:bg-white/15 dark:text-white"
              : "border-[#ECECEC] bg-white text-[#212121] shadow-theme-xs hover:bg-[#ECECEC]/40 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/85 dark:hover:bg-white/[0.07]"
          }`}
        >
          <MagnifyingGlassIcon className="size-4" aria-hidden="true" />
        </button>

        {/* Volver a leer. No hay backend: no simula espera ni spinner. */}
        <button
          type="button"
          onClick={() => setEstados((prev) => [...prev])}
          aria-label="Volver a leer las recolecciones"
          title="Volver a leer las recolecciones"
          className={BOTON_ICONO}
        >
          <ArrowPathIcon className="size-4" aria-hidden="true" />
        </button>

        {/* Estados: solo en las citas. Una regla fija no tiene estado. */}
        {!esFija && (
          <div className="relative inline-block shrink-0">
            <button
              type="button"
              onClick={() => setMenuAbierto((v) => (v === "estados" ? null : "estados"))}
              aria-expanded={menuAbierto === "estados"}
              aria-haspopup="true"
              className={PILDORA}
            >
              <FunnelIcon className="size-3.5 text-[#212121]/50 dark:text-white/50" aria-hidden="true" />
              <span>Estados</span>
              {estados.length > 0 && (
                <span className="flex size-4.5 items-center justify-center rounded-full bg-[#FF3F1A] text-[10px] font-bold text-white">
                  {estados.length}
                </span>
              )}
            </button>

            {menuAbierto === "estados" && (
              <div className="absolute left-0 top-full z-50 mt-1.5 w-60 rounded-xl border border-[#ECECEC] bg-white p-1.5 shadow-xl shadow-black/10 dark:border-white/10 dark:bg-gray-900">
                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#212121]/40 dark:text-white/40">
                  Filtrar por estado
                </div>
                {ESTADOS_RECOLECCION.map((estado) => {
                  const marcado = estados.includes(estado);
                  return (
                    <button
                      key={estado}
                      type="button"
                      onClick={() => alternarEstado(estado)}
                      className={`${MENU_ITEM} ${
                        marcado
                          ? "bg-[#ECECEC]/70 font-bold text-[#212121] dark:bg-white/10 dark:text-white"
                          : "text-[#212121]/75 hover:bg-[#ECECEC]/40 dark:text-white/70 dark:hover:bg-white/5"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className={`flex size-4 items-center justify-center rounded border ${
                            marcado
                              ? "border-[#FF3F1A] bg-[#FF3F1A] text-white"
                              : "border-[#212121]/25 dark:border-white/25"
                          }`}
                        >
                          {marcado && <CheckIcon className="size-3 stroke-[3]" aria-hidden="true" />}
                        </span>
                        {ETIQUETA_ESTADO_RECOLECCION[estado]}
                      </span>
                      <span className="text-[11px] font-medium text-[#212121]/35 dark:text-white/35">
                        {contarEstado(estado)}
                      </span>
                    </button>
                  );
                })}

                {hayFiltros && (
                  <>
                    <div className="my-1 border-t border-[#ECECEC] dark:border-white/10" />
                    <button
                      type="button"
                      onClick={limpiarFiltros}
                      className="flex w-full items-center justify-center rounded-lg py-1 text-[11px] font-medium text-[#212121]/50 hover:bg-[#ECECEC]/40 hover:text-[#FF3F1A] dark:text-white/45 dark:hover:bg-white/5 dark:hover:text-[#FF3F1A] cursor-pointer"
                    >
                      Limpiar filtros
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Ordenar: invierte el orden por fecha de la tabla */}
        {!esFija && (
          <button
            type="button"
            onClick={() => setOrdenDescendente((v) => !v)}
            title={ordenDescendente ? "Orden: fecha más lejana primero" : "Orden: fecha más próxima primero"}
            aria-label={ordenDescendente ? "Orden: fecha más lejana primero" : "Orden: fecha más próxima primero"}
            className={PILDORA}
          >
            <ArrowsUpDownIcon className="size-3.5 text-[#212121]/50 dark:text-white/50" aria-hidden="true" />
            <span>Ordenar</span>
          </button>
        )}

        {/* Transportadora: son seis y crecerán, no caben como chips sueltos */}
        <div className="relative inline-block shrink-0">
          <button
            type="button"
            onClick={() => setMenuAbierto((v) => (v === "transportadora" ? null : "transportadora"))}
            aria-expanded={menuAbierto === "transportadora"}
            aria-haspopup="true"
            className={PILDORA}
          >
            <TruckIcon className="size-3.5 text-[#212121]/50 dark:text-white/50" aria-hidden="true" />
            <span>Transportadora</span>
            {transportadora && (
              <span className="flex size-4.5 items-center justify-center rounded-full bg-[#FF3F1A] text-[10px] font-bold text-white">
                1
              </span>
            )}
          </button>

          {menuAbierto === "transportadora" && (
            <div className="absolute left-0 top-full z-50 mt-1.5 w-60 rounded-xl border border-[#ECECEC] bg-white p-1.5 shadow-xl shadow-black/10 dark:border-white/10 dark:bg-gray-900">
              <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#212121]/40 dark:text-white/40">
                Filtrar por transportadora
              </div>
              {TRANSPORTADORAS.map((t) => {
                const activa = transportadora === t.nombre;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTransportadora(activa ? null : t.nombre)}
                    className={`${MENU_ITEM} ${
                      activa
                        ? "bg-[#ECECEC]/70 font-bold text-[#212121] dark:bg-white/10 dark:text-white"
                        : "text-[#212121]/75 hover:bg-[#ECECEC]/40 dark:text-white/70 dark:hover:bg-white/5"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      {t.logo ? (
                        <img src={t.logo} alt="" className="h-3.5 max-w-[44px] object-contain" />
                      ) : (
                        <span className="size-3.5 rounded-full border border-[#ECECEC] dark:border-white/20" />
                      )}
                      {t.nombre}
                    </span>
                    {activa && <CheckIcon className="size-3.5 text-[#FF3F1A]" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Descargar: baja lo que se está viendo, ya filtrado */}
        <button
          type="button"
          onClick={descargar}
          title={esFija ? "Descargar las recolecciones fijas (CSV)" : "Descargar las recolecciones (CSV)"}
          className={PILDORA}
        >
          <ArrowDownTrayIcon className="size-3.5 text-[#212121]/50 dark:text-white/50" aria-hidden="true" />
          <span>Descargar</span>
        </button>

        {/* Chips de filtros activos */}
        {hayFiltros && <div className="mx-0.5 h-4 w-px bg-[#ECECEC] dark:bg-white/15" />}

        {estados.map((estado) => (
          <span key={estado} className={CHIP}>
            {ETIQUETA_ESTADO_RECOLECCION[estado]}
            <button
              type="button"
              onClick={() => alternarEstado(estado)}
              title={`Quitar ${ETIQUETA_ESTADO_RECOLECCION[estado]}`}
              aria-label={`Quitar ${ETIQUETA_ESTADO_RECOLECCION[estado]}`}
              className="ml-0.5 cursor-pointer rounded p-0.5 text-[#FF3F1A]/70 hover:text-[#FF3F1A]"
            >
              <XMarkIcon className="size-3.5 stroke-[2.5]" aria-hidden="true" />
            </button>
          </span>
        ))}

        {transportadora && (
          <span className={CHIP}>
            {transportadora}
            <button
              type="button"
              onClick={() => setTransportadora(null)}
              title={`Quitar ${transportadora}`}
              aria-label={`Quitar ${transportadora}`}
              className="ml-0.5 cursor-pointer rounded p-0.5 text-[#FF3F1A]/70 hover:text-[#FF3F1A]"
            >
              <XMarkIcon className="size-3.5 stroke-[2.5]" aria-hidden="true" />
            </button>
          </span>
        )}

        {consulta && (
          <span className={CHIP}>
            «{busqueda.trim()}»
            <button
              type="button"
              onClick={() => setBusqueda("")}
              title="Quitar la búsqueda"
              aria-label="Quitar la búsqueda"
              className="ml-0.5 cursor-pointer rounded p-0.5 text-[#FF3F1A]/70 hover:text-[#FF3F1A]"
            >
              <XMarkIcon className="size-3.5 stroke-[2.5]" aria-hidden="true" />
            </button>
          </span>
        )}

        {hayFiltros && (
          <button
            type="button"
            onClick={limpiarFiltros}
            className="text-theme-xs font-bold text-[#212121]/45 underline-offset-2 transition-colors hover:text-[#212121] hover:underline dark:text-white/40 dark:hover:text-white cursor-pointer"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* ── Contenido: tarjetas (Fija) o tabla (Eventual) ────────────────── */}
      {esFija ? (
        fijas.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-[#ECECEC] bg-white px-5 py-16 text-center dark:border-white/10 dark:bg-gray-900">
            <IlustracionVacia />
            <p className="text-theme-sm font-normal text-[#212121]/45 dark:text-white/40">
              {hayFiltros ? VACIO_FILTROS : "Aún no tienes recolecciones fijas configuradas"}
            </p>
            {!hayFiltros && (
              <button
                type="button"
                onClick={() => abrirConfiguracion()}
                className="flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-[#FF3F1A] px-3 text-theme-xs font-bold text-[#FF3F1A] transition-colors hover:bg-[#FF3F1A]/10"
              >
                <PlusIcon className="size-3.5" aria-hidden="true" />
                Configurar recolección
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {fijas.map((c) => (
              <TarjetaRecoleccionFija
                key={c.id}
                configuracion={c}
                onEditar={() => abrirConfiguracion(c.id)}
                onAlternar={() => recoleccionesStore.alternarActiva(c.id)}
              />
            ))}
          </div>
        )
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[#ECECEC] bg-white shadow-sm dark:border-white/10 dark:bg-gray-900">
          <table className="w-full min-w-[1040px] text-left text-theme-xs">
            <thead>
              <tr className="border-b border-[#ECECEC] font-bold text-[#190088] dark:border-white/10 dark:text-white/80">
                <th className="whitespace-nowrap px-4 py-4">Transportadora</th>
                <th className="whitespace-nowrap px-4 py-4">Id de Recolección</th>
                <th className="whitespace-nowrap px-4 py-4">Bodega</th>
                <th className="whitespace-nowrap px-4 py-4">Fecha Programada de Recolección</th>
                <th className="whitespace-nowrap px-4 py-4">Estado</th>
                <th className="whitespace-nowrap px-4 py-4">N° de Paquetes</th>
                <th className="whitespace-nowrap px-4 py-4">Horario de Recolección</th>
                <th className="whitespace-nowrap px-4 py-4">Persona que Despacha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ECECEC] dark:divide-white/10">
              {citas.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-16">
                    <div className="flex flex-col items-center gap-4 text-center">
                      <IlustracionVacia />
                      <p className="text-theme-sm font-normal text-[#212121]/45 dark:text-white/40">
                        {VACIO_FILTROS}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                citas.map((r) => <FilaRecoleccion key={r.id} recoleccion={r} />)
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modal: nueva recolección eventual ────────────────────────────── */}
      {formulario && (
        <Modal isOpen onClose={() => setFormulario(null)} className="max-w-lg p-6">
          <h2 className="text-theme-2xl font-bold text-[#190088] dark:text-white">Nueva recolección</h2>
          <p className="mt-1 text-theme-xs font-light text-[#212121]/60 dark:text-white/50">
            Agenda la cita con la transportadora. Nace como <strong>Programada</strong>: la asignación la
            confirma ella, no este formulario.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-theme-xs font-bold text-[#212121] dark:text-white/80">Transportadora</span>
              <select
                value={formulario.transportadora}
                onChange={(e) => setFormulario({ ...formulario, transportadora: e.target.value })}
                className={campo}
              >
                <option value="">Elige una…</option>
                {TRANSPORTADORAS.map((t) => (
                  <option key={t.id} value={t.nombre}>
                    {t.nombre}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-theme-xs font-bold text-[#212121] dark:text-white/80">Bodega</span>
              <input
                value={formulario.bodega}
                onChange={(e) => setFormulario({ ...formulario, bodega: e.target.value })}
                placeholder="Ej: Bodega Principal"
                className={campo}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-theme-xs font-bold text-[#212121] dark:text-white/80">
                Fecha programada
              </span>
              <input
                type="date"
                value={formulario.fecha}
                onChange={(e) => setFormulario({ ...formulario, fecha: e.target.value })}
                className={campo}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-theme-xs font-bold text-[#212121] dark:text-white/80">
                Horario de recolección
              </span>
              <input
                value={formulario.horario}
                onChange={(e) => setFormulario({ ...formulario, horario: e.target.value })}
                placeholder="Ej: 14:00 - 16:00"
                className={campo}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-theme-xs font-bold text-[#212121] dark:text-white/80">
                N° de paquetes
              </span>
              <input
                type="number"
                min={1}
                value={formulario.paquetes}
                onChange={(e) => setFormulario({ ...formulario, paquetes: e.target.value })}
                placeholder="Ej: 24"
                className={campo}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-theme-xs font-bold text-[#212121] dark:text-white/80">
                Persona que despacha
              </span>
              <input
                value={formulario.despacha}
                onChange={(e) => setFormulario({ ...formulario, despacha: e.target.value })}
                placeholder="Quién entrega los paquetes en la puerta"
                className={campo}
              />
            </label>
          </div>

          {error && (
            <p
              role="alert"
              className="mt-4 rounded-xl bg-[#FF3F1A]/10 px-3 py-2 text-theme-xs font-bold text-[#FF3F1A]"
            >
              {error}
            </p>
          )}

          <div className="mt-6 flex items-center justify-end gap-3">
            <Button size="sm" variant="outline" onClick={() => setFormulario(null)}>
              Cancelar
            </Button>
            <button
              type="button"
              onClick={guardar}
              className="flex h-9 items-center rounded-lg bg-[#FF3F1A] px-4 text-theme-xs font-bold text-white transition-colors hover:bg-[#FF3F1A]/90 cursor-pointer"
            >
              Programar recolección
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
});

export default TransportadorasPage;
