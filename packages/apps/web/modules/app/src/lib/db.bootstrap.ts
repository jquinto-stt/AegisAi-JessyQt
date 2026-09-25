// ═══════════════════════════════════════════════════════════════════════════
// ARRANQUE DE LA CONEXIÓN REAL (sesión + primera carga de datos)
// ═══════════════════════════════════════════════════════════════════════════
//
// Este archivo es la pieza que faltaba. Los adaptadores, el cliente y la capa de
// I/O existían y compilaban, pero NADIE los llamaba: la app seguía pintando el
// seed y no había forma de saber si la conexión funcionaba.
//
// ── Por qué NO va en el constructor del store ──────────────────────────────
//
// Los stores son singletons de import. Hacer I/O en el constructor convierte un
// `import` en un efecto de red: cualquiera que importe el store —incluido un
// test— dispararía dos peticiones y una escritura en `localStorage`. El arranque
// va aquí, explícito, y se invoca una sola vez desde `App.tsx`, igual que
// `bootstrapAssistant()` (ver `@/assistant/bootstrap`).
//
// ── Las tres condiciones que tienen que darse ─────────────────────────────
//
//   1. hay configuración   (VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY)
//   2. hay sesión          (sin `auth.uid()` RLS devuelve `200 []`, no un error)
//   3. la cadena está completa (usuario → operador ACTIVO → rol → capacidad)
//
// Si falla cualquiera, el store queda en `seed` con el motivo escrito, y la UI
// lo dice. La app NUNCA se cae por esto: sin `.env` sigue funcionando como
// maqueta, que es lo que hacía antes de conectar nada.
import { getSupabase, hayConfiguracion, haySesion } from "@/lib/supabase";
import { cargarTodo, diagnosticarPermisoCanal } from "@/lib/conversaciones.repo";
import { iniciarTiempoReal } from "@/lib/tiempo-real";
import { conversacionesStore } from "@/stores/conversaciones.store";
import { pedidosStore } from "@/stores/pedidos.store";

/**
 * Credenciales de la sesión de demostración.
 *
 * Se pueden sobrescribir por `.env` para no dejarlas fijas en el código cuando
 * haya usuarios reales. Se declaran aquí y no en `supabase.ts` porque son de la
 * APLICACIÓN, no del cliente HTTP.
 */
const DEMO_EMAIL =
  (import.meta.env.VITE_DEMO_EMAIL as string | undefined) ?? "demo@necto.io";
const DEMO_PASSWORD =
  (import.meta.env.VITE_DEMO_PASSWORD as string | undefined) ?? "DemoNecto2026!";

let inicializado = false;

/**
 * Asegura una sesión autenticada.
 *
 * Devuelve `true` si al terminar hay sesión. **No lanza**: devuelve el motivo
 * para que quien llame pueda escribirlo en la UI en vez de tragárselo.
 *
 * El orden importa: primero se mira si YA hay sesión persistida
 * (`storageKey: 'necto.supabase.auth'`), porque `autoRefreshToken` la mantiene
 * viva y volver a firmar en cada recarga gasta cupo y añade latencia sin motivo.
 */
export async function asegurarSesion(): Promise<
  { ok: true } | { ok: false; motivo: string }
> {
  const sb = getSupabase();
  if (!sb) {
    return { ok: false, motivo: "Sin configuración de Supabase (falta `.env`)." };
  }

  if (await haySesion()) return { ok: true };

  const { error } = await sb.auth.signInWithPassword({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
  });

  if (error) {
    // El caso que más veces muerde aquí es `mailer_autoconfirm: false`: el
    // usuario existe pero no está confirmado, y el mensaje de Supabase
    // («Email not confirmed») suena a problema del correo cuando lo que hay es
    // una configuración de proyecto.
    return {
      ok: false,
      motivo: `No se pudo iniciar sesión como ${DEMO_EMAIL}: ${error.message}`,
    };
  }

  return { ok: true };
}

/**
 * Conecta la app con `necto`: sesión, diagnóstico de permiso y primera carga.
 *
 * Idempotente. React StrictMode monta dos veces en desarrollo y la llamada es
 * de efectos secundarios, así que la guarda no es un adorno: sin ella se
 * lanzarían dos logins y dos lecturas completas en cada recarga.
 */
export async function bootstrapConversaciones(): Promise<void> {
  if (inicializado) return;
  inicializado = true;

  // Sin Supabase configurado no se toca nada: los stores siguen con el seed y
  // `cargarDesdeBase()` escribiría el mismo motivo por una ruta más larga.
  if (!hayConfiguracion()) {
    conversacionesStore.motivoSeed =
      "Sin configuración de Supabase: mostrando datos de ejemplo.";
    return;
  }

  const sesion = await asegurarSesion();
  if (!sesion.ok) {
    conversacionesStore.origenDatos = "seed";
    conversacionesStore.motivoSeed = sesion.motivo;
    return;
  }

  // Se diagnostica ANTES de leer. Un `[]` puede ser «no hay conversaciones» o
  // «falta un eslabón de la cadena de permisos», y son cosas distintas: la
  // primera es información, la segunda es una instalación a medias. Preguntarle
  // a `necto.tengo()` es preguntarle a la misma verdad que usan las políticas.
  const permiso = await diagnosticarPermisoCanal();
  if (!permiso.puede) {
    conversacionesStore.origenDatos = "seed";
    conversacionesStore.motivoSeed = `Sin permiso para leer conversaciones. ${permiso.detalle}`;
    return;
  }

  // `cargarDesdeBase` es quien escribe `origenDatos` y `motivoSeed` para los
  // cinco desenlaces de la lectura. No se duplica esa decisión aquí.
  await Promise.all([
    conversacionesStore.cargarDesdeBase(),
    pedidosStore.cargarDesdeBase(),
  ]);

  // El tiempo real se enciende DESPUÉS de la primera lectura y solo si esa
  // lectura salió bien. Hacerlo antes abriría un canal que puede no tener nada
  // que escuchar (sin permiso, sin sesión) y gastaría una suscripción de
  // Realtime para quedarse en `seed`. Encenderlo aquí significa: «hay datos
  // reales en pantalla, ahora manténlos al día».
  if (conversacionesStore.origenDatos === "real") {
    iniciarTiempoReal();
  }
}

/**
 * Refresca la bandeja con lo que haya en la base AHORA.
 *
 * Existe para que el operador pueda traer los mensajes que el bot acaba de
 * escribir sin recargar la página. Devuelve `false` si no se pudo leer, para que
 * el botón pueda decirlo en vez de parecer que hizo algo.
 */
export async function refrescarDesdeBase(): Promise<boolean> {
  if (!hayConfiguracion()) return false;
  if (!(await haySesion())) return false;
  const res = await cargarTodo();
  if (res.estado !== "ok") return false;
  await Promise.all([
    conversacionesStore.cargarDesdeBase(),
    pedidosStore.cargarDesdeBase(),
  ]);
  return true;
}
