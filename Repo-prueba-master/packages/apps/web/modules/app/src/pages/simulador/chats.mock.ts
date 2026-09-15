// ═══════════════════════════════════════════════════════════════════════════
// DATOS MOCK — conversaciones de WhatsApp (simulación, solo lectura)
// ═══════════════════════════════════════════════════════════════════════════
//
// Contexto: NECTO en una clínica/centro médico. El cliente (paciente) escribe
// por WhatsApp y el bot lo atiende. Según la cola, el bot pide distintos datos:
//  - Consulta general: nombre, documento, teléfono, motivo de consulta.
//  - Laboratorio: nombre, documento, orden médica, ayuno.
// Los mensajes del bot pueden incluir un link (encuesta) que navega en la app.

/** Autor de un mensaje en el chat. */
export type Autor = "cliente" | "bot";

/** Un link dentro de un mensaje del bot que navega a una vista de la app. */
export interface ChatLink {
  label: string;
  /** Ruta interna a la que navega (ej. "/s/demo" para la encuesta). */
  to: string;
}

export interface ChatMensaje {
  autor: Autor;
  texto: string;
  hora: string;
  /** Link opcional (solo en mensajes del bot). */
  link?: ChatLink;
}

export interface Chat {
  id: string;
  /** Nombre del contacto (paciente). */
  nombre: string;
  /** Teléfono mostrado bajo el nombre. */
  telefono: string;
  /** Etiqueta corta del escenario, para la lista de chats. */
  escenario: string;
  mensajes: ChatMensaje[];
}

/**
 * 3 conversaciones guionadas COMPLETAS de Turnos en una clínica (mock).
 */
export const CHATS: Chat[] = [
  // ── 1. Paciente que crea el turno desde su celular (self-service) ───────────
  {
    id: "c1",
    nombre: "Ana Silva",
    telefono: "+57 300 111 2233",
    escenario: "Creó su turno desde el celular",
    mensajes: [
      { autor: "cliente", texto: "Buenos días", hora: "08:58" },
      { autor: "bot", texto: "¡Buenos días! 👋 Bienvenida a Clínica San Rafael. Soy el asistente virtual de turnos.\n\n¿Qué deseas hacer hoy?\n\n1️⃣ Sacar un turno\n2️⃣ Consultar mi turno\n3️⃣ Hablar con un operador", hora: "08:58" },
      { autor: "cliente", texto: "1", hora: "08:59" },
      { autor: "bot", texto: "Perfecto. ¿Para qué servicio necesitas el turno?\n\n1️⃣ Consulta general\n2️⃣ Laboratorio", hora: "08:59" },
      { autor: "cliente", texto: "Consulta general", hora: "08:59" },
      { autor: "bot", texto: "Muy bien 🩺 Para tu turno de *Consulta general* necesito algunos datos.\n\n¿Cuál es tu nombre completo?", hora: "09:00" },
      { autor: "cliente", texto: "Ana Silva Rodríguez", hora: "09:00" },
      { autor: "bot", texto: "Gracias, Ana. ¿Cuál es tu número de documento?", hora: "09:00" },
      { autor: "cliente", texto: "1.032.556.778", hora: "09:01" },
      { autor: "bot", texto: "¿Un número de teléfono de contacto? (por si necesitamos avisarte algo)", hora: "09:01" },
      { autor: "cliente", texto: "300 111 2233", hora: "09:01" },
      { autor: "bot", texto: "Por último, cuéntame brevemente el *motivo de tu consulta* 📝", hora: "09:02" },
      { autor: "cliente", texto: "Tengo dolor de cabeza hace 3 días y algo de fiebre", hora: "09:02" },
      { autor: "bot", texto: "¡Listo, Ana! 🎫 Registré tu turno:\n\n• Turno: *A-043*\n• Servicio: Consulta general\n• Documento: 1.032.556.778\n• Motivo: Dolor de cabeza y fiebre\n\nHay 3 personas antes que tú. Tiempo estimado: ~15 min.", hora: "09:03" },
      { autor: "cliente", texto: "Perfecto, muchas gracias", hora: "09:03" },
      { autor: "bot", texto: "¡Con gusto! Te avisaré cuando se acerque tu turno. Puedes quedarte en la sala de espera. 🪑", hora: "09:03" },
      { autor: "bot", texto: "🔔 Ana, tu turno *A-043* está próximo. Hay 1 persona antes que tú, por favor acércate a la sala de Consulta general.", hora: "09:15" },
      { autor: "bot", texto: "🔔 Es tu turno, Ana. Pasa al *Consultorio 2* de Consulta general. 🙌", hora: "09:18" },
      { autor: "cliente", texto: "Gracias!", hora: "09:18" },
      { autor: "bot", texto: "Esperamos que te sientas mejor pronto 💚 ¿Nos ayudas con una encuesta rápida sobre tu experiencia?", hora: "09:41", link: { label: "Responder encuesta", to: "/s/demo" } },
    ],
  },

  // ── 2. Paciente que pide que le creen el turno (lo crea el operador) ────────
  {
    id: "c2",
    nombre: "Carlos Mendoza",
    telefono: "+57 301 222 3344",
    escenario: "Pidió que le crearan el turno",
    mensajes: [
      { autor: "cliente", texto: "Hola buenas", hora: "10:05" },
      { autor: "bot", texto: "¡Hola! 👋 Bienvenido a Clínica San Rafael. ¿Qué deseas hacer?\n\n1️⃣ Sacar un turno\n2️⃣ Consultar mi turno\n3️⃣ Hablar con un operador", hora: "10:05" },
      { autor: "cliente", texto: "Es que soy mayor y no me manejo bien con esto, me pueden ayudar a sacar el turno para el laboratorio?", hora: "10:06" },
      { autor: "bot", texto: "No te preocupes, con gusto te ayudamos 🙏 Voy a pasar tu solicitud a un operador para que registre tu turno de *Laboratorio*. Dame un momento.", hora: "10:06" },
      { autor: "bot", texto: "Mientras tanto, ¿me confirmas tu nombre completo y tu número de documento?", hora: "10:06" },
      { autor: "cliente", texto: "Carlos Mendoza Ríos, cédula 79.443.221", hora: "10:07" },
      { autor: "bot", texto: "Gracias, don Carlos. ¿Trae orden médica para el examen de laboratorio?", hora: "10:07" },
      { autor: "cliente", texto: "Si, me la dio el médico ayer", hora: "10:08" },
      { autor: "bot", texto: "Perfecto. Un operador está registrando tu turno ahora mismo…", hora: "10:08" },
      { autor: "bot", texto: "✅ ¡Listo! Un operador registró tu turno:\n\n• Turno: *L-018*\n• Servicio: Laboratorio\n• Paciente: Carlos Mendoza Ríos\n• Documento: 79.443.221\n\nHay 2 personas antes que tú. Tiempo estimado: ~22 min.", hora: "10:10" },
      { autor: "cliente", texto: "Muchísimas gracias, muy amables", hora: "10:10" },
      { autor: "bot", texto: "Con mucho gusto 💚 Recuerda presentar tu orden médica en la ventanilla. Te aviso cuando sea tu turno.", hora: "10:10" },
      { autor: "bot", texto: "🔔 Don Carlos, su turno *L-018* está próximo. Acérquese a la ventanilla 3 de Laboratorio.", hora: "10:30" },
      { autor: "bot", texto: "🔔 Es su turno. Pase a *Laboratorio, ventanilla 3*. 🙌", hora: "10:33" },
      { autor: "bot", texto: "Gracias por su visita 💚 Nos gustaría saber cómo le fue con la atención:", hora: "10:55", link: { label: "Responder encuesta", to: "/s/demo" } },
    ],
  },

  // ── 3. Paciente que saca turno en varias colas ──────────────────────────────
  {
    id: "c3",
    nombre: "Laura Torres",
    telefono: "+57 302 333 4455",
    escenario: "Creó turno en varias filas",
    mensajes: [
      { autor: "cliente", texto: "Buenas tardes, necesito que el doctor me revise unos resultados pero también me toca tomarme unos exámenes nuevos", hora: "11:02" },
      { autor: "bot", texto: "¡Buenas tardes! 👋 Con gusto te ayudo. Entonces necesitarías dos turnos:\n\n• *Consulta general* (para revisar resultados)\n• *Laboratorio* (para los exámenes nuevos)\n\n¿Los registro ambos?", hora: "11:02" },
      { autor: "cliente", texto: "Si por favor, los dos", hora: "11:03" },
      { autor: "bot", texto: "Perfecto. Empecemos con la *Consulta general*. ¿Tu nombre completo?", hora: "11:03" },
      { autor: "cliente", texto: "Laura Torres Gómez", hora: "11:03" },
      { autor: "bot", texto: "¿Tu número de documento?", hora: "11:03" },
      { autor: "cliente", texto: "1.098.334.221", hora: "11:04" },
      { autor: "bot", texto: "¿Y el motivo de la consulta?", hora: "11:04" },
      { autor: "cliente", texto: "Control, revisar resultados de exámenes anteriores", hora: "11:04" },
      { autor: "bot", texto: "🎫 Turno *A-044* en Consulta general registrado. Hay 4 personas antes que tú (~20 min).\n\nAhora el turno de *Laboratorio*. ¿Tienes la orden médica de los exámenes nuevos?", hora: "11:05" },
      { autor: "cliente", texto: "Si, aquí la tengo", hora: "11:05" },
      { autor: "bot", texto: "Perfecto. ¿Vienes en ayunas? Algunos exámenes lo requieren.", hora: "11:05" },
      { autor: "cliente", texto: "Si, no he desayunado", hora: "11:06" },
      { autor: "bot", texto: "🎫 Turno *L-020* en Laboratorio registrado. Hay 1 persona antes que tú (~12 min).\n\nResumen de tus turnos:\n• *L-020* — Laboratorio (más pronto)\n• *A-044* — Consulta general\n\nTe recomiendo hacer primero el laboratorio en ayunas y luego pasar a consulta. Te aviso de cada uno. 🔔", hora: "11:06" },
      { autor: "cliente", texto: "Excelente, muy organizados. Gracias", hora: "11:07" },
      { autor: "bot", texto: "🔔 Laura, tu turno *L-020* (Laboratorio) está próximo. Acércate a la ventanilla 2.", hora: "11:16" },
      { autor: "bot", texto: "🔔 Ahora tu turno *A-044* (Consulta general) está próximo. Pasa a la sala de espera del Consultorio 1.", hora: "11:45" },
      { autor: "bot", texto: "¡Gracias por tu visita, Laura! 💚 Cuéntanos cómo estuvo tu experiencia hoy:", hora: "12:20", link: { label: "Responder encuesta", to: "/s/demo" } },
    ],
  },
];
