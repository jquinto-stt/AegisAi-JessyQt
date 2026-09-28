import sys, fitz
doc = fitz.open(r"C:/Users/Jessy/Documents/GitHub/StockFlow/outputs/inventario-diagramas-flujo.pdf")
pg = doc[8]
r = pg.rect
# crop: the figure region, top ~48% of the page
clip = fitz.Rect(r.x0, r.y0 + r.height*0.13, r.x1, r.y0 + r.height*0.40)
pix = pg.get_pixmap(matrix=fitz.Matrix(4,4), clip=clip)
pix.save(r"C:/Users/Jessy/Documents/GitHub/StockFlow/outputs/_chk-pages/zoom09a.png")
print("zoom09a", pix.width, pix.height)
