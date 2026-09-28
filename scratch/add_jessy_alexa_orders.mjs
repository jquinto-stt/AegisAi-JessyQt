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

async function insertJessyAndAlexaOrders() {
  const orgId = 'fc009b85-73b8-47b3-8d1a-080b65ac7120';
  const now = new Date().toISOString();

  // 1. Pedido para quintojessy
  const { data: pJessy, error: eJ } = await sb.from('pedido').insert({
    organizacion_id: orgId,
    numero: 'WEB-0038',
    cliente: 'quintojessy',
    telefono: '573145376069',
    modalidad: 'domicilio',
    origen: 'whatsapp',
    estado: 'nuevo',
    metodo_pago: 'efectivo',
    direccion_entrega: { texto: 'CLL 22 # 15-30 Apto 501' },
    creado_en: now,
    estado_desde: now
  }).select().single();

  if (eJ) console.error('Error insertando pedido Jessy:', eJ);
  else {
    console.log('✅ Pedido insertado para quintojessy:', pJessy.numero);
    await sb.from('pedido_item').insert([
      { pedido_id: pJessy.id, orden: 1, nombre: 'Combo Hamburguesa Doble', cantidad: 1, precio_unitario: 28000, product_id: 'cat-f1' },
      { pedido_id: pJessy.id, orden: 2, nombre: 'Bebida Natural 500ml', cantidad: 1, precio_unitario: 6000, product_id: 'cat-f3' }
    ]);
  }

  // 2. Pedido para Alexa
  const { data: pAlexa, error: eA } = await sb.from('pedido').insert({
    organizacion_id: orgId,
    numero: 'WEB-0039',
    cliente: 'Alexa',
    telefono: '573143101047',
    modalidad: 'domicilio',
    origen: 'whatsapp',
    estado: 'nuevo',
    metodo_pago: 'transferencia',
    direccion_entrega: { texto: 'Carrera 15 # 85-10, Apto 302' },
    creado_en: now,
    estado_desde: now
  }).select().single();

  if (eA) console.error('Error insertando pedido Alexa:', eA);
  else {
    console.log('✅ Pedido insertado para Alexa:', pAlexa.numero);
    await sb.from('pedido_item').insert([
      { pedido_id: pAlexa.id, orden: 1, nombre: 'Combo Clásico Pollo', cantidad: 1, precio_unitario: 24000, product_id: 'cat-f2' },
      { pedido_id: pAlexa.id, orden: 2, nombre: 'Papas Rústicas con Queso', cantidad: 1, precio_unitario: 12000, product_id: 'cat-f4' }
    ]);
  }
}

insertJessyAndAlexaOrders();
