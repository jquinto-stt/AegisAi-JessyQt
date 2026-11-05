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
const hoursAhead = (h) => new Date(now + h * 3600 * 1000).toISOString();

const SAMPLE_ORDERS = [
  // --- PROGRAMADOS (3) ---
  {
    code: '101',
    cliente: 'Camila Restrepo',
    telefono: '+573004567890',
    modalidad: 'domicilio',
    origen: 'whatsapp',
    estado: 'programado',
    programado_para: hoursAhead(3),
    pagado: true,
    metodo_pago: 'transferencia',
    direccion_entrega: { texto: 'Cl. 10 # 43E-12, Poblado', calle: 'Cl. 10 # 43E-12', barrio: 'El Poblado', referencia: 'Apto 601 Torre B' },
    items: [
      { product_id: 'prod-01', nombre: 'Bandeja Paisa Gourmet', cantidad: 2, precio_unitario: 38000 },
      { product_id: 'prod-02', nombre: 'Jugo Natural de Maracuyá', cantidad: 2, precio_unitario: 7500 },
    ],
  },
  {
    code: '102',
    cliente: 'Esteban Morales',
    telefono: '+573105678901',
    modalidad: 'retiro',
    origen: 'operador',
    estado: 'programado',
    programado_para: hoursAhead(5),
    pagado: false,
    metodo_pago: 'efectivo',
    pago_con: 100000,
    items: [
      { product_id: 'prod-03', nombre: 'Ceviche Mixto Peruano', cantidad: 2, precio_unitario: 42000 },
      { product_id: 'prod-04', nombre: 'Porción Tostones con Hogao', cantidad: 1, precio_unitario: 12000 },
    ],
  },
  {
    code: '103',
    cliente: 'Valeria Gómez',
    telefono: '+573206789012',
    modalidad: 'domicilio',
    origen: 'whatsapp',
    estado: 'programado',
    programado_para: hoursAhead(6),
    pagado: true,
    metodo_pago: 'tarjeta',
    direccion_entrega: { texto: 'Cra. 70 # 32B-50, Laureles', calle: 'Cra. 70 # 32B-50', barrio: 'Laureles' },
    items: [
      { product_id: 'prod-05', nombre: 'Pizza Cuatro Quesos Grande', cantidad: 1, precio_unitario: 48000 },
      { product_id: 'prod-06', nombre: 'Gaseosa 1.5L', cantidad: 1, precio_unitario: 8000 },
    ],
  },

  // --- NUEVOS (4) ---
  {
    code: '104',
    cliente: 'Mateo Cárdenas',
    telefono: '+573012345678',
    modalidad: 'domicilio',
    origen: 'whatsapp',
    estado: 'nuevo',
    pagado: false,
    metodo_pago: 'efectivo',
    pago_con: 70000,
    direccion_entrega: { texto: 'Av. Nutibara # 73-10, Laureles', calle: 'Av. Nutibara # 73-10', barrio: 'Laureles', referencia: 'Oficina 302' },
    items: [
      { product_id: 'prod-07', nombre: 'Hamburguesa Doble Angus BBQ', cantidad: 2, precio_unitario: 29000 },
      { product_id: 'prod-08', nombre: 'Papas Rústicas Trufadas', cantidad: 1, precio_unitario: 14000 },
    ],
  },
  {
    code: '105',
    cliente: 'Daniela Salazar',
    telefono: '+573113456789',
    modalidad: 'retiro',
    origen: 'whatsapp',
    estado: 'nuevo',
    pagado: true,
    metodo_pago: 'transferencia',
    items: [
      { product_id: 'prod-09', nombre: 'Bowl de Pollo Teriyaki & Quinoa', cantidad: 1, precio_unitario: 27000 },
      { product_id: 'prod-10', nombre: 'Té Helado Matcha Limón', cantidad: 1, precio_unitario: 9000 },
    ],
  },
  {
    code: '106',
    cliente: 'Santiago Arango',
    telefono: '+573154567890',
    modalidad: 'domicilio',
    origen: 'operador',
    estado: 'nuevo',
    pagado: false,
    metodo_pago: 'efectivo',
    pago_con: 50000,
    direccion_entrega: { texto: 'Cra 43A # 19A-40, Envigado', calle: 'Cra 43A # 19A-40', barrio: 'Envigado', referencia: 'Portería frente al Oxxo' },
    items: [
      { product_id: 'prod-11', nombre: 'Costillas BBQ San Luis (500g)', cantidad: 1, precio_unitario: 39000 },
      { product_id: 'prod-12', nombre: 'Cerveza Club Colombia Dorada', cantidad: 2, precio_unitario: 6500 },
    ],
  },
  {
    code: '107',
    cliente: 'Carolina Méndez',
    telefono: '+573185678901',
    modalidad: 'mesa',
    origen: 'operador',
    estado: 'nuevo',
    pagado: false,
    metodo_pago: 'tarjeta',
    direccion_entrega: { texto: 'Mesa 4 - Terraza', indicaciones: 'Mesa 4' },
    items: [
      { product_id: 'prod-13', nombre: 'Nachos Supremos con Guacamole', cantidad: 1, precio_unitario: 26000 },
      { product_id: 'prod-14', nombre: 'Margarita Clásica', cantidad: 2, precio_unitario: 24000 },
    ],
  },

  // --- CONFIRMADOS (3) ---
  {
    code: '108',
    cliente: 'Juliana Pineda',
    telefono: '+573026789012',
    modalidad: 'domicilio',
    origen: 'whatsapp',
    estado: 'confirmado',
    pagado: true,
    metodo_pago: 'transferencia',
    direccion_entrega: { texto: 'Calle 14 # 30-112, Las Lomas', calle: 'Calle 14 # 30-112', barrio: 'Poblado' },
    items: [
      { product_id: 'prod-15', nombre: 'Ramen Tonkotsu Tradicional', cantidad: 2, precio_unitario: 34000 },
      { product_id: 'prod-16', nombre: 'Gyozas de Cerdo y Col (6 uds)', cantidad: 1, precio_unitario: 18000 },
    ],
  },
  {
    code: '109',
    cliente: 'Felipe Henao',
    telefono: '+573137890123',
    modalidad: 'retiro',
    origen: 'whatsapp',
    estado: 'confirmado',
    pagado: false,
    metodo_pago: 'efectivo',
    items: [
      { product_id: 'prod-17', nombre: 'Burrito Tex-Mex Res Desmechada', cantidad: 2, precio_unitario: 25000 },
      { product_id: 'prod-18', nombre: 'Limonada de Coco', cantidad: 2, precio_unitario: 8500 },
    ],
  },
  {
    code: '110',
    cliente: 'Diana Bustamante',
    telefono: '+573148901234',
    modalidad: 'domicilio',
    origen: 'operador',
    estado: 'confirmado',
    pagado: true,
    metodo_pago: 'tarjeta',
    direccion_entrega: { texto: 'Transversal 39 # 74-88, Belén', calle: 'Transversal 39 # 74-88', barrio: 'Belén' },
    items: [
      { product_id: 'prod-19', nombre: 'Sushi Combo Roll (20 piezas)', cantidad: 1, precio_unitario: 52000 },
      { product_id: 'prod-20', nombre: 'Kushiages de Queso Manchego', cantidad: 1, precio_unitario: 16000 },
    ],
  },

  // --- EN PREPARACIÓN (4) ---
  {
    code: '111',
    cliente: 'Alejandro Quintero',
    telefono: '+573169012345',
    modalidad: 'mesa',
    origen: 'operador',
    estado: 'en_preparacion',
    pagado: false,
    metodo_pago: 'tarjeta',
    direccion_entrega: { texto: 'Mesa 8 - Interior', indicaciones: 'Mesa 8' },
    items: [
      { product_id: 'prod-21', nombre: 'Ojo de Bife 400g Angus', cantidad: 1, precio_unitario: 58000 },
      { product_id: 'prod-22', nombre: 'Puré de Papa Gratinado', cantidad: 1, precio_unitario: 13000 },
      { product_id: 'prod-23', nombre: 'Copa Malbec Reserva', cantidad: 2, precio_unitario: 22000 },
    ],
  },
  {
    code: '112',
    cliente: 'Natalia Villegas',
    telefono: '+573170123456',
    modalidad: 'domicilio',
    origen: 'whatsapp',
    estado: 'en_preparacion',
    pagado: true,
    metodo_pago: 'transferencia',
    direccion_entrega: { texto: 'Circular 2 # 70-34, San Joaquín', calle: 'Circular 2 # 70-34', barrio: 'Laureles' },
    items: [
      { product_id: 'prod-24', nombre: 'Pizza Napolitana Prosciutto', cantidad: 1, precio_unitario: 44000 },
      { product_id: 'prod-25', nombre: 'Tiramisú Clásico Italiano', cantidad: 2, precio_unitario: 15000 },
    ],
  },
  {
    code: '113',
    cliente: 'Gabriel Echeverry',
    telefono: '+573191234567',
    modalidad: 'retiro',
    origen: 'whatsapp',
    estado: 'en_preparacion',
    pagado: true,
    metodo_pago: 'tarjeta',
    items: [
      { product_id: 'prod-26', nombre: 'Pollo Crispy Apanado (8 presas)', cantidad: 1, precio_unitario: 36000 },
      { product_id: 'prod-27', nombre: 'Papas en Cascos con Dip de Ajo', cantidad: 2, precio_unitario: 9500 },
    ],
  },
  {
    code: '114',
    cliente: 'Isabella Montoya',
    telefono: '+573212345678',
    modalidad: 'domicilio',
    origen: 'whatsapp',
    estado: 'en_preparacion',
    pagado: false,
    metodo_pago: 'efectivo',
    pago_con: 60000,
    direccion_entrega: { texto: 'Calle 5 Sur # 43A-20, Poblado', calle: 'Calle 5 Sur # 43A-20', barrio: 'Poblado' },
    items: [
      { product_id: 'prod-28', nombre: 'Pad Thai con Langostinos', cantidad: 1, precio_unitario: 41000 },
      { product_id: 'prod-29', nombre: 'Rollitos Primavera Vegetarianos (4)', cantidad: 1, precio_unitario: 14000 },
    ],
  },

  // --- LISTO (3) ---
  {
    code: '115',
    cliente: 'Sebastián Betancur',
    telefono: '+573223456789',
    modalidad: 'retiro',
    origen: 'whatsapp',
    estado: 'listo',
    pagado: true,
    metodo_pago: 'transferencia',
    items: [
      { product_id: 'prod-30', nombre: 'Sandwich de Pastrami Artesanal', cantidad: 2, precio_unitario: 31000 },
      { product_id: 'prod-31', nombre: 'Papas chips con Sal Marina', cantidad: 2, precio_unitario: 6000 },
    ],
  },
  {
    code: '116',
    cliente: 'Luciana Córdoba',
    telefono: '+573234567890',
    modalidad: 'domicilio',
    origen: 'whatsapp',
    estado: 'listo',
    pagado: true,
    metodo_pago: 'tarjeta',
    repartidor: 'Moto Envíos Norte (Carlos P.)',
    direccion_entrega: { texto: 'Cra. 65 # 48-12, Estadio', calle: 'Cra. 65 # 48-12', barrio: 'Estadio' },
    items: [
      { product_id: 'prod-32', nombre: 'Ensalada César con Pollo Grill', cantidad: 2, precio_unitario: 24000 },
      { product_id: 'prod-33', nombre: 'Agua San Pellegrino 500ml', cantidad: 2, precio_unitario: 9000 },
    ],
  },
  {
    code: '117',
    cliente: 'Andrés Felipe Cano',
    telefono: '+573245678901',
    modalidad: 'retiro',
    origen: 'operador',
    estado: 'listo',
    pagado: false,
    metodo_pago: 'efectivo',
    pago_con: 50000,
    items: [
      { product_id: 'prod-34', nombre: 'Combo Hamburguesa Monster Bacon', cantidad: 1, precio_unitario: 35000 },
      { product_id: 'prod-35', nombre: 'Aros de Cebolla Crocantes', cantidad: 1, precio_unitario: 11000 },
    ],
  },

  // --- EN CAMINO (4) ---
  {
    code: '118',
    cliente: 'Mariana Duque',
    telefono: '+573256789012',
    modalidad: 'domicilio',
    origen: 'whatsapp',
    estado: 'en_camino',
    pagado: true,
    metodo_pago: 'transferencia',
    repartidor: 'RápidoExpress #12 (Diego R.)',
    direccion_entrega: { texto: 'Calle 33 # 76-20, Laureles', calle: 'Calle 33 # 76-20', barrio: 'Laureles', referencia: 'Frente al parque' },
    items: [
      { product_id: 'prod-36', nombre: 'Pizza Pepperoni & Jalapeño', cantidad: 1, precio_unitario: 42000 },
      { product_id: 'prod-37', nombre: 'Dips de Ajo y Chimichurri', cantidad: 2, precio_unitario: 4000 },
    ],
  },
  {
    code: '119',
    cliente: 'Cristian Rendón',
    telefono: '+573267890123',
    modalidad: 'domicilio',
    origen: 'whatsapp',
    estado: 'en_camino',
    pagado: false,
    metodo_pago: 'efectivo',
    pago_con: 60000,
    repartidor: 'Moto 05 (Javier L.)',
    direccion_entrega: { texto: 'Cra 48 # 20 Sur-55, Poblado', calle: 'Cra 48 # 20 Sur-55', barrio: 'Poblado' },
    items: [
      { product_id: 'prod-38', nombre: 'Tacos Birria con Consomé (3 uds)', cantidad: 2, precio_unitario: 26000 },
    ],
  },
  {
    code: '120',
    cliente: 'Paola Zuleta',
    telefono: '+573278901234',
    modalidad: 'domicilio',
    origen: 'whatsapp',
    estado: 'en_camino',
    pagado: true,
    metodo_pago: 'tarjeta',
    repartidor: 'Mensajería Express (Esteban)',
    direccion_entrega: { texto: 'Av. Las Palmas Km 4, Urbanización Bosques', calle: 'Av. Las Palmas Km 4', barrio: 'Palmas' },
    items: [
      { product_id: 'prod-39', nombre: 'Lasagna de Carne Bolognesa', cantidad: 2, precio_unitario: 28000 },
      { product_id: 'prod-40', nombre: 'Pan de Ajo con Queso Parmesano', cantidad: 1, precio_unitario: 10000 },
    ],
  },
  {
    code: '121',
    cliente: 'Óscar Agudelo',
    telefono: '+573289012345',
    modalidad: 'domicilio',
    origen: 'operador',
    estado: 'en_camino',
    pagado: false,
    metodo_pago: 'efectivo',
    pago_con: 100000,
    repartidor: 'Moto 08 (Samuel V.)',
    direccion_entrega: { texto: 'Calle 10A # 40-15, Poblado', calle: 'Calle 10A # 40-15', barrio: 'Poblado', referencia: 'Edificio Parque 10' },
    items: [
      { product_id: 'prod-41', nombre: 'Parrillada Mixta Especial (2 pers)', cantidad: 1, precio_unitario: 75000 },
      { product_id: 'prod-42', nombre: 'Gaseosa Postobón Manzana 1.5L', cantidad: 1, precio_unitario: 7500 },
    ],
  },

  // --- ENTREGADOS (5) ---
  {
    code: '122',
    cliente: 'Clara Tamayo',
    telefono: '+573290123456',
    modalidad: 'domicilio',
    origen: 'whatsapp',
    estado: 'entregado',
    pagado: true,
    metodo_pago: 'transferencia',
    repartidor: 'Moto Envíos Norte (Carlos P.)',
    finished_at: minutesAgo(45),
    direccion_entrega: { texto: 'Cra 76 # 33-10, Laureles', calle: 'Cra 76 # 33-10', barrio: 'Laureles' },
    items: [
      { product_id: 'prod-43', nombre: 'Pollo Asado Clásico Criollo', cantidad: 1, precio_unitario: 36000 },
      { product_id: 'prod-44', nombre: 'Arepas con Queso (4 uds)', cantidad: 1, precio_unitario: 8000 },
    ],
  },
  {
    code: '123',
    cliente: 'Guillermo Ospina',
    telefono: '+573301234567',
    modalidad: 'retiro',
    origen: 'whatsapp',
    estado: 'entregado',
    pagado: true,
    metodo_pago: 'tarjeta',
    finished_at: minutesAgo(90),
    items: [
      { product_id: 'prod-45', nombre: 'Combo Burger Smash Doble Queso', cantidad: 3, precio_unitario: 24000 },
    ],
  },
  {
    code: '124',
    cliente: 'Manuela Marín',
    telefono: '+573312345678',
    modalidad: 'mesa',
    origen: 'operador',
    estado: 'entregado',
    pagado: true,
    metodo_pago: 'tarjeta',
    finished_at: minutesAgo(120),
    direccion_entrega: { texto: 'Mesa 2 - Principal', indicaciones: 'Mesa 2' },
    items: [
      { product_id: 'prod-46', nombre: 'Risotto de Hongos Portobello', cantidad: 2, precio_unitario: 38000 },
      { product_id: 'prod-47', nombre: 'Copa Sauvignon Blanc', cantidad: 2, precio_unitario: 21000 },
    ],
  },
  {
    code: '125',
    cliente: 'Rodrigo Cardona',
    telefono: '+573323456789',
    modalidad: 'domicilio',
    origen: 'whatsapp',
    estado: 'entregado',
    pagado: true,
    metodo_pago: 'efectivo',
    repartidor: 'Javier Moto 04',
    finished_at: minutesAgo(180),
    direccion_entrega: { texto: 'Calle 50 # 40-30, Boston', calle: 'Calle 50 # 40-30', barrio: 'Boston' },
    items: [
      { product_id: 'prod-48', nombre: 'Chuzo Desgranado Especial Mixto', cantidad: 2, precio_unitario: 27000 },
      { product_id: 'prod-49', nombre: 'Jugo de Mora en Leche', cantidad: 2, precio_unitario: 7000 },
    ],
  },
  {
    code: '126',
    cliente: 'Silvia Peláez',
    telefono: '+573334567890',
    modalidad: 'retiro',
    origen: 'whatsapp',
    estado: 'entregado',
    pagado: true,
    metodo_pago: 'transferencia',
    finished_at: minutesAgo(240),
    items: [
      { product_id: 'prod-50', nombre: 'Tarta de Manzana Tibia con Helado', cantidad: 2, precio_unitario: 16000 },
      { product_id: 'prod-51', nombre: 'Capuchino Doble', cantidad: 2, precio_unitario: 8000 },
    ],
  },

  // --- CANCELADOS (3) ---
  {
    code: '127',
    cliente: 'Samuel Correa',
    telefono: '+573345678901',
    modalidad: 'domicilio',
    origen: 'whatsapp',
    estado: 'cancelado',
    pagado: false,
    metodo_pago: 'efectivo',
    finished_at: minutesAgo(60),
    direccion_entrega: { texto: 'Calle 10 # 50-20, Guayabal', calle: 'Calle 10 # 50-20', barrio: 'Guayabal' },
    items: [
      { product_id: 'prod-52', nombre: 'Combo Alitas Picantes x12', cantidad: 1, precio_unitario: 32000 },
    ],
  },
  {
    code: '128',
    cliente: 'Elena Forero',
    telefono: '+573356789012',
    modalidad: 'retiro',
    origen: 'operador',
    estado: 'cancelado',
    pagado: false,
    metodo_pago: 'efectivo',
    finished_at: minutesAgo(150),
    items: [
      { product_id: 'prod-53', nombre: 'Pizza Hawaiana Familiar', cantidad: 1, precio_unitario: 42000 },
    ],
  },
  {
    code: '129',
    cliente: 'Ignacio Barrientos',
    telefono: '+573367890123',
    modalidad: 'domicilio',
    origen: 'whatsapp',
    estado: 'cancelado',
    pagado: true,
    metodo_pago: 'transferencia',
    finished_at: minutesAgo(300),
    direccion_entrega: { texto: 'Cra 80 # 45GG-10, Floresta', calle: 'Cra 80 # 45GG-10', barrio: 'Floresta' },
    items: [
      { product_id: 'prod-54', nombre: 'Lomo al Trapo con Papas Francesas', cantidad: 1, precio_unitario: 52000 },
    ],
  },
];

async function main() {
  console.log('--- Configurando módulos y organizaciones ---');

  for (const orgId of TARGET_ORGS) {
    // 1. Modulo organizacion: pedidos e inventario
    const { error: errMod1 } = await sb.schema('necto').from('modulo_organizacion').upsert({
      organizacion_id: orgId,
      modulo_id: 'pedidos',
      instalado: true,
      activo: true,
      conectores: { whatsapp: true },
    });
    if (errMod1) console.warn('Error modulo pedidos org', orgId, errMod1.message);

    const { error: errMod2 } = await sb.schema('necto').from('modulo_organizacion').upsert({
      organizacion_id: orgId,
      modulo_id: 'inventario',
      instalado: true,
      activo: true,
      conectores: {},
    });
    if (errMod2) console.warn('Error modulo inventario org', orgId, errMod2.message);

    // 2. Config pedidos
    const { error: errCfg } = await sb.schema('necto').from('config_pedidos').upsert({
      organizacion_id: orgId,
      perfil_comercial: 'food',
      capacidades_activas: ['modifiers', 'preparation_time', 'local_delivery', 'table_service'],
      columnas_personalizadas: [],
      plantillas_whatsapp: {
        recibido: '¡Recibimos tu pedido! Lo estamos revisando.',
        confirmado: 'Tu pedido fue confirmado y pronto entra en preparación.',
        enPreparacion: '¡Manos a la obra! Estamos preparando tu pedido.',
        listo: 'Tu pedido está listo.',
        enCamino: 'Tu pedido va en camino.',
        entregado: '¡Pedido entregado! Gracias por tu compra.',
        cancelado: 'Tu pedido fue cancelado. Si tienes dudas, escríbenos.',
      },
      horarios: { activo: false, apertura: '08:00', cierre: '22:00', dias: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'] },
      pipeline: [],
    });
    if (errCfg) console.warn('Error config_pedidos org', orgId, errCfg.message);

    // 3. Insertar pedidos
    console.log(`Insertando ${SAMPLE_ORDERS.length} pedidos para la organización ${orgId}...`);
    for (let i = 0; i < SAMPLE_ORDERS.length; i++) {
      const so = SAMPLE_ORDERS[i];
      const numero = `PED-${so.code}`;
      const minutos = (SAMPLE_ORDERS.length - i) * 12;
      const creado = minutesAgo(minutos);

      // Ver si ya existe
      const { data: existente } = await sb
        .schema('necto')
        .from('pedido')
        .select('id')
        .eq('organizacion_id', orgId)
        .eq('numero', numero)
        .maybeSingle();

      let pedidoId = existente?.id;

      if (!pedidoId) {
        const { data: nuevo, error: errPed } = await sb
          .schema('necto')
          .from('pedido')
          .insert({
            organizacion_id: orgId,
            numero,
            cliente: so.cliente,
            telefono: so.telefono,
            modalidad: so.modalidad,
            origen: so.origen,
            estado: so.estado,
            estado_desde: creado,
            programado_para: so.programado_para || null,
            finished_at: so.finished_at || null,
            pago_con: so.pago_con || null,
            metodo_pago: so.metodo_pago || 'efectivo',
            repartidor: so.repartidor || null,
            direccion_entrega: so.direccion_entrega || null,
            creado_en: creado,
          })
          .select('id')
          .single();

        if (errPed) {
          console.error(`Error al insertar pedido ${numero}:`, errPed.message);
          continue;
        }
        pedidoId = nuevo.id;
      }

      // Eliminar items previos si había y reinsertar
      await sb.schema('necto').from('pedido_item').delete().eq('pedido_id', pedidoId);

      const itemsParaInsertar = so.items.map((it, idx) => ({
        pedido_id: pedidoId,
        product_id: it.product_id,
        nombre: it.nombre,
        cantidad: it.cantidad,
        precio_unitario: it.precio_unitario,
        orden: idx + 1,
      }));

      const { error: errItems } = await sb
        .schema('necto')
        .from('pedido_item')
        .insert(itemsParaInsertar);

      if (errItems) {
        console.error(`Error al insertar items para pedido ${numero}:`, errItems.message);
      }
    }
  }

  console.log('✅ Seed completado con éxito!');
}

main().catch((err) => {
  console.error('Error fatal en seed:', err);
  process.exit(1);
});
