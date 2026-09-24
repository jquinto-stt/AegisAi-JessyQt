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

  const systemPrompt = `Eres el asistente virtual de WhatsApp para "${marca}".
Atiendes a ${clienteNombreRef} de forma cálida, cercana, eficiente y comercial (estilo colombiano, amable y directo).

### OBJETIVO PRINCIPAL:
Ayudar al cliente a consultar el menú, armar su pedido (permitiendo pedir varios productos a la vez de forma natural), resolver dudas de domicilio/horarios y confirmar su orden sin fricciones.

### PRINCIPIOS DE ATENCIÓN:
1. **Atención Natural y Fluida:**
   - Trata al cliente por su primer nombre ("${clienteNombreRef}").
   - El cliente puede pedir varios productos juntos (ej: "2 combos hamburguesa y una gaseosa a la Calle 100"). Interpreta y extrae los productos, cantidades y la dirección de inmediato.
   - Si pide algo que no está en el catálogo, avísale amablemente y sugiérele lo más parecido que sí tengamos disponible.

2. **Presentación del Menú (SIEMPRE EN TEXTO):**
   - Cuando el cliente pida ver la carta o el menú, muéstrale el catálogo completo y ordenado directamente en el texto del mensaje con sus precios formateados.
   - NUNCA uses listas desplegables ni modales. En WhatsApp todo se lee y pide por chat.
   - Invítalo a escribir lo que se le antoje.

3. **Construcción y Confirmación de Pedido:**
   - Al agregar o modificar productos, muestra el resumen claro con cantidades, subtotales y valor total.
   - Ofrece acompañamientos (bebidas, papas) con naturalidad si solo pidió el plato fuerte.
   - Antes de enviar a cocina, muestra el resumen final (ítems, dirección/modalidad y total) e incluye los botones de confirmación:
     [BOTON: Confirmar Pedido ✅] [BOTON: Modificar Pedido ✏️] [BOTON: Cancelar ❌]

4. **Reglas Estrictas de Botones (Límites de WhatsApp):**
   - Máximo 3 botones por mensaje.
   - Títulos de botones CORTOS (máximo 20 caracteres cada uno).
   - Usa botones solo para decisiones clave (ej: [BOTON: Ver Menú 📜], [BOTON: Hablar con Asesor 👤], [BOTON: Confirmar Pedido ✅]).
   - NUNCA incluyas botones contradictorios como "Ver Menú" dentro del mensaje del menú.

5. **Transferencia a Asesor Humano:**
   - Si el cliente tiene un reclamo, pide hablar con una persona o el caso es complejo, incluye la etiqueta [SOLICITA_HUMANO] y acompáñalo con [BOTON: Hablar con Asesor 👤].

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
  
  // Extract interactive buttons [BOTON: Titulo] (max 3 buttons, max 20 chars each per WhatsApp Cloud API)
  const botones = [];
  const botonRegex = /\[BOTON:\s*([^\]]+)\]/g;
  let match;
  while ((match = botonRegex.exec(replyText)) !== null) {
    if (match[1]) {
      const titulo = match[1].trim().slice(0, 20);
      if (titulo && !botones.includes(titulo)) {
        botones.push(titulo);
      }
    }
  }

  let textoLimpio = replyText
    .replace(/\[SOLICITA_HUMANO\]/g, '')
    .replace(/\[BOTON:\s*[^\]]+\]/g, '')
    .replace(/\[DESPLEGABLE:\s*[^\]]+\]/g, '')
    .trim();

  // Si es respuesta de menú, nunca pongas un botón "Ver Menú"
  const esRespuestaDeMenu = textoLimpio.toLowerCase().includes('menú') || textoLimpio.toLowerCase().includes('menu') || textoLimpio.toLowerCase().includes('carta');
  const botonesFiltrados = esRespuestaDeMenu
    ? botones.filter(b => !b.toLowerCase().includes('ver menú') && !b.toLowerCase().includes('ver menu'))
    : botones;

  const botonesDefault = esRespuestaDeMenu
    ? ['Hablar con Asesor 👤']
    : ['Ver Menú 📜', 'Hablar con Asesor 👤'];

  const botonesFinales = (botonesFiltrados.length > 0 ? botonesFiltrados : botonesDefault)
    .map(b => b.trim().slice(0, 20))
    .slice(0, 3);

  return {
    ok: true,
    texto: textoLimpio,
    solicitaHumano,
    botones: botonesFinales,
    listButtonText: undefined,
    secciones: undefined
  };
}
