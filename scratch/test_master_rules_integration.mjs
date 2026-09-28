import { TelegramDAO } from '../packages/services/api/modules/service/dist/telegram/index.js';
import { TelegramHandler } from '../packages/services/api/modules/service/dist/telegram/index.js';

const dao = new TelegramDAO();
const responses = [];
const mockBot = {
  sendMessage: async (chatId, text, opts) => {
    responses.push({ text, buttons: opts?.buttons });
    console.log(`\n🤖 BOT -> "${text}"`);
    if (opts?.buttons?.length) console.log(`   [Botones]:`, opts.buttons.join(' | '));
    return { ok: true, messageId: 'm999' };
  },
};

const handler = new TelegramHandler(dao, mockBot);
const chatId = 7965993532;
const fullName = 'Mariana Reyes';

// Limpiar estado
const { conversacionId } = await dao.asegurarConversacion(chatId, fullName);
await dao.guardarEstadoConversacion(conversacionId, 'IDLE', null);

const queries = [
  '¿Cuánto es 2+2?',
  '¿Tienen arroz?',
  '¿Cuánto cuesta la hamburguesa?',
  'Quiero una hamburguesa',
];

for (const q of queries) {
  console.log(`\n========================================`);
  console.log(`👤 USUARIO: "${q}"`);
  console.log(`========================================`);
  await handler.onMessage({
    chatId,
    userId: chatId,
    fullName,
    text: q,
    messageId: Date.now(),
  });
}

console.log('\n✅ Prueba completada.');
