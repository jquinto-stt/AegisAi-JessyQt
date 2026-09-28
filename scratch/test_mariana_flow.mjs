import { TelegramDAO } from '../packages/services/api/modules/service/dist/telegram/index.js';
import { TelegramHandler } from '../packages/services/api/modules/service/dist/telegram/index.js';

const dao = new TelegramDAO();
const mockBot = {
  sendMessage: async (chatId, text, opts) => {
    console.log(`\n🤖 BOT -> [${chatId}]:\n"${text}"`);
    if (opts?.buttons?.length) console.log(`   [Botones]:`, opts.buttons.join(' | '));
    return { ok: true, messageId: 'm123' };
  },
};

const handler = new TelegramHandler(dao, mockBot);
const chatId = 7965993532;
const fullName = 'Mariana Reyes';

// Limpiar estado previo para la prueba
const { conversacionId } = await dao.asegurarConversacion(chatId, fullName);
await dao.guardarEstadoConversacion(conversacionId, 'IDLE', null);

const turns = [
  '2. Papas Rústicas',
  'No me dejan agregar algo más?',
  'No seas tonto, me refiero a que si puedo agregar algo más a mi pedido ya que no me diste la opción',
  'No, ya no, se me quitaron las ganas de comprar',
];

for (let i = 0; i < turns.length; i++) {
  const text = turns[i];
  console.log(`\n========================================`);
  console.log(`👤 MARIANA: "${text}"`);
  console.log(`========================================`);
  await handler.onMessage({
    chatId,
    userId: chatId,
    fullName,
    text,
    messageId: 100 + i,
  });
}

console.log('\n✅ Prueba de flujo de Mariana completada con éxito.');
