import pymupdf
doc = pymupdf.open(r"C:/Users/Jessy/Documents/GitHub/StockFlow/outputs/inventario-diagramas-flujo.pdf")
pg = doc[8]
W = pg.rect.width
words = pg.get_text("words")
# group by line (round y)
rows = {}
for x0,y0,x1,y1,w,*_ in words:
    key = round(y0,0)
    rows.setdefault(key, []).append((x0,x1,w))
for k in sorted(rows):
    xs0 = min(r[0] for r in rows[k]); xs1 = max(r[1] for r in rows[k])
    txt = " ".join(r[2] for r in rows[k])
    print(f"y={k:6.1f}  x={xs0:6.1f}..{xs1:6.1f}  (page W={W:.1f})  | {txt[:120]}")
