import * as fs from 'fs';
import * as path from 'path';
import { AppController } from './application.js';
import { bootstrap, type Setup } from './bootstrap.js';
import { services, controllers } from './services/index.js';
import allControllers from './controllers/index.js';
import { TelegramBot } from './telegram/index.js';

// Cargar .env.local de forma determinista si no están en process.env
const envLocations = [
  path.resolve('packages/services/api/modules/service/.env.local'),
  path.resolve('.env.local'),
  path.resolve(process.cwd(), '.env.local'),
  path.resolve(process.cwd(), 'packages/services/api/modules/service/.env.local')
];
for (const loc of envLocations) {
  if (fs.existsSync(loc)) {
    const raw = fs.readFileSync(loc, 'utf-8');
    for (const l of raw.split('\n')) {
      const trimmed = l.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const k = trimmed.slice(0, eqIdx).trim();
        const v = trimmed.slice(eqIdx + 1).trim();
        if (!process.env[k]) process.env[k] = v;
      }
    }
    break;
  }
}

const PORT = parseInt(process.env.PORT || '8080', 10);

const App = AppController(allControllers);

const setup: Setup = async (sm) => {
  await services(sm);
  await controllers(sm);
};

export async function main() {
  const { app } = await bootstrap(App, setup);

  app.listen(PORT, () => {
    console.info(`🚀 SrvApi listening on port ${PORT}...`);
  });

  if (process.env.TELEGRAM_BOT_TOKEN) {
    try {
      const telegramBot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);
      telegramBot.start();
    } catch (e: any) {
      console.error('[TelegramBot] No se pudo inicializar:', e.message);
    }
  }

  return { app };
}

const time = Date.now();
main()
  .then(() => {
    console.info(`✅ Application started in ${Date.now() - time}ms`);
  })
  .catch((err) => {
    console.error(err.stack);
    process.exit(1);
  });
