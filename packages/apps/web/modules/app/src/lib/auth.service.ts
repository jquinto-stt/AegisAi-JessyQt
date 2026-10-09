// ═══════════════════════════════════════════════════════════════════════════
// SERVICIO DE AUTENTICACIÓN (Supabase Auth ↔ Necto)
// ═══════════════════════════════════════════════════════════════════════════
//
// Conecta Supabase Auth con la jerarquía de tres niveles de Necto:
//
//   1. Supabase Auth (`auth.users`)
//   2. Dominio Necto (`necto.usuario` ──▶ `necto.operador` ──▶ `necto.organizacion`)
//   3. Sesión activa en UI (`sessionStore` y `organizacionStore`)
//
// Mantiene compatibilidad total: si Supabase no está configurado (modo sin `.env`),
// funciona en modo maqueta limpio sin lanzar excepciones.

import { getSupabase, hayConfiguracion, haySesion } from "@/lib/supabase";
import { sessionStore, organizacionStore, modulosOperablesDeSesion } from "@/stores";
import type { RedesSociales, DireccionPerfil } from "@/stores/organizacion.store";
import { bootstrapConversaciones } from "@/lib/db.bootstrap";
import { activarModoDemo } from "@/lib/modo-demo";

export interface ResultadoAuth {
  ok: boolean;
  motivo?: string;
  requiereOnboarding?: boolean;
}

export interface CredencialesLogin {
  email: string;
  password: string;
}

export const CREDENCIALES_DEMO: CredencialesLogin = {
  email: "demo@necto.io",
  password: "DemoNecto2026!",
};

/**
 * Traduce errores de Supabase Auth a explicaciones útiles en español neutro/profesional.
 */
export function traducirErrorAuth(error: unknown): string {
  if (!error) return "Error desconocido al procesar autenticación.";
  const msg = (error as { message?: string })?.message?.toLowerCase() ?? "";

  if (msg.includes("invalid login credentials") || msg.includes("invalid_grant")) {
    return "Correo o contraseña incorrectos. Verifica tus credenciales.";
  }
  if (msg.includes("email not confirmed")) {
    return "Tu correo electrónico aún no ha sido confirmado en Supabase.";
  }
  if (msg.includes("user already registered") || msg.includes("already exists") || msg.includes("user_already_exists")) {
    return "Ya existe una cuenta registrada con este correo electrónico.";
  }
  if (msg.includes("rate limit") || msg.includes("over_email_send_rate_limit") || msg.includes("too many requests")) {
    return "Demasiadas solicitudes en poco tiempo. Por favor espera unos minutos antes de reintentar.";
  }
  if (msg.includes("email_address_invalid") || msg.includes("invalid email")) {
    return "La dirección de correo electrónico no es válida.";
  }
  if (msg.includes("user not found")) {
    return "No existe una cuenta asociada a este correo electrónico.";
  }
  if (msg.includes("network") || msg.includes("fetch") || msg.includes("failed to fetch")) {
    return "Error de conexión con el servidor. Revisa tu acceso a internet.";
  }

  return (error as { message?: string })?.message ?? "Error al procesar la solicitud.";
}

/**
 * Sincroniza los stores de la aplicación a partir de la identidad autenticada
 * y su registro en el esquema `necto`.
 */
export async function sincronizarIdentidadNecto(
  userId: string,
  userEmail: string,
  metadata?: Record<string, unknown>,
): Promise<{ requiereOnboarding: boolean }> {
  const sb = getSupabase();
  if (!sb) {
    return { requiereOnboarding: false };
  }

  // 1. Consultar usuario en necto.usuario (por auth_user_id o email)
  const { data: usuarioRow } = await sb
    .schema("necto")
    .from("usuario")
    .select("*")
    .eq("auth_user_id", userId)
    .maybeSingle();

  // 2. Consultar operador en necto.operador
  const { data: operadorRow } = await sb
    .schema("necto")
    .from("operador")
    .select("*")
    .eq("email", userEmail)
    .maybeSingle();

  // 3. Determinar organización
  const orgId = usuarioRow?.organizacion_id || operadorRow?.organizacion_id;
  let tieneOrg = false;

  if (orgId) {
    const { data: orgRow } = await sb
      .schema("necto")
      .from("organizacion")
      .select("*")
      .eq("id", orgId)
      .maybeSingle();

    if (orgRow) {
      tieneOrg = true;
      organizacionStore.crearOrganizacion({
        nombre: orgRow.nombre || "Mi Empresa",
        pais: orgRow.pais === "CO" ? "Colombia" : (orgRow.pais || "Colombia"),
        moneda: orgRow.moneda || "COP",
        zonaHoraria: orgRow.zona_horaria || "America/Bogota",
        tipoEmpresa: orgRow.tipo_empresa || undefined,
        tamanoEquipo: orgRow.tamano_equipo || undefined,
        logoUrl: orgRow.logo_url || undefined,
      });
    }

    // 4. Módulos asignados a la organización
    const { data: modulosRows } = await sb
      .schema("necto")
      .from("modulo_organizacion")
      .select("*")
      .eq("organizacion_id", orgId);

    if (modulosRows && modulosRows.length > 0) {
      modulosRows.forEach((m) => {
        if (m.instalado && m.activo) {
          if (m.modulo_id === "pedidos" || m.modulo_id === "inventarios") {
            organizacionStore.instalarModulo(m.modulo_id);
          }
        }
      });
    }
  }

  // 5. Perfil de usuario en el store
  const metaFirst = metadata?.first_name as string | undefined;
  const metaLast = metadata?.last_name as string | undefined;
  const nombre = usuarioRow?.nombre || metaFirst || userEmail.split("@")[0] || "Usuario";
  const apellido = usuarioRow?.apellido || metaLast || "Necto";
  const pais = usuarioRow?.pais === "CO" ? "Colombia" : (usuarioRow?.pais || "Colombia");

  organizacionStore.actualizarPerfil({
    nombre: nombre.charAt(0).toUpperCase() + nombre.slice(1),
    apellido,
    email: userEmail,
    pais,
    cargo: usuarioRow?.cargo || operadorRow?.cargo || undefined,
    telefono: usuarioRow?.telefono || operadorRow?.telefono || undefined,
    bio: usuarioRow?.bio || undefined,
  });

  // 6. Configuración de sesión según rol efectivo
  const rolId = operadorRow?.rol_id;
  const tipoSesion = rolId === "admin_tienda" || !rolId ? "administrador" : "operador";

  // Asegura al menos pedidos si la organización lo tiene activo
  sessionStore.configurar(
    modulosOperablesDeSesion(organizacionStore.modulosActivos),
    tipoSesion,
  );

  // 7. Arrancar conexión y suscripciones de tiempo real
  void bootstrapConversaciones();

  return { requiereOnboarding: !tieneOrg };
}

/**
 * Modo de pruebas: asegura una sesión administrativa activa para todo el equipo,
 * sin requerir credenciales reales ni interacción con Supabase Auth.
 */
export function asegurarSesionPruebas(emailPersonalizado?: string): ResultadoAuth {
  const email = emailPersonalizado?.trim() || "equipo@necto.io";
  const nombre = email.includes("@") ? email.split("@")[0] : "Admin";

  if (!organizacionStore.tienePerfil) {
    organizacionStore.actualizarPerfil({
      nombre: nombre.charAt(0).toUpperCase() + nombre.slice(1),
      apellido: "Necto",
      email,
      pais: "Colombia",
      cargo: "Administrador de Pruebas",
    });
  }

  if (!organizacionStore.tieneOrganizacion) {
    organizacionStore.crearOrganizacion({
      nombre: "Necto Operations",
      pais: "Colombia",
      moneda: "COP",
      zonaHoraria: "America/Bogota",
    });
  }

  pedidosStore.restaurarSeed();
  inventariosStore.restaurarSeed();
  operadoresStore.restaurarSeed();

  if (!organizacionStore.esModuloInstalado("pedidos")) {
    organizacionStore.instalarModulo("pedidos");
  }
  if (!organizacionStore.esModuloInstalado("inventarios")) {
    organizacionStore.instalarModulo("inventarios");
  }

  activarModoDemo();

  sessionStore.configurar(
    ["pedidos", "inventarios"],
    "administrador",
  );

  void bootstrapConversaciones();

  return { ok: true, requiereOnboarding: false };
}

/**
 * Autentica usuario con correo y contraseña.
 * Valida con Supabase Auth si está configurado y verifica si requiere onboarding.
 */
export async function iniciarSesion(credenciales: CredencialesLogin): Promise<ResultadoAuth> {
  const { email, password } = credenciales;
  const cleanEmail = email.trim();

  const sb = getSupabase();
  if (sb && hayConfiguracion()) {
    const { data, error } = await sb.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (error) {
      return { ok: false, motivo: traducirErrorAuth(error) };
    }

    if (data.user) {
      const syncRes = await sincronizarIdentidadNecto(
        data.user.id,
        data.user.email || cleanEmail,
        data.user.user_metadata,
      );
      return { ok: true, requiereOnboarding: syncRes.requiereOnboarding };
    }
  }

  // Fallback sin Supabase o modo local: comprobar si el negocio ya completó onboarding
  const yaCompleto = organizacionStore.tienePerfil && organizacionStore.tieneOrganizacion;
  if (!yaCompleto) {
    return { ok: true, requiereOnboarding: true };
  }

  return { ok: true, requiereOnboarding: false };
}

/**
 * Autenticación mediante Google OAuth.
 */
export async function iniciarSesionConGoogle(): Promise<ResultadoAuth> {
  const sb = getSupabase();
  if (sb && hayConfiguracion()) {
    const { error } = await sb.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/login`,
      },
    });
    if (error) {
      return { ok: false, motivo: traducirErrorAuth(error) };
    }
    return { ok: true };
  }
  return { ok: true, requiereOnboarding: !organizacionStore.tieneOrganizacion };
}

/**
 * Cierra la sesión en Supabase y limpia el estado de sesión local.
 */
export async function cerrarSesion(): Promise<void> {
  const sb = getSupabase();
  if (sb) {
    try {
      await sb.auth.signOut();
    } catch {
      // Ignorar error al cerrar sesión en red
    }
  }
  sessionStore.reset();
}

/**
 * Hidrata la sesión local si existe una sesión activa persistida en Supabase Auth.
 */
export async function autoHidratarSesionSupabase(): Promise<boolean> {
  const sb = getSupabase();
  if (sb && hayConfiguracion()) {
    try {
      const { data } = await sb.auth.getSession();
      const session = data?.session;
      if (session?.user) {
        await sincronizarIdentidadNecto(
          session.user.id,
          session.user.email || "",
          session.user.user_metadata,
        );
        return true;
      }
    } catch {}
  }

  asegurarSesionPruebas();
  return true;
}

export interface DatosRegistro {
  email: string;
  password: string;
  nombre: string;
  apellido: string;
}

export interface ResultadoRegistro {
  ok: boolean;
  motivo?: string;
  requiereConfirmacion?: boolean;
}

/**
 * Registra un nuevo usuario y asegura la sesión en modo de pruebas.
 */
export async function registrarUsuario(datos: DatosRegistro): Promise<ResultadoRegistro> {
  const { email, password, nombre, apellido } = datos;
  const cleanEmail = email.trim();

  if (!cleanEmail) {
    return { ok: false, motivo: "Ingresa un correo electrónico válido." };
  }
  if (!password || password.length < 6) {
    return { ok: false, motivo: "La contraseña debe tener al menos 6 caracteres." };
  }

  asegurarSesionPruebas(cleanEmail);
  organizacionStore.actualizarPerfil({
    nombre: nombre.trim() || "Usuario",
    apellido: apellido.trim() || "Necto",
    email: cleanEmail,
    pais: "Colombia",
  });

  return { ok: true, requiereConfirmacion: false };
}

/**
 * Actualiza el perfil tanto en el store local como en la tabla `necto.usuario` en Supabase.
 */
export async function actualizarPerfilRemoto(datos: {
  nombre?: string;
  apellido?: string;
  email?: string;
  telefono?: string;
  cargo?: string;
  bio?: string;
  ubicacion?: string;
  pais?: string;
  redes?: RedesSociales;
  direccion?: DireccionPerfil;
}): Promise<{ ok: boolean; motivo?: string }> {
  // 1. Actualizar inmediatamente en el store local
  organizacionStore.actualizarPerfil(datos as Parameters<typeof organizacionStore.actualizarPerfil>[0]);

  if (!hayConfiguracion()) {
    return { ok: true };
  }

  const sb = getSupabase();
  if (!sb) {
    return { ok: true };
  }

  try {
    const { data: sessionData } = await sb.auth.getSession();
    const authUser = sessionData.session?.user;
    if (!authUser) {
      return { ok: true };
    }

    const payload: Record<string, unknown> = {};
    if (datos.nombre !== undefined) payload.nombre = datos.nombre.trim();
    if (datos.apellido !== undefined) payload.apellido = datos.apellido.trim();
    if (datos.email !== undefined) payload.email = datos.email.trim();
    if (datos.telefono !== undefined) payload.telefono = datos.telefono.trim();
    if (datos.cargo !== undefined) payload.cargo = datos.cargo.trim();
    if (datos.bio !== undefined) payload.bio = datos.bio.trim();
    if (datos.pais !== undefined) {
      payload.pais = datos.pais.trim() === "Colombia" ? "CO" : datos.pais.trim();
    }
    if (datos.redes !== undefined) payload.redes = datos.redes;
    if (datos.direccion !== undefined) payload.direccion = datos.direccion;

    if (Object.keys(payload).length > 0) {
      const { error: errU } = await sb
        .schema("necto")
        .from("usuario")
        .update(payload)
        .eq("auth_user_id", authUser.id);

      if (errU) {
        console.warn("[auth.service] Error al actualizar necto.usuario:", errU.message);
      }

      // También sincronizar datos del operador si existe para este correo
      const opPayload: Record<string, unknown> = {};
      if (datos.nombre !== undefined || datos.apellido !== undefined) {
        const n = (datos.nombre ?? organizacionStore.usuario?.nombre ?? "").trim();
        const a = (datos.apellido ?? organizacionStore.usuario?.apellido ?? "").trim();
        opPayload.nombre = `${n} ${a}`.trim();
      }
      if (datos.telefono !== undefined) opPayload.telefono = datos.telefono.trim();
      if (datos.cargo !== undefined) opPayload.cargo = datos.cargo.trim();

      if (Object.keys(opPayload).length > 0 && authUser.email) {
        await sb
          .schema("necto")
          .from("operador")
          .update(opPayload)
          .eq("email", authUser.email);
      }
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, motivo: (err as Error).message };
  }
}

/**
 * Cambia la contraseña del usuario autenticado en Supabase Auth.
 */
export async function cambiarPassword(nuevaPassword: string): Promise<{ ok: boolean; motivo?: string }> {
  if (!nuevaPassword || nuevaPassword.length < 6) {
    return { ok: false, motivo: "La nueva contraseña debe tener al menos 6 caracteres." };
  }

  if (!hayConfiguracion()) {
    return { ok: true };
  }

  const sb = getSupabase();
  if (!sb) {
    return { ok: false, motivo: "Servicio de autenticación no disponible." };
  }

  const { error } = await sb.auth.updateUser({ password: nuevaPassword });
  if (error) {
    return { ok: false, motivo: traducirErrorAuth(error) };
  }

  return { ok: true };
}

