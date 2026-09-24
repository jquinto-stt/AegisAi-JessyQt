const { decidir } = require('../packages/services/api/modules/service/dist/services/BotPedidos.js');
const { parsearMensaje, extraerDireccion, resolverMultiplesItems } = require('../packages/services/api/modules/service/dist/services/BotParser.js');

const catalogo = [
  { id: 'c1', nombre: 'Combo Hamburguesa Clásica', precio: 25000 },
  { id: 'c2', nombre: 'Papas Rústicas con Queso', precio: 12000 },
  { id: 'c3', nombre: 'Bebida Gaseosa 350ml', precio: 4000 },
  { id: 'c4', nombre: 'Postre Cheesecake de Frutos Rojos', precio: 9000 }
];

let borrador = null;
let estadoFlujo = 'IDLE';
let catalogoMostrado = false;

function step(userText) {
  console.log('\n--- USUARIO: "' + userText + '" ---');
  console.log('Estado previo: estadoFlujo=' + estadoFlujo + ', borrador=' + (borrador ? JSON.stringify({ paso: borrador.paso, lineas: borrador.lineas.map(l => `${l.cantidad}x ${l.nombre}`), direccion: borrador.direccion }) : 'null'));

  const decision = decidir({
    texto: userText,
    pedidos: [],
    plantillas: null,
    perfil: 'food',
    frases: null,
    catalogo,
    enCurso: borrador,
    estadoFlujo,
    catalogoMostrado,
    direccionPrevia: null
  });

  borrador = decision.borrador;
  estadoFlujo = decision.estadoFlujo;
  catalogoMostrado = decision.catalogoMostrado;

  console.log('Bot acción:', decision.accion, '| intent:', decision.intent, '| estadoFlujo:', decision.estadoFlujo);
  console.log('Bot borrador:', borrador ? JSON.stringify({ paso: borrador.paso, lineas: borrador.lineas.map(l => `${l.cantidad}x ${l.nombre}`), direccion: borrador.direccion, total: borrador.lineas.reduce((a, b) => a + b.precioUnitario * b.cantidad, 0) }) : 'null');
  console.log('Bot texto:\n' + decision.texto);
}

step('Hola');
step('Muéstrame el menú por favor');
step('Quiero el 3 y 4 dos porciones cada una');
step('Mi dirección CLL 21 N 22-43');
step('Sí');
