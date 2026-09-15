import { AppController } from './application.js';
import { bootstrap, type Setup } from './bootstrap.js';
import { services, controllers } from './services/index.js';
import allControllers from './controllers/index.js';

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
