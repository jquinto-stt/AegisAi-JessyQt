import {
  Endpoint,
  HttpResponseCreated,
  HttpResponseBadRequest,
  type Context,
} from '@webiai/sdk.http';
import EP from '../endpoints.js';
import { createClient } from '@supabase/supabase-js';

class Auth {
  @Endpoint(EP.$Register)
  async register(ctx: Context) {
    const { email, password, nombre, apellido } = (ctx.request.body as Record<string, any>) ?? {};

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return new HttpResponseBadRequest({ error: 'Ingresa un correo electrónico válido.' });
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return new HttpResponseBadRequest({ error: 'La contraseña debe tener al menos 6 caracteres.' });
    }

    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      return new HttpResponseBadRequest({ error: 'Servicio de base de datos no configurado.' });
    }

    const sb = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const cleanEmail = email.trim().toLowerCase();
    const cleanNombre = (nombre || 'Usuario').trim();
    const cleanApellido = (apellido || 'Necto').trim();

    // 1. Crear el usuario en Supabase Auth con email_confirm: true (autoverificado sin correo)
    const { data: authData, error: authError } = await sb.auth.admin.createUser({
      email: cleanEmail,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: cleanNombre,
        last_name: cleanApellido,
      },
    });

    if (authError) {
      if (
        authError.message.includes('already registered') ||
        authError.message.includes('already exists') ||
        authError.message.includes('unique constraint')
      ) {
        return new HttpResponseBadRequest({ error: 'Ya existe una cuenta registrada con este correo electrónico.' });
      }
      return new HttpResponseBadRequest({ error: authError.message });
    }

    const authUser = authData.user;
    if (!authUser) {
      return new HttpResponseBadRequest({ error: 'No se pudo crear la cuenta de usuario.' });
    }

    // 2. Asociar a necto.organizacion y crear registro en necto.usuario y necto.operador
    try {
      const { data: org } = await sb.schema('necto').from('organizacion').select('id').limit(1).maybeSingle();
      const organizacionId = org?.id || 'fc009b85-73b8-47b3-8d1a-080b65ac7120';

      const { data: nuevoUsuario, error: errU } = await sb.schema('necto').from('usuario').insert({
        auth_user_id: authUser.id,
        organizacion_id: organizacionId,
        nombre: cleanNombre,
        apellido: cleanApellido,
        email: cleanEmail,
        pais: 'CO',
        perfil_completado: true,
      }).select().maybeSingle();

      if (errU) {
        console.warn('[Auth Controller] Error vinculando necto.usuario:', errU.message);
      }

      await sb.schema('necto').from('operador').insert({
        organizacion_id: organizacionId,
        usuario_id: nuevoUsuario?.id,
        nombre: `${cleanNombre} ${cleanApellido}`.trim(),
        email: cleanEmail,
        estado: 'activo',
        modulo: 'pedidos',
        rol_id: 'admin_tienda',
      });
    } catch (err: any) {
      console.warn('[Auth Controller] Excepción vinculando perfil:', err.message);
    }

    return new HttpResponseCreated({
      ok: true,
      user: {
        id: authUser.id,
        email: authUser.email,
        nombre: cleanNombre,
        apellido: cleanApellido,
      },
      message: 'Usuario registrado y confirmado exitosamente.',
    });
  }
}

export default Auth;
