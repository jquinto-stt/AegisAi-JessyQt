import { Endpoint, HttpResponseOK } from '@webiai/sdk.http';
import EP from '../endpoints.js';

class Health {
  @Endpoint(EP.$Health)
  async health() {
    return new HttpResponseOK({
      status: 'ok',
      service: 'srv.api',
      timestamp: new Date().toISOString(),
    });
  }
}

export default Health;
