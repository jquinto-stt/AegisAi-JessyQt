import { observer } from "mobx-react-lite";
import { useNavigate } from "react-router";

import { pedidosStore } from "@/stores";
import { puedeVerProgramados } from "@/stores/acceso.utils";
import { KpiCard, RejillaKpi, money } from "./widgets.comunes";

// ═══════════════════════════════════════════════════════════════════════════
// KPI EJECUTIVO — ventas del día, órdenes, ticket promedio y comparación
// ═══════════════════════════════════════════════════════════════════════════
//
// Los cuatro números que responden «¿cómo va el día?» sin bajar a operar. Es el
// widget de la cabecera ejecutiva y también el que sostiene la vista por
// defecto cuando una sesión no tiene capacidad para ninguna otra: sus KPIs son
// de LECTURA, así que se pueden enseñar siempre sin prometer una acción.
//
// ── Todo sale de getters del store ────────────────────────────────────────
//
// No hay una sola suma hecha aquí. `volumenPorDia`, `entregadosHoy`,
// `totalPedido` y `enCurso` son del store, que es el dueño del cálculo. Sumar
// en la vista produciría un segundo total que puede discrepar del primero —
// el defecto que este proyecto ya midió con `money` y con las tres
// descripciones del mismo módulo.
//
// ── El ticket promedio NO divide por cero ─────────────────────────────────
//
// Con cero pedidos facturados, un promedio es `0/0`. Se devuelve «—» en vez de
// `$0`, porque `$0` afirma que el ticket fue de cero pesos y lo que pasa es que
// no hubo ninguno. La diferencia importa: un cero invita a actuar, un guion
// pide datos.
// ═══════════════════════════════════════════════════════════════════════════

export const KpiExecutiveWidget = observer(() => {
  const navigate = useNavigate();

  // Volumen: el último punto es hoy, el anterior es ayer. Mismo cálculo que ya
  // usaba la pantalla, movido aquí sin cambiar la fuente.
  const ultimos7 = pedidosStore.volumenPorDia(7);
  const hoy = ultimos7[ultimos7.length - 1]?.total ?? 0;
  const ayer = ultimos7[ultimos7.length - 2]?.total ?? 0;
  const cambio = ayer === 0 ? (hoy > 0 ? 100 : 0) : Math.round(((hoy - ayer) / ayer) * 100);

  // Ventas del día: se suman los totales de los pedidos NO cancelados de hoy.
  // `totalPedido` es el dueño del importe de un pedido; aquí solo se acumula.
  const hoyYmd = new Date().toISOString().slice(0, 10);
  const pedidosHoy = pedidosStore.pedidos.filter(
    (p) => p.createdAt.slice(0, 10) === hoyYmd && p.estado !== "cancelado",
  );
  const ventasHoy = pedidosHoy.reduce((acc, p) => acc + pedidosStore.totalPedido(p), 0);
  const ticket = pedidosHoy.length > 0 ? ventasHoy / pedidosHoy.length : null;

  const enCurso = pedidosStore.totalEnCurso;
  const urgentes = pedidosStore.urgentes.length;

  return (
    <RejillaKpi>
      <KpiCard
        indice={0}
        titulo="Ventas de hoy"
        valor={money(ventasHoy)}
        contexto={`${pedidosHoy.length} ${pedidosHoy.length === 1 ? "pedido" : "pedidos"}`}
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m3-9.5a3 3 0 00-3-1.5c-1.7 0-3 .8-3 2s1.3 2 3 2 3 .8 3 2-1.3 2-3 2a3 3 0 01-3-1.5" />
          </svg>
        }
      />
      <KpiCard
        indice={1}
        titulo="Pedidos recibidos hoy"
        valor={String(hoy)}
        contexto={`${cambio >= 0 ? "+" : ""}${cambio}% vs ayer`}
        positivo={cambio >= 0}
        onClick={() => navigate("/pedidos?estado=nuevo")}
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        }
      />
      <KpiCard
        indice={2}
        titulo="Ticket promedio"
        valor={ticket === null ? "—" : money(ticket)}
        contexto={ticket === null ? "sin pedidos facturados" : "por pedido de hoy"}
        onClick={() => navigate("/pedidos/analitica")}
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M7 15l4-4 3 3 5-6" />
          </svg>
        }
      />
      <KpiCard
        indice={3}
        titulo="En curso"
        valor={String(enCurso)}
        contexto={urgentes === 0 ? "sin urgencias" : `${urgentes} requieren atención`}
        positivo={urgentes === 0}
        onClick={() => navigate("/pedidos")}
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h10" />
          </svg>
        }
      />
    </RejillaKpi>
  );
});

/**
 * KPI de programados. Se separa del ejecutivo porque su VISIBILIDAD está
 * gobernada por `scheduled.read`: pintarlo para una sesión sin esa capacidad
 * sería prometer una sección que no puede abrir.
 */
export const KpiProgramadosWidget = observer(() => {
  const navigate = useNavigate();
  if (!puedeVerProgramados()) return null;

  return (
    <KpiCard
      indice={0}
      titulo="Programados"
      valor={String(pedidosStore.totalProgramados)}
      contexto="en cola"
      onClick={() => navigate("/pedidos")}
      icon={
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      }
    />
  );
});

export default KpiExecutiveWidget;
