import fs from 'fs';
import { createClient } from '../packages/services/api/node_modules/@supabase/supabase-js/dist/index.mjs';

const envText = fs.readFileSync('packages/services/api/modules/service/.env.local', 'utf8');
const url = envText.match(/SUPABASE_URL=(.+)/)[1].trim();
const key = envText.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)[1].trim();
const sb = createClient(url, key);

async function test() {
  // 1. Asignar un teléfono de prueba a Demo Necto
  const testPhone = '+57 300 987 6543';
  const { data: updatedOp, error: errOp } = await sb.schema('necto').from('operador')
    .update({ telefono: testPhone })
    .eq('email', 'demo@necto.io')
    .select();

  console.log('OPERADOR UPDATED:', updatedOp, errOp);

  // 2. Simular verificación usando el DAO
  const { TelegramDAO } = await import('../packages/services/api/modules/service/dist/main.js').catch(() => ({}));
  // O consultar directamente como lo hace el DAO
  const rawDigits = '573009876543';
  const { data: operadores } = await sb.schema('necto').from('operador')
    .select('id, nombre, email, telefono, rol_id')
    .eq('organizacion_id', 'fc009b85-73b8-47b3-8d1a-080b65ac7120')
    .eq('estado', 'activo');

  const match = operadores.find(o => {
    if (!o.telefono) return false;
    const opDigits = o.telefono.replace(/\D/g, '');
    return opDigits === rawDigits || opDigits.endsWith(rawDigits) || rawDigits.endsWith(opDigits);
  });

  console.log('MATCH FOUND:', match ? `SUCCESS: ${match.nombre} (${match.telefono})` : 'FAILED');
}

test();
