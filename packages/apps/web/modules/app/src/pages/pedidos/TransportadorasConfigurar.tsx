import { useState } from "react";
import { CheckIcon, ClipboardDocumentListIcon } from "@heroicons/react/24/outline";

import {
  DIAS_SEMANA,
  ETIQUETA_DIA,
  ETIQUETA_RANGO,
  RANGOS_RECOLECCION,
  type DatosConfiguracionFija,
  type DiaSemana,
  type RangoRecoleccion,
} from "@/domain/pedidos/recolecciones.domain";
import { TRANSPORTADORAS } from "@/domain/pedidos/transportadoras.catalogo";
import { transportadorasDisponibles } from "@/domain/pedidos/transportadoras.seleccion";
import { pedidosStore } from "@/stores";
import { campo } from "./transportadoras.campos";

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURAR RECOGIDA
// ═══════════════════════════════════════════════════════════════════════════
//
// Pantalla, no modal: son siete campos, una rejilla de días y una explicación por
// bloque. En un modal de 500 px el formulario se convierte en una columna que hay
// que recorrer con scroll y el botón de guardar deja de verse.
//
// El orden sigue el del trabajo real: primero CUÁNDO pasa la transportadora
// (los días), después DESDE DÓNDE recoge (bodega) y por último QUIÉN entrega y
// cuántos paquetes. Los tres primeros campos son los que no se pueden dejar
// vacíos; las notas son lo único opcional y así se dice en la etiqueta.
//
// La validación no vive aquí: la decide el dominio (`validarConfiguracionFija`) y
// llega como un texto de error. Este componente solo pinta lo que le dan y
// devuelve los datos tal como están.
// ═══════════════════════════════════════════════════════════════════════════

const Bloque = ({
  titulo,
  ayuda,
  children,
}: {
  titulo: string;
  ayuda?: string;
  children: React.ReactNode;
}) => (
  <section className="flex flex-col gap-2.5">
    <div>
      <h2 className="text-theme-sm font-bold text-[#212121] dark:text-white">{titulo}</h2>
      {ayuda && (
        <p className="mt-0.5 text-[11px] font-normal leading-snug text-[#212121]/50 dark:text-white/40">
          {ayuda}
        </p>
      )}
    </div>
    {children}
  </section>
);

const Etiqueta = ({ children }: { children: React.ReactNode }) => (
  <span className="text-[11px] font-bold text-[#212121]/70 dark:text-white/60">{children}</span>
);

interface Props {
  inicial: DatosConfiguracionFija;
  editando: boolean;
  error: string | null;
  onCancelar: () => void;
  onGuardar: (datos: DatosConfiguracionFija) => void;
  /** Avisa de que el formulario cambió, para retirar el error de la intentona anterior. */
  onCambio: () => void;
}

export const TransportadorasConfigurar = ({
  inicial,
  editando,
  error,
  onCancelar,
  onGuardar,
  onCambio,
}: Props) => {
  const [datos, setDatos] = useState<DatosConfiguracionFija>(inicial);

  /**
   * Solo las transportadoras encendidas en Ajustes de pedidos.
   *
   * Una recolección la hace una transportadora real: ofrecer una que el negocio
   * apagó sería programar una recogida con alguien con quien ya no se despacha.
   * Si apagó todas, se cae al catálogo para que el formulario siga siendo
   * completable en vez de quedarse sin opciones.
   */
  const opciones = (() => {
    const disponibles = transportadorasDisponibles({
      habilitadas: pedidosStore.config.transportadorasHabilitadas,
      favorita: pedidosStore.config.transportadoraFavorita,
    });
    return disponibles.length > 0 ? disponibles : TRANSPORTADORAS;
  })();

  const cambiar = <K extends keyof DatosConfiguracionFija>(
    clave: K,
    valor: DatosConfiguracionFija[K],
  ) => {
    onCambio();
    setDatos((prev) => ({ ...prev, [clave]: valor }));
  };

  const alternarDia = (dia: DiaSemana) => {
    onCambio();
    setDatos((prev) => ({
      ...prev,
      dias: prev.dias.includes(dia) ? prev.dias.filter((d) => d !== dia) : [...prev.dias, dia],
    }));
  };

  return (
    <div className="flex w-full flex-col gap-6 font-sans">
      {/* ── Cabecera ─────────────────────────────────────────────────────── */}
      <header className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#ECECEC]/70 text-[#190088] dark:bg-white/[0.06] dark:text-white">
          <ClipboardDocumentListIcon className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h1 className="text-theme-2xl font-bold tracking-tight text-[#190088] lg:text-title-md dark:text-white">
            Configurar Recogida
          </h1>
          <p className="mt-1 max-w-2xl text-theme-sm font-light text-[#212121]/70 dark:text-white/60">
            Selecciona los datos de tu recolección para programar o configurar una recogida.
          </p>
        </div>
      </header>

      {/* ── Frecuencia ───────────────────────────────────────────────────── */}
      <Bloque
        titulo="Elige uno o varios días de la semana para configurar la recolección."
        ayuda="La transportadora pasará por la bodega todos los días que marques."
      >
        <div className="grid grid-cols-7 gap-1.5">
          {DIAS_SEMANA.map((dia) => {
            const activo = datos.dias.includes(dia);
            return (
              <button
                key={dia}
                type="button"
                onClick={() => alternarDia(dia)}
                aria-pressed={activo}
                className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border py-2.5 transition-colors ${
                  activo
                    ? "border-[#FF3F1A] bg-[#FF3F1A]/10"
                    : "border-[#ECECEC] hover:border-[#212121]/20 dark:border-white/15 dark:hover:border-white/30"
                }`}
              >
                <span
                  className={`flex size-5 items-center justify-center rounded-md border transition-colors ${
                    activo
                      ? "border-[#FF3F1A] bg-[#FF3F1A] text-white"
                      : "border-[#212121]/25 dark:border-white/25"
                  }`}
                >
                  {activo && <CheckIcon className="size-3" strokeWidth={3} aria-hidden="true" />}
                </span>
                <span
                  className={`text-[11px] font-bold ${
                    activo ? "text-[#FF3F1A]" : "text-[#212121]/70 dark:text-white/60"
                  }`}
                >
                  {ETIQUETA_DIA[dia]}
                </span>
              </button>
            );
          })}
        </div>
      </Bloque>

      {/* ── Transportadora ───────────────────────────────────────────────── */}
      <Bloque
        titulo="Transportadora"
        ayuda="La que pasa por la bodega. Si cambia, la recolección es otra."
      >
        <select
          value={datos.transportadora}
          onChange={(e) => cambiar("transportadora", e.target.value)}
          aria-label="Transportadora"
          className={`${campo} max-w-sm`}
        >
          <option value="">Elige una…</option>
          {opciones.map((t) => (
            <option key={t.id} value={t.nombre}>
              {t.nombre}
            </option>
          ))}
        </select>
      </Bloque>

      {/* ── Bodega ───────────────────────────────────────────────────────── */}
      <Bloque
        titulo="Bodega"
        ayuda="Lugar en el que se hará la recolección de paquetes según corresponda."
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <Etiqueta>Nombre de la bodega</Etiqueta>
            <input
              value={datos.bodega}
              onChange={(e) => cambiar("bodega", e.target.value)}
              placeholder="Ej: Bodega Principal"
              className={campo}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <Etiqueta>Dirección</Etiqueta>
            <input
              value={datos.direccion}
              onChange={(e) => cambiar("direccion", e.target.value)}
              placeholder="Ej: Calle 36 Sur #48B-85, Medellín"
              className={campo}
            />
          </label>
        </div>
      </Bloque>

      {/* ── Quién despacha ───────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-[#ECECEC] p-4 dark:border-white/10">
        <h2 className="text-theme-sm font-bold text-[#212121] dark:text-white">
          Datos de quien despacha
        </h2>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <Etiqueta>Nombre de quien despacha</Etiqueta>
            <input
              value={datos.despachaNombre}
              onChange={(e) => cambiar("despachaNombre", e.target.value)}
              placeholder="Ej: Fulanito"
              className={campo}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <Etiqueta>Apellidos</Etiqueta>
            <input
              value={datos.despachaApellidos}
              onChange={(e) => cambiar("despachaApellidos", e.target.value)}
              placeholder="Ej: De Tal"
              className={campo}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <Etiqueta>Rango de recolección</Etiqueta>
            <select
              value={datos.rango}
              onChange={(e) => cambiar("rango", e.target.value as RangoRecoleccion)}
              className={campo}
            >
              {RANGOS_RECOLECCION.map((r) => (
                <option key={r} value={r}>
                  {ETIQUETA_RANGO[r]}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <Etiqueta>Número de paquetes</Etiqueta>
            <input
              type="number"
              min={1}
              value={datos.paquetes}
              onChange={(e) => cambiar("paquetes", e.target.value)}
              placeholder="Ej: 24"
              className={campo}
            />
          </label>
        </div>

        <label className="mt-3 flex flex-col gap-1.5">
          <Etiqueta>Información adicional de la recolección (opcional)</Etiqueta>
          <textarea
            value={datos.notas}
            onChange={(e) => cambiar("notas", e.target.value)}
            rows={3}
            placeholder="Ej: llamar al llegar, el portón está sobre la carrera"
            className="w-full resize-y rounded-xl border border-[#ECECEC] bg-white px-3 py-2 text-theme-sm text-[#212121] outline-hidden transition-colors focus:border-[#97D6DF] focus:ring-2 focus:ring-[#97D6DF]/25 dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
          />
        </label>
      </section>

      {error && (
        <p
          role="alert"
          className="rounded-xl bg-[#FF3F1A]/10 px-3 py-2 text-theme-xs font-bold text-[#FF3F1A]"
        >
          {error}
        </p>
      )}

      {/* ── Acciones ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#ECECEC] pt-4 dark:border-white/10">
        <button
          type="button"
          onClick={onCancelar}
          className="flex h-10 cursor-pointer items-center rounded-xl border border-[#ECECEC] px-4 text-theme-xs font-bold text-[#212121]/70 transition-colors hover:text-[#212121] dark:border-white/15 dark:text-white/60 dark:hover:text-white"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => onGuardar(datos)}
          className="flex h-10 cursor-pointer items-center rounded-xl bg-[#FF3F1A] px-4 text-theme-xs font-bold text-white transition-colors hover:bg-[#FF3F1A]/90"
        >
          {editando ? "Guardar cambios" : "Configurar Recolección"}
        </button>
      </div>
    </div>
  );
};
