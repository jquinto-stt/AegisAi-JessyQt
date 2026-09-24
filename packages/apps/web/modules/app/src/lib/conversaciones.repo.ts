// ═══════════════════════════════════════════════════════════════════════════
// CARGA DE DATOS REALES (conversaciones, mensajes, contactos)
// ═══════════════════════════════════════════════════════════════════════════
//
// Lee de `necto` y devuelve los tipos del dominio. NUNCA lanza: devuelve un
// resultado discriminado, porque el llamador tiene que poder distinguir cuatro
// situaciones que se parecen mucho y significan cosas distintas:
//
//   sin_configuracion  no hay `.env`           → modo maqueta, es legítimo
//   sin_sesion         no hay `auth.uid()`    → RLS devolverá [] y NO es «no hay datos»
//   sin_permiso        falta un eslabón        → capacidad/módulo, hay que decirlo
//   ok                 datos reales (quizá 0)  → «0» es información, no fallo
//
// ── Por qué este archivo existe separado del store ────────────────────────
//
// El store es el dueño del estado y sigue igual. Esto es la capa de I/O: lee,
// adapta y entrega. Mantenerlo fuera permite probar los adaptadores sin
// montar MobX y sin red, que es como se probaron.
import { getSupabase, hayConfiguracion, haySesion, ESQUEMA, explicarError } from "@/lib/supabase";
import {
  construirConversaciones,
  construirMensajes,
  type FilaContacto,
  type FilaConversacion,
  type FilaMensaje,
} from "@/lib/db.adapters";
import type { Conversacion, Mensaje } from "@/stores/conversaciones.types";

export type ResultadoLectura<T> =
  | { estado: "ok"; datos: T; aviso?: string }
  | { estado: "sin_configuracion" }
  | { estado: "sin_sesion" }
  | { estado: "sin_permiso"; detalle: string }
  | { estado: "error"; detalle: string };

/**
 * ¿La sesión actual puede leer el canal?
 *
 * Existe porque un `[]` es ambiguo: puede ser «no hay conversaciones» o «falta
 * un eslabón de la cadena de permisos». Esta función responde la pregunta
 * directamente contra la base, en vez de deducirla del resultado vacío.
 *
 * La cadena completa, cada eslabón verificado el 22/09/2026:
 *   auth.users → necto.usuario → necto.operador(activo) → rol → rol_capacidad
 */
export async function diagnosticarPermisoCanal(): Promise<{
  puede: boolean;
  detalle: string;
}> {
  const sb = getSupabase();
  if (!sb) return { puede: false, detalle: "Sin configuración de Supabase." };

  // Estas dos funciones viven en `necto` y son la MISMA verdad que usan las
  // políticas RLS. Preguntarles a ellas evita duplicar la lógica de permisos en
  // el cliente, que sería una segunda fuente de verdad.
  const [org, tengo] = await Promise.all([
    sb.schema(ESQUEMA).rpc("mi_organizacion"),
    sb.schema(ESQUEMA).rpc("tengo", { p_capacidad: "channels.read" }),
  ]);

  if (org.error || tengo.error) {
    return {
      puede: false,
      detalle: explicarError(org.error ?? tengo.error),
    };
  }

  if (!org.data) {
    return {
      puede: false,
      detalle:
        "La sesión no está ligada a ninguna organización: falta la fila en `necto.usuario` con tu `auth_user_id`.",
    };
  }

  if (!tengo.data) {
    return {
      puede: false,
      detalle:
        "Falta la capacidad `channels.read`. Se obtiene por la cadena usuario → operador ACTIVO → rol → rol_capacidad.",
    };
  }

  return { puede: true, detalle: "con permiso" };
}

/** Lee conversaciones y contactos, ya unidos y adaptados. */
export async function cargarConversaciones(): Promise<
  ResultadoLectura<Conversacion[]>
> {
  if (!hayConfiguracion()) return { estado: "sin_configuracion" };
  if (!(await haySesion())) return { estado: "sin_sesion" };

  const sb = getSupabase();
  if (!sb) return { estado: "sin_configuracion" };

  const [conv, cont] = await Promise.all([
    sb
      .schema(ESQUEMA)
      .from("conversacion")
      .select(
        "id, organizacion_id, contacto_id, canal, estado, modo_atencion, modulo_destino, no_leidos, creada_en, actualizada_en, zernio_conversation_id"
      )
      .order("actualizada_en", { ascending: false, nullsFirst: false }),
    sb
      .schema(ESQUEMA)
      .from("contacto")
      .select("id, organizacion_id, telefono, telefono_norm, nombre, origen"),
  ]);

  if (conv.error) return { estado: "error", detalle: explicarError(conv.error) };
  if (cont.error) return { estado: "error", detalle: explicarError(cont.error) };

  const filasConv = (conv.data ?? []) as FilaConversacion[];
  const filasCont = (cont.data ?? []) as FilaContacto[];

  // Un cero con permiso concedido es información real. Un cero SIN capacidad es
  // un fallo de configuración disfrazado de «no hay nada», y hay que decirlo.
  if (filasConv.length === 0) {
    const permiso = await diagnosticarPermisoCanal();
    if (!permiso.puede) {
      return { estado: "sin_permiso", detalle: permiso.detalle };
    }
  }

  const { conversaciones, huerfanas } = construirConversaciones(filasConv, filasCont);

  const aviso =
    huerfanas > 0
      ? `${huerfanas} conversación(es) sin contacto: no se pueden mostrar en la bandeja porque el teléfono es la clave de cruce con Pedidos.`
      : undefined;

  return { estado: "ok", datos: conversaciones, aviso };
}

/** Lee los mensajes de UNA conversación. */
export async function cargarMensajes(
  conversacionId: string
): Promise<ResultadoLectura<Mensaje[]>> {
  if (!hayConfiguracion()) return { estado: "sin_configuracion" };
  if (!(await haySesion())) return { estado: "sin_sesion" };

  const sb = getSupabase();
  if (!sb) return { estado: "sin_configuracion" };

  const { data, error } = await sb
    .schema(ESQUEMA)
    .from("mensaje")
    .select("id, conversacion_id, autor, contenido, enviado_en, zernio_event_id")
    .eq("conversacion_id", conversacionId)
    .order("enviado_en", { ascending: true });

  if (error) return { estado: "error", detalle: explicarError(error) };

  return { estado: "ok", datos: construirMensajes((data ?? []) as FilaMensaje[]) };
}

/**
 * Carga TODAS las conversaciones con sus mensajes.
 *
 * Se pide en dos consultas y no con un `join` anidado: el anidamiento de
 * PostgREST exige una relación declarada que aquí no se quiere depender de
 * tener, y con el volumen actual (decenas de filas) la segunda consulta es más
 * simple y más fácil de razonar que un embed.
 */
export async function cargarTodo(): Promise<
  ResultadoLectura<{ conversaciones: Conversacion[]; mensajesPorConv: Map<string, Mensaje[]> }>
> {
  const rConv = await cargarConversaciones();
  if (rConv.estado !== "ok") return rConv;

  const sb = getSupabase();
  if (!sb) return { estado: "sin_configuracion" };

  const { data, error } = await sb
    .schema(ESQUEMA)
    .from("mensaje")
    .select("id, conversacion_id, autor, contenido, enviado_en, zernio_event_id")
    .order("enviado_en", { ascending: true });

  if (error) return { estado: "error", detalle: explicarError(error) };

  const todos = construirMensajes((data ?? []) as FilaMensaje[]);
  const porConv = new Map<string, Mensaje[]>();
  for (const m of todos) {
    const lista = porConv.get(m.conversacionId);
    if (lista) lista.push(m);
    else porConv.set(m.conversacionId, [m]);
  }

  return {
    estado: "ok",
    datos: { conversaciones: rConv.datos, mensajesPorConv: porConv },
    aviso: rConv.aviso,
  };
}
