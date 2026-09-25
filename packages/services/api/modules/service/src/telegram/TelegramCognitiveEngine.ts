import fs from 'fs';
import type { CatalogItem, BusinessProfile, CartDraft, NLUResult } from './types.js';

const BOT_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'agregar_productos',
      description: 'Agrega uno o varios productos o comidas al pedido. Úsala cuando el usuario pida cualquier alimento o bebida (incluso si no estás seguro de si está en la carta, ej. "el pollo", "4 hamburguesas", "una gaseosa", "otra más"). También captura si en el mismo mensaje indicó modalidad o dirección.',
      parameters: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                nombre: { type: 'string', description: 'Nombre del producto o comida solicitada' },
                cantidad: { type: 'integer', description: 'Cantidad de unidades (por defecto 1)' },
              },
              required: ['nombre', 'cantidad'],
            },
          },
          modalidad: {
            type: 'string',
            enum: ['domicilio', 'retiro'],
            description: 'Modalidad de entrega si fue indicada',
          },
          direccion: {
            type: 'string',
            description: 'Dirección física completa si fue indicada en el mensaje',
          },
        },
        required: ['items'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'mostrar_catalogo',
      description: 'Muestra el menú o carta de productos disponibles. Úsala cuando el usuario pida ver el menú, productos disponibles, o responda afirmativamente a ver opciones.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'iniciar_nuevo_pedido',
      description: 'Inicia una nueva orden o pedido limpio. Úsala cuando el usuario diga que quiere hacer otro pedido, pedir de nuevo, hacer una nueva orden o comenzar otra vez.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'elegir_entrega',
      description: 'Define la modalidad de entrega (domicilio o retiro/recoger) y/o la dirección del pedido.',
      parameters: {
        type: 'object',
        properties: {
          modalidad: { type: 'string', enum: ['domicilio', 'retiro'] },
          direccion: { type: 'string', description: 'Dirección física completa si es a domicilio' },
        },
        required: ['modalidad'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'confirmar_pedido',
      description: 'Confirma el pedido final para generar el pago seguro cuando el cliente da su visto bueno ("sí", "confirmo", "dale", "de una").',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'cancelar_pedido',
      description: 'Cancela el pedido en curso o un pedido registrado previamente.',
      parameters: {
        type: 'object',
        properties: {
          numero_pedido: { type: 'string', description: 'Número del pedido si fue especificado (ej. "0034", "WEB-0034")' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'consultar_estado_pedidos',
      description: 'Consulta el estado o historial de pedidos registrados del cliente.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'modificar_item_carrito',
      description: 'Ajusta cantidades, elimina un ítem o sustituye un producto por otro en el carrito actual.',
      parameters: {
        type: 'object',
        properties: {
          accion: { type: 'string', enum: ['cambiar_cantidad', 'eliminar', 'sustituir'] },
          nombre_item: { type: 'string' },
          nueva_cantidad: { type: 'integer' },
          nuevo_item_sustituto: { type: 'string' },
        },
        required: ['accion'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'consultar_informacion',
      description: 'Preguntas sobre costo de envío, horario del restaurante o dudas de cómo pedir.',
      parameters: {
        type: 'object',
        properties: {
          tema: { type: 'string', enum: ['costo_envio', 'horario', 'proceso_pedido'] },
        },
        required: ['tema'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'solicitar_humano',
      description: 'Transfiere la atención a un asesor o agente humano del restaurante.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
];

export class TelegramCognitiveEngine {
  private endpoint: string;
  private apiKey: string;
  private deployment: string;

  constructor() {
    let ep = process.env.AZURE_OPENAI_ENDPOINT;
    let key = process.env.AZURE_OPENAI_KEY;
    this.deployment = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o';

    if (!key && fs.existsSync('.env')) {
      try {
        const envContent = fs.readFileSync('.env', 'utf8');
        ep = ep || envContent.match(/AZURE_OPENAI_ENDPOINT=(.+)/)?.[1]?.trim();
        key = key || envContent.match(/AZURE_OPENAI_KEY=(.+)/)?.[1]?.trim();
      } catch (e) {
        // Ignorar fallo de lectura local
      }
    }

    this.endpoint = (ep || 'https://oai-nectoia-prod-d80b2.openai.azure.com/').replace(/\/+$/, '');
    this.apiKey = key || '';
  }

  /**
   * Ejecuta Azure OpenAI Tool Calling (Function Calling).
   * El LLM actúa como un agente decisor invocando la herramienta adecuada de negocio.
   */
  async extraerIntencionYEntidades(params: {
    textoUsuario: string;
    catalogo: CatalogItem[];
    perfil: BusinessProfile;
    estadoActual?: string;
    draft: CartDraft | null;
    historialPrevio?: Array<{ role: 'user' | 'assistant'; content: string }>;
  }): Promise<NLUResult | null> {
    if (!this.apiKey) {
      console.warn('[TelegramCognitiveEngine] No hay AZURE_OPENAI_KEY configurada.');
      return null;
    }

    const { textoUsuario, catalogo, perfil, estadoActual, draft, historialPrevio } = params;
    const catalogoItems = catalogo.map(c => `• ${c.nombre} ($${c.precio})`).join('\n');
    const carritoResumen = draft && draft.lineas.length > 0
      ? draft.lineas.map(l => `${l.cantidad}x ${l.nombre}`).join(', ')
      : 'Vacío';

    const systemPrompt = `Eres el asistente de toma de pedidos para Necto en Colombia.
Tu función es interpretar el mensaje del usuario y seleccionar la herramienta adecuada (Tool Call) para ejecutar la acción correspondiente.

INSTRUCCIONES CLAVE:
1. Si el usuario pide cualquier comida o bebida (ej. "el pollo", "4 hamburguesas", "agrega papas", "otra más"), llama SIEMPRE a la herramienta \`agregar_productos\`. NUNCA ignores comida solo porque no esté en el menú visible.
2. Si el usuario dice "quiero hacer otro pedido", "otro pedido, no puedo?", "nuevo pedido", llama a \`iniciar_nuevo_pedido\`.
3. Si el usuario dice "sí", "claro", "dale", "de una", "por favor", revisa el mensaje previo del asistente:
   - Si el asistente ofreció ver el catálogo -> llama a \`mostrar_catalogo\`.
   - Si el asistente pidió confirmar pedido -> llama a \`confirmar_pedido\`.
   - Si no hay contexto previo -> llama a \`mostrar_catalogo\`.
4. Si indica "recoger", "recogerlo", "para llevar", "retiro", "a domicilio", llama a \`elegir_entrega\`.
5. Si pregunta por horarios, costo de envío o dudas, llama a \`consultar_informacion\`.
6. Si el mensaje es una broma, operación matemática (ej. "2+2"), poesía o ajeno al negocio, NO llames a ninguna herramienta.

CONTEXTO ACTUAL:
- Estado del diálogo: ${estadoActual || 'IDLE'}
- Carrito actual: ${carritoResumen}
- Catálogo disponible:
${catalogoItems}`;

    const chatMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
    ];

    if (historialPrevio && historialPrevio.length > 0) {
      const recientes = historialPrevio.slice(-3);
      for (const h of recientes) {
        const clean = h.content.length > 200 ? h.content.slice(0, 200) + '...' : h.content;
        chatMessages.push({ role: h.role, content: clean });
      }
    }

    chatMessages.push({ role: 'user', content: textoUsuario });

    try {
      const url = `${this.endpoint}/openai/deployments/${this.deployment}/chat/completions?api-version=2024-08-01-preview`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.apiKey,
        },
        body: JSON.stringify({
          messages: chatMessages,
          tools: BOT_TOOLS,
          tool_choice: 'auto',
          temperature: 0,
          max_tokens: 150,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error('[TelegramCognitiveEngine] Error Azure OpenAI Tool Calling:', res.status, errText);
        return null;
      }

      const data = (await res.json()) as any;
      const choice = data.choices?.[0];
      const toolCalls = choice?.message?.tool_calls;

      if (toolCalls && toolCalls.length > 0) {
        const call = toolCalls[0];
        const fnName = call.function?.name;
        let args: any = {};
        try {
          args = JSON.parse(call.function?.arguments || '{}');
        } catch (e) {
          args = {};
        }

        console.log(`[TelegramCognitiveEngine] 🛠️ Tool ejecutada: ${fnName}`, args);

        if (fnName === 'agregar_productos') {
          const items = (args.items || []).map((it: any) => ({
            query: String(it.nombre || ''),
            cantidad: Number(it.cantidad) || 1,
          }));
          return {
            intent: 'AGREGAR_ITEMS',
            confidence: 0.99,
            entities: {
              modalidad: args.modalidad || undefined,
              direccion: args.direccion || undefined,
            },
            itemsParaAgregar: items,
            rawText: textoUsuario,
          };
        }

        if (fnName === 'mostrar_catalogo') {
          return { intent: 'VER_CATALOGO', confidence: 0.99, entities: {}, rawText: textoUsuario };
        }

        if (fnName === 'iniciar_nuevo_pedido') {
          return { intent: 'REINICIAR_PEDIDO', confidence: 0.99, entities: {}, rawText: textoUsuario };
        }

        if (fnName === 'elegir_entrega') {
          if (args.direccion) {
            return {
              intent: 'DAR_DIRECCION',
              confidence: 0.99,
              entities: { direccion: args.direccion, modalidad: 'domicilio' },
              rawText: textoUsuario,
            };
          }
          return {
            intent: 'ELEGIR_MODALIDAD',
            confidence: 0.99,
            entities: { modalidad: args.modalidad || 'domicilio' },
            rawText: textoUsuario,
          };
        }

        if (fnName === 'confirmar_pedido') {
          return { intent: 'CONFIRMAR_PEDIDO', confidence: 0.99, entities: {}, rawText: textoUsuario };
        }

        if (fnName === 'cancelar_pedido') {
          return {
            intent: 'CANCELAR_PEDIDO',
            confidence: 0.99,
            entities: { numeroPedido: args.numero_pedido || undefined },
            rawText: textoUsuario,
          };
        }

        if (fnName === 'consultar_estado_pedidos') {
          return { intent: 'CONSULTA_ESTADO_PEDIDO', confidence: 0.99, entities: {}, rawText: textoUsuario };
        }

        if (fnName === 'modificar_item_carrito') {
          if (args.accion === 'cambiar_cantidad') {
            return {
              intent: 'MODIFICAR_CANTIDAD',
              confidence: 0.99,
              entities: { cantidad: args.nueva_cantidad },
              rawText: textoUsuario,
            };
          }
          if (args.accion === 'eliminar') {
            return {
              intent: 'ELIMINAR_ITEM',
              confidence: 0.99,
              entities: { nombreItem: args.nombre_item },
              rawText: textoUsuario,
            };
          }
          if (args.accion === 'sustituir') {
            return {
              intent: 'SUSTITUIR_ITEM',
              confidence: 0.99,
              entities: { reemplazarItem: args.nombre_item, nuevoItem: args.nuevo_item_sustituto },
              rawText: textoUsuario,
            };
          }
        }

        if (fnName === 'consultar_informacion') {
          if (args.tema === 'costo_envio') {
            return { intent: 'CONSULTA_COSTO_ENVIO', confidence: 0.99, entities: {}, rawText: textoUsuario };
          }
          if (args.tema === 'horario') {
            return { intent: 'CONSULTA_HORARIO', confidence: 0.99, entities: {}, rawText: textoUsuario };
          }
          if (args.tema === 'proceso_pedido') {
            return { intent: 'DUDA_PROCESO_PEDIDO', confidence: 0.99, entities: {}, rawText: textoUsuario };
          }
        }

        if (fnName === 'solicitar_humano') {
          return { intent: 'SOLICITAR_HUMANO', confidence: 0.99, entities: {}, rawText: textoUsuario };
        }
      }

      // Si no llamó a ninguna herramienta de pedidos, es conversación fuera de dominio
      return { intent: 'FUERA_DE_DOMINIO', confidence: 0.95, entities: {}, rawText: textoUsuario };
    } catch (err: any) {
      console.error('[TelegramCognitiveEngine] Excepción llamando a Azure Tool Calling:', err.message);
      return null;
    }
  }
}
