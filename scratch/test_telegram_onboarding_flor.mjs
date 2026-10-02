import { TelegramFSM } from '../packages/services/api/modules/service/src/telegram/TelegramFSM.ts';
import { TelegramNLU } from '../packages/services/api/modules/service/src/telegram/TelegramNLU.ts';

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
  if (!cond) {
    console.error('❌ FALLÓ:', msg);
    throw new Error(msg);
  }
}

console.log('🧪 Iniciando verificación del flujo de Asistente Sofía, Destinatario y Hub & Spoke...\n');

// ── Test 1: Primer contacto de usuario nuevo (no perfilado) - Sofía
console.log('Test 1: Primer contacto (/start o saludo inicial sin perfil previo)');
let perfilCliente = null;
let resNlu = { intent: 'SALUDO', confidence: 1.0, entities: {}, rawText: 'Hola muy buenas tardes' };
let resFsm = fsm.transition('IDLE', null, resNlu, catalogo, perfil, 'tg:123456789', null, [], perfilCliente);

assert(resFsm.nextState === 'ONBOARDING_NOMBRE', 'Debe solicitar el nombre de pila');
assert(resFsm.replyText.includes('Soy Sofía'), 'Debe presentarse como Sofía');
assert(resFsm.replyText.includes('nombre de pila'), 'El mensaje debe preguntar el nombre de pila');
console.log('✅ Test 1 Pasó: Sofía saludó y solicitó nombre de pila\n');

// ── Test 2: Nombre de pila
console.log('Test 2: Extracción de nombre de pila ("mi nombre es Jessy")');
resNlu = { intent: 'DESCONOCIDO', confidence: 1.0, entities: {}, rawText: 'mi nombre es Jessy' };
resFsm = fsm.transition('ONBOARDING_NOMBRE', null, resNlu, catalogo, perfil, 'tg:123456789', null, [], resFsm.clientePerfil);

assert(resFsm.nextState === 'ONBOARDING_APELLIDO', 'Debe pasar a solicitar apellido');
assert(resFsm.clientePerfil.nombre === 'Jessy', 'Debe extraer "Jessy" limpiamente');
console.log('✅ Test 2 Pasó: Nombre extraído correctamente\n');

// ── Test 3: Apellido
console.log('Test 3: Extracción de apellido ("Quinto")');
resNlu = { intent: 'DESCONOCIDO', confidence: 1.0, entities: {}, rawText: 'Quinto' };
resFsm = fsm.transition('ONBOARDING_APELLIDO', null, resNlu, catalogo, perfil, 'tg:123456789', null, [], resFsm.clientePerfil);

assert(resFsm.nextState === 'ONBOARDING_EMAIL', 'Debe pasar a solicitar correo');
assert(resFsm.clientePerfil.apellido === 'Quinto', 'Debe registrar "Quinto"');
console.log('✅ Test 3 Pasó: Apellido registrado\n');

// ── Test 4: Correo
console.log('Test 4: Validación de correo');
resNlu = { intent: 'DESCONOCIDO', confidence: 1.0, entities: {}, rawText: 'Quintojessy@gmail.com' };
resFsm = fsm.transition('ONBOARDING_EMAIL', null, resNlu, catalogo, perfil, 'tg:123456789', null, [], resFsm.clientePerfil);

assert(resFsm.nextState === 'ONBOARDING_TELEFONO', 'Debe pasar a pedir celular');
assert(resFsm.clientePerfil.email === 'quintojessy@gmail.com', 'Debe normalizar correo');
console.log('✅ Test 4 Pasó: Correo validado\n');

// ── Test 5: Celular
console.log('Test 5: Validación de celular ("3145376069")');
resNlu = { intent: 'DESCONOCIDO', confidence: 1.0, entities: {}, rawText: '3145376069' };
resFsm = fsm.transition('ONBOARDING_TELEFONO', null, resNlu, catalogo, perfil, 'tg:123456789', null, [], resFsm.clientePerfil);

assert(resFsm.nextState === 'ONBOARDING_CONFIRMAR', 'Debe presentar confirmación');
assert(resFsm.clientePerfil.telefono === '3145376069', 'Debe guardar celular');
console.log('✅ Test 5 Pasó: Celular registrado\n');

// ── Test 6: Confirmación de datos
console.log('Test 6: Confirmación de datos ("Sí, está bien ✅")');
resNlu = { intent: 'DESCONOCIDO', confidence: 1.0, entities: {}, rawText: 'Sí, está bien ✅' };
resFsm = fsm.transition('ONBOARDING_CONFIRMAR', null, resNlu, catalogo, perfil, 'tg:123456789', null, [], resFsm.clientePerfil);

assert(resFsm.nextState === 'ONBOARDING_PRIVACIDAD', 'Debe pasar a Habeas Data');
console.log('✅ Test 6 Pasó: Paso a Privacidad\n');

// ── Test 7: Habeas Data -> Completado por Sofía y Despacho del Menú Principal
console.log('Test 7: Autorización de tratamiento ("Sí, autorizo ✅")');
resNlu = { intent: 'DESCONOCIDO', confidence: 1.0, entities: {}, rawText: 'Sí, autorizo ✅' };
resFsm = fsm.transition('ONBOARDING_PRIVACIDAD', null, resNlu, catalogo, perfil, 'tg:123456789', null, [], resFsm.clientePerfil);

assert(resFsm.clientePerfil.completado === true, 'Perfil debe quedar completado: true');
assert(resFsm.replyText.includes('Soy Sofía'), 'Sofía debe identificarse en la confirmación');
assert(resFsm.buttons.includes('Realizar pedido 🥪'), 'Debe incluir botón Realizar pedido 🥪');
assert(resFsm.buttons.includes('Seguir pedido 📌'), 'Debe incluir botón Seguir pedido 📌');
assert(resFsm.buttons.includes('Buscar sucursales 🔍'), 'Debe incluir botón Buscar sucursales 🔍');
assert(resFsm.buttons.includes('Hacer una consulta 💬'), 'Debe incluir botón Hacer una consulta 💬');
console.log('✅ Test 7 Pasó: Onboarding culmina en el Menú Principal con Sofía\n');

// ── Test 8: Clic en "Realizar pedido 🥪" -> Calificación de Destinatario (¿Para ti o para otra persona?)
console.log('Test 8: Clic en "Realizar pedido 🥪" solicita calificar destinatario');
const nluPedido = nlu.interpretarFastPath('Realizar pedido 🥪', catalogo, 'IDLE');
assert(nluPedido.intent === 'VER_CATALOGO', 'Fast-path debe mapear a VER_CATALOGO');
let resFsmDest = fsm.transition('IDLE', null, nluPedido, catalogo, perfil, 'tg:123456789', null, [], resFsm.clientePerfil);

assert(resFsmDest.nextState === 'SELECCIONANDO_DESTINATARIO', 'Debe ir a SELECCIONANDO_DESTINATARIO');
assert(resFsmDest.replyText.includes('¿el pedido es para ti o para otra persona?'), 'Debe preguntar destinatario');
assert(resFsmDest.buttons.includes('Es para mí 👤'), 'Debe ofrecer botón Es para mí 👤');
assert(resFsmDest.buttons.includes('Es para otra persona 🎁'), 'Debe ofrecer botón Es para otra persona 🎁');
console.log('✅ Test 8 Pasó: Calificación previa de destinatario solicitada correctamente\n');

// ── Test 9: Selección "Es para mí 👤" -> Pregunta modalidad (Envío a domicilio / Retiro en local)
console.log('Test 9: Selección "Es para mí 👤" pasa a SOLICITANDO_ENTREGA_PREVIA');
const nluPropio = nlu.interpretarFastPath('Es para mí 👤', catalogo, 'SELECCIONANDO_DESTINATARIO');
assert(nluPropio.intent === 'DESTINATARIO_PROPIO', 'NLU debe reconocer DESTINATARIO_PROPIO');
let resFsmModalidad = fsm.transition('SELECCIONANDO_DESTINATARIO', resFsmDest.nextDraft, nluPropio, catalogo, perfil, 'tg:123456789', null, [], resFsm.clientePerfil);

assert(resFsmModalidad.nextState === 'SOLICITANDO_ENTREGA_PREVIA', 'Debe pasar a SOLICITANDO_ENTREGA_PREVIA');
assert(resFsmModalidad.nextDraft.destinatario.tipo === 'propio', 'Destinatario debe ser propio');
assert(resFsmModalidad.buttons.includes('Envío a domicilio 🛵'), 'Debe ofrecer opción Envío a domicilio 🛵');
assert(resFsmModalidad.buttons.includes('Retiro en local 🛍️'), 'Debe ofrecer opción Retiro en local 🛍️');
console.log('✅ Test 9 Pasó: Flujo propio solicita modalidad de entrega\n');

// ── Test 10: Selección "Envío a domicilio 🛵" -> Pregunta dirección previa
console.log('Test 10: Selección "Envío a domicilio 🛵" pasa a SOLICITANDO_DIRECCION_PREVIA');
const nluDomicilio = nlu.interpretarFastPath('Envío a domicilio 🛵', catalogo, 'SOLICITANDO_ENTREGA_PREVIA');
assert(nluDomicilio.intent === 'ELEGIR_MODALIDAD', 'NLU debe reconocer ELEGIR_MODALIDAD');
let resFsmDir = fsm.transition('SOLICITANDO_ENTREGA_PREVIA', resFsmModalidad.nextDraft, nluDomicilio, catalogo, perfil, 'tg:123456789', null, [], resFsm.clientePerfil);

assert(resFsmDir.nextState === 'SOLICITANDO_DIRECCION_PREVIA', 'Debe pasar a SOLICITANDO_DIRECCION_PREVIA');
assert(resFsmDir.replyText.includes('a dónde vamos a hacer el envío'), 'Debe consultar la dirección con tono Crepes & Waffles');
console.log('✅ Test 10 Pasó: Solicita dirección previa antes del menú\n');

// ── Test 11: Envío de dirección -> Despliega catálogo con dirección ya vinculada
console.log('Test 11: Envío de dirección en SOLICITANDO_DIRECCION_PREVIA abre catálogo activo');
const nluDirVal = { intent: 'DESCONOCIDO', confidence: 1.0, entities: {}, rawText: 'Calle 100 # 15-20, Chico Norte' };
let resFsmCat = fsm.transition('SOLICITANDO_DIRECCION_PREVIA', resFsmDir.nextDraft, nluDirVal, catalogo, perfil, 'tg:123456789', null, [], resFsm.clientePerfil);

assert(resFsmCat.nextState === 'CATALOGO_ACTIVO', 'Debe pasar a CATALOGO_ACTIVO');
assert(resFsmCat.nextDraft.direccion === 'Calle 100 # 15-20, Chico Norte', 'Debe almacenar la dirección en el draft');
assert(resFsmCat.replyText.includes('Calle 100 # 15-20'), 'Debe confirmar la dirección');
assert(resFsmCat.replyText.includes('MENÚ'), 'Debe mostrar la carta');
console.log('✅ Test 11 Pasó: Catálogo desplegado con dirección y cobertura establecida\n');

// ── Test 12: Flujo alternativo "Es para otra persona 🎁"
console.log('Test 12: Flujo de regalo a tercero ("Es para otra persona 🎁")');
const nluTercero = nlu.interpretarFastPath('Es para otra persona 🎁', catalogo, 'SELECCIONANDO_DESTINATARIO');
assert(nluTercero.intent === 'DESTINATARIO_TERCERO', 'NLU debe reconocer DESTINATARIO_TERCERO');
let resFsmTercero = fsm.transition('SELECCIONANDO_DESTINATARIO', null, nluTercero, catalogo, perfil, 'tg:123456789', null, [], resFsm.clientePerfil);

assert(resFsmTercero.nextState === 'SOLICITANDO_RECEPTOR_NOMBRE', 'Debe pasar a solicitar nombre de receptor');
assert(resFsmTercero.replyText.includes('¿Cómo se llama la persona que recibirá el pedido?'), 'Debe preguntar nombre de receptor');

// Receptor nombre: "Camila Restrepo"
const nluRecNombre = { intent: 'DESCONOCIDO', confidence: 1.0, entities: {}, rawText: 'Camila Restrepo' };
let resFsmRecTel = fsm.transition('SOLICITANDO_RECEPTOR_NOMBRE', resFsmTercero.nextDraft, nluRecNombre, catalogo, perfil, 'tg:123456789', null, [], resFsm.clientePerfil);

assert(resFsmRecTel.nextState === 'SOLICITANDO_RECEPTOR_TELEFONO', 'Debe pasar a solicitar teléfono del receptor');
assert(resFsmRecTel.nextDraft.destinatario.nombre === 'Camila Restrepo', 'Debe guardar nombre de Camila');

// Receptor teléfono: "3109876543"
const nluRecTel = { intent: 'DESCONOCIDO', confidence: 1.0, entities: {}, rawText: '3109876543' };
let resFsmRecMod = fsm.transition('SOLICITANDO_RECEPTOR_TELEFONO', resFsmRecTel.nextDraft, nluRecTel, catalogo, perfil, 'tg:123456789', null, [], resFsm.clientePerfil);

assert(resFsmRecMod.nextState === 'SOLICITANDO_ENTREGA_PREVIA', 'Debe pasar a entrega previa');
assert(resFsmRecMod.nextDraft.destinatario.telefono === '3109876543', 'Debe guardar teléfono de Camila');
console.log('✅ Test 12 Pasó: Captura de receptor de regalo completa\n');

// ── Test 13: Agregar producto y verificar que en CONFIRMANDO_PEDIDO aparezca el destinatario
console.log('Test 13: Pedido con destinatario tercero muestra información en el resumen');
const draftConItem = {
  lineas: [{ productId: 'cat-f1', nombre: 'Combo Hamburguesa Clásica', precioUnitario: 25000, cantidad: 1 }],
  modalidad: 'domicilio',
  direccion: 'Carrera 7 # 72-41',
  destinatario: { tipo: 'tercero', nombre: 'Camila Restrepo', telefono: '3109876543' },
  updatedAt: new Date().toISOString(),
};

const nluProceder = { intent: 'PROCEDER_ENTREGA', confidence: 1.0, entities: {}, rawText: 'Proceder a la entrega' };
let resFsmConf = fsm.transition('CARRITO_EN_CONSTRUCCION', draftConItem, nluProceder, catalogo, perfil, 'tg:123456789', null, [], resFsm.clientePerfil);

assert(resFsmConf.nextState === 'CONFIRMANDO_PEDIDO', 'Debe pasar a CONFIRMANDO_PEDIDO');
assert(resFsmConf.replyText.includes('Destinatario:'), 'Debe incluir etiqueta Destinatario');
assert(resFsmConf.replyText.includes('Camila Restrepo'), 'Debe incluir nombre de Camila');
assert(resFsmConf.replyText.includes('3109876543'), 'Debe incluir teléfono de contacto');

// Confirmación final
const nluConfirmar = { intent: 'CONFIRMAR_PEDIDO', confidence: 1.0, entities: {}, rawText: 'Confirmar pedido' };
let resFsmFinal = fsm.transition('CONFIRMANDO_PEDIDO', draftConItem, nluConfirmar, catalogo, perfil, 'tg:123456789', null, [], resFsm.clientePerfil);

assert(resFsmFinal.orderCreated !== undefined, 'Debe generar orderCreated');
assert(resFsmFinal.orderCreated.destinatario.nombre === 'Camila Restrepo', 'orderCreated debe conservar destinatario');
console.log('✅ Test 13 Pasó: Resumen y orden final preservan información del destinatario tercero\n');

console.log('══════════════════════════════════════════════════════════════════════');
console.log('🎉 TODOS LOS TESTS DE SOFÍA, DESTINATARIO Y HUB & SPOKE PASARON AL 100%!');
console.log('══════════════════════════════════════════════════════════════════════\n');
