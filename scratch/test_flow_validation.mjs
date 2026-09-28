import { TelegramDAO } from '../packages/services/api/modules/service/dist/telegram/index.js';
import { TelegramHandler } from '../packages/services/api/modules/service/dist/telegram/index.js';

const dao = new TelegramDAO();
const sentMessages = [];
const mockBot = {
  sendMessage: async (chatId, text, opts) => {
    sentMessages.push({ text, buttons: opts?.buttons });
    console.log(`\n🤖 BOT:\n"${text}"`);
    if (opts?.buttons?.length) console.log(`   [Botones]:`, opts.buttons.join(' | '));
    return { ok: true, messageId: 'm' + Date.now() };
  },
};

const handler = new TelegramHandler(dao, mockBot);
const chatId = 7965993532;
const fullName = 'Mariana Reyes';

// Limpiar estado
const { conversacionId } = await dao.asegurarConversacion(chatId, fullName);
await dao.guardarEstadoConversacion(conversacionId, 'IDLE', null);

const scriptTurns = [
  'tienes arroz?',
  'si por fa',
  'quiero 10 combos de amburguesa',
  'si una gaseosa',
  'ya con eso',
  'A Domicilio',
  'Calle 45 # 12-30',
  'Confirmar pedido',
];

for (const turn of scriptTurns) {
  console.log(`\n========================================`);
  console.log(`👤 USUARIO: "${turn}"`);
  console.log(`========================================`);
  await handler.onMessage({
    chatId,
    userId: chatId,
    fullName,
    text: turn,
    messageId: Date.now(),
  });
}

console.log('\n🎉 Flujo completo ejecutado.');
