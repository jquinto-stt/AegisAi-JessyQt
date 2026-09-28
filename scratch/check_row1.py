import docx
pedidos_path = r"C:\Users\Jessy\Documents\GitHub\StockFlow\Docs\Documentacion Funcional\Pedidos_Documentacion_Funcional_y_Alcance_STT.docx"
doc = docx.Document(pedidos_path)
t1 = doc.tables[1]
if len(t1.rows) > 1:
    tcPr1 = t1.rows[1].cells[0]._tc.get_or_add_tcPr()
    print("row 1 cell 0 tcPr xml:", tcPr1.xml)
