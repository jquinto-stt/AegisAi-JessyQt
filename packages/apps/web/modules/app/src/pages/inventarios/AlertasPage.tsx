import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { observer } from "mobx-react-lite";

import { PageMeta } from "@/shell/meta";
import { Button } from "@/elements/ui/button";
import { Card } from "@/elements/ui/card";
import { Badge } from "@/elements/ui/badge";
import { AlertHexaIcon } from "@/icons";
import { inventariosStore, type TipoAlerta } from "@/stores";
import { CabeceraPagina, ContenedorPagina } from "./inventarios.ui";
import { SinResultados } from "./inventarios.widgets";
import { SEVERIDAD_META, TIPO_ALERTA_META } from "./inventarios.constants";
import { antiguedad, formatearFechaHora, pieDeAlerta } from "./inventarios.presentacion";
import { cn } from "@/utils";

export const AlertasPage = observer(function AlertasPage() {
  const navigate = useNavigate();
  const [filtroTipo, setFiltroTipo] = useState<TipoAlerta | "__todas__">("__todas__");

  const todas = inventariosStore.alertas;

  const filtradas = useMemo(
    () =>
      todas.filter((a) => {
        if (filtroTipo !== "__todas__" && a.tipo !== filtroTipo) return false;
        return true;
      }),
    [todas, filtroTipo],
  );

  const conteoPorTipo = useMemo(() => {
    return {
      linea_danada: todas.filter((a) => a.tipo === "linea_danada").length,
      inventario_estancado: todas.filter((a) => a.tipo === "inventario_estancado").length,
      inventario_pendiente: todas.filter((a) => a.tipo === "inventario_pendiente").length,
    };
  }, [todas]);

  return (
    <>
      <PageMeta
        title="Alertas · Inventarios"
        description="Situaciones que requieren atención en los inventarios."
      />

      <ContenedorPagina>
        <CabeceraPagina
          titulo="Alertas de inventario"
          descripcion="Novedades y situaciones detectadas automáticamente en tus conteos y productos."
        />

        {/* ── Resumen de situación ────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => setFiltroTipo(filtroTipo === "linea_danada" ? "__todas__" : "linea_danada")}
            className={cn(
              "rounded-2xl border p-4 text-left transition-all",
              filtroTipo === "linea_danada"
                ? "border-error-500 bg-error-50/50 shadow-sm dark:border-error-500/50 dark:bg-error-500/10"
                : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-800 dark:bg-white/[0.02] dark:hover:border-gray-700",
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-error-700 dark:text-error-400">
                Productos dañados
              </span>
              <span className="flex h-2 w-2 rounded-full bg-error-500" />
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums text-ink-title dark:text-white">
              {conteoPorTipo.linea_danada}
            </p>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Requieren reposición o baja
            </p>
          </button>

          <button
            type="button"
            onClick={() => setFiltroTipo(filtroTipo === "inventario_estancado" ? "__todas__" : "inventario_estancado")}
            className={cn(
              "rounded-2xl border p-4 text-left transition-all",
              filtroTipo === "inventario_estancado"
                ? "border-brand-500 bg-brand-50/50 shadow-sm dark:border-brand-500/50 dark:bg-brand-500/10"
                : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-800 dark:bg-white/[0.02] dark:hover:border-gray-700",
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-400">
                Conteos detenidos
              </span>
              <span className="flex h-2 w-2 rounded-full bg-brand-500" />
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums text-ink-title dark:text-white">
              {conteoPorTipo.inventario_estancado}
            </p>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              En curso sin avance reciente
            </p>
          </button>

          <button
            type="button"
            onClick={() => setFiltroTipo(filtroTipo === "inventario_pendiente" ? "__todas__" : "inventario_pendiente")}
            className={cn(
              "rounded-2xl border p-4 text-left transition-all",
              filtroTipo === "inventario_pendiente"
                ? "border-brand-500 bg-brand-50/50 shadow-sm dark:border-brand-500/50 dark:bg-brand-500/10"
                : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-800 dark:bg-white/[0.02] dark:hover:border-gray-700",
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-secondary-600 dark:text-brand-400">
                Conteos sin iniciar
              </span>
              <span className="flex h-2 w-2 rounded-full bg-brand-500" />
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums text-ink-title dark:text-white">
              {conteoPorTipo.inventario_pendiente}
            </p>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Creados en borrador
            </p>
          </button>
        </div>

        {/* ── Filtro rápido de categorías ─────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFiltroTipo("__todas__")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              filtroTipo === "__todas__"
                ? "bg-brand-500 text-white shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10",
            )}
          >
            Todas
            <span className={cn("tabular-nums text-[11px]", filtroTipo === "__todas__" ? "text-white/80" : "text-gray-500")}>
              {todas.length}
            </span>
          </button>

          {(Object.keys(TIPO_ALERTA_META) as TipoAlerta[]).map((t) => {
            const n = todas.filter((a) => a.tipo === t).length;
            const activa = filtroTipo === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setFiltroTipo(activa ? "__todas__" : t)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  activa
                    ? "bg-brand-500 text-white shadow-sm"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10",
                )}
              >
                {TIPO_ALERTA_META[t].label}
                <span className={cn("tabular-nums text-[11px]", activa ? "text-white/80" : "text-gray-500")}>
                  {n}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Lista de alertas ──────────────────────────────────────────── */}
        {filtradas.length === 0 ? (
          <SinResultados
            titulo={filtroTipo !== "__todas__" ? "No hay alertas en esta categoría" : "Todo está al día"}
            detalle={
              filtroTipo !== "__todas__"
                ? "No se encontraron situaciones pendientes con este filtro."
                : "No se registran productos dañados ni conteos con retrasos pendientes."
            }
          />
        ) : (
          <div className="space-y-3">
            {filtradas.map((a) => {
              const sev = SEVERIDAD_META[a.severidad];
              const tipo = TIPO_ALERTA_META[a.tipo];
              return (
                <Card key={a.id} className="p-5 transition-shadow hover:shadow-sm">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3.5">
                      <span
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                          a.severidad === "alta"
                            ? "bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400"
                            : a.severidad === "media"
                              ? "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-400"
                              : "bg-brand-50 text-secondary-600 dark:bg-brand-500/15 dark:text-brand-400",
                        )}
                      >
                        <AlertHexaIcon className="h-5 w-5" />
                      </span>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge color={sev.color} size="xs">
                            {sev.label}
                          </Badge>
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                            {tipo.label}
                          </span>
                          <span className="text-xs text-gray-600 dark:text-gray-400">·</span>
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            {antiguedad(a.fechaReferencia)}
                          </span>
                        </div>

                        <h3 className="mt-1 text-sm font-semibold text-ink-title dark:text-gray-100">
                          {a.titulo}
                        </h3>
                        <p className="mt-1 text-xs leading-relaxed text-gray-600 dark:text-gray-300">
                          {a.descripcion}
                        </p>
                        {/* La antigüedad y el pie NO son lo mismo, y confundirlos
                            producía un dato falso. La alerta es **derivada**
                            (`inventariosStore.alertas` se recalcula en cada
                            lectura), así que no «se registró» ningún día: el pie
                            fechaba cuándo nació el HECHO que la sostiene (el
                            conteo, o la última línea contada), que es otra cosa
                            que lo que el rótulo «Registrado el» afirma.
                            Se nombra el hecho en vez de inventar un registro, y
                            se omite cuando el hecho ya es la antigüedad misma
                            (el conteo estancado ya dice «lleva N días»). */}
                        {pieDeAlerta(a, formatearFechaHora) && (
                          <p className="mt-1 text-[11px] text-gray-600 dark:text-gray-400">
                            {pieDeAlerta(a, formatearFechaHora)}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
                      {a.inventarioId && (
                        <Button
                          size="sm"
                          onClick={() => navigate(`/inventarios/${a.inventarioId}`)}
                        >
                          Ir al conteo
                        </Button>
                      )}
                      {a.elementoId && !a.inventarioId && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/inventarios/elementos/${a.elementoId}`)}
                        >
                          Ver producto
                        </Button>
                      )}
                      {a.elementoId && a.inventarioId && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/inventarios/elementos/${a.elementoId}`)}
                        >
                          Ver producto
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </ContenedorPagina>
    </>
  );
});

export default AlertasPage;
