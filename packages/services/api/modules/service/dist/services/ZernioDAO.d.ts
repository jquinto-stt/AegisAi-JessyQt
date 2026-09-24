import { type SupabaseClient } from '@supabase/supabase-js';
import { type MensajeEntrante } from './ZernioWebhook.js';
/**
 * Cliente de servidor. Devuelve `null` si falta configuración, en vez de
 * lanzar: un webhook sin base de datos configurada debe responder con un error
 * claro, no tumbar el proceso.
 *
 * ── Por qué el esquema va POR CONSULTA y no en `createClient` ──────────────
 *
 * Pasar `db: { schema: 'necto' }` produce `TS2322`: el genérico del esquema está
 * atado a los tipos generados, y este proyecto no los genera (el modelo vive en
 * `Docs/07-ddl-necto.sql`). Es el mismo defecto que ya apareció en el cliente
 * del frontend. La solución es la misma y por la misma razón: el esquema se fija
 * en cada consulta con `.schema(ESQUEMA)`, que es donde el nombre viaja de
 * verdad. Aquí se usa el helper `t()` para que no se pueda olvidar.
 */
export declare function getClienteServidor(): SupabaseClient | null;
/** Olvida el cliente cacheado (tests). */
export declare function reiniciarClienteServidor(): void;
export interface ResultadoPersistencia {
    ok: boolean;
    /** `true` si el evento ya estaba procesado y no se escribió nada. */
    duplicado: boolean;
    contactoId?: string;
    conversacionId?: string;
    mensajeId?: string;
    error?: string;
}
/**
 * Persiste el mensaje entrante: contacto → conversación → mensaje.
 *
 * El orden es obligatorio por las claves foráneas: `conversacion.contacto_id`
 * apunta a `contacto`, y `mensaje.conversacion_id` apunta a `conversacion`.
 */
export declare function persistirEntrante(m: MensajeEntrante): Promise<ResultadoPersistencia>;
//# sourceMappingURL=ZernioDAO.d.ts.map