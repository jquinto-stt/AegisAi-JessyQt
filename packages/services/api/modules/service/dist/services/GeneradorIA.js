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

  const catalogoTexto = Array.isArray(catalogo) && catalogo.length > 0 
    ? catalogo.map((item, i) => `${i + 1}. *${item.nombre || item.id}* — $${Number(item.precio).toLocaleString('es-CO')}${item.descripcion ? ` (${item.descripcion})` : ''}`).join('\n')
    : 'Catálogo disponible en el negocio.';

  const pedidosActivosTexto = Array.isArray(pedidosActivos) && pedidosActivos.length > 0
    ? pedidosActivos.map(p => `- Pedido #${p.numero}: Estado "${p.estado}"`).join('\n')
    : 'Ningún pedido activo en este momento.';

  const carritoTexto = borradorEnCurso && Array.isArray(borradorEnCurso.lineas) && borradorEnCurso.lineas.length > 0
    ? borradorEnCurso.lineas.map(l => `  • ${l.cantidad}x ${l.nombre} ($${Number(l.precioUnitario * l.cantidad).toLocaleString('es-CO')})`).join('\n') +
      `\n  • Subtotal acumulado: $${Number(borradorEnCurso.lineas.reduce((acc, l) => acc + (l.precioUnitario * l.cantidad), 0)).toLocaleString('es-CO')}` +
      `\n  • Modalidad: ${borradorEnCurso.modalidad || 'Pendiente por definir (Domicilio o Retiro)'}` +
      `\n  • Dirección: ${borradorEnCurso.direccion || 'Pendiente'}` +
      `\n  • Paso actual: ${borradorEnCurso.paso}`
    : 'Actualmente el cliente NO tiene productos en su carrito.';

  const systemPrompt = `Eres el asistente virtual de WhatsApp para "${marca}".
Atiendes a ${clienteNombreRef} de forma cálida, cercana, eficiente y comercial (estilo colombiano, amable y directo).

### REGLA DE ORO — CERO PREGUNTAS REDUNDANTES Y MÁXIMO 1 PREGUNTA POR MENSAJE:
1. **Tu prioridad es CERRAR EL PEDIDO RÁPIDO Y SIN FRICCIÓN.** Cada pregunta innecesaria es un cliente que se va.
2. **NUNCA hagas dos preguntas en el mismo mensaje.** Si preguntas por la entrega, NO preguntes por adiciones o bebidas.
3. **NUNCA hagas preguntas de relleno.** Si el cliente ya dio su dirección, ¡NO preguntes si quiere pedir para esa dirección ni qué se le antoja! Ya tiene sus productos en el carrito.

### PRINCIPIOS DE FLUJO DIRECTO Y BOTONES ESPECÍFICOS:
1. **Saludo Inicial:**
   - Si el cliente solo saluda (ej: "Hola", "Buenas"):
     Responde de forma DIRECTA, CÁLIDA Y SIN PREGUNTAS REDUNDANTES:
     "¡Hola ${clienteNombreRef}! Te doy la bienvenida a ${marca}. 🍔 ¿Qué te gustaría pedir hoy?"
     Y agrega EXACTAMENTE estos dos botones:
     [BOTON: Ver Menú 📜] [BOTON: Hablar con Asesor 👤]

2. **Mostrar Menú:**
   - Muestra el catálogo directamente en el texto con precios claros.
   - Invítalo a escribir los platos o números que desee.
   - Botón: [BOTON: Hablar con Asesor 👤]

3. **Elección de Productos (1 o varios):**
   - Confirma los productos agregados con sus cantidades y el Total acumulado.
   - Haz UNA SOLA PREGUNTA: "¿Cómo prefieres recibir tu pedido?"
   - Botones específicos: [BOTON: A Domicilio 🛵] [BOTON: Para Recoger 🛍️]
   - (NO muestres botón de asesor aquí para mantener el foco en la compra).

4. **Solicitud de Dirección:**
   - Si el cliente elige domicilio y no ha dado la dirección:
     "¡Perfecto! Escríbeme la dirección completa donde recibirás tu pedido:"
     - NO coloques botones en este paso, el cliente debe escribir libremente su dirección.

5. **Resumen Final y Confirmación:**
   - En cuanto el cliente dé su dirección (o elija retiro en local), MUESTRA DE INMEDIATO EL RESUMEN:
     • Productos y cantidades
     • Total del pedido
     • Entrega (Domicilio a la dirección indicada o Retiro en local)
     Y pregunta únicamente si confirma con estos botones:
     [BOTON: Confirmar Pedido ✅] [BOTON: Modificar Pedido ✏️] [BOTON: Cancelar ❌]

6. **Greedy Slot-Filling (Captura en un solo turno):**
   - Si el cliente escribe productos Y dirección en un solo mensaje:
     Procesa todo de una sola vez y muestra DIRECTAMENTE el resumen final con [BOTON: Confirmar Pedido ✅].

7. **Confirmación Exitosa del Pedido:**
   - Si el cliente confirma, agradécele calurosamente. Indícale que su pedido ha quedado registrado y en preparación, y que a continuación recibirá su link de pago.
   - Botones finales: [BOTON: Estado de Pedido 📦] [BOTON: Hacer Otro Pedido 🛒] [BOTON: Hablar con Asesor 👤]

8. **Transferencia a Asesor Humano:**
   - Si el cliente tiene un reclamo o pide expresamente hablar con una persona, incluye [SOLICITA_HUMANO] y [BOTON: Hablar con Asesor 👤].

9. **Consulta de Estado de Pedidos:**
   - Si el cliente pregunta por el estado de su pedido o pulsa "Estado de Pedido 📦":
     Revisa la sección "PEDIDOS ACTIVOS DEL CLIENTE" abajo.
     Si hay pedidos activos registrados, LISTA CADA UNO con su número (#WEB-...) y su estado actual de forma clara y amable.
     Botones: [BOTON: Hacer Otro Pedido 🛒] [BOTON: Hablar con Asesor 👤]

---
### ESTADO ACTUAL DEL CARRITO / PEDIDO:
${carritoTexto}

---
### INFORMACIÓN DE "${marca.toUpperCase()}":
- **Horarios:** ${horarios && Object.keys(horarios).length > 0 ? JSON.stringify(horarios) : 'Lunes a Domingo de 08:00 AM a 10:00 PM'}

---
### CATÁLOGO OFICIAL:
${catalogoTexto}

---
### PEDIDOS ACTIVOS DEL CLIENTE:
${pedidosActivosTexto}
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
      replyText = `¡Hola ${clienteNombreRef}! Te doy la bienvenida a ${marca}. 🍔 ¿Qué se te antoja pedir hoy?\n\nPuedes ver nuestro menú o decirme directamente qué te gustaría ordenar:\n\n_(Al ordenar aceptas nuestras políticas de privacidad)_\n\n[BOTON: Ver Menú 📜] [BOTON: Hablar con Asesor 👤]`;
    } else if (textLower.includes('menú') || textLower.includes('menu') || textLower.includes('carta') || textLower.includes('catálogo') || textLower.includes('catalogo') || textLower.includes('que tienen')) {
      const itemsList = Array.isArray(catalogo) && catalogo.length > 0 ? catalogo : [];
      const listaTexto = itemsList.length > 0
        ? itemsList.map((item, idx) => `${idx + 1}️⃣ *${item.nombre || item.id}* — $${Number(item.precio).toLocaleString('es-CO')}`).join('\n')
        : 'Nuestro menú está disponible. Pregúntame por el plato que prefieras.';

      replyText = `¡Con gusto, ${clienteNombreRef}! 🍔 Aquí tienes nuestro menú oficial de ${marca}:\n\n${listaTexto}\n\n¿Qué te gustaría ordenar hoy? Puedes decirme los platos y cantidades que prefieras:\n\n[BOTON: Hablar con Asesor 👤]`;
    } else if (textLower.includes('confirmar') || textLower.includes('confirmar pedido')) {
      replyText = `¡Pedido confirmado con éxito, ${clienteNombreRef}! 🎉🍽️\n\nTu orden ya está registrada y en preparación. Te avisaremos cuando salga en camino a tu dirección.\n\n[BOTON: Estado de Pedido 📦] [BOTON: Hablar con Asesor 👤]`;
    } else if (borradorEnCurso && Array.isArray(borradorEnCurso.lineas) && borradorEnCurso.lineas.length > 0 && (/\b(?:calle|cll|carrera|cra|kr|diagonal|diag|transversal|tv|avenida|av)\b.*?\d+/i.test(mensajeTextoLimpio) || textLower.includes('direcci'))) {
      const resumen = borradorEnCurso.lineas.map(l => `• ${l.cantidad}x ${l.nombre} ($${Number(l.precioUnitario * l.cantidad).toLocaleString('es-CO')})`).join('\n');
      const total = Number(borradorEnCurso.lineas.reduce((acc, l) => acc + (l.precioUnitario * l.cantidad), 0)).toLocaleString('es-CO');
      replyText = `¡Anotado! 📍 Dirección: *${mensajeTextoLimpio}*\n\nResumen de tu pedido:\n${resumen}\n\n*Total:* $${total}\n*Entrega:* Domicilio\n\n¿Confirmamos tu pedido?\n\n[BOTON: Confirmar Pedido ✅] [BOTON: Modificar Pedido ✏️] [BOTON: Cancelar ❌]`;
    } else if (borradorEnCurso && Array.isArray(borradorEnCurso.lineas) && borradorEnCurso.lineas.length > 0 && (textLower.includes('recoger') || textLower.includes('retiro') || textLower.includes('local'))) {
      const resumen = borradorEnCurso.lineas.map(l => `• ${l.cantidad}x ${l.nombre} ($${Number(l.precioUnitario * l.cantidad).toLocaleString('es-CO')})`).join('\n');
      const total = Number(borradorEnCurso.lineas.reduce((acc, l) => acc + (l.precioUnitario * l.cantidad), 0)).toLocaleString('es-CO');
      replyText = `¡Listo! Tu pedido quedará para recoger en el local.\n\nResumen de tu pedido:\n${resumen}\n\n*Total:* $${total}\n*Entrega:* Retiro en local\n\n¿Confirmamos tu pedido?\n\n[BOTON: Confirmar Pedido ✅] [BOTON: Modificar Pedido ✏️] [BOTON: Cancelar ❌]`;
    } else if (borradorEnCurso && Array.isArray(borradorEnCurso.lineas) && borradorEnCurso.lineas.length > 0 && textLower.includes('domicilio')) {
      replyText = `¡Perfecto! ¿A qué dirección te llevamos tu pedido? Escríbeme la dirección completa con barrio o referencia:`;
    } else if (textLower.includes('estado') || textLower.includes('pedido') || textLower.includes('dónde') || textLower.includes('donde')) {
      if (Array.isArray(pedidosActivos) && pedidosActivos.length > 0) {
        const resumen = pedidosActivos.map(p => `• Pedido #${p.numero}: ${p.estado}`).join('\n');
        replyText = `Hola ${clienteNombreRef}, aquí tienes el estado de tus pedidos activos:\n${resumen}\n\n[BOTON: Ver Menú 📜] [BOTON: Hablar con Asesor 👤]`;
      } else {
        replyText = `Hola ${clienteNombreRef}, no tienes ningún pedido activo registrado en este momento.\n\n[BOTON: Ver Menú 📜] [BOTON: Hablar con Asesor 👤]`;
      }
    } else if (textLower.includes('asesor') || textLower.includes('humano') || textLower.includes('soporte') || textLower.includes('persona')) {
      replyText = `Entendido ${clienteNombreRef}. En este momento te comunico con uno de nuestros asesores para atenderte personalmente. [SOLICITA_HUMANO]`;
    } else {
      replyText = `¡Hola ${clienteNombreRef}! Te doy la bienvenida a ${marca}. ¿En qué te podemos colaborar hoy?\n\n[BOTON: Ver Menú 📜] [BOTON: Hablar con Asesor 👤]`;
    }
  }

  const solicitaHumano = replyText.includes('[SOLICITA_HUMANO]');

  // Extract interactive buttons: supports [BOTON: Titulo], [botón: Titulo] or [Titulo]
  const botones = [];
  const tagRegex = /\[([^\]]+)\]/g;
  let match;
  while ((match = tagRegex.exec(replyText)) !== null) {
    if (match[1]) {
      let candidate = match[1].replace(/^(?:bot[oóOÓ]n|boton|button)\s*:\s*/iu, '').trim();
      if (/SOLICITA_HUMANO|ESTADO_PEDIDO|DESPLEGABLE|direccion|modalidad|items/i.test(candidate)) continue;
      const titulo = candidate.slice(0, 20);
      if (titulo && !botones.includes(titulo) && titulo.length <= 20) {
        botones.push(titulo);
      }
    }
  }

  let textoLimpio = replyText
    .replace(/\[SOLICITA_HUMANO\]/gi, '')
    .replace(/\[ESTADO_PEDIDO:[^\]]*\]/gsi, '')
    .replace(/\{[^{}]*"direccion"[^{}]*\}/gsi, '')
    .replace(/\[DESPLEGABLE:\s*[^\]]+\]/gi, '')
    .replace(/\[[^\]]+\]/g, '')
    .replace(/,\s*"direccion":\s*"[^"]*",\s*"modalidad":\s*"[^"]*"\s*\}?\]?/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Comprobar si el texto contiene el listado de platos con precios
  const esCatalogoImpreso = /(?:\d+️⃣|\d+\.\s*\*[^*]+\*)\s*—\s*\$[\d.]+/i.test(textoLimpio);
  const esExitoPedido = /registrado con [eé]xito/i.test(textoLimpio);
  const pideConfirmacion = /(?:confirmas|resumen|deseas confirmar|confirmamos)/i.test(textoLimpio);
  const pideDireccion = /direcci[oó]n/i.test(textoLimpio) && !pideConfirmacion && !esExitoPedido;
  const pideModalidad = !pideConfirmacion && !pideDireccion && /(?:c[oó]mo prefieres recibir|a domicilio o para recoger|c[oó]mo lo quieres recibir)/i.test(textoLimpio);

  let botonesFinales = [];
  if (esExitoPedido) {
    botonesFinales = ['Estado de Pedido 📦', 'Hacer Otro Pedido 🛒', 'Hablar con Asesor 👤'];
  } else if (pideConfirmacion) {
    botonesFinales = ['Confirmar Pedido ✅', 'Modificar Pedido ✏️', 'Cancelar ❌'];
  } else if (pideDireccion) {
    // Al pedir dirección no se envían botones interactivos para permitir digitación libre
    botonesFinales = [];
  } else if (pideModalidad) {
    botonesFinales = ['A Domicilio 🛵', 'Para Recoger 🛍️'];
  } else if (esCatalogoImpreso) {
    const filtrados = botones.filter(b => !b.toLowerCase().includes('ver menú') && !b.toLowerCase().includes('ver menu'));
    botonesFinales = filtrados.length > 0 ? filtrados : ['Hablar con Asesor 👤'];
  } else if (botones.length > 0) {
    botonesFinales = botones;
  } else {
    botonesFinales = ['Ver Menú 📜', 'Hablar con Asesor 👤'];
  }

  botonesFinales = botonesFinales
    .map(b => b.replace(/^(?:bot[oóOÓ]n|boton|button)\s*:\s*/iu, '').trim().slice(0, 20))
    .slice(0, 3);

  return {
    ok: true,
    texto: textoLimpio,
    solicitaHumano,
    botones: botonesFinales,
    entidadesDetectadas: null,
    listButtonText: undefined,
    secciones: undefined
  };
}
