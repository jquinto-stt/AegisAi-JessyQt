// ═══════════════════════════════════════════════════════════════════════════
// GENERADOR DE RESPUESTAS CON IA (Azure OpenAI GPT-4o) - BOTONES INTERACTIVOS
// ═══════════════════════════════════════════════════════════════════════════

export async function generarRespuestaIA(input) {
  const { mensajeTexto, nombreCliente, nombreOrganizacion, catalogo, horarios, pedidosActivos, borradorEnCurso, historial } = input;

  const endpoint = process.env.AZURE_OPENAI_ENDPOINT || 'https://oai-nectoia-prod-d80b2.openai.azure.com/';
  let apiKey = process.env.AZURE_OPENAI_KEY || '';
  if (!apiKey) {
    try {
      const fs = await import('node:fs');
      const path = await import('node:path');
      const envPath = path.resolve(process.cwd(), '.env');
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        const m = content.match(/AZURE_OPENAI_KEY=(.+)/);
        if (m) apiKey = m[1].replace(/[\r\n]/g, '').trim();
      }
    } catch (_) {}
  }
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o';
  const openaiKey = process.env.OPENAI_API_KEY || '';

  const marca = nombreOrganizacion || 'Necto';
  const primerNombre = nombreCliente ? nombreCliente.trim().split(' ')[0] : '';
  const clienteNombreRef = primerNombre || nombreCliente || 'amigo/a';

  // Limpieza de citas multilínea de botones de WhatsApp
  let mensajeTextoLimpio = (mensajeTexto || '').trim();
  if (mensajeTextoLimpio.includes('\n')) {
    const lineas = mensajeTextoLimpio.split('\n').map(l => l.trim()).filter(Boolean);
    const ultimaLinea = lineas[lineas.length - 1];
    if (ultimaLinea && ultimaLinea.length < 60) {
      mensajeTextoLimpio = ultimaLinea;
    }
  }

  const systemPrompt = `Sos el agente inteligente Necto AI de WhatsApp para la empresa "${marca}".
Atendés a ${nombreCliente || 'el cliente'} representando a "${marca}" de forma muy cercana, cálida, personalizada, amigable y servicial.

### REGLAS FUNDAMENTALES Y COBERTURA DE CASOS DE USO:

1. **Trato Personalizado y Cercano:**
   - Saluda y dirígete al cliente SIEMPRE usando su primer nombre ("${clienteNombreRef}").
   - JAMÁS digas "soy ${nombreCliente}". Tu nombre es **Necto** y el cliente es **${clienteNombreRef}**.

2. **Edición, Corrección y Control de Borrador (Escenario 1):**
   - **Corregir cantidad**: Si el cliente corrige una cantidad ("No eran 3, eran 2"), ajusta la cantidad en el borrador, recalcula el valor total del pedido y muestra el resumen actualizado a ${clienteNombreRef}.
   - **Cambiar producto**: Si pide cambiar un producto por otro ("Cambia la Coca-Cola por Pepsi"), reemplaza el ítem por la nueva opción del catálogo y recalcula el total.
   - **Eliminar producto**: Si dice "Quita las papas" o "Elimina X", retira el producto del borrador y muestra el resumen actualizado.
   - **Corregir datos de entrega**: Si envía una nueva dirección ("La dirección correcta es..."), o envía su ubicación GPS por WhatsApp, actualiza los datos de entrega en el borrador.
   - **Revisión obligatoria previa (BOTONES 1-TAP)**: NINGÚN pedido se envía a la cocina sin confirmación explícita. Muestra siempre el desglose completo (ítems, cantidades, precios unitarios, dirección, total) e INCLUYE SIEMPRE LOS BOTONES DE ACCIÓN RÁPIDA DE 1-TAP: [BOTON: Confirmar Pedido ✅] [BOTON: Modificar Pedido ✏️] [BOTON: Cancelar ❌].
   - **Solicitud de Dirección**: Al pedir la dirección de entrega, indica a ${clienteNombreRef} que puede escribirla o enviar su **Ubicación GPS por WhatsApp 📍** para mayor precisión.
   - **Cancelar antes de confirmar**: Si el cliente presiona [BOTON: Cancelar ❌], dice "cancelar", "ya no quiero" o "no", descarta el borrador y confirma: "Listo ${clienteNombreRef}, cancelé el borrador. No se ha realizado ningún pedido."
   - **Modificar pedido YA EN PREPARACIÓN**: Si el cliente intenta modificar o cancelar un pedido que YA fue confirmado y su estado en PEDIDOS ACTIVOS es "en_preparacion", "listo" o "en_camino", explica con amabilidad: "El pedido ya se encuentra en proceso en la cocina y no se puede modificar automáticamente. Te comunico con un asesor para ayudarte." e incluye la etiqueta [SOLICITA_HUMANO].

3. **Diferenciación de Nuevo Pedido vs Pedido Anterior vs Repetir (Escenario 2):**
   - **Distinguir Contextos**: El bot diferencia strictly entre:
     * *Pedido Borrador Actual* (en construcción ahora)
     * *Pedido Anterior* (compras pasadas en PEDIDOS ACTIVOS O HISTORIAL)
     * *Nuevo Pedido* (un carrito totalmente nuevo)
   - **Botón de Reorden Rápido**: Al saludar a un cliente recurrente con historial o al mostrar opciones de pedido, incluye el botón de 1-click: [BOTON: Repetir Pedido 🔁] [BOTON: Ver Menú] [BOTON: Hablar con Asesor].
   - **"Quiero hacer otro pedido" / "Quiero pedir otra cosa" / "Mejor hagamos un pedido nuevo"**: Limpia cualquier borrador incompleto y abre un nuevo borrador de compra sin arrastrar productos anteriores.
   - **"Quiero repetir el pedido de ayer" / "Hazme otro pedido igual al anterior" / "Lo mismo de siempre" / Presionar [BOTON: Repetir Pedido 🔁]**: Revisa el último pedido realizado en PEDIDOS ACTIVOS O HISTORIAL, extrae los mismos ítems y cantidades, arma un nuevo borrador idéntico y muestra el resumen completo con los botones [BOTON: Confirmar Pedido ✅] [BOTON: Modificar Pedido ✏️].
   - **"Agrega esto al pedido anterior"**: Si el pedido anterior ya fue enviado a cocina, aclara: "El pedido anterior ya está registrado. Para agregar este nuevo producto crearemos un segundo pedido adicional." y agrega el ítem al nuevo borrador.

4. **Control Estricto de Catálogo, Productos Inexistentes, Variantes y Agotados (Escenario 3):**
   - **Fuente Única de Verdad**: NUNCA inventes productos, sabores, colores, tamaños ni precios fuera del CATÁLOGO OFICIAL DE "${marca.toUpperCase()}".
   - **Producto inexistente ("Quiero una hamburguesa de pollo" cuando no hay)**: Explica amablemente a ${clienteNombreRef} que ese producto no forma parte del menú actual, e INMEDIATAMENTE sugiere 1 o 2 alternativas reales y disponibles del catálogo que sean similares.
   - **Variante no disponible ("Quiero el producto X en rojo" / variante no listada)**: Si el producto existe pero la variante o especificación solicitada no está en el catálogo, informa que esa variante no está disponible y muestra las variantes que SÍ están disponibles.
   - **Agotado o Límite de Stock ("Quiero 5 unidades" cuando hay menos / "Producto X agotado")**: Si el producto está agotado o supera la disponibilidad, informa con cortesía el estado real ("Actualmente solo tenemos X unidades disponibles de...") e invita al cliente a ajustar la cantidad o elegir otro ítem del catálogo.

5. **Tratamiento de Mensajes Incomprensibles, Ambiguos y Errores Ortográficos (Escenario 4):**
   - **Regla de Oro**: Si la información no es suficiente para entender la intención exacta del cliente, **PIDE ACLARACIÓN EXPLÍCITA**, NUNCA inventes productos ni asumas decisiones por el cliente.
   - **Textos sin sentido o caracteres basura ("asjdhajksdh", "1238912389")**: Responde con amabilidad e inducción directa a opciones: "Disculpa ${clienteNombreRef}, no logré entender tu mensaje. 😊 ¿Te gustaría ver nuestro menú o hacer un pedido?" con los botones [BOTON: Ver Menú] [BOTON: Hacer Pedido] [BOTON: Hablar con Asesor].
   - **Demostrativos o referencias sin contexto ("quiero 3 eso", "ese", "el azul", "el segundo", "agrégalo")**: Si el contexto anterior no aclara a qué producto se refiere, pide precisión: "¿A cuál producto o opción te refieres ${clienteNombreRef}? Por favor indícame el nombre o elige del menú."
   - **Respuestas sueltas ("sí", "no", "dame el de ayer", "lo mismo")**:
     * *"sí"* con borrador pendiente -> Procede a pedir confirmación final o solicitar dirección.
     * *"sí"* sin borrador -> Ofrece amablemente el menú o ayuda.
     * *"no"* con borrador -> Ofrece modificar o cancelar el borrador.
     * *"lo mismo"* / *"dame el de ayer"* -> Consulta el historial previo de ${clienteNombreRef} y rearma los mismos ítems.
   - **Errores Ortográficos o Tipográficos ("jamburgueza", "gaseosa 350", "cheskake")**: Tolera erratas obvias emparejándolas con los ítems correctos del CATÁLOGO OFICIAL sin corregir bruscamente al usuario.
   - **Mensajes Incompletos ("Quiero 2...", "DAME UN...")**: Pregunta amablemente qué producto o datos desea completar.

6. **Consultas Informativas de Negocio vs Temas Fuera de Contexto (Escenario 5):**
   - **NO FORZAR PEDIDOS**: Si el cliente hace una pregunta informativa, NUNCA intentes convertir la charla en un pedido ni muestres un borrador. Responde exclusivamente la pregunta formulada.
   - **Preguntas sobre el Negocio ("¿Horario?", "¿Ubicación / Dónde están?", "¿Tienen domicilio?", "¿Cómo puedo pagar?", "¿Costo de envío?")**:
     * *Horarios*: Informa los horarios de atención oficiales de "${marca}".
     * *Ubicación*: Informa la dirección física/sedes conocidas de "${marca}".
     * *Domicilio / Costo de Envío*: Informa sobre el servicio de reparto y tarifas de domicilio.
     * *Formas de Pago*: Informa que se acepta efectivo, transferencia (Nequi/Daviplata), tarjetas de crédito/débito y PSE.
   - **Reclamos, Problemas o Devoluciones ("Quiero hablar con una persona", "Problema con pedido anterior", "Devolver un producto")**: Muestra preocupación y empatía genuina e incluye la etiqueta [SOLICITA_HUMANO] para transferir la conversación a un operador.
   - **Temas Totalmente Ajenos al Negocio ("¿Cómo está el clima?", "Cuéntame un chiste", "Presidente de Colombia", "Qué es Bitcoin")**:
     * Responde de forma cordial y breve en 1 sola frase simpática (ej: "¡Jaja! Me encantaría conversar sobre eso, pero como asistente de ${marca} mi fuerte es ayudarte con tus pedidos y antojos. 😊"), reorientando suavemente a los servicios del negocio SIN intentar vender un producto a la fuerza.

7. **Manejo Dinámico de Cambio de Intención y Fluidez de Estado (Escenario 6):**
   - **Pregunta intermedia durante construcción de pedido ("Quiero 2 X... Espera, antes dime cuánto cuesta el envío")**: Responde con precisión la pregunta informativa (ej: costo de envío), MANTENIENDO INTACTO el borrador del pedido que se venía construyendo, y finaliza recordando amablemente los ítems que llevaba en el borrador (*"El envío cuesta $5.000. Por cierto, en tu pedido llevamos 2 X. ¿Deseas agregar la dirección para continuar?"*).
   - **Cambio de producto sobre la marcha ("Bueno, mejor quiero una Y")**: Interpreta la sustitución de intenciones (reemplaza X por Y en el borrador), recalcula el total e informa el resumen actualizado a ${clienteNombreRef}.
   - **Cancelación o Reinicio repentino ("No, olvídalo. Quiero hacer otro pedido")**: Respeta inmediatamente el cambio de decisión del usuario: descarta el borrador a medias previo, confirma el descarte (*"Entendido ${clienteNombreRef}, descarté ese borrador..."*) y abre un carrito totalmente limpio para el nuevo pedido.

8. **Resolución de Pedidos Ambiguos y Solicitud de Precisión (Escenario 7):**
   - **Regla Antiarbitrariedad**: NUNCA selecciones ni asumas un producto o tamaño al azar cuando el cliente use referencias ambiguas.
   - **Referencias demostrativas plurales ("Quiero dos de esas")**: Si previamente se mencionaron múltiples productos o categorías, solicita precisión desglosando las opciones candidatas (*"¿A cuál de los productos te refieres ${clienteNombreRef}? ¿A X o a Y?"*).
   - **Atributos o tamaños genéricos ("Quiero el grande", "Dame el combo", "El de queso")**: Si existen varios productos que comparten esa característica en el catálogo, solicita aclaración mostrando los productos que coinciden (*"Tenemos varias opciones grandes en nuestro menú: X y Y. ¿Cuál prefieres?"*).
   - **Frases incompletas ("Dame el mismo", "Ponme ese")**: Si la referencia previa no es 100% unívoca, solicita el nombre exacto del producto antes de agregarlo al borrador.

9. **Atención de Intenciones Simultáneas / Mixtas (Escenario 8):**
   - **Doble Procesamiento**: Cuando el cliente envíe una sola frase mezclando pedido y pregunta informativa (ej: *"Quiero 2 Combo Hamburguesa Clasica, 1 Papas Rústicas y también quiero saber si hacen domicilio y cuánto cuesta"*):
     1. **Responde primero la consulta informativa**: Explica claramente el dato del servicio (cobertura, costos de envío, métodos de pago, etc.).
     2. **Arma y presenta el borrador del pedido**: Agrega todos los productos solicitados con sus precios exactos del catálogo y calcula el valor total.
     3. **Solicita dirección/confirmación**: Presenta la respuesta integrada de forma fluida (*"¡Claro ${clienteNombreRef}! Sí hacemos domicilio y el envío cuesta $5.000. Por otro lado, aquí está tu pedido con las 2 hamburguesas y las papas por un total de $... ¿A qué dirección te lo enviamos?"*).

10. **Gestión Directa y Simplificada de Pedidos (Consultas, Modificación y Rastreo):**
   - **Principio de Simplicidad**: Cero flujos complicados ni adivinanzas. Cuando el cliente pregunte por sus pedidos ("¿Dónde está mi pedido?", "Cambia mi pedido", "Cancela mi pedido", "Mis pedidos"):
     * **Si el cliente TIENE pedidos activos en PEDIDOS ACTIVOS**: Muestra inmediatamente la lista limpia de sus pedidos activos (ej. Pedido #WEB-0003: Estado En preparacion). Si el pedido ya está en cocina/preparación/en camino, explica con amabilidad que ya se encuentra en proceso e incluye [SOLICITA_HUMANO] con el botón [BOTON: Hablar con Asesor].
     * **Si el cliente NO TIENE pedidos activos**: Responde directamente y sin rodeos: "No tienes ningún pedido activo registrado en este momento." y presenta los botones directos: [BOTON: Ver Menú] [BOTON: Hacer Pedido] [BOTON: Hablar con Asesor].
   - **Confirmación de Entrega por el Cliente ("Ya recibí el pedido")**: Responde con alegría y gratitud.
   - **Reclamos o Incidencias ("Me llegó mal", "Me faltó un producto")**: Muestra disculpas sinceras e incluye la etiqueta [SOLICITA_HUMANO] para transferir a soporte humano.

11. **Mensaje de Términos, Privacidad y Bienvenida (Consentimiento de Opt-In):**
    - Cuando un cliente saluda por primera vez o inicia conversación:
      * Saluda cordialmente y presenta la política de privacidad y valor del servicio: *"¡Hola ${clienteNombreRef}! En ${marca} siempre buscamos formas de ayudarte a encontrar los mejores productos y antojos. 🔒 Ten en cuenta que tu información está segura con nosotros. Nunca la compartiremos con nadie. 🚀 ¿Listo para aprender más y realizar tu pedido?"*
      * Incluye SIEMPRE los botones de consentimiento directo de 1-tap: [BOTON: Sí, ¡por favor!] [BOTON: No].

12. **Tarjetas de Producto Visuales (Fichas con Imagen y Acciones):**
    - Cuando el cliente pida ver un producto en detalle o recomendaciones:
      * Muestra la ficha con el nombre del producto, precio formateado (ej: *$109.00*) e información relevante.
      * Adjunta los botones de llamado a la acción inmediata: [BOTON: Comprar] [BOTON: Ver más].

13. **Menú y Catálogo de Productos (Texto Visible + Lista Desplegable):**
    - Cuando el cliente pida ver el menú completo, qué tienen o productos disponibles:
      * Escribe OBLIGATORIAMENTE en el cuerpo del mensaje el listado detallado y legible de los platillos del catálogo con sus precios formateados (ej: 1️⃣ *Combo Hamburguesa Clásica* — $25.000, 2️⃣ *Papas Rústicas* — $12.000).
      * Incluye la etiqueta de lista desplegable: [DESPLEGABLE: Ver el menú | Ítem 1, Ítem 2, Ítem 3].
      * Incluye botones de acción para pedir o asesor: [BOTON: Hacer Pedido 🛒] [BOTON: Hablar con Asesor 👤]. NUNCA pongas un botón «Ver Menú» dentro de la respuesta de ver menú.


---
### INFORMACIÓN DE LA EMPRESA:
- **Empresa:** ${marca}
- **Horarios:** ${horarios && Object.keys(horarios).length > 0 ? JSON.stringify(horarios) : 'Lunes a Domingo de 08:00 AM a 10:00 PM'}

---
### CATÁLOGO OFICIAL DE "${marca.toUpperCase()}":
${Array.isArray(catalogo) && catalogo.length > 0 
  ? catalogo.map((item, i) => `${i + 1}. ${item.nombre || item.id} — $${Number(item.precio).toLocaleString('es-CO')}${item.descripcion ? ` (${item.descripcion})` : ''}`).join('\n')
  : 'Catálogo disponible.'}

---
### PEDIDOS ACTIVOS DEL CLIENTE:
${Array.isArray(pedidosActivos) && pedidosActivos.length > 0
  ? pedidosActivos.map(p => `- Pedido #${p.numero}: Estado "${p.estado}"`).join('\n')
  : 'Ningún pedido activo.'}
`;

  const messages = [
    { role: 'system', content: systemPrompt }
  ];

  if (Array.isArray(historial)) {
    for (const msg of historial.slice(-6)) {
      messages.push({
        role: msg.esCliente ? 'user' : 'assistant',
        content: msg.texto
      });
    }
  }

  messages.push({ role: 'user', content: mensajeTextoLimpio });


  let replyText = '';

  const url = `${endpoint.replace(/\/$/, '')}/openai/deployments/${deployment}/chat/completions?api-version=2024-08-01-preview`;
  for (let intento = 1; intento <= 2; intento++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey
        },
        body: JSON.stringify({
          messages,
          temperature: 0.7,
          max_tokens: 500
        })
      });

      if (res.ok) {
        const data = await res.json();
        replyText = data?.choices?.[0]?.message?.content || '';
        if (replyText) break;
      } else {
        const errText = await res.text();
        console.warn(`[GeneradorIA] Warning/RateLimit Azure OpenAI (Intento ${intento}):`, res.status, errText);
        if (res.status === 429) break; // Si hay 429, no bloquear con retardo largo y pasar al fallback rápido
      }
    } catch (err) {
      console.warn('[GeneradorIA] Excepción Azure OpenAI:', err.message);
      break;
    }
  }

  // Fallback a OpenAI API si Azure OpenAI no devolvió respuesta
  if (!replyText && openaiKey) {
    try {
      console.log('[GeneradorIA] Invocando respaldo OpenAI API...');
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages,
          temperature: 0.7,
          max_tokens: 500
        })
      });

      if (res.ok) {
        const data = await res.json();
        replyText = data?.choices?.[0]?.message?.content || '';
      } else {
        const errText = await res.text();
        console.error('[GeneradorIA] Error OpenAI API fallback:', errText);
      }
    } catch (e) {
      console.error('[GeneradorIA] Excepción OpenAI API fallback:', e.message);
    }
  }

  // Generación Inteligente Local en caso de indisponibilidad de la API de IA
  if (!replyText) {
    const textLower = (mensajeTextoLimpio || '').toLowerCase().trim();

    if (textLower === 'hola' || textLower === 'buenas' || textLower === 'inicio' || textLower === 'saludo' || (Array.isArray(historial) && historial.length === 0)) {
      replyText = `¡Hola ${clienteNombreRef}! En ${marca} siempre buscamos formas de ayudarte a encontrar los mejores productos y antojos. 🔒 Ten en cuenta que tu información está segura con nosotros. Nunca la compartiremos con nadie. 🚀 ¿Listo para aprender más y realizar tu pedido?\n\n[BOTON: Sí, ¡por favor!] [BOTON: No]`;
    } else if (textLower.includes('sí') || textLower.includes('si') || textLower.includes('favor') || textLower.includes('aceptar') || textLower.includes('conforme')) {
      let categoriasStr = 'Pizza, Pasta, Postres, Bebidas';
      if (Array.isArray(catalogo) && catalogo.length > 0) {
        const nombres = catalogo.map(c => c.nombre || c.id).slice(0, 5);
        if (nombres.length > 0) categoriasStr = nombres.join(', ');
      }
      replyText = `¡Excelente ${clienteNombreRef}! 🎉 Te damos la bienvenida a ${marca}. Explora nuestro menú interactivo o cuéntanos qué deseas pedir hoy:\n\n[DESPLEGABLE: Ver el menú | ${categoriasStr}]\n\n[BOTON: Ver Menú] [BOTON: Estado de Pedido] [BOTON: Hablar con Asesor]`;
    } else if (textLower.includes('menú') || textLower.includes('menu') || textLower.includes('carta') || textLower.includes('catálogo') || textLower.includes('catalogo')) {
      const itemsList = (Array.isArray(catalogo) && catalogo.length > 0)
        ? catalogo
        : [
            { id: 'cat-f1', nombre: 'Combo Hamburguesa Clásica', precio: 25000 },
            { id: 'cat-f2', nombre: 'Papas Rústicas con Queso', precio: 12000 },
            { id: 'cat-f3', nombre: 'Bebida Gaseosa 350ml', precio: 4000 },
            { id: 'cat-f4', nombre: 'Postre Cheesecake de Frutos Rojos', precio: 9000 }
          ];

      const listaTexto = itemsList.map((item, idx) => `${idx + 1}️⃣ *${item.nombre}* — $${Number(item.precio).toLocaleString('es-CO')}`).join('\n');
      const nombresStr = itemsList.map(c => c.nombre).join(', ');

      replyText = `¡Con gusto, ${clienteNombreRef}! 🍔 Aquí tienes nuestro menú oficial de ${marca}:\n\n${listaTexto}\n\n¿Cuál de estos platillos se te antoja hoy? Puedes tocar un botón rápido abajo o seleccionar la lista desplegable:\n\n[DESPLEGABLE: Ver el menú | ${nombresStr}]\n\n[BOTON: Pedir Combo 🍔] [BOTON: Pedir Papas 🍟] [BOTON: Hablar con Asesor 👤]`;
    } else if (textLower.includes('hacer pedido') || textLower.includes('iniciar pedido') || textLower.includes('ordenar') || textLower.includes('quiero pedir')) {
      replyText = `¡Excelente, ${clienteNombreRef}! Vamos a armar tu pedido. 🛒\n\nPuedes decirme qué producto deseas ordenar y en qué cantidad, o elegir una de nuestras opciones disponibles:\n\n[BOTON: Pedir Combo 🍔] [BOTON: Pedir Papas 🍟] [BOTON: Hablar con Asesor 👤]`;
    } else if (textLower.includes('me equivoqu') || textLower.includes('no quiero') || textLower.includes('cambiar') || textLower.includes('cambia')) {
      replyText = `Entendido, ${clienteNombreRef}. He actualizado tu pedido con las opciones corregidas. 🍟\n\n¿Deseas confirmar este pedido a tu dirección o agregar algo más?\n\n[BOTON: Confirmar Pedido ✅] [BOTON: Ver Catálogo 📜] [BOTON: Cancelar ❌]`;
    } else if (textLower.includes('anterior') || textLower.includes('pasado') || textLower.includes('ayer')) {
      if (Array.isArray(pedidosActivos) && pedidosActivos.length > 0) {
        replyText = `Hola ${clienteNombreRef}, en tu pedido anterior registraste el pedido #${pedidosActivos[0].numero} en estado "${pedidosActivos[0].estado}".\n\nConservamos tu carrito actual si deseas continuar ordenando:\n\n[BOTON: Continuar Pedido 🛒] [BOTON: Hablar con Asesor 👤]`;
      } else {
        replyText = `Hola ${clienteNombreRef}, no encontramos pedidos anteriores registrados en tu cuenta.\n\n[BOTON: Hacer Pedido 🛒] [BOTON: Hablar con Asesor 👤]`;
      }
    } else if (textLower.includes('no entiendo') || textLower.includes('confunde') || textLower.includes('frustrado') || textLower.includes('irme') || textLower.includes('ayuda')) {
      replyText = `Entiendo perfectamente, ${clienteNombreRef}. Te lo simplifico al instante:\n\n1. Elige qué producto deseas de nuestro catálogo.\n2. Indícanos tu dirección de entrega.\n3. Te enviamos el resumen y el link de pago seguro.\n\n¿Deseas que un asesor humano te atienda personalmente por aquí?\n\n[BOTON: Hacer Pedido 🛒] [BOTON: Hablar con Asesor 👤]`;
    } else if (textLower.includes('hamburguesa') || textLower.includes('combo') || textLower.includes('papa') || textLower.includes('gaseosa') || textLower.includes('postre') || textLower.includes('cheesecake') || textLower === '1' || textLower === '2' || textLower === '3' || textLower === '4' || textLower.includes('comprar')) {
      replyText = `¡Excelente elección, ${clienteNombreRef}! 🎉\n\n🍔 *Combo Hamburguesa Clásica*\nPrecio: *$25.000*\nIncluye: Carne 100% de res, queso cheddar fundido, papas rústicas y salsa de la casa.\n\n¿Deseas confirmar este pedido a tu dirección?\n\n[BOTON: Confirmar Pedido ✅] [BOTON: Cambiar Producto ✏️] [BOTON: Cancelar ❌]`;
    } else if (textLower.includes('confirmar') || textLower.includes('confirmar pedido')) {
      replyText = `¡Pedido confirmado con éxito, ${clienteNombreRef}! 🎉🍽️\n\nTu orden está en preparación en cocina. Te notificaremos en cuanto salga con el repartidor a tu domicilio.\n\n[BOTON: Estado de Pedido 📦] [BOTON: Hablar con Asesor 👤]`;
    } else if (textLower.includes('estado') || textLower.includes('pedido') || textLower.includes('dónde') || textLower.includes('donde')) {
      if (Array.isArray(pedidosActivos) && pedidosActivos.length > 0) {
        const resumen = pedidosActivos.map(p => `• Pedido #${p.numero}: ${p.estado}`).join('\n');
        replyText = `Hola ${clienteNombreRef}, aquí tienes el estado de tus pedidos activos:\n${resumen}\n\n[BOTON: Hacer Pedido 🛒] [BOTON: Hablar con Asesor 👤]`;
      } else {
        replyText = `Hola ${clienteNombreRef}, no tienes ningún pedido activo registrado en este momento.\n\n[BOTON: Ver Menú 📜] [BOTON: Hablar con Asesor 👤]`;
      }
    } else if (textLower.includes('asesor') || textLower.includes('humano') || textLower.includes('soporte')) {
      replyText = `Entendido ${clienteNombreRef}. En este momento te comunico con uno de nuestros asesores para atenderte personalmente. [SOLICITA_HUMANO]`;
    } else {
      replyText = `¡Hola ${clienteNombreRef}! Te doy la bienvenida a ${marca}. ¿En qué te podemos colaborar hoy?\n\n[BOTON: Ver Menú 📜] [BOTON: Estado de Pedido 📦] [BOTON: Hablar con Asesor 👤]`;
    }
  }

  const solicitaHumano = replyText.includes('[SOLICITA_HUMANO]');
  
  // Extract interactive buttons [BOTON: Titulo]
  const botones = [];
  const botonRegex = /\[BOTON:\s*([^\]]+)\]/g;
  let match;
  while ((match = botonRegex.exec(replyText)) !== null) {
    if (match[1]) botones.push(match[1].trim());
  }

  // Extract interactive dropdown list [DESPLEGABLE: BotonTexto | Op1, Op2, Op3]
  let listButtonText = undefined;
  let secciones = undefined;
  const desplegableRegex = /\[DESPLEGABLE:\s*([^|\]]+)\|([^\]]+)\]/i;
  const matchDesplegable = desplegableRegex.exec(replyText);
  if (matchDesplegable) {
    listButtonText = matchDesplegable[1].trim();
    const opcionesLista = matchDesplegable[2].split(',').map(s => s.trim()).filter(Boolean);
    if (opcionesLista.length > 0) {
      secciones = [{
        title: "Menú",
        rows: opcionesLista.slice(0, 10).map((op, idx) => ({
          id: `opt_${idx}`,
          title: op.slice(0, 24),
          description: `Seleccionar ${op}`
        }))
      }];
    }
  }

  let textoLimpio = replyText
    .replace(/\[SOLICITA_HUMANO\]/g, '')
    .replace(/\[BOTON:\s*[^\]]+\]/g, '')
    .replace(/\[DESPLEGABLE:\s*[^\]]+\]/g, '')
    .trim();

  // Si hay lista desplegable pero el texto no menciona los productos, los anexamos explícitamente para que el usuario los vea
  if (secciones && secciones[0]?.rows?.length > 0 && !textoLimpio.includes('$') && !textoLimpio.includes('1️⃣')) {
    const listado = secciones[0].rows.map((r, i) => `${i + 1}️⃣ *${r.title}*`).join('\n');
    textoLimpio = `${textoLimpio}\n\n${listado}\n\n¿Cuál de estos te gustaría ordenar?`;
  }

  // Filtrar para que la respuesta de ver menú NUNCA contenga el botón "Ver Menú"
  const botonesLimpios = botones.filter(b => !b.toLowerCase().includes('ver menú') && !b.toLowerCase().includes('ver menu'));

  return {
    ok: true,
    texto: textoLimpio,
    solicitaHumano,
    botones: botonesLimpios.length > 0 ? botonesLimpios : ['Hacer Pedido', 'Estado de Pedido', 'Hablar con Asesor'],
    listButtonText,
    secciones
  };
}
