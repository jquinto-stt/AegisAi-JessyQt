import type { Request } from "@webiai/sdk.http";

/**
 * Firma de un middleware de Express.
 *
 * ⚠️ No se usa el alias `Middleware` del SDK: es `RequestHandler` de Express, y
 * `@types/express` no está instalado en este repo, así que resuelve a `any` y no
 * comprueba nada. La forma se declara aquí para que los parámetros estén tipados de
 * verdad — y para que se note que faltan los tipos de Express.
 */
export type RawBodyMiddleware = (
  request: Request,
  response: unknown,
  next: (error?: unknown) => void
) => void;

/**
 * Ruta del webhook. Se comprueba con `includes` y no con igualdad porque el
 * gateway puede anteponer un prefijo de etapa: lo único que decide aquí es si hay
 * que conservar los bytes del cuerpo, y equivocarse por exceso no tiene coste.
 */
export const WHATSAPP_WEBHOOK_PATH = "/webhooks/whatsapp";

/** El cuerpo crudo, tal como llegó por el socket. */
export interface RawBodyCarrier {
  rawBody?: Buffer;
}

/** El cuerpo crudo de una petición, o `undefined` si nadie lo capturó. */
export const rawBodyOf = (request: unknown): Buffer | undefined =>
  (request as RawBodyCarrier).rawBody;

/**
 * Captura el cuerpo **crudo** de las entregas del webhook.
 *
 * ⚠️⚠️ Hace falta porque `createApp` monta `express.json()` para toda la aplicación
 * y eso **descarta los bytes originales**: deja sólo el objeto ya parseado, y la
 * firma de Meta se calcula sobre los bytes. Sin esto, lo único que se podría hacer
 * es reserializar el JSON — que no produce la misma firma, así que la verificación
 * sería falsa o, peor, permisiva.
 *
 * Se registra en `preMiddlewares` (antes del parser JSON) y **sólo actúa en la ruta
 * del webhook**: el resto de la aplicación sigue con el parser normal. Aquí el
 * cuerpo se lee del stream, se guarda en `rawBody` y se parsea a mano para que el
 * controlador no tenga que hacerlo.
 *
 * ⚠️ Un JSON mal formado deja `body` en `undefined` y el controlador responde 400.
 * No se lanza desde el middleware: un error aquí sería un 500, y Meta reintentaría
 * algo que nunca va a funcionar.
 */
export const captureWhatsAppRawBody: RawBodyMiddleware = (request, _response, next) => {
  if (!request.path.includes(WHATSAPP_WEBHOOK_PATH)) return next();

  const chunks: Buffer[] = [];

  request.on("data", (chunk: Buffer) => chunks.push(chunk));

  request.on("end", () => {
    const rawBody = Buffer.concat(chunks);
    (request as RawBodyCarrier).rawBody = rawBody;

    try {
      request.body = rawBody.length > 0 ? JSON.parse(rawBody.toString("utf8")) : {};
    } catch {
      request.body = undefined;
    }

    next();
  });

  request.on("error", next);
};
