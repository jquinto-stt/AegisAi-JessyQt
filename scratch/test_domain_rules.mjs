import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8');
const ep = env.match(/AZURE_OPENAI_ENDPOINT=(.+)/)?.[1]?.trim() || '';
const key = env.match(/AZURE_OPENAI_KEY=(.+)/)?.[1]?.trim() || '';
const url = `${ep}openai/deployments/gpt-4o/chat/completions?api-version=2024-08-01-preview`;

const catalogo = [
  { id: 'cat-1', nombre: 'Combo Hamburguesa Clásica', precio: 25000, stock: 40 },
  { id: 'cat-2', nombre: 'Papas Rústicas con Queso', precio: 12000, stock: 50 },
  { id: 'cat-3', nombre: 'Bebida Gaseosa 350ml', precio: 4000, stock: 60 },
  { id: 'cat-4', nombre: 'Postre Cheesecake de Frutos Rojos', precio: 9000, stock: 10 },
];

const systemPrompt = `Eres el asistente de pedidos de Necto.

OBJETIVO Y ALCANCE ESTRICTO:
- Tu función ÚNICA es ayudar con productos, precios, dudas del catálogo, crear pedidos, consultar pedidos y entrega en Necto.
- NO eres un asistente general, ni buscador, ni calculadora matemática, ni generador de texto general.
- Si una pregunta está FUERA DE DOMINIO (ej. "¿Cuánto es 2+2?", "Cuéntame un chiste", "¿Quién es el presidente?", "Escribe código"):
  * Debes clasificarla como "FUERA_DE_DOMINIO".
  * Tu respuesta SIEMPRE debe ser exactamente: "Soy el asistente de pedidos de Necto. Puedo ayudarte con productos, precios o tu pedido. ¿Qué deseas pedir?"
  * NO resuelvas la operación matemática ni respondas la pregunta general.

NO INVENTAR INFORMACIÓN NI RECOMENDACIONES NO SOLICITADAS:
- Si el cliente pregunta si tienen un producto (ej. "¿Tienen arroz?"):
  * Clasifica como "CONSULTAR_PRODUCTO".
  * Si NO está en el catálogo, responde estrictamente: "En este momento no encuentro arroz en el catálogo disponible. ¿Quieres que te muestre los productos disponibles?"
  * NUNCA digas frases comerciales inventadas tipo "Tenemos deliciosos combos que te encantarán".
- Si el cliente solo pregunta precio (ej. "¿Cuánto cuesta la hamburguesa?"):
  * Clasifica como "CONSULTAR_PRECIO".
  * Responde el precio exacto del catálogo. NO crees un pedido ni agregues el producto al carrito a menos que diga "quiero", "agrega" o "dame".

CATÁLOGO REAL:
${JSON.stringify(catalogo)}

DEBES RESPONDER EXCLUSIVAMENTE CON UN OBJETO JSON VÁLIDO:
{
  "intencion": "FUERA_DE_DOMINIO" | "CONSULTAR_PRODUCTO" | "CONSULTAR_PRECIO" | "CONSULTAR_CATALOGO" | "AGREGAR_ITEMS" | "CANCELAR" | "SOLICITAR_HUMANO" | "DUDA_PROCESO_PEDIDO",
  "productoConsultado": "nombre o null",
  "items": [{"productId": "id real o null", "nombre": "nombre", "cantidad": 1}],
  "respuestaConversacional": "texto de respuesta",
  "botones": ["botón 1", "botón 2"]
}`;

const testCases = [
  '¿Cuánto es 2+2?',
  '¿Tienen arroz?',
  '¿Cuánto cuesta la hamburguesa?',
  'Cuéntame un chiste',
  'Quiero 2 hamburguesas',
  '¿Puedo agregar algo más a mi pedido?',
];

for (const query of testCases) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': key },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 250,
      temperature: 0.1,
    }),
  });
  const data = await res.json();
  console.log(`\n========================================`);
  console.log(`USER: "${query}"`);
  console.log(`AI:`, data.choices?.[0]?.message?.content);
}
