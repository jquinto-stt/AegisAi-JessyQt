// ═══════════════════════════════════════════════════════════════════════════
// TIEMPO REAL: la bandeja se actualiza sola cada 3 s
// ═══════════════════════════════════════════════════════════════════════════
//
// ── Por qué NO es un `setInterval` que consulta a ciegas ───────────────────
//
// Un sondeo fijo cada 3 s gasta una consulta por operador aunque no pase nada
// (y en una bandeja abierta todo el día son decenas de miles de consultas
// vacías). Aquí la señal viene de Postgres por Realtime: **el evento es el
// disparador, el reloj solo pone el límite**. Es decir:
//
//   llega un evento  ─▶ se marca «hay algo nuevo»
//   el reloj corre   ─▶ cada 3 s, si hay algo marcado, se recarga y se desmarca
//
// Consecuencia deliberada: si no pasa nada, no se consulta NADA. Y si llegan
// treinta mensajes de golpe, se recarga UNA vez, no treinta — el coalescido
// convierte la ráfaga en una sola lectura, que es lo que evita que la bandeja
// parpadee y que el servidor reciba un latido por mensaje.
//
// ── Verificado antes de escribir esto ──────────────────────────────────────
//
// `necto.mensaje` y `necto.conversacion` se añadieron a la publicación
// `supabase_realtime` (antes estaba VACÍA: ninguna tabla publicaba cambios, y
// ese era el motivo real de que «no se reflejara» nada).
//
// Y se verificó que Realtime entrega DE VERDAD sobre el esquema `necto`, con el
// JWT del operador y pasando por RLS. Costó dos intentos porque el primero dio
// un falso negativo que conviene dejar escrito: **el slot de replicación de
// Postgres no existe hasta la primera suscripción y tarda unos segundos en
// crearse.** Medido: `realtime.subscription` tenía 1 fila mientras
// `pg_replication_slots` seguía vacío — suscripción aceptada, canal de entrega
// aún no montado. Un test que inserte 1 s después del `SUBSCRIBED` no recibe el
// evento y parece que Realtime «no funciona», cuando lo que falta es esperar.
// Con la ventana correcta llega: `INSERT {"texto":"RT-LARGO-…"}`.
import { getSupabase, ESQUEMA } from "@/lib/supabase";
import { conversacionesStore } from "@/stores/conversaciones.store";
import { pedidosStore } from "@/stores/pedidos.store";

/** Cada cuánto se aplica lo acumulado en segundo plano, como máximo. */
export const INTERVALO_MS = 500;

/** Columnas que importan de `mensaje`: el resto no cambia la bandeja. */
let hayCambios = false;
let intervalo: ReturnType<typeof setInterval> | null = null;
let canal: ReturnType<NonNullable<ReturnType<typeof getSupabase>>["channel"]> | null = null;

/**
 * Marca que hay algo nuevo. No recarga: eso lo decide el reloj.
 *
 * Es idempotente por diseño — mil eventos seguidos dejan la misma marca en
 * `true`, y por eso la ráfaga se convierte en una sola recarga.
 */
function marcarCambio(): void {
  hayCambios = true;
}

/**
 * Aplica lo acumulado si —y solo si— algo cambió.
 *
 * Se comprueba `origenDatos`: si la última lectura terminó en `seed` (porque se
 * cayó la sesión, por ejemplo), no tiene sentido insistir cada 3 s contra una
 * base que ya dijo que no. En ese caso no se recarga y se deja el motivo escrito
 * en la UI, que es más honesto que gastar peticiones que van a fallar.
 */
async function aplicarSiCambio(): Promise<void> {
  if (!hayCambios) return;
  hayCambios = false;

  if (conversacionesStore.origenDatos === "seed") return;

  // `cargarDesdeBase` es quien escribe `origenDatos` y `motivoSeed`; no se
  // duplica esa decisión aquí.
  await Promise.all([
    conversacionesStore.cargarDesdeBase(),
    pedidosStore.cargarDesdeBase(),
  ]);
}

/**
 * Enciende el tiempo real. Idempotente: llamarla dos veces no abre dos canales.
 *
 * Devuelve `true` si el canal quedó suscrito. `false` significa que no hay
 * configuración de Supabase — no un fallo, sino que la app está en modo maqueta
 * y no hay nada que escuchar.
 */
export function iniciarTiempoReal(): boolean {
  if (intervalo) return true; // ya estaba encendido

  const sb = getSupabase();
  if (!sb) return false;

  // El canal lleva el nombre del esquema y las dos tablas porque un canal de
  // Realtime es una suscripción con nombre: reusar un nombre ya tomado con otra
  // configuración devuelve el canal viejo y la suscripción nueva no se registra.
  canal = sb
    .channel("necto-bandeja")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: ESQUEMA, table: "mensaje" },
      (payload: any) => {
        if (payload?.new) {
          conversacionesStore.procesarMensajeRealtime(payload.new);
        }
        marcarCambio();
      }
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: ESQUEMA, table: "mensaje" },
      (payload: any) => {
        if (payload?.new) {
          conversacionesStore.procesarMensajeRealtime(payload.new);
        }
        marcarCambio();
      }
    )
    // `conversacion` cambia cuando el bot hace handoff o alguien toma el chat:
    // sin esto la bandeja no reflejaría el cambio de `modo_atencion`, que es
    // justo el estado que el operador mira para saber si le toca a él.
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: ESQUEMA, table: "conversacion" },
      marcarCambio
    )
    .on(
      "postgres_changes",
      { event: "INSERT", schema: ESQUEMA, table: "conversacion" },
      marcarCambio
    )
    .on(
      "postgres_changes",
      { event: "*", schema: ESQUEMA, table: "pedido" },
      marcarCambio
    )
    .subscribe();

  intervalo = setInterval(() => { void aplicarSiCambio(); }, INTERVALO_MS);
  return true;
}

/** Apaga el tiempo real y libera el canal. Para pruebas y para cerrar sesión. */
export async function detenerTiempoReal(): Promise<void> {
  if (intervalo) {
    clearInterval(intervalo);
    intervalo = null;
  }
  hayCambios = false;
  if (canal) {
    const sb = getSupabase();
    if (sb) await sb.removeChannel(canal);
    canal = null;
  }
}

/** Para las pruebas: ¿está encendido? */
export function tiempoRealActivo(): boolean {
  return intervalo !== null;
}
