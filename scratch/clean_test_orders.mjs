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

async function cleanOldTestOrders() {
  // Eliminar los pedidos de pruebas automatizadas WEB-0001 a WEB-0031
  const numerosPrueba = [];
  for (let i = 1; i <= 31; i++) {
    numerosPrueba.push('WEB-' + String(i).padStart(4, '0'));
  }

  console.log('Eliminando pedidos de prueba automatizados antiguos:', numerosPrueba.length);
  
  // Primero eliminar items asociados
  const { data: itemsEliminados, error: errItems } = await sb
    .from('pedido_item')
    .delete()
    .in('pedido_id', 
      (await sb.from('pedido').select('id').in('numero', numerosPrueba)).data?.map(p => p.id) || []
    );

  if (errItems) console.error('Error eliminando items:', errItems);

  // Luego eliminar pedidos
  const { data: pedidosEliminados, error: errPed } = await sb
    .from('pedido')
    .delete()
    .in('numero', numerosPrueba);

  if (errPed) console.error('Error eliminando pedidos:', errPed);
  else console.log('✅ Pedidos de prueba antiguos (WEB-0001 a WEB-0031) eliminados de la base de datos.');

  const { count } = await sb.from('pedido').select('*', { count: 'exact', head: true });
  console.log('Pedidos restantes en DB:', count);
}

cleanOldTestOrders();
