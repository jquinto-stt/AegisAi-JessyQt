const sampleMenu = `
Carta Restaurante El Buen Sabor
Hamburguesas:
1. Hamburguesa Especial - Carne de res 200g, tocineta, queso cheddar, cebolla caramelizada - $ 26.000
2. Hamburguesa Pollo Crispy - Pechuga apanada, salsa tártara, lechuga fresca - $ 22.000
Bebidas:
3. Limonada de Coco - Vaso 16oz refrescante - $ 9.500
4. Cerveza Artesanal IPA - Botella 330ml - $ 12.000
`;

async function test() {
  console.log('Enviando solicitud a http://localhost:8080/pedidos/catalogo/importar-ia...');
  const res = await fetch('http://localhost:8080/pedidos/catalogo/importar-ia', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      textoPlano: sampleMenu,
      fileName: 'carta_ejemplo.txt',
    }),
  });

  const data = await res.json();
  console.log('STATUS:', res.status);
  console.log('RESULTADO:', JSON.stringify(data, null, 2));
}

test().catch(console.error);
