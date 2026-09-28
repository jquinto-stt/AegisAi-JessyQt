import zipfile
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

for name, p in [
    ('plantilla', r'Docs\Documentacion Funcional\Plantilla_Documentacion_Funcional_y_Alcance_STT.docx'),
    ('pedidos', r'Docs\Documentacion Funcional\Pedidos_Documentacion_Funcional_y_Alcance_STT.docx'),
    ('inventario', r'Docs\Documentacion Funcional\Inventario_Documentacion_Funcional_y_Alcance_STT.docx')
]:
    print(f"=== {name} ===")
    z = zipfile.ZipFile(p)
    for fname in z.namelist():
        if fname.endswith('.xml') or fname.endswith('.rels'):
            content = z.read(fname).decode('utf-8', errors='ignore')
            # Look for external links, fields, INCLUDETEXT, etc.
            flds = re.findall(r'<w:fldSimple[^>]*w:instr="([^"]*)"', content)
            instrs = re.findall(r'<w:instrText[^>]*>([^<]*)</w:instrText>', content)
            targets = re.findall(r'Target="([^"]*)"[^>]*TargetMode="External"', content)
            if flds:
                print(f"  [{fname}] fldSimple: {flds}")
            if instrs:
                print(f"  [{fname}] instrText: {instrs}")
            if targets:
                print(f"  [{fname}] External Targets: {targets}")
