import { AppController } from './application.js';
import { bootstrap } from './bootstrap.js';
import { services, controllers } from './services/index.js';
import allControllers from './controllers/index.js';
// ═══════════════════════════════════════════════════════════════════════════
// ARRANQUE DEL SERVICIO
// ═══════════════════════════════════════════════════════════════════════════
//
// ── El fallo que esto evita ────────────────────────────────────────────────
//
// `TurnosDAO` se registra en modo `eager`, así que `serviceManager.boot()` lo
// instancia SIEMPRE — aunque la ruta que se vaya a usar no lo toque. Su
// constructor lanza si falta `TABLE_NAME`, y como `TABLE_NAME` no está en
// ningún `.env` del repo, el proceso moría al arrancar.
//
// El síntoma era engañoso: el puerto quedaba cerrado y por el túnel de
// Cloudflare se leía `upstream connect failed (os error 10061)`, que apunta al
// túnel y no al código. Costó diagnosticarlo entero una vez.
//
// `TurnosDAO` es de la etapa de turnos/colas (DynamoDB), que está RETIRADA: el
// bot de pedidos usa Supabase y no pasa por él. Por eso se le da un valor por
// defecto en vez de exigir una variable de entorno que ya no significa nada
// para el camino que sí importa. Si algún día se vuelve a usar DynamoDB de
// verdad, se define `TABLE_NAME` en el entorno y ese valor manda.
if (!process.env.TABLE_NAME) {
    process.env.TABLE_NAME = 'TurnosTable';
}
const PORT = parseInt(process.env.PORT || '8080', 10);
const App = AppController(allControllers);
const setup = async (sm) => {
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
//# sourceMappingURL=main.js.map
