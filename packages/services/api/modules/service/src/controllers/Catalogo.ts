import {
  Endpoint,
  HttpResponseOK,
  HttpResponseBadRequest,
  type Context,
} from '@webiai/sdk.http';
import EP from '../endpoints.js';
import { catalogoIAService } from '../services/CatalogoIAService.js';

class Catalogo {
  @Endpoint(EP.$ImportarCatalogoIA)
  async importarCatalogoIA(ctx: Context) {
    try {
      const body = (ctx.request.body as Record<string, any>) ?? {};
      const { fileBase64, fileName, mimeType, textoPlano } = body;

      if (!fileBase64 && !textoPlano) {
        return new HttpResponseBadRequest({
          error: 'Debes proporcionar un archivo en base64 o texto plano para procesar.',
        });
      }

      let buffer: Buffer;
      if (fileBase64) {
        // Limpiar encabezados data URL si vienen incluidos
        const cleanBase64 = fileBase64.replace(/^data:([A-Za-z-+/]+);base64,/, '');
        buffer = Buffer.from(cleanBase64, 'base64');
      } else {
        buffer = Buffer.from(textoPlano, 'utf-8');
      }

      const nombreArchivo = fileName || (fileBase64 ? 'documento.xlsx' : 'texto.txt');

      const productos = await catalogoIAService.procesarArchivoCatalogo({
        buffer,
        fileName: nombreArchivo,
        mimeType: mimeType || 'application/octet-stream',
      });

      return new HttpResponseOK({
        ok: true,
        total: productos.length,
        productos,
      });
    } catch (err: any) {
      console.error('[CatalogoController] Error procesando archivo:', err);
      return new HttpResponseBadRequest({
        error: err.message || 'Error al procesar el archivo con Azure OpenAI.',
      });
    }
  }
}

export default Catalogo;
