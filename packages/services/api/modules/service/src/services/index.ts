import type { Setup } from '../bootstrap.js';

/**
 * Register business services (DAOs, models, etc.) in the ServiceManager.
 */
export const services: Setup = async (_sm) => {
  // Database clients
  // Domain models
  // Business logic
};

/**
 * Register HTTP controllers in the ServiceManager.
 */
export const controllers: Setup = async (_sm) => {
  // Controllers are auto-registered by createApp if not already present.
  // Explicit registration here is only needed for controllers with
  // custom ServiceFactory or special DI configuration.
};
