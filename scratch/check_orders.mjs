import { createClient } from '../packages/services/api/node_modules/@supabase/supabase-js/dist/index.mjs';
import fs from 'fs';

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

const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
console.log('Connecting to Supabase:', url);
const sb = createClient(url, key, { db: { schema: 'necto' } });

async function test() {
  await sb.from('pedido').update({ estado: 'cancelado' }).eq('numero', 'WEB-0032');
  console.log('Reverted WEB-0032 to cancelado');
}
test();
