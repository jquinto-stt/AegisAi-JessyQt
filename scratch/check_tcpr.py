import docx
pedidos_path = r"C:\Users\Jessy\Documents\GitHub\StockFlow\Docs\Documentacion Funcional\Pedidos_Documentacion_Funcional_y_Alcance_STT.docx"
doc = docx.Document(pedidos_path)
t1 = doc.tables[1]
tcPr = t1.rows[0].cells[0]._tc.get_or_add_tcPr()
print("tcPr xml:", tcPr.xml)
