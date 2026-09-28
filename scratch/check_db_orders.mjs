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

async function run() {
  const { data, count, error } = await sb.from('pedido').select('id, numero, cliente, estado, creado_en', { count: 'exact' });
  console.log('TOTAL PEDIDOS EN SUPABASE:', count, data ? data.length : 0);
  if (data) console.log(JSON.stringify(data, null, 2));
}
run();
