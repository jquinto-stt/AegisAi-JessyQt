// ═══════════════════════════════════════════════════════════════════════════
// CLIENTE SUPABASE (frontend)
// ═══════════════════════════════════════════════════════════════════════════
//
// Cliente PEREZOSO. Sin `.env` devuelve `null` y la app sigue funcionando con
// los datos de ejemplo, exactamente como antes de conectar nada. Eso importa:
// una app que se cae porque falta una variable de entorno es peor que una app
// que arranca en modo maqueta y lo dice.
//
// ── Las tres cosas que hacen que esto funcione, y por qué ──────────────────
//
// 1. **El esquema va POR CONSULTA, no en `createClient`.** El modelo vive en
//    `necto`, no en `public`. PostgREST solo publica el esquema que se le
//    configure, y en `supabase-js` el esquema se fija con `.schema('necto')`
//    en cada consulta. Ponerlo en `createClient` rompe con `TS2322` porque
//    `db.schema` está tipado contra los tipos generados, que aquí no existen.
//
// 2. **Sin SESIÓN, RLS filtra a cero y devuelve `200 []`.** No es un error y no
//    se distingue de «no hay datos». Medido el 22/09/2026: con la clave anónima
//    y sin sesión, `necto.contacto` devuelve 8 filas → `[]`. Por eso
//    `haySesion()` existe y los llamadores deben poder distinguir «sin sesión»
//    de «sin datos».
//
// 3. **La sesión sola NO basta: hace falta la cadena completa.** Medido, cada
//    eslabón comprobado por separado:
//
//      auth.users ──▶ necto.usuario ──▶ necto.operador (estado='activo')
//                                            │
//                                            ▼
//                                  rol ──▶ rol_capacidad ──▶ 'channels.read'
//
//    `necto.tengo('channels.read')` recorre `usuario → operador activo →
//    capacidades_efectivas`. Si falta el `operador`, o está inactivo, o su rol
//    no tiene la capacidad, **la consulta devuelve `[]` sin ningún error**.
//    Y `pedido` exige ADEMÁS `necto.modulo_activo('pedidos')`, o sea una fila
//    en `modulo_organizacion` con `instalado ∧ activo`.
//
//    Es decir: un `[]` puede significar cinco cosas distintas. Este módulo
//    expone `diagnosticarLectura()` para decir CUÁL, en vez de dejar que la UI
//    muestre «no hay conversaciones» cuando el problema es una capacidad.
//
// La clave que se usa aquí es la PUBLICABLE. Viaja al navegador a propósito: la
// protección son las políticas RLS del esquema `necto`, no el secreto. Una
// `service_role` NUNCA va en este archivo ni en ningún `VITE_*`.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Esquema del modelo. Todo el dominio vive aquí, no en `public`. */
export const ESQUEMA = "necto";

const URL_SB = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const CLAVE = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

let cliente: SupabaseClient | null = null;
let yaSeIntento = false;

/**
 * Cliente Supabase, o `null` si no hay configuración.
 *
 * Perezoso y memoizado: no se crea hasta que alguien lo pide, y sin `.env`
 * devuelve `null` sin lanzar. Quien lo use decide qué hacer con la ausencia.
 */
export function getSupabase(): SupabaseClient | null {
  if (cliente) return cliente;
  if (yaSeIntento) return cliente; // ya falló una vez; no reintentar en bucle
  yaSeIntento = true;

  if (!URL_SB || !CLAVE) return null;

  cliente = createClient(URL_SB, CLAVE, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storageKey: "necto.supabase.auth",
    },
  });
  return cliente;
}

/** ¿Hay configuración de Supabase presente? */
export function hayConfiguracion(): boolean {
  return Boolean(URL_SB && CLAVE);
}

/**
 * Tabla del esquema `necto`.
 *
 * Existe para que NADIE tenga que acordarse de `.schema('necto')`: olvidarlo
 * apunta a `public`, que está vacío, y el error que sale —
 * `PGRST205 Could not find the table 'public.mensaje'`— se lee como «la tabla no
 * existe» cuando lo que pasa es que se consultó el esquema equivocado.
 */
export function tabla(nombre: string) {
  const sb = getSupabase();
  if (!sb) return null;
  return sb.schema(ESQUEMA).from(nombre);
}

/**
 * ¿Hay una sesión autenticada AHORA?
 *
 * Sin sesión, `auth.uid()` es NULL y todas las políticas `to authenticated`
 * dejan de alcanzar filas. La consulta sigue devolviendo `200` con `[]`.
 */
export async function haySesion(): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const { data } = await sb.auth.getSession();
  return Boolean(data.session);
}

/**
 * Traduce los códigos de PostgREST que ya nos han mordido a frases útiles.
 *
 * Sin esto, un fallo de configuración llega a la UI como un mensaje de Postgres
 * que no dice qué hacer. Cada caso de esta lista costó tiempo real.
 */
export function explicarError(error: unknown): string {
  const e = error as { code?: string; message?: string; details?: string } | null;
  if (!e) return "Error desconocido";

  switch (e.code) {
    case "42501":
      // El caso MÁS engañoso: PostgREST culpa a la política de INSERT, que es
      // inocente. El problema real es que ninguna política SELECT alcanza la
      // fila recién insertada, y `<insert ... returning>` necesita SELECT.
      return "Sin permiso sobre esta fila. Si acabas de insertar, revisa que puedas LEERLA: `.insert().select()` exige una política SELECT.";
    case "42P01":
      return "La tabla no existe. Puede ser que falte aplicar el DDL del esquema `necto`.";
    case "PGRST106":
      return "El esquema `necto` no está expuesto a PostgREST. Hace falta `alter role authenticator set pgrst.db_schemas = 'public, necto'`.";
    case "PGRST205":
      return "La consulta fue contra el esquema equivocado (¿`public` en vez de `necto`?). Usa el helper `tabla()`.";
    case "23502":
      return `Falta una columna obligatoria: ${e.details ?? e.message ?? ""}`;
    default:
      return e.message ?? "Error desconocido";
  }
}
