import pymupdf
doc = pymupdf.open(r"C:/Users/Jessy/Documents/GitHub/StockFlow/outputs/inventario-diagramas-flujo.pdf")
for idx in (2,5):
    pg = doc[idx]
    print(f"===== pagina {idx+1} =====")
    rows={}
    for x0,y0,x1,y1,w,*_ in pg.get_text("words"):
        rows.setdefault(round(y0,0),[]).append((x0,x1,w))
    for k in sorted(rows):
        xs0=min(r[0] for r in rows[k]); xs1=max(r[1] for r in rows[k])
        print(f"  y={k:6.1f} x={xs0:6.1f}..{xs1:6.1f} | {' '.join(r[2] for r in rows[k])[:110]}")
