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
const sb = createClient(url, key, { db: { schema: 'necto' } });

async function checkJessyAlexa() {
  const { data: p } = await sb.from('pedido').select('*, pedido_item(*)');
  console.log('=== TODOS LOS PEDIDOS ACTUALES EN SUPABASE (' + (p ? p.length : 0) + ') ===');
  console.log(JSON.stringify(p, null, 2));

  const { data: c } = await sb.from('contacto').select('*');
  console.log('=== TODOS LOS CONTACTOS EN SUPABASE (' + (c ? c.length : 0) + ') ===');
  console.log(JSON.stringify(c, null, 2));

  const { data: conv } = await sb.from('conversacion').select('*, contacto(*)');
  console.log('=== TODAS LAS CONVERSACIONES EN SUPABASE (' + (conv ? conv.length : 0) + ') ===');
  console.log(JSON.stringify(conv, null, 2));
}

checkJessyAlexa();
