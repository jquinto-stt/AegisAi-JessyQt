# -*- coding: utf-8 -*-
"""
gen-backlog-pedidos.py
======================
Escribe el backlog de PEDIDOS sobre la PLANTILLA EXACTA de ST&T
(`Plantilla_Backlog_Agil_Entregables_STT.docx`), sin reinventar estilo ni formato:
se clonan las estructuras de la propia plantilla (tabla de epicas, tarjeta de
historia, tabla de sprints) y solo se sustituye el contenido.

Salida: Pedidos_Backlog_Agil_Entregables_STT.docx

Contenido derivado de:
  Docs/Documentacion Funcional/Pedidos_Documentacion_Funcional_y_Alcance_STT.md
  (RF-01..RF-43, H-01..H-18)
"""
import copy
import os
import shutil
import sys

import docx
from docx.table import Table
from docx.text.paragraph import Paragraph

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"

BASE = r"C:\Users\Jessy\Documents\GitHub\StockFlow\Docs\Documentacion Funcional\backlogs"
SRC = os.path.join(BASE, "Plantilla_Backlog_Agil_Entregables_STT.docx")
DST = os.path.join(BASE, "Pedidos_Backlog_Agil_Entregables_STT.docx")
BAK = os.path.join(BASE, "Pedidos_Backlog_Agil_Entregables_STT.bak.docx")

AUTOR = "Jessy Quinto"
FECHA = "27/09/2026"
VERSION = "1.0"

OBJETIVO = (
    "Este documento define y prioriza los entregables (épicas e historias de usuario) del "
    "Módulo de Pedidos del proyecto Necto, sirviendo como backlog de referencia para la "
    "planeación de sprints o releases bajo el marco de trabajo scrum. Complementa el documento "
    "de \u201cDocumentación Funcional y Alcance de Producto\u201d de ST&T: cada historia se deriva de "
    "los requerimientos funcionales RF-01 a RF-43 declarados allí, y la columna Alcance (RFs) "
    "de la sección 2 deja trazable esa correspondencia."
)

# ══════════════════════════════════════════════════════════════════════════
# 2. ÉPICAS
# ══════════════════════════════════════════════════════════════════════════
EPICAS = [
    ("EP-01", "Resumen operativo del período",
     "Indicadores del período, gráfico de volumen con granularidad adaptativa, pedidos que "
     "requieren atención y distribución del trabajo en curso por estado.",
     "Saber cómo va la operación y qué exige atención ahora, sin recorrer el tablero.",
     "Must", "RF-01, RF-02"),

    ("EP-02", "Tablero de trabajo en curso",
     "Columnas por estado activo con su contador, tarjetas con avance directo, conmutador "
     "kanban/lista y filtro por modalidad.",
     "Operar el pipeline con visibilidad total y avanzar un pedido sin abrir su detalle.",
     "Must", "RF-03, RF-04, RF-05"),

    ("EP-03", "Alta manual de pedido",
     "Formulario por pasos con resumen en vivo, validaciones de cliente y dirección, ítems con "
     "catálogo rápido y cálculo del total a cobrar.",
     "Registrar un pedido en segundos sin dejar órdenes incompletas ni incoherentes.",
     "Must", "RF-06, RF-07, RF-08, RF-21"),

    ("EP-04", "Ciclo de vida, transiciones y cancelación",
     "Pipeline de ocho estados con omisión configurable de Confirmado y En camino, avance de un "
     "solo paso, cancelación con motivo e integridad del registro.",
     "Avanzar cada pedido sin ambigüedad y sin perder ningún registro al cerrarlo.",
     "Must", "RF-09, RF-10, RF-11, RF-43"),

    ("EP-05", "Pedidos programados",
     "Alta a una hora futura con calendario, activación manual y automática, reprogramación y "
     "sección de próximos programados.",
     "Atender pedidos a futuro sin que se pierdan ni entren al flujo antes de tiempo.",
     "Must", "RF-12, RF-13, RF-14"),

    ("EP-06", "Preparación, despacho y urgencia",
     "Avance por las etapas de producción, despacho a reparto solo en domicilio, cierre por "
     "entrega confirmada y marca de urgencia con tiempos objetivo.",
     "Sacar el pedido del tablero solo cuando está entregado y detectar lo que se demora.",
     "Must", "RF-15, RF-16, RF-17"),

    ("EP-07", "Logística de domicilio y direcciones frecuentes",
     "Dirección estructurada con apertura en Google Maps, costo de envío, asignación de "
     "repartidor y memoria de hasta cinco direcciones por teléfono.",
     "Despachar a la dirección correcta sin volver a teclear lo que el cliente ya dio.",
     "Should", "RF-18, RF-19"),

    ("EP-08", "Registro de pago y cálculo de cambio",
     "Método de pago, monto abonado por el cliente, cálculo del cambio y marca manual de pagado "
     "o pendiente con su reparto en la analítica.",
     "Distinguir lo cobrado de lo pendiente sin prometer un cobro que el sistema no procesa.",
     "Should", "RF-20, RF-28"),

    ("EP-09", "Historial y trazabilidad",
     "Tabla filtrable de pedidos terminales, mapa de actividad diaria navegable y detalle del "
     "pedido en solo lectura.",
     "Consultar el cierre de la operación y sostener una auditoría sin depender de la memoria.",
     "Should", "RF-22, RF-23, RF-24"),

    ("EP-10", "Analítica del módulo",
     "Seis indicadores del período, definición única de venta, distribuciones por canal, "
     "modalidad, estado y pago, vista de lista ordenable y exportación a CSV.",
     "Decidir con datos de operación y cerrar la discusión sobre qué cuenta como venta.",
     "Should", "RF-25, RF-26, RF-27, RF-29"),

    ("EP-11", "Configuración del módulo",
     "Estados opcionales, modalidades habilitadas, alias de nombres, horario comercial, umbral y "
     "tiempos objetivo, campana sonora y catálogo rápido.",
     "Adaptar el módulo al modo de operar del negocio sin tocar código.",
     "Must", "RF-30, RF-31, RF-32, RF-33, RF-34, RF-35"),

    ("EP-12", "Gobierno de acceso y transparencia de permisos",
     "Dieciocho capacidades agrupadas por área, roles de sistema, permisos por operador, "
     "presentación honesta de lo denegado y simulación de perfil.",
     "Que cada persona pueda hacer su trabajo y entienda por qué no puede hacer el resto.",
     "Must", "RF-36, RF-37, RF-38, RF-41"),

    ("EP-13", "Notificación y escritura al cliente",
     "Publicación de la plantilla de estado en el hilo del cliente y acceso directo a su "
     "conversación desde las superficies del pedido.",
     "Que el cliente se entere del avance sin que el negocio tenga que llamarlo.",
     "Should", "RF-39, RF-40"),

    ("EP-14", "Consulta por el asistente IA",
     "Herramientas de solo lectura sobre los pedidos, sujetas a la conexión del módulo y a las "
     "capacidades de la sesión.",
     "Responder preguntas de la operación sin recorrer pantallas, separando hechos de lecturas.",
     "Should", "RF-42"),

    ("EP-15", "Fase 2: persistencia, edición e integración con Inventario",
     "Backend persistente multidispositivo, interfaz de edición de órdenes sobre capacidades ya "
     "reservadas e integración de disponibilidad con Inventario. Fuera del MVP.",
     "Cerrar el riesgo estructural del módulo antes de cualquier uso real del negocio.",
     "Won't have (esta fase)", "H-15, H-16, H-17"),
]

# ══════════════════════════════════════════════════════════════════════════
# 3. HISTORIAS DE USUARIO   (ID, EP, MoSCoW, Estado, historia, [criterios])
# ══════════════════════════════════════════════════════════════════════════
HU = [
 ("HU-01", "EP-01", "Must", "Terminada",
  "Como administrador de tienda, quiero ver los indicadores del período en una sola pantalla, "
  "para saber cómo va la operación sin abrir el tablero.",
  ["El sistema debe mostrar cuatro indicadores: recibidos hoy, en curso, entregados hoy y programados.",
   "Debe permitir elegir Hoy, Esta semana, Semana pasada, Este mes o Últimos 3 meses.",
   "Toda cifra debe calcularse sobre los pedidos reales, sin series de relleno: una ventana sin "
   "actividad debe mostrar \u201cSin pedidos en el período seleccionado\u201d."]),

 ("HU-02", "EP-01", "Must", "Terminada",
  "Como administrador de tienda, quiero ver el volumen de pedidos por hora o por día, para "
  "reconocer los picos de demanda y dimensionar la operación.",
  ["El sistema debe mostrar el volumen por hora cuando el rango sea de un solo día y por día "
   "cuando abarque varios.",
   "Debe ofrecer los atajos Hoy, Ayer, Últimos 7 días y Últimos 30 días, y la acción \u201cVolver a "
   "esta semana\u201d para limpiar el rango.",
   "El conteo debe usar la fecha de calendario local del negocio, nunca el día universal."]),

 ("HU-03", "EP-01", "Must", "Terminada",
  "Como operador, quiero ver los pedidos que requieren atención ordenados por antigüedad, para "
  "atender primero lo que lleva más tiempo esperando.",
  ["El sistema debe listar los pedidos activos cuyo tiempo en el estado actual iguale o supere "
   "su tiempo objetivo, de mayor a menor antigüedad.",
   "No debe incluir pedidos terminales ni programados.",
   "Debe ocultar la lista cuando no haya pedidos que requieran atención."]),

 ("HU-04", "EP-01", "Should", "Terminada",
  "Como administrador de tienda, quiero ver la distribución del trabajo en curso por estado, "
  "para detectar dónde se está acumulando.",
  ["El sistema debe mostrar cada estado activo con su etiqueta y su contador.",
   "Debe excluir el estado Entregado, que vive en el historial.",
   "Debe mostrar cero cuando un estado no tenga pedidos."]),

 ("HU-05", "EP-02", "Must", "Terminada",
  "Como operador, quiero ver el trabajo en curso en columnas por estado, para saber de un "
  "vistazo qué hay que hacer ahora.",
  ["El sistema debe dibujar una columna por cada estado activo del pipeline con su etiqueta y "
   "su contador.",
   "Debe excluir del tablero el estado Entregado, que es terminal.",
   "Debe mostrar \u201cSin pedidos\u201d en una columna vacía."]),

 ("HU-06", "EP-02", "Must", "Terminada",
  "Como operador, quiero avanzar un pedido desde su propia tarjeta, para no tener que abrir su "
  "detalle.",
  ["El sistema debe ofrecer en la tarjeta las acciones de avance que la sesión puede ejecutar.",
   "La tarjeta debe mostrar número, cliente, modalidad, resumen de ítems, total y tiempo en el "
   "estado actual.",
   "No debe dibujar acciones que la sesión no puede ejecutar."]),

 ("HU-07", "EP-02", "Should", "Terminada",
  "Como operador, quiero alternar entre kanban y lista conservando mi preferencia, para elegir "
  "la vista según el momento de la jornada.",
  ["El sistema debe ofrecer un conmutador Kanban/Lista y conservar la elección entre sesiones.",
   "La lista debe mostrar las columnas Pedido, Estado, Modalidad, En estado y Acciones.",
   "Debe mostrar \u201cNo hay pedidos en curso\u201d cuando no haya ninguno."]),

 ("HU-08", "EP-02", "Should", "Terminada",
  "Como operador, quiero filtrar el tablero por modalidad, para concentrarme en el trabajo que "
  "despacho.",
  ["El sistema debe ofrecer \u201cTodas\u201d más las modalidades habilitadas en la configuración.",
   "Debe seguir mostrando los pedidos activos cuya modalidad se desactivó después de crearlos, "
   "para no ocultar trabajo existente.",
   "El filtro debe aplicar igual al tablero y a la vista de lista."]),

 ("HU-09", "EP-03", "Must", "Terminada",
  "Como operador, quiero registrar un pedido paso a paso con un resumen en vivo, para no "
  "equivocarme al teclearlo.",
  ["El sistema debe permitir registrar cliente, teléfono, modalidad, ítems, método de pago y "
   "notas.",
   "Debe mostrar en todo momento el resumen con el estado de entrada, los ítems y el total.",
   "Al crear, debe asignar un número consecutivo legible y mostrar la confirmación con número, "
   "cliente, modalidad, dirección si aplica y total a cobrar."]),

 ("HU-10", "EP-03", "Must", "Terminada",
  "Como operador, quiero que el sistema me impida crear un pedido incompleto, para no dejar "
  "órdenes que después no se pueden atender.",
  ["El sistema debe impedir el alta sin nombre de cliente, sin teléfono o con un teléfono de "
   "menos de siete dígitos.",
   "Debe exigir dirección cuando la modalidad sea domicilio.",
   "Debe mostrar el mensaje correspondiente en cada caso y no debe permitir el envío mientras "
   "exista un error."]),

 ("HU-11", "EP-03", "Must", "Terminada",
  "Como operador, quiero añadir, quitar y editar ítems con nombre, cantidad y precio, para "
  "reflejar exactamente lo que el cliente pidió.",
  ["El sistema debe exigir una cantidad mínima de uno por ítem.",
   "Debe autocompletar nombre y precio cuando el catálogo rápido tenga productos configurados.",
   "Cuando el catálogo esté vacío debe permitir escribir el nombre libremente, y debe permitir "
   "crear el pedido sin ítems."]),

 ("HU-12", "EP-03", "Must", "Terminada",
  "Como administrador de tienda, quiero que el total se calcule como suma de precio por "
  "cantidad más el envío, para saber cuánto cobrar sin hacer cuentas aparte.",
  ["El sistema debe calcular el subtotal como la suma de precio por cantidad de cada ítem.",
   "Debe sumar el costo de envío únicamente en los pedidos a domicilio y tratarlo como cero en "
   "las demás modalidades.",
   "Debe mostrar el total a pagar cuando sea mayor que cero."]),

 ("HU-13", "EP-04", "Must", "Terminada",
  "Como operador, quiero que el pedido recorra un pipeline de estados claro, para saber siempre "
  "en qué punto está.",
  ["El sistema debe implementar los estados Programado, Nuevo, Confirmado, En preparación, "
   "Listo, En camino y Entregado, con Cancelado alcanzable desde cualquier estado no terminal.",
   "Confirmado y En camino deben poder omitirse desde la configuración.",
   "En camino debe aplicar únicamente a los pedidos con modalidad domicilio."]),

 ("HU-14", "EP-04", "Must", "Terminada",
  "Como operador, quiero que el sistema solo me deje avanzar un paso, para que ningún pedido se "
  "salte etapas.",
  ["El sistema debe permitir únicamente el paso al siguiente estado válido del pipeline efectivo "
   "del pedido y debe rechazar cualquier otro destino.",
   "Un pedido en estado terminal no debe admitir ninguna transición.",
   "El avance a Entregado debe exigir confirmación explícita del usuario."]),

 ("HU-15", "EP-04", "Must", "Terminada",
  "Como operador, quiero cancelar un pedido con un motivo opcional, para dejar constancia de por "
  "qué no se entregó.",
  ["El sistema debe permitir cancelar desde cualquier estado no terminal y advertir que la "
   "acción es irreversible.",
   "Debe ofrecer un campo de motivo opcional y, si se escribe, anexarlo a las notas del pedido.",
   "El pedido cancelado debe conservarse y salir del tablero."]),

 ("HU-16", "EP-04", "Must", "Terminada",
  "Como administrador de tienda, quiero que ningún pedido se borre del registro, para poder "
  "auditarlo después de cerrado.",
  ["El sistema debe conservar todo pedido entregado o cancelado con su información completa.",
   "Debe registrar la fecha y hora de cierre.",
   "Ninguna acción del módulo debe eliminar un pedido del registro."]),

 ("HU-17", "EP-04", "Should", "Terminada",
  "Como operador, quiero saber que un pedido cerrado no se puede reabrir, para corregirlo por la "
  "vía correcta en vez de esperar una edición que no existe.",
  ["El sistema debe informar en el detalle de un pedido terminal que no admite modificaciones.",
   "Debe ofrecer la cancelación y la creación de un pedido nuevo como el camino para corregir.",
   "No debe ofrecer ninguna acción de edición."]),

 ("HU-18", "EP-05", "Must", "Terminada",
  "Como operador, quiero programar un pedido para una hora futura, para dejarlo listo sin que "
  "entre al flujo antes de tiempo.",
  ["El sistema debe permitir marcar un pedido como programado indicando fecha y hora futuras.",
   "Debe impedir seleccionar días pasados y franjas horarias ya vencidas, y rechazar el alta si "
   "la fecha no es futura.",
   "El pedido programado no debe contar como trabajo en curso ni entrar al historial."]),

 ("HU-19", "EP-05", "Must", "Terminada",
  "Como operador, quiero que los pedidos programados se activen solos al llegar su hora, para no "
  "tener que recordarlo.",
  ["El sistema debe activar automáticamente los pedidos programados cuya hora ya llegó, "
   "pasándolos a Nuevo.",
   "Debe permitir activarlos antes de tiempo de forma manual.",
   "La activación automática depende de que la aplicación esté abierta, y esa limitación debe "
   "estar declarada en el producto."]),

 ("HU-20", "EP-05", "Must", "Terminada",
  "Como operador, quiero reprogramar un pedido que aún no ha entrado al flujo, para ajustarlo "
  "cuando el cliente cambia de hora.",
  ["El sistema debe permitir reprogramar mientras el pedido siga en estado Programado.",
   "Debe exigir la capacidad de gestionar programados para la activación manual y la "
   "reprogramación.",
   "Sin esa capacidad, el pedido debe crearse activo y no programado."]),

 ("HU-21", "EP-05", "Should", "Terminada",
  "Como operador, quiero ver los próximos programados ordenados por cercanía, para prepararme "
  "con antelación.",
  ["El sistema debe mostrar una sección con los programados más inmediatos, un contador total y "
   "un acceso a la lista completa.",
   "Debe ofrecer buscador por número o cliente y filtro por modalidad.",
   "Debe ocultar la sección por completo cuando no haya programados."]),

 ("HU-22", "EP-06", "Must", "Terminada",
  "Como personal de preparación, quiero avanzar el pedido por las etapas de producción, para que "
  "el tablero refleje lo que está pasando en el local.",
  ["El sistema debe permitir pasar de Nuevo o Confirmado a En preparación, de En preparación a "
   "Listo y de Listo a En camino cuando la modalidad sea domicilio.",
   "Debe permitir el paso directo de Listo a Entregado en retiro y en sitio.",
   "No debe ofrecer En camino a un pedido que no sea a domicilio."]),

 ("HU-23", "EP-06", "Must", "Terminada",
  "Como operador, quiero confirmar la entrega de forma explícita, para que el pedido salga del "
  "tablero solo cuando el cliente lo recibió.",
  ["El sistema debe pedir confirmación antes de marcar un pedido como Entregado e informar que "
   "saldrá del tablero y pasará al historial.",
   "Al confirmar, debe registrar la fecha y hora de cierre.",
   "Debe ser el único avance del ciclo que exige confirmación explícita."]),

 ("HU-24", "EP-06", "Must", "Terminada",
  "Como operador, quiero ver qué pedidos llevan demasiado tiempo sin avanzar, para atender "
  "primero lo que se está demorando.",
  ["El sistema debe marcar como urgente todo pedido activo cuyos minutos en el estado actual "
   "igualen o superen su tiempo objetivo.",
   "Debe usar el tiempo objetivo del estado cuando esté definido y el umbral general cuando no "
   "lo esté.",
   "No debe marcar como urgentes los pedidos terminales ni los programados."]),

 ("HU-25", "EP-06", "Should", "Terminada",
  "Como administrador de tienda, quiero definir tiempos objetivo por estado, para que la marca "
  "de urgencia refleje mi operación y no un criterio ajeno.",
  ["El sistema debe permitir definir un umbral general en minutos y un tiempo objetivo por cada "
   "estado.",
   "Debe calcular el tiempo transcurrido desde la entrada al estado actual, no desde la creación "
   "del pedido.",
   "Debe dejar de marcar como urgente en cuanto el pedido avanza de estado."]),

 ("HU-26", "EP-07", "Must", "Terminada",
  "Como operador, quiero registrar la dirección estructurada del domicilio, para que el "
  "repartidor llegue sin llamadas de por medio.",
  ["El sistema debe solicitar y conservar calle, barrio, referencia e indicaciones cuando la "
   "modalidad sea domicilio.",
   "Debe informar explícitamente cuando un pedido a domicilio no tenga dirección registrada.",
   "Debe permitir abrir la dirección en Google Maps desde el detalle del pedido."]),

 ("HU-27", "EP-07", "Must", "Terminada",
  "Como operador, quiero asignar o cambiar el repartidor desde el pedido, para saber quién lo "
  "lleva.",
  ["El sistema debe permitir registrar y cambiar el repartidor desde el detalle del pedido.",
   "Debe conservar el valor anterior mientras no se cambie.",
   "No debe exigir que el repartidor exista como usuario del sistema."]),

 ("HU-28", "EP-07", "Should", "Terminada",
  "Como operador, quiero que el sistema recuerde las direcciones usadas por el mismo cliente, "
  "para no volver a teclearlas.",
  ["El sistema debe guardar hasta cinco direcciones por teléfono, de la más reciente a la más "
   "antigua.",
   "Debe ofrecerlas como direcciones frecuentes al crear un pedido del mismo cliente.",
   "Debe actualizar la existente en lugar de duplicarla cuando coincida la calle."]),

 ("HU-29", "EP-07", "Should", "Terminada",
  "Como operador, quiero que dos escrituras del mismo teléfono se reconozcan como el mismo "
  "cliente, para que la memoria de direcciones sirva de verdad.",
  ["El sistema debe comparar los teléfonos ignorando espacios, guiones y signos de formato.",
   "Debe aplicar el mismo criterio al cruzar el pedido con su conversación y con la memoria de "
   "direcciones.",
   "No debe crear un cliente nuevo por diferencias de presentación del número."]),

 ("HU-30", "EP-08", "Must", "Terminada",
  "Como operador, quiero registrar el método de pago del pedido, para saber después cómo se "
  "pagó.",
  ["El sistema debe permitir registrar efectivo, transferencia, tarjeta o contra entrega.",
   "Debe permitir indicar con cuánto abona el cliente cuando el pago sea en efectivo o contra "
   "entrega.",
   "Debe conservar el método registrado en el detalle del pedido."]),

 ("HU-31", "EP-08", "Must", "Terminada",
  "Como operador, quiero que el sistema calcule el cambio a devolver, para no equivocarme al "
  "entregar el dinero.",
  ["El sistema debe calcular el cambio como la diferencia entre lo que abona el cliente y el "
   "total del pedido.",
   "Debe validar que el monto cubra el total e informar el faltante cuando no alcance.",
   "Debe mostrar el cambio calculado antes de confirmar."]),

 ("HU-32", "EP-08", "Must", "Terminada",
  "Como operador, quiero marcar un pedido como pagado o pendiente, para saber qué está cobrado y "
  "qué no.",
  ["El sistema debe permitir alternar manualmente entre pagado y pendiente desde el detalle del "
   "pedido.",
   "La marca no debe derivarse automáticamente del estado del pedido.",
   "El sistema no debe presentar la marca como confirmación de un recaudo procesado."]),

 ("HU-33", "EP-08", "Should", "Terminada",
  "Como administrador de tienda, quiero ver el reparto entre pagados y pendientes del período, "
  "para saber cuánto está por cobrar.",
  ["El sistema debe mostrar el número y la cuota de pedidos pagados y no pagados.",
   "Ambos grupos deben sumar el total del período.",
   "Debe incluir en pendiente los pedidos creados sin dato de pago."]),

 ("HU-34", "EP-09", "Must", "Terminada",
  "Como administrador de tienda, quiero consultar los pedidos cerrados con filtros, para "
  "encontrar un pedido pasado sin revisar el tablero.",
  ["El sistema debe listar únicamente pedidos terminales, del cierre más reciente al más antiguo.",
   "Debe mostrar las columnas Pedido, Cliente, Modalidad, Estado, Cerrado y Acciones.",
   "Debe permitir filtrar por texto sobre cliente o número, por estado, por modalidad y por "
   "rango de fechas."]),

 ("HU-35", "EP-09", "Should", "Terminada",
  "Como administrador de tienda, quiero ver un mapa de actividad diaria, para reconocer los días "
  "de mayor movimiento.",
  ["El sistema debe dibujar una grilla por día con niveles de intensidad y un selector de "
   "ventana de 15, 30, 60, 90, 120, 240 o 360 días.",
   "Debe permitir seleccionar dos celdas para filtrar el historial por ese rango.",
   "El filtro por rango debe prevalecer sobre la ventana del mapa."]),

 ("HU-36", "EP-09", "Should", "Terminada",
  "Como administrador de tienda, quiero abrir un pedido cerrado en solo lectura, para revisar "
  "qué se vendió sin riesgo de modificarlo.",
  ["El sistema debe mostrar número, estado, cliente y teléfono, modalidad, fecha de cierre, "
   "dirección y repartidor cuando apliquen.",
   "Debe mostrar los ítems con subtotal, el costo de envío, el total, el método y el estado de "
   "pago, y las notas.",
   "No debe ofrecer ninguna acción de modificación."]),

 ("HU-37", "EP-09", "Could", "Terminada",
  "Como administrador de tienda, quiero que el sistema me diga cuándo no hay coincidencias en el "
  "historial, para no confundir un filtro vacío con una lista rota.",
  ["El sistema debe mostrar un mensaje explícito cuando el filtro no devuelva resultados.",
   "Debe conservar los filtros aplicados mientras el mensaje esté visible.",
   "No debe mostrar una tabla vacía sin explicación."]),

 ("HU-38", "EP-10", "Must", "Terminada",
  "Como administrador de tienda, quiero ver los indicadores de desempeño del período, para "
  "evaluar la operación con números y no con impresiones.",
  ["El sistema debe mostrar seis indicadores: pedidos del período, ingresos vendidos, ticket "
   "promedio, tasa de cancelación, tiempo de ciclo y pedidos en curso ahora.",
   "Debe permitir elegir entre Últimos 7 días, Últimos 30 días y Todo el historial.",
   "Debe declarar cuando una métrica no corresponda al período seleccionado."]),

 ("HU-39", "EP-10", "Must", "Terminada",
  "Como administrador de tienda, quiero una definición única de qué cuenta como venta, para que "
  "dos pantallas no me den cifras distintas del mismo período.",
  ["El sistema debe contar como venta todo pedido desde Confirmado en adelante, incluido "
   "Entregado.",
   "Debe excluir Nuevo, Programado y Cancelado.",
   "El ticket promedio debe dividirse entre los pedidos vendidos del período y no únicamente "
   "entre los entregados."]),

 ("HU-40", "EP-10", "Should", "Terminada",
  "Como administrador de tienda, quiero ver de dónde vienen los pedidos y cómo se reparten, para "
  "orientar la operación.",
  ["El sistema debe mostrar el reparto por canal de entrada, por modalidad de entrega y por "
   "estado del pipeline, con el número de pedidos y su cuota porcentual.",
   "Debe cubrir todas las claves de cada dimensión, mostrando cero cuando no haya pedidos, para "
   "que las series sean estables al cambiar de período.",
   "El reparto por canal debe distinguir WhatsApp de mostrador."]),

 ("HU-41", "EP-10", "Should", "Terminada",
  "Como administrador de tienda, quiero una lista detallada del período, para revisar pedido por "
  "pedido sin salir de la analítica.",
  ["El sistema debe ofrecer una vista de lista con buscador por cliente, número o teléfono y "
   "filtro por estado.",
   "Debe permitir ordenar por columna y paginar los resultados.",
   "Debe mantener los criterios aplicados al cambiar de página."]),

 ("HU-42", "EP-10", "Should", "Terminada",
  "Como administrador de tienda, quiero descargar lo que estoy viendo en CSV, para trabajarlo "
  "fuera del sistema.",
  ["El sistema debe descargar exactamente los pedidos que se están viendo, con los filtros "
   "aplicados.",
   "Las columnas deben incluir identificación, canal, modalidad, monto, estado y fecha.",
   "El archivo no debe incluir pedidos que no estén en la vista."]),

 ("HU-43", "EP-11", "Must", "Terminada",
  "Como administrador de tienda, quiero omitir los estados que mi negocio no usa, para que el "
  "pipeline refleje mi operación real.",
  ["El sistema debe permitir activar u omitir los estados Confirmado y En camino.",
   "Al omitir un estado, los pedidos que estuvieran en él deben reubicarse en el siguiente "
   "estado activo.",
   "Ningún pedido debe quedar inaccesible ni desaparecer del tablero."]),

 ("HU-44", "EP-11", "Must", "Terminada",
  "Como administrador de tienda, quiero elegir qué modalidades de entrega ofrezco, para no "
  "registrar pedidos que no puedo atender.",
  ["El sistema debe permitir activar y desactivar Retiro, Domicilio y En sitio.",
   "Debe impedir desactivar la última modalidad activa.",
   "Desactivar una modalidad debe impedir nuevos pedidos con esa modalidad sin alterar los ya "
   "creados."]),

 ("HU-45", "EP-11", "Should", "Terminada",
  "Como administrador de tienda, quiero ponerles mi propio nombre a los estados y a las "
  "modalidades, para que el tablero hable el idioma del negocio.",
  ["El sistema debe permitir definir un nombre propio para las columnas del tablero y para las "
   "modalidades.",
   "Debe usar el nombre estándar cuando el alias esté vacío.",
   "No debe alterar la identidad interna del estado ni su posición en el pipeline."]),

 ("HU-46", "EP-11", "Should", "Terminada",
  "Como administrador de tienda, quiero declarar mi horario comercial, para que el sistema me "
  "avise cuando estoy operando fuera de él.",
  ["El sistema debe permitir declarar los días laborales y las horas de apertura y cierre.",
   "Debe rechazar y avisar cuando la hora de cierre no sea posterior a la de apertura.",
   "Fuera del horario debe advertirlo al crear un pedido sin impedir el registro."]),

 ("HU-47", "EP-11", "Should", "Terminada",
  "Como administrador de tienda, quiero controlar la sensibilidad del aviso de urgencia, para "
  "que el sistema no me alerte de más ni de menos.",
  ["El sistema debe permitir definir un umbral general de minutos y tiempos objetivo por estado.",
   "Debe permitir encender o apagar el aviso sonoro y ajustar cada cuántos segundos se repite.",
   "Debe dejar de sonar cuando no haya pedidos que requieran atención."]),

 ("HU-48", "EP-11", "Should", "Terminada",
  "Como administrador de tienda, quiero mantener un catálogo rápido de productos con precio, "
  "para agilizar el alta de los pedidos frecuentes.",
  ["El sistema debe permitir agregar productos con nombre y precio y eliminarlos.",
   "Debe descartar los que no tengan nombre al guardar y normalizar el precio a un valor no "
   "negativo.",
   "Cuando el catálogo esté vacío debe informar que los ítems se ingresarán libremente."]),

 ("HU-49", "EP-12", "Must", "Terminada",
  "Como administrador de tienda, quiero que cada acción del módulo exija una capacidad concreta, "
  "para que nadie pueda hacer más de lo que le corresponde.",
  ["El sistema debe exigir una capacidad específica para ver órdenes, crear, confirmar, "
   "cancelar, ver y gestionar preparación, ver y gestionar programados, ver canales, responder "
   "en canales, ver y editar configuración y gestionar equipo.",
   "Las capacidades efectivas deben resultar de unir las del rol con las concedidas "
   "individualmente y restar las removidas.",
   "La denegación debe prevalecer siempre y, sin rol resoluble, el operador no debe tener "
   "ninguna capacidad."]),

 ("HU-50", "EP-12", "Must", "Terminada",
  "Como operador, quiero que el sistema no me muestre lo que no puedo hacer, o me explique por "
  "qué está deshabilitado, para no creer que la aplicación está rota.",
  ["El sistema no debe dibujar las acciones que la sesión no puede ejecutar dentro del tablero "
   "ni en los menús de pedido.",
   "Cuando ocultar un control engañaría al usuario, debe mostrarlo deshabilitado acompañado del "
   "motivo, indicando el permiso que falta.",
   "Debe existir un aviso explícito de modo solo lectura en la configuración cuando falte el "
   "permiso de guardado."]),

 ("HU-51", "EP-12", "Must", "Terminada",
  "Como administrador de tienda, quiero administrar roles y personas, para dar a cada quien "
  "exactamente lo que necesita.",
  ["El sistema debe permitir crear roles como paquetes de capacidades y asignarlos a las "
   "personas del equipo.",
   "Debe permitir conceder y remover capacidades a un operador por encima de su rol.",
   "Debe exigir la capacidad de gestionar equipo para cualquier cambio."]),

 ("HU-52", "EP-12", "Should", "Terminada",
  "Como administrador de tienda, quiero ver la aplicación con el perfil de otra persona, para "
  "verificar qué ve antes de darla por lista.",
  ["El sistema debe permitir ver la aplicación con el rol y las capacidades de otro operador.",
   "Debe indicarlo de forma visible mientras la simulación esté activa y permitir salir "
   "restaurando el estado previo.",
   "Durante la simulación, la autorización debe resolverse con el perfil simulado."]),

 ("HU-53", "EP-12", "Should", "Terminada",
  "Como administrador de tienda, quiero activar o desactivar el módulo completo, para controlar "
  "su disponibilidad sin perder información.",
  ["El sistema debe permitir activar y desactivar el módulo de Pedidos.",
   "Al desactivarlo, sus rutas deben redirigir a la configuración de módulos y su grupo debe "
   "desaparecer de la navegación.",
   "La desactivación no debe eliminar ningún dato del negocio."]),

 ("HU-54", "EP-13", "Should", "Terminada",
  "Como administrador de tienda, quiero que el cliente reciba un aviso cuando su pedido avanza, "
  "para no tener que llamarlo.",
  ["El sistema debe publicar la plantilla correspondiente en el hilo del cliente cuando el "
   "pedido avance a Confirmado, En preparación, Listo, En camino, Entregado o Cancelado.",
   "No debe publicar nada al pasar a Programado ni a Nuevo.",
   "Si el cliente no tiene conversación abierta no debe crearse una, y si la plantilla está "
   "vacía no debe publicarse nada."]),

 ("HU-55", "EP-13", "Should", "Terminada",
  "Como operador, quiero escribirle al cliente desde el pedido, para responderle sin buscar su "
  "conversación.",
  ["El sistema debe ofrecer la acción de escribir al cliente en las tarjetas, el detalle y el "
   "historial.",
   "Debe abrir la conversación existente dentro de la aplicación.",
   "Cuando el cliente no tenga conversación, la acción debe mostrarse deshabilitada explicando "
   "el motivo en lugar de crear un hilo vacío."]),

 ("HU-56", "EP-13", "Could", "Terminada",
  "Como administrador de tienda, quiero que la constancia del aviso se escriba antes de mover el "
  "estado, para que no se pierda si el avance falla.",
  ["El sistema debe escribir la constancia de la novedad antes de aplicar la transición de "
   "estado.",
   "Debe publicar la plantilla únicamente después de que el avance se haya aplicado.",
   "Si el avance falla, no debe quedar ninguna nota publicada."]),

 ("HU-57", "EP-14", "Should", "Terminada",
  "Como administrador de tienda, quiero preguntarle al asistente por la operación en lenguaje "
  "natural, para obtener respuestas sin recorrer pantallas.",
  ["El asistente debe exponer únicamente operaciones de lectura sobre Pedidos.",
   "Debe exigir la capacidad de ver órdenes y la conexión del módulo.",
   "No debe crear, modificar ni cancelar pedidos."]),

 ("HU-58", "EP-14", "Should", "Terminada",
  "Como administrador de tienda, quiero que el asistente separe los hechos de sus lecturas, para "
  "no decidir sobre una suposición.",
  ["El asistente debe separar los hechos leídos de los pedidos de sus interpretaciones.",
   "Debe etiquetar el nivel de confianza de toda observación derivada.",
   "No debe afirmar relaciones de causa."]),

 ("HU-59", "EP-14", "Should", "Terminada",
  "Como administrador de tienda, quiero que el asistente deje de responder sobre pedidos cuando "
  "el módulo se desconecta, para que no invente datos.",
  ["El asistente debe retirar sus herramientas sobre Pedidos cuando el módulo se desconecte.",
   "Debe informar que no puede responder en lugar de ofrecer datos parciales.",
   "Debe volver a exponerlas al reconectar el módulo."]),

 ("HU-60", "EP-15", "Won't have (esta fase)", "Por iniciar",
  "Como administrador de tienda, quiero que los pedidos se conserven entre dispositivos y "
  "recargas, para poder usar el módulo como registro real del negocio.",
  ["El sistema debe persistir pedidos y equipo en un backend y no solo en memoria.",
   "Debe sincronizar los cambios entre dispositivos.",
   "Debe migrar los datos existentes sin pérdida y sin cambiar los identificadores de pedido. "
   "Corresponde al hito H-15."]),

 ("HU-61", "EP-15", "Won't have (esta fase)", "Por iniciar",
  "Como administrador de tienda, quiero consultar la disponibilidad antes de confirmar un "
  "pedido, para no vender lo que no tengo.",
  ["El sistema debe consultar las existencias del módulo de Inventario al confirmar un pedido.",
   "Debe descontar las existencias consumidas y avisar cuando no alcancen.",
   "Corresponde al hito H-17 y está condicionado a que Inventario exista."]),
]

# ══════════════════════════════════════════════════════════════════════════
# 7. PLAN DE SPRINTS
# ══════════════════════════════════════════════════════════════════════════
SPRINTS = [
    ("Sprint 0", "31-ago → 02-sep-2026",
     "Cerrar la definición del alcance y dejar en pie el pipeline de estados y la configuración "
     "del módulo.",
     "HU-13, HU-43, HU-44, HU-45, HU-46"),
    ("Sprint 1", "03 → 05-sep-2026",
     "Dejar operativo el tablero y el alta manual de pedido de principio a fin.",
     "HU-05, HU-06, HU-07, HU-08, HU-09, HU-10, HU-11, HU-12"),
    ("Sprint 2", "07 → 10-sep-2026",
     "Cerrar el ciclo de vida: avance controlado, cancelación y pedidos programados.",
     "HU-14, HU-15, HU-16, HU-17, HU-18, HU-19, HU-20, HU-21"),
    ("Sprint 3", "10 → 12-sep-2026",
     "Completar preparación, urgencia, despacho a domicilio y cierre por entrega confirmada.",
     "HU-22, HU-23, HU-24, HU-25, HU-26, HU-27"),
    ("Sprint 4", "11 → 15-sep-2026",
     "Publicar el resumen operativo y el historial con trazabilidad.",
     "HU-01, HU-02, HU-03, HU-04, HU-34, HU-35, HU-36, HU-37"),
    ("Sprint 5", "14 → 17-sep-2026",
     "Publicar la analítica con una definición única de venta, su exportación y las direcciones "
     "frecuentes.",
     "HU-28, HU-29, HU-38, HU-39, HU-40, HU-41, HU-42"),
    ("Sprint 6", "16 → 18-sep-2026",
     "Cerrar el registro de pago y el gobierno de acceso por capacidades.",
     "HU-30, HU-31, HU-32, HU-33, HU-49, HU-50, HU-51, HU-52, HU-53"),
    ("Sprint 7", "21 → 26-sep-2026",
     "Cerrar configuración avanzada, canal de WhatsApp y asistente; UAT del negocio sobre el "
     "alcance del MVP.",
     "HU-47, HU-48, HU-54, HU-55, HU-56, HU-57, HU-58, HU-59"),
    ("Sprint 8", "29-sep → 03-oct-2026",
     "Abrir la Fase 2: backend persistente, edición de órdenes e integración con Inventario "
     "(hitos H-15 a H-17).",
     "HU-60, HU-61"),
]

# ══════════════════════════════════════════════════════════════════════════
# utilidades de manipulación
# ══════════════════════════════════════════════════════════════════════════
def blocks(doc):
    for c in doc.element.body.iterchildren():
        if c.tag == W + "p":
            yield Paragraph(c, doc)
        elif c.tag == W + "tbl":
            yield Table(c, doc)


def set_text(par, text):
    """Sustituye el texto conservando el formato del primer run."""
    runs = par.runs
    if runs:
        runs[0].text = text
        for r in runs[1:]:
            r._element.getparent().remove(r._element)
    else:
        par.add_run(text)


def set_cell_lines(cell, lines):
    """Escribe varias líneas en una celda, reutilizando el formato del primer párrafo."""
    paras = cell.paragraphs
    for p in paras[1:]:
        p._element.getparent().remove(p._element)
    p0 = cell.paragraphs[0]
    set_text(p0, lines[0] if lines else "")
    prev = p0._element
    for line in lines[1:]:
        new = copy.deepcopy(p0._element)
        prev.addnext(new)
        prev = new
        set_text(Paragraph(new, cell), line)


def set_cell(cell, text):
    set_cell_lines(cell, [text])


def parrafo_separador(doc, alto_pt=30):
    """Parrafo vacio de altura exacta, para separar dos tablas contiguas.

    Word FUSIONA dos `w:tbl` adyacentes sin parrafo entre ellas: 61 tarjetas
    pegadas se convierten en una sola tabla de 244 filas y desaparece el hueco
    entre tarjetas (medido: `Tables.Count` = 6 en Word frente a 66 en el XML).

    El companero lo resuelve envolviendo cada tarjeta en un `w:sdt`, pero ese
    control viene de una ida y vuelta por Google Docs (`w:tag="goog_rdk_0"`) y
    lleva `w:lock w:val="contentLocked"`: su contenido NO se puede editar en
    Word. Se prefiere el separador, que deja el backlog editable.

    `lineRule="exact"` fija la altura al valor pedido sea cual sea la fuente.
    """
    p = doc.element.body.makeelement(W + "p", {})
    pPr = p.makeelement(W + "pPr", {})
    p.append(pPr)
    sp = p.makeelement(W + "spacing", {})
    sp.set(W + "before", "0")
    sp.set(W + "after", "0")
    sp.set(W + "line", str(int(round(alto_pt * 20))))
    sp.set(W + "lineRule", "exact")
    pPr.append(sp)
    return p


def clear_shading(cell):
    tcPr = cell._tc.tcPr
    if tcPr is None:
        return
    shd = tcPr.find(W + "shd")
    if shd is not None:
        tcPr.remove(shd)


def _runs(cell):
    for p in cell.paragraphs:
        for r in p.runs:
            if r.text.strip():
                yield r


def sin_cursiva(cell):
    """Quita w:i / w:iCs de todos los runs de la celda.

    La fila de ejemplo de la plantilla va en cursiva (valores en gris italica);
    Referidos y Reservas la quitaron en control de versiones, epicas y sprints.
    """
    for r in _runs(cell):
        rPr = r._element.find(W + "rPr")
        if rPr is None:
            continue
        for tag in ("i", "iCs"):
            el = rPr.find(W + tag)
            if el is not None:
                rPr.remove(el)


def con_cursiva(cell):
    """Fuerza w:i / w:iCs en todos los runs de la celda (valores de tarjeta)."""
    for r in _runs(cell):
        rPr = r._element.find(W + "rPr")
        if rPr is None:
            rPr = r._element.makeelement(W + "rPr", {})
            r._element.insert(0, rPr)
        for tag in ("i", "iCs"):
            el = rPr.find(W + tag)
            if el is None:
                el = rPr.makeelement(W + tag, {})
                rPr.append(el)
            el.attrib.pop(W + "val", None)          # <w:i/> = cursiva activa


def add_column(table, width_dxa):
    """Añade una columna al final clonando la última, con el ancho indicado."""
    tbl = table._tbl
    grid = tbl.find(W + "tblGrid")
    cols = grid.findall(W + "gridCol")
    gc = copy.deepcopy(cols[-1])
    gc.set(W + "w", str(width_dxa))
    grid.append(gc)
    for tr in tbl.findall(W + "tr"):
        tcs = tr.findall(W + "tc")
        new = copy.deepcopy(tcs[-1])
        tcPr = new.find(W + "tcPr")
        if tcPr is not None:
            tcW = tcPr.find(W + "tcW")
            if tcW is not None:
                tcW.set(W + "w", str(width_dxa))
        tr.append(new)


def set_tbl_width(table, total_dxa, fixed=True):
    """Fija tblW y, opcionalmente, tblLayout=fixed.

    La plantilla deja tblLayout en auto: al ensanchar la rejilla Word
    recalcularía los anchos. El companero (Referidos/Reservas) usa fixed en
    todas sus tablas, de modo que la rejilla es la que manda. Solo se aplica
    donde la rejilla se cambia a proposito.
    """
    tbl = table._tbl
    pr = tbl.find(W + "tblPr")
    if pr is None:
        pr = tbl.makeelement(W + "tblPr", {})
        tbl.insert(0, pr)
    tblW = pr.find(W + "tblW")
    if tblW is None:
        tblW = pr.makeelement(W + "tblW", {})
        pr.append(tblW)
    tblW.set(W + "w", str(total_dxa))
    tblW.set(W + "type", "dxa")
    if fixed:
        lay = pr.find(W + "tblLayout")
        if lay is None:
            lay = pr.makeelement(W + "tblLayout", {})
            pr.append(lay)
        lay.set(W + "type", "fixed")


def set_grid(table, widths):
    tbl = table._tbl
    grid = tbl.find(W + "tblGrid")
    cols = grid.findall(W + "gridCol")
    for gc, w in zip(cols, widths):
        gc.set(W + "w", str(w))
    for tr in tbl.findall(W + "tr"):
        for tc, w in zip(tr.findall(W + "tc"), widths):
            tcPr = tc.find(W + "tcPr")
            if tcPr is None:
                continue
            tcW = tcPr.find(W + "tcW")
            if tcW is not None:
                tcW.set(W + "w", str(w))


def clone_row(table, src_row_idx):
    """Clona una fila y la inserta TRAS la ultima existente.

    No se usa append: `w:tbl` debe terminar en `w:tr`, y el orden de hijos
    (tblPr, tblGrid, tr*) se rompe si hay cualquier otro nodo final.
    """
    tbl = table._tbl
    trs = tbl.findall(W + "tr")
    tr = copy.deepcopy(trs[src_row_idx])
    trs[-1].addnext(tr)
    return Table(tbl, table._parent)


def grow_rows(table, total_objetivo, plantilla_idx):
    """Deja la tabla con exactamente `total_objetivo` filas, clonando la fila dada."""
    for _ in range(total_objetivo - len(table.rows)):
        clone_row(table, plantilla_idx)


def remove_element(el):
    el.getparent().remove(el)


# ══════════════════════════════════════════════════════════════════════════
# construcción
# ══════════════════════════════════════════════════════════════════════════
def main():
    if os.path.exists(DST) and not os.path.exists(BAK):
        shutil.copyfile(DST, BAK)
        print("respaldo ->", os.path.basename(BAK))

    shutil.copyfile(SRC, DST)
    doc = docx.Document(DST)

    # ---------------------------------------------------------------- portada
    for p in doc.paragraphs:
        t = p.text.strip()
        if t == "PLANTILLA ESTÁNDAR":
            set_text(p, "PEDIDOS")
        elif t.startswith("[ Nombre del producto"):
            set_text(p, "Módulo de Pedidos / Necto")

    # ------------------------------------------- propiedades del documento
    # La plantilla deja su propio dc:title («Plantilla Estándar - Backlog
    # Ágil…») en docProps/core.xml. No se ve en el cuerpo, pero sí en
    # Archivo > Propiedades y en el panel de metadatos del PDF: es el mismo
    # tipo de resto que un marcador [ … ]. Referidos y Reservas no lo llevan.
    cp = doc.core_properties
    cp.title = "Pedidos — Backlog Ágil: Épicas, Historias de Usuario y Entregables"
    cp.subject = "Módulo de Pedidos / Necto"
    cp.category = "Backlog ágil"
    cp.comments = f"Backlog ágil del módulo de Pedidos. Autor: {AUTOR}. Versión {VERSION}, {FECHA}."

    # --------------------------------------------------- metadatos (tabla 0)
    meta = doc.tables[0]
    valores = ["ST&T", "Scrum", VERSION, FECHA, AUTOR]
    for i, v in enumerate(valores):
        set_cell(meta.cell(i, 1), v)

    # ------------------------------------- control de versiones (tabla 1)
    # La plantilla trae 3 filas (cabecera + 1 dato + 1 vacia); Referidos y
    # Reservas traen 4. Se iguala a 4 clonando la fila vacia (idx 2), para no
    # arrastrar el tinte E8F1FF de la fila de datos.
    cv = doc.tables[1]
    grow_rows(cv, 4, 2)
    for j, v in enumerate([VERSION, FECHA, AUTOR, "Versión inicial del backlog"]):
        set_cell(cv.cell(1, j), v)
        clear_shading(cv.cell(1, j))
        sin_cursiva(cv.cell(1, j))

    # -------------------------------------------------- secciones de guía
    body = doc.element.body
    # 1) fuera el bloque "Cómo usar esta plantilla"
    started = False
    to_remove = []
    for b in list(blocks(doc)):
        if isinstance(b, Paragraph) and b.style is not None and b.style.name == "Heading 1":
            if b.text.strip() == "Cómo usar esta plantilla":
                started = True
                to_remove.append(b)
                continue
            if started:
                break
        if started:
            to_remove.append(b)
    for b in to_remove:
        remove_element(b._element)

    # 2) fuera las guías de diligenciamiento
    for p in list(doc.paragraphs):
        if p.text.strip().startswith("Guía de diligenciamiento"):
            remove_element(p._element)

    # 3) fuera las notas de la plantilla en "Tabla de contenido"
    for p in list(doc.paragraphs):
        if p.text.strip().startswith("Este índice se actualiza automáticamente"):
            remove_element(p._element)

    # ------------------------------------------- 1. objetivo del documento
    for p in doc.paragraphs:
        if p.text.strip().startswith("[ Este documento define y prioriza"):
            set_text(p, OBJETIVO)
            break

    # -------------------------------------------------- 2. épicas (tabla 2)
    ep = doc.tables[2]
    # Anchos tomados de Referidos (el genero del companero): suman 9360 = ancho
    # util real de la pagina (pgSz 12240 - margenes 1440/1440). La plantilla
    # usaba 9260 con 5 columnas; al anadir la 6a el companero la ensancho a 9360.
    ANCHOS = [705, 1215, 3030, 1755, 1095, 1560]      # suma 9360
    add_column(ep, ANCHOS[-1])
    set_grid(ep, ANCHOS)
    set_tbl_width(ep, sum(ANCHOS))

    header = ["ID", "Épica", "Descripción", "Objetivo de negocio", "Prioridad", "Alcance (RFs)"]
    for j, h in enumerate(header):
        set_cell(ep.cell(0, j), h)

    grow_rows(ep, len(EPICAS) + 1, 3)                 # +1 por la cabecera

    for i, e in enumerate(EPICAS):
        r = i + 1
        for j, v in enumerate(e):
            set_cell(ep.cell(r, j), v)
            clear_shading(ep.cell(r, j))
            sin_cursiva(ep.cell(r, j))

    # ---------------------------------------- 3. tarjetas de historia
    # La plantilla trae dos tarjetas 4x4 con la etiqueta "ID historia" en la
    # esquina: la de ejemplo (HU-01) y la vacia ([ HU-02 ]). Se detectan por esa
    # etiqueta y no por la forma, porque la tabla de sprints tambien es 4x4.
    cards = [
        t for t in doc.tables
        if len(t.rows) == 4 and len(t.columns) == 4
        and t.cell(0, 0).text.strip() == "ID historia"
    ]
    ejemplo = blank = None
    for t in cards:
        if t.cell(0, 1).text.strip().startswith("[ HU-02 ]"):
            blank = t
        elif t.cell(0, 1).text.strip().startswith("HU-01"):
            ejemplo = t
    if ejemplo is None or blank is None:
        raise SystemExit("no encontré las dos tarjetas de la plantilla (ejemplo y vacía)")

    # El molde es la tarjeta de EJEMPLO, no la vacía: la de ejemplo lleva los
    # valores en gris cursiva (i sin val = activa) y es la que reproduce el
    # genero del companero. La vacía tiene <w:i w:val="false"/> en todas las
    # celdas MENOS en "[ Por iniciar / En curso… ]", de modo que clonarla deja
    # 61 tarjetas con el estado en cursiva y el resto recto.
    anchor = ejemplo._tbl
    prev = anchor
    creadas = []
    for i in range(len(HU)):
        new = copy.deepcopy(anchor)
        prev.addnext(new)
        prev = new
        creadas.append(Table(new, doc))
        # separador entre tarjetas, salvo despues de la ultima
        if i < len(HU) - 1:
            sep = parrafo_separador(doc)
            prev.addnext(sep)
            prev = sep

    remove_element(ejemplo._tbl)
    remove_element(blank._tbl)

    for t, h in zip(creadas, HU):
        hid, hep, hprio, hestado, historia, criterios = h
        set_cell(t.cell(0, 1), hid)
        set_cell(t.cell(0, 3), hep)
        set_cell(t.cell(1, 1), hprio)
        set_cell(t.cell(1, 3), hestado)
        set_cell(t.cell(2, 1), historia)
        set_cell_lines(t.cell(3, 1), criterios)
        # se declara la regla en vez de confiar en lo heredado del molde
        for c in (t.cell(0, 1), t.cell(0, 3), t.cell(1, 1), t.cell(1, 3),
                  t.cell(2, 1), t.cell(3, 1)):
            con_cursiva(c)

    # ------------------------------------------- 7. sprints (última tabla)
    spr = doc.tables[-1]
    grow_rows(spr, len(SPRINTS) + 1, 3)               # +1 por la cabecera
    for i, s in enumerate(SPRINTS):
        r = i + 1
        for j, v in enumerate(s):
            set_cell(spr.cell(r, j), v)
            clear_shading(spr.cell(r, j))
            sin_cursiva(spr.cell(r, j))

    doc.save(DST)

    # ------------------------------------------------ verificación mecánica
    chk = docx.Document(DST)
    informe = verificar(chk)
    print("OK ->", DST)
    print(f"   épicas={len(EPICAS)}  historias={len(HU)}  sprints={len(SPRINTS)}")
    for linea in informe:
        print("   " + linea)
    return 0


# ══════════════════════════════════════════════════════════════════════════
# verificación: se mide el documento guardado, no la intención del código
# ══════════════════════════════════════════════════════════════════════════
def verificar(d):
    fallos = []
    ok = []

    def check(cond, msg):
        (ok if cond else fallos).append(msg)

    # --- tablas y su forma
    ep = d.tables[2]
    check(len(ep.rows) == len(EPICAS) + 1, f"épicas: {len(ep.rows)} filas (esperado {len(EPICAS) + 1})")
    check(len(ep.columns) == 6, f"épicas: {len(ep.columns)} columnas (esperado 6)")
    grid = ep._tbl.find(W + "tblGrid")
    anchos = [int(gc.get(W + "w")) for gc in grid.findall(W + "gridCol")]
    check(sum(anchos) == 9360, f"épicas: suma de rejilla {sum(anchos)} (esperado 9360)")
    check(
        [c.text.strip() for c in ep.rows[0].cells]
        == ["ID", "Épica", "Descripción", "Objetivo de negocio", "Prioridad", "Alcance (RFs)"],
        "épicas: cabecera de 6 columnas correcta",
    )

    cv = d.tables[1]
    check(len(cv.rows) == 4, f"control de versiones: {len(cv.rows)} filas (esperado 4)")

    spr = d.tables[-1]
    check(len(spr.rows) == len(SPRINTS) + 1, f"sprints: {len(spr.rows)} filas (esperado {len(SPRINTS) + 1})")

    # --- tarjetas de historia: se cuentan por la etiqueta, no por la forma
    tarjetas = [
        t for t in d.tables
        if len(t.rows) == 4 and len(t.columns) == 4
        and t.cell(0, 0).text.strip() == "ID historia"
    ]
    check(len(tarjetas) == len(HU), f"tarjetas de historia: {len(tarjetas)} (esperado {len(HU)})")

    ids = [t.cell(0, 1).text.strip() for t in tarjetas]
    check(ids == [h[0] for h in HU], "las tarjetas van en orden HU-01 … HU-%02d sin huecos" % len(HU))

    # Word fusiona tablas adyacentes: ninguna puede tocar a la siguiente
    seq = [c.tag.split("}")[1] for c in d.element.body]
    pegadas = sum(1 for a, b in zip(seq, seq[1:]) if a == "tbl" and b == "tbl")
    check(pegadas == 0, f"ninguna tabla pegada a la siguiente ({pegadas} pares adyacentes)")
    separadores = seq.count("p")
    check(separadores >= len(HU) - 1, f"separadores entre tarjetas ({separadores} párrafos en el cuerpo)")

    # el merge de las filas 2 y 3 (gridSpan=3) debe sobrevivir al clonado
    mal_merge = 0
    for t in tarjetas:
        for r in (2, 3):
            tc = t.rows[r]._tr.findall(W + "tc")
            if len(tc) != 2:
                mal_merge += 1
                continue
            span = tc[1].find(W + "tcPr")
            gs = span.find(W + "gridSpan") if span is not None else None
            if gs is None or gs.get(W + "val") != "3":
                mal_merge += 1
    check(mal_merge == 0, f"merge gridSpan=3 intacto en filas 2-3 ({mal_merge} tarjetas mal)")

    vacias = [i for i, t in enumerate(tarjetas) if not t.cell(2, 1).text.strip()]
    check(not vacias, f"ninguna tarjeta sin historia ({len(vacias)} vacías)")
    sin_crit = [i for i, t in enumerate(tarjetas) if not t.cell(3, 1).text.strip()]
    check(not sin_crit, f"ninguna tarjeta sin criterios de aceptación ({len(sin_crit)} vacías)")

    # --- sombreado: la fila de datos no puede conservar el tinte E8F1FF
    def tintes(tabla, filas):
        out = []
        for r in filas:
            for c in tabla.rows[r].cells:
                tcPr = c._tc.tcPr
                s = tcPr.find(W + "shd") if tcPr is not None else None
                if s is not None:
                    out.append(s.get(W + "fill"))
        return [x for x in out if x and x.lower() != "auto"]

    for nombre, tabla, filas in (
        ("épicas", ep, range(1, len(ep.rows))),
        ("sprints", spr, range(1, len(spr.rows))),
        ("control de versiones", cv, [1]),
    ):
        t = tintes(tabla, filas)
        check(not t, f"{nombre}: filas de datos sin tinte ({t})")

    # --- la cabecera sí debe seguir sombreada en 06153C
    for nombre, tabla in (("épicas", ep), ("sprints", spr), ("control de versiones", cv)):
        tcPr = tabla.rows[0].cells[0]._tc.tcPr
        s = tcPr.find(W + "shd") if tcPr is not None else None
        fill = s.get(W + "fill") if s is not None else None
        check(
            fill is not None and fill.lower() == "06153c",
            f"{nombre}: cabecera sombreada 06153C (leído {fill})",
        )

    # --- restos de plantilla
    texto = "\n".join(p.text for p in d.paragraphs)
    for marca in ("Guía de diligenciamiento", "Cómo usar esta plantilla",
                  "[ Nombre del equipo ]", "[ HU-02 ]", "PLANTILLA ESTÁNDAR"):
        check(marca not in texto, f"sin restos de plantilla: {marca!r}")
    check(not any(t.cell(0, 1).text.strip().startswith("[") for t in tarjetas),
          "ninguna tarjeta con marcador [ … ]")

    # --- autor y fechas
    meta = d.tables[0]
    vals = [meta.cell(i, 1).text.strip() for i in range(len(meta.rows))]
    check(vals[0] == "ST&T", f"metadatos: equipo {vals[0]!r}")
    check(vals[1] == "Scrum", f"metadatos: marco {vals[1]!r}")
    check(vals[2] == VERSION, f"metadatos: versión {vals[2]!r}")
    check(vals[3] == FECHA, f"metadatos: fecha {vals[3]!r}")
    check(vals[4] == AUTOR, f"metadatos: autor {vals[4]!r}")
    check(cv.rows[1].cells[2].text.strip() == AUTOR, "control de versiones: autor")

    # --- propiedades del documento: nada de la plantilla
    cp = d.core_properties
    check(bool(cp.title) and "Plantilla" not in cp.title,
          f"docProps: título propio (leído {cp.title!r})")
    check("Pedidos" in (cp.title or ""), "docProps: el título nombra el módulo")

    # --- cursiva: la regla del genero, medida celda por celda
    def estados(cell):
        out = set()
        for p in cell.paragraphs:
            for r in p.runs:
                if not r.text.strip():
                    continue
                rPr = r._element.find(W + "rPr")
                i = rPr.find(W + "i") if rPr is not None else None
                if i is None:
                    out.add("recta")
                else:
                    out.add("cursiva" if i.get(W + "val") in (None, "1", "true", "on") else "recta")
        return out

    def celdas(tabla, filas, cols):
        for r in filas:
            for j in cols:
                yield tabla.cell(r, j)

    # portada: valores en cursiva (plantilla y ambos referentes coinciden)
    mal = [c.text.strip() for c in celdas(meta, range(len(meta.rows)), [1]) if estados(c) - {"cursiva"}]
    check(not mal, f"metadatos: valores en cursiva ({len(mal)} rectos)")

    # tablas de datos: sin cursiva
    for nombre, tabla, filas in (
        ("control de versiones", cv, [1]),
        ("épicas", ep, range(1, len(ep.rows))),
        ("sprints", spr, range(1, len(spr.rows))),
    ):
        mal = [c.text.strip()[:20] for c in celdas(tabla, filas, range(len(tabla.columns)))
               if "cursiva" in estados(c)]
        check(not mal, f"{nombre}: valores sin cursiva ({len(mal)} en cursiva: {mal[:3]})")

    # tarjetas: los seis valores en cursiva
    mal = 0
    for t in tarjetas:
        for c in (t.cell(0, 1), t.cell(0, 3), t.cell(1, 1), t.cell(1, 3), t.cell(2, 1), t.cell(3, 1)):
            if estados(c) - {"cursiva"}:
                mal += 1
    check(mal == 0, f"tarjetas: valores en cursiva ({mal} celdas rectas)")

    lineas = [f"FALLOS {len(fallos)}"] if fallos else ["sin fallos"]
    if fallos:
        lineas += ["  ✗ " + f for f in fallos]
    lineas += [f"  ✓ {len(ok)} comprobaciones"]
    return lineas


if __name__ == "__main__":
    # --verificar : audita el DST tal como esta en disco, sin regenerarlo.
    # Hace falta porque Word reescribe el .docx al actualizar el campo del
    # indice, y ese guardado puede alterar formato sin que el generador lo sepa.
    if len(sys.argv) > 1 and sys.argv[1] == "--verificar":
        if not os.path.exists(DST):
            raise SystemExit("no existe " + DST)
        print("verificando", DST)
        for linea in verificar(docx.Document(DST)):
            print("   " + linea)
        sys.exit(0)
    sys.exit(main())
