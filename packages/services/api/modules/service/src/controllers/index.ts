import Health from './Health.js';
import Queues from './Queues.js';
import Turnos from './Turnos.js';
import Auth from './Auth.js';
import Catalogo from './Catalogo.js';
// @ts-ignore
import ZernioWebhook from '../../dist/controllers/ZernioWebhook.js';
// @ts-ignore
import Conversaciones from '../../dist/controllers/Conversaciones.js';

const controllers = [
  Health,
  Queues,
  Turnos,
  Auth,
  Catalogo,
  ZernioWebhook,
  Conversaciones,
];

export default controllers;
