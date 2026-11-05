const { createClient } = require('../packages/apps/web/modules/app/node_modules/@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Faltan variables de entorno SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const sb = createClient(supabaseUrl, supabaseKey);

const TARGET_ORGS = [
  '8656d4cd-309d-483e-9b74-559ecb4cd5a3', // Organización de JESSY
  'fc009b85-73b8-47b3-8d1a-080b65ac7120', // Necto (base dev)
];

const now = Date.now();
const minutesAgo = (m) => new Date(now - m * 60 * 1000).toISOString();

const CHATS_DATA = [
  // 1. Contacto inicial (Sin pedido - solo consulta de catálogo)
  {
    cliente: 'Juan Carlos Pérez',
    telefono: '+573005551122',
    canal: 'whatsapp',
    estado: 'abierta',
    modo_atencion: 'bot',
    no_leidos: 1,
    hace_min: 4,
    mensajes: [
      { autor: 'cliente', texto: '¡Hola! Buenas tardes, ¿tienen opciones vegetarianas en el menú?', mins: 5 },
      { autor: 'asistente', texto: '¡Hola Juan Carlos! 👋 Sí, tenemos nuestro Bowl Mediterráneo de Quinoa y la Pizza Cuatro Quesos Artesanal. ¿Te gustaría ver el menú completo?', mins: 4 },
      { autor: 'cliente', texto: 'Sí por favor, envíamelo cuando puedas.', mins: 4 },
    ],
  },
  {
    cliente: 'Carlos Mendoza',
    telefono: '+573012223344',
    canal: 'whatsapp',
    estado: 'abierta',
    modo_atencion: 'bot',
    no_leidos: 0,
    hace_min: 15,
    mensajes: [
      { autor: 'cliente', texto: 'Buenas, ¿tienen servicio en el restaurante hoy o solo domicilios?', mins: 20 },
      { autor: 'asistente', texto: '¡Hola Carlos! Atendemos en salón hoy hasta las 10:00 PM y también tenemos domicilios activos. ¿Deseas hacer una reserva o pedir a domicilio?', mins: 18 },
      { autor: 'cliente', texto: 'Perfecto, más tarde paso con mi familia, gracias!', mins: 15 },
    ],
  },

  // 2. Oferta enviada / Pedido programado (Camila Restrepo - PED-101)
  {
    cliente: 'Camila Restrepo',
    telefono: '+573004567890',
    canal: 'whatsapp',
    estado: 'abierta',
    modo_atencion: 'bot',
    no_leidos: 0,
    hace_min: 25,
    mensajes: [
      { autor: 'cliente', texto: 'Hola, necesito agendar un pedido de 2 Bandejas Paisa para las 3:00 PM en El Poblado.', mins: 35 },
      { autor: 'asistente', texto: '¡Con gusto Camila! Tenemos registrada tu orden PED-101 programada para las 3:00 PM en Cl. 10 # 43E-12. El total con jugos es de $91.000.', mins: 30 },
      { autor: 'cliente', texto: 'Ya hice la transferencia por Bancolombia.', mins: 27 },
      { autor: 'asistente', texto: '¡Pago validado exitosamente! El pedido quedó agendado en cocina.', mins: 25 },
    ],
  },
  {
    cliente: 'Valeria Gómez',
    telefono: '+573206789012',
    canal: 'whatsapp',
    estado: 'abierta',
    modo_atencion: 'humano',
    no_leidos: 0,
    hace_min: 40,
    mensajes: [
      { autor: 'cliente', texto: 'Buenas tardes, quisiera cotizar 3 pizzas familiares para una reunión a las 7 PM.', mins: 55 },
      { autor: 'asistente', texto: '¡Hola Valeria! Conectando con un asesor para armar el paquete de pizzas familiares...', mins: 53 },
      { autor: 'negocio', texto: 'Hola Valeria, te atiende Mateo. Te dejé la Pizza Cuatro Quesos y dos adicionales con descuento por combo en $120.000.', mins: 45 },
      { autor: 'cliente', texto: 'Excelente propuesta Mateo, ya te confirmo.', mins: 40 },
    ],
  },

  // 3. Seguimiento comercial / En espera de humano (pendiente)
  {
    cliente: 'Mateo Cárdenas',
    telefono: '+573012345678',
    canal: 'whatsapp',
    estado: 'pendiente',
    modo_atencion: 'humano',
    no_leidos: 2,
    hace_min: 8,
    mensajes: [
      { autor: 'cliente', texto: 'Hola, quise pagar por el link pero me salió error en la pasarela.', mins: 12 },
      { autor: 'cliente', texto: '¿Me pueden pasar el número de cuenta de Nequi o Bancolombia directo?', mins: 8 },
    ],
  },
  {
    cliente: 'Sofía Morales',
    telefono: '+573041239876',
    canal: 'whatsapp',
    estado: 'pendiente',
    modo_atencion: 'humano',
    no_leidos: 1,
    hace_min: 14,
    mensajes: [
      { autor: 'cliente', texto: 'Buenas tardes, necesito saber si emiten factura electrónica para empresa con NIT.', mins: 14 },
    ],
  },

  // 4. Validación de pago (Transferencias pendientes de validar)
  {
    cliente: 'Juliana Pineda',
    telefono: '+573026789012',
    canal: 'whatsapp',
    estado: 'abierta',
    modo_atencion: 'bot',
    no_leidos: 1,
    hace_min: 10,
    mensajes: [
      { autor: 'cliente', texto: 'Hola, ya les envié el comprobante de la transferencia por $86.000 del pedido de Ramen y Gyozas.', mins: 12 },
      { autor: 'cliente', texto: 'Por favor me confirman si ya lo revisaron para que entre a cocina 🙏', mins: 10 },
    ],
  },
  {
    cliente: 'Daniela Salazar',
    telefono: '+573113456789',
    canal: 'whatsapp',
    estado: 'abierta',
    modo_atencion: 'bot',
    no_leidos: 0,
    hace_min: 18,
    mensajes: [
      { autor: 'cliente', texto: 'Hola, acabo de pagar por Nequi los $36.000 del Bowl de Pollo Teriyaki.', mins: 22 },
      { autor: 'asistente', texto: '¡Recibido Daniela! El equipo de caja ya tiene tu comprobante y está validándolo en sistema.', mins: 18 },
    ],
  },

  // 5. En Cierre (Pedidos confirmados o en preparación con chat activo)
  {
    cliente: 'Felipe Henao',
    telefono: '+573137890123',
    canal: 'whatsapp',
    estado: 'abierta',
    modo_atencion: 'humano',
    no_leidos: 0,
    hace_min: 22,
    mensajes: [
      { autor: 'cliente', texto: '¿En cuánto tiempo más o menos estaría listo mi pedido para retirar?', mins: 30 },
      { autor: 'negocio', texto: 'Hola Felipe, tus Burritos y Limonadas están en plancha ahora mismo. En 15 minutos exactos los tienes en el punto de Laureles.', mins: 25 },
      { autor: 'cliente', texto: '¡De una! Voy saliendo para allá.', mins: 22 },
    ],
  },
  {
    cliente: 'Alejandro Quintero',
    telefono: '+573169012345',
    canal: 'telegram',
    estado: 'abierta',
    modo_atencion: 'humano',
    no_leidos: 0,
    hace_min: 12,
    mensajes: [
      { autor: 'cliente', texto: 'Hola, estamos en la Mesa 8. ¿Nos pueden mandar cubiertos extra y chimichurri?', mins: 16 },
      { autor: 'negocio', texto: 'Enseguida va el mesero con los cubiertos y salsas adicionales a la mesa 8, señor Alejandro.', mins: 14 },
      { autor: 'cliente', texto: 'Muchas gracias por la rápida atención.', mins: 12 },
    ],
  },
  {
    cliente: 'Mariana Duque',
    telefono: '+573256789012',
    canal: 'whatsapp',
    estado: 'abierta',
    modo_atencion: 'bot',
    no_leidos: 0,
    hace_min: 8,
    mensajes: [
      { autor: 'asistente', texto: '🛵 ¡Tu pedido PED-118 de Pizza Pepperoni va en camino! Repartidor: Diego R.', mins: 15 },
      { autor: 'cliente', texto: 'Super, avísale por favor que timbre en el apto 402 cuando llegue.', mins: 10 },
      { autor: 'asistente', texto: 'Indicación añadida para el mensajero: timbrar en apto 402 al llegar.', mins: 8 },
    ],
  },
  {
    cliente: 'Cristian Rendón',
    telefono: '+573267890123',
    canal: 'whatsapp',
    estado: 'abierta',
    modo_atencion: 'bot',
    no_leidos: 0,
    hace_min: 11,
    mensajes: [
      { autor: 'asistente', texto: '🛵 Tu pedido PED-119 de Tacos Birria ya fue despachado. Repartidor: Javier L. Modalidad: Contra entrega ($60.000).', mins: 18 },
      { autor: 'cliente', texto: 'Entendido, tengo el efectivo listo en recepción.', mins: 11 },
    ],
  },

  // 6. Resueltos y entregados (Cerrados - resuelta)
  {
    cliente: 'Clara Tamayo',
    telefono: '+573290123456',
    canal: 'whatsapp',
    estado: 'resuelta',
    modo_atencion: 'bot',
    no_leidos: 0,
    hace_min: 60,
    mensajes: [
      { autor: 'asistente', texto: 'Tu pedido PED-122 ha sido entregado con éxito. ¡Buen provecho!', mins: 75 },
      { autor: 'cliente', texto: '¡Muchas gracias! Ya llegó todo calientito y delicioso. 10/10.', mins: 65 },
      { autor: 'asistente', texto: '¡Qué alegría saberlo Clara! Gracias por tu preferencia. Estaremos felices de atenderte pronto.', mins: 60 },
    ],
  },
  {
    cliente: 'Guillermo Ospina',
    telefono: '+573301234567',
    canal: 'whatsapp',
    estado: 'resuelta',
    modo_atencion: 'bot',
    no_leidos: 0,
    hace_min: 110,
    mensajes: [
      { autor: 'asistente', texto: 'Tu pedido PED-123 de hamburguesas Smash está listo para retiro en el local.', mins: 130 },
      { autor: 'cliente', texto: 'Ya lo recogí en caja, todo excelente.', mins: 115 },
      { autor: 'asistente', texto: '¡Gracias Guillermo! Feliz día.', mins: 110 },
    ],
  },
  {
    cliente: 'Elena Forero',
    telefono: '+573356789012',
    canal: 'whatsapp',
    estado: 'resuelta',
    modo_atencion: 'humano',
    no_leidos: 0,
    hace_min: 180,
    mensajes: [
      { autor: 'cliente', texto: 'Hola, disculpen, se me presentó un inconveniente y debo cancelar la pizza de retiro.', mins: 210 },
      { autor: 'negocio', texto: 'Comprendemos Elena, no hay problema, cancelamos la comanda antes de entrar al horno. ¡Esperamos verte en otra ocasión!', mins: 190 },
      { autor: 'cliente', texto: 'Muy amables por entender, mil gracias.', mins: 180 },
    ],
  },
];

async function main() {
  console.log('--- Creando contactos, conversaciones y mensajes en Supabase ---');

  for (const orgId of TARGET_ORGS) {
    console.log(`Poblando datos para organización: ${orgId}...`);

    for (const chat of CHATS_DATA) {
      // 1. Contacto
      let { data: contacto } = await sb
        .schema('necto')
        .from('contacto')
        .select('id')
        .eq('organizacion_id', orgId)
        .eq('telefono', chat.telefono)
        .maybeSingle();

      if (!contacto) {
        const { data: nuevoCont, error: errCont } = await sb
          .schema('necto')
          .from('contacto')
          .insert({
            organizacion_id: orgId,
            telefono: chat.telefono,
            nombre: chat.cliente,
            origen: chat.canal,
          })
          .select('id')
          .single();

        if (errCont) {
          console.warn(`Error en contacto ${chat.cliente}:`, errCont.message);
          continue;
        }
        contacto = nuevoCont;
      }

      // 2. Insert o buscar conversacion
      const { data: convExistente } = await sb
        .schema('necto')
        .from('conversacion')
        .select('id')
        .eq('organizacion_id', orgId)
        .eq('contacto_id', contacto.id)
        .maybeSingle();

      let convId = convExistente?.id;
      const actIso = minutesAgo(chat.hace_min);

      if (!convId) {
        const { data: nuevaConv, error: errConv } = await sb
          .schema('necto')
          .from('conversacion')
          .insert({
            organizacion_id: orgId,
            contacto_id: contacto.id,
            canal: chat.canal,
            estado: chat.estado,
            modo_atencion: chat.modo_atencion,
            modulo_destino: 'pedidos',
            no_leidos: chat.no_leidos,
            creada_en: minutesAgo(chat.hace_min + 60),
            actualizada_en: actIso,
            ia_activa: chat.modo_atencion === 'bot',
          })
          .select('id')
          .single();

        if (errConv) {
          console.warn(`Error en conversacion ${chat.cliente}:`, errConv.message);
          continue;
        }
        convId = nuevaConv.id;
      } else {
        await sb
          .schema('necto')
          .from('conversacion')
          .update({
            estado: chat.estado,
            modo_atencion: chat.modo_atencion,
            no_leidos: chat.no_leidos,
            actualizada_en: actIso,
            ia_activa: chat.modo_atencion === 'bot',
          })
          .eq('id', convId);
      }

      // 3. Mensajes
      await sb.schema('necto').from('mensaje').delete().eq('conversacion_id', convId);

      const mensajesAInsertar = chat.mensajes.map((m) => ({
        conversacion_id: convId,
        autor: m.autor,
        contenido: {
          texto: m.texto,
          plataforma: chat.canal,
        },
        enviado_en: minutesAgo(m.mins),
      }));

      const { error: errMsgs } = await sb.schema('necto').from('mensaje').insert(mensajesAInsertar);
      if (errMsgs) {
        console.warn(`Error en mensajes para ${chat.cliente}:`, errMsgs.message);
      }
    }
  }

  console.log('✅ Conversaciones y mensajes creados exitosamente!');
}

main().catch((err) => {
  console.error('Error fatal:', err);
  process.exit(1);
});
