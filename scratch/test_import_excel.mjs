import * as XLSX from 'xlsx';

const data = [
  { 'Producto': 'Pizza Cuatro Quesos Familiar', 'Sección': 'Pizzas', 'Detalles': 'Mozzarella, parmesano, gorgonzola y provolone', 'Precio COP': '48.000' },
  { 'Producto': 'Pizza Pepperoni Mediana', 'Sección': 'Pizzas', 'Detalles': 'Doble pepperoni americano con orégano fresco', 'Precio COP': '36.500' },
  { 'Producto': 'Papas Rústicas Trufadas', 'Sección': 'Entradas', 'Detalles': 'Con sal marina y aceite de trufa', 'Precio COP': '16.000' },
  { 'Producto': 'Tiramisú Tradicional', 'Sección': 'Postres', 'Detalles': 'Bizcochos de soletilla con café y mascarpone', 'Precio COP': '14.000' },
];

const ws = XLSX.utils.json_to_sheet(data);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'MenuPizzeria');
const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
const base64 = buf.toString('base64');

async function testExcel() {
  console.log('Probando envío de Excel en Base64...');
  const res = await fetch('http://localhost:8080/pedidos/catalogo/importar-ia', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileBase64: base64,
      fileName: 'lista_precios_pizzeria.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    }),
  });

  const json = await res.json();
  console.log('STATUS EXCEL:', res.status);
  console.log('PRODUCTOS EXTRAÍDOS DE EXCEL:', JSON.stringify(json, null, 2));
}

testExcel().catch(console.error);
