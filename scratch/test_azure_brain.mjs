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

const testMessages = [
  '2. Papas Rústicas',
  'No me dejan agregar algo más?',
  'No seas tonto, me refiero a que si puedo agregar algo más a mi pedido ya que no me diste la opción',
  'No, ya no, se me quitaron las ganas de comprar',
  'Olvidalo',
];

for (const msg of testMessages) {
  const prompt = `Eres el cerebro conversacional de ventas para 'Necto' (restaurante en Colombia).
Cliente: Mariana Reyes.
Catálogo disponible: ${JSON.stringify(catalogo)}
Contexto previo: El cliente tiene 1x Papas Rústicas en su carrito si ya ordenó.

Debes responder SIEMPRE en formato JSON válido con la siguiente estructura:
{
  "intencion": "AGREGAR_ITEMS" | "CONSULTAR_MENU" | "MODIFICAR_CARRITO" | "CANCELAR" | "PREGUNTA_DUDA" | "SOLICITAR_HUMANO" | "DEFINIR_ENTREGA" | "CONFIRMAR",
  "items": [{"productId": "id", "cantidad": 1}],
  "respuestaConversacional": "Mensaje en español colombiano amable, empático, natural, sin lenguaje robótico",
  "botones": ["Texto botón 1", "Texto botón 2"]
}`;

  const t0 = Date.now();
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': key },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: msg },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 300,
      temperature: 0.2,
    }),
  });
  const data = await res.json();
  const ms = Date.now() - t0;
  console.log(`\n💬 Input: "${msg}" (${ms}ms)`);
  console.log(data.choices?.[0]?.message?.content);
}
