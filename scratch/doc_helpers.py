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

def set_cell_margins_and_shading(cell, fill_hex=None, top=70, bottom=70, left=110, right=110, v_align="center"):
    tcPr = cell._tc.get_or_add_tcPr()
    if fill_hex:
        shd_xml = f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>'
        tcPr.append(parse_xml(shd_xml))
    mar_xml = f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>'
    tcPr.append(parse_xml(mar_xml))
    valign_xml = f'<w:vAlign {nsdecls("w")} w:val="{v_align}"/>'
    tcPr.append(parse_xml(valign_xml))

def format_table(table, col_widths=None, header_fill="06153C", zebra=True):
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    # Set header row
    hdr_cells = table.rows[0].cells
    for i, c in enumerate(hdr_cells):
        set_cell_margins_and_shading(c, fill_hex=header_fill, top=90, bottom=90, left=120, right=120)
        for p in c.paragraphs:
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            for r in p.runs:
                r.bold = True
                r.font.color.rgb = RGBColor(255, 255, 255)
                r.font.size = Pt(9.5)
    
    # Set data rows
    for r_idx, row in enumerate(table.rows[1:]):
        fill = "F7F9FC" if (zebra and r_idx % 2 == 1) else None
        for i, c in enumerate(row.cells):
            set_cell_margins_and_shading(c, fill_hex=fill, top=70, bottom=70, left=110, right=110)
            for p in c.paragraphs:
                for r in p.runs:
                    r.font.size = Pt(9.0)
                    r.font.color.rgb = RGBColor(40, 40, 40)
    
    if col_widths:
        for row in table.rows:
            for idx, width in enumerate(col_widths):
                if idx < len(row.cells):
                    row.cells[idx].width = width

print("Template processor ready.")
