import fs from 'fs';
import { createClient } from '../packages/services/api/node_modules/@supabase/supabase-js/dist/index.mjs';

const envText = fs.readFileSync('.env', 'utf8');
const env = {};
envText.split('\n').forEach(line => {
  const idx = line.indexOf('=');
  if (idx !== -1) {
    const k = line.slice(0, idx).trim();
    let v = line.slice(idx + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    env[k] = v;
  }
});

const url = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(url, key);

async function check() {
  const { data: users, error: errUsers } = await sb.auth.admin.listUsers();
  console.log('AUTH USERS:', users?.users?.map(u => ({ id: u.id, email: u.email })) || errUsers);

  const { data: usuarios } = await sb.schema('necto').from('usuario').select('*');
  console.log('NECTO USUARIOS:', usuarios);

  const { data: operadores } = await sb.schema('necto').from('operador').select('*');
  console.log('NECTO OPERADORES:', operadores);

  const { data: orgs } = await sb.schema('necto').from('organizacion').select('*');
  console.log('NECTO ORGANIZACIONES:', orgs);

  const { data: mods } = await sb.schema('necto').from('modulo_organizacion').select('*');
  console.log('MODULOS ORG:', mods);

  // Set password for demo@necto.io to DemoNecto2026!
  const { data: updated, error: errUpdate } = await sb.auth.admin.updateUserById('180a3c87-aa7c-494b-bd9f-f5cfb599a66e', {
    password: 'DemoNecto2026!',
    email_confirm: true
  });
  console.log('UPDATE DEMO USER PASSWORD:', updated?.user?.email, errUpdate);

  // Test sign in using anon client
  const anonKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;
  const clientAnon = createClient(url, anonKey);
  const { data: session, error: errLogin } = await clientAnon.auth.signInWithPassword({
    email: 'demo@necto.io',
    password: 'DemoNecto2026!'
  });
  console.log('TEST LOGIN ANON:', session?.user?.id ? 'SUCCESS' : 'FAILED', errLogin);

  if (session?.session) {
    const { data: miUsuario, error: errU } = await clientAnon.schema('necto').from('usuario').select('*').eq('auth_user_id', session.user.id).maybeSingle();
    console.log('QUERY MI USUARIO VIA RLS:', miUsuario, errU);

    const { data: miOperador, error: errO } = await clientAnon.schema('necto').from('operador').select('*').eq('email', session.user.email).maybeSingle();
    console.log('QUERY MI OPERADOR VIA RLS:', miOperador, errO);

    const orgId = miUsuario?.organizacion_id || miOperador?.organizacion_id;
    if (orgId) {
      const { data: miOrg, error: errOrg } = await clientAnon.schema('necto').from('organizacion').select('*').eq('id', orgId).maybeSingle();
      console.log('QUERY MI ORGANIZACION VIA RLS:', miOrg, errOrg);

      const { data: miModulos, error: errMod } = await clientAnon.schema('necto').from('modulo_organizacion').select('*').eq('organizacion_id', orgId);
      console.log('QUERY MIS MODULOS VIA RLS:', miModulos, errMod);
    }
    const { data: updateRes, error: errUpd } = await clientAnon.schema('necto').from('usuario').update({ cargo: 'Gerente de Operaciones' }).eq('id', miUsuario.id).select();
    console.log('UPDATE NECTO.USUARIO VIA RLS:', updateRes, errUpd);

    // Test inserting a row in necto.usuario using authenticated client
    const { data: testIns, error: errIns } = await clientAnon.schema('necto').from('usuario').insert({
      auth_user_id: session.user.id,
      nombre: 'Prueba Insert',
      apellido: 'RLS',
      email: 'otra.prueba@necto.io',
      pais: 'CO',
      perfil_completado: true
    }).select();
    console.log('TEST INSERT NECTO.USUARIO AS AUTHENTICATED:', testIns, errIns);
  }

  // Test sign up of new user
  const testEmail = `usuario.test.${Date.now()}@necto.io`;
  const { data: signUpData, error: errSignUp } = await clientAnon.auth.signUp({
    email: testEmail,
    password: 'TestPassword123!',
    options: {
      data: {
        first_name: 'Carlos',
        last_name: 'Perez'
      }
    }
  });
  console.log('TEST SIGNUP ANON:', signUpData?.user?.id ? 'SUCCESS' : 'FAILED', errSignUp);

  if (signUpData?.session) {
    // Test inserting into necto.usuario
    const { data: newUsuario, error: errNewU } = await clientAnon.schema('necto').from('usuario').insert({
      auth_user_id: signUpData.user.id,
      nombre: 'Carlos',
      apellido: 'Perez',
      email: testEmail,
      pais: 'CO',
      perfil_completado: true
    }).select();
    console.log('TEST INSERT NECTO.USUARIO:', newUsuario, errNewU);
  } else {
    console.log('SIGNUP REQUIRES EMAIL CONFIRMATION OR SESSION IS NULL:', signUpData?.user?.identities);
  }

  // Check if we can sign out cleanly
  const { error: errSignOut } = await clientAnon.auth.signOut();
  console.log('SIGNOUT TEST:', errSignOut);
}
check();
