import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';

export interface ProductoCatalogoExtraido {
  id: string;
  nombre: string;
  categoria: string;
  descripcion: string;
  precio: number;
  imagen?: string;
  disponible: boolean;
}

export class CatalogoIAService {
  private endpoint: string;
  private apiKey: string;
  private deployment: string;

  constructor() {
    let ep = process.env.AZURE_CATALOG_OPENAI_ENDPOINT;
    let key = process.env.AZURE_CATALOG_OPENAI_KEY;
    this.deployment = process.env.AZURE_CATALOG_OPENAI_DEPLOYMENT || 'gpt-4o';

    // Fallback de lectura directa de .env.local si no está cargado
    if (!ep || !key) {
      const envPaths = [
        path.resolve(process.cwd(), '.env.local'),
        path.resolve(process.cwd(), 'packages/services/api/modules/service/.env.local'),
        path.resolve('.env.local'),
      ];
      for (const envP of envPaths) {
        if (fs.existsSync(envP)) {
          const content = fs.readFileSync(envP, 'utf-8');
          ep = ep || content.match(/AZURE_CATALOG_OPENAI_ENDPOINT=(.+)/)?.[1]?.trim();
          key = key || content.match(/AZURE_CATALOG_OPENAI_KEY=(.+)/)?.[1]?.trim();
          this.deployment = this.deployment || content.match(/AZURE_CATALOG_OPENAI_DEPLOYMENT=(.+)/)?.[1]?.trim() || 'gpt-4o';
        }
      }
    }

    this.endpoint = (ep || 'https://oai-necto-catalogo-2409b.openai.azure.com/').replace(/\/+$/, '');
    this.apiKey = key || '';
  }

  /**
   * Extrae productos a partir de un archivo (Buffer o Base64),
   * identificando si es Excel, CSV, PDF o Imagen y enviándolo al recurso dedicado de Azure OpenAI.
   */
  async procesarArchivoCatalogo(params: {
    buffer: Buffer;
    fileName: string;
    mimeType?: string;
  }): Promise<ProductoCatalogoExtraido[]> {
    const { buffer, fileName, mimeType = '' } = params;
    const lowerName = fileName.toLowerCase();
    const isExcel = lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls') || mimeType.includes('spreadsheet') || mimeType.includes('excel');
    const isCsv = lowerName.endsWith('.csv') || mimeType.includes('csv');
    const isPdf = lowerName.endsWith('.pdf') || mimeType.includes('pdf');
    const isImage = mimeType.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(lowerName);

    console.info(`[CatalogoIAService] Procesando documento: ${fileName} (${buffer.length} bytes, tipo: ${mimeType})`);

    let textoExtraido = '';
    let isVisionMode = false;
    let imageBase64DataUrl = '';

    if (isExcel || isCsv) {
      // Parsear hojas con SheetJS
      try {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const hojasTextos: string[] = [];
        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName];
          if (!sheet) continue;
          const csvText = XLSX.utils.sheet_to_csv(sheet);
          if (csvText.trim()) {
            hojasTextos.push(`--- HOJA: ${sheetName} ---\n${csvText}`);
          }
        }
        textoExtraido = hojasTextos.join('\n\n');
        console.info(`[CatalogoIAService] Extraídas ${workbook.SheetNames.length} hojas de cálculo (${textoExtraido.length} caracteres)`);
      } catch (err: any) {
        console.error('[CatalogoIAService] Error leyendo Excel:', err.message);
        throw new Error(`Error al leer archivo Excel: ${err.message}`);
      }
    } else if (isPdf) {
      // Parsear texto del PDF
      try {
        const pdfModule: any = await import('pdf-parse');
        const PDFParseClass = pdfModule.PDFParse;
        if (PDFParseClass) {
          const parser = new PDFParseClass({ data: buffer });
          await parser.load();
          const parsedText = await parser.getText();
          textoExtraido = (typeof parsedText === 'string' ? parsedText : parsedText?.text || '').trim();
          console.info(`[CatalogoIAService] Texto extraído del PDF: ${textoExtraido.length} caracteres`);
        }
      } catch (err: any) {
        console.warn('[CatalogoIAService] Advertencia en extracción de texto PDF:', err.message);
      }

      // Si el PDF no tenía texto extraíble (ej. es escaneado), avisar
      if (!textoExtraido || textoExtraido.length < 15) {
        throw new Error('El PDF no contiene texto seleccionable. Asegúrate de subir un archivo digital o una hoja de cálculo Excel/CSV.');
      }
    } else if (isImage) {
      isVisionMode = true;
      const cleanMime = mimeType || (lowerName.endsWith('.png') ? 'image/png' : 'image/jpeg');
      imageBase64DataUrl = `data:${cleanMime};base64,${buffer.toString('base64')}`;
      console.info(`[CatalogoIAService] Modo visión activado para imagen: ${fileName}`);
    } else {
      // Intentar leer como texto plano
      textoExtraido = buffer.toString('utf-8');
    }

    // Invocación a Azure OpenAI en el recurso dedicado oai-necto-catalogo
    return await this.invocarAzureOpenAI({
      texto: textoExtraido,
      isVision: isVisionMode,
      imageBase64DataUrl,
      fileName,
    });
  }

  private async invocarAzureOpenAI(opciones: {
    texto: string;
    isVision: boolean;
    imageBase64DataUrl?: string;
    fileName: string;
  }): Promise<ProductoCatalogoExtraido[]> {
    if (!this.apiKey) {
      throw new Error('No se encontró la clave de API para el recurso Azure OpenAI de Catálogo (AZURE_CATALOG_OPENAI_KEY).');
    }

    const systemPrompt = `Eres un extractor inteligente y experto en gastronomía y comercio retail.
Tu objetivo es analizar minuciosamente documentos de catálogo, menús, cartas de restaurante o listas de precios (en formato texto, CSV o imagen) y extraer TODOS los productos disponibles.

REGLAS DE EXTRACCIÓN:
1. "nombre": Nombre claro, limpio y conciso del producto o plato.
2. "categoria": Clasificación lógica (ej: "Hamburguesas", "Pizzas", "Bebidas", "Entradas", "Postres", "Combos", "Platos Fuertes", "Adicionales").
3. "descripcion": Descripción comercial atractiva de los ingredientes o características. Si el documento no incluye una descripción detallada, genera una breve y profesional basada en el nombre y categoría.
4. "precio": Valor numérico entero en Pesos Colombianos ($COP). Convierte cadenas como "25.000", "$25.000", "25,000", "25k" a número entero 25000. Si un producto no tiene precio evidente, estima un valor coherente para ese tipo de producto en Colombia o coloca 0.
5. "disponible": true por defecto.

FORMATO DE SALIDA ESTRICTO:
Debes responder ÚNICAMENTE con un objeto JSON válido con la siguiente estructura:
{
  "productos": [
    {
      "nombre": "Hamburguesa Artesanal",
      "categoria": "Hamburguesas",
      "descripcion": "Carne 100% de res con queso cheddar fundido, tocineta crocante y vegetales frescos.",
      "precio": 24000,
      "disponible": true
    }
  ]
}`;

    const userMessages: any[] = [];
    if (opciones.isVision && opciones.imageBase64DataUrl) {
      userMessages.push({
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Por favor extrae todos los productos y precios de este menú/catálogo: ${opciones.fileName}`,
          },
          {
            type: 'image_url',
            image_url: {
              url: opciones.imageBase64DataUrl,
            },
          },
        ],
      });
    } else {
      userMessages.push({
        role: 'user',
        content: `Documento: ${opciones.fileName}\n\nContenido a extraer:\n${opciones.texto.slice(0, 50000)}`,
      });
    }

    const url = `${this.endpoint}/openai/deployments/${this.deployment}/chat/completions?api-version=2024-08-01-preview`;

    const requestBody = {
      messages: [
        { role: 'system', content: systemPrompt },
        ...userMessages,
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    };

    console.info(`[CatalogoIAService] Llamando a Azure OpenAI (${this.deployment}) en ${this.endpoint}...`);
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': this.apiKey,
      },
      body: JSON.stringify(requestBody),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error(`[CatalogoIAService] Error Azure OpenAI: ${resp.status}`, errText);
      throw new Error(`Error en Azure OpenAI (${resp.status}): ${errText}`);
    }

    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Respuesta vacía de Azure OpenAI.');
    }

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch (e: any) {
      console.error('[CatalogoIAService] Error parseando JSON de OpenAI:', content);
      throw new Error(`El modelo no retornó un JSON válido: ${e.message}`);
    }

    const rawList = Array.isArray(parsed.productos) ? parsed.productos : (Array.isArray(parsed) ? parsed : []);

    const defaultImages = [
      'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&q=80',
      'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500&q=80',
      'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&q=80',
      'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=500&q=80',
      'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&q=80',
      'https://images.unsplash.com/photo-1544025162-d76694265947?w=500&q=80',
      'https://images.unsplash.com/photo-1550547660-d9450f859349?w=500&q=80',
    ];

    const productosValidados: ProductoCatalogoExtraido[] = rawList.map((item: any, index: number) => {
      let precioNum = 0;
      if (typeof item.precio === 'number') {
        precioNum = item.precio;
      } else if (typeof item.precio === 'string') {
        const limpio = item.precio.replace(/[^\d]/g, '');
        precioNum = parseInt(limpio, 10) || 0;
      }

      return {
        id: `prod-ia-${Date.now()}-${index + 1}`,
        nombre: String(item.nombre || `Producto ${index + 1}`).trim(),
        categoria: String(item.categoria || 'General').trim(),
        descripcion: String(item.descripcion || 'Producto preparado con ingredientes selectos.').trim(),
        precio: precioNum,
        imagen: item.imagen || defaultImages[index % defaultImages.length],
        disponible: item.disponible !== false,
      };
    });

    console.info(`[CatalogoIAService] ✅ Extracción exitosa: ${productosValidados.length} productos detectados.`);
    return productosValidados;
  }
}

export const catalogoIAService = new CatalogoIAService();
