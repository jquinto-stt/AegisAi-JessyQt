import { TelegramFSM } from '../packages/services/api/modules/service/src/telegram/TelegramFSM.ts';
import { TelegramNLU } from '../packages/services/api/modules/service/src/telegram/TelegramNLU.ts';
import { TelegramHandler } from '../packages/services/api/modules/service/src/telegram/TelegramHandler.ts';

const nlu = new TelegramNLU();
const fsm = new TelegramFSM();

function assert(cond, msg) {
  if (!cond) {
    console.error('❌ FALLÓ:', msg);
    throw new Error(msg);
  }
}

console.log('🧪 Iniciando verificación del flujo de Ubicación GPS y Sucursales en Telegram Bot...\n');

// ── Test 1: NLU reconoce "Buscar sucursales 🔍"
console.log('Test 1: NLU interpreta "Buscar sucursales 🔍"');
let nluRes = nlu.interpretarFastPath('Buscar sucursales 🔍', [], 'IDLE');
assert(nluRes.intent === 'CONSULTAR_BODEGAS', 'Debe mapear a CONSULTAR_BODEGAS');
console.log('✅ Test 1 Pasó: Intent CONSULTAR_BODEGAS detectado');

// ── Test 2: NLU reconoce "Por ubicación actual" y "📍 Por ubicación actual"
console.log('Test 2: NLU interpreta "Por ubicación actual"');
nluRes = nlu.interpretarFastPath('Por ubicación actual', [], 'IDLE');
assert(nluRes.intent === 'BUSCAR_SUCURSALES_GPS', 'Debe mapear a BUSCAR_SUCURSALES_GPS');

nluRes = nlu.interpretarFastPath('📍 Por ubicación actual', [], 'IDLE');
assert(nluRes.intent === 'BUSCAR_SUCURSALES_GPS', 'Debe mapear con emoji a BUSCAR_SUCURSALES_GPS');
console.log('✅ Test 2 Pasó: Intent BUSCAR_SUCURSALES_GPS detectado');

// ── Test 3: NLU reconoce "🏬 Ver todas las sedes"
console.log('Test 3: NLU interpreta "🏬 Ver todas las sedes"');
nluRes = nlu.interpretarFastPath('🏬 Ver todas las sedes', [], 'IDLE');
assert(nluRes.intent === 'VER_TODAS_BODEGAS', 'Debe mapear a VER_TODAS_BODEGAS');
console.log('✅ Test 3 Pasó: Intent VER_TODAS_BODEGAS detectado');

// ── Test 4: Mock de TelegramBot y DAO para verificar la respuesta de TelegramHandler
console.log('Test 4: TelegramHandler responde a CONSULTAR_BODEGAS ofreciendo "Por ubicación actual"');
const sentMessages = [];
const mockBot = {
  sendMessage: async (chatId, text, options) => {
    sentMessages.push({ chatId, text, options });
    return { ok: true, messageId: '123' };
  },
  sendChatAction: async () => {},
};

const mockBodegas = [
  { id: 'b1', nombre: 'Sede Principal Chicó', principal: true, direccion: 'Calle 100 # 15-20, Bogotá' },
  { id: 'b2', nombre: 'Sede Chapinero', principal: false, direccion: 'Carrera 7 # 60-35, Bogotá' },
];

const mockDao = {
  asegurarConversacion: async () => ({
    conversacionId: 'conv-test-1',
    modo: 'bot',
    fsmState: 'IDLE',
    draft: null,
    ultimoPedidoId: null,
    clientePerfil: { completado: true, nombre: 'Jessy' },
  }),
  guardarMensaje: async () => {},
  actualizarModoAtencion: async () => {},
  guardarEstadoConversacion: async () => {},
  obtenerModulosActivos: async () => ({ tieneInventarios: true, tienePedidos: true }),
  obtenerCatalogoYPerfil: async () => ({
    catalogo: [{ id: 'p1', nombre: 'Crepe de Pollo', precio: 22000, stock: 10, disponible: true }],
    perfil: { perfilComercial: 'food', etiquetaCatalogo: 'Menú', costoEnvio: 5000, horarioAtencion: '11am - 10pm' },
  }),
  obtenerBodegas: async () => mockBodegas,
  obtenerPedidosRecientes: async () => [],
};

const handler = new TelegramHandler(mockDao, mockBot);

// Simular mensaje de usuario: "Buscar sucursales 🔍"
await handler.onMessage({
  chatId: 987654,
  userId: 987654,
  fullName: 'Jessy Quinto',
  text: 'Buscar sucursales 🔍',
  messageId: 101,
});

assert(sentMessages.length === 1, 'Debe haber enviado un mensaje');
assert(sentMessages[0].text.includes('sucursales más cercanas'), 'Debe enviar intro de búsqueda');
assert(sentMessages[0].options.buttons.includes('📍 Por ubicación actual'), 'Debe incluir botón "Por ubicación actual"');
assert(sentMessages[0].options.buttons.includes('🏬 Ver todas las sedes'), 'Debe incluir botón "Ver todas las sedes"');
console.log('✅ Test 4 Pasó: Bot ofreció búsqueda por ubicación actual y ver todas las sedes\n');

// ── Test 5: Usuario presiona "📍 Por ubicación actual"
console.log('Test 5: Usuario elige "📍 Por ubicación actual" -> Bot pide ubicación GPS nativa');
sentMessages.length = 0;
await handler.onMessage({
  chatId: 987654,
  userId: 987654,
  fullName: 'Jessy Quinto',
  text: '📍 Por ubicación actual',
  messageId: 102,
});

assert(sentMessages.length === 1, 'Debe haber enviado un mensaje');
assert(sentMessages[0].text.includes('compartir tu ubicación actual'), 'Debe solicitar pulsar el botón GPS');
assert(sentMessages[0].options.requestLocationButton === '📍 Enviar mi ubicación actual', 'Debe configurar botón nativo requestLocationButton');
console.log('✅ Test 5 Pasó: Bot envía botón con requestLocationButton para abrir el GPS nativo del celular\n');

// ── Test 6: Usuario envía su coordenada GPS
console.log('Test 6: Usuario envía GPS (lat, lng) -> Bot entrega sucursales con ruta directa de Google Maps');
sentMessages.length = 0;
await handler.onMessage({
  chatId: 987654,
  userId: 987654,
  fullName: 'Jessy Quinto',
  text: '',
  messageId: 103,
  location: {
    latitude: 4.67212,
    longitude: -74.05321,
  },
});

assert(sentMessages.length === 1, 'Debe haber respondido a la ubicación');
assert(sentMessages[0].text.includes('¡Ubicación recibida con éxito!'), 'Debe confirmar recepción de GPS');
assert(sentMessages[0].text.includes('Sede Principal Chicó'), 'Debe listar la sede principal');
assert(sentMessages[0].text.includes('https://www.google.com/maps/dir/'), 'Debe incluir enlaces de ruta directa en Google Maps');
console.log('✅ Test 6 Pasó: Coordenadas procesadas y sucursales entregadas con enlaces de mapa\n');

// ── Test 7: En flujo de domicilio (SOLICITANDO_DIRECCION_PREVIA), ubicación GPS se registra como dirección
console.log('Test 7: Ubicación GPS en flujo de entrega a domicilio registra dirección y avanza a carta');
const mockDaoDomicilio = {
  ...mockDao,
  asegurarConversacion: async () => ({
    conversacionId: 'conv-test-2',
    modo: 'bot',
    fsmState: 'SOLICITANDO_DIRECCION_PREVIA',
    draft: { lineas: [], modalidad: 'domicilio', direccion: null, updatedAt: new Date().toISOString() },
    ultimoPedidoId: null,
    clientePerfil: { completado: true, nombre: 'Jessy' },
  }),
};

const handlerDomicilio = new TelegramHandler(mockDaoDomicilio, mockBot);
sentMessages.length = 0;

await handlerDomicilio.onMessage({
  chatId: 987654,
  userId: 987654,
  fullName: 'Jessy Quinto',
  text: '',
  messageId: 104,
  location: {
    latitude: 4.67212,
    longitude: -74.05321,
  },
});

assert(sentMessages.length === 1, 'Debe haber respondido');
assert(sentMessages[0].text.includes('Registramos tu dirección de envío') || sentMessages[0].text.includes('Ubicación GPS'), 'Debe registrar la dirección');
console.log('✅ Test 7 Pasó: Ubicación GPS en flujo de domicilio registrada con éxito\n');

console.log('══════════════════════════════════════════════════════════════════════');
console.log('🎉 TODOS LOS TESTS DE UBICACIÓN GPS Y SUCURSALES PASARON AL 100%!');
console.log('══════════════════════════════════════════════════════════════════════\n');
