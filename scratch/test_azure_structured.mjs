import fs from 'fs';

let endpoint = process.env.AZURE_OPENAI_ENDPOINT;
let apiKey = process.env.AZURE_OPENAI_KEY;
let deployment = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o';

if (!apiKey && fs.existsSync('.env')) {
  const env = fs.readFileSync('.env', 'utf8');
  endpoint = endpoint || env.match(/AZURE_OPENAI_ENDPOINT=(.+)/)?.[1]?.trim();
  apiKey = apiKey || env.match(/AZURE_OPENAI_KEY=(.+)/)?.[1]?.trim();
}
endpoint = endpoint || 'https://oai-nectoia-prod-d80b2.openai.azure.com/';

const schema = {
  type: "object",
  properties: {
    intencion: {
      type: "string",
      enum: [
        "SALUDO",
        "VER_CATALOGO",
        "CONSULTAR_PRODUCTO",
        "CONSULTAR_PRECIO",
        "AGREGAR_ITEMS",
        "MODIFICAR_CANTIDAD",
        "ELIMINAR_ITEM",
        "SUSTITUIR_ITEM",
        "PROCEDER_ENTREGA",
        "ELEGIR_MODALIDAD",
        "DAR_DIRECCION",
        "CONFIRMAR_PEDIDO",
        "CANCELAR_PEDIDO",
        "SOLICITAR_HUMANO",
        "CONSULTA_COSTO_ENVIO",
        "CONSULTA_HORARIO",
        "CONSULTA_ESTADO_PEDIDO",
        "FUERA_DE_DOMINIO",
        "DUDA_PROCESO_PEDIDO",
        "DESCONOCIDO"
      ]
    },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          query: { type: "string" },
          cantidad: { type: "integer" }
        },
        "required": ["query", "cantidad"],
        "additionalProperties": false
      }
    },
    modalidad: {
      type: ["string", "null"],
      enum: ["domicilio", "retiro", null]
    },
    direccion: {
      type: ["string", "null"]
    },
    productoConsultado: {
      type: ["string", "null"]
    },
    cantidadModificar: {
      type: ["integer", "null"]
    },
    nombreItemEliminar: {
      type: ["string", "null"]
    },
    itemSustituir: {
      type: ["object", "null"],
      "properties": {
        "quitar": { type: "string" },
        "poner": { type: "string" }
      },
      "required": ["quitar", "poner"],
      "additionalProperties": false
    }
  },
  required: [
    "intencion",
    "items",
    "modalidad",
    "direccion",
    "productoConsultado",
    "cantidadModificar",
    "nombreItemEliminar",
    "itemSustituir"
  ],
  additionalProperties: false
};

async function testText(text) {
  const url = `${endpoint.replace(/\/+$/, '')}/openai/deployments/${deployment}/chat/completions?api-version=2024-08-01-preview`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      messages: [
        {
          role: 'system',
          content: 'Eres un clasificador NLU para un sistema de pedidos. Extrae estrictamente la intención y entidades del usuario según el esquema JSON.'
        },
        {
          role: 'user',
          content: text
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "nlu_extraction",
          strict: true,
          schema
        }
      },
      temperature: 0,
      max_tokens: 250,
    })
  });

  const data = await res.json();
  console.log(`\nInput: "${text}"`);
  console.log('Result:', data.choices?.[0]?.message?.content);
}

async function runAll() {
  await testText('no quiero cancelar, quiero pedir una hamburguesa');
  await testText('cambia la burger por papas rusticas');
  await testText('una hamburguesa sin cebolla');
  await testText('cuanto vale la gaseosa y me dices a como el cheesecake');
}

runAll().catch(console.error);
