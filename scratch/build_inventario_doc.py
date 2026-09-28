import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls, qn
import sys
import os

sys.stdout.reconfigure(encoding='utf-8')

plantilla_path = r"C:\Users\Jessy\Documents\GitHub\StockFlow\Docs\Documentacion Funcional\Plantilla_Documentacion_Funcional_y_Alcance_STT.docx"
salida_docx = r"C:\Users\Jessy\Documents\GitHub\StockFlow\Docs\Documentacion Funcional\Inventario_Documentacion_Funcional_y_Alcance_STT.docx"
salida_md = r"C:\Users\Jessy\Documents\GitHub\StockFlow\Docs\Documentacion Funcional\Inventario_Documentacion_Funcional_y_Alcance_STT.md"

doc = docx.Document(plantilla_path)

# Clear existing body elements (paragraphs, tables, and sdt content controls) while preserving sectPr
for child in list(doc._element.body):
    if not child.tag.endswith('sectPr'):
        doc._element.body.remove(child)

def set_cell(cell, text, bold=False, color_rgb=(40,40,40), size_pt=9.0, fill_hex=None, align=WD_ALIGN_PARAGRAPH.LEFT, top=70, bottom=70, left=110, right=110):
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
    r.font.size = Pt(size_pt)
    r.font.color.rgb = RGBColor(*color_rgb)

def add_styled_table(headers, data, widths=None, zebra=True, header_fill="06153C"):
    t = doc.add_table(rows=len(data) + 1, cols=len(headers))
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    # Header
    for col_idx, h in enumerate(headers):
        c = t.rows[0].cells[col_idx]
        set_cell(c, h, bold=True, color_rgb=(255,255,255), size_pt=9.5, fill_hex=header_fill, top=90, bottom=90, left=120, right=120)
    # Rows
    for row_idx, row_data in enumerate(data):
        fill = "F7F9FC" if (zebra and row_idx % 2 == 1) else None
        for col_idx, val in enumerate(row_data):
            c = t.rows[row_idx + 1].cells[col_idx]
            set_cell(c, str(val), bold=False, color_rgb=(40,40,40), size_pt=9.0, fill_hex=fill, top=70, bottom=70, left=110, right=110)
    
    if widths:
        for row in t.rows:
            for idx, w in enumerate(widths):
                if idx < len(row.cells):
                    row.cells[idx].width = w
    
    doc.add_paragraph() # space after table
    return t

def add_h1(text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(16)
    p.paragraph_format.space_after = Pt(6)
    r = p.add_run(text)
    r.bold = True
    r.font.size = Pt(16)
    r.font.color.rgb = RGBColor(0x2E, 0x74, 0xB5)
    return p

def add_h2(text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(12)
    p.paragraph_format.space_after = Pt(4)
    r = p.add_run(text)
    r.bold = True
    r.font.size = Pt(13)
    r.font.color.rgb = RGBColor(0x2E, 0x74, 0xB5)
    return p

def add_h3(text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(8)
    p.paragraph_format.space_after = Pt(2)
    r = p.add_run(text)
    r.bold = True
    r.font.size = Pt(11)
    r.font.color.rgb = RGBColor(0x1D, 0x32, 0x61)
    return p

def add_p(text, bold_prefix=None, space_after=4):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing = 1.15
    if bold_prefix:
        r_pre = p.add_run(bold_prefix)
        r_pre.bold = True
        r_pre.font.size = Pt(10)
        r_pre.font.color.rgb = RGBColor(0x20, 0x20, 0x20)
    r = p.add_run(text)
    r.font.size = Pt(10)
    r.font.color.rgb = RGBColor(0x35, 0x35, 0x35)
    return p

def add_bullet(text, bold_prefix=None):
    p = doc.add_paragraph()
    p.paragraph_format.left_indent = Inches(0.25)
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.line_spacing = 1.15
    
    r_bullet = p.add_run("▪  ")
    r_bullet.bold = True
    r_bullet.font.size = Pt(8.5)
    r_bullet.font.color.rgb = RGBColor(0x1D, 0x32, 0x61)
    
    if bold_prefix:
        r_pre = p.add_run(bold_prefix)
        r_pre.bold = True
        r_pre.font.size = Pt(10)
        r_pre.font.color.rgb = RGBColor(0x20, 0x20, 0x20)
    r = p.add_run(text)
    r.font.size = Pt(10)
    r.font.color.rgb = RGBColor(0x35, 0x35, 0x35)
    return p

def add_code_block(text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(4)
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.line_spacing = 1.0
    r = p.add_run(text)
    r.font.name = "Consolas"
    r.font.size = Pt(8.5)
    r.font.color.rgb = RGBColor(0x20, 0x20, 0x20)
    # light grey background
    pBdr = parse_xml(r'<w:pBdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:left w:val="single" w:sz="18" w:space="8" w:color="1D3261"/></w:pBdr>')
    p._p.get_or_add_pPr().append(pBdr)
    shd = parse_xml(r'<w:shd xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" w:fill="F4F6F9"/>')
    p._p.get_or_add_pPr().append(shd)
    return p

# ----------------- PORTADA -----------------
p_top = doc.add_paragraph()
p_top.paragraph_format.space_before = Pt(36)
p_top.paragraph_format.space_after = Pt(4)
r_title = p_top.add_run("INVENTARIO")
r_title.bold = True
r_title.font.size = Pt(28)
r_title.font.color.rgb = RGBColor(0x1D, 0x32, 0x61)

p_sub = doc.add_paragraph()
p_sub.paragraph_format.space_before = Pt(0)
p_sub.paragraph_format.space_after = Pt(2)
r_sub = p_sub.add_run("Documentación Funcional y Alcance de Producto")
r_sub.font.size = Pt(16)
r_sub.font.color.rgb = RGBColor(0x53, 0x52, 0x50)

p_sub2 = doc.add_paragraph()
p_sub2.paragraph_format.space_before = Pt(0)
p_sub2.paragraph_format.space_after = Pt(24)
r_sub2 = p_sub2.add_run("Módulo de Inventario, Kárdex Multi-Bodega, Lotes FEFO y Auditoría Física / Necto")
r_sub2.font.size = Pt(12)
r_sub2.font.color.rgb = RGBColor(0x2E, 0x74, 0xB5)

meta_headers = ["Campo", "Valor"]
meta_data = [
    ["Cliente / Área solicitante:", "ST&T"],
    ["Versión del documento:", "1.1 (Revisada y Completa)"],
    ["Fecha de elaboración:", "24/09/2026"],
    ["Elaborado por:", "Jessy Quinto T"],
    ["Clasificación:", "Interno"],
]
add_styled_table(meta_headers, meta_data, widths=[Inches(2.5), Inches(4.0)], zebra=True)

doc.add_page_break()

# ----------------- CONTROL DE VERSIONES -----------------
add_h1("CONTROL DE VERSIONES")
cv_headers = ["Versión", "Fecha", "Autor", "Descripción del cambio"]
cv_data = [
    ["1.0", "24/09/2026", "Jessy Quinto T", "Versión inicial de alcance funcional del módulo de Inventario y Kárdex multi-bodega."],
    ["1.1", "24/09/2026", "Jessy Quinto T", "Actualización arquitectónica completa: incorporación de gestión de lotes con algoritmo de despacho FEFO, subsistema de auditoría física con foto teórica congelada y conciliación atómica, tríada de umbrales (mínimo, reorden, máximo), formalización de invariantes I1-I7, 5 superficies operativas completas y flujo de consulta de stock en solo lectura desde WhatsApp."],
]
add_styled_table(cv_headers, cv_data, widths=[Inches(0.8), Inches(1.1), Inches(2.1), Inches(2.5)], zebra=True)

# ----------------- APROBACIONES -----------------
add_h1("APROBACIONES")
ap_headers = ["Rol", "Nombre", "Cargo", "Firma", "Fecha"]
ap_data = [
    ["Patrocinador / Sponsor", "Dirección de Tecnología", "Sponsor Ejecutivo ST&T", "", "24/09/2026"],
    ["Líder de producto", "Product Management", "Líder de Producto Necto", "", "24/09/2026"],
    ["Líder técnico", "Jessy Quinto T", "Senior Architect / Tech Lead", "", "24/09/2026"],
    ["Stakeholder Operativo", "Operaciones y Almacén", "Representante de Logística y Abastecimiento", "", "24/09/2026"],
]
add_styled_table(ap_headers, ap_data, widths=[Inches(1.5), Inches(1.5), Inches(1.8), Inches(0.9), Inches(0.8)], zebra=True)

doc.add_page_break()

# ----------------- TABLA DE CONTENIDO -----------------
add_h1("TABLA DE CONTENIDO")
add_p("1. Objetivo del documento")
add_p("2. Descripción general del producto (Qué es, Qué problema resuelve, Contexto de negocio, Frontera con otros dominios)")
add_p("3. Alcance (3.1 Dentro del alcance, 3.2 Fuera del alcance, 3.3 Modelo de Kárdex y Tríada de Umbrales, 3.4 Gestión de Lotes y FEFO, 3.5 Auditoría Física y Conciliación, 3.6 Dimensiones independientes)")
add_p("4. Flujos operativos y de negocio (Paso a paso y diagramas de secuencia/interacción)")
add_p("5. Actores y usuarios del sistema (Roles y Matriz RACI / RBAC)")
add_p("6. Invariantes arquitectónicas del sistema (I1 a I7)")
add_p("7. Requerimientos funcionales (RF-INV-01 a RF-INV-40)")
add_p("8. Cronograma y hitos")
add_p("9. Riesgos y supuestos (9.1 Riesgos identificados, 9.2 Supuestos)")
add_p("10. Glosario")

doc.add_page_break()

# ----------------- SECCIÓN 1 -----------------
add_h1("1. OBJETIVO DEL DOCUMENTO")
add_p("Este documento tiene como objetivo describir el alcance funcional y arquitectónico del Módulo de Inventario de Necto, estableciendo de manera rigurosa los requerimientos, los actores involucrados, los invariantes de dominio, los flujos operativos y los límites del desarrollo, con el fin de servir como referencia técnica y funcional única entre ST&T y el equipo de producto, desarrollo, aseguramiento de calidad (QA) y operaciones durante las etapas de diseño, construcción, prueba y aceptación.")
add_p("El documento describe el comportamiento integral del producto —qué puede hacer una persona, con qué reglas de validación, bajo qué invariantes de stock y cómo interactúan las superficies de usuario, el asistente de inteligencia artificial y los canales de mensajería (WhatsApp)— manteniendo un estricto desacople respecto a la implementación contingente. Cada definición se sustenta en la arquitectura limpia y desacoplada de Necto. Cuando una funcionalidad forme parte del roadmap futuro o no aplique a esta versión, se declara de manera explícita como exclusión o deuda arquitectónica documentada para evitar falsas expectativas.")
add_p("Lectores previstos: equipo de producto, arquitectos de software, desarrolladores frontend/backend, ingenieros de QA, auditores de inventario, jefes de almacén y líderes de operaciones.")

# ----------------- SECCIÓN 2 -----------------
add_h1("2. DESCRIPCIÓN GENERAL DEL PRODUCTO")

add_h2("Qué es")
add_p("El módulo de Inventario es el sistema centralizado de control de existencias, catalogación de insumos y mercancías, trazabilidad por lotes, conteo físico y auditoría de Necto. Permite a los comercios gestionar su catálogo maestro de artículos, monitorear niveles de existencias consolidados y por bodega física, recibir entradas de mercancía, registrar salidas por merma o consumo, corregir existencias mediante auditorías físicas con conciliación atómica y transferir productos entre almacenes sin riesgo de descuadres.")
add_p("El principio rector del módulo es el Kárdex continuo como única fuente de verdad: el stock nunca se almacena como una cifra estática mutable susceptible de desincronización, sino que se calcula derivado de la suma algebraica de los movimientos históricos registrados. El módulo cuenta con cinco superficies operativas principales:")
add_bullet(" Dashboard ejecutivo con valorización total a costo, KPIs de capital inmovilizado, artículos críticos y últimos movimientos.", "1. Inicio (/inventario/inicio):")
add_bullet(" Catálogo interactivo de artículos, existencias por bodega, semáforo de estados de stock, gestión de lotes y fechas de vencimiento.", "2. Existencias (/inventario):")
add_bullet(" Libro mayor de kárdex con auditoría cronológica inmutable, filtros multicriterio y trazabilidad completa de actores.", "3. Movimientos (/inventario/movimientos):")
add_bullet(" Subsistema de inventarios físicos con foto congelada de stock teórico, captura de conteo a ciegas o guiado, cálculo de discrepancias y conciliación atómica generando ajustes trazables.", "4. Auditoría (/inventario/auditoria):")
add_bullet(" Mueble de configuración tipado organizado en Almacén (unidad por defecto, catálogo de bodegas) y Avisos (alertas de reposición).", "5. Configuración (/inventario/config):")

add_h2("Qué problema resuelve")
add_bullet(" Desconocimiento de existencias reales por almacén o sede, provocando ventas de productos agotados o sobrecostos por compras de emergencia.", "Incertidumbre operativa:")
add_bullet(" Mermas, roturas y pérdidas de mercancía sin justificación documentada ni actor responsable.", "Pérdida de trazabilidad:")
add_bullet(" Vencimiento silencioso de mercancías perecederas por despachar lotes recientes antes que los más antiguos.", "Merma por caducidad:")
add_bullet(" Descuadres en inventarios físicos que se 'arreglan' sobrescribiendo cifras sin dejar pista de auditoría en el kárdex.", "Discrepancias inexplicables:")
add_bullet(" Doble fuente de verdad provocada por sistemas que persisten números de stock mutables que se desincronizan ante el menor fallo.", "Corrupción de datos:")
add_bullet(" Descuadres en envíos entre bodegas por registrar salidas sin la contrapartida atómica de entrada.", "Transferencias fallidas:")
add_bullet(" Imposibilidad de conocer el capital de trabajo inmovilizado en insumos y productos valorizado a costo real.", "Ceguera financiera:")

add_h2("Contexto de negocio")
add_p("El módulo está diseñado para responder a las exigencias operativas de comercios minoristas, restaurantes, negocios de moda y empresas de servicios que manejan inventario físico. En su jornada cotidiana necesitan:")
add_bullet(" Identificar en segundos qué artículos están agotados o bajo el punto de reorden para gestionar compras prioritarias.")
add_bullet(" Catalogar artículos con códigos SKU únicos, categorización jerárquica, unidades de medida normalizadas, costo unitario de referencia y la tríada de umbrales (mínimo, reorden y máximo).")
add_bullet(" Operar múltiples bodegas físicas (ej. Bodega Principal, Barra, Cocina, Exhibición) garantizando exactamente una bodega principal predeterminada.")
add_bullet(" Registrar recepciones de insumos y compras sumando stock directamente a la bodega y lote correspondiente.")
add_bullet(" Documentar mermas y consumos internos con impacto negativo inmediato sobre el stock de origen.")
add_bullet(" Ejecutar auditorías físicas periódicas congelando el saldo teórico al iniciar y conciliando diferencias mediante ajustes automáticos debidamente justificados.")
add_bullet(" Trasladar existencias entre bodegas en una única transacción atómica e indivisible.")
add_bullet(" Obtener sugerencias de despacho FEFO (First Expired, First Out) para priorizar la salida de lotes próximos a vencer.")
add_bullet(" Monitorear el valor total del inventario valorizado a costo de reposición para balances de capital de trabajo.")

add_h2("Naturaleza del módulo y frontera con dominios vecinos")
add_p("Inventario es un dominio autónomo, dueño absoluto del catálogo de artículos de almacén, las bodegas, los lotes y el kárdex de movimientos. Mantiene una estricta política de independencia arquitectónica (D1-D4):")

fronteras_headers = ["Dominio vecino", "Responsabilidad de ese dominio", "Relación con Inventario", "Estado de frontera"]
fronteras_data = [
    [
        "Pedidos",
        "Gestión de órdenes de venta, flujo de preparación en cocina/mostrador y cobro al cliente.",
        "Independencia estricta (D1/D2). Pedidos maneja su propia lista de precios de venta (CatalogoItem) sin descontar stock de almacén ni bloquear órdenes. Cero imports cruzados en código.",
        "Desacoplado (v1.1)"
    ],
    [
        "Canales / WhatsApp",
        "Atención conversacional con clientes finales y recepción de intenciones comerciales.",
        "Relación EXCLUSIVA DE CONSULTA por parte del usuario final. El bot puede consultar la disponibilidad referencial de artículos en inventario (solo lectura) para responder dudas de clientes. No aparta ni reserva stock.",
        "Consulta en Solo Lectura"
    ],
    [
        "Reservas",
        "Disponibilidad, asignación y ocupación de espacios físicos, mesas y citas de clientes.",
        "Independencia absoluta. Cero dependencias funcionales o de base de datos.",
        "Desacoplado"
    ],
    [
        "Asistente IA (NECTO AI)",
        "Consultas analíticas y operativas en lenguaje natural para el equipo interno del comercio.",
        "NECTO AI consume Inventario en modo solo lectura a través de 5 herramientas tipadas expuestas por InventarioToolProvider, sujetas a la capacidad inventory.read.",
        "Integrado (Solo Lectura)"
    ],
    [
        "Equipo y acceso (RBAC)",
        "Gobierno transversal de identidades, roles de usuario y capacidades del sistema.",
        "Capa de seguridad. Inventario declara cuatro capacidades granulares (inventory.read, manage, move, adjust) y el rol especializado bodega.",
        "Integrado Transversalmente"
    ],
]
add_styled_table(fronteras_headers, fronteras_data, widths=[Inches(1.2), Inches(1.8), Inches(2.6), Inches(1.2)], zebra=True)

# ----------------- SECCIÓN 3 -----------------
add_h1("3. ALCANCE")

add_h2("3.1. Dentro del alcance")
alcance_in_headers = ["#", "Funcionalidad o entregable incluido", "Qué comprende"]
alcance_in_data = [
    ["1", "Panel de Inicio (/inventario/inicio)", "Cuatro KPIs ejecutivos (Valor total a costo, Artículos en catálogo, Artículos bajo mínimo, Artículos agotados), tabla de reposición prioritaria y lista de últimos movimientos."],
    ["2", "Catálogo maestro de Artículos", "Administración de artículos con SKU único, nombre comercial, categoría, unidad de medida normalizada, costo unitario de referencia y tríada de umbrales."],
    ["3", "Tríada de Umbrales de Reposición", "Modelado de 'minimo' (suelo crítico de seguridad), 'puntoReorden' (aviso temprano > mínimo) y 'stockMaximo' (techo u objetivo de reposición)."],
    ["4", "Gestión Multi-bodega", "Administración de almacenes físicos y satélites. Garantía estructural de exactamente una bodega principal designada. Stock consolidado y por almacén."],
    ["5", "Kárdex continuo de 4 tipos de movimiento", "Libro mayor con entradas (compra/recepción), salidas (merma/consumo), ajustes (conteo físico) y transferencias (inter-bodega)."],
    ["6", "Cálculo de stock derivado (Invariante I1)", "El stock no se persiste en columnas mutables: se calcula dinámicamente sumando algebraicamente el efectoEnBodega de los movimientos del kárdex."],
    ["7", "Cuatro estados dinámicos de stock", "Clasificación matemática en tiempo real: 'agotado' (<=0), 'bajo_minimo' (<minimo), 'reorden' (>=minimo y <puntoReorden) y 'ok' (>=puntoReorden)."],
    ["8", "Tres niveles de decisión para el operador", "Agrupación en niveles prácticos: 'critico' (agotado + bajo mínimo), 'reorden' (aviso temprano) y 'ok' (abastecido)."],
    ["9", "Validación contra stock negativo (Invariante I2)", "Rechazo estricto fail-closed de cualquier salida, transferencia o ajuste a la baja que supere el stock existente en la bodega de origen."],
    ["10", "Ajustes de inventario con motivo obligatorio (Invariante I5)", "Corrección de existencias con obligación ineludible de registrar un texto explicativo válido en el campo motivo."],
    ["11", "Transferencias inter-bodega atómicas (Invariante I4)", "Movimiento único e indivisible con origenId y destinoId que impide desincronizaciones entre bodegas."],
    ["12", "Gestión y Trazabilidad de Lotes", "Modelo LoteArticulo con código de lote, fecha de vencimiento, cantidad inicial inmutable y bodega asignada. Disponibilidad derivada por kárdex."],
    ["13", "Semáforo y Alertas de Vencimiento", "Cálculo en días de calendario con bandas: 'vencido' (<0), 'critico' (<=7d), 'proximo' (<=15d), 'aviso' (<=30d), 'ok' y 'desconocido'."],
    ["14", "Despacho Sugerido FEFO (Invariante I7)", "Algoritmo determinista que sugiere la extracción de mercancía priorizando los lotes con vencimiento más próximo, con desempate por código."],
    ["15", "Subsistema de Auditoría Física (/inventario/auditoria)", "Gestión de conteos físicos por bodega: apertura de auditoría, registro de líneas con conteo físico independiente y seguimiento de avance."],
    ["16", "Foto Teórica Congelada en Auditoría", "Captura inmutable del conteoTeorico al momento de abrir la auditoría, evitando que movimientos posteriores desfiguren las discrepancias observadas."],
    ["17", "Conciliación Atómica de Auditoría", "Generación automática y en un solo paso de un movimiento de ajuste por cada discrepancia encontrada, con motivo 'Conteo físico · auditoría #{id}'."],
    ["18", "Grilla de Existencias interactiva (/inventario)", "Tabla con búsqueda por nombre/SKU/categoría (con plegado de tildes y mayúsculas), filtros por bodega y estado de stock, y visualización de lotes."],
    ["19", "Historial de Movimientos auditado (/inventario/movimientos)", "Kárdex cronológico completo (más reciente primero), filtrable por fecha, artículo, bodega y tipo, con actor responsable."],
    ["20", "Superficie de Configuración estructurada (/inventario/config)", "Mueble de configuración tipado con navegación en 2 grupos (Almacén, Avisos) y 3 secciones (General, Bodegas, Alertas)."],
    ["21", "Consulta de Stock vía WhatsApp (Solo Lectura)", "Capacidad del bot de WhatsApp para responder preguntas de clientes sobre disponibilidad referencial de artículos, sin alterar el kárdex ni reservar."],
    ["22", "Cinco herramientas para NECTO AI", "getExistencias, getBajoMinimo, getAgotados, getValorInventario y getMovimientosRecientes, protegidas bajo inventory.read."],
    ["23", "Gobierno RBAC granular", "Cuatro capacidades dedicadas (inventory.read, inventory.manage, inventory.move, inventory.adjust) y soporte nativo para el rol 'bodega'."],
    ["24", "Exportación de datos a CSV", "Descarga tabular de existencias y del historial de kárdex respetando los filtros activos."],
]
add_styled_table(alcance_in_headers, alcance_in_data, widths=[Inches(0.4), Inches(2.2), Inches(4.2)], zebra=True)

add_h2("3.2. Fuera del alcance")
alcance_out_headers = ["#", "Funcionalidad o entregable excluido", "Motivo de la exclusión"]
alcance_out_data = [
    ["1", "Deducción automática de stock al confirmar pedidos", "Independencia arquitectónica estricta (D1/D2) en v1.1. Pedidos opera con su propia lista de precios de venta. La integración reactiva se abordará en Fase 2 mediante eventos de dominio."],
    ["2", "Reserva o bloqueo temporal de stock desde WhatsApp o Web", "El bot de WhatsApp solo ofrece consulta informativa. El stock de almacén no admite reservas intermedias; solo se mueve por transacciones efectivas."],
    ["3", "Órdenes de compra electrónicas y facturación a proveedores", "El módulo alerta sobre artículos bajo punto de reorden pero no emite documentos de compra ni gestiona cuentas por pagar."],
    ["4", "Variantes multidimensionales complejas (talla/color) con stock propio", "Deuda declarada. Una variante real exige SKU y kárdex propio. En v1.1 el inventario opera por SKU de artículo."],
    ["5", "Valuación contable LIFO / FIFO o costo promedio ponderado (PMP)", "El módulo valora el inventario multiplicando el stock vigente por el costo unitario de referencia del artículo."],
    ["6", "Lectura de código de barras por cámara o pistola de hardware", "La captura se realiza mediante búsqueda en tiempo real y digitación en interfaz web."],
    ["7", "Listas de materiales, recetas y explosión de insumos (BOM)", "No se modela la transformación de materias primas en productos elaborados en esta fase."],
    ["8", "Facturación electrónica de compras y recepción tributaria", "El sistema no emite documentos fiscales ni se conecta con la DIAN u organismos tributarios."],
    ["9", "Operación offline sin conexión a internet", "La plataforma requiere conectividad para garantizar la concurrencia de movimientos y validación de saldos."],
]
add_styled_table(alcance_out_headers, alcance_out_data, widths=[Inches(0.4), Inches(2.5), Inches(3.9)], zebra=True)

# ----------------- SECCIÓN 3.3 MODELO DE KÁRDEX -----------------
add_h2("3.3. Modelo de Kárdex, Tríada de Umbrales y Estados de Stock")
add_p("El inventario se estructura alrededor de un libro mayor de movimientos (Kárdex). Una transacción representa el flujo de una cantidad positiva entre un origen y un destino, donde cualquiera de los dos extremos puede ser el exterior (null):")

kardex_ascii = """           [ EXTERIOR ]                              [ EXTERIOR ]
                │                                          ▲
                │ entrada (compra/recepción)               │ salida (merma/consumo)
                ▼                                          │
        ┌─────────────────┐   transferencia        ┌─────────────────┐
        │    BODEGA A     │ ─────────────────────▶ │    BODEGA B     │
        └─────────────────┘                        └─────────────────┘
                │  ▲                                      │  ▲
    ajuste (-)  │  │ ajuste (+)               ajuste (-)  │  │ ajuste (+)
                ▼  │                                      ▼  │
           [ EXTERIOR ]                              [ EXTERIOR ]"""
add_code_block(kardex_ascii)

add_p("Fórmula matemática canónica de impacto por bodega (efectoEnBodega):", bold_prefix="Cálculo dinámico: ")
add_code_block("delta = (destinoId === bodegaId ? +cantidad : 0) - (origenId === bodegaId ? cantidad : 0)")

mov_headers = ["Tipo de Movimiento", "origenId", "destinoId", "Significado Operativo", "Reglas de Validación"]
mov_data = [
    ["entrada", "null (exterior)", "bodega", "Recepción de compras, devoluciones o ingresos externos.", "cantidad > 0. destinoId obligatorio. Suma stock a la bodega."],
    ["salida", "bodega", "null (exterior)", "Consumo interno, merma, rotura o venta manual.", "cantidad > 0. origenId obligatorio. Valida que stockOrigen >= cantidad."],
    ["ajuste (+)", "null (exterior)", "bodega", "Sobrante hallado en conteo físico o corrección al alza.", "cantidad > 0. destinoId obligatorio. motivo obligatorio."],
    ["ajuste (-)", "bodega", "null (exterior)", "Faltante hallado en conteo físico o corrección a la baja.", "cantidad > 0. origenId obligatorio. motivo obligatorio. Valida stockOrigen >= cantidad."],
    ["transferencia", "bodega A", "bodega B", "Traslado entre dos bodegas físicas del comercio.", "cantidad > 0. origenId != destinoId. Valida stockOrigen >= cantidad. Atómico."],
]
add_styled_table(mov_headers, mov_data, widths=[Inches(1.1), Inches(1.0), Inches(1.0), Inches(1.8), Inches(1.9)], zebra=True)

add_p("Tríada de Umbrales de Reposición en Articulo:", bold_prefix="Umbrales: ")
add_bullet(" Nivel crítico inferior. Por debajo de esta cifra el artículo está en estado crítico de desabastecimiento.", "1. Stock Mínimo (minimo):")
add_bullet(" Umbral superior opcional de aviso temprano (debe ser > minimo). Permite gestionar la compra antes de tocar el suelo crítico.", "2. Punto de Reorden (puntoReorden):")
add_bullet(" Referencia de capacidad máxima de almacenamiento o lote óptimo de pedido ('hasta cuánto reponer').", "3. Stock Máximo (stockMaximo):")

add_p("Matriz de Estados Finos de Stock vs Niveles de Decisión del Operador:")
estados_headers = ["Estado Fino (EstadoStock)", "Condición Matemática", "Nivel Operador (NivelStock)", "Comportamiento en UI / Alertas"]
estados_data = [
    ["agotado", "disponible <= 0", "critico", "Badge rojo 'Agotado'. Alerta máxima en Inicio y reporte NECTO AI."],
    ["bajo_minimo", "0 < disponible < minimo", "critico", "Badge naranja 'Bajo mínimo'. Aparece en lista de reposición prioritaria."],
    ["reorden", "minimo <= disponible < puntoReorden", "reorden", "Badge amarillo 'Reorden'. Aviso preventivo para programar abastecimiento."],
    ["ok", "disponible >= puntoReorden (o >= minimo si no hay reorden)", "ok", "Badge verde 'Normal'. Existencias en nivel óptimo de operación."],
]
add_styled_table(estados_headers, estados_data, widths=[Inches(1.4), Inches(2.2), Inches(1.4), Inches(1.8)], zebra=True)

# ----------------- SECCIÓN 3.4 LOTES Y FEFO -----------------
add_h2("3.4. Gestión de Lotes y Algoritmo de Despacho FEFO")
add_p("Para negocios gastronómicos, farmacéuticos o de perecederos, el módulo incorpora trazabilidad por partidas bajo la entidad LoteArticulo (código de lote, fecha de vencimiento, cantidad inicial inmutable y bodega asignada).")
add_bullet(" La cantidad disponible de un lote no se guarda en base de datos. Se deriva calculando cantidadInicial más la suma algebraica de los movimientos del kárdex etiquetados con loteId (Invariante I1).", "Cálculo derivado de lote (disponibleDeLote):")
add_bullet(" Se calculan los días calendario truncados a medianoche entre la fecha actual y la fecha de expiración, clasificando en seis bandas:", "Semáforo de vencimiento (urgenciaDeVencimiento):")

venc_headers = ["Banda de Urgencia", "Condición en Días", "Significado Operativo"]
venc_data = [
    ["vencido", "dias < 0", "Lote vencido. Queda estrictamente excluido de sugerencias de despacho."],
    ["critico", "0 <= dias <= 7", "Vence en una semana o menos. Urgencia máxima de rotación."],
    ["proximo", "8 <= dias <= 15", "Vence en dos semanas. Entra en lista de rotación prioritaria."],
    ["aviso", "16 <= dias <= 30", "Vence en un mes. Aviso preventivo."],
    ["ok", "dias > 30", "Lote en vigencia segura sin urgencia."],
    ["desconocido", "Fecha ilegible / null", "Fecha no parseable. Se clasifica como desconocido para evitar falsos positivos de lote sano."],
]
add_styled_table(venc_headers, venc_data, widths=[Inches(1.5), Inches(1.8), Inches(3.5)], zebra=True)

add_p("Algoritmo de Despacho Sugerido FEFO (obtenerLotesSugeridosFEFO):", bold_prefix="Lógica FEFO: ")
add_p("Cuando se requiere despachar una cantidad N de un artículo con trazabilidad, el algoritmo selecciona los lotes óptimos aplicando las siguientes reglas deterministas:")
add_bullet("1. Filtra únicamente los lotes con disponible > 0.")
add_bullet("2. Excluye lotes cuyo estado sea 'vencido' o 'desconocido'.")
add_bullet("3. Ordena los lotes candidatos por fechaVencimiento ascendente (el que vence primero va primero).")
add_bullet("4. En caso de empate exacto en fecha de vencimiento, desempata deterministamente por orden alfabético de codigoLote.")
add_bullet("5. Acumula los lotes necesarios hasta cubrir o superar la cantidad solicitada.")

# ----------------- SECCIÓN 3.5 AUDITORÍA FÍSICA -----------------
add_h2("3.5. Subsistema de Auditoría Física y Conciliación Atómica")
add_p("El subsistema de auditoría (/inventario/auditoria) resuelve el problema de las discrepancias entre la realidad física y los saldos del sistema:")
add_bullet(" Al iniciar un conteo físico para una bodega, el sistema genera un registro AuditoriaInventario y congela el saldo actual de cada artículo en conteoTeorico. Esto asegura que si se registran recepciones o despachos en paralelo durante la jornada, la discrepancia calculada refleje exactamente lo que el operario vio cuando empezó a contar.", "Foto Teórica Congelada (conteoTeorico):")
add_bullet(" El operario digita lo observado en conteoFisico. Un valor null representa que la línea aún no ha sido contada (lo cual es estrictamente diferente de contar cero unidades).", "Captura Física (conteoFisico):")
add_bullet(" Se deriva como conteoFisico - conteoTeorico. Cuatro estados posibles: 'pendiente' (sin contar), 'coincide' (diferencia 0), 'sobra' (>0) y 'falta' (<0).", "Diferencia Derivada (diferenciaDe):")
add_bullet(" El sistema bloquea el botón de conciliación mientras exista al menos un artículo en estado 'pendiente' (motivoNoConciliable). Al confirmar la conciliación, el sistema genera automáticamente un movimiento de kárdex de tipo 'ajuste' por cada discrepancia no nula, asignando como motivo inmutable: 'Conteo físico · auditoría #{id}'.", "Conciliación Atómica (ajustesDeAuditoria):")

# ----------------- SECCIÓN 3.6 DIMENSIONES INDEPENDIENTES -----------------
add_h2("3.6. Dimensiones independientes del inventario")
dim_headers = ["Dimensión", "Concepto en Inventario", "Concepto en Pedidos", "Principio de Independencia Arquitectónica"]
dim_data = [
    ["Catálogo", "Articulo: SKU, categoría, unidad, costo de adquisición, stock mínimo.", "CatalogoItem: Nombre comercial, precio de venta al público congelado.", "No comparten clave ni entidad. Uno modela activos físicos; el otro oferta de venta."],
    ["Existencias", "Stock derivado de movimientos históricos del kárdex.", "Sin noción de stock. Pedidos registra órdenes de forma agnóstica.", "Pedidos no bloquea ventas por stock ni Inventario altera pedidos en v1.1."],
    ["Ubicación", "Bodega física de almacenamiento (Principal, Barra, Cocina).", "Modalidad de entrega logística (Domicilio, Retiro, En sitio).", "Bodega es custodia interna; Modalidad es logística de entrega."],
    ["Valorización", "Costo unitario de adquisición/reposición (capital inmovilizado).", "Total de venta comercial cobrado o por cobrar al cliente.", "El costo mide inversión de inventario; el pedido mide ingresos de negocio."],
]
add_styled_table(dim_headers, dim_data, widths=[Inches(1.2), Inches(1.8), Inches(1.8), Inches(2.0)], zebra=True)

# ----------------- SECCIÓN 4 FLUJOS OPERATIVOS -----------------
add_h1("4. FLUJOS OPERATIVOS Y DE NEGOCIO")
add_p("A continuación se detallan los flujos de interacción operativa del módulo de inventario, describiendo el paso a paso, los actores, las validaciones y el resultado sobre el kárdex.")

add_h2("Flujo 1: Recepción de Mercancía (Entrada)")
add_bullet(" Actor: Encargado de Bodega o Administrador.", "1. Iniciador:")
add_bullet(" El operador accede a /inventario/movimientos y selecciona 'Registrar Entrada' (o desde la grilla de existencias).", "2. Inicio:")
add_bullet(" Selecciona el artículo por SKU o nombre, especifica la cantidad (> 0), la bodega destino y opcionalmente el lote y notas.", "3. Captura:")
add_bullet(" El sistema valida que cantidad sea un número finito mayor a cero y que la bodega destino exista en la organización.", "4. Validación:")
add_bullet(" Se inserta un movimiento con tipo='entrada', origenId=null, destinoId=bodegaId, actor=operadorId y fecha ISO.", "5. Registro:")
add_bullet(" La existencia derivada de la bodega se incrementa de inmediato; si el artículo tenía lote asignado, se actualiza disponibleDeLote.", "6. Impacto:")

add_h2("Flujo 2: Salida Operativa (Merma, Rotura o Consumo Interno)")
add_bullet(" Actor: Encargado de Bodega o Supervisor de Operaciones.", "1. Iniciador:")
add_bullet(" El operador selecciona 'Registrar Salida', el artículo, la bodega de origen y la cantidad a retirar.", "2. Captura:")
add_bullet(" El sistema valida fail-closed: verifica que cantidad > 0 y que el stock actual en la bodega de origen sea mayor o igual a la cantidad solicitada.", "3. Validación:")
add_bullet(" Si stockOrigen < cantidad, la operación es RECHAZADA inmediatamente indicando el saldo disponible y la cantidad intentada.", "4. Control negativo:")
add_bullet(" Si es válida, se inserta el movimiento con tipo='salida', origenId=bodegaId, destinoId=null y actor responsable.", "5. Registro:")

add_h2("Flujo 3: Transferencia Inter-Bodega Atómica")
add_bullet(" Actor: Encargado de Bodega o Administrador.", "1. Iniciador:")
add_bullet(" El operador selecciona 'Transferencia', el artículo, la bodega origen, la bodega destino y la cantidad.", "2. Captura:")
add_bullet(" El sistema valida que origenId != destinoId y que la bodega de origen posea stock suficiente.", "3. Validación:")
add_bullet(" Se registra un único movimiento en el kárdex con tipo='transferencia', origenId=bodegaA y destinoId=bodegaB. Al ser una sola fila en base, es imposible que se debite de origen sin acreditarse en destino.", "4. Atomicidad:")

add_h2("Flujo 4: Auditoría Física y Conciliación")
auditoria_flow_ascii = """[ Encargado de Bodega ]            [ Sistema / Kárdex ]
           │                                 │
           │ 1. Abrir auditoría (Bodega A)   │
           ├────────────────────────────────▶│ Foto: congela conteoTeorico
           │                                 │
           │ 2. Digitar conteo físico        │
           ├────────────────────────────────▶│ Calcula diferenciaDe()
           │                                 │
           │ 3. Solicitar conciliación       │
           ├────────────────────────────────▶│ Valida: ¿todos contados?
           │                                 │ ├─ NO: Bloquea con motivo
           │                                 │ └─ SÍ: Genera ajustes kárdex
           │◀────────────────────────────────┤
           │ Auditoría Completada            │ Kárdex actualizado e inmutable"""
add_code_block(auditoria_flow_ascii)

add_bullet(" El auditor selecciona la bodega a auditar. El sistema instancia la auditoría y toma una instantánea inmutable del stock teórico de cada artículo en conteoTeorico.", "Paso 1 - Apertura:")
add_bullet(" El operario recorre el almacén físico e ingresa el conteoFisico de cada artículo. El sistema calcula en tiempo real la diferencia (físico - teórico) y clasifica en 'sobra', 'falta' o 'coincide'.", "Paso 2 - Captura:")
add_bullet(" Si resta algún artículo sin contar (null), el botón 'Conciliar' permanece inhabilitado indicando 'Faltan contar X artículos'.", "Paso 3 - Guardarraíl:")
add_bullet(" Al confirmar la conciliación, se crean los movimientos de kárdex: si sobra, ajuste con origenId=null y destinoId=bodega; si falta, ajuste con origenId=bodega y destinoId=null. Todos llevan el motivo obligatorio 'Conteo físico · auditoría #{id}'. El estado de la auditoría pasa a 'completada'.", "Paso 4 - Conciliación:")

add_h2("Flujo 5: Consulta de Disponibilidad de Stock por WhatsApp (Solo Lectura)")
whatsapp_flow_ascii = """[ Cliente en WhatsApp ]              [ Bot / WhatsApp Adapter ]         [ Módulo Inventario ]
           │                                     │                               │
           │ "¿Tienen Cheesecake disponible?"    │                               │
           ├────────────────────────────────────▶│                               │
           │                                     │ 1. Clasifica intención:       │
           │                                     │    moduloContexto="inventario"│
           │                                     │ 2. Consulta en solo lectura   │
           │                                     ├──────────────────────────────▶│
           │                                     │    getExistencias(Cheesecake) │
           │                                     │◀──────────────────────────────┤
           │                                     │ 3. Retorna saldo disponible   │
           │ "¡Sí! Tenemos 8 porciones           │    (sin reservar ni descontar)│
           │  disponibles en Bodega Principal"   │                               │
           │◀────────────────────────────────────┤                               │
           │                                     │                               │"""
add_code_block(whatsapp_flow_ascii)

add_p("Reglas fundamentales del flujo de WhatsApp:", bold_prefix="Frontera de WhatsApp: ")
add_bullet(" El cliente final interactúa con la línea de WhatsApp del comercio preguntando por disponibilidad de productos o insumos.", "1. Entrada conversacional:")
add_bullet(" El adaptador del canal clasifica el mensaje con moduloContexto: 'inventario' e intención: 'consultar'.", "2. Clasificación de contexto:")
add_bullet(" El bot consulta el inventario en modo estrictamente de solo lectura (query) a través de los selectores o herramientas de inventario.", "3. Consulta desacoplada:")
add_bullet(" El bot responde al cliente confirmando si hay existencias y en qué sede o bodega.", "4. Respuesta informativa:")
add_bullet(" La consulta no bloquea, no aparta y no descuenta inventario en el almacén. El stock físico solo varía mediante movimientos de kárdex ejecutados por personal autorizado.", "5. Garantía de no mutación:")

add_h2("Flujo 6: Despacho Sugerido FEFO por Lotes")
add_bullet(" El operador requiere preparar un despacho o consumo de 20 unidades de un insumo perecedero.", "1. Solicitud:")
add_bullet(" El sistema invoca obtenerLotesSugeridosFEFO con la lista de lotes con stock en la bodega.", "2. Ejecución:")
add_bullet(" El algoritmo descarta lotes vencidos o sin stock y ordena los lotes activos por fecha de vencimiento más cercana.", "3. Filtrado y orden:")
add_bullet(" El sistema presenta al operador la lista exacta de lotes y códigos a extraer físicamente del anaquel para cumplir con la rotación óptima de perecederos.", "4. Despacho sugerido:")

# ----------------- SECCIÓN 5 ACTORES Y RBAC -----------------
add_h1("5. ACTORES Y USUARIOS DEL SISTEMA")
actores_headers = ["Actor / Rol", "Descripción", "Necesidad Principal en Inventario"]
actores_data = [
    ["Administrador (admin_tienda)", "Propietario o gerente general del comercio.", "Control global: valorización de activos, creación de bodegas, configuración de umbrales y autorización de ajustes."],
    ["Encargado de Bodega (bodega)", "Rol especializado en la administración física del almacén.", "Agilidad operativa: registro de entradas, salidas, transferencias, control de lotes y ejecución de auditorías físicas."],
    ["Supervisor de Operaciones (supervisor_pedidos)", "Coordina la marcha de la operación y el abastecimiento.", "Supervisión de stock disponible y alertas de bajo mínimo sin modificar configuración de almacenes."],
    ["Vendedor / Mostrador (vendedor)", "Personal de atención en mostrador o sala de ventas.", "Consulta rápida de disponibilidad de stock para informar a clientes en modo solo lectura."],
    ["Asistente NECTO AI", "Agente inteligente interno de la plataforma.", "Consulta analítica y ejecutiva en lenguaje natural mediante herramientas de solo lectura bajo inventory.read."],
    ["Canal WhatsApp (Bot)", "Canal conversacional automatizado hacia clientes finales.", "Consulta de existencias referenciales en modo solo lectura para informar a clientes sin alterar stock."],
]
add_styled_table(actores_headers, actores_data, widths=[Inches(1.8), Inches(2.2), Inches(2.7)], zebra=True)

add_h2("Matriz de Capacidades RBAC por Rol")
rbac_headers = ["Capacidad", "Área Funcional", "Qué Habilita", "Roles con Acceso por Defecto"]
rbac_data = [
    ["inventory.read", "Inventario", "Visualizar existencias, catálogo de artículos, kárdex de movimientos, lotes y KPIs ejecutivos.", "admin_tienda, bodega, supervisor_pedidos, vendedor"],
    ["inventory.manage", "Inventario", "Crear y editar artículos, definir costos y umbrales, y administrar el catálogo de bodegas.", "admin_tienda"],
    ["inventory.move", "Inventario", "Registrar movimientos de entrada, salida y transferencias inter-bodega en el kárdex.", "admin_tienda, bodega"],
    ["inventory.adjust", "Inventario", "Registrar ajustes manuales de stock y conciliar auditorías físicas de inventario.", "admin_tienda, bodega"],
    ["settings.read", "Configuración", "Visualizar las secciones de configuración del módulo (/inventario/config).", "admin_tienda, bodega, supervisor_pedidos"],
    ["settings.manage", "Configuración", "Modificar y guardar parámetros de almacén, unidades por defecto y alertas.", "admin_tienda"],
    ["assistant.use", "Plataforma", "Ejecutar consultas de inventario mediante lenguaje natural con NECTO AI.", "admin_tienda, bodega, supervisor_pedidos"],
]
add_styled_table(rbac_headers, rbac_data, widths=[Inches(1.3), Inches(1.0), Inches(2.7), Inches(1.7)], zebra=True)

# ----------------- SECCIÓN 6 INVARIANTES ARQUITECTÓNICAS -----------------
add_h1("6. INVARIANTES ARQUITECTÓNICAS DEL SISTEMA (I1 A I7)")
add_p("Para asegurar la integridad matemática, la coherencia de datos y evitar cualquier riesgo de doble fuente de verdad, el diseño de Inventario impone siete invariantes arquitectónicas no negociables:")

inv_headers = ["Invariante", "Nombre Canónico", "Regla de Dominio", "Mecanismo de Salvaguarda"]
inv_data = [
    [
        "I1",
        "Derivación Pura del Kárdex",
        "El stock de un artículo o de un lote nunca se almacena como un valor persistido editable. Se calcula exclusivamente sumando algebraicamente los movimientos del kárdex mediante efectoEnBodega y disponibleDeLote.",
        "Articulo y LoteArticulo no declaran campo cantidad ni disponible. MobX memoiza computed y la base solo almacena transacciones."
    ],
    [
        "I2",
        "Validación Fail-Closed de Saldo",
        "Ningún movimiento puede dejar existencias negativas en su bodega de origen. Salidas, transferencias y ajustes a la baja requieren que stockOrigen >= cantidad.",
        "validarMovimiento valida el saldo antes de escribir. Si falla, retorna { ok: false, motivo } y bloquea la operación."
    ],
    [
        "I3",
        "Derivación Dinámica de Estados",
        "El estado de stock ('agotado', 'bajo_minimo', 'reorden', 'ok') nunca se guarda en base de datos. Se deriva en tiempo de ejecución evaluando la existencia disponible contra la tríada de umbrales.",
        "Función pura estadoDeStock(disponible, minimo, puntoReorden). Se recalcula con cada nuevo movimiento sin posibilidad de desincronización."
    ],
    [
        "I4",
        "Transferencia Atómica Indivisible",
        "Un traslado de mercancía entre dos bodegas es un único movimiento con origenId y destinoId, jamás dos registros separados (salida + entrada).",
        "Tipo 'transferencia' aplica -cantidad en origen y +cantidad en destino en una sola operación atómica e indecomponible."
    ],
    [
        "I5",
        "Motivo Obligatorio en Ajustes",
        "Un ajuste de inventario es la única operación que altera el saldo sin una transacción externa de respaldo. Exige obligatoriamente un texto no vacío en el campo motivo.",
        "validarMovimiento rechaza cualquier ajuste sin motivo. En conciliación física, el sistema genera automáticamente el motivo formal de auditoría."
    ],
    [
        "I6",
        "Bodega Principal Única",
        "El catálogo de bodegas de la organización debe contener exactamente una bodega con principal = true en todo momento.",
        "Al marcar una bodega como principal, las mutaciones de dominio desmarcan automáticamente cualquier otra bodega preexistente."
    ],
    [
        "I7",
        "Determinismo en Despacho FEFO",
        "El orden sugerido de extracción de lotes debe priorizar el vencimiento más cercano y desempatar siempre de forma alfabética por codigoLote.",
        "obtenerLotesSugeridosFEFO aplica sort determinista por fechaVencimiento y desempate por codigoLote, excluyendo lotes vencidos."
    ],
]
add_styled_table(inv_headers, inv_data, widths=[Inches(0.6), Inches(1.5), Inches(2.6), Inches(2.0)], zebra=True)

# ----------------- SECCIÓN 7 REQUERIMIENTOS FUNCIONALES -----------------
add_h1("7. REQUERIMIENTOS FUNCIONALES (RF-INV-01 A RF-INV-40)")
add_p("A continuación se especifican los 40 requerimientos funcionales del módulo de Inventario, redactados en formato verificable con criterio de aceptación estricto:")

rf_list = [
    ["RF-INV-01", "Panel de inicio ejecutivo", "Visualización de KPIs de valorización total a costo, artículos activos, artículos bajo mínimo y agotados en /inventario/inicio.", "Alta", "El sistema debe calcular y mostrar en tiempo real los cuatro indicadores cuantitativos, la lista de artículos que requieren reabastecimiento urgente y los últimos movimientos registrados."],
    ["RF-INV-02", "Catálogo maestro de artículos", "Creación, edición y consulta de artículos de inventario.", "Alta", "El sistema debe registrar artículos con SKU, nombre, categoría, unidad de medida, costo unitario de referencia y umbrales de stock, validando integridad de datos antes de persistir."],
    ["RF-INV-03", "Unicidad de SKU", "Garantía de identificador único de artículo por organización.", "Alta", "El sistema debe rechazar la creación o edición de un artículo cuyo código SKU coincida con otro existente en la misma organización, arrojando un error explícito."],
    ["RF-INV-04", "Unidades de medida normalizadas", "Catálogo cerrado de magnitudes físicas admisibles.", "Media", "El sistema debe permitir seleccionar exclusivamente las unidades tipadas: 'unidad', 'kg', 'g', 'l', 'ml', 'caja' y 'porcion', impidiendo valores libres."],
    ["RF-INV-05", "Tríada de umbrales en artículos", "Configuración de piso crítico, aviso de reorden y stock máximo.", "Alta", "El sistema debe permitir definir 'minimo' (obligatorio >= 0), 'puntoReorden' (opcional, validando que sea > minimo) y 'stockMaximo' (opcional >= minimo)."],
    ["RF-INV-06", "Administración multi-bodega", "Gestión de ubicaciones físicas y almacenes de la organización.", "Alta", "El sistema debe permitir crear y editar bodegas indicando nombre e identificador único, y consultar existencias tanto consolidadas como discriminadas por bodega."],
    ["RF-INV-07", "Garantía de bodega principal única", "Designación obligatoria de exactamente una bodega principal.", "Alta", "El sistema debe asegurar en todo momento que exactamente una bodega tenga la marca principal=true. Al marcar una como principal, el sistema desmarca la anterior."],
    ["RF-INV-08", "Kárdex - Registro de Entrada", "Ingreso de mercancía proveniente del exterior hacia una bodega.", "Alta", "El sistema debe registrar entradas con cantidad > 0 y destinoId válido, sumando de inmediato la cantidad al saldo de la bodega."],
    ["RF-INV-09", "Kárdex - Registro de Salida", "Descarga de mercancía por consumo interno, merma o rotura.", "Alta", "El sistema debe registrar salidas con cantidad > 0 y origenId válido, restando la cantidad del saldo de la bodega previa validación de existencia."],
    ["RF-INV-10", "Kárdex - Ajuste con motivo obligatorio", "Corrección justificada de saldos por conteo físico.", "Alta", "El sistema debe registrar ajustes exigiendo un motivo textual explicativo no vacío. Si el motivo falta, el sistema debe rechazar el registro."],
    ["RF-INV-11", "Kárdex - Transferencia inter-bodega atómica", "Traslado de existencias entre bodegas en una sola transacción.", "Alta", "El sistema debe registrar transferencias en una sola fila de kárdex con origenId != destinoId, debitando de origen y acreditando en destino simultáneamente."],
    ["RF-INV-12", "Validación fail-closed contra stock negativo", "Prohibición de transacciones que dejen saldos negativos.", "Alta", "El sistema debe rechazar cualquier salida, transferencia o ajuste a la baja cuya cantidad supere el stock disponible en la bodega origen, informando saldo y faltante."],
    ["RF-INV-13", "Cálculo de stock derivado del kárdex", "Cálculo dinámico de existencias sin columnas mutables estáticas.", "Alta", "El sistema debe derivar el stock sumando algebraicamente el efectoEnBodega de los movimientos del kárdex. No debe existir columna de cantidad editable en la tabla de artículos."],
    ["RF-INV-14", "Clasificación de 4 estados dinámicos de stock", "Evaluación matemática de estados fino de existencia.", "Alta", "El sistema debe clasificar cada artículo en cada bodega como: 'agotado' (<=0), 'bajo_minimo' (<minimo), 'reorden' (<puntoReorden) u 'ok' (>=puntoReorden o >=minimo)."],
    ["RF-INV-15", "Agrupación en 3 niveles de decisión para el operador", "Presentación operativa simplificada de stock.", "Media", "El sistema debe mapear los 4 estados finos a 3 niveles prácticos: 'critico' (agotados y bajo mínimo), 'reorden' (aviso temprano) y 'ok' (normal)."],
    ["RF-INV-16", "Valoración económica a costo", "Cálculo financiero del capital inmovilizado en inventario.", "Alta", "El sistema debe calcular el valor económico multiplicando el stock vigente de cada artículo por su costo unitario de referencia, presentando subtotales por bodega y total general."],
    ["RF-INV-17", "Grilla interactiva de existencias (/inventario)", "Superficie central de visualización y monitoreo de stock.", "Alta", "El sistema debe mostrar la tabla de artículos con SKU, Nombre, Categoría, Unidad, Existencia, Umbrales, Estado, Costo y Lotes, permitiendo alternar filtros por bodega."],
    ["RF-INV-18", "Búsqueda con normalización de texto", "Búsqueda insensible a mayúsculas, minúsculas y tildes.", "Media", "El buscador de artículos debe aplicar normalizarTexto plegando caracteres diacríticos para que 'cafe' encuentre 'Café' y 'salmon' encuentre 'Salmón'."],
    ["RF-INV-19", "Historial cronológico de kárdex (/inventario/movimientos)", "Libro mayor ordenado con trazabilidad de transacciones.", "Alta", "El sistema debe listar los movimientos más recientes primero, con Fecha, Artículo, Tipo, Cantidad, Origen, Destino, Motivo, Lote y Actor responsable."],
    ["RF-INV-20", "Inmutabilidad de movimientos históricos", "Prohibición estricta de edición o borrado de transacciones.", "Alta", "El sistema debe impedir la modificación o eliminación de movimientos pasados. Toda rectificación debe realizarse mediante un nuevo movimiento de ajuste."],
    ["RF-INV-21", "Trazabilidad de actor responsable", "Registro inequívoco del usuario que ejecutó cada movimiento.", "Alta", "El sistema debe guardar de forma inalterable el identificador del operador autenticado en el campo actor de cada movimiento registrado."],
    ["RF-INV-22", "Gestión de Lotes de artículos", "Registro y administración de partidas con fecha de vencimiento.", "Alta", "El sistema debe permitir dar de alta LoteArticulo con código de lote, fecha de vencimiento, cantidad inicial inmutable y bodega asignada."],
    ["RF-INV-23", "Disponibilidad derivada de lote", "Cálculo de existencia de lote desde el kárdex.", "Alta", "El sistema debe calcular disponibleDeLote sumando la cantidad inicial más el efecto en bodega de los movimientos etiquetados con loteId, sin guardar saldo estático."],
    ["RF-INV-24", "Semáforo de vencimiento de lotes", "Monitoreo de caducidad en días de calendario truncados.", "Alta", "El sistema debe clasificar lotes según días restantes: 'vencido' (<0), 'critico' (<=7d), 'proximo' (<=15d), 'aviso' (<=30d), 'ok' y 'desconocido' si la fecha no es válida."],
    ["RF-INV-25", "Despacho sugerido FEFO", "Algoritmo de recomendación First Expired, First Out.", "Alta", "El sistema debe generar sugerencias de despacho ordenando lotes por vencimiento más próximo, excluyendo vencidos y desempatando deterministamente por código."],
    ["RF-INV-26", "Apertura de auditoría física (/inventario/auditoria)", "Creación de sesión de conteo físico para una bodega.", "Alta", "El sistema debe permitir abrir una auditoría asignando un almacén y congelando inmediatamente el stock del sistema en conteoTeorico."],
    ["RF-INV-27", "Captura de conteo físico en auditoría", "Registro de existencias físicas observadas por línea.", "Alta", "El sistema debe permitir digitar conteoFisico por artículo, manteniendo null en líneas sin contar y calculando la discrepancia derivada (físico - teórico)."],
    ["RF-INV-28", "Clasificación de líneas de auditoría", "Estados de discrepancia en conteo físico.", "Media", "El sistema debe clasificar cada línea como: 'pendiente' (sin contar), 'coincide' (diferencia 0), 'sobra' (>0) o 'falta' (<0)."],
    ["RF-INV-29", "Guardarraíl de conciliación de auditoría", "Bloqueo de conciliación si restan artículos por contar.", "Alta", "El sistema debe deshabilitar la conciliación si alguna línea permanece con conteoFisico=null, mostrando el mensaje 'Faltan contar X artículos antes de conciliar'."],
    ["RF-INV-30", "Conciliación atómica de auditoría", "Generación automática de ajustes de kárdex por diferencias.", "Alta", "El sistema debe generar en una sola operación un movimiento de ajuste por cada diferencia no nula con motivo 'Conteo físico · auditoría #{id}', cerrando la auditoría."],
    ["RF-INV-31", "Superficie de Configuración estructurada", "Mueble de configuración tipado en /inventario/config.", "Media", "El sistema debe organizar la configuración en 2 grupos (Almacén, Avisos) y 3 secciones (General, Bodegas, Alertas) con metadatos e iconos tipados."],
    ["RF-INV-32", "Configuración de unidad de medida predeterminada", "Definición de unidad por defecto para artículos nuevos.", "Baja", "El sistema debe permitir seleccionar la unidad de medida que se propondrá por defecto en el formulario de creación de nuevos artículos."],
    ["RF-INV-33", "Configuración de umbrales y alertas de reposición", "Habilitación y parametrización de alertas de bajo mínimo.", "Media", "El sistema debe permitir encender o apagar las alertas de bajo mínimo y configurar el umbral de aviso preventivo en la sección Alertas."],
    ["RF-INV-34", "Exportación de datos a formato CSV", "Descarga tabular de existencias y de movimientos.", "Media", "El sistema debe permitir descargar archivos CSV con los datos de existencias y del kárdex, respetando los filtros activos en pantalla al momento de exportar."],
    ["RF-INV-35", "Gobierno de acceso granular por capacidades RBAC", "Protección estricta de rutas, acciones y botones.", "Alta", "El sistema debe verificar inventory.read para consultar, inventory.manage para editar artículos/bodegas, inventory.move para entradas/salidas e inventory.adjust para ajustes."],
    ["RF-INV-36", "Consulta de existencias vía WhatsApp (Solo Lectura)", "Atención automatizada a consultas de clientes sobre stock.", "Alta", "El bot de WhatsApp debe consultar existencias referenciales de inventario en solo lectura para informar al cliente, sin descontar ni reservar stock en almacén."],
    ["RF-INV-37", "Herramientas de consulta para NECTO AI", "Exposición de cinco herramientas de solo lectura al asistente.", "Media", "El sistema debe registrar getExistencias, getBajoMinimo, getAgotados, getValorInventario y getMovimientosRecientes bajo el proveedor InventarioToolProvider."],
    ["RF-INV-38", "Desacople e independencia arquitectónica de Pedidos", "Cero imports cruzados entre dominios de código.", "Alta", "El sistema debe garantizar la independencia estricta (D1-D4): el paquete de inventario no importa pedidos y pedidos no importa inventario, validado en CI."],
    ["RF-INV-39", "Navegación e integración en AppSidebar", "Acceso condicional a las páginas de inventario.", "Media", "El sidebar debe mostrar la rama 'Inventario' con enlaces a Inicio, Existencias, Movimientos, Auditoría y Configuración solo si el módulo está activo y se tiene permiso."],
    ["RF-INV-40", "Manejo coherente de estados vacíos y feedback", "Mensajes orientadores en tablas y listas sin registros.", "Baja", "El sistema debe renderizar mensajes limpios y explicativos cuando no existan artículos, cuando una bodega esté vacía o cuando una búsqueda no arroje resultados."],
]

add_styled_table(
    ["ID", "Requerimiento", "Descripción", "Prioridad", "Criterio de Aceptación"],
    rf_list,
    widths=[Inches(0.8), Inches(1.8), Inches(1.8), Inches(0.7), Inches(2.1)],
    zebra=True
)

# ----------------- SECCIÓN 8 CRONOGRAMA -----------------
add_h1("8. CRONOGRAMA Y HITOS")
hitos_headers = ["ID", "Hito / Entregable", "Descripción / Alcance", "Ventana / Fecha", "Responsable"]
hitos_data = [
    ["H-INV-01", "Fase 0: Saneamiento de textos", "Ajuste de textos en semillas y configuración que prometían reserva o descuento de stock inexistente.", "21-sep-2026", "Producto y Desarrollo"],
    ["H-INV-02", "Fase 1: Dominio puro y pruebas", "Modelo de dominio puro (inventario.domain.ts): tipos Articulo, Bodega, Movimiento, LoteArticulo, Auditoria, FEFO y tests unitarios.", "21 al 22-sep-2026", "Arquitectura / Desarrollo"],
    ["H-INV-03", "Fase 2: Store reactivo MobX", "Implementación de InventarioStore con kárdex reactivo en memoria, selectores derivados, lotes y auditoría física.", "22 al 23-sep-2026", "Desarrollo Frontend"],
    ["H-INV-04", "Fase 3: Test de independencia", "Suite automatizada que verifica cero imports cruzados entre Inventario y Pedidos con control negativo obligatorio.", "23-sep-2026", "QA / Arquitectura"],
    ["H-INV-05", "Fase 4: Capacidades y RBAC", "Declaración de capacidades inventory.read/manage/move/adjust, grupo en catálogo y rol especializado bodega.", "23 al 24-sep-2026", "Seguridad / Desarrollo"],
    ["H-INV-06", "Fase 5: Rutas y Sidebar", "Integración de rutas en App.tsx con guardas de módulo/capacidad y rama condicional de 5 páginas en AppSidebar.", "24-sep-2026", "Desarrollo Frontend"],
    ["H-INV-07", "Fase 6: Superficies operativas", "Construcción de Inicio, Existencias, Movimientos, Auditoría y Configuración alineadas a la guía de diseño Necto.", "24 al 26-sep-2026", "Frontend / UI"],
    ["H-INV-08", "Fase 7: Asistente NECTO AI", "Implementación y registro de InventarioToolProvider con 5 herramientas analíticas de solo lectura.", "26-sep-2026", "Desarrollo / AI"],
    ["H-INV-09", "Fase 8: Canal WhatsApp (Consulta)", "Adaptador conversacional que clasifica moduloContexto='inventario' y atiende consultas de disponibilidad de stock sin alterar el kárdex.", "26 al 27-sep-2026", "Integraciones / Bot"],
    ["H-INV-10", "Fase 9: Encendido atómico y auditoría", "Activación del módulo en catálogo de plataforma, verificación de paleta institucional y suite global de pruebas.", "27-sep-2026", "Arquitectura / QA"],
    ["H-INV-11", "Persistencia Cloud (Fase 2)", "Migración del kárdex, lotes y auditorías a Supabase PostgreSQL con RLS y procedimientos almacenados.", "Q4 2026", "Backend / Cloud"],
    ["H-INV-12", "Integración por Eventos con Pedidos (Fase 2)", "Deducción automática de stock al confirmar pedidos mediante arquitectura orientada a eventos desacoplada.", "Q4 2026", "Arquitectura"],
]
add_styled_table(hitos_headers, hitos_data, widths=[Inches(0.8), Inches(1.8), Inches(2.5), Inches(1.0), Inches(1.1)], zebra=True)

# ----------------- SECCIÓN 9 RIESGOS Y SUPUESTOS -----------------
add_h1("9. RIESGOS Y SUPUESTOS")

add_h2("9.1. Riesgos identificados")
riesgos_headers = ["ID", "Riesgo", "Prob.", "Impacto", "Mitigación"]
riesgos_data = [
    ["R-INV-01", "Doble fuente de verdad si se almacena stock estático junto al kárdex.", "Alta", "Crítico", "Invariante I1 estricto: el stock nunca se persiste; se deriva algebraicamente sumando movimientos en tiempo real."],
    ["R-INV-02", "Expectativa de que WhatsApp o Pedidos descuenten stock automáticamente.", "Alta", "Alto", "Declaración explícita de frontera: WhatsApp solo consulta disponibilidad; desacoplamiento verificado por tests automáticos."],
    ["R-INV-03", "Ajustes de inventario arbitrarios o sin justificación documental.", "Media", "Alto", "Invariante I5: el campo 'motivo' es obligatorio para todo ajuste manual; en auditorías se inyecta motivo trazable formal."],
    ["R-INV-04", "Registro de movimientos que dejen existencias negativas.", "Media", "Alto", "Invariante I2: validación fail-closed en validarMovimiento que bloquea transacciones que superen el saldo disponible."],
    ["R-INV-05", "Pérdida de datos del kárdex al recargar la página en versión frontend.", "Alta", "Medio", "Mitigado en roadmap con H-INV-11 (Supabase). En demo se preserva seed enriquecido y configuración en localStorage."],
    ["R-INV-06", "Acoplamiento indebido de código entre Inventario y Pedidos.", "Media", "Alto", "Test de independencia automatizado (inventario.independencia.test.ts) que bloquea el build ante cualquier import cruzado."],
    ["R-INV-07", "Confusión entre catálogo de venta de Pedidos y catálogo de almacén.", "Media", "Medio", "Separación estricta de agregados: CatalogoItem representa oferta comercial; Articulo representa activos físicos con SKU y costo."],
    ["R-INV-08", "Ausencia de bodega principal en la organización.", "Baja", "Alto", "Invariante I6: el sistema fuerza a nivel de dominio y mutaciones que exactamente una bodega sea principal."],
    ["R-INV-09", "Desfase durante auditorías físicas por movimientos concurrentes.", "Media", "Medio", "Invariante de conteoTeorico congelado al abrir la auditoría, aislando las discrepancias de operaciones en paralelo."],
    ["R-INV-10", "Despacho erróneo de lotes vencidos o fuera de rotación.", "Baja", "Alto", "Invariante I7 y función pura obtenerLotesSugeridosFEFO que excluye lotes vencidos y prioriza caducidad próxima."],
]
add_styled_table(riesgos_headers, riesgos_data, widths=[Inches(0.6), Inches(2.2), Inches(0.5), Inches(0.6), Inches(2.8)], zebra=True)

add_h2("9.2. Supuestos")
sup_headers = ["Área", "Supuesto de Partida", "Implicación en el Módulo"]
sup_data = [
    ["Bodegas", "Cada negocio opera al menos una bodega física.", "El seed inicial de la organización crea por defecto 'Bodega Principal' activa."],
    ["Kárdex", "Todo cambio físico de inventario corresponde a un movimiento trazable.", "No se permite modificar existencias sin crear una fila formal e inmutable en el kárdex."],
    ["Costos", "El costo unitario registrado es referencial para valorización interna.", "No reemplaza la contabilidad formal ni gestiona libros fiscales oficiales."],
    ["Permisos", "La organización gestiona los roles mediante la matriz RBAC de Necto.", "Los permisos de inventario se asignan por operador según su rol en la plataforma."],
    ["WhatsApp", "El cliente final utiliza WhatsApp para resolver dudas operativas antes de comprar.", "El bot actúa como canal de consulta informativa de stock sin comprometer reservas."],
    ["Plataforma", "El navegador del operador ejecuta JavaScript moderno con soporte MobX.", "El cálculo de stock derivado se procesa de forma ágil y memoizada en el cliente."],
]
add_styled_table(sup_headers, sup_data, widths=[Inches(1.2), Inches(2.8), Inches(2.8)], zebra=True)

# ----------------- SECCIÓN 10 GLOSARIO -----------------
add_h1("10. GLOSARIO")
glo_headers = ["Término", "Definición"]
glo_data = [
    ["Articulo", "Registro maestro de un producto o insumo en el almacén, caracterizado por SKU, nombre, categoría, unidad de medida, costo unitario y tríada de umbrales."],
    ["SKU (Stock Keeping Unit)", "Identificador alfanumérico único asignado a un artículo para su localización, control y trazabilidad dentro del comercio."],
    ["Bodega", "Ubicación física o lógica delimitada donde se almacenan existencias de artículos pertenecientes a la organización."],
    ["Bodega Principal", "Bodega designada por defecto para la recepción de mercancía y operaciones principales. Debe existir exactamente una."],
    ["Kárdex", "Registro cronológico, continuo e inmutable de todos los movimientos de entrada, salida, ajuste y transferencia de inventario."],
    ["Stock Derivado", "Nivel de existencias calculado dinámicamente sumando algebraicamente los movimientos del kárdex, sin campo estático en base de datos."],
    ["Stock Mínimo (Piso)", "Nivel crítico inferior de existencias por debajo del cual el artículo entra en desabastecimiento urgente."],
    ["Punto de Reorden", "Umbral preventivo superior al mínimo que emite una alerta temprana de compra antes de tocar el suelo crítico."],
    ["Stock Máximo", "Nivel de referencia sobre la capacidad óptima de almacenamiento o techo de reposición del artículo."],
    ["Lote (LoteArticulo)", "Partida específica de mercancía que comparte fecha de vencimiento, código visible y almacén de depósito."],
    ["FEFO (First Expired, First Out)", "Criterio logístico de rotación y despacho que prioriza la salida del lote cuya fecha de caducidad sea más próxima."],
    ["Auditoría de Inventario", "Proceso de conteo físico periódico en una bodega para comparar la realidad contra los saldos teóricos del sistema."],
    ["Foto Teórica Congelada", "Instantánea inmutable del stock que el sistema tenía al momento de iniciar la auditoría (conteoTeorico)."],
    ["Conciliación Atómica", "Proceso que genera en una sola transacción movimientos de ajuste por cada diferencia hallada en la auditoría física."],
    ["Entrada", "Movimiento de kárdex que ingresa mercancía desde el exterior hacia una bodega receptora."],
    ["Salida", "Movimiento de kárdex que retira definitivamente mercancía de una bodega hacia el exterior por merma, rotura o consumo."],
    ["Ajuste de Inventario", "Movimiento correctivo originado por un conteo físico para conciliar discrepancias, que exige registrar obligatoriamente el motivo."],
    ["Transferencia", "Operación atómica que traslada existencias desde una bodega origen hacia una bodega destino sin salir de la organización."],
    ["Costo Unitario de Referencia", "Valor monetario estimado de adquisición de una unidad de artículo para calcular el valor total del inventario a costo."],
    ["Efecto en Bodega", "Fórmula que determina el impacto neto de un movimiento sobre un almacén (+cantidad si es destino, -cantidad si es origen)."],
    ["Fail-Closed", "Comportamiento del sistema que ante cualquier intento de operación que genere saldo negativo bloquea la acción de forma segura."],
    ["Independencia Arquitectónica", "Principio de diseño en v1.1 que prohíbe dependencias directas o imports cruzados entre los dominios de Pedidos e Inventario."],
]
add_styled_table(glo_headers, glo_data, widths=[Inches(2.0), Inches(4.8)], zebra=True)

# Save DOCX
doc.save(salida_docx)
print(f"DOCX generado con éxito en: {salida_docx}")

# ----------------- GENERAR MARKDOWN EXACTO -----------------
md_content = f"""# INVENTARIO
## Documentación Funcional y Alcance de Producto
### Módulo de Inventario, Kárdex Multi-Bodega, Lotes FEFO y Auditoría Física / Necto

| Campo | Valor |
|---|---|
| **Cliente / Área solicitante:** | ST&T |
| **Versión del documento:** | 1.1 (Revisada y Completa) |
| **Fecha de elaboración:** | 24/09/2026 |
| **Elaborado por:** | Jessy Quinto T |
| **Clasificación:** | Interno |

---

# CONTROL DE VERSIONES

| Versión | Fecha | Autor | Descripción del cambio |
|---|---|---|---|
| 1.0 | 24/09/2026 | Jessy Quinto T | Versión inicial de alcance funcional del módulo de Inventario y Kárdex multi-bodega. |
| 1.1 | 24/09/2026 | Jessy Quinto T | Actualización arquitectónica completa: incorporación de gestión de lotes con algoritmo de despacho FEFO, subsistema de auditoría física con foto teórica congelada y conciliación atómica, tríada de umbrales (mínimo, reorden, máximo), formalización de invariantes I1-I7, 5 superficies operativas completas y flujo de consulta de stock en solo lectura desde WhatsApp. |

---

# APROBACIONES

| Rol | Nombre | Cargo | Firma | Fecha |
|---|---|---|---|---|
| Patrocinador / Sponsor | Dirección de Tecnología | Sponsor Ejecutivo ST&T | | 24/09/2026 |
| Líder de producto | Product Management | Líder de Producto Necto | | 24/09/2026 |
| Líder técnico | Jessy Quinto T | Senior Architect / Tech Lead | | 24/09/2026 |
| Stakeholder Operativo | Operaciones y Almacén | Representante de Logística y Abastecimiento | | 24/09/2026 |

---

# TABLA DE CONTENIDO
1. Objetivo del documento
2. Descripción general del producto (Qué es, Qué problema resuelve, Contexto de negocio, Frontera con otros dominios)
3. Alcance (3.1 Dentro del alcance, 3.2 Fuera del alcance, 3.3 Modelo de Kárdex y Tríada de Umbrales, 3.4 Gestión de Lotes y FEFO, 3.5 Auditoría Física y Conciliación, 3.6 Dimensiones independientes)
4. Flujos operativos y de negocio (Paso a paso y diagramas de secuencia/interacción)
5. Actores y usuarios del sistema (Roles y Matriz RACI / RBAC)
6. Invariantes arquitectónicas del sistema (I1 a I7)
7. Requerimientos funcionales (RF-INV-01 a RF-INV-40)
8. Cronograma y hitos
9. Riesgos y supuestos (9.1 Riesgos identificados, 9.2 Supuestos)
10. Glosario

---

# 1. OBJETIVO DEL DOCUMENTO
Este documento tiene como objetivo describir el alcance funcional y arquitectónico del Módulo de Inventario de Necto, estableciendo de manera rigurosa los requerimientos, los actores involucrados, los invariantes de dominio, los flujos operativos y los límites del desarrollo, con el fin de servir como referencia técnica y funcional única entre ST&T y el equipo de producto, desarrollo, aseguramiento de calidad (QA) y operaciones durante las etapas de diseño, construcción, prueba y aceptación.

El documento describe el comportamiento integral del producto —qué puede hacer una persona, con qué reglas de validación, bajo qué invariantes de stock y cómo interactúan las superficies de usuario, el asistente de inteligencia artificial y los canales de mensajería (WhatsApp)— manteniendo un estricto desacople respecto a la implementación contingente. Cada definición se sustenta en la arquitectura limpia y desacoplada de Necto. Cuando una funcionalidad forme parte del roadmap futuro o no aplique a esta versión, se declara de manera explícita como exclusión o deuda arquitectónica documentada para evitar falsas expectativas.

Lectores previstos: equipo de producto, arquitectos de software, desarrolladores frontend/backend, ingenieros de QA, auditores de inventario, jefes de almacén y líderes de operaciones.

---

# 2. DESCRIPCIÓN GENERAL DEL PRODUCTO

### Qué es
El módulo de Inventario es el sistema centralizado de control de existencias, catalogación de insumos y mercancías, trazabilidad por lotes, conteo físico y auditoría de Necto. Permite a los comercios gestionar su catálogo maestro de artículos, monitorear niveles de existencias consolidados y por bodega física, recibir entradas de mercancía, registrar salidas por merma o consumo, corregir existencias mediante auditorías físicas con conciliación atómica y transferir productos entre almacenes sin riesgo de descuadres.

El principio rector del módulo es el Kárdex continuo como única fuente de verdad: el stock nunca se almacena como una cifra estática mutable susceptible de desincronización, sino que se calcula derivado de la suma algebraica de los movimientos históricos registrados. El módulo cuenta con cinco superficies operativas principales:
- **1. Inicio (/inventario/inicio):** Dashboard ejecutivo con valorización total a costo, KPIs de capital inmovilizado, artículos críticos y últimos movimientos.
- **2. Existencias (/inventario):** Catálogo interactivo de artículos, existencias por bodega, semáforo de estados de stock, gestión de lotes y fechas de vencimiento.
- **3. Movimientos (/inventario/movimientos):** Libro mayor de kárdex con auditoría cronológica inmutable, filtros multicriterio y trazabilidad completa de actores.
- **4. Auditoría (/inventario/auditoria):** Subsistema de inventarios físicos con foto congelada de stock teórico, captura de conteo a ciegas o guiado, cálculo de discrepancias y conciliación atómica generando ajustes trazables.
- **5. Configuración (/inventario/config):** Mueble de configuración tipado organizado en Almacén (unidad por defecto, catálogo de bodegas) y Avisos (alertas de reposición).

### Qué problema resuelve
- **Incertidumbre operativa:** Desconocimiento de existencias reales por almacén o sede, provocando ventas de productos agotados o sobrecostos por compras de emergencia.
- **Pérdida de trazabilidad:** Mermas, roturas y pérdidas de mercancía sin justificación documentada ni actor responsable.
- **Merma por caducidad:** Vencimiento silencioso de mercancías perecederas por despachar lotes recientes antes que los más antiguos.
- **Discrepancias inexplicables:** Descuadres en inventarios físicos que se 'arreglan' sobrescribiendo cifras sin dejar pista de auditoría en el kárdex.
- **Corrupción de datos:** Doble fuente de verdad provocada por sistemas que persisten números de stock mutables que se desincronizan ante el menor fallo.
- **Transferencias fallidas:** Descuadres en envíos entre bodegas por registrar salidas sin la contrapartida atómica de entrada.
- **Ceguera financiera:** Imposibilidad de conocer el capital de trabajo inmovilizado en insumos y productos valorizado a costo real.

### Contexto de negocio
El módulo está diseñado para responder a las exigencias operativas de comercios minoristas, restaurantes, negocios de moda y empresas de servicios que manejan inventario físico. En su jornada cotidiana necesitan:
- Identificar en segundos qué artículos están agotados o bajo el punto de reorden para gestionar compras prioritarias.
- Catalogar artículos con códigos SKU únicos, categorización jerárquica, unidades de medida normalizadas, costo unitario de referencia y la tríada de umbrales (mínimo, reorden y máximo).
- Operar múltiples bodegas físicas (ej. Bodega Principal, Barra, Cocina, Exhibición) garantizando exactamente una bodega principal predeterminada.
- Registrar recepciones de insumos y compras sumando stock directamente a la bodega y lote correspondiente.
- Documentar mermas y consumos internos con impacto negativo inmediato sobre el stock de origen.
- Ejecutar auditorías físicas periódicas congelando el saldo teórico al iniciar y conciliando diferencias mediante ajustes automáticos debidamente justificados.
- Trasladar existencias entre bodegas en una única transacción atómica e indivisible.
- Obtener sugerencias de despacho FEFO (First Expired, First Out) para priorizar la salida de lotes próximos a vencer.
- Monitorear el valor total del inventario valorizado a costo de reposición para balances de capital de trabajo.

### Naturaleza del módulo y frontera con dominios vecinos
Inventario es un dominio autónomo, dueño absoluto del catálogo de artículos de almacén, las bodegas, los lotes y el kárdex de movimientos. Mantiene una estricta política de independencia arquitectónica (D1-D4):

| Dominio vecino | Responsabilidad de ese dominio | Relación con Inventario | Estado de frontera |
|---|---|---|---|
| **Pedidos** | Gestión de órdenes de venta, flujo de preparación en cocina/mostrador y cobro al cliente. | Independencia estricta (D1/D2). Pedidos maneja su propia lista de precios de venta (CatalogoItem) sin descontar stock de almacén ni bloquear órdenes. Cero imports cruzados en código. | Desacoplado (v1.1) |
| **Canales / WhatsApp** | Atención conversacional con clientes finales y recepción de intenciones comerciales. | Relación EXCLUSIVA DE CONSULTA por parte del usuario final. El bot puede consultar la disponibilidad referencial de artículos en inventario (solo lectura) para responder dudas de clientes. No aparta ni reserva stock. | Consulta en Solo Lectura |
| **Reservas** | Disponibilidad, asignación y ocupación de espacios físicos, mesas y citas de clientes. | Independencia absoluta. Cero dependencias funcionales o de base de datos. | Desacoplado |
| **Asistente IA (NECTO AI)** | Consultas analíticas y operativas en lenguaje natural para el equipo interno del comercio. | NECTO AI consume Inventario en modo solo lectura a través de 5 herramientas tipadas expuestas por InventarioToolProvider, sujetas a la capacidad inventory.read. | Integrado (Solo Lectura) |
| **Equipo y acceso (RBAC)** | Gobierno transversal de identidades, roles de usuario y capacidades del sistema. | Capa de seguridad. Inventario declara cuatro capacidades granulares (inventory.read, manage, move, adjust) y el rol especializado bodega. | Integrado Transversalmente |

---

# 3. ALCANCE

## 3.1. Dentro del alcance
| # | Funcionalidad o entregable incluido | Qué comprende |
|---|---|---|
""" + "\n".join([f"| {r[0]} | {r[1]} | {r[2]} |" for r in alcance_in_data]) + f"""

## 3.2. Fuera del alcance
| # | Funcionalidad o entregable excluido | Motivo de la exclusión |
|---|---|---|
""" + "\n".join([f"| {r[0]} | {r[1]} | {r[2]} |" for r in alcance_out_data]) + f"""

## 3.3. Modelo de Kárdex, Tríada de Umbrales y Estados de Stock
El inventario se estructura alrededor de un libro mayor de movimientos (Kárdex). Una transacción representa el flujo de una cantidad positiva entre un origen y un destino, donde cualquiera de los dos extremos puede ser el exterior (null):

```
{kardex_ascii}
```

**Cálculo dinámico:** Fórmula matemática canónica de impacto por bodega (efectoEnBodega):
```
delta = (destinoId === bodegaId ? +cantidad : 0) - (origenId === bodegaId ? cantidad : 0)
```

| Tipo de Movimiento | origenId | destinoId | Significado Operativo | Reglas de Validación |
|---|---|---|---|---|
""" + "\n".join([f"| {r[0]} | {r[1]} | {r[2]} | {r[3]} | {r[4]} |" for r in mov_data]) + f"""

**Tríada de Umbrales de Reposición en Articulo:**
- **1. Stock Mínimo (minimo):** Nivel crítico inferior. Por debajo de esta cifra el artículo está en estado crítico de desabastecimiento.
- **2. Punto de Reorden (puntoReorden):** Umbral superior opcional de aviso temprano (debe ser > minimo). Permite gestionar la compra antes de tocar el suelo crítico.
- **3. Stock Máximo (stockMaximo):** Referencia de capacidad máxima de almacenamiento o lote óptimo de pedido ('hasta cuánto reponer').

Matriz de Estados Finos de Stock vs Niveles de Decisión del Operador:
| Estado Fino (EstadoStock) | Condición Matemática | Nivel Operador (NivelStock) | Comportamiento en UI / Alertas |
|---|---|---|---|
""" + "\n".join([f"| {r[0]} | {r[1]} | {r[2]} | {r[3]} |" for r in estados_data]) + f"""

## 3.4. Gestión de Lotes y Algoritmo de Despacho FEFO
Para negocios gastronómicos, farmacéuticos o de perecederos, el módulo incorpora trazabilidad por partidas bajo la entidad `LoteArticulo` (código de lote, fecha de vencimiento, cantidad inicial inmutable y bodega asignada).

- **Cálculo derivado de lote (disponibleDeLote):** La cantidad disponible de un lote no se guarda en base de datos. Se deriva calculando `cantidadInicial` más la suma algebraica de los movimientos del kárdex etiquetados con `loteId` (Invariante I1).
- **Semáforo de vencimiento (urgenciaDeVencimiento):** Se calculan los días calendario truncados a medianoche entre la fecha actual y la fecha de expiración, clasificando en seis bandas:

| Banda de Urgencia | Condición en Días | Significado Operativo |
|---|---|---|
""" + "\n".join([f"| {r[0]} | {r[1]} | {r[2]} |" for r in venc_data]) + f"""

**Lógica FEFO (obtenerLotesSugeridosFEFO):** Cuando se requiere despachar una cantidad N de un artículo con trazabilidad, el algoritmo selecciona los lotes óptimos aplicando las siguientes reglas deterministas:
1. Filtra únicamente los lotes con `disponible > 0`.
2. Excluye lotes cuyo estado sea `'vencido'` o `'desconocido'`.
3. Ordena los lotes candidatos por `fechaVencimiento` ascendente (el que vence primero va primero).
4. En caso de empate exacto en fecha de vencimiento, desempata deterministamente por orden alfabético de `codigoLote`.
5. Acumula los lotes necesarios hasta cubrir o superar la cantidad solicitada.

## 3.5. Subsistema de Auditoría Física y Conciliación Atómica
El subsistema de auditoría (`/inventario/auditoria`) resuelve el problema de las discrepancias entre la realidad física y los saldos del sistema:
- **Foto Teórica Congelada (conteoTeorico):** Al iniciar un conteo físico para una bodega, el sistema genera un registro `AuditoriaInventario` y congela el saldo actual de cada artículo en `conteoTeorico`. Esto asegura que si se registran recepciones o despachos en paralelo durante la jornada, la discrepancia calculada refleje exactamente lo que el operario vio cuando empezó a contar.
- **Captura Física (conteoFisico):** El operario digita lo observado en `conteoFisico`. Un valor `null` representa que la línea aún no ha sido contada (lo cual es estrictamente diferente de contar cero unidades).
- **Diferencia Derivada (diferenciaDe):** Se deriva como `conteoFisico - conteoTeorico`. Cuatro estados posibles: `'pendiente'` (sin contar), `'coincide'` (diferencia 0), `'sobra'` (>0) y `'falta'` (<0).
- **Conciliación Atómica (ajustesDeAuditoria):** El sistema bloquea el botón de conciliación mientras exista al menos un artículo en estado `'pendiente'` (`motivoNoConciliable`). Al confirmar la conciliación, el sistema genera automáticamente un movimiento de kárdex de tipo `'ajuste'` por cada discrepancia no nula, asignando como motivo inmutable: `'Conteo físico · auditoría #{id}'`.

## 3.6. Dimensiones independientes del inventario
| Dimensión | Concepto en Inventario | Concepto en Pedidos | Principio de Independencia Arquitectónica |
|---|---|---|---|
""" + "\n".join([f"| {r[0]} | {r[1]} | {r[2]} | {r[3]} |" for r in dim_data]) + f"""

---

# 4. FLUJOS OPERATIVOS Y DE NEGOCIO

A continuación se detallan los flujos de interacción operativa del módulo de inventario, describiendo el paso a paso, los actores, las validaciones y el resultado sobre el kárdex.

### Flujo 1: Recepción de Mercancía (Entrada)
- **1. Iniciador:** Encargado de Bodega o Administrador.
- **2. Inicio:** El operador accede a `/inventario/movimientos` y selecciona 'Registrar Entrada' (o desde la grilla de existencias).
- **3. Captura:** Selecciona el artículo por SKU o nombre, especifica la cantidad (> 0), la bodega destino y opcionalmente el lote y notas.
- **4. Validación:** El sistema valida que cantidad sea un número finito mayor a cero y que la bodega destino exista en la organización.
- **5. Registro:** Se inserta un movimiento con `tipo='entrada'`, `origenId=null`, `destinoId=bodegaId`, `actor=operadorId` y fecha ISO.
- **6. Impacto:** La existencia derivada de la bodega se incrementa de inmediato; si el artículo tenía lote asignado, se actualiza `disponibleDeLote`.

### Flujo 2: Salida Operativa (Merma, Rotura o Consumo Interno)
- **1. Iniciador:** Encargado de Bodega o Supervisor de Operaciones.
- **2. Captura:** El operador selecciona 'Registrar Salida', el artículo, la bodega de origen y la cantidad a retirar.
- **3. Validación:** El sistema valida fail-closed: verifica que cantidad > 0 y que el stock actual en la bodega de origen sea mayor o igual a la cantidad solicitada.
- **4. Control negativo:** Si `stockOrigen < cantidad`, la operación es RECHAZADA inmediatamente indicando el saldo disponible y la cantidad intentada.
- **5. Registro:** Si es válida, se inserta el movimiento con `tipo='salida'`, `origenId=bodegaId`, `destinoId=null` y actor responsable.

### Flujo 3: Transferencia Inter-Bodega Atómica
- **1. Iniciador:** Encargado de Bodega o Administrador.
- **2. Captura:** El operador selecciona 'Transferencia', el artículo, la bodega origen, la bodega destino y la cantidad.
- **3. Validación:** El sistema valida que `origenId != destinoId` y que la bodega de origen posea stock suficiente.
- **4. Atomicidad:** Se registra un único movimiento en el kárdex con `tipo='transferencia'`, `origenId=bodegaA` y `destinoId=bodegaB`. Al ser una sola fila en base, es imposible que se debite de origen sin acreditarse en destino.

### Flujo 4: Auditoría Física y Conciliación
```
{auditoria_flow_ascii}
```
- **Paso 1 - Apertura:** El auditor selecciona la bodega a auditar. El sistema instancia la auditoría y toma una instantánea inmutable del stock teórico de cada artículo en `conteoTeorico`.
- **Paso 2 - Captura:** El operario recorre el almacén físico e ingresa el `conteoFisico` de cada artículo. El sistema calcula en tiempo real la diferencia (`físico - teórico`) y clasifica en `'sobra'`, `'falta'` o `'coincide'`.
- **Paso 3 - Guardarraíl:** Si resta algún artículo sin contar (`null`), el botón 'Conciliar' permanece inhabilitado indicando 'Faltan contar X artículos'.
- **Paso 4 - Conciliación:** Al confirmar la conciliación, se crean los movimientos de kárdex: si sobra, ajuste con `origenId=null` y `destinoId=bodega`; si falta, ajuste con `origenId=bodega` y `destinoId=null`. Todos llevan el motivo obligatorio `'Conteo físico · auditoría #{id}'`. El estado de la auditoría pasa a `'completada'`.

### Flujo 5: Consulta de Disponibilidad de Stock por WhatsApp (Solo Lectura)
```
{whatsapp_flow_ascii}
```
**Frontera de WhatsApp:**
- **1. Entrada conversacional:** El cliente final interactúa con la línea de WhatsApp del comercio preguntando por disponibilidad de productos o insumos.
- **2. Clasificación de contexto:** El adaptador del canal clasifica el mensaje con `moduloContexto: 'inventario'` e `intención: 'consultar'`.
- **3. Consulta desacoplada:** El bot consulta el inventario en modo estrictamente de solo lectura (`query`) a través de los selectores o herramientas de inventario.
- **4. Respuesta informativa:** El bot responde al cliente confirmando si hay existencias y en qué sede o bodega.
- **5. Garantía de no mutación:** La consulta no bloquea, no aparta y no descuenta inventario en el almacén. El stock físico solo varía mediante movimientos de kárdex ejecutados por personal autorizado.

### Flujo 6: Despacho Sugerido FEFO por Lotes
- **1. Solicitud:** El operador requiere preparar un despacho o consumo de 20 unidades de un insumo perecedero.
- **2. Ejecución:** El sistema invoca `obtenerLotesSugeridosFEFO` con la lista de lotes con stock en la bodega.
- **3. Filtrado y orden:** El algoritmo descarta lotes vencidos o sin stock y ordena los lotes activos por fecha de vencimiento más cercana.
- **4. Despacho sugerido:** El sistema presenta al operador la lista exacta de lotes y códigos a extraer físicamente del anaquel para cumplir con la rotación óptima de perecederos.

---

# 5. ACTORES Y USUARIOS DEL SISTEMA

| Actor / Rol | Descripción | Necesidad Principal en Inventario |
|---|---|---|
""" + "\n".join([f"| {r[0]} | {r[1]} | {r[2]} |" for r in actores_data]) + f"""

### Matriz de Capacidades RBAC por Rol
| Capacidad | Área Funcional | Qué Habilita | Roles con Acceso por Defecto |
|---|---|---|---|
""" + "\n".join([f"| {r[0]} | {r[1]} | {r[2]} | {r[3]} |" for r in rbac_data]) + f"""

---

# 6. INVARIANTES ARQUITECTÓNICAS DEL SISTEMA (I1 A I7)

Para asegurar la integridad matemática, la coherencia de datos y evitar cualquier riesgo de doble fuente de verdad, el diseño de Inventario impone siete invariantes arquitectónicas no negociables:

| Invariante | Nombre Canónico | Regla de Dominio | Mecanismo de Salvaguarda |
|---|---|---|---|
""" + "\n".join([f"| {r[0]} | {r[1]} | {r[2]} | {r[3]} |" for r in inv_data]) + f"""

---

# 7. REQUERIMIENTOS FUNCIONALES (RF-INV-01 A RF-INV-40)

| ID | Requerimiento | Descripción | Prioridad | Criterio de Aceptación |
|---|---|---|---|---|
""" + "\n".join([f"| {r[0]} | {r[1]} | {r[2]} | {r[3]} | {r[4]} |" for r in rf_list]) + f"""

---

# 8. CRONOGRAMA Y HITOS

| ID | Hito / Entregable | Descripción / Alcance | Ventana / Fecha | Responsable |
|---|---|---|---|---|
""" + "\n".join([f"| {r[0]} | {r[1]} | {r[2]} | {r[3]} | {r[4]} |" for r in hitos_data]) + f"""

---

# 9. RIESGOS Y SUPUESTOS

### 9.1. Riesgos identificados
| ID | Riesgo | Prob. | Impacto | Mitigación |
|---|---|---|---|---|
""" + "\n".join([f"| {r[0]} | {r[1]} | {r[2]} | {r[3]} | {r[4]} |" for r in riesgos_data]) + f"""

### 9.2. Supuestos
| Área | Supuesto de Partida | Implicación en el Módulo |
|---|---|---|
""" + "\n".join([f"| {r[0]} | {r[1]} | {r[2]} |" for r in sup_data]) + f"""

---

# 10. GLOSARIO

| Término | Definición |
|---|---|
""" + "\n".join([f"| {r[0]} | {r[1]} |" for r in glo_data]) + f"""
"""

with open(salida_md, "w", encoding="utf-8") as f:
    f.write(md_content)

print(f"MD generado con éxito en: {salida_md}")
