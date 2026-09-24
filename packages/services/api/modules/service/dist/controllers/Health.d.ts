import { HttpResponseOK } from '@webiai/sdk.http';
declare class Health {
    health(): Promise<HttpResponseOK<{
        status: string;
        service: string;
        timestamp: string;
    }>>;
}
export default Health;
//# sourceMappingURL=Health.d.ts.map