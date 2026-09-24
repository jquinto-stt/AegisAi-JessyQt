import { TurnosDAO } from './TurnosDAO.js';
/**
 * Register business services (DAOs, models, etc.) in the ServiceManager.
 */
export const services = async (sm) => {
    // Data access — single-table DynamoDB DAO for queues + tickets
    sm.register(TurnosDAO);
};
/**
 * Register HTTP controllers in the ServiceManager.
 */
export const controllers = async (_sm) => {
    // Controllers are auto-registered by createApp if not already present.
    // Explicit registration here is only needed for controllers with
    // custom ServiceFactory or special DI configuration.
};
//# sourceMappingURL=index.js.map