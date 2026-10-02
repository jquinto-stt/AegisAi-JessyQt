import fs from 'fs';
import { createClient } from '../packages/services/api/node_modules/@supabase/supabase-js/dist/index.mjs';

const envText = fs.readFileSync('packages/services/api/modules/service/.env.local', 'utf8');
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

const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: convs, error } = await sb.schema('necto').from('conversacion').select('*');
  console.log('ALL CONVERSACIONES:', convs);

  // Update all conversations to modo_atencion = 'bot'
  const { data: updated, error: errUpd } = await sb.schema('necto').from('conversacion').update({
    modo_atencion: 'bot',
    estado_respuesta: null
  }).neq('id', '00000000-0000-0000-0000-000000000000').select();
  console.log('UPDATED CONVERSACIONES TO BOT:', updated, errUpd);
}

run();
