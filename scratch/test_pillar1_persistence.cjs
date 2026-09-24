const path = require('path');
const fs = require('fs');
const { createClient } = require(path.resolve('packages/services/api/node_modules/@supabase/supabase-js'));

const envPath = path.resolve('packages/services/api/modules/service/.env.local');
const env = fs.readFileSync(envPath, 'utf8');
const url = env.match(/SUPABASE_URL=([^\r\n]+)/)[1];
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=([^\r\n]+)/)[1];
const sb = createClient(url, key);

async function runTest() {
  console.log('=== TEST SUITE: PILAR 1 - PERSISTENCIA Y MÁQUINA DE ESTADO ===\n');

  // Dynamic import of BotPedidos and BotPedidosDAO
  const { decidir, borradorNuevo } = await import('../packages/services/api/modules/service/dist/services/BotPedidos.js');
  const { leerConversacion, guardarEstadoConversacion, crearPedido } = await import('../packages/services/api/modules/service/dist/services/BotPedidosDAO.js');

  const orgId = 'fc009b85-73b8-47b3-8d1a-080b65ac7120';
  const catalogo = [
    { id: 'cat-f1', nombre: 'Combo Hamburguesa Clásica', precio: 25000 },
    { id: 'cat-f2', nombre: 'Papas Rústicas con Queso', precio: 12000 },
    { id: 'cat-f3', nombre: 'Bebida Gaseosa 350ml', precio: 4000 },
    { id: 'cat-f4', nombre: 'Postre Cheesecake de Frutos Rojos', precio: 9000 }
  ];

  // 1. Obtener o crear conversación de prueba
  const { data: convData, error: errConv } = await sb
    .schema('necto')
    .from('conversacion')
    .select('id, estado_respuesta')
    .eq('organizacion_id', orgId)
    .limit(1)
    .maybeSingle();

  if (errConv || !convData) {
    console.error('No se encontró conversación de prueba:', errConv);
    process.exit(1);
  }

  const conversacionId = convData.id;
  console.log(`[Conversación Test]: ${conversacionId}`);

  // Limpiar estado previo para iniciar test
  await guardarEstadoConversacion(sb, conversacionId, {
    enCurso: null,
    estado_flujo: 'IDLE',
    catalogo_mostrado: false,
    ultimo_intent: null,
    ultimo_pedido_id: null,
    intencion_pendiente: null,
  });

  let lectura = await leerConversacion(sb, conversacionId);
  console.log(`Estado Inicial: estadoFlujo=${lectura.estadoFlujo}, enCurso=${JSON.stringify(lectura.enCurso)}`);

  const turnos = [
    {
      mensaje: 'Hola, buenas tardes',
      esperaFlujo: 'IDLE',
      esperaIntent: 'saludo',
      esperaItems: 0,
      desc: 'Turno 1: Saludo inicial'
    },
    {
      mensaje: 'Muéstrame el menú',
      esperaFlujo: 'CATALOGO_ACTIVO',
      esperaIntent: 'ver_catalogo',
      esperaItems: 0,
      desc: 'Turno 2: Ver catálogo'
    },
    {
      mensaje: 'Quiero 2 combo hamburguesa clasica',
      esperaFlujo: 'CARRITO_EN_CONSTRUCCION',
      esperaIntent: 'agregar_producto',
      esperaItems: 1,
      desc: 'Turno 3: Agregar 2 hamburguesas'
    },
    {
      mensaje: '¿Cuánto cuesta el domicilio?',
      esperaFlujo: 'CARRITO_EN_CONSTRUCCION',
      esperaIntent: 'consulta_intermedia',
      esperaItems: 1, // EL CARRITO DEBE SOBREVIVIR INTACTO
      desc: 'Turno 4: Pregunta intermedia de domicilio (¡NO DEBE BORRAR EL CARRITO!)'
    },
    {
      mensaje: 'Agrega también unas papas rusticas',
      esperaFlujo: 'CARRITO_EN_CONSTRUCCION',
      esperaIntent: 'agregar_producto',
      esperaItems: 2, // 2 ítems en carrito (hamburguesas + papas)
      desc: 'Turno 5: Agregar papas rústicas al carrito existente'
    },
    {
      mensaje: 'No, mejor quita las papas, no las quiero',
      esperaFlujo: 'CARRITO_EN_CONSTRUCCION',
      esperaIntent: 'eliminar_producto',
      esperaItems: 1, // Vuelve a tener solo hamburguesas
      desc: 'Turno 6: Eliminar producto del carrito'
    },
    {
      mensaje: 'Cambia la cantidad a 3 hamburguesas',
      esperaFlujo: 'CARRITO_EN_CONSTRUCCION',
      esperaIntent: 'corregir_cantidad',
      esperaItems: 1,
      esperaCantidadItem: 3,
      desc: 'Turno 7: Corregir cantidad a 3'
    },
    {
      mensaje: '¿Dónde está mi pedido anterior?',
      esperaFlujo: 'CARRITO_EN_CONSTRUCCION',
      esperaIntent: 'consultar_pedido_existente',
      esperaItems: 1, // Carrito sobrevive intacto
      desc: 'Turno 8: Consulta de pedido anterior en medio del carrito'
    },
    {
      mensaje: 'Quiero hacer el pedido a domicilio',
      esperaFlujo: 'SOLICITANDO_ENTREGA',
      esperaItems: 1,
      desc: 'Turno 9: Solicitar entrega / modalidad domicilio'
    },
    {
      mensaje: 'Calle 100 # 15-20 apto 301',
      esperaFlujo: 'CONFIRMANDO_PEDIDO',
      esperaItems: 1,
      desc: 'Turno 10: Ingresar dirección y pasar a confirmación'
    }
  ];

  let fallas = 0;

  for (const t of turnos) {
    console.log(`\n--- ${t.desc} ---`);
    console.log(`> Usuario: "${t.mensaje}"`);

    // 1. Leer estado actual
    lectura = await leerConversacion(sb, conversacionId);

    // 2. Decidir determinísticamente
    const decision = decidir({
      texto: t.mensaje,
      pedidos: [{ id: 'ped-prev', numero: 'WEB-0001', estado: 'nuevo' }],
      plantillas: {},
      perfil: 'food',
      frases: {},
      catalogo,
      enCurso: lectura?.enCurso ?? null,
      estadoFlujo: lectura?.estadoFlujo ?? 'IDLE',
      catalogoMostrado: lectura?.catalogoMostrado ?? false,
    });

    // 3. Resolver estado final (simulando DAO sin sobreescritura de IA)
    let borradorFinal = decision.borrador !== undefined ? decision.borrador : (lectura?.enCurso ?? null);
    let estadoFlujoFinal = decision.estadoFlujo;

    // 4. Persistir a base de datos
    await guardarEstadoConversacion(sb, conversacionId, {
      enCurso: borradorFinal,
      estado_flujo: estadoFlujoFinal,
      catalogo_mostrado: Boolean(decision.catalogoMostrado || lectura?.catalogoMostrado),
      ultimo_intent: decision.intent ?? decision.motivo ?? 'desconocido',
      ultimo_pedido_id: lectura?.ultimoPedidoId ?? null,
      intencion_pendiente: decision.intencionPendiente ?? null,
    });

    // 5. Re-leer de DB para comprobar persistencia real
    const postLectura = await leerConversacion(sb, conversacionId);

    console.log(`  Respuesta Bot: "${decision.texto.split('\n')[0].slice(0, 60)}..."`);
    console.log(`  Intent calculado: ${decision.intent}`);
    console.log(`  Estado DB: ${postLectura.estadoFlujo}`);
    console.log(`  Ítems en Carrito en DB: ${postLectura.enCurso?.lineas?.length ?? 0}`);
    if (postLectura.enCurso?.lineas?.length > 0) {
      console.log(`  Desglose: ${postLectura.enCurso.lineas.map(l => `${l.cantidad}x ${l.nombre}`).join(', ')}`);
    }

    // Aserciones
    let ok = true;
    if (t.esperaFlujo && postLectura.estadoFlujo !== t.esperaFlujo) {
      console.error(`  ❌ ERROR FLUJO: Esperado ${t.esperaFlujo}, pero DB tiene ${postLectura.estadoFlujo}`);
      ok = false;
    }
    if (t.esperaIntent && decision.intent !== t.esperaIntent) {
      console.error(`  ❌ ERROR INTENT: Esperado ${t.esperaIntent}, pero se calculó ${decision.intent}`);
      ok = false;
    }
    if (t.esperaItems !== undefined && (postLectura.enCurso?.lineas?.length ?? 0) !== t.esperaItems) {
      console.error(`  ❌ ERROR ÍTEMS: Esperado ${t.esperaItems} ítems, pero DB tiene ${postLectura.enCurso?.lineas?.length ?? 0}`);
      ok = false;
    }
    if (t.esperaCantidadItem !== undefined && postLectura.enCurso?.lineas?.[0]?.cantidad !== t.esperaCantidadItem) {
      console.error(`  ❌ ERROR CANTIDAD: Esperado ${t.esperaCantidadItem}, pero DB tiene ${postLectura.enCurso?.lineas?.[0]?.cantidad}`);
      ok = false;
    }

    if (ok) {
      console.log(`  ✅ PASÓ`);
    } else {
      fallas++;
    }
  }

  // Turno final: Confirmación y creación de pedido
  console.log(`\n--- Turno 11: Confirmar pedido final ---`);
  console.log(`> Usuario: "Confirmar pedido"`);
  lectura = await leerConversacion(sb, conversacionId);
  const decisionFinal = decidir({
    texto: 'Confirmar pedido',
    pedidos: [],
    plantillas: {},
    perfil: 'food',
    frases: {},
    catalogo,
    enCurso: lectura?.enCurso ?? null,
    estadoFlujo: lectura?.estadoFlujo,
    catalogoMostrado: lectura?.catalogoMostrado,
  });

  console.log(`  Acción: ${decisionFinal.accion}`);
  if (decisionFinal.accion === 'crearPedido') {
    const creado = await crearPedido(sb, {
      organizacionId: orgId,
      telefono: '573145376069',
      cliente: 'quinto jessy test',
      borrador: decisionFinal.borrador,
    });
    console.log(`  Pedido Creado en DB: ${creado.ok ? creado.numero : 'ERROR: ' + creado.error}`);

    // Limpiar borrador tras creación exitosa
    await guardarEstadoConversacion(sb, conversacionId, {
      enCurso: null,
      estado_flujo: 'PEDIDO_CREADO',
      catalogo_mostrado: true,
      ultimo_intent: 'confirmar_pedido',
      ultimo_pedido_id: creado.numero,
    });

    const lecturaFinal = await leerConversacion(sb, conversacionId);
    console.log(`  Estado Final DB: estadoFlujo=${lecturaFinal.estadoFlujo}, enCurso=${lecturaFinal.enCurso}, ultimoPedidoId=${lecturaFinal.ultimoPedidoId}`);

    if (creado.ok && lecturaFinal.estadoFlujo === 'PEDIDO_CREADO' && lecturaFinal.enCurso === null) {
      console.log(`  ✅ PASÓ: Pedido creado, borrador limpiado y flujo completado.`);
    } else {
      console.error(`  ❌ ERROR al crear pedido final`);
      fallas++;
    }
  } else {
    console.error(`  ❌ ERROR: La acción no fue crearPedido, fue ${decisionFinal.accion}`);
    fallas++;
  }

  console.log(`\n========================================`);
  if (fallas === 0) {
    console.log(`🎉 TODOS LOS TESTS DEL PILAR 1 PASARON SATISFACTORIAMENTE (0 fallas).`);
  } else {
    console.log(`⚠️ SE ENCONTRARON ${fallas} FALLAS EN EL TEST.`);
    process.exit(1);
  }
}

runTest().catch(err => {
  console.error('Excepción general en el test:', err);
  process.exit(1);
});
