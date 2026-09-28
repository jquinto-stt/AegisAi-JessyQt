import fitz, os, sys, glob
pdf = r"C:/Users/Jessy/Documents/GitHub/StockFlow/outputs/inventario-diagramas-flujo.pdf"
out = r"C:/Users/Jessy/Documents/GitHub/StockFlow/outputs/_chk-pages"
os.makedirs(out, exist_ok=True)
for f in glob.glob(os.path.join(out, "*.png")):
    os.remove(f)
d = fitz.open(pdf)
print("paginas =", d.page_count)
for i, pg in enumerate(d):
    pg.get_pixmap(dpi=110).save(os.path.join(out, f"p{i+1:02d}.png"))
print("OK", len(glob.glob(os.path.join(out,'*.png'))))
