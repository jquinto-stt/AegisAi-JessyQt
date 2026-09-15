import { useState } from "react";
import { useNavigate } from "react-router";
import { observer } from "mobx-react-lite";
import { PageMeta } from "@/shell/meta";
import { Card } from "@/elements/ui/card";
import { Button } from "@/elements/ui/button";
import { Badge } from "@/elements/ui/badge";
import { Tab, type TabItem } from "@/elements/ui/tabs";
import { MetricCard } from "@/compositions/metric-card";
import { GroupIcon, TimeIcon, BoxIconLine } from "@/icons";
import { queuesStore, sessionStore, type Saturation } from "@/stores";

// Etiqueta operativa del estado de la cola.
const satMeta: Record<Saturation, { label: string; color: "success" | "warning" | "error" }> = {
  ok: { label: "Fluyendo", color: "success" },
  busy: { label: "Acumulándose", color: "warning" },
  full: { label: "Saturada", color: "error" },
};

/**
 * OperadorInicioTurnos — Inicio propio del operador en Turnos (mock).
 *
 * Distinto al dashboard del admin: es personal y de SOLO LECTURA. Muestra quién
 * es el operador, un selector (tabs) de sus colas asignadas, el resumen de la
 * cola elegida y el turno en atención. No permite completar/avanzar desde aquí:
 * el CTA "Ir a atender" redirige a la gestión de turnos de esa cola.
 */
export const OperadorInicioTurnos = observer(() => {
  const navigate = useNavigate();

  const operador = sessionStore.operadorSimulado;
  // Colas asignadas al operador (en orden del store).
  const colas = queuesStore.queues.filter((q) => (operador?.colaIds ?? []).includes(q.id));

  const [activeColaId, setActiveColaId] = useState<string>(colas[0]?.id ?? "");
  const cola = colas.find((q) => q.id === activeColaId) ?? colas[0];

  // Sin colas asignadas (borde): mensaje simple.
  if (!cola) {
    return (
      <>
        <PageMeta title="Inicio" description="Tu espacio de trabajo" />
        <Header nombre={operador?.nombre} />
        <Card>
          <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            No tienes filas asignadas. Pídele al administrador acceso a una fila.
          </p>
        </Card>
      </>
    );
  }

  const sat = satMeta[queuesStore.saturationOf(cola)];
  const turnoActual = cola.serving[0] ?? null;

  const tabs: TabItem[] = colas.map((q) => ({ key: q.id, label: q.nombre, badge: q.waiting.length }));

  return (
    <>
      <PageMeta title="Inicio" description="Tu espacio de trabajo" />
      <Header nombre={operador?.nombre} />

      {/* Selector de cola — solo si hay varias */}
      {colas.length > 1 && (
        <div className="mb-6">
          <Tab items={tabs} activeTab={cola.id} onTabChange={setActiveColaId} variant="underline" />
        </div>
      )}

      {/* Resumen de la cola seleccionada */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          layout="horizontal"
          icon={<GroupIcon className="size-6" />}
          title="En espera"
          value={String(cola.waiting.length)}
          iconSize="w-14 h-14"
        />
        <MetricCard
          layout="horizontal"
          icon={<BoxIconLine className="size-6" />}
          title="Atendidos hoy"
          value={String(cola.done.length)}
          iconSize="w-14 h-14"
        />
        <MetricCard
          layout="horizontal"
          icon={<TimeIcon className="size-6" />}
          title="Tiempo prom."
          value={cola.tiempoProm > 0 ? `${cola.tiempoProm}m` : "--"}
          iconSize="w-14 h-14"
        />
        <Card>
          <div className="flex h-full flex-col justify-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">Estado de la fila</p>
            <div className="mt-2">
              <Badge color={sat.color} size="md">{cola.activa ? sat.label : "Pausada"}</Badge>
            </div>
          </div>
        </Card>
      </div>

      {/* Turno actual — SOLO LECTURA */}
      <div className="mt-6">
        <Card>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Turno actual</p>
                <span className="text-xs text-gray-400">· {cola.nombre}</span>
              </div>
              {turnoActual ? (
                <div className="mt-2">
                  <p className="text-3xl font-bold text-gray-800 dark:text-white/90">{turnoActual.numero}</p>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{turnoActual.cliente}</p>
                </div>
              ) : (
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  No hay turno en atención ahora.
                </p>
              )}
            </div>

            {/* No se completa desde aquí: solo redirige a la gestión de la cola. */}
            <Button size="sm" onClick={() => navigate(`/turnos?cola=${cola.id}`)}>
              Ir a atender
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
});

// ─── Encabezado personal (nombre + rol) ──────────────────────────────────────

const Header = ({ nombre }: { nombre?: string }) => (
  <div className="mb-6">
    <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">
      Hola, {nombre ?? "Operador"}
    </h1>
    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Operador de Turnos</p>
  </div>
);

export default OperadorInicioTurnos;
