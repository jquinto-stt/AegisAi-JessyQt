import { TelegramFSM } from 'c:/Users/Jessy/Documents/GitHub/StockFlow/packages/services/api/modules/service/dist/telegram/index.js';
import { TelegramNLU } from 'c:/Users/Jessy/Documents/GitHub/StockFlow/packages/services/api/modules/service/dist/telegram/index.js';

const nlu = new TelegramNLU();
const fsm = new TelegramFSM();

const catalogo = [
  { id: 'cat-f1', nombre: 'Combo Hamburguesa Clásica', precio: 25000, stock: 47, disponible: true },
  { id: 'cat-f2', nombre: 'Papas Rústicas con Queso', precio: 12000, stock: 95, disponible: true },
  { id: 'cat-f3', nombre: 'Bebida Gaseosa 350ml', precio: 4000, stock: 95, disponible: true },
  { id: 'cat-f4', nombre: 'Postre Cheesecake de Frutos Rojos', precio: 9000, stock: 2, disponible: true },
];

const perfil = {
  perfilComercial: 'food',
  etiquetaCatalogo: 'Menú',
  costoEnvio: 5000,
  horarioAtencion: 'Lunes a Domingo de 11:30 a 22:30',
};

function assert(cond, msg) {
  if (!cond) throw new Error('FALLÓ: ' + msg);
}

console.log('🧪 Iniciando verificación exhaustiva de los 15 escenarios conversacionales...\n');

// ── Test 1: Consulta de Domicilio sin perder pedido
console.log('Test 1: Consulta lateral de costo de envío');
let draft = { lineas: [{ productId: 'cat-f1', nombre: 'Combo Hamburguesa Clásica', precioUnitario: 25000, cantidad: 2 }], modalidad: null, direccion: null, updatedAt: '' };
let resNlu = nlu.interpretar('¿Cuánto cuesta el domicilio?', catalogo, 'SOLICITANDO_ENTREGA');
let resFsm = fsm.transition('SOLICITANDO_ENTREGA', draft, resNlu, catalogo, perfil, 'Mariana Reyes');
assert(resFsm.replyText.includes('5.000'), 'Debe indicar costo de envío');
assert(resFsm.replyText.includes('50.000'), 'Debe conservar los $50.000 del pedido');
assert(resFsm.buttons.includes('🛵 A Domicilio'), 'Debe ofrecer botones de entrega');
console.log('✅ Test 1 Pasó\n');

// ── Test 2: Corrección de cantidad en caliente
console.log('Test 2: Corrección de cantidad en caliente ("No eran 2, eran 3")');
resNlu = nlu.interpretar('No eran 2, eran 3', catalogo, 'SOLICITANDO_ENTREGA');
resFsm = fsm.transition('SOLICITANDO_ENTREGA', draft, resNlu, catalogo, perfil, 'Mariana Reyes');
assert(resFsm.replyText.includes('3x Combo Hamburguesa Clásica'), 'Debe ajustar a 3 unidades');
assert(resFsm.replyText.includes('75.000'), 'Total debe recalcularse a $75.000');
console.log('✅ Test 2 Pasó\n');

// ── Test 3: Eliminar producto
console.log('Test 3: Eliminar producto ("Quita las papas")');
draft = { lineas: [
  { productId: 'cat-f1', nombre: 'Combo Hamburguesa Clásica', precioUnitario: 25000, cantidad: 1 },
  { productId: 'cat-f2', nombre: 'Papas Rústicas con Queso', precioUnitario: 12000, cantidad: 1 }
], modalidad: null, direccion: null, updatedAt: '' };
resNlu = nlu.interpretar('Quita las papas', catalogo, 'CARRITO_EN_CONSTRUCCION');
resFsm = fsm.transition('CARRITO_EN_CONSTRUCCION', draft, resNlu, catalogo, perfil, 'Mariana Reyes');
assert(resFsm.nextDraft.lineas.length === 1, 'Debe quedar 1 sola línea');
assert(resFsm.replyText.includes('25.000'), 'Total debe ser $25.000');
console.log('✅ Test 3 Pasó\n');

// ── Test 4: Sustitución de producto
console.log('Test 4: Sustitución de producto');
draft = { lineas: [
  { productId: 'cat-f1', nombre: 'Combo Hamburguesa Clásica', precioUnitario: 25000, cantidad: 1 },
  { productId: 'cat-f3', nombre: 'Bebida Gaseosa 350ml', precioUnitario: 4000, cantidad: 1 }
], modalidad: null, direccion: null, updatedAt: '' };
resNlu = nlu.interpretar('en vez de la gaseosa quiero papas rusticas', catalogo, 'CARRITO_EN_CONSTRUCCION');
resFsm = fsm.transition('CARRITO_EN_CONSTRUCCION', draft, resNlu, catalogo, perfil, 'Mariana Reyes');
assert(resFsm.nextDraft.lineas.some(l => l.nombre.includes('Papas')), 'Debe contener papas');
assert(!resFsm.nextDraft.lineas.some(l => l.nombre.includes('Gaseosa')), 'No debe contener gaseosa');
console.log('✅ Test 4 Pasó\n');

// ── Test 5: Greedy Slot Filling (Pedido + Entrega + Dirección en 1 solo mensaje)
console.log('Test 5: Greedy Slot Filling');
resNlu = nlu.interpretar('Quiero 2 combos hamburguesa clasica a domicilio en la Calle 45 # 12-30', catalogo, 'IDLE');
resFsm = fsm.transition('IDLE', null, resNlu, catalogo, perfil, 'Mariana Reyes');
assert(resFsm.nextDraft && resFsm.nextDraft.lineas.length === 1, 'Debe crear la línea del pedido');
assert(resFsm.nextDraft.modalidad === 'domicilio', 'Debe capturar modalidad domicilio');
assert(resFsm.nextDraft.direccion && resFsm.nextDraft.direccion.includes('Calle 45'), 'Debe capturar dirección');
assert(resFsm.nextState === 'CONFIRMANDO_PEDIDO', 'Debe saltar directo a CONFIRMANDO_PEDIDO');
console.log('✅ Test 5 Pasó\n');

// ── Test 6: Pedido multiproducto en un solo mensaje
console.log('Test 6: Pedido multiproducto');
resNlu = nlu.interpretar('Quiero 2 combos hamburguesa clasica y 1 porcion de papas rusticas', catalogo, 'IDLE');
resFsm = fsm.transition('IDLE', null, resNlu, catalogo, perfil, 'Mariana Reyes');
assert(resFsm.nextDraft && resFsm.nextDraft.lineas.length === 2, 'Debe registrar 2 productos distintos');
assert(resFsm.nextDraft.lineas.find(l => l.nombre.includes('Hamburguesa')).cantidad === 2, '2 hamburguesas');
assert(resFsm.nextDraft.lineas.find(l => l.nombre.includes('Papas')).cantidad === 1, '1 porción de papas');
console.log('✅ Test 6 Pasó\n');

// ── Test 7: Producto inexistente en catálogo
console.log('Test 7: Producto inexistente');
draft = { lineas: [{ productId: 'cat-f1', nombre: 'Combo Hamburguesa Clásica', precioUnitario: 25000, cantidad: 1 }], modalidad: null, direccion: null, updatedAt: '' };
resNlu = nlu.interpretar('Quiero una hamburguesa vegetariana', catalogo, 'CARRITO_EN_CONSTRUCCION');
resFsm = fsm.transition('CARRITO_EN_CONSTRUCCION', draft, resNlu, catalogo, perfil, 'Mariana Reyes');
assert(resFsm.replyText.includes('no disponemos de'), 'Debe advertir que no existe');
assert(resFsm.nextDraft.lineas.length === 1, 'No debe inventar productos en el carrito');
console.log('✅ Test 7 Pasó\n');

// ── Test 8: Cantidad superior a disponibilidad
console.log('Test 8: Cantidad superior a stock disponible');
resNlu = nlu.interpretar('Quiero 5 postres cheesecake', catalogo, 'IDLE');
resFsm = fsm.transition('IDLE', null, resNlu, catalogo, perfil, 'Mariana Reyes');
assert(resFsm.replyText.includes('Solo nos quedan'), 'Debe alertar el límite de stock');
console.log('✅ Test 8 Pasó\n');

// ── Test 9: Texto incomprensible (asdfghjkl)
console.log('Test 9: Texto incomprensible');
draft = { lineas: [{ productId: 'cat-f1', nombre: 'Combo Hamburguesa Clásica', precioUnitario: 25000, cantidad: 1 }], modalidad: 'domicilio', direccion: null, updatedAt: '' };
resNlu = nlu.interpretar('asdfghjkl', catalogo, 'SOLICITANDO_DIRECCION');
resFsm = fsm.transition('SOLICITANDO_DIRECCION', draft, resNlu, catalogo, perfil, 'Mariana Reyes');
assert(resFsm.replyText.includes('No logré comprender'), 'Debe manejar el error amablemente');
assert(resFsm.nextState === 'SOLICITANDO_DIRECCION', 'Debe mantenerse en el estado actual');
assert(resFsm.nextDraft.lineas.length === 1, 'No debe reiniciar el carrito');
console.log('✅ Test 9 Pasó\n');

// ── Test 10: Selección por Ordinal ("el segundo")
console.log('Test 10: Selección por ordinal ("el segundo")');
resNlu = nlu.interpretar('el segundo', catalogo, 'CATALOGO_ACTIVO');
resFsm = fsm.transition('CATALOGO_ACTIVO', null, resNlu, catalogo, perfil, 'Mariana Reyes');
assert(resFsm.nextDraft.lineas[0].nombre === 'Papas Rústicas con Queso', 'Debe seleccionar el ítem 2');
console.log('✅ Test 10 Pasó\n');

// ── Test 11: Consulta de horario durante el pedido
console.log('Test 11: Consulta de horario durante el pedido');
resNlu = nlu.interpretar('Espera, antes quiero saber el horario', catalogo, 'SOLICITANDO_ENTREGA');
resFsm = fsm.transition('SOLICITANDO_ENTREGA', draft, resNlu, catalogo, perfil, 'Mariana Reyes');
assert(resFsm.replyText.includes('11:30 a 22:30'), 'Debe responder el horario');
assert(resFsm.nextDraft.lineas.length > 0, 'No debe perder el pedido');
console.log('✅ Test 11 Pasó\n');

// ── Test 12: Solicitud de asesor humano
console.log('Test 12: Solicitud de asesor humano');
resNlu = nlu.interpretar('Quiero hablar con una persona', catalogo, 'SOLICITANDO_ENTREGA');
resFsm = fsm.transition('SOLICITANDO_ENTREGA', draft, resNlu, catalogo, perfil, 'Mariana Reyes');
assert(resFsm.nextState === 'MODO_HUMANO', 'Debe pasar a MODO_HUMANO');
console.log('✅ Test 12 Pasó\n');

// ── Test 13: Cancelar pedido en preparación (Bloqueado con pase a asesor)
console.log('Test 13: Cancelar pedido en preparación');
resNlu = nlu.interpretar('Quiero anular mi orden', catalogo, 'IDLE');
resFsm = fsm.transition('IDLE', null, resNlu, catalogo, perfil, 'Mariana Reyes', { id: 'p1', numero: 'WEB-0010', estado: 'en_preparacion', total: 54000 });
assert(resFsm.nextState === 'MODO_HUMANO', 'Debe pasar a MODO_HUMANO');
assert(resFsm.replyText.includes('no es posible cancelarlo automáticamente'), 'Debe explicar que ya está en preparación');
console.log('✅ Test 13 Pasó\n');

// ── Test 14: Cancelar pedido nuevo/recibido (Confirmación y cancelación)
console.log('Test 14: Cancelar pedido nuevo');
resNlu = nlu.interpretar('Quiero cancelar mi pedido', catalogo, 'IDLE');
resFsm = fsm.transition('IDLE', null, resNlu, catalogo, perfil, 'Mariana Reyes', { id: 'p1', numero: 'WEB-0010', estado: 'nuevo', total: 54000 });
assert(resFsm.nextState === 'CONFIRMANDO_CANCELACION', 'Debe pedir confirmación de cancelación');
assert(resFsm.buttons.includes('Sí, Cancelar Pedido ❌'), 'Debe incluir botón de confirmar cancelación');
console.log('✅ Test 14 Pasó\n');

// ── Test 15: Retoma de carrito tras abandono
console.log('Test 15: Retoma de carrito tras abandono');
const draftAbandonado = { lineas: [{ productId: 'cat-f1', nombre: 'Combo Hamburguesa Clásica', precioUnitario: 25000, cantidad: 2 }], modalidad: null, direccion: null, updatedAt: '' };
resNlu = nlu.interpretar('Continuar con lo que tengo', catalogo, 'CONFIRMANDO_RETOMA');
resFsm = fsm.transition('CONFIRMANDO_RETOMA', draftAbandonado, resNlu, catalogo, perfil, 'Mariana Reyes');
assert(resFsm.nextState === 'SOLICITANDO_ENTREGA', 'Debe avanzar a solicitar entrega');
assert(resFsm.replyText.includes('50.000'), 'Debe incluir el total acumulado');
console.log('✅ Test 15 Pasó\n');

console.log('🎉 LOS 15 ESCENARIOS CONVERSACIONALES FUERON COMPROBADOS AL 100%!');
