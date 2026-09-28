import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls
import sys

sys.stdout.reconfigure(encoding='utf-8')

plantilla_path = r"C:\Users\Jessy\Documents\GitHub\StockFlow\Docs\Documentacion Funcional\Plantilla_Documentacion_Funcional_y_Alcance_STT.docx"
salida_docx = r"C:\Users\Jessy\Documents\GitHub\StockFlow\Docs\Documentacion Funcional\Conversaciones_Documentacion_Funcional_y_Alcance_STT.docx"
salida_md = r"C:\Users\Jessy\Documents\GitHub\StockFlow\Docs\Documentacion Funcional\Conversaciones_Documentacion_Funcional_y_Alcance_STT.md"

doc = docx.Document(plantilla_path)

# 1. Portada exacta de la plantilla ST&T
p2 = doc.paragraphs[2]
p2.text = ""
p2.paragraph_format.space_before = Pt(36)
p2.paragraph_format.space_after = Pt(4)
r2 = p2.add_run("CONVERSACIONES")
r2.bold = True
r2.font.size = Pt(22.0)
r2.font.color.rgb = RGBColor(0x06, 0x15, 0x3C)

p3 = doc.paragraphs[3]
p3.text = ""
p3.paragraph_format.space_before = Pt(0)
p3.paragraph_format.space_after = Pt(2)
r3 = p3.add_run("Documentación Funcional y Alcance de Producto")
r3.bold = True
r3.font.size = Pt(16.0)
r3.font.color.rgb = RGBColor(0x00, 0x79, 0xFF)

p4 = doc.paragraphs[4]
p4.text = ""
p4.paragraph_format.space_before = Pt(0)
p4.paragraph_format.space_after = Pt(20)
r4 = p4.add_run("Módulo de Conversaciones Multicanal (WhatsApp, Telegram, Instagram y Facebook) / Necto")
r4.bold = False
r4.font.size = Pt(11.0)
r4.font.color.rgb = RGBColor(0x59, 0x59, 0x59)

# Tabla 0 de metadatos en portada
t0 = doc.tables[0]
meta_vals = [
    ("Cliente / Área solicitante:", "ST&T"),
    ("Versión del documento:", "1.0"),
    ("Fecha de elaboración:", "25/09/2026"),
    ("Elaborado por:", "Jessy Quinto T"),
    ("Clasificación:", "Interno"),
]
for idx, (label, val) in enumerate(meta_vals):
    c0 = t0.rows[idx].cells[0]
    c0.text = ""
    p_c0 = c0.paragraphs[0]
    p_c0.paragraph_format.space_before = Pt(0)
    p_c0.paragraph_format.space_after = Pt(0)
    r_c0 = p_c0.add_run(label)
    r_c0.bold = True
    r_c0.font.size = Pt(10.0)
    r_c0.font.color.rgb = RGBColor(0x06, 0x15, 0x3C)
    
    c1 = t0.rows[idx].cells[1]
    c1.text = ""
    p_c1 = c1.paragraphs[0]
    p_c1.paragraph_format.space_before = Pt(0)
    p_c1.paragraph_format.space_after = Pt(0)
    r_c1 = p_c1.add_run(val)
    r_c1.bold = False
    r_c1.font.size = Pt(10.0)
    r_c1.font.color.rgb = RGBColor(0x26, 0x26, 0x26)

# Eliminar elementos de relleno de la plantilla posterior a Tabla 0
t0_tbl = t0._tbl
found_t0 = False
to_remove = []
for child in list(doc._element.body):
    if child == t0_tbl:
        found_t0 = True
        continue
    if found_t0 and not child.tag.endswith('sectPr'):
        to_remove.append(child)

for child in to_remove:
    doc._element.body.remove(child)

style_h1 = doc.styles['Heading1']
style_h2 = doc.styles['Heading2']

# Funciones de estilo exactas ST&T
def add_h1(text):
    p = doc.add_paragraph(style=style_h1)
    p.text = ""
    p.paragraph_format.space_before = Pt(16)
    p.paragraph_format.space_after = Pt(6)
    r = p.add_run(text)
    r.bold = True
    r.font.size = Pt(14.0)
    r.font.color.rgb = RGBColor(0x06, 0x15, 0x3C)
    return p

def add_h2(text):
    p = doc.add_paragraph(style=style_h2)
    p.text = ""
    p.paragraph_format.space_before = Pt(12)
    p.paragraph_format.space_after = Pt(4)
    r = p.add_run(text)
    r.bold = True
    r.font.size = Pt(12.0)
    r.font.color.rgb = RGBColor(0x00, 0x79, 0xFF)
    return p

def add_h3(text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(8)
    p.paragraph_format.space_after = Pt(2)
    r = p.add_run(text)
    r.bold = True
    r.font.size = Pt(10.5)
    r.font.color.rgb = RGBColor(0x06, 0x15, 0x3C)
    return p

def add_p(text, bold_prefix=None, space_after=4):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing = 1.15
    if bold_prefix:
        r_pre = p.add_run(bold_prefix)
        r_pre.bold = True
        r_pre.font.size = Pt(10.0)
        r_pre.font.color.rgb = RGBColor(0x06, 0x15, 0x3C)
    r = p.add_run(text)
    r.font.size = Pt(10.0)
    r.font.color.rgb = RGBColor(0x26, 0x26, 0x26)
    return p

def add_bullet(text, bold_prefix=None):
    p = doc.add_paragraph()
    p.paragraph_format.left_indent = Inches(0.25)
    p.paragraph_format.space_before = Pt(1)
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.line_spacing = 1.15
    
    r_bullet = p.add_run("• ")
    r_bullet.bold = True
    r_bullet.font.size = Pt(10.0)
    r_bullet.font.color.rgb = RGBColor(0x06, 0x15, 0x3C)
    
    if bold_prefix:
        r_pre = p.add_run(bold_prefix)
        r_pre.bold = True
        r_pre.font.size = Pt(10.0)
        r_pre.font.color.rgb = RGBColor(0x06, 0x15, 0x3C)
    r = p.add_run(text)
    r.font.size = Pt(10.0)
    r.font.color.rgb = RGBColor(0x26, 0x26, 0x26)
    return p

def add_callout(text, title=None, border_color="0079FF", bg_color="F0F7FF"):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(6)
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.left_indent = Inches(0.25)
    p.paragraph_format.line_spacing = 1.15
    
    pBdr = parse_xml(f'<w:pBdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:left w:val="single" w:sz="24" w:space="8" w:color="{border_color}"/></w:pBdr>')
    p._p.get_or_add_pPr().append(pBdr)
    shd = parse_xml(f'<w:shd xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" w:fill="{bg_color}"/>')
    p._p.get_or_add_pPr().append(shd)
    
    if title:
        r_title = p.add_run(title + "\n")
        r_title.bold = True
        r_title.font.size = Pt(10.0)
        r_title.font.color.rgb = RGBColor(0x06, 0x15, 0x3C)
    
    r = p.add_run(text)
    r.font.size = Pt(9.5)
    r.font.color.rgb = RGBColor(0x26, 0x26, 0x26)
    return p

def add_code_block(text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(4)
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.left_indent = Inches(0.2)
    p.paragraph_format.line_spacing = 1.0
    r = p.add_run(text)
    r.font.name = "Consolas"
    r.font.size = Pt(8.5)
    r.font.color.rgb = RGBColor(0x26, 0x26, 0x26)
    
    pBdr = parse_xml(r'<w:pBdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:left w:val="single" w:sz="18" w:space="8" w:color="06153C"/></w:pBdr>')
    p._p.get_or_add_pPr().append(pBdr)
    shd = parse_xml(r'<w:shd xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" w:fill="F4F6F9"/>')
    p._p.get_or_add_pPr().append(shd)
    return p

def set_cell(cell, text, bold=False, color_rgb=(38,38,38), size_pt=9.0, fill_hex=None, align=WD_ALIGN_PARAGRAPH.LEFT, top=60, bottom=60, left=100, right=100):
    cell.text = ""
    tcPr = cell._tc.get_or_add_tcPr()
    if fill_hex:
        shd_xml = f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>'
        tcPr.append(parse_xml(shd_xml))
    mar_xml = f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>'
    tcPr.append(parse_xml(mar_xml))
    valign_xml = f'<w:vAlign {nsdecls("w")} w:val="center"/>'
    tcPr.append(parse_xml(valign_xml))
    
    p = cell.paragraphs[0]
    p.alignment = align
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(0)
    r = p.add_run(text)
    r.bold = bold
    r.font.name = "Calibri"
    r.font.size = Pt(size_pt)
    r.font.color.rgb = RGBColor(*color_rgb)

def add_stt_table(headers, data, widths=None, zebra=True, first_col_bold=False):
    t = doc.add_table(rows=len(data) + 1, cols=len(headers))
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    
    tblPr = t._tbl.tblPr
    tblBorders = parse_xml(
        f'<w:tblBorders {nsdecls("w")}>'
        f'<w:top w:val="single" w:sz="4" w:space="0" w:color="CFCFCF"/>'
        f'<w:left w:val="single" w:sz="4" w:space="0" w:color="CFCFCF"/>'
        f'<w:bottom w:val="single" w:sz="4" w:space="0" w:color="CFCFCF"/>'
        f'<w:right w:val="single" w:sz="4" w:space="0" w:color="CFCFCF"/>'
        f'<w:insideH w:val="single" w:sz="4" w:space="0" w:color="E0E0E0"/>'
        f'<w:insideV w:val="none"/>'
        f'</w:tblBorders>'
    )
    tblPr.append(tblBorders)
    
    hdr_row = t.rows[0]
    trPr = hdr_row._tr.get_or_add_trPr()
    trPr.append(parse_xml(f'<w:tblHeader {nsdecls("w")}/>'))
    trPr.append(parse_xml(f'<w:cantSplit {nsdecls("w")}/>'))
    
    for c_idx, h_text in enumerate(headers):
        cell = hdr_row.cells[c_idx]
        set_cell(cell, h_text, bold=True, color_rgb=(255, 255, 255), size_pt=9.5, fill_hex="06153C", align=WD_ALIGN_PARAGRAPH.LEFT, top=80, bottom=80)
        
    for r_idx, row_data in enumerate(data):
        row = t.rows[r_idx + 1]
        trPr = row._tr.get_or_add_trPr()
        trPr.append(parse_xml(f'<w:cantSplit {nsdecls("w")}/>'))
        fill = "F7F9FC" if (zebra and r_idx % 2 == 1) else "FFFFFF"
        for c_idx, val in enumerate(row_data):
            cell = row.cells[c_idx]
            is_bold = first_col_bold and (c_idx == 0)
            color = (6, 21, 60) if is_bold else (38, 38, 38)
            set_cell(cell, str(val), bold=is_bold, color_rgb=color, size_pt=9.0, fill_hex=fill, align=WD_ALIGN_PARAGRAPH.LEFT)
            
    if widths:
        for row in t.rows:
            for idx, w in enumerate(widths):
                if idx < len(row.cells):
                    row.cells[idx].width = w
                
    p_sp = doc.add_paragraph()
    p_sp.paragraph_format.space_before = Pt(0)
    p_sp.paragraph_format.space_after = Pt(4)
    return t

print("Compilando Documentación Funcional Exhaustiva de Conversaciones (WhatsApp, Telegram, Instagram y Facebook)...")

# Salto de página tras portada oficial
doc.add_page_break()

# CONTROL DE VERSIONES
add_h1("CONTROL DE VERSIONES")
versiones_headers = ["Versión", "Fecha", "Autor", "Descripción del cambio"]
versiones_data = [
    ["1.0", "25/09/2026", "Jessy Quinto T", "Versión oficial de alcance funcional del módulo de Conversaciones Multicanal con canales operativos (WhatsApp Business Cloud API y Telegram Bot API) y especificación técnica exhaustiva para canales Meta (Instagram Direct Messages y Facebook Messenger Platform)."],
    ["1.1", "25/09/2026", "Jessy Quinto T", "Incorporación de trazabilidad IA bajo demanda, tarjetas interactivas de pedido inline, sincronización en tiempo real vía Supabase Realtime Channels y burbujas ergonómicas adaptativas w-fit."],
]
add_stt_table(versiones_headers, versiones_data, [Inches(0.8), Inches(1.0), Inches(1.5), Inches(3.5)], zebra=True, first_col_bold=True)

# APROBACIONES
add_h1("APROBACIONES")
aprobaciones_headers = ["Rol", "Nombre", "Cargo", "Firma", "Fecha"]
aprobaciones_data = [
    ["Patrocinador / Sponsor", "Dirección de Tecnología", "Sponsor Ejecutivo ST&T", "", "25/09/2026"],
    ["Líder de producto", "Product Management", "Líder de Producto Necto", "", "25/09/2026"],
    ["Líder técnico", "Jessy Quinto T", "Senior Architect / Tech Lead", "", "25/09/2026"],
    ["Stakeholder Operativo", "Operaciones y Soporte", "Líder de Mesa de Ayuda", "", "25/09/2026"],
]
add_stt_table(aprobaciones_headers, aprobaciones_data, [Inches(1.5), Inches(1.5), Inches(1.8), Inches(1.0), Inches(1.0)], zebra=True, first_col_bold=True)

# TABLA DE CONTENIDO
add_h1("TABLA DE CONTENIDO")
add_p("Este índice resume la estructura y capítulos contenidos en el presente documento oficial:")
add_bullet("1. Objetivo del documento y marco de trabajo")
add_bullet("2. Descripción general del producto y arquitectura omnicanal")
add_bullet("3. Alcance funcional (Dentro del alcance, Fuera de alcance y Deuda técnica)")
add_bullet("4. Actores y matriz de gobierno de accesos (RBAC)")
add_bullet("5. Canales de mensajería y modelo de integración (WhatsApp, Telegram, Instagram y Facebook)")
add_bullet("6. Especificación detallada de ENTRADAS (Qué entra: Webhooks, Payloads, NLU e Identidades)")
add_bullet("7. Motor conversacional, intenciones y máquinas de estados (Ticket FSM y Ordering FSM)")
add_bullet("8. Especificación detallada de SALIDAS (Qué sale: Mensajes, Pedidos, Realtime y Handoff)")
add_bullet("9. Superficies operativas del sistema (BandejaLista, ChatView adaptativo, ContextPanel, Historial y Config)")
add_bullet("10. Reglas de negocio e invariantes de consistencia (C1 a C10)")
add_bullet("11. Modelo de datos relacional y persistencia en Supabase")
add_bullet("12. Casos de uso y flujos detallados de interacción")
add_bullet("13. Historial de entregables y roadmap de producto")

# 1. OBJETIVO DEL DOCUMENTO
add_h1("1. OBJETIVO DEL DOCUMENTO")
add_p("Este documento formaliza y describe de manera exhaustiva el alcance funcional, arquitectónico y operativo del Módulo de Conversaciones Multicanal de la plataforma Necto. Su propósito primordial es establecer un contrato técnico y de producto inequívoco entre ST&T, la dirección de tecnología, los líderes de ingeniería, los equipos de operaciones y el área de aseguramiento de calidad (QA).")
add_p("El documento detalla con máxima precisión qué información entra al sistema (inbound webhooks, mensajes, audios, payloads, identidades de usuario), cómo es procesada (clasificación de intención con NLU, máquinas de estados discretas, handoff automático/manual) y qué información sale (respuestas omnicanal, órdenes hacia Pedidos, sockets en tiempo real y notificaciones de derivación).")
add_p("Convención de lectura de capacidades: las funcionalidades construidas, probadas y operativas en producción se presentan sin marcas especiales; las capacidades en fase de integración o roadmap para canales adicionales (Instagram Direct y Facebook Messenger) se declaran explícitamente con su arquitectura de homologación, garantizando total transparencia.")

# 2. DESCRIPCIÓN GENERAL DEL PRODUCTO
add_h1("2. DESCRIPCIÓN GENERAL DEL PRODUCTO")
add_h2("2.1 Qué es el Módulo de Conversaciones")
add_p("El Módulo de Conversaciones es la consola unificada de atención y ventas conversacionales de Necto. Actúa como el centro neurálgico donde convergen todos los canales de mensajería instantánea del negocio:")
add_bullet("Canal prioritario de ventas en Latinoamérica, operando con WhatsApp Business Cloud API vía gateway Zernio.", "WhatsApp Business: ")
add_bullet("Canal de soporte y transacciones rápidas sin restricciones de ventana horaria, vía Telegram Bot API.", "Telegram: ")
add_bullet("Canal de captación de leads visuales, respuestas a Historias (Story Mentions) y DMs desde campañas de influencers.", "Instagram Direct Messages: ")
add_bullet("Canal de conversión desde Facebook Ads (Click-to-Messenger), catálogo de Fan Page y consultas de Marketplace.", "Facebook Messenger: ")
add_p("A diferencia de un chat tradicional o un CRM desvinculado, Conversaciones está acoplado de forma nativa a los módulos de negocio de Necto (Pedidos e Inventario). Esto permite que el diálogo no sea meramente informativo, sino transaccional: el cliente puede consultar el menú, armar su carrito, registrar su dirección, generar un pedido operativo en tiempo real y consultar el estado de despacho sin salir de su aplicación de mensajería.")

add_h2("2.2 Qué problema resuelve")
add_bullet("Falta de visibilidad de ventas y dispersión de mensajes entre diferentes celulares y cuentas de redes sociales.", "Dispersión multicanal: ")
add_bullet("Retrasos graves en la primera respuesta que ocasionan pérdida inmediata de clientes potenciales.", "Latencia de atención: ")
add_bullet("Operadores que deben alternar manualmente entre chats de WhatsApp/Instagram y el software de pedidos.", "Fricción operativa: ")
add_bullet("Pérdida del contexto del cliente cuando un operador toma el turno de otro, obligando al cliente a repetir su solicitud.", "Ceguera de contexto: ")
add_bullet("Falta de métricas objetivas sobre tiempos de atención, volumen por canal y efectividad de resolución de la IA.", "Ausencia de analítica: ")

add_h2("2.3 Contexto de negocio y propuesta de valor")
add_p("Para un comercio minorista, restaurante o negocio de servicios en Colombia y Latinoamérica, las redes sociales y aplicaciones de mensajería representan el canal de más alta conversión:")
add_bullet("El bot atiende el 70%+ de las consultas frecuentes y conduce la toma de pedidos 24/7 sin intervención humana.", "Atención continua 24/7: ")
add_bullet("Cuando la conversación requiere juicio comercial o soporte complejo, se realiza un traspaso suave con historial completo hacia el asesor.", "Handoff transparente: ")
add_bullet("Cada confirmación en el chat se traduce de forma inmediata en una tarjeta en el Tablero Kanban de Pedidos.", "Transaccionalidad nativa: ")
add_bullet("Un solo operador puede atender simultáneamente conversaciones de WhatsApp, Telegram, Instagram y Facebook desde una misma pantalla.", "Consolidación omnicanal: ")

# 3. ALCANCE DEL MÓDULO
add_h1("3. ALCANCE DEL MÓDULO")
add_h2("3.1 Matriz de Canales en Alcance")
canales_matriz_headers = ["Canal", "Protocolo / Proveedor", "Estado en Necto", "Tipo de Interacción Soportada", "Identificador Canónico"]
canales_matriz_data = [
    ["WhatsApp Business", "Meta Cloud API / Gateway Zernio", "Operativo v1.0", "Texto, botones rápidos, radio lists, notas de voz, plantillas HSM.", "Teléfono E.164 (+57...)"],
    ["Telegram", "Telegram Bot API (Webhook / Polling)", "Operativo v1.0", "Texto MarkdownV2, Inline Keyboards, comandos barra (/menu), notas de voz.", "chat_id numérico ('tg:...')"],
    ["Instagram Direct", "Meta Messenger Platform / Graph API v21.0", "Roadmap Integrado", "DMs de texto, respuestas a historias (Story Mentions), imágenes, Quick Replies.", "IGSID / @usuario"],
    ["Facebook Messenger", "Meta Messenger Platform / Graph API v21.0", "Roadmap Integrado", "Texto enriquecido, carruseles de productos, postbacks, Click-to-Messenger Ads.", "PSID (Page-Scoped ID)"],
]
add_stt_table(canales_matriz_headers, canales_matriz_data, [Inches(1.2), Inches(1.8), Inches(1.1), Inches(1.8), Inches(1.1)], zebra=True, first_col_bold=True)

add_h2("3.2 Capacidades Funcionales en Alcance (In Scope)")
add_bullet("Recepción y procesamiento de eventos entrantes vía webhooks HTTP/HTTPS con validación de seguridad de firma HMAC.", "Ingesta Multicanal: ")
add_bullet("Bandeja unificada con filtros reactivos (todas, sin atender, en espera, en curso, cerradas) y buscador instantáneo.", "Consola de Operador: ")
add_bullet("Hilo de conversación con burbujas adaptativas al ancho del contenido (w-fit), avatares de canal e insignia de IA.", "ChatView Adaptativo: ")
add_bullet("Botón discreto en la burbuja del bot para desplegar un modal con el flujo de ejecución, módulo clasificado y acción ejecutada.", "Trazabilidad IA On-Demand: ")
add_bullet("Tarjeta interactiva de pedido incrustada dentro del mensaje del bot con número WEB-XXXX, total en $COP y botón directo.", "Tarjeta de Pedido Inline: ")
add_bullet("Panel lateral integrado que consulta en tiempo real el historial de compras y montos del cliente actual.", "Panel de Contexto Modular: ")
add_bullet("Transición atómica entre atención por bot y atención por asesor humano ('Tomar chat', 'Devolver al bot', 'Resolver').", "Gobierno de Handoff: ")
add_bullet("Sincronización instantánea de nuevos mensajes y cambios de estado vía Supabase Realtime Channels.", "Tiempo Real: ")

add_h2("3.3 Fuera del alcance (Out of Scope)")
add_bullet("Necto no construye una infraestructura celular propia; se conecta a las APIs oficiales de Meta y Telegram.", "Proveedor de red GSM: ")
add_bullet("El procesamiento bancario ocurre en pasarelas externas o terminales de pago; el chat valida la confirmación y captura el método.", "Pasarela de adquirencia directa: ")
add_bullet("No se permite spam masivo ni prospección no autorizada que viole las políticas comerciales de Meta.", "Campañas masivas de cold-messaging: ")

add_h2("3.4 Deuda técnica declarada")
add_bullet("Actualmente las sesiones de diferentes redes se identifican por identificadores nativos; la unificación cross-channel de un mismo cliente con múltiples cuentas requiere vinculación manual o coincidencia estricta de teléfono.", "Unificación cross-channel de identidad: ")
add_bullet("El procesamiento de notas de voz en WhatsApp/Telegram utiliza transcripción estructurada en servidor Node; la inferencia de audio en segundo plano se procesa sincrónicamente en el webhook.", "Cola asíncrona de audio: ")

# 4. ACTORES Y ROLES (RBAC)
add_h1("4. ACTORES Y ROLES (RBAC)")
add_p("El acceso al módulo de Conversaciones está regulado por el sistema de Control de Acceso Basado en Capacidades (RBAC) de Necto:")

rbac_headers = ["Capacidad de Sistema", "Descripción Funcional", "Admin", "Supervisor", "Asesor / Operador", "Solo Lectura"]
rbac_data = [
    ["conversations.read", "Visualizar la bandeja multicanal y leer los hilos de mensajes.", "Sí", "Sí", "Sí", "Sí"],
    ["conversations.reply", "Escribir y enviar mensajes manuales de cara al cliente desde la consola.", "Sí", "Sí", "Sí", "No"],
    ["conversations.assign", "Tomar hilos ('Tomar chat'), asignarlos a otros asesores o devolverlos al bot.", "Sí", "Sí", "Sí", "No"],
    ["conversations.close", "Cerrar y archivar hilos resueltos ('Resolver conversación').", "Sí", "Sí", "Sí", "No"],
    ["conversations.export", "Exportar transcripciones históricas y reportes de atención.", "Sí", "Sí", "No", "No"],
    ["conversations.config", "Configurar conectores de canal (tokens, webhooks, credenciales Meta/Telegram).", "Sí", "No", "No", "No"],
]
add_stt_table(rbac_headers, rbac_data, [Inches(1.8), Inches(2.2), Inches(0.6), Inches(0.8), Inches(1.1), Inches(0.8)], zebra=True, first_col_bold=True)

# 5. CANALES Y MODELO DE INTEGRACIÓN
add_h1("5. CANALES DE MENSAJERÍA Y MODELO DE INTEGRACIÓN")
add_p("Necto implementa un patrón arquitectónico de Gateway de Mensajería Normalizado (Normalized Messaging Gateway). Todos los canales externos son transformados en adaptadores hacia un contrato interno común (Mensaje, Contacto, Conversacion) desacoplando la lógica de negocio de los protocolos particulares de cada red.")

add_h2("5.1 WhatsApp Business Cloud API (Operativo)")
add_bullet("Integración directa mediante Meta Graph API v21.0 y gateway de alto rendimiento Zernio.", "Conexión Oficial: ")
add_bullet("Teléfono en formato internacional E.164 (+573145376069).", "Identificador canónico: ")
add_bullet("Texto libre, mensajes interactivos con botones (Quick Replies), listas desplegables (Radio Lists), plantillas HSM aprobadas y notas de voz en formato OGG/Opus.", "Capacidades de mensaje: ")
add_bullet("Ventana de atención estándar de 24 horas posterior al último mensaje entrante del usuario para mensajes libres; plantillas HSM para notificaciones fuera de ventana.", "Políticas Meta: ")

add_h2("5.2 Telegram Bot API (Operativo)")
add_bullet("Integración bidireccional vía Telegram Bot API oficial (modo Webhook y modo Polling para desarrollo local).", "Conexión Oficial: ")
add_bullet("ID numérico único de usuario en Telegram (chat_id, ej. '7965993532') normalizado internamente con prefijo 'tg:'.", "Identificador canónico: ")
add_bullet("Mensajes con formato MarkdownV2, Inline Keyboards interactivos, comandos de barra (/menu, /pedido, /soporte) y notas de voz en formato OGG.", "Capacidades de mensaje: ")
add_bullet("Sin ventana restrictiva de 24 horas; el bot puede emitir actualizaciones proactivas de pedidos al usuario mientras conserve el chat activo.", "Políticas Telegram: ")

add_h2("5.3 Instagram Direct Messages (Roadmap Meta Graph API)")
add_bullet("Conexión mediante Meta Messenger Platform para Cuentas Profesionales de Instagram (Instagram Messaging API sobre Graph API v21.0).", "Conexión Oficial: ")
add_bullet("Instagram Scoped ID (IGSID) único asignado por la página de la marca. Se resuelve mediante Graph API para obtener el handle público (@usuario), nombre de perfil y foto de avatar.", "Identificador canónico: ")
add_bullet("`instagram_manage_messages`, `pages_manage_metadata`, `pages_read_engagement`, `instagram_basic`.", "Permisos de App Meta: ")
add_bullet("Mensajes directos de texto, respuestas a historias de la marca (Story Mentions / Story Replies), imágenes de productos, Quick Replies y botones Ice Breakers para preguntas frecuentes al iniciar.", "Capacidades de mensaje: ")
add_bullet("Ventana de atención estándar de 24 horas. Soporte de etiqueta `HUMAN_AGENT` que extiende la ventana hasta 7 días para casos atendidos por asesores humanos de soporte.", "Políticas y Ventana: ")
add_bullet("Badge distintivo en BandejaLista con gradiente morado-fucsia-naranja oficial de Instagram y enlace directo al perfil del cliente.", "Visualización en UI: ")

add_h2("5.4 Facebook Messenger Platform (Roadmap Meta Graph API)")
add_bullet("Conexión mediante Messenger Platform Webhooks vinculada a la Fan Page corporativa de Facebook.", "Conexión Oficial: ")
add_bullet("Page-Scoped ID (PSID) emitido por Meta para cada usuario que interactúa con la página de Facebook.", "Identificador canónico: ")
add_bullet("`pages_messaging`, `pages_show_list`.", "Permisos de App Meta: ")
add_bullet("Texto enriquecido, carruseles horizontales de productos (Generic Templates con imagen, título, precio en COP y botón 'Comprar'), botones de URL directa y respuestas sugeridas.", "Capacidades de mensaje: ")
add_bullet("Soporte nativo para Click-to-Messenger Ads (reconocimiento automático del `ad_id` o anuncio desde el cual ingresó el cliente para personalizar el saludo).", "Integración Publicitaria: ")
add_bullet("Handover Protocol de Meta para coordinar la entrega de hilo de atención entre Chatbot Necto y Meta Business Suite Inbox.", "Protocolo Handover: ")
add_bullet("Badge distintivo en BandejaLista con color azul Messenger oficial de Facebook.", "Visualización en UI: ")

# 6. ESPECIFICACIÓN DETALLADA DE ENTRADAS (QUÉ ENTRA)
add_h1("6. ESPECIFICACIÓN DETALLADA DE ENTRADAS (QUÉ ENTRA)")
add_p("A continuación se describe rigurosamente cada componente de información que ingresa al módulo de Conversaciones a través de los canales soportados:")

add_h2("6.1 Ingesta de Webhooks HTTP/HTTPS y Contratos de Entrada")
add_p("El sistema expone endpoints seguros para la recepción de eventos en tiempo real:")
add_code_block("POST /api/webhooks/whatsapp   (Firma: X-Hub-Signature-256 - Meta Cloud API / Zernio)\nPOST /api/webhooks/telegram   (Token secreto en cabecera: X-Telegram-Bot-Api-Secret-Token)\nPOST /api/webhooks/instagram  (Firma: X-Hub-Signature-256 - Meta Messenger Platform / Instagram)\nPOST /api/webhooks/messenger  (Firma: X-Hub-Signature-256 - Meta Messenger Platform / Facebook)")

add_p("Estructura de entrada normalizada que extrae el webhook (Inbound Event Payload):")
webhook_headers = ["Campo Entrada", "Tipo de Dato", "Origen / Canal", "Descripción y Regla de Negocio"]
webhook_data = [
    ["canal", "enum ('whatsapp'|'telegram'|'instagram'|'facebook')", "HTTP Router", "Identifica la red por la que ingresó el paquete de datos."],
    ["senderId", "string", "Meta / Telegram", "Identificador único del remitente (teléfono E.164, chat_id, IGSID o PSID)."],
    ["senderName", "string opcional", "Perfil público", "Nombre de perfil o handle (@usuario) reportado por la plataforma."],
    ["messageId", "string", "ID de proveedor", "Identificador único global del mensaje para descarte de duplicados (Idempotencia)."],
    ["timestamp", "integer (Epoch ms)", "Cabecera mensaje", "Marca de tiempo exacta del envío en los servidores del canal."],
    ["tipoContenido", "enum", "Extractor", "'texto', 'audio', 'boton_click', 'seleccion_lista', 'ubicacion', 'imagen', 'story_mention'."],
    ["cuerpoTexto", "string opcional", "Mensaje usuario", "Texto crudo enviado por el usuario o texto transcrito si proviene de nota de voz."],
    ["payloadBoton", "string opcional", "Botón / Lista / Postback", "Valor oculto del botón interactivo o carrusel pulsado (ej. 'CONFIRMAR_PEDIDO_WEB-0010')."],
    ["referralAdId", "string opcional", "Meta Ads", "ID del anuncio de Facebook/Instagram desde el cual el usuario abrió la conversación."],
    ["coordenadas", "objeto lat/lng opcional", "Location pin", "Ubicación geográfica compartida para entrega a domicilio."],
]
add_stt_table(webhook_headers, webhook_data, [Inches(1.2), Inches(1.3), Inches(1.3), Inches(3.2)], zebra=True, first_col_bold=True)

add_h2("6.2 Pipeline de Clasificación e Inferencia NLU")
add_p("Una vez normalizado el mensaje entrante, el motor de NLU (Natural Language Understanding) clasifica la intención del cliente:")
add_bullet("El cliente saluda, pregunta horarios, ubicación de la sede o políticas generales. Enruta a Base de Conocimiento.", "Intención 'faq': ")
add_bullet("El cliente solicita la carta, lista de precios o fotos de artículos. Enruta al Catálogo de Pedidos.", "Intención 'menu_catalogo': ")
add_bullet("El cliente pregunta si queda existencia de un artículo específico ('¿tienen pechuga?'). Enruta a consulta en solo lectura del Inventario.", "Intención 'inventario': ")
add_bullet("El cliente indica cantidades, sabores, combos o pide armar una orden ('quiero pedir 2 combos'). Activa la FSM de Construcción de Carrito.", "Intención 'pedido_creacion': ")
add_bullet("El cliente pregunta por un pedido previo ('¿dónde viene mi orden?'). Consulta en PedidosStore por el pedido activo del teléfono.", "Intención 'pedido_seguimiento': ")
add_bullet("El cliente solicita explícitamente una persona ('quiero hablar con un asesor', 'humano', 'queja'). Dispara el flujo de Handoff.", "Intención 'handoff': ")

# 7. MOTOR CONVERSACIONAL Y MÁQUINAS DE ESTADOS
add_h1("7. MOTOR CONVERSACIONAL Y MÁQUINAS DE ESTADOS")
add_p("El comportamiento de cada conversación está estrictamente gobernado por dos máquinas de estados ortogonales: la Máquina de Estados del Hilo (ciclo de vida del ticket) y la Máquina FSM de Transacción (creación de órdenes).")

add_h2("7.1 Máquina de Estados del Hilo de Conversación")
estados_headers = ["Estado", "Modo Atención", "Responsable", "Significado Operativo y Transiciones"]
estados_data = [
    ["abierta", "bot", "Chatbot Necto (operador = null)", "Hilo activo gestionado de forma automática por la IA. El cliente interactúa sin requerir intervención humana."],
    ["en_espera", "humano", "Mesa de ayuda (operador = null)", "El cliente solicitó un asesor o la IA detectó que no puede resolver la duda. Requiere atención urgente."],
    ["atendida", "humano", "Asesor asignado (operador ≠ null)", "Un asesor humano específico pulsó 'Tomar chat'. El bot se silencia y el asesor conduce la conversación."],
    ["cerrada", "bot / humano", "Histórico (operador anterior)", "El pedido o la consulta fue completamente resuelta ('Resolver conversación'). Se archiva en el Historial."],
]
add_stt_table(estados_headers, estados_data, [Inches(1.0), Inches(1.1), Inches(1.8), Inches(3.1)], zebra=True, first_col_bold=True)

add_h2("7.2 Flujo FSM de Construcción de Pedidos (Conversational Ordering)")
add_p("Cuando la conversación entra en modo transaccional, el motor de pedidos guía al usuario a través de los siguientes estados discretos:")
add_bullet("Esperando intención del cliente.", "1. IDLE: ")
add_bullet("Se presenta la lista de productos y precios disponibles (o carrusel en Facebook/Instagram).", "2. CATALOGO_ACTIVO: ")
add_bullet("El usuario agrega líneas de pedido con cantidades.", "3. CARRITO_EN_CONSTRUCCION: ")
add_bullet("El bot pregunta si la orden es para 'retiro' en tienda o 'domicilio'.", "4. SOLICITANDO_ENTREGA: ")
add_bullet("Si es a domicilio, solicita dirección clara o ubicación GPS.", "5. SOLICITANDO_DIRECCION: ")
add_bullet("Presenta el resumen total en $COP y solicita aprobación explícita del cliente.", "6. CONFIRMANDO_PEDIDO: ")
add_bullet("El pedido se inserta con éxito en la base de datos de Pedidos en estado 'nuevo'.", "7. PEDIDO_REGISTRADO: ")

# 8. ESPECIFICACIÓN DETALLADA DE SALIDAS (QUÉ SALE)
add_h1("8. ESPECIFICACIÓN DETALLADA DE SALIDAS (QUÉ SALE)")
add_p("El módulo de Conversaciones genera múltiples salidas sincronizadas tanto hacia los canales externos como hacia el ecosistema interno de Necto:")

add_h2("8.1 Mensajes Salientes hacia Canales (Outbound Messages)")
add_bullet("Emitidas por Chatbot Necto con texto formateado en Markdown, emojis institucionales y botones de acción rápida. Se entregan en < 1.5 segundos vía REST API del canal correspondiente.", "Respuestas Automáticas de IA: ")
add_bullet("Generadas por el operador desde el compositor web de Necto. Se transmiten a la API oficial con el nombre del negocio sin revelar el teléfono personal del asesor.", "Mensajes Manuales del Asesor: ")
add_bullet("Tarjetas de confirmación enviadas cuando un pedido pasa a 'en preparación', 'listo', 'en camino' o 'entregado'.", "Notificaciones de Pedido: ")
add_bullet("Plantillas interactivas enriquecidas con carruseles de fotos para Facebook Messenger y botones de acción rápida para Instagram Direct.", "Formatos Especiales Meta: ")

add_h2("8.2 Transacciones hacia el Módulo de Pedidos")
add_p("Cuando la FSM conversacional culmina la confirmación de una compra, emite una orden operativa completa hacia `necto.pedido` y `necto.pedido_item`:")
add_bullet("Número consecutivo único generado por el sistema (ej. WEB-0038).", "Número de Orden: ")
add_bullet("Nombre del cliente y teléfono normalizado E.164 (o handle @usuario en Instagram/Facebook).", "Contacto: ")
add_bullet("Líneas con nombre de producto, cantidad y precio congelado al momento de la venta.", "Ítems: ")
add_bullet("Dirección estructurada capturada en la conversación.", "Logística: ")
add_bullet("Por defecto 'nuevo' (columna 'Pendiente de pago' en el tablero).", "Estado Inicial: ")
add_bullet("Asociado al mensaje de confirmación (`payload.pedidoId`), permitiendo abrir la tarjeta directamente desde el chat.", "Vínculo Bidireccional: ")

add_h2("8.3 Eventos en Tiempo Real (Supabase Realtime)")
add_bullet("Actualiza instantáneamente la vista del operador si entra un mensaje nuevo, sin requerir refrescar la página.", "Canal 'necto:mensaje': ")
add_bullet("Actualiza contadores de no leídos, insignias de canal (WhatsApp, Telegram, Instagram, Facebook), estado de urgencia y orden cronológico.", "Canal 'necto:conversacion': ")
add_bullet("Si el operador o el cliente abonan la orden, el estado de pago se sincroniza en vivo en el chat y en el kanban.", "Canal 'necto:pedido': ")

add_h2("8.4 Alertas y Derivaciones de Handoff")
add_bullet("Cuando una conversación pasa a 'en_espera', se emite un sonido discreto en la consola y se marca la pestaña con badge de urgencia para que cualquier asesor disponible tome el control.", "Notificación de Escalado: ")

# 9. SUPERFICIES OPERATIVAS DEL SISTEMA
add_h1("9. SUPERFICIES OPERATIVAS DEL SISTEMA")
add_p("El módulo cuenta con 5 superficies de usuario diseñadas bajo la guía visual Necto (Tailwind CSS, estética lavanda/índigo de marca, tipografías modernas y contrastes accesibles):")

add_h2("9.1 Bandeja de Entrada Multicanal (BandejaLista)")
add_p("Panel lateral izquierdo que lista todos los hilos ordenados por última actividad descendente. Muestra avatar del contacto con badge distintivo del canal:")
add_bullet("Badge verde esmeralda con isotipo oficial.", "WhatsApp: ")
add_bullet("Badge azul celeste.", "Telegram: ")
add_bullet("Badge con gradiente morado-fucsia-naranja de Instagram.", "Instagram Direct: ")
add_bullet("Badge azul Messenger corporativo.", "Facebook Messenger: ")
add_p("Incluye nombre del cliente, previsualización de texto limpio (sin etiquetas HTML), hora relativa y contador de mensajes no leídos. Permite filtrar instantáneamente por 'Todas', 'Sin atender', 'En espera', 'En curso' y 'Resueltas'.")

add_h2("9.2 ChatView Adaptativo con Burbujas 'w-fit'")
add_p("Área central del chat optimizada ergonómicamente:")
add_bullet("Las burbujas se encogen para textos breves ('Hola', 'Sí') y crecen armónicamente hasta el límite visual máximo para párrafos extensos.", "Burbujas Adaptativas: ")
add_bullet("Fondo lavanda suave (`secondary-25`), avatar de robot, cabecera con badge `IA` y hora de entrega.", "Burbuja de Bot: ")
add_bullet("Fondo gris suave neutro (`gray-100` / dark mode `white/[0.07]`), alineado a la izquierda.", "Burbuja de Cliente: ")
add_bullet("Fondo índigo institucional de marca (`secondary-600`), alineado a la derecha con distintivo 'Asesor Humano'.", "Burbuja de Asesor: ")
add_bullet("Tarjeta incrustada dentro del mensaje del bot que muestra número de pedido, badge de estado, total en COP, badge de pago y botón directo 'Ver pedido'.", "Tarjeta de Pedido Inline: ")
add_bullet("Botón discreto 'Trazabilidad' con icono AiIcon que despliega un modal con el flujo detectado, módulo clasificado y acción técnica.", "Inspección IA On-Demand: ")

add_h2("9.3 Panel de Contexto Modular")
add_p("Panel lateral derecho que responde a la pregunta clave del operador: ¿Qué sabe cada módulo de este contacto?")
add_bullet("Lista en tiempo real todos los pedidos históricos del cliente, con desglose de ítems, montos, estado de despacho y botón para registrar pago.", "Pestaña 'Pedidos': ")
add_bullet("Muestra el motivo semántico de diseño: el stock físico es global del almacén y no pertenece a un cliente individual, guiando al operador a la consulta de existencias.", "Pestaña 'Inventario': ")

add_h2("9.4 Historial de Atención y Auditoría")
add_p("Superficie analítica donde se revisan todas las sesiones cerradas, los tiempos totales de conversación, qué operador atendió cada ticket y qué pedidos se originaron en cada charla.")

add_h2("9.5 Configuración de Canales y Asistente")
add_p("Panel administrativo para gestionar las credenciales de los conectores (Meta App ID, WhatsApp Phone Number ID, Telegram Bot Token, Instagram Account ID, Facebook Page Access Token), definir horarios de atención y personalizar las plantillas de notificación.")

# 10. REGLAS DE NEGOCIO E INVARIANTES DE CONSISTENCIA
add_h1("10. REGLAS DE NEGOCIO E INVARIANTES DE CONSISTENCIA")
add_p("Para asegurar la integridad absoluta del sistema y evitar corrupción de datos o ambigüedades operativas, el módulo obedece 10 invariantes formales:")

invariantes_headers = ["ID", "Invariante de Consistencia", "Criterio Técnico y Regla de Cumplimiento"]
invariantes_data = [
    ["C1", "Aislamiento Estricto de Canales", "Cada hilo pertenece estrictamente a un único canal ('whatsapp', 'telegram', 'instagram', 'facebook'). No se mezclan mensajes de distintas redes en un mismo identificador de conversación."],
    ["C2", "Unicidad de Hilo Activo por Contacto y Canal", "Un contacto sólo puede tener UNA conversación viva (abierta, en_espera o atendida) a la vez en un canal determinado."],
    ["C3", "Invariante de Atención de Handoff", "Si estado = 'atendida', atencion DEBE ser 'humano' y operadorAsignadoId ≠ null. Si atencion = 'bot', operadorAsignadoId DEBE ser null."],
    ["C4", "Silenciamiento Estricto del Bot", "Cuando un operador pulsa 'Tomar chat', el bot queda inhibido de emitir respuestas automáticas hacia ese cliente hasta que el hilo sea devuelto explícitamente al bot."],
    ["C5", "Consistencia Temporal Monótona", "El campo ultimaActividad de la conversación debe coincidir exactamente con el timestamp del último mensaje o evento registrado en el hilo."],
    ["C6", "Idempotencia en Webhooks", "Todo mensaje entrante con un messageId ya procesado en los últimos 7 días debe ser descartado silenciosamente sin duplicar registros."],
    ["C7", "Desacoplamiento de Pago", "El estado de pago pertenece exclusivamente a la entidad Pedido (Pedido.pagado), NUNCA a la conversación. Una conversación no se etiqueta como 'pagada'."],
    ["C8", "Normalización Canónica de Identidad", "WhatsApp normaliza a E.164 (+57...). Telegram a 'tg:<chat_id>'. Instagram a 'ig:<igsid>' con @handle. Facebook Messenger a 'fb:<psid>'."],
    ["C9", "Sanitización Visual de Previews", "Los textos de vista previa en la bandeja deben purgar cualquier etiqueta HTML o Markdown para evitar contaminación visual y ataques XSS."],
    ["C10", "Trazabilidad Inmutable de Pedido", "El vínculo payload.pedidoId dentro del mensaje del bot es de solo lectura una vez emitido; refleja la orden creada sin alterar el historial."],
]
add_stt_table(invariantes_headers, invariantes_data, [Inches(0.6), Inches(2.3), Inches(4.1)], zebra=True, first_col_bold=True)

# 11. MODELO DE DATOS RELACIONAL (SUPABASE)
add_h1("11. MODELO DE DATOS RELACIONAL Y PERSISTENCIA")
add_p("El módulo persiste su estado en el esquema relacional PostgreSQL `necto` en Supabase:")

tablas_headers = ["Tabla PostgreSQL", "Propósito y Relaciones Clave", "Campos Relevantes"]
tablas_data = [
    ["necto.contacto", "Directorio maestro de clientes que interactúan por cualquier canal.", "id, organizacion_id, nombre, telefono, telefono_norm, origen ('whatsapp'|'telegram'|'instagram'|'facebook'), red_social_id"],
    ["necto.conversacion", "Cabecera del hilo de atención y máquina de estados.", "id, organizacion_id, contacto_id, canal ('whatsapp'|'telegram'|'instagram'|'facebook'), estado ('abierta'|'en_espera'|'atendida'|'cerrada'), modo_atencion ('bot'|'humano'), agente_id, ultima_actividad"],
    ["necto.mensaje", "Línea de mensaje individual en el hilo.", "id, conversacion_id, autor_tipo ('cliente'|'bot'|'agente'), contenido (JSONB: texto, media, payload), creado_en"],
    ["necto.evento_sistema", "Auditoría de eventos ocurridos en el hilo (handoff, cambio de estado).", "id, conversacion_id, tipo_evento, payload, creado_en"],
    ["necto.integracion_canal", "Credenciales y estado de conexión de cada canal.", "id, organizacion_id, canal, credenciales (JSON cifrado: tokens, app_secret), webhook_secret, activo"],
]
add_stt_table(tablas_headers, tablas_data, [Inches(1.8), Inches(2.6), Inches(2.6)], zebra=True, first_col_bold=True)

# 12. CASOS DE USO Y FLUJOS DETALLADOS
add_h1("12. CASOS DE USO Y FLUJOS DETALLADOS")

add_h2("CU-01: Atención Automática de Consulta de Catálogo y Menú (WhatsApp / Telegram)")
add_p("Actor: Cliente final a través de WhatsApp o Telegram.")
add_p("Flujo principal:")
add_bullet("El cliente escribe: 'Hola, ¿qué venden?' o '/menu'.")
add_bullet("El webhook recibe el evento y el NLU clasifica intención 'menu_catalogo'.")
add_bullet("Chatbot Necto consulta el catálogo simple de PedidosStore y compone una respuesta estructurada con los productos y precios.")
add_bullet("El mensaje se envía al canal en < 1 segundo; en Necto se renderiza la burbuja lavanda adaptativa del bot.")

add_h2("CU-02: Generación Conversacional de Pedido y Tarjeta Inline")
add_p("Actor: Cliente y Chatbot Necto.")
add_p("Flujo principal:")
add_bullet("El cliente selecciona 2 artículos y especifica su dirección de entrega.")
add_bullet("El bot resume la orden: 'Total $54.000 COP a Calle 100 # 15-20. ¿Confirmas tu pedido?'.")
add_bullet("El cliente responde 'Sí, confirmar'.")
add_bullet("El backend inserta la orden en `necto.pedido` con número consecutivo WEB-XXXX y modalidad 'domicilio'.")
add_bullet("El bot emite la confirmación adjuntando `payload: { pedidoId: 'WEB-XXXX' }`.")
add_bullet("En la interfaz de Necto, el mensaje del bot dibuja la Tarjeta de Pedido Inline con botón interactivo 'Ver pedido'.")

add_h2("CU-03: Solicitud de Asesor Humano (Handoff) y Toma de Control")
add_p("Actor: Cliente, Bot y Asesor Humano.")
add_p("Flujo principal:")
add_bullet("El cliente escribe: 'Necesito hablar con una persona, tengo un inconveniente'.")
add_bullet("El bot clasifica intención 'handoff', responde cordialmente: 'Comprendo, te transfiero de inmediato con un asesor del equipo', y cambia el estado a 'en_espera'.")
add_bullet("En la consola de Necto, la conversación se resalta en la sección de atención urgente con indicador de espera.")
add_bullet("El asesor pulsa 'Tomar chat': la conversación pasa a 'atendida', se asigna a su ID y el bot se silencia.")
add_bullet("El asesor responde directamente desde el compositor web con burbujas índigo de 'Asesor Humano'.")

add_h2("CU-04: Captación y Atención desde Historia de Instagram (Story Mention)")
add_p("Actor: Cliente en Instagram y Asesor Necto.")
add_p("Flujo principal:")
add_bullet("El cliente etiqueta a la marca en una Historia de Instagram o responde a una Historia activa preguntando por disponibilidad.")
add_bullet("El webhook de Meta (`POST /api/webhooks/instagram`) recibe el evento con `tipoContenido: 'story_mention'` y el `IGSID` del usuario.")
add_bullet("Necto crea o vincula el contacto registrando su `@usuario` y abre un hilo con insignia de Instagram en BandejaLista.")
add_bullet("El chatbot saluda amablemente, presenta el menú con Quick Replies y el cliente confirma su orden.")

add_h2("CU-05: Conversión desde Anuncio de Facebook (Click-to-Messenger)")
add_p("Actor: Cliente desde Facebook Ads y Chatbot Necto.")
add_p("Flujo principal:")
add_bullet("El usuario pulsa el botón 'Enviar mensaje' en una publicación promocionada en Facebook.")
add_bullet("El webhook de Messenger recibe el payload con `referralAdId` identificando la campaña publicitaria.")
add_bullet("Chatbot Necto despliega un carrusel de productos enfocado en la promoción específica del anuncio.")
add_bullet("El usuario pulsa el botón interactivo 'Pedir ahora', ingresa sus datos y se genera la orden en Pedidos.")

# 13. HISTORIAL DE ENTREGABLES Y ROADMAP
add_h1("13. HISTORIAL DE ENTREGABLES Y ROADMAP")
entregables_headers = ["Hito / ID", "Fase / Módulo", "Entregable Técnico y Funcional", "Fecha", "Líder Técnico"]
entregables_data = [
    ["H-CONV-01", "Fase 1: Gateway Base", "Arquitectura de webhooks HTTP/HTTPS con validación de tokens y soporte inicial WhatsApp Business Cloud API.", "21-sep-2026", "Jessy Quinto T"],
    ["H-CONV-02", "Fase 2: Motor NLU & FSM", "Implementación de la máquina de estados de pedidos conversacionales y clasificación de intenciones.", "22-sep-2026", "Jessy Quinto T"],
    ["H-CONV-03", "Fase 3: Canal Telegram", "Integración completa de Telegram Bot API con soporte de comandos, Inline Keyboards y modo dual.", "23-sep-2026", "Jessy Quinto T"],
    ["H-CONV-04", "Fase 4: Consola y Bandeja", "Desarrollo de BandejaLista con filtros reactivos, buscador en tiempo real e insignias de canal.", "24-sep-2026", "Jessy Quinto T"],
    ["H-CONV-05", "Fase 5: ChatView Adaptativo", "Rediseño de burbujas ergonómicas w-fit, eliminación de ruido visual y trazabilidad IA bajo demanda.", "25-sep-2026", "Jessy Quinto T"],
    ["H-CONV-06", "Fase 6: Tarjetas Pedido Inline", "Vinculación nativa payload.pedidoId con tarjeta interactiva dentro de la burbuja del bot.", "25-sep-2026", "Jessy Quinto T"],
    ["H-CONV-07", "Fase 7: Sincronización Realtime", "Conexión a canales Supabase Realtime para actualización instantánea de mensajes y estados.", "25-sep-2026", "Jessy Quinto T"],
    ["H-CONV-08", "Fase 8: Depuración de Datos", "Saneamiento de base de datos preservando contactos y pedidos reales de producción.", "25-sep-2026", "Jessy Quinto T"],
    ["H-CONV-09", "Fase 9: Instagram Direct API", "Homologación en Meta Graph API para recepción y despacho de DMs de Instagram en la bandeja.", "Q4 2026", "Jessy Quinto T"],
    ["H-CONV-10", "Fase 10: Facebook Messenger", "Activación del conector Messenger Platform para atención omnicanal centralizada y carruseles.", "Q4 2026", "Jessy Quinto T"],
    ["H-CONV-11", "Fase 11: Campañas HSM Masivas", "Gestión de plantillas aprobadas por Meta para recordatorios proactivos y seguimiento post-venta.", "Q1 2027", "Jessy Quinto T"],
    ["H-CONV-12", "Fase 12: Voicebot con LLM", "Transmisión de voz bidireccional mediante modelos de voz en tiempo real.", "Q1 2027", "Jessy Quinto T"],
]
add_stt_table(entregables_headers, entregables_data, [Inches(1.0), Inches(1.5), Inches(2.4), Inches(1.1), Inches(1.0)], zebra=True, first_col_bold=True)

# Guardar documento .docx
doc.save(salida_docx)
print(f"✅ Documento Word generado exitosamente en: {salida_docx}")

# Generar archivo Markdown exhaustivo
with open(salida_md, "w", encoding="utf-8") as f:
    f.write("# CONVERSACIONES MULTICANAL\n")
    f.write("## Documentación Funcional y Alcance de Producto\n")
    f.write("### Módulo de Conversaciones (WhatsApp, Telegram, Instagram y Facebook) / Necto\n\n")
    f.write("| Metadato | Valor |\n|---|---|\n")
    for k, v in meta_vals:
        f.write(f"| **{k}** | {v} |\n")
    f.write("\n---\n\n")
    
    f.write("# CONTROL DE VERSIONES\n\n")
    f.write("| Versión | Fecha | Autor | Descripción del cambio |\n|---|---|---|---|\n")
    for r in versiones_data:
        f.write(f"| {r[0]} | {r[1]} | {r[2]} | {r[3]} |\n")
    f.write("\n---\n\n")
    
    f.write("# APROBACIONES\n\n")
    f.write("| Rol | Nombre | Cargo | Firma | Fecha |\n|---|---|---|---|---|\n")
    for r in aprobaciones_data:
        f.write(f"| {r[0]} | {r[1]} | {r[2]} | {r[3]} | {r[4]} |\n")
    f.write("\n---\n\n")

    f.write("# 1. OBJETIVO DEL DOCUMENTO\n\n")
    f.write("Este documento formaliza y describe de manera exhaustiva el alcance funcional, arquitectónico y operativo del Módulo de Conversaciones Multicanal de la plataforma Necto. Su propósito primordial es establecer un contrato técnico y de producto inequívoco entre ST&T, la dirección de tecnología, los líderes de ingeniería, los equipos de operaciones y el área de aseguramiento de calidad (QA).\n\n")
    f.write("El documento detalla con máxima precisión qué información entra al sistema (inbound webhooks, mensajes, audios, payloads, identidades de usuario), cómo es procesada (clasificación de intención con NLU, máquinas de estados discretas, handoff automático/manual) y qué información sale (respuestas omnicanal, órdenes hacia Pedidos, sockets en tiempo real y notificaciones de derivación).\n\n")
    f.write("Convención de lectura de capacidades: las funcionalidades construidas, probadas y operativas en producción se presentan sin marcas especiales; las capacidades en fase de integración o roadmap para canales adicionales (Instagram Direct y Facebook Messenger) se declaran explícitamente con su arquitectura de homologación, garantizando total transparencia.\n\n")

    f.write("# 2. DESCRIPCIÓN GENERAL DEL PRODUCTO\n\n")
    f.write("### 2.1 Qué es el Módulo de Conversaciones\n")
    f.write("El Módulo de Conversaciones es la consola unificada de atención y ventas conversacionales de Necto. Actúa como el centro neurálgico donde convergen todos los canales de mensajería instantánea del negocio:\n\n")
    f.write("- **WhatsApp Business:** Canal prioritario de ventas en Latinoamérica, operando con WhatsApp Business Cloud API vía gateway Zernio.\n")
    f.write("- **Telegram:** Canal de soporte y transacciones rápidas sin restricciones de ventana horaria, vía Telegram Bot API.\n")
    f.write("- **Instagram Direct Messages:** Canal de captación de leads visuales, respuestas a Historias (Story Mentions) y DMs desde campañas de influencers.\n")
    f.write("- **Facebook Messenger:** Canal de conversión desde Facebook Ads (Click-to-Messenger), catálogo de Fan Page y consultas de Marketplace.\n\n")
    f.write("A diferencia de un chat tradicional o un CRM desvinculado, Conversaciones está acoplado de forma nativa a los módulos de negocio de Necto (Pedidos e Inventario). Esto permite que el diálogo no sea meramente informativo, sino transaccional: el cliente puede consultar el menú, armar su carrito, registrar su dirección, generar un pedido operativo en tiempo real y consultar el estado de despacho sin salir de su aplicación de mensajería.\n\n")
    
    f.write("### 2.2 Qué problema resuelve\n")
    f.write("- **Dispersión multicanal:** Falta de visibilidad de ventas y dispersión de mensajes entre diferentes celulares y cuentas de redes sociales.\n")
    f.write("- **Latencia de atención:** Retrasos graves en la primera respuesta que ocasionan pérdida inmediata de clientes potenciales.\n")
    f.write("- **Fricción operativa:** Operadores que deben alternar manualmente entre chats de WhatsApp/Instagram y el software de pedidos.\n")
    f.write("- **Ceguera de contexto:** Pérdida del contexto del cliente cuando un operador toma el turno de otro, obligando al cliente a repetir su solicitud.\n")
    f.write("- **Ausencia de analítica:** Falta de métricas objetivas sobre tiempos de atención, volumen por canal y efectividad de resolución de la IA.\n\n")

    f.write("### 2.3 Contexto de negocio y propuesta de valor\n")
    f.write("Para un comercio minorista, restaurante o negocio de servicios en Colombia y Latinoamérica, las redes sociales y aplicaciones de mensajería representan el canal de más alta conversión:\n")
    f.write("- **Atención continua 24/7:** El bot atiende el 70%+ de las consultas frecuentes y conduce la toma de pedidos 24/7 sin intervención humana.\n")
    f.write("- **Handoff transparente:** Cuando la conversación requiere juicio comercial o soporte complejo, se realiza un traspaso suave con historial completo hacia el asesor.\n")
    f.write("- **Transaccionalidad nativa:** Cada confirmación en el chat se traduce de forma inmediata en una tarjeta en el Tablero Kanban de Pedidos.\n")
    f.write("- **Consolidación omnicanal:** Un solo operador puede atender simultáneamente conversaciones de WhatsApp, Telegram, Instagram y Facebook desde una misma pantalla.\n\n")

    f.write("# 3. ALCANCE DEL MÓDULO\n\n")
    f.write("### 3.1 Matriz de Canales en Alcance\n\n")
    f.write("| Canal | Protocolo / Proveedor | Estado en Necto | Tipo de Interacción Soportada | Identificador Canónico |\n|---|---|---|---|---|\n")
    for r in canales_matriz_data:
        f.write(f"| **{r[0]}** | {r[1]} | {r[2]} | {r[3]} | {r[4]} |\n")
    f.write("\n---\n\n")

    f.write("### 3.2 Capacidades Funcionales en Alcance (In Scope)\n")
    f.write("- **Ingesta Multicanal:** Recepción y procesamiento de eventos entrantes vía webhooks HTTP/HTTPS con validación de seguridad de firma HMAC.\n")
    f.write("- **Consola de Operador:** Bandeja unificada con filtros reactivos (todas, sin atender, en espera, en curso, cerradas) y buscador instantáneo.\n")
    f.write("- **ChatView Adaptativo:** Hilo de conversación con burbujas adaptativas al ancho del contenido (w-fit), avatares de canal e insignia de IA.\n")
    f.write("- **Trazabilidad IA On-Demand:** Botón discreto en la burbuja del bot para desplegar un modal con el flujo de ejecución, módulo clasificado y acción ejecutada.\n")
    f.write("- **Tarjeta de Pedido Inline:** Tarjeta interactiva de pedido incrustada dentro del mensaje del bot con número WEB-XXXX, total en $COP y botón directo.\n")
    f.write("- **Panel de Contexto Modular:** Panel lateral integrado que consulta en tiempo real el historial de compras y montos del cliente actual.\n")
    f.write("- **Gobierno de Handoff:** Transición atómica entre atención por bot y atención por asesor humano ('Tomar chat', 'Devolver al bot', 'Resolver').\n")
    f.write("- **Tiempo Real:** Sincronización instantánea de nuevos mensajes y cambios de estado vía Supabase Realtime Channels.\n\n")

    f.write("### 3.3 Fuera del alcance (Out of Scope)\n")
    f.write("- **Proveedor de red GSM:** Necto no construye una infraestructura celular propia; se conecta a las APIs oficiales de Meta y Telegram.\n")
    f.write("- **Pasarela de adquirencia directa:** El procesamiento bancario ocurre en pasarelas externas o terminales de pago; el chat valida la confirmación y captura el método.\n")
    f.write("- **Campañas masivas de cold-messaging:** No se permite spam masivo ni prospección no autorizada que viole las políticas comerciales de Meta.\n\n")

    f.write("### 3.4 Deuda técnica declarada\n")
    f.write("- **Unificación cross-channel de identidad:** Actualmente las sesiones de diferentes redes se identifican por identificadores nativos; la unificación cross-channel de un mismo cliente con múltiples cuentas requiere vinculación manual o coincidencia estricta de teléfono.\n")
    f.write("- **Cola asíncrona de audio:** El procesamiento de notas de voz en WhatsApp/Telegram utiliza transcripción estructurada en servidor Node; la inferencia de audio en segundo plano se procesa sincrónicamente en el webhook.\n\n")

    f.write("# 4. ACTORES Y MATRIZ RBAC\n\n")
    f.write("| Capacidad de Sistema | Descripción Funcional | Admin | Supervisor | Asesor / Operador | Solo Lectura |\n|---|---|---|---|---|---|\n")
    for r in rbac_data:
        f.write(f"| `{r[0]}` | {r[1]} | {r[2]} | {r[3]} | {r[4]} | {r[5]} |\n")
    f.write("\n---\n\n")

    f.write("# 5. CANALES Y MODELO DE INTEGRACIÓN\n\n")
    f.write("### 5.1 WhatsApp Business Cloud API (Operativo)\n")
    f.write("- **Conexión Oficial:** Integración directa mediante Meta Graph API v21.0 y gateway de alto rendimiento Zernio.\n")
    f.write("- **Identificador canónico:** Teléfono en formato internacional E.164 (+573145376069).\n")
    f.write("- **Capacidades:** Texto libre, mensajes interactivos con botones (Quick Replies), listas desplegables (Radio Lists), plantillas HSM aprobadas y notas de voz en formato OGG/Opus.\n")
    f.write("- **Políticas Meta:** Ventana de atención estándar de 24 horas posterior al último mensaje entrante del usuario para mensajes libres; plantillas HSM para notificaciones fuera de ventana.\n\n")

    f.write("### 5.2 Telegram Bot API (Operativo)\n")
    f.write("- **Conexión Oficial:** Integración bidireccional vía Telegram Bot API oficial (modo Webhook y modo Polling para desarrollo local).\n")
    f.write("- **Identificador canónico:** ID numérico único de usuario en Telegram (chat_id, ej. '7965993532') normalizado internamente con prefijo 'tg:'.\n")
    f.write("- **Capacidades:** Mensajes con formato MarkdownV2, Inline Keyboards interactivos, comandos de barra (/menu, /pedido, /soporte) y notas de voz en formato OGG.\n")
    f.write("- **Políticas Telegram:** Sin ventana restrictiva de 24 horas; el bot puede emitir actualizaciones proactivas de pedidos al usuario mientras conserve el chat activo.\n\n")

    f.write("### 5.3 Instagram Direct Messages (Roadmap Meta Graph API)\n")
    f.write("- **Conexión Oficial:** Conexión mediante Meta Messenger Platform para Cuentas Profesionales de Instagram (Instagram Messaging API sobre Graph API v21.0).\n")
    f.write("- **Identificador canónico:** Instagram Scoped ID (IGSID) único asignado por la página de la marca. Se resuelve mediante Graph API para obtener el handle público (@usuario), nombre de perfil y foto de avatar.\n")
    f.write("- **Permisos de App Meta:** `instagram_manage_messages`, `pages_manage_metadata`, `pages_read_engagement`, `instagram_basic`.\n")
    f.write("- **Capacidades:** Mensajes directos de texto, respuestas a historias de la marca (Story Mentions / Story Replies), imágenes de productos, Quick Replies y botones Ice Breakers para preguntas frecuentes al iniciar.\n")
    f.write("- **Políticas y Ventana:** Ventana de atención estándar de 24 horas. Soporte de etiqueta `HUMAN_AGENT` que extiende la ventana hasta 7 días para casos atendidos por asesores humanos de soporte.\n")
    f.write("- **Visualización en UI:** Badge distintivo en BandejaLista con gradiente morado-fucsia-naranja oficial de Instagram y enlace directo al perfil del cliente.\n\n")

    f.write("### 5.4 Facebook Messenger Platform (Roadmap Meta Graph API)\n")
    f.write("- **Conexión Oficial:** Conexión mediante Messenger Platform Webhooks vinculada a la Fan Page corporativa de Facebook.\n")
    f.write("- **Identificador canónico:** Page-Scoped ID (PSID) emitido por Meta para cada usuario que interactúa con la página de Facebook.\n")
    f.write("- **Permisos de App Meta:** `pages_messaging`, `pages_show_list`.\n")
    f.write("- **Capacidades:** Texto enriquecido, carruseles horizontales de productos (Generic Templates con imagen, título, precio en COP y botón 'Comprar'), botones de URL directa y respuestas sugeridas.\n")
    f.write("- **Integración Publicitaria:** Soporte nativo para Click-to-Messenger Ads (reconocimiento automático del `ad_id` o anuncio desde el cual ingresó el cliente para personalizar el saludo).\n")
    f.write("- **Protocolo Handover:** Handover Protocol de Meta para coordinar la entrega de hilo de atención entre Chatbot Necto y Meta Business Suite Inbox.\n")
    f.write("- **Visualización en UI:** Badge distintivo en BandejaLista con color azul Messenger corporativo.\n\n")

    f.write("# 6. ESPECIFICACIÓN DETALLADA DE ENTRADAS (QUÉ ENTRA)\n\n")
    f.write("### 6.1 Ingesta de Webhooks HTTP/HTTPS\n")
    f.write("Endpoints expuestos por Necto para la recepción de eventos:\n")
    f.write("```http\nPOST /api/webhooks/whatsapp   (Firma: X-Hub-Signature-256)\nPOST /api/webhooks/telegram   (Token secreto en cabecera)\nPOST /api/webhooks/instagram  (Firma: X-Hub-Signature-256 - Meta Graph API)\nPOST /api/webhooks/messenger  (Firma: X-Hub-Signature-256 - Meta Messenger Platform)\n```\n\n")
    f.write("| Campo Entrada | Tipo de Dato | Origen / Canal | Descripción y Regla de Negocio |\n|---|---|---|---|\n")
    for r in webhook_data:
        f.write(f"| `{r[0]}` | {r[1]} | {r[2]} | {r[3]} |\n")
    f.write("\n---\n\n")

    f.write("### 6.2 Pipeline de Clasificación e Inferencia NLU\n")
    f.write("- **Intención 'faq':** El cliente saluda, pregunta horarios, ubicación de la sede o políticas generales. Enruta a Base de Conocimiento.\n")
    f.write("- **Intención 'menu_catalogo':** El cliente solicita la carta, lista de precios o fotos de artículos. Enruta al Catálogo de Pedidos.\n")
    f.write("- **Intención 'inventario':** El cliente pregunta si queda existencia de un artículo específico ('¿tienen pechuga?'). Enruta a consulta en solo lectura del Inventario.\n")
    f.write("- **Intención 'pedido_creacion':** El cliente indica cantidades, sabores, combos o pide armar una orden ('quiero pedir 2 combos'). Activa la FSM de Construcción de Carrito.\n")
    f.write("- **Intención 'pedido_seguimiento':** El cliente pregunta por un pedido previo ('¿dónde viene mi orden?'). Consulta en PedidosStore por el pedido activo del teléfono.\n")
    f.write("- **Intención 'handoff':** El cliente solicita explícitamente una persona ('quiero hablar con un asesor', 'humano', 'queja'). Dispara el flujo de Handoff.\n\n")

    f.write("# 7. MOTOR CONVERSACIONAL Y MÁQUINAS DE ESTADOS\n\n")
    f.write("### 7.1 Máquina de Estados del Hilo de Conversación\n\n")
    f.write("| Estado | Modo Atención | Responsable | Significado Operativo y Transiciones |\n|---|---|---|---|\n")
    for r in estados_data:
        f.write(f"| **{r[0]}** | {r[1]} | {r[2]} | {r[3]} |\n")
    f.write("\n---\n\n")

    f.write("### 7.2 Flujo FSM de Construcción de Pedidos\n")
    f.write("1. **IDLE:** Esperando intención del cliente.\n")
    f.write("2. **CATALOGO_ACTIVO:** Se presenta la lista de productos y precios disponibles (o carrusel en Facebook/Instagram).\n")
    f.write("3. **CARRITO_EN_CONSTRUCCION:** El usuario agrega líneas de pedido con cantidades.\n")
    f.write("4. **SOLICITANDO_ENTREGA:** El bot pregunta si la orden es para 'retiro' en tienda o 'domicilio'.\n")
    f.write("5. **SOLICITANDO_DIRECCION:** Si es a domicilio, solicita dirección clara o ubicación GPS.\n")
    f.write("6. **CONFIRMANDO_PEDIDO:** Presenta el resumen total en $COP y solicita aprobación explícita del cliente.\n")
    f.write("7. **PEDIDO_REGISTRADO:** El pedido se inserta con éxito en la base de datos de Pedidos en estado 'nuevo'.\n\n")

    f.write("# 8. ESPECIFICACIÓN DETALLADA DE SALIDAS (QUÉ SALE)\n\n")
    f.write("### 8.1 Mensajes Salientes hacia Canales (Outbound Messages)\n")
    f.write("- **Respuestas Automáticas de IA:** Emitidas por Chatbot Necto con texto formateado en Markdown, emojis institucionales y botones de acción rápida. Se entregan en < 1.5 segundos vía REST API del canal correspondiente.\n")
    f.write("- **Mensajes Manuales del Asesor:** Generadas por el operador desde el compositor web de Necto. Se transmiten a la API oficial con el nombre del negocio sin revelar el teléfono personal del asesor.\n")
    f.write("- **Notificaciones de Pedido:** Tarjetas de confirmación enviadas cuando un pedido pasa a 'en preparación', 'listo', 'en camino' o 'entregado'.\n")
    f.write("- **Formatos Especiales Meta:** Plantillas interactivas enriquecidas con carruseles de fotos para Facebook Messenger y botones de acción rápida para Instagram Direct.\n\n")

    f.write("### 8.2 Transacciones hacia el Módulo de Pedidos\n")
    f.write("Cuando la FSM conversacional culmina la confirmación de una compra, emite una orden operativa completa hacia `necto.pedido` y `necto.pedido_item`:\n")
    f.write("- **Número de Orden:** Número consecutivo único generado por el sistema (ej. WEB-0038).\n")
    f.write("- **Contacto:** Nombre del cliente y teléfono normalizado E.164 (o handle @usuario en Instagram/Facebook).\n")
    f.write("- **Ítems:** Líneas con nombre de producto, cantidad y precio congelado al momento de la venta.\n")
    f.write("- **Logística:** Dirección estructurada capturada en la conversación.\n")
    f.write("- **Estado Inicial:** Por defecto 'nuevo' (columna 'Pendiente de pago' en el tablero).\n")
    f.write("- **Vínculo Bidireccional:** Asociado al mensaje de confirmación (`payload.pedidoId`), permitiendo abrir la tarjeta directamente desde el chat.\n\n")

    f.write("### 8.3 Eventos en Tiempo Real (Supabase Realtime)\n")
    f.write("- **Canal 'necto:mensaje':** Actualiza instantáneamente la vista del operador si entra un mensaje nuevo, sin requerir refrescar la página.\n")
    f.write("- **Canal 'necto:conversacion':** Actualiza contadores de no leídos, insignias de canal (WhatsApp, Telegram, Instagram, Facebook), estado de urgencia y orden cronológico.\n")
    f.write("- **Canal 'necto:pedido':** Si el operador o el cliente abonan la orden, el estado de pago se sincroniza en vivo en el chat y en el kanban.\n\n")

    f.write("### 8.4 Alertas y Derivaciones de Handoff\n")
    f.write("- **Notificación de Escalado:** Cuando una conversación pasa a 'en_espera', se emite un sonido discreto en la consola y se marca la pestaña con badge de urgencia para que cualquier asesor disponible tome el control.\n\n")

    f.write("# 9. SUPERFICIES OPERATIVAS DEL SISTEMA\n\n")
    f.write("### 9.1 Bandeja de Entrada Multicanal (BandejaLista)\n")
    f.write("Panel lateral izquierdo que lista todos los hilos ordenados por última actividad descendente. Muestra avatar del contacto con badge distintivo del canal:\n")
    f.write("- **WhatsApp:** Badge verde esmeralda con isotipo oficial.\n")
    f.write("- **Telegram:** Badge azul celeste.\n")
    f.write("- **Instagram Direct:** Badge con gradiente morado-fucsia-naranja de Instagram.\n")
    f.write("- **Facebook Messenger:** Badge azul Messenger corporativo.\n\n")
    f.write("Incluye nombre del cliente, previsualización de texto limpio (sin etiquetas HTML), hora relativa y contador de mensajes no leídos. Permite filtrar instantáneamente por 'Todas', 'Sin atender', 'En espera', 'En curso' y 'Resueltas'.\n\n")

    f.write("### 9.2 ChatView Adaptativo con Burbujas 'w-fit'\n")
    f.write("Área central del chat optimizada ergonómicamente:\n")
    f.write("- **Burbujas Adaptativas:** Las burbujas se encogen para textos breves ('Hola', 'Sí') y crecen armónicamente hasta el límite visual máximo para párrafos extensos.\n")
    f.write("- **Burbuja de Bot:** Fondo lavanda suave (`secondary-25`), avatar de robot, cabecera con badge `IA` y hora de entrega.\n")
    f.write("- **Burbuja de Cliente:** Fondo gris suave neutro (`gray-100` / dark mode `white/[0.07]`), alineado a la izquierda.\n")
    f.write("- **Burbuja de Asesor:** Fondo índigo institucional de marca (`secondary-600`), alineado a la derecha con distintivo 'Asesor Humano'.\n")
    f.write("- **Tarjeta de Pedido Inline:** Tarjeta incrustada dentro del mensaje del bot que muestra número de pedido, badge de estado, total en COP, badge de pago y botón directo 'Ver pedido'.\n")
    f.write("- **Inspección IA On-Demand:** Botón discreto 'Trazabilidad' con icono AiIcon que despliega un modal con el flujo detectado, módulo clasificado y acción técnica.\n\n")

    f.write("### 9.3 Panel de Contexto Modular\n")
    f.write("Panel lateral derecho que responde a la pregunta clave del operador: ¿Qué sabe cada módulo de este contacto?\n")
    f.write("- **Pestaña 'Pedidos':** Lista en tiempo real todos los pedidos históricos del cliente, con desglose de ítems, montos, estado de despacho y botón para registrar pago.\n")
    f.write("- **Pestaña 'Inventario':** Muestra el motivo semántico de diseño: el stock físico es global del almacén y no pertenece a un cliente individual, guiando al operador a la consulta de existencias.\n\n")

    f.write("### 9.4 Historial de Atención y Auditoría\n")
    f.write("Superficie analítica donde se revisan todas las sesiones cerradas, los tiempos totales de conversación, qué operador atendió cada ticket y qué pedidos se originaron en cada charla.\n\n")

    f.write("### 9.5 Configuración de Canales y Asistente\n")
    f.write("Panel administrativo para gestionar las credenciales de los conectores (Meta App ID, WhatsApp Phone Number ID, Telegram Bot Token, Instagram Account ID, Facebook Page Access Token), definir horarios de atención y personalizar las plantillas de notificación.\n\n")

    f.write("# 10. REGLAS DE NEGOCIO E INVARIANTES DE CONSISTENCIA\n\n")
    f.write("| ID | Invariante de Consistencia | Criterio Técnico y Regla de Cumplimiento |\n|---|---|---|\n")
    for r in invariantes_data:
        f.write(f"| **{r[0]}** | {r[1]} | {r[2]} |\n")
    f.write("\n---\n\n")

    f.write("# 11. MODELO DE DATOS RELACIONAL (SUPABASE)\n\n")
    f.write("| Tabla PostgreSQL | Propósito y Relaciones Clave | Campos Relevantes |\n|---|---|---|\n")
    for r in tablas_data:
        f.write(f"| `{r[0]}` | {r[1]} | {r[2]} |\n")
    f.write("\n---\n\n")

    f.write("# 12. CASOS DE USO Y FLUJOS DETALLADOS\n\n")
    f.write("### CU-01: Atención Automática de Consulta de Catálogo y Menú (WhatsApp / Telegram)\n")
    f.write("**Actor:** Cliente final a través de WhatsApp o Telegram.\n\n")
    f.write("**Flujo principal:**\n")
    f.write("1. El cliente escribe: 'Hola, ¿qué venden?' o '/menu'.\n")
    f.write("2. El webhook recibe el evento y el NLU clasifica intención 'menu_catalogo'.\n")
    f.write("3. Chatbot Necto consulta el catálogo simple de PedidosStore y compone una respuesta estructurada con los productos y precios.\n")
    f.write("4. El mensaje se envía al canal en < 1 segundo; en Necto se renderiza la burbuja lavanda adaptativa del bot.\n\n")

    f.write("### CU-02: Generación Conversacional de Pedido y Tarjeta Inline\n")
    f.write("**Actor:** Cliente y Chatbot Necto.\n\n")
    f.write("**Flujo principal:**\n")
    f.write("1. El cliente selecciona 2 artículos y especifica su dirección de entrega.\n")
    f.write("2. El bot resume la orden: 'Total $54.000 COP a Calle 100 # 15-20. ¿Confirmas tu pedido?'.\n")
    f.write("3. El cliente responde 'Sí, confirmar'.\n")
    f.write("4. El backend inserta la orden en `necto.pedido` con número consecutivo WEB-XXXX y modalidad 'domicilio'.\n")
    f.write("5. El bot emite la confirmación adjuntando `payload: { pedidoId: 'WEB-XXXX' }`.\n")
    f.write("6. En la interfaz de Necto, el mensaje del bot dibuja la Tarjeta de Pedido Inline con botón interactivo 'Ver pedido'.\n\n")

    f.write("### CU-03: Solicitud de Asesor Humano (Handoff) y Toma de Control\n")
    f.write("**Actor:** Cliente, Bot y Asesor Humano.\n\n")
    f.write("**Flujo principal:**\n")
    f.write("1. El cliente escribe: 'Necesito hablar con una persona, tengo un inconveniente'.\n")
    f.write("2. El bot clasifica intención 'handoff', responde cordialmente: 'Comprendo, te transfiero de inmediato con un asesor del equipo', y cambia el estado a 'en_espera'.\n")
    f.write("3. En la consola de Necto, la conversación se resalta en la sección de atención urgente con indicador de espera.\n")
    f.write("4. El asesor pulsa 'Tomar chat': la conversación pasa a 'atendida', se asigna a su ID y el bot se silencia.\n")
    f.write("5. El asesor responde directamente desde el compositor web con burbujas índigo de 'Asesor Humano'.\n\n")

    f.write("### CU-04: Captación y Atención desde Historia de Instagram (Story Mention)\n")
    f.write("**Actor:** Cliente en Instagram y Asesor Necto.\n\n")
    f.write("**Flujo principal:**\n")
    f.write("1. El cliente etiqueta a la marca en una Historia de Instagram o responde a una Historia activa preguntando por disponibilidad.\n")
    f.write("2. El webhook de Meta (`POST /api/webhooks/instagram`) recibe el evento con `tipoContenido: 'story_mention'` y el `IGSID` del usuario.\n")
    f.write("3. Necto crea o vincula el contacto registrando su `@usuario` y abre un hilo con insignia de Instagram en BandejaLista.\n")
    f.write("4. El chatbot saluda amablemente, presenta el menú con Quick Replies y el cliente confirma su orden.\n\n")

    f.write("### CU-05: Conversión desde Anuncio de Facebook (Click-to-Messenger)\n")
    f.write("**Actor:** Cliente desde Facebook Ads y Chatbot Necto.\n\n")
    f.write("**Flujo principal:**\n")
    f.write("1. El usuario pulsa el botón 'Enviar mensaje' en una publicación promocionada en Facebook.\n")
    f.write("2. El webhook de Messenger recibe el payload con `referralAdId` identificando la campaña publicitaria.\n")
    f.write("3. Chatbot Necto despliega un carrusel de productos enfocado en la promoción específica del anuncio.\n")
    f.write("4. El usuario pulsa el botón interactivo 'Pedir ahora', ingresa sus datos y se genera la orden en Pedidos.\n\n")

    f.write("# 13. HISTORIAL DE ENTREGABLES Y ROADMAP\n\n")
    f.write("| Hito / ID | Fase / Módulo | Entregable Técnico y Funcional | Fecha | Líder Técnico |\n|---|---|---|---|---|\n")
    for r in entregables_data:
        f.write(f"| **{r[0]}** | {r[1]} | {r[2]} | {r[3]} | {r[4]} |\n")

print(f"✅ Documento Markdown generado exitosamente en: {salida_md}")
